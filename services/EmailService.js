const nodemailer = require('nodemailer');

// Email service that can send to both email addresses and phone numbers (via SMS gateways)
class EmailService {
    constructor() {
        this.transporter = null;
        this.enabled = false;

        // SMS gateway domains for major carriers
        this.smsGateways = {
            verizon: 'vtext.com',
            att: 'txt.att.net',
            tmobile: 'tmomail.net',
            sprint: 'messaging.sprintpcs.com',
            uscellular: 'email.uscc.net',
            boost: 'myboostmobile.com',
            cricket: 'sms.cricketwireless.net',
            cricket2: 'mms.cricketwireless.net',
            cricket3: 'cricket.sprintpcs.com',
            metropcs: 'mymetropcs.com'
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
                }
            });
            this.enabled = true;
            console.log('Email service enabled (supports both email and SMS via gateways)');
        } else {
            console.log('Email credentials not found - email functionality disabled');
        }
    }

    // Format phone number for SMS gateway
    formatPhoneForSMS(phone) {
        if (!phone) return null;

        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');

        // Return 10-digit number if valid US number
        if (cleaned.length === 10) {
            return cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return cleaned.substring(1);
        }

        return null;
    }

    // Generate SMS gateway addresses for a phone number
    generateSMSAddresses(phone) {
        const cleanPhone = this.formatPhoneForSMS(phone);
        if (!cleanPhone) return [];

        return Object.values(this.smsGateways).map(domain => `${cleanPhone}@${domain}`);
    }

    // Send email to regular email address
    async sendEmail(to, subject, message) {
        if (!this.enabled) {
            console.log(`Email would be sent to ${to}: ${subject} - ${message}`);
            return { messageId: 'mock-email-id', status: 'simulated' };
        }

        try {
            const result = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: to,
                subject: subject,
                text: message,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`
            });
            return result;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Send SMS via email gateways (tries multiple carriers)
    async sendSMSViaEmail(phone, message, carrier = null) {
        console.log('🔧 sendSMSViaEmail called with:', { phone, message: message.substring(0, 50) + '...', carrier });

        if (!this.enabled) {
            console.log('📧 Email service not enabled - simulating SMS');
            console.log(`SMS via email would be sent to ${phone}: ${message}`);
            return { messageId: 'mock-sms-email-id', status: 'simulated' };
        }

        const cleanPhone = this.formatPhoneForSMS(phone);
        if (!cleanPhone) {
            throw new Error('Invalid phone number format');
        }

        console.log('📱 Clean phone number:', cleanPhone);

        let addresses = [];

        if (carrier && this.smsGateways[carrier.toLowerCase()]) {
            // Try specific carrier first
            addresses.push(`${cleanPhone}@${this.smsGateways[carrier.toLowerCase()]}`);
        } else {
            // Try all major carriers (focus on Cricket alternatives first)
            addresses = [
                `${cleanPhone}@${this.smsGateways.cricket}`,     // Cricket primary
                `${cleanPhone}@${this.smsGateways.cricket2}`,    // Cricket MMS gateway  
                `${cleanPhone}@${this.smsGateways.cricket3}`,    // Cricket Sprint gateway
                `${cleanPhone}@${this.smsGateways.verizon}`,
                `${cleanPhone}@${this.smsGateways.att}`,
                `${cleanPhone}@${this.smsGateways.tmobile}`,
                `${cleanPhone}@${this.smsGateways.sprint}`
            ];
        } console.log('📧 Trying SMS gateways:', addresses);

        // Send to multiple gateways (one will usually work)
        const results = [];
        for (const address of addresses) {
            try {
                console.log(`📤 Attempting to send to: ${address}`);
                const result = await this.transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: address,
                    subject: '', // SMS gateways often ignore subject
                    text: message
                });
                console.log(`✅ Success sending to ${address}:`, result.messageId);
                results.push({ address, success: true, result });
            } catch (error) {
                console.error(`❌ Failed sending to ${address}:`, error.message);
                results.push({ address, success: false, error: error.message });
            }
        }

        console.log('📊 Final SMS results:', results);
        return results;
    }    // Smart send: detects if recipient is email or phone and sends appropriately
    async sendToContact(contact, subject, message) {
        const results = [];

        // Try email first if available
        if (contact.email && contact.email.includes('@')) {
            try {
                const emailResult = await this.sendEmail(contact.email, subject, message);
                results.push({ method: 'email', success: true, to: contact.email, result: emailResult });
                return results; // Email sent successfully, no need to try SMS
            } catch (error) {
                results.push({ method: 'email', success: false, to: contact.email, error: error.message });
            }
        }

        // Try SMS via email gateway if phone number available
        if (contact.phoneNumber) {
            try {
                const smsResults = await this.sendSMSViaEmail(contact.phoneNumber, message, contact.carrier);
                const successfulSMS = smsResults.filter(r => r.success);

                if (successfulSMS.length > 0) {
                    results.push({
                        method: 'sms_via_email',
                        success: true,
                        to: contact.phoneNumber,
                        results: smsResults
                    });
                } else {
                    results.push({
                        method: 'sms_via_email',
                        success: false,
                        to: contact.phoneNumber,
                        error: 'No SMS gateways succeeded',
                        attempts: smsResults
                    });
                }
            } catch (error) {
                results.push({ method: 'sms_via_email', success: false, to: contact.phoneNumber, error: error.message });
            }
        }

        return results;
    }

    // Send meal reminder (tries email first, then SMS via email)
    async sendMealReminder(family, meal, missionaries) {
        const dateFormatted = new Date(meal.date).toLocaleDateString();
        const missionaryNames = missionaries.map(m => m.fullName).join(' and ');
        const deliveryText = meal.deliveryType === 'pickup' ? 'for pickup' : 'to be delivered';

        const subject = `Meal Reminder - ${dateFormatted}`;
        const message = `Reminder: You're scheduled to provide a meal for ${missionaryNames} on ${dateFormatted} at ${meal.time} ${deliveryText}. Thank you for your service! - Ward Meal Coordinator`;

        return this.sendToContact(family, subject, message);
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

        // For missionaries, we'll try both email and phone (they might have different preferences)
        const contact = {
            email: missionary.email,
            phoneNumber: missionary.phoneNumber || missionary.phone
        };

        return this.sendToContact(contact, subject, message);
    }

    // Send bulk notifications
    async sendBulkNotification(contacts, subject, message) {
        const results = [];

        for (const contact of contacts) {
            try {
                const result = await this.sendToContact(contact, subject, message);
                results.push({
                    contact: contact.familyName || contact.fullName || contact.email || contact.phoneNumber,
                    results: result
                });
            } catch (error) {
                results.push({
                    contact: contact.familyName || contact.fullName || contact.email || contact.phoneNumber,
                    results: [{ method: 'error', success: false, error: error.message }]
                });
            }
        }

        return results;
    }
}

module.exports = EmailService;
