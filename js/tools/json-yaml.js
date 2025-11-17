import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs } from '/js/ui.js';
import { jsonToYaml, yamlToJson } from '/js/utils/yaml.js';

const input = qs('#input');
const output = qs('#output');
const convertBtn = qs('#convert');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const clearBtn = qs('#clear');
const downloadBtn = qs('#download');
const directionSelect = qs('#direction');
const indentSelect = qs('#indent');
const prettyCheck = qs('#pretty');
const inputLabel = qs('#input-label');
const outputLabel = qs('#output-label');
const indentGroup = qs('#indent-group');
const prettyGroup = qs('#pretty-group');

let currentDirection = 'json-to-yaml';

// Load state
const storageKey = 'json-yaml-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.direction) {
  directionSelect.value = state.direction;
  currentDirection = state.direction;
}
if (state?.indent) indentSelect.value = state.indent;
if (state?.pretty !== undefined) prettyCheck.checked = state.pretty;

// Update UI based on direction
function updateDirection() {
  currentDirection = directionSelect.value;
  
  if (currentDirection === 'json-to-yaml') {
    inputLabel.textContent = 'JSON Input';
    outputLabel.textContent = 'YAML Output';
    input.placeholder = '{"foo":"bar","baz":123}';
    indentGroup.style.display = 'flex';
    prettyGroup.style.display = 'none';
  } else {
    inputLabel.textContent = 'YAML Input';
    outputLabel.textContent = 'JSON Output';
    input.placeholder = 'foo: bar\nbaz: 123';
    indentGroup.style.display = 'none';
    prettyGroup.style.display = 'flex';
  }
  
  // Clear output when direction changes
  output.value = '';
  
  // Save state
  saveState();
}

// Initial direction update
updateDirection();

// Update direction on change
on(directionSelect, 'change', () => {
  updateDirection();
  // Auto-convert if there's input
  if (input.value.trim()) {
    convert();
  }
});

// Convert function
function convert() {
  const inputText = input.value.trim();
  
  if (!inputText) {
    toast('Please enter input to convert', 'error');
    return;
  }
  
  try {
    if (currentDirection === 'json-to-yaml') {
      const indent = parseInt(indentSelect.value, 10);
      const yaml = jsonToYaml(inputText, indent);
      output.value = yaml;
      toast('Converted to YAML', 'success');
    } else {
      const pretty = prettyCheck.checked;
      const json = yamlToJson(inputText, pretty);
      output.value = json;
      toast('Converted to JSON', 'success');
    }
    
    // Save state
    saveState();
  } catch (e) {
    output.value = '';
    toast(`Error: ${e.message}`, 'error');
    console.error('Conversion error:', e);
  }
}

// Buttons
on(convertBtn, 'click', convert);
on(copyInputBtn, 'click', () => copy(input.value, 'Input copied!'));
on(copyOutputBtn, 'click', () => {
  if (output.value) {
    copy(output.value, 'Output copied!');
  } else {
    toast('No output to copy', 'error');
  }
});
on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  input.focus();
  saveState();
});

on(downloadBtn, 'click', () => {
  if (!output.value) {
    toast('No output to download', 'error');
    return;
  }
  
  const extension = currentDirection === 'json-to-yaml' ? 'yaml' : 'json';
  const mimeType = currentDirection === 'json-to-yaml' ? 'text/yaml' : 'application/json';
  const filename = `converted.${extension}`;
  
  downloadFile(output.value, filename, mimeType);
  toast('File downloaded', 'success');
});

// Auto-convert on option change
on(indentSelect, 'change', () => {
  if (currentDirection === 'json-to-yaml' && input.value.trim()) {
    convert();
  }
  saveState();
});

on(prettyCheck, 'change', () => {
  if (currentDirection === 'yaml-to-json' && input.value.trim()) {
    convert();
  }
  saveState();
});

// Save state
function saveState() {
  saveStateWithStorage({
    input: input.value,
    direction: currentDirection,
    indent: indentSelect.value,
    pretty: prettyCheck.checked
  }, storageKey);
}

// Auto-convert on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (input.value.trim()) {
      convert();
    } else {
      output.value = '';
    }
  }, 500);
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    convert();
  }
});

