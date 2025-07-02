const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const Family = require('../models/Family');
const Missionary = require('../models/Missionary');
const moment = require('moment');

// Initialize Twilio client only if credentials are provided
let client = null;
let twilioPhoneNumber = null;
let twilioEnabled = false;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  try {
    const twilio = require('twilio');
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    twilioEnabled = true;
    console.log('Twilio SMS functionality enabled');
  } catch (error) {
    console.log('Twilio not configured - SMS functionality disabled');
  }
} else {
  console.log('Twilio credentials not found - SMS functionality disabled');
}

// Function to send SMS
async function sendSMS(to, message) {
  if (!twilioEnabled) {
    console.log(`SMS would be sent to ${to}: ${message}`);
    return { sid: 'mock-message-id', status: 'simulated' };
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to
    });
    return result;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

// Function to format phone number
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

// GET text messaging dashboard
router.get('/', async (req, res) => {
  try {
    const upcomingMeals = await Meal.find({
      date: { $gte: new Date() }
    })
    .populate('family')
    .populate('companionship')
    .sort({ date: 1 })
    .limit(10);
    
    res.render('text/index', { upcomingMeals, twilioEnabled });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading text dashboard');
  }
});

// POST send reminder to family for specific meal
router.post('/remind-family/:mealId', async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.mealId)
      .populate('family')
      .populate('companionship');
    
    if (!meal || !meal.family) {
      return res.status(400).json({ error: 'Meal or family not found' });
    }
    
    const missionaryNames = meal.companionship.map(m => m.fullName).join(' and ');
    const dateFormatted = moment(meal.date).format('dddd, MMMM Do');
    const deliveryText = meal.deliveryType === 'pickup' ? 'for pickup' : 'to be delivered';
    
    const message = `Reminder: You're scheduled to provide a meal for ${missionaryNames} on ${dateFormatted} at ${meal.time} ${deliveryText}. Thank you for your service! - Ward Meal Coordinator`;
    
    await sendSMS(formatPhoneNumber(meal.family.phoneNumber), message);
    
    // Mark reminder as sent
    meal.reminderSent = true;
    await meal.save();
    
    const responseMessage = twilioEnabled 
      ? 'Reminder sent successfully!' 
      : 'Reminder logged (SMS simulation mode - Twilio not configured)';
    
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
      .populate('companionship');
    
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
    const sendPromises = meal.companionship.map(missionary => 
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

module.exports = router;