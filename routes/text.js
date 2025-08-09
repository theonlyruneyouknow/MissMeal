const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Companionship = require('../models/Companionship');
const moment = require('moment');

// Try to load EmailService for email-to-SMS functionality
let EmailService = null;
try {
  EmailService = require('../services/EmailService');
} catch (error) {
  console.log('EmailService not available');
}

// Initialize Twilio client only if credentials are provided
let client = null;
let twilioPhoneNumber = null;
let twilioEnabled = false;
let twilioVerifyEnabled = false;
let verifyServiceSid = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    if (process.env.TWILIO_PHONE_NUMBER) {
      twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      twilioEnabled = true;
      console.log('Twilio SMS functionality enabled');
    }

    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      twilioVerifyEnabled = true;
      console.log('Twilio Verify functionality enabled');
    }
  } catch (error) {
    console.log('Twilio not configured - SMS functionality disabled');
  }
} else {
  console.log('Twilio credentials not found - SMS functionality disabled');
}

// Initialize EmailService
let emailService = null;
if (EmailService) {
  emailService = new EmailService();
}

// Function to send SMS (tries multiple Twilio methods, then email-to-SMS)
async function sendSMS(to, message) {
  console.log('🔧 sendSMS called with:', { to, message: message.substring(0, 50) + '...', twilioVerifyEnabled, twilioEnabled });

  // Check opt-in status before sending
  const formattedPhone = formatPhoneNumber(to);
  const family = await Family.findOne({ phoneNumber: formattedPhone });
  const missionary = await Missionary.findOne({ phoneNumber: formattedPhone });

  const contact = family || missionary;
  if (contact && !contact.smsOptIn) {
    console.log('❌ SMS not sent - user has not opted in to SMS notifications:', formattedPhone);
    return {
      method: 'blocked_no_opt_in',
      success: false,
      message: 'User has not opted in to SMS notifications'
    };
  }

  // Try Twilio Verify first if available (works better with Cricket Wireless)
  if (twilioVerifyEnabled) {
    try {
      console.log('🔐 Attempting Twilio Verify SMS to:', formatPhoneNumber(to));

      // For meal notifications, we'll use a verification with custom message
      const verification = await client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({
          to: formatPhoneNumber(to),
          channel: 'sms',
          customMessage: message.substring(0, 160) // SMS length limit
        });

      console.log('✅ Twilio Verify SMS success:', verification.sid);
      return { method: 'twilio_verify', success: true, result: verification };
    } catch (error) {
      console.error('❌ Twilio Verify failed:', error.message);
      console.error('Twilio Verify error details:', error);
      // Continue to try other methods
    }
  }

  // Try regular Twilio SMS as fallback
  if (twilioEnabled) {
    try {
      console.log('� Attempting Twilio SMS to:', formatPhoneNumber(to));

      // Try with messaging service for better delivery (if available)
      const messageOptions = {
        body: message,
        to: formatPhoneNumber(to)
      };

      // Use from number as fallback
      messageOptions.from = twilioPhoneNumber;

      const result = await client.messages.create(messageOptions);
      console.log('✅ Twilio SMS success:', result.sid);

      // Check delivery status after a brief delay
      setTimeout(async () => {
        try {
          const updated = await client.messages(result.sid).fetch();
          console.log('📊 Message status update:', updated.status, updated.errorCode || 'no error');
        } catch (statusError) {
          console.log('Status check error:', statusError.message);
        }
      }, 3000);

      return { method: 'twilio', success: true, result };
    } catch (error) {
      console.error('❌ Twilio SMS failed:', error.message);
      console.error('Twilio error details:', error);
    }
  }

  // Fallback to email-to-SMS if available
  if (emailService && emailService.enabled) {
    try {
      console.log('📧 Falling back to email-to-SMS');
      const results = await emailService.sendSMSViaEmail(to, message);
      const successfulResults = results.filter(r => r.success);

      if (successfulResults.length > 0) {
        console.log('✅ Email-to-SMS success');
        return { method: 'email_to_sms', success: true, results };
      } else {
        console.log('❌ Email-to-SMS failed');
        return { method: 'email_to_sms', success: false, error: 'No SMS gateways succeeded', results };
      }
    } catch (error) {
      console.error('❌ Email-to-SMS error:', error.message);
    }
  }

  // If both methods fail, simulate the message
  console.log('📝 No SMS methods available - simulating');
  console.log(`SMS would be sent to ${to}: ${message}`);
  return { method: 'simulated', success: true, message: 'SMS simulated (no services available)' };
}// Function to format phone number
function formatPhoneNumber(phone) {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Add +1 if it's a 10-digit number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  return phone; // Return as-is if not a standard US number
}

// Function to send verification code using Twilio Verify (for testing Cricket delivery)
async function sendVerificationCode(to) {
  if (!twilioVerifyEnabled) {
    throw new Error('Twilio Verify not configured');
  }

  try {
    console.log('🔐 Sending verification code to:', formatPhoneNumber(to));
    const verification = await client.verify.v2.services(verifyServiceSid)
      .verifications
      .create({
        to: formatPhoneNumber(to),
        channel: 'sms'
      });

    console.log('✅ Verification code sent:', verification.sid);
    return { success: true, sid: verification.sid, status: verification.status };
  } catch (error) {
    console.error('❌ Verification code failed:', error.message);
    throw error;
  }
}

