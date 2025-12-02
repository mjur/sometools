import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs } from '/js/ui.js';
import { formatSQL, minifySQL } from '/js/utils/sql.js';

const input = qs('#input');
const output = qs('#output');
const formatBtn = qs('#format');
const minifyBtn = qs('#minify');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const downloadBtn = qs('#download');
const indentSelect = qs('#indent');
const keywordCaseSelect = qs('#keyword-case');

// Load state
const storageKey = 'sql-format-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.indent) indentSelect.value = state.indent;
  if (state.keywordCase) keywordCaseSelect.value = state.keywordCase;
}

function format() {
  const inputText = input.value.trim();
  if (!inputText) {
    toast('Please enter SQL to format', 'error');
    return;
  }
  
  const indentRaw = indentSelect.value;
  let indent;
  if (indentRaw === 'tab') {
    indent = 'tab';
  } else {
    const num = parseInt(indentRaw, 10);
    indent = isNaN(num) ? 2 : num;
  }
  const keywordCase = keywordCaseSelect.value || 'upper';
  
  try {
    const formatted = formatSQL(inputText, { indent, keywordCase });
    if (!formatted || typeof formatted !== 'string') {
      throw new Error('Formatting failed - invalid result');
    }
    output.value = formatted;
    
    // Save state
    saveStateWithStorage({
      input: inputText,
      indent: indentRaw,
      keywordCase
    }, storageKey);
    
    toast('SQL formatted successfully', 'success');
  } catch (e) {
    toast(`Format error: ${e.message}`, 'error');
    console.error('SQL format error:', e);
  }
}

function minify() {
  const inputText = input.value.trim();
  if (!inputText) {
    toast('Please enter SQL to minify', 'error');
    return;
  }
  
  try {
    const minified = minifySQL(inputText);
    output.value = minified;
    toast('SQL minified successfully', 'success');
  } catch (e) {
    toast(`Minify error: ${e.message}`, 'error');
    console.error('SQL minify error:', e);
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
  downloadFile(output.value, 'formatted.sql', 'text/plain');
  toast('File downloaded', 'success');
});

// Auto-format on option change if there's input
on(indentSelect, 'change', () => {
  if (input.value.trim()) {
    format();
  }
});
on(keywordCaseSelect, 'change', () => {
  if (input.value.trim()) {
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

