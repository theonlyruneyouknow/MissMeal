const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    default: '6:00 PM'
  },
  companionship: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Missionary',
    required: true
  }],
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    default: null
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery', 'dining'],
    default: 'delivery'
  },
  notes: {
    type: String,
    default: ''
  },
  isAssigned: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient date queries
mealSchema.index({ date: 1 });

module.exports = mongoose.model('Meal', mealSchema);