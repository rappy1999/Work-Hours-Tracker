const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all time entries for current user
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find({ user: req.user.id }).sort({ date: -1 });
    res.json(timeEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get entries within date range
router.get('/range', ensureAuthenticated, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    const timeEntries = await TimeEntry.find({
      user: req.user.id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });
    
    res.json(timeEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get time entries for a specific date
router.get('/date/:date', ensureAuthenticated, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    const timeEntries = await TimeEntry.find({
      user: req.user.id,
      date: { $gte: date, $lt: nextDay }
    });
    
    res.json(timeEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stats (week, month)
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const today = new Date();
    
    // Get the previous Saturday (start of week)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToGoBack = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToGoBack);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Calculate pay period (assuming 14-day periods)
    const referenceDate = new Date(2023, 0, 7); // First Saturday of 2023
    const msSinceReference = today.getTime() - referenceDate.getTime();
    const daysSinceReference = Math.floor(msSinceReference / (24 * 60 * 60 * 1000));
    const payPeriodNumber = Math.floor(daysSinceReference / 14);
    
    const payPeriodStart = new Date(referenceDate);
    payPeriodStart.setDate(referenceDate.getDate() + (payPeriodNumber * 14));
    payPeriodStart.setHours(0, 0, 0, 0);
    
    const payPeriodEnd = new Date(payPeriodStart);
    payPeriodEnd.setDate(payPeriodStart.getDate() + 13);
    payPeriodEnd.setHours(23, 59, 59, 999);
    
    // Get weekly entries
    const weeklyEntries = await TimeEntry.find({
      user: req.user.id,
      date: { $gte: weekStart, $lte: weekEnd }
    });
    
    // Get pay period entries
    const payPeriodEntries = await TimeEntry.find({
      user: req.user.id,
      date: { $gte: payPeriodStart, $lte: payPeriodEnd }
    });
    
    // Calculate total durations
    const weeklyDuration = weeklyEntries.reduce((total, entry) => total + entry.duration, 0);
    const payPeriodDuration = payPeriodEntries.reduce((total, entry) => total + entry.duration, 0);
    
    // Format date ranges
    const weeklyDateRange = `${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`;
    const payPeriodDateRange = `${payPeriodStart.toISOString().split('T')[0]} - ${payPeriodEnd.toISOString().split('T')[0]}`;
    
    res.json({
      weekly: {
        duration: weeklyDuration,
        dateRange: weeklyDateRange
      },
      payPeriod: {
        duration: payPeriodDuration,
        dateRange: payPeriodDateRange
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new time entry
router.post('/', ensureAuthenticated, async (req, res) => {
  const { date, startTime, endTime, lunchDuration, grossDuration, duration, notes } = req.body;
  
  try {
    const newTimeEntry = new TimeEntry({
      user: req.user.id,
      date,
      startTime,
      endTime,
      lunchDuration,
      grossDuration,
      duration,
      notes
    });
    
    await newTimeEntry.save();
    res.status(201).json(newTimeEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update time entry
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id);
    
    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    // Check ownership
    if (timeEntry.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updatedTimeEntry = await TimeEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedTimeEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete time entry
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id);
    
    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    // Check ownership
    if (timeEntry.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await timeEntry.remove();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 