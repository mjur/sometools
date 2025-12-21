import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const parseBtn = qs('#parse');
const copyOutputBtn = qs('#copy-output');
const useCurrentCheckbox = qs('#use-current');

const storageKey = 'iso8601-parser-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.useCurrent !== undefined) useCurrentCheckbox.checked = state.useCurrent;

function parseISO8601() {
  let inputValue = input.value.trim();
  
  if (useCurrentCheckbox.checked && !inputValue) {
    inputValue = new Date().toISOString();
    input.value = inputValue;
  }
  
  if (!inputValue) {
    output.value = '';
    return;
  }
  
  try {
    const date = new Date(inputValue);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid ISO 8601 date string');
    }
    
    // Validate it's a valid ISO 8601 format
    const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    const isISO8601 = isoPattern.test(inputValue) || date.toISOString() === inputValue;
    
    const info = [
      `Input: ${inputValue}`,
      `Valid ISO 8601: ${isISO8601 ? 'Yes' : 'No (but parseable)'}`,
      '',
      'ISO 8601 Formats:',
      `  Full: ${date.toISOString()}`,
      `  Date only: ${date.toISOString().split('T')[0]}`,
      `  Date-time: ${date.toISOString().replace('Z', '')}`,
      `  With offset: ${date.toISOString().replace('Z', '+00:00')}`,
      '',
      'Other Formats:',
      `  Local: ${date.toLocaleString()}`,
      `  UTC: ${date.toUTCString()}`,
      `  Unix (seconds): ${Math.floor(date.getTime() / 1000)}`,
      `  Unix (milliseconds): ${date.getTime()}`,
      '',
      'Components:',
      `  Year: ${date.getFullYear()}`,
      `  Month: ${date.getMonth() + 1} (${date.toLocaleString('default', { month: 'long' })})`,
      `  Day: ${date.getDate()}`,
      `  Day of week: ${date.toLocaleString('default', { weekday: 'long' })}`,
      `  Hour: ${date.getHours()}`,
      `  Minute: ${date.getMinutes()}`,
      `  Second: ${date.getSeconds()}`,
      `  Millisecond: ${date.getMilliseconds()}`,
      `  Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    ].join('\n');
    
    output.value = info;
    
    saveStateWithStorage(storageKey, {
      input: inputValue,
      useCurrent: useCurrentCheckbox.checked
    });
  } catch (error) {
    output.value = `Error: ${error.message}`;
  }
}

on(parseBtn, 'click', parseISO8601);
on(input, 'keypress', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    parseISO8601();
  }
});
on(useCurrentCheckbox, 'change', () => {
  if (useCurrentCheckbox.checked) {
    input.value = new Date().toISOString();
    parseISO8601();
  }
});
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});

// Auto-parse on input if use current is checked
on(input, 'input', () => {
  if (!useCurrentCheckbox.checked) {
    parseISO8601();
  }
});

// Initial parse if use current is checked
if (useCurrentCheckbox.checked) {
  input.value = new Date().toISOString();
  parseISO8601();
}

