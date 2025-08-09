const EmailService = require('./EmailService');

// Unified notification service that can use SMS, Email, or both
class NotificationService {
    constructor() {
        this.emailService = new EmailService();
        this.twilioEnabled = false;
        this.twilioClient = null;
        this.twilioPhone = null;

        // Initialize Twilio if available
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            try {
                const twilio = require('twilio');
                this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
                this.twilioEnabled = true;
                console.log('Twilio SMS functionality enabled');
            } catch (error) {
                console.log('Twilio not available:', error.message);
            }
        }

        console.log('Notification methods available:', {
            sms: this.twilioEnabled,
            email: this.emailService.enabled
        });
    }

    // Send SMS if Twilio is available
    async sendSMS(to, message) {
        if (!this.twilioEnabled) {
            console.log(`SMS would be sent to ${to}: ${message}`);
            return { sid: 'mock-message-id', status: 'simulated' };
        }

        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.twilioPhone,
                to: this.formatPhoneNumber(to)
            });
            return result;
        } catch (error) {
            console.error('Error sending SMS:', error);
            throw error;
        }
    }

    // Send notification using best available method
    async sendNotification(contact, subject, message, preferSMS = true) {
        const results = [];

        // Try SMS first if preferred and available
        if (preferSMS && this.twilioEnabled && contact.phoneNumber) {
            try {
                const smsResult = await this.sendSMS(contact.phoneNumber, message);
                results.push({ method: 'SMS', success: true, result: smsResult });
                return results; // SMS sent successfully, no need for email
            } catch (error) {
                results.push({ method: 'SMS', success: false, error: error.message });
            }
        }

        // Fallback to email if SMS failed or not available
        if (this.emailService.enabled && contact.email) {
            try {
                const emailResult = await this.emailService.sendEmail(contact.email, subject, message);
                results.push({ method: 'Email', success: true, result: emailResult });
            } catch (error) {
                results.push({ method: 'Email', success: false, error: error.message });
            }
        }

        // If neither method worked, log the attempt
        if (results.length === 0 || !results.some(r => r.success)) {
            console.log(`No notification methods available for contact:`, contact);
            results.push({ method: 'None', success: false, error: 'No valid contact methods' });
        }

        return results;
    }

    // Send meal reminder (tries SMS first, then email)
    async sendMealReminder(family, meal, missionaries) {
        const dateFormatted = new Date(meal.date).toLocaleDateString();
        const missionaryNames = missionaries.map(m => m.fullName).join(' and ');
        const deliveryText = meal.deliveryType === 'pickup' ? 'for pickup' : 'to be delivered';

        const subject = `Meal Reminder - ${dateFormatted}`;
        const message = `Reminder: You're scheduled to provide a meal for ${missionaryNames} on ${dateFormatted} at ${meal.time} ${deliveryText}. Thank you for your service! - Ward Meal Coordinator`;

        return this.sendNotification(family, subject, message, true); // Prefer SMS
    }

    // Send notification to missionaries
    async sendMissionaryNotification(missionary, meal, family) {
        const dateFormatted = new Date(meal.date).toLocaleDateString();
        let subject, message;

        if (family) {
            const deliveryInfo = meal.deliveryType === 'pickup'
                ? `Please pick up your meal from ${family.familyName} at ${meal.time}.`
                : `${family.familyName} will deliver your meal at ${meal.time}.`;

            subject = `Meal Update - ${dateFormatted}`;
            message = `Meal Update: ${dateFormatted} - ${deliveryInfo} Contact: ${family.phoneNumber}`;
        } else {
            subject = `Meal Needed - ${dateFormatted}`;
            message = `Meal Needed: ${dateFormatted} at ${meal.time} - No family assigned yet. Please coordinate with meal coordinator.`;
        }

        return this.sendNotification(missionary, subject, message, true); // Prefer SMS
    }

    // Send custom message to multiple recipients
    async sendBulkNotification(recipients, subject, message, preferSMS = true) {
        const results = [];

        for (const recipient of recipients) {
            try {
                const result = await this.sendNotification(recipient, subject, message, preferSMS);
                results.push({ recipient: recipient.familyName || recipient.fullName, results: result });
            } catch (error) {
                results.push({
                    recipient: recipient.familyName || recipient.fullName,
                    results: [{ method: 'Error', success: false, error: error.message }]
                });
            }
        }

        return results;
    }

    // Format phone number for SMS
    formatPhoneNumber(phone) {
        if (!phone) return phone;

        const cleaned = phone.replace(/\D/g, '');

        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }

        return phone;
    }

    // Get status of available notification methods
    getStatus() {
        return {
            sms: {
                enabled: this.twilioEnabled,
                provider: 'Twilio'
            },
            email: {
                enabled: this.emailService.enabled,
                provider: 'Gmail'
            }
        };
    }
}

module.exports = NotificationService;
