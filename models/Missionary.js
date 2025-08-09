const mongoose = require('mongoose');

const missionarySchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fullName: {
    type: String
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  companionshipArea: {
    type: String,
    required: true
  },
  isTrainer: {
    type: Boolean,
    default: false
  },
  arrivalDate: {
    type: Date,
    required: true
  },
  expectedDepartureDate: {
    type: Date
  },
  allergies: {
    type: String,
    default: ''
  },
  dietaryRestrictions: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  smsOptIn: {
    type: Boolean,
    default: false
  },
  smsOptInDate: {
    type: Date
  },
  smsOptOutDate: {
    type: Date
  },
  preferredContactMethod: {
    type: String,
    enum: ['sms', 'email', 'phone', 'both'],
    default: 'email'
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to create fullName
missionarySchema.pre('save', function (next) {
  this.fullName = `Sister ${this.firstName} ${this.lastName}`;
  next();
});

// Index for efficient searches
missionarySchema.index({ companionshipArea: 1 });
missionarySchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Missionary', missionarySchema);