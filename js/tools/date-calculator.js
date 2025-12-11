import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const calcMode = qs('#calc-mode');
const date1 = qs('#date1');
const date2 = qs('#date2');
const baseDate = qs('#base-date');
const operation = qs('#operation');
const amount = qs('#amount');
const unit = qs('#unit');
const result = qs('#result');
const copyResultBtn = qs('#copy-result');
const differenceMode = qs('#difference-mode');
const addSubtractMode = qs('#add-subtract-mode');
const useNow1 = qs('#use-now1');
const useNow2 = qs('#use-now2');
const useNowBase = qs('#use-now-base');

const storageKey = 'date-calculator-state';

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function updateMode() {
  const mode = calcMode.value;
  if (mode === 'difference') {
    differenceMode.style.display = 'grid';
    addSubtractMode.style.display = 'none';
  } else {
    differenceMode.style.display = 'none';
    addSubtractMode.style.display = 'grid';
  }
  calculate();
}

function calculate() {
  const mode = calcMode.value;
  
  try {
    if (mode === 'difference') {
      const d1 = new Date(date1.value);
      const d2 = new Date(date2.value);
      
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        result.value = '';
        return;
      }
      
      const diffMs = Math.abs(d2 - d1);
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30.44); // Average days per month
      const diffYears = Math.floor(diffDays / 365.25); // Average days per year
      
      const isNegative = d2 < d1;
      const sign = isNegative ? '-' : '';
      
      const info = [
        `Start: ${d1.toLocaleString()}`,
        `End: ${d2.toLocaleString()}`,
        '',
        'Difference:',
        `  ${sign}${diffYears} years`,
        `  ${sign}${diffMonths} months`,
        `  ${sign}${diffWeeks} weeks`,
        `  ${sign}${diffDays} days`,
        `  ${sign}${diffHours} hours`,
        `  ${sign}${diffMinutes} minutes`,
        `  ${sign}${diffSeconds} seconds`,
        `  ${sign}${diffMs} milliseconds`,
        '',
        `Total days: ${sign}${diffDays}`,
        `Total hours: ${sign}${diffHours}`,
        `Total minutes: ${sign}${diffMinutes}`,
        `Total seconds: ${sign}${diffSeconds}`,
      ].join('\n');
      
      result.value = info;
    } else {
      const base = new Date(baseDate.value);
      if (isNaN(base.getTime())) {
        result.value = '';
        return;
      }
      
      const op = operation.value;
      const amt = parseInt(amount.value) || 0;
      const unitValue = unit.value;
      
      let resultDate = new Date(base);
      
      if (op === 'add') {
        switch (unitValue) {
          case 'seconds': resultDate.setSeconds(resultDate.getSeconds() + amt); break;
          case 'minutes': resultDate.setMinutes(resultDate.getMinutes() + amt); break;
          case 'hours': resultDate.setHours(resultDate.getHours() + amt); break;
          case 'days': resultDate.setDate(resultDate.getDate() + amt); break;
          case 'weeks': resultDate.setDate(resultDate.getDate() + (amt * 7)); break;
          case 'months': resultDate.setMonth(resultDate.getMonth() + amt); break;
          case 'years': resultDate.setFullYear(resultDate.getFullYear() + amt); break;
        }
      } else {
        switch (unitValue) {
          case 'seconds': resultDate.setSeconds(resultDate.getSeconds() - amt); break;
          case 'minutes': resultDate.setMinutes(resultDate.getMinutes() - amt); break;
          case 'hours': resultDate.setHours(resultDate.getHours() - amt); break;
          case 'days': resultDate.setDate(resultDate.getDate() - amt); break;
          case 'weeks': resultDate.setDate(resultDate.getDate() - (amt * 7)); break;
          case 'months': resultDate.setMonth(resultDate.getMonth() - amt); break;
          case 'years': resultDate.setFullYear(resultDate.getFullYear() - amt); break;
        }
      }
      
      const info = [
        `Base date: ${base.toLocaleString()}`,
        `Operation: ${op === 'add' ? 'Add' : 'Subtract'} ${amt} ${unitValue}`,
        '',
        'Result:',
        `  ISO 8601: ${resultDate.toISOString()}`,
        `  Local: ${resultDate.toLocaleString()}`,
        `  UTC: ${resultDate.toUTCString()}`,
        `  Unix (seconds): ${Math.floor(resultDate.getTime() / 1000)}`,
        `  Unix (milliseconds): ${resultDate.getTime()}`,
      ].join('\n');
      
      result.value = info;
    }
    
    saveStateWithStorage(storageKey, {
      mode: mode,
      date1: date1.value,
      date2: date2.value,
      baseDate: baseDate.value,
      operation: operation.value,
      amount: amount.value,
      unit: unit.value
    });
  } catch (error) {
    result.value = `Error: ${error.message}`;
  }
}

on(calcMode, 'change', updateMode);
on(date1, 'input', calculate);
on(date2, 'input', calculate);
on(baseDate, 'input', calculate);
on(operation, 'change', calculate);
on(amount, 'input', calculate);
on(unit, 'change', calculate);

on(useNow1, 'click', () => {
  date1.value = formatDateTimeLocal(new Date());
  calculate();
});
on(useNow2, 'click', () => {
  date2.value = formatDateTimeLocal(new Date());
  calculate();
});
on(useNowBase, 'click', () => {
  baseDate.value = formatDateTimeLocal(new Date());
  calculate();
});

on(copyResultBtn, 'click', async () => {
  await copy(result.value);
  toast('Result copied');
});

// Load state first
const state = loadStateWithStorage(storageKey);
if (state) {
  if (state.mode) calcMode.value = state.mode;
  if (state.date1) date1.value = state.date1;
  if (state.date2) date2.value = state.date2;
  if (state.baseDate) baseDate.value = state.baseDate;
  if (state.operation) operation.value = state.operation;
  if (state.amount) amount.value = state.amount;
  if (state.unit) unit.value = state.unit;
} else {
  // Initialize with current time (and tomorrow for date2 to show a difference)
  const now = formatDateTimeLocal(new Date());
  const tomorrow = formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));
  date1.value = now;
  date2.value = tomorrow;
  baseDate.value = now;
}

updateMode();