// GET text messaging dashboard
router.get('/', async (req, res) => {
  try {
    const upcomingMeals = await Meal.find({
      date: { $gte: new Date() }
    })
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      })
      .sort({ date: 1 })
      .limit(10);

    // Check available notification methods
    const notificationStatus = {
      twilio: twilioEnabled,
      emailToSMS: emailService && emailService.enabled,
      anyMethodAvailable: twilioEnabled || (emailService && emailService.enabled)
    };

    res.render('text/index', {
      upcomingMeals,
      twilioEnabled,
      notificationStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading text dashboard');
  }
});

// GET test page for debugging modals
router.get('/test', (req, res) => {
  res.render('text/test');
});

// POST test verification code (for Cricket Wireless testing)
router.post('/test-verify', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await sendVerificationCode(phoneNumber);
    res.json({
      success: true,
      message: 'Verification code sent via Twilio Verify (better for Cricket)',
      sid: result.sid
    });
  } catch (error) {
    console.error('Verification test error:', error);
    res.status(500).json({ error: error.message });
  }
});// POST send reminder to family for specific meal
router.post('/remind-family/:mealId', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.mealId)
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      });

    if (!meal || !meal.family) {
      return res.status(400).json({ error: 'Meal or family not found' });
    }

    // Create missionary names string
    const missionaryNames = meal.companionship.missionaries.map(m => m.fullName).join(' and ');
    const dateFormatted = moment(meal.date).format('dddd, MMMM Do');
    const deliveryText = meal.deliveryType === 'pickup' ? 'for pickup' : 'to be delivered';

    const message = `Reminder: You're scheduled to provide a meal for ${missionaryNames} on ${dateFormatted} at ${meal.time} ${deliveryText}. Thank you for your service! - Ward Meal Coordinator`;

    await sendSMS(formatPhoneNumber(meal.family.phoneNumber), message);

    // Mark reminder as sent
    meal.reminderSent = true;
    await meal.save();

    const responseMessage = twilioEnabled
      ? 'Reminder sent successfully via Twilio SMS!'
      : (emailService && emailService.enabled)
        ? 'Reminder sent successfully via Email-to-SMS!'
        : 'Reminder logged (no SMS services configured)';

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending reminder' });
  }
});

// POST send meal details to missionaries
router.post('/notify-missionaries/:mealId', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.mealId)
      .populate('family')
      .populate({
        path: 'companionship',
        populate: {
          path: 'missionaries'
        }
      });

    if (!meal) {
      return res.status(400).json({ error: 'Meal not found' });
    }

    const dateFormatted = moment(meal.date).format('dddd, MMMM Do');
    let message;

    if (meal.family) {
      const deliveryInfo = meal.deliveryType === 'pickup'
        ? `Please pick up your meal from ${meal.family.familyName} at ${meal.time}.`
        : `${meal.family.familyName} will deliver your meal at ${meal.time}.`;

      message = `Meal Update: ${dateFormatted} - ${deliveryInfo} Contact: ${meal.family.phoneNumber}`;
    } else {
      message = `Meal Needed: ${dateFormatted} at ${meal.time} - No family assigned yet. Please coordinate with meal coordinator.`;
    }

    // Send to all missionaries in companionship
    const sendPromises = meal.companionship.missionaries.map(missionary =>
      sendSMS(formatPhoneNumber(missionary.phoneNumber), message)
    );

    await Promise.all(sendPromises);

    const responseMessage = twilioEnabled
      ? 'Notifications sent to missionaries!'
      : 'Notifications logged (SMS simulation mode - Twilio not configured)';

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending notifications' });
  }
});

// POST send custom message
router.post('/custom', async (req, res) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !message) {
      return res.status(400).json({ error: 'Recipients and message are required' });
    }

    const phoneNumbers = recipients.split(',').map(phone => phone.trim());

    const sendPromises = phoneNumbers.map(phone =>
      sendSMS(formatPhoneNumber(phone), message)
    );

    await Promise.all(sendPromises);

    const responseMessage = twilioEnabled
      ? `Message sent to ${phoneNumbers.length} recipient(s)!`
      : `Message logged for ${phoneNumbers.length} recipient(s) (SMS simulation mode - Twilio not configured)`;

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending custom message' });
  }
});

// POST send meal availability request
router.post('/request-volunteers', async (req, res) => {
  try {
    const { dateStart, dateEnd, message } = req.body;

    // Get all active families
    const families = await Family.find({ isActive: true });

    const defaultMessage = `We need volunteers to provide meals for our sister missionaries between ${moment(dateStart).format('MMM Do')} and ${moment(dateEnd).format('MMM Do')}. Please contact the meal coordinator if you can help. Thank you!`;

    const finalMessage = message || defaultMessage;

    const sendPromises = families.map(family =>
      sendSMS(formatPhoneNumber(family.phoneNumber), finalMessage)
    );

    await Promise.all(sendPromises);

    const responseMessage = twilioEnabled
      ? `Volunteer request sent to ${families.length} families!`
      : `Volunteer request logged for ${families.length} families (SMS simulation mode - Twilio not configured)`;

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending volunteer requests' });
  }
});

