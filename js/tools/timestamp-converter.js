import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const conversionMode = qs('#conversion-mode');
const inputLabel = qs('#input-label');
const outputLabel = qs('#output-label');
const copyOutputBtn = qs('#copy-output');
const useCurrentBtn = qs('#use-current');

const storageKey = 'timestamp-converter-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.mode) conversionMode.value = state.mode;

function updateLabels() {
  const mode = conversionMode.value;
  if (mode === 'timestamp-to-date') {
    inputLabel.textContent = 'Unix Timestamp';
    outputLabel.textContent = 'Date & Time';
    input.placeholder = 'Enter Unix timestamp (seconds or milliseconds)';
    output.placeholder = 'Converted date will appear here';
  } else {
    inputLabel.textContent = 'Date & Time';
    outputLabel.textContent = 'Unix Timestamp';
    input.placeholder = 'Enter date (e.g., 2025-01-15 14:30:00)';
    output.placeholder = 'Converted timestamp will appear here';
  }
  convert();
}

function convert() {
  const mode = conversionMode.value;
  const inputValue = input.value.trim();
  
  if (!inputValue) {
    output.value = '';
    return;
  }
  
  try {
    if (mode === 'timestamp-to-date') {
      // Convert timestamp to date
      let timestamp = parseFloat(inputValue);
      
      // Auto-detect seconds vs milliseconds
      if (timestamp > 1e12) {
        // Likely milliseconds
        timestamp = timestamp / 1000;
      }
      
      if (isNaN(timestamp) || timestamp < 0) {
        throw new Error('Invalid timestamp');
      }
      
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp');
      }
      
      const formats = [
        `ISO 8601: ${date.toISOString()}`,
        `Local: ${date.toLocaleString()}`,
        `UTC: ${date.toUTCString()}`,
        `Unix (seconds): ${Math.floor(timestamp)}`,
        `Unix (milliseconds): ${Math.floor(timestamp * 1000)}`,
        `Year: ${date.getFullYear()}`,
        `Month: ${date.getMonth() + 1}`,
        `Day: ${date.getDate()}`,
        `Hour: ${date.getHours()}`,
        `Minute: ${date.getMinutes()}`,
        `Second: ${date.getSeconds()}`,
      ].join('\n');
      
      output.value = formats;
    } else {
      // Convert date to timestamp
      const dateStr = inputValue;
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      const timestampSeconds = Math.floor(date.getTime() / 1000);
      const timestampMillis = date.getTime();
      
      const formats = [
        `Unix (seconds): ${timestampSeconds}`,
        `Unix (milliseconds): ${timestampMillis}`,
        `ISO 8601: ${date.toISOString()}`,
        `Local: ${date.toLocaleString()}`,
        `UTC: ${date.toUTCString()}`,
      ].join('\n');
      
      output.value = formats;
    }
    
    saveStateWithStorage(storageKey, {
      input: inputValue,
      mode: mode
    });
  } catch (error) {
    output.value = `Error: ${error.message}`;
  }
}

on(conversionMode, 'change', updateLabels);
on(input, 'input', convert);
on(useCurrentBtn, 'click', () => {
  const now = Math.floor(Date.now() / 1000);
  input.value = now.toString();
  convert();
});
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});

// Initial conversion
updateLabels();

