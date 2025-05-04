// DOM Elements
const calendarDays = document.getElementById('calendar-days');
const currentMonthElement = document.getElementById('current-month');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const formDateElement = document.getElementById('form-date');
const entriesContainer = document.getElementById('entries-container');
const timeEntryForm = document.getElementById('time-entry-form');
const cancelFormButton = document.getElementById('cancel-form');
const entriesList = document.getElementById('entries-list');
const weekHoursElement = document.getElementById('week-hours');
const monthHoursElement = document.getElementById('month-hours');
const modalOverlay = document.getElementById('modal-overlay');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyDateRangeButton = document.getElementById('apply-date-range');
const payPeriodDatesElement = document.getElementById('pay-period-dates');

// State
let currentDate = new Date();
let selectedDate = new Date();
let viewedMonth = currentDate.getMonth();
let viewedYear = currentDate.getFullYear();
let dateRangeStart = null;
let dateRangeEnd = null;

// Initialize
function init() {
  renderCalendar();
  fetchAndUpdateStats();
  generatePayperiods();
  
  // Set initial date range to this week
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  startDateInput.valueAsDate = weekStart;
  endDateInput.valueAsDate = weekEnd;
  dateRangeStart = weekStart;
  dateRangeEnd = weekEnd;
  
  loadEntriesForDateRange(dateRangeStart, dateRangeEnd);
  
  // Event listeners
  prevMonthButton.addEventListener('click', () => {
    viewedMonth--;
    if (viewedMonth < 0) {
      viewedMonth = 11;
      viewedYear--;
    }
    renderCalendar();
  });
  
  nextMonthButton.addEventListener('click', () => {
    viewedMonth++;
    if (viewedMonth > 11) {
      viewedMonth = 0;
      viewedYear++;
    }
    renderCalendar();
  });
  
  cancelFormButton.addEventListener('click', hideEntryForm);
  
  timeEntryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEntry();
  });
  
  applyDateRangeButton.addEventListener('click', () => {
    dateRangeStart = startDateInput.valueAsDate;
    dateRangeEnd = endDateInput.valueAsDate;
    
    if (dateRangeStart && dateRangeEnd) {
      if (dateRangeStart > dateRangeEnd) {
        alert('Start date must be before end date');
        return;
      }
      loadEntriesForDateRange(dateRangeStart, dateRangeEnd);
    }
  });
  
  // Close modal when clicking outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      hideEntryForm();
    }
  });
}

// Calendar functions
function renderCalendar() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  currentMonthElement.textContent = `${monthNames[viewedMonth]} ${viewedYear}`;
  
  calendarDays.innerHTML = '';
  
  const firstDay = new Date(viewedYear, viewedMonth, 1);
  const lastDay = new Date(viewedYear, viewedMonth + 1, 0);
  
  // Calculate day of week for the first day (0 = Sunday)
  const firstDayOfWeek = firstDay.getDay();
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day disabled';
    calendarDays.appendChild(emptyDay);
  }
  
  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(viewedYear, viewedMonth, day);
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    // Check if this is today
    if (isToday(date)) {
      dayElement.classList.add('today');
    }
    
    // Check if this is the selected date
    if (isSameDay(date, selectedDate)) {
      dayElement.classList.add('selected');
    }
    
    // Add click event to select this day and show entry form
    dayElement.addEventListener('click', () => {
      selectedDate = date;
      formDateElement.textContent = formatDate(selectedDate);
      formDateElement.classList.add('formatted-date');
      
      // Update selected class
      document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
      });
      dayElement.classList.add('selected');
      
      // Show entry form immediately as modal
      showEntryForm();
    });
    
    calendarDays.appendChild(dayElement);
  }
}

// Entry functions
function showEntryForm() {
  modalOverlay.style.display = 'flex';
  formDateElement.textContent = formatDate(selectedDate);
  document.getElementById('start-time').value = '09:00';
  document.getElementById('end-time').value = '17:00';
  document.getElementById('lunch-duration').value = '30';
  document.getElementById('notes').value = '';
}