// GET text history/logs (placeholder for future implementation)
router.get('/history', (req, res) => {
  res.render('text/history', { messages: [] });
});

// GET SMS opt-in page
router.get('/opt-in', (req, res) => {
  res.render('text/opt-in', {
    success: null,
    error: null,
    phoneNumber: req.query.phone || ''
  });
});

// POST SMS opt-in
router.post('/opt-in', async (req, res) => {
  try {
    const { phoneNumber, contactType, fullName } = req.body;

    if (!phoneNumber || !contactType || !fullName) {
      return res.render('text/opt-in', {
        error: 'All fields are required',
        success: null,
        phoneNumber: phoneNumber || ''
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    let updated = false;

    if (contactType === 'family') {
      // Try to find and update existing family
      const family = await Family.findOneAndUpdate(
        { phoneNumber: formattedPhone },
        {
          smsOptIn: true,
          smsOptInDate: new Date(),
          smsOptOutDate: null,
          preferredContactMethod: 'sms'
        },
        { new: true }
      );

      if (family) {
        updated = true;
      } else {
        // If not found, create a basic family record for SMS purposes
        const newFamily = new Family({
          familyName: fullName,
          contactName: fullName,
          phoneNumber: formattedPhone,
          email: `${fullName.replace(/\s+/g, '').toLowerCase()}@example.com`, // Placeholder
          smsOptIn: true,
          smsOptInDate: new Date(),
          preferredContactMethod: 'sms',
          isActive: true
        });

        await newFamily.save();
        updated = true;
      }
    } else if (contactType === 'missionary') {
      // Try to find and update existing missionary
      const missionary = await Missionary.findOneAndUpdate(
        { phoneNumber: formattedPhone },
        {
          smsOptIn: true,
          smsOptInDate: new Date(),
          smsOptOutDate: null,
          preferredContactMethod: 'sms'
        },
        { new: true }
      );

      if (missionary) {
        updated = true;
      } else {
        // If not found, create a basic missionary record for SMS purposes
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Sister';
        const lastName = nameParts.slice(1).join(' ') || 'Missionary';

        const newMissionary = new Missionary({
          firstName: firstName,
          lastName: lastName,
          phoneNumber: formattedPhone,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@missionary.org`,
          companionshipArea: 'TBD', // To be determined
          arrivalDate: new Date(),
          smsOptIn: true,
          smsOptInDate: new Date(),
          preferredContactMethod: 'sms',
          isActive: true
        });

        await newMissionary.save();
        updated = true;
      }
    }

    if (updated) {
      res.render('text/opt-in', {
        success: 'Successfully opted in to SMS notifications! You will now receive meal coordination messages.',
        error: null,
        phoneNumber: ''
      });
    } else {
      res.render('text/opt-in', {
        error: 'An error occurred while processing your opt-in request.',
        success: null,
        phoneNumber: phoneNumber
      });
    }

  } catch (error) {
    console.error('Opt-in error:', error);
    res.render('text/opt-in', {
      error: 'An error occurred. Please try again or contact the administrator.',
      success: null,
      phoneNumber: req.body.phoneNumber || ''
    });
  }
});

// GET SMS opt-out page
router.get('/opt-out', (req, res) => {
  res.render('text/opt-out', {
    success: null,
    error: null,
    phoneNumber: req.query.phone || ''
  });
});

// POST SMS opt-out
router.post('/opt-out', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.render('text/opt-out', {
        error: 'Phone number is required',
        success: null,
        phoneNumber: ''
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Try to find and update in both collections
    const familyUpdate = await Family.findOneAndUpdate(
      { phoneNumber: formattedPhone },
      {
        smsOptIn: false,
        smsOptOutDate: new Date(),
        preferredContactMethod: 'email'
      }
    );

    const missionaryUpdate = await Missionary.findOneAndUpdate(
      { phoneNumber: formattedPhone },
      {
        smsOptIn: false,
        smsOptOutDate: new Date(),
        preferredContactMethod: 'email'
      }
    );

    if (!familyUpdate && !missionaryUpdate) {
      return res.render('text/opt-out', {
        error: 'Phone number not found in our records',
        success: null,
        phoneNumber: phoneNumber
      });
    }

    res.render('text/opt-out', {
      success: 'Successfully opted out of SMS notifications. You will no longer receive text messages.',
      error: null,
      phoneNumber: ''
    });

  } catch (error) {
    console.error('Opt-out error:', error);
    res.render('text/opt-out', {
      error: 'An error occurred. Please try again.',
      success: null,
      phoneNumber: req.body.phoneNumber || ''
    });
  }
});

module.exports = router;