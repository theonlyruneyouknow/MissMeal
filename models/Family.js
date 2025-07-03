const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  familyName: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  preferredDeliveryType: {
    type: String,
    enum: ['pickup', 'delivery', 'either', 'dining'],
    default: 'either'
  },
  availableDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  unavailableDates: [{
    type: Date
  }],
  maxMealsPerMonth: {
    type: Number,
    default: 2
  },
  allergies: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient name searches
familySchema.index({ familyName: 1 });
familySchema.index({ contactName: 1 });

module.exports = mongoose.model('Family', familySchema);