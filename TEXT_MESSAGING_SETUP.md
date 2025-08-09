# Text Messaging Setup Guide

Your Sister Missionary Meal Calendar app now supports multiple ways to send text updates to users!

## Option 1: Email-to-SMS (FREE and Easy!)

This method sends emails to carrier gateways that convert them to text messages.

### Setup Steps:
1. **Use any Gmail account** (create a new one if needed, like `wardmeals@gmail.com`)
2. **Enable 2-Factor Authentication** on the Gmail account
3. **Create an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Other (custom name)" → "Meal App"
4. **Add to your .env file**:
   ```
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASSWORD=your_16_character_app_password
   ```

### How it works:
- App automatically detects phone carrier and sends to the right gateway
- Tries multiple carriers (Verizon, AT&T, T-Mobile, Sprint) to ensure delivery
- Works with any Gmail account - no special sign-ups needed!

### Carrier Gateways Used:
- **Verizon**: phonenumber@vtext.com
- **AT&T**: phonenumber@txt.att.net  
- **T-Mobile**: phonenumber@tmomail.net
- **Sprint**: phonenumber@messaging.sprintpcs.com

## Option 2: Twilio SMS (Professional but costs money)

### Setup Steps:
1. **Sign up** at [twilio.com](https://www.twilio.com) (free trial with $15 credit)
2. **Get credentials** from Console Dashboard
3. **Add to your .env file**:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+15551234567
   ```

## Option 3: Both (Recommended)

Configure both services! The app will:
1. Try Twilio first (most reliable)
2. Fall back to Email-to-SMS if Twilio fails
3. Ensure messages always get delivered

## Testing

1. **Install dependencies**:
   ```
   npm install nodemailer twilio
   ```

2. **Start your app**:
   ```
   npm start
   ```

3. **Visit**: `http://localhost:3000/text`

4. **Test with your own phone number** using the custom message feature

## Tips

- **Email-to-SMS**: Messages appear from Gmail address, perfect for church use
- **Character limits**: Keep messages under 160 characters for best results
- **Delivery time**: Email-to-SMS can take 1-3 minutes, Twilio is instant
- **Cost**: Email-to-SMS is free, Twilio costs ~$0.0075 per message

## Troubleshooting

- **Gmail App Password not working**: Make sure 2FA is enabled first
- **Messages not arriving**: Check phone carrier (some smaller carriers not supported)
- **Gmail security**: Google may temporarily block if sending many messages quickly

The Email-to-SMS option is perfect for ward use - it's free, works with existing Gmail accounts, and covers all major carriers!