function hideEntryForm() {
  modalOverlay.style.display = 'none';
}

function saveEntry() {
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;
  const lunchDuration = parseInt(document.getElementById('lunch-duration').value, 10) || 0;
  const notes = document.getElementById('notes').value;
  
  // Calculate work duration (in minutes)
  const workDuration = calculateDuration(startTime, endTime);
  
  // Subtract lunch time
  const netDuration = Math.max(0, workDuration - lunchDuration);
  
  if (workDuration <= 0) {
    alert('End time must be after start time');
    return;
  }
  
  // Create entry object 
  const entry = {
    date: selectedDate.toISOString(),
    startTime,
    endTime,
    lunchDuration,
    grossDuration: workDuration,
    duration: netDuration, // This is the net duration (after lunch break)
    notes
  };
  
  // Send to server
  fetch('/api/time-entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    hideEntryForm();
    loadEntriesForDateRange(dateRangeStart, dateRangeEnd);
    fetchAndUpdateStats();
    alert('Your work hours have been saved successfully!');
  })
  .catch(error => {
    console.error('Error saving entry:', error);
    alert('Failed to save your work hours. Please try again.');
  });
}

function loadEntriesForDateRange(startDate, endDate) {
  // Update global date range variables
  dateRangeStart = startDate;
  dateRangeEnd = endDate;
  
  // Format dates for query
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Show loading state
  entriesList.innerHTML = '<div class="loading">Loading entries...</div>';
  
  // Fetch entries from server
  fetch(`/api/time-entries/range?startDate=${startDateStr}&endDate=${endDateStr}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(entries => {
      displayEntries(entries);
    })
    .catch(error => {
      console.error('Error fetching entries:', error);
      entriesList.innerHTML = '<div class="empty-state error">Failed to load entries. Please try again.</div>';
    });
}

function displayEntries(entries) {
  entriesList.innerHTML = '';
  
  if (entries.length === 0) {
    entriesList.innerHTML = '<div class="empty-state">No entries for this period. Click on a day in the calendar to add hours.</div>';
    return;
  }
  
  // Group entries by date
  const entriesByDate = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.date);
    const dateStr = date.toISOString().split('T')[0];
    
    if (!entriesByDate[dateStr]) {
      entriesByDate[dateStr] = {
        date: date,
        entries: [],
        totalDuration: 0,
        totalGrossDuration: 0,
        totalLunchDuration: 0
      };
    }
    
    entriesByDate[dateStr].entries.push(entry);
    entriesByDate[dateStr].totalDuration += entry.duration;
    entriesByDate[dateStr].totalGrossDuration += entry.grossDuration || entry.duration;
    entriesByDate[dateStr].totalLunchDuration += entry.lunchDuration || 0;
  });
  
  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(entriesByDate).sort().reverse();
  
  sortedDates.forEach(dateStr => {
    const dateGroup = entriesByDate[dateStr];
    
    const dateHeader = document.createElement('div');
    dateHeader.className = 'entry-item';
    dateHeader.style.backgroundColor = '#f5f5f5';
    dateHeader.style.fontWeight = 'bold';
    
    const dateText = document.createElement('div');
    dateText.style.display = 'flex';
    dateText.style.justifyContent = 'space-between';
    
    const dateLabel = document.createElement('span');
    dateLabel.textContent = formatDate(dateGroup.date);
    dateLabel.classList.add('formatted-date');
    
    const dateTotalTime = document.createElement('span');
    dateTotalTime.textContent = `Net: ${formatDuration(dateGroup.totalDuration)}`;
    dateTotalTime.style.color = 'var(--primary-color)';
    
    dateText.appendChild(dateLabel);
    dateText.appendChild(dateTotalTime);
    dateHeader.appendChild(dateText);
    
    // Add lunch information if there's any lunch time
    if (dateGroup.totalLunchDuration > 0) {
      const dateInfoText = document.createElement('div');
      dateInfoText.style.display = 'flex';
      dateInfoText.style.justifyContent = 'flex-end';
      dateInfoText.style.alignItems = 'center';
      dateInfoText.style.gap = '10px';
      dateInfoText.style.marginTop = '5px';
      dateInfoText.style.fontSize = '13px';
      
      const grossTimeInfo = document.createElement('span');
      grossTimeInfo.textContent = `Gross: ${formatDuration(dateGroup.totalGrossDuration)}`;
      grossTimeInfo.style.color = '#666';
      
      const lunchInfo = document.createElement('span');
      lunchInfo.className = 'lunch-tag';
      lunchInfo.textContent = `Lunch: ${formatMinutes(dateGroup.totalLunchDuration)}`;
      
      dateInfoText.appendChild(grossTimeInfo);
      dateInfoText.appendChild(lunchInfo);
      dateHeader.appendChild(dateInfoText);
    }
    
    entriesList.appendChild(dateHeader);
    
    // Add individual entries for this date
    dateGroup.entries.forEach(entry => {
      const entryElement = document.createElement('div');
      entryElement.className = 'entry-item';
      
      const headerElement = document.createElement('div');
      headerElement.className = 'entry-header';
      
      const timeElement = document.createElement('div');
      timeElement.className = 'entry-time';
      
      // Check if this is an overnight shift
      const startTimeParts = entry.startTime.split(':').map(Number);
      const endTimeParts = entry.endTime.split(':').map(Number);
      const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
      const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
      const isOvernightShift = endMinutes < startMinutes;
      
      if (isOvernightShift) {
        timeElement.textContent = `${entry.startTime} - ${entry.endTime}`;
        const overnightTag = document.createElement('span');
        overnightTag.className = 'overnight-indicator';
        overnightTag.textContent = 'Overnight';
        headerElement.appendChild(timeElement);
        headerElement.appendChild(overnightTag);
      } else {
        timeElement.textContent = `${entry.startTime} - ${entry.endTime}`;
        headerElement.appendChild(timeElement);
      }
      
      const durationElement = document.createElement('div');
      durationElement.className = 'entry-duration';
      durationElement.textContent = formatDuration(entry.duration);
      
      headerElement.appendChild(durationElement);
      entryElement.appendChild(headerElement);
      
      // Info line with lunch details
      if (entry.lunchDuration > 0) {
        const infoElement = document.createElement('div');
        infoElement.className = 'entry-info';
        
        const workText = document.createElement('span');
        workText.textContent = `Total work: ${formatDuration(entry.grossDuration)}`;
        
        const lunchTag = document.createElement('span');
        lunchTag.className = 'lunch-tag';
        lunchTag.textContent = `Lunch: ${formatMinutes(entry.lunchDuration)}`;
        
        infoElement.appendChild(workText);
        infoElement.appendChild(lunchTag);
        
        entryElement.appendChild(infoElement);
      }
      
      if (entry.notes) {
        const notesElement = document.createElement('div');
        notesElement.className = 'entry-notes';
        notesElement.textContent = entry.notes;
        entryElement.appendChild(notesElement);
      }
      
      const actionsElement = document.createElement('div');
      actionsElement.className = 'actions';
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'button-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        deleteEntry(entry._id);
      });
      
      actionsElement.appendChild(deleteButton);
      entryElement.appendChild(actionsElement);
      
      entriesList.appendChild(entryElement);
    });
  });
}

function deleteEntry(id) {
  if (confirm('Are you sure you want to delete this entry?')) {
    fetch(`/api/time-entries/${id}`, {
      method: 'DELETE'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      loadEntriesForDateRange(dateRangeStart, dateRangeEnd);
      fetchAndUpdateStats();
    })
    .catch(error => {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    });
  }
}

// Helper functions
function calculateDuration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  
  // If end time is earlier than start time, assume it's the next day
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours in minutes
  }
  
  return endMinutes - startMinutes;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
}

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }
}

function formatDate(date) {
  const options = { weekday: 'short', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function isToday(date) {
  const today = new Date();
  return isSameDay(date, today);
}

function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function fetchAndUpdateStats() {
  fetch('/api/time-entries/stats')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(stats => {
      // Update stats display
      weekHoursElement.textContent = formatDuration(stats.weekly.duration);
      monthHoursElement.textContent = formatDuration(stats.payPeriod.duration);
      
      // Update pay period dates
      if (payPeriodDatesElement) {
        payPeriodDatesElement.textContent = stats.payPeriod.dateRange;
      }
    })
    .catch(error => {
      console.error('Error fetching stats:', error);
      weekHoursElement.textContent = 'Error';
      monthHoursElement.textContent = 'Error';
    });
}

// Generate payperiods
function generatePayperiods() {
  const payperiodList = document.getElementById('payperiod-list');
  payperiodList.innerHTML = '';
  
  // Get the reference date (first Saturday of 2023)
  const referenceDate = new Date(2023, 0, 7); // January 7th, 2023 (First Saturday)
  
  // Get current date (use 2025 as the current year)
  const now = new Date();
  now.setFullYear(2025);
  
  // Calculate days since the reference date
  const msSinceReference = now.getTime() - referenceDate.getTime();
  const daysSinceReference = Math.floor(msSinceReference / (24 * 60 * 60 * 1000));
  
  // Find which pay period we're in (each period is 14 days)
  const currentPayPeriodNumber = Math.floor(daysSinceReference / 14);
  
  // Calculate the start of the current pay period
  const currentPayPeriodStart = new Date(referenceDate);
  currentPayPeriodStart.setDate(referenceDate.getDate() + (currentPayPeriodNumber * 14));
  
  // Generate the current and next 5 pay periods (3 months total)
  for (let i = 0; i < 6; i++) {
    const payPeriodNumber = currentPayPeriodNumber + i;
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() + (payPeriodNumber * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 13); // 14 days minus 1
    
    const payperiodItem = document.createElement('div');
    payperiodItem.className = 'payperiod-item';
    payperiodItem.style.cursor = 'pointer';
    
    // Mark the current pay period with blue highlight
    if (i === 0) {
      payperiodItem.classList.add('payperiod-current');
      payperiodItem.style.backgroundColor = '#e6f4ff';
      payperiodItem.style.borderLeft = '3px solid var(--primary-color)';
    }
    
    // Format with month names
    const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    payperiodItem.innerHTML = `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    
    // Add click event to filter entries by this pay period
    payperiodItem.addEventListener('click', () => {
      // Update date range inputs to match this pay period
      startDateInput.valueAsDate = new Date(startDate);
      endDateInput.valueAsDate = new Date(endDate);
      
      // Highlight the clicked pay period and remove highlight from others
      document.querySelectorAll('.payperiod-item').forEach(item => {
        item.style.backgroundColor = '';
        item.style.borderLeft = '';
        item.classList.remove('payperiod-current');
      });
      
      payperiodItem.classList.add('payperiod-current');
      payperiodItem.style.backgroundColor = '#e6f4ff';
      payperiodItem.style.borderLeft = '3px solid var(--primary-color)';
      
      // Load entries for this pay period
      loadEntriesForDateRange(startDate, endDate);
      
      // Update section title to show which pay period is being viewed
      const entriesTitle = document.querySelector('#entries-container .header-actions h2');
      if (entriesTitle) {
        entriesTitle.textContent = `Hours Worked (${startMonth} ${startDay} - ${endMonth} ${endDay})`;
      }
    });
    
    payperiodList.appendChild(payperiodItem);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 