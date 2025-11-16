import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs } from '/js/ui.js';
import { encodeBase64, decodeBase64, encodeBase64URL, decodeBase64URL, isBase64, encodeFile } from '/js/utils/base64.js';

const input = qs('#input');
const output = qs('#output');
const runBtn = qs('#run');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const clearBtn = qs('#clear');
const downloadBtn = qs('#download');
const urlSafeCheck = qs('#url-safe');
const autoDetectCheck = qs('#auto-detect');
const tabs = qsa('.tab');
const dropZone = qs('#drop-zone');
const fileInput = qs('#file-input');

let currentMode = 'encode';

// Load state
const storageKey = 'base64-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.urlSafe !== undefined) urlSafeCheck.checked = state.urlSafe;
  if (state.autoDetect !== undefined) autoDetectCheck.checked = state.autoDetect;
  if (state.mode) {
    currentMode = state.mode;
    updateTabs();
  }
}

// Tab switching
function updateTabs() {
  tabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === currentMode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

tabs.forEach(tab => {
  on(tab, 'click', () => {
    currentMode = tab.getAttribute('data-tab');
    updateTabs();
    process();
  });
});

// Process function
function process() {
  const inputText = input.value.trim();
  if (!inputText) {
    output.value = '';
    return;
  }
  
  // Auto-detect
  if (autoDetectCheck.checked) {
    if (isBase64(inputText)) {
      currentMode = 'decode';
      updateTabs();
    } else {
      currentMode = 'encode';
      updateTabs();
    }
  }
  
  try {
    if (currentMode === 'encode') {
      const result = urlSafeCheck.checked 
        ? encodeBase64URL(inputText)
        : encodeBase64(inputText);
      output.value = result;
    } else {
      const result = urlSafeCheck.checked
        ? decodeBase64URL(inputText)
        : decodeBase64(inputText);
      output.value = result;
    }
    
    // Save state
    saveStateWithStorage({
      input: inputText,
      urlSafe: urlSafeCheck.checked,
      autoDetect: autoDetectCheck.checked,
      mode: currentMode
    }, storageKey);
    
    toast(`${currentMode === 'encode' ? 'Encoded' : 'Decoded'} successfully`, 'success');
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
    output.value = '';
  }
}

// File handling
on(dropZone, 'click', () => fileInput.click());

on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

on(dropZone, 'dragleave', () => {
  dropZone.classList.remove('dragover');
});

on(dropZone, 'drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  
  const file = e.dataTransfer.files[0] || fileInput.files[0];
  if (!file) return;
  
  try {
    const base64 = await encodeFile(file);
    input.value = base64;
    currentMode = 'encode';
    updateTabs();
    process();
    toast(`File "${file.name}" encoded`, 'success');
  } catch (err) {
    toast(`Failed to encode file: ${err.message}`, 'error');
  }
});

on(fileInput, 'change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const base64 = await encodeFile(file);
    input.value = base64;
    currentMode = 'encode';
    updateTabs();
    process();
    toast(`File "${file.name}" encoded`, 'success');
  } catch (err) {
    toast(`Failed to encode file: ${err.message}`, 'error');
  }
});

// Buttons
on(runBtn, 'click', process);
on(copyInputBtn, 'click', () => copy(input.value, 'Input copied!'));
on(copyOutputBtn, 'click', () => copy(output.value, 'Output copied!'));
on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  input.focus();
});

on(downloadBtn, 'click', () => {
  if (!output.value) {
    toast('No output to download', 'error');
    return;
  }
  const filename = currentMode === 'encode' ? 'encoded.txt' : 'decoded.txt';
  downloadFile(output.value, filename, 'text/plain');
  toast('File downloaded', 'success');
});

// Auto-process on option change
on(urlSafeCheck, 'change', () => {
  if (input.value) process();
});

// Auto-process on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  if (autoDetectCheck.checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(process, 300);
  }
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    process();
  }
});

// Load from URL
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    process();
  }
}

