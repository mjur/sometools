import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs } from '/js/ui.js';
import { safeParse, formatJSON, minifyJSON } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const formatBtn = qs('#format');
const minifyBtn = qs('#minify');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const downloadBtn = qs('#download');
const indentSelect = qs('#indent');
const sortKeysCheck = qs('#sort-keys');

// Load state
const storageKey = 'json-format-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.indent) indentSelect.value = state.indent;
  if (state.sortKeys !== undefined) sortKeysCheck.checked = state.sortKeys;
}

function format() {
  const inputText = input.value.trim();
  if (!inputText) {
    toast('Please enter JSON to format', 'error');
    return;
  }
  
  const parseResult = safeParse(inputText);
  if (!parseResult.success) {
    toast(`Invalid JSON: ${parseResult.error.message}`, 'error');
    output.value = '';
    return;
  }
  
  const indentRaw = indentSelect.value;
  // Convert string indent to number (select values are strings)
  let indent;
  if (indentRaw === 'tab') {
    indent = 'tab';
  } else {
    const num = parseInt(indentRaw, 10);
    indent = isNaN(num) ? 2 : num; // Ensure it's a number, default to 2
  }
  const sortKeys = sortKeysCheck.checked;
  
  try {
    const formatted = formatJSON(parseResult.data, { indent, sortKeys });
    if (!formatted || typeof formatted !== 'string') {
      throw new Error('Formatting failed - invalid result');
    }
    output.value = formatted;
    
    // Save state (save raw string value for select)
    saveStateWithStorage({
      input: inputText,
      indent: indentRaw,
      sortKeys
    }, storageKey);
    
    toast('JSON formatted successfully', 'success');
  } catch (e) {
    toast(`Format error: ${e.message}`, 'error');
  }
}

function minify() {
  const inputText = input.value.trim();
  if (!inputText) {
    toast('Please enter JSON to minify', 'error');
    return;
  }
  
  const parseResult = safeParse(inputText);
  if (!parseResult.success) {
    toast(`Invalid JSON: ${parseResult.error.message}`, 'error');
    output.value = '';
    return;
  }
  
  try {
    const minified = minifyJSON(parseResult.data);
    output.value = minified;
    toast('JSON minified successfully', 'success');
  } catch (e) {
    toast(`Minify error: ${e.message}`, 'error');
  }
}

on(formatBtn, 'click', format);
on(minifyBtn, 'click', minify);
on(copyInputBtn, 'click', () => copy(input.value, 'Input copied!'));
on(copyOutputBtn, 'click', () => copy(output.value, 'Output copied!'));
on(downloadBtn, 'click', () => {
  if (!output.value) {
    toast('No output to download', 'error');
    return;
  }
  downloadFile(output.value, 'formatted.json', 'application/json');
  toast('File downloaded', 'success');
});

// Auto-format on option change if there's input
on(indentSelect, 'change', () => {
  if (input.value.trim()) {
    format();
  }
});
on(sortKeysCheck, 'change', () => {
  if (input.value && output.value) {
    format();
  }
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    format();
  }
});

// Load from URL
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    format();
  }
}

