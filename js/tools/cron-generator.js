import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const cronInput = qs('#cron-input');
const preset = qs('#preset');
const validateBtn = qs('#validate');
const generateBtn = qs('#generate');
const cronDetails = qs('#cron-details');
const nextRuns = qs('#next-runs');

const storageKey = 'cron-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.cron) cronInput.value = state.cron;
if (state?.preset) preset.value = state.preset;

const presets = {
  'every-minute': '* * * * *',
  'every-hour': '0 * * * *',
  'every-day': '0 0 * * *',
  'every-week': '0 0 * * 0',
  'every-month': '0 0 1 * *',
  'every-year': '0 0 1 1 *',
  'workdays': '0 9 * * 1-5'
};

function parseCronField(field, min, max, names = null) {
  if (field === '*') {
    return { type: 'every', value: null };
  }
  
  if (field.includes(',')) {
    const values = field.split(',').map(v => parseCronField(v.trim(), min, max, names));
    return { type: 'list', values };
  }
  
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => v.trim());
    const startVal = names ? names.indexOf(start) : parseInt(start);
    const endVal = names ? names.indexOf(end) : parseInt(end);
    return { type: 'range', start: startVal, end: endVal };
  }
  
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const baseVal = base === '*' ? min : (names ? names.indexOf(base) : parseInt(base));
    return { type: 'step', base: baseVal, step: parseInt(step) };
  }
  
  const val = names ? names.indexOf(field) : parseInt(field);
  return { type: 'value', value: val };
}

function validateCron(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron expression must have exactly 5 fields' };
  }
  
  const [minute, hour, day, month, weekday] = parts;
  
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const weekdayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  try {
    parseCronField(minute, 0, 59);
    parseCronField(hour, 0, 23);
    parseCronField(day, 1, 31);
    parseCronField(month, 1, 12, monthNames);
    parseCronField(weekday, 0, 6, weekdayNames);
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message || 'Invalid cron expression' };
  }
}

function describeCron(cron) {
  const parts = cron.trim().split(/\s+/);
  const [minute, hour, day, month, weekday] = parts;
  
  const descriptions = [];
  
  // Minute
  if (minute === '*') {
    descriptions.push('Every minute');
  } else if (minute === '0') {
    descriptions.push('At minute 0');
  } else {
    descriptions.push(`At minute ${minute}`);
  }
  
  // Hour
  if (hour === '*') {
    descriptions.push('every hour');
  } else if (hour === '0') {
    descriptions.push('at hour 0 (midnight)');
  } else {
    descriptions.push(`at hour ${hour}`);
  }
  
  // Day
  if (day === '*') {
    descriptions.push('every day');
  } else {
    descriptions.push(`on day ${day}`);
  }
  
  // Month
  if (month === '*') {
    descriptions.push('every month');
  } else {
    descriptions.push(`in month ${month}`);
  }
  
  // Weekday
  if (weekday === '*') {
    descriptions.push('every weekday');
  } else if (weekday === '0') {
    descriptions.push('on Sunday');
  } else if (weekday === '1-5') {
    descriptions.push('on weekdays (Mon-Fri)');
  } else {
    descriptions.push(`on weekday ${weekday}`);
  }
  
  return descriptions.join(', ');
}

function getNextRuns(cron, count = 10) {
  const parts = cron.trim().split(/\s+/);
  const [minute, hour, day, month, weekday] = parts;
  
  const runs = [];
  const now = new Date();
  let current = new Date(now);
  current.setSeconds(0);
  current.setMilliseconds(0);
  
  // Simple implementation - check next 1000 minutes
  for (let i = 0; i < 1000 && runs.length < count; i++) {
    const testDate = new Date(current.getTime() + i * 60 * 1000);
    const testMinute = testDate.getMinutes();
    const testHour = testDate.getHours();
    const testDay = testDate.getDate();
    const testMonth = testDate.getMonth() + 1;
    const testWeekday = testDate.getDay();
    
    if (matchesField(minute, testMinute, 0, 59) &&
        matchesField(hour, testHour, 0, 23) &&
        matchesField(day, testDay, 1, 31) &&
        matchesField(month, testMonth, 1, 12) &&
        matchesField(weekday, testWeekday, 0, 6)) {
      runs.push(new Date(testDate));
    }
  }
  
  return runs.slice(0, count);
}

function matchesField(field, value, min, max) {
  if (field === '*') return true;
  if (field.includes(',')) {
    return field.split(',').some(v => matchesField(v.trim(), value, min, max));
  }
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v.trim()));
    return value >= start && value <= end;
  }
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const baseVal = base === '*' ? min : parseInt(base);
    return (value - baseVal) % parseInt(step) === 0;
  }
  return parseInt(field) === value;
}

function validateAndShow() {
  const cron = cronInput.value.trim();
  
  if (!cron) {
    cronDetails.innerHTML = '<p style="color: var(--muted);">Enter or generate a cron expression to see details</p>';
    nextRuns.innerHTML = '<p style="color: var(--muted);">Valid cron expression required</p>';
    return;
  }
  
  const validation = validateCron(cron);
  
  if (!validation.valid) {
    cronDetails.innerHTML = `<p style="color: var(--error);">Error: ${validation.error}</p>`;
    nextRuns.innerHTML = '<p style="color: var(--muted);">Valid cron expression required</p>';
    return;
  }
  
  const parts = cron.split(/\s+/);
  const [minute, hour, day, month, weekday] = parts;
  
  const details = [
    '<div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; font-size: 0.875rem;">',
    `<div><strong>Expression:</strong></div><div><code>${cron}</code></div>`,
    `<div><strong>Description:</strong></div><div>${describeCron(cron)}</div>`,
    '',
    '<div><strong>Fields:</strong></div><div></div>',
    `<div>Minute:</div><div><code>${minute}</code></div>`,
    `<div>Hour:</div><div><code>${hour}</code></div>`,
    `<div>Day:</div><div><code>${day}</code></div>`,
    `<div>Month:</div><div><code>${month}</code></div>`,
    `<div>Weekday:</div><div><code>${weekday}</code></div>`,
    '</div>'
  ].join('\n');
  
  cronDetails.innerHTML = details;
  
  // Get next runs
  const runs = getNextRuns(cron);
  if (runs.length > 0) {
    const runsHtml = runs.map((date, i) => 
      `<div style="padding: 0.5rem; border-bottom: 1px solid var(--border);">
        <strong>${i + 1}.</strong> ${date.toLocaleString()} (${date.toISOString()})
      </div>`
    ).join('');
    nextRuns.innerHTML = runsHtml;
  } else {
    nextRuns.innerHTML = '<p style="color: var(--muted);">No upcoming runs found in the next 1000 minutes</p>';
  }
  
  saveStateWithStorage(storageKey, {
    cron: cron,
    preset: preset.value
  });
}

on(preset, 'change', () => {
  if (preset.value !== 'custom' && presets[preset.value]) {
    cronInput.value = presets[preset.value];
    validateAndShow();
  }
});

on(generateBtn, 'click', () => {
  if (preset.value !== 'custom' && presets[preset.value]) {
    cronInput.value = presets[preset.value];
    validateAndShow();
    toast('Cron expression generated');
  }
});

on(validateBtn, 'click', validateAndShow);
on(cronInput, 'input', () => {
  preset.value = 'custom';
  validateAndShow();
});

// Initial validation
if (cronInput.value) {
  validateAndShow();
}

