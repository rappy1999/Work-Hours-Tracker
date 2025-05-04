const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  lunchDuration: {
    type: Number,
    default: 0
  },
  grossDuration: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TimeEntry = mongoose.model('TimeEntry', TimeEntrySchema);

module.exports = TimeEntry; 