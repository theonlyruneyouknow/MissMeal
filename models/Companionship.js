const mongoose = require('mongoose');

const companionshipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  area: {
    type: String,
    required: true
  },
  missionaries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Missionary',
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
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

// Virtual for display name
companionshipSchema.virtual('displayName').get(function() {
  return `${this.name} - ${this.area}`;
});

// Index for efficient searches
companionshipSchema.index({ area: 1 });
companionshipSchema.index({ isActive: 1 });
companionshipSchema.index({ startDate: 1 });

// Method to archive companionship
companionshipSchema.methods.archive = function() {
  this.isActive = false;
  this.endDate = new Date();
  return this.save();
};

// Method to reactivate companionship
companionshipSchema.methods.reactivate = function() {
  this.isActive = true;
  this.endDate = null;
  return this.save();
};

module.exports = mongoose.model('Companionship', companionshipSchema);