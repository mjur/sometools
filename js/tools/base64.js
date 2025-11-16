import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs, qsa } from '/js/ui.js';
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

// Verify critical elements exist
if (!input) console.error('Input textarea not found!');
if (!output) console.error('Output textarea not found!');
if (!runBtn) console.error('Run button not found!');

let currentMode = 'encode';
// Store separate input values for encode and decode modes
let encodeInput = '';
let decodeInput = '';

// Load state
const storageKey = 'base64-state';
const state = loadStateWithStorage(storageKey);
if (state?.encodeInput) encodeInput = state.encodeInput;
if (state?.decodeInput) decodeInput = state.decodeInput;
if (state?.urlSafe !== undefined && urlSafeCheck) urlSafeCheck.checked = state.urlSafe;
if (state?.autoDetect !== undefined && autoDetectCheck) autoDetectCheck.checked = state.autoDetect;
if (state?.mode) {
  currentMode = state.mode;
}

// Set initial input value based on current mode
if (currentMode === 'encode' && encodeInput) {
  input.value = encodeInput;
} else if (currentMode === 'decode' && decodeInput) {
  input.value = decodeInput;
}

// Tab switching
function updateTabs() {
  if (!tabs || tabs.length === 0) return;
  tabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === currentMode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Initialize tabs after DOM is ready
if (tabs && tabs.length > 0) {
  tabs.forEach(tab => {
    on(tab, 'click', () => {
      const newMode = tab.getAttribute('data-tab');
      
      // Save current input value before switching
      if (currentMode === 'encode') {
        encodeInput = input.value;
      } else if (currentMode === 'decode') {
        decodeInput = input.value;
      }
      
      // Switch mode
      currentMode = newMode;
      updateTabs();
      
      // Restore input value for the new mode
      if (currentMode === 'encode') {
        input.value = encodeInput;
      } else {
        input.value = decodeInput;
      }
      
      // Process if there's content
      if (input.value.trim()) {
        process();
      } else {
        output.value = '';
      }
    });
  });
  // Set initial tab state
  updateTabs();
}

// Process function
function process() {
  if (!input || !output) {
    console.error('Input or output element not found');
    return;
  }
  
  const inputText = input.value.trim();
  if (!inputText) {
    output.value = '';
    toast('Please enter text to process', 'error');
    return;
  }
  
  // Auto-detect
  if (autoDetectCheck && autoDetectCheck.checked) {
    const detectedIsBase64 = isBase64(inputText);
    if (detectedIsBase64) {
      // If base64 detected, switch to decode mode
      if (currentMode !== 'decode') {
        // Save current encode input before switching
        encodeInput = input.value;
        currentMode = 'decode';
        updateTabs();
      }
      // Update decode input with the detected base64
      decodeInput = inputText;
    } else {
      // If not base64, switch to encode mode
      if (currentMode !== 'encode') {
        // Save current decode input before switching
        decodeInput = input.value;
        currentMode = 'encode';
        updateTabs();
      }
      // Update encode input with the detected text
      encodeInput = inputText;
    }
  }
  
  try {
    if (currentMode === 'encode') {
      const result = (urlSafeCheck && urlSafeCheck.checked)
        ? encodeBase64URL(inputText)
        : encodeBase64(inputText);
      output.value = result;
    } else {
      const result = (urlSafeCheck && urlSafeCheck.checked)
        ? decodeBase64URL(inputText)
        : decodeBase64(inputText);
      output.value = result;
    }
    
    // Update current mode's input value
    if (currentMode === 'encode') {
      encodeInput = inputText;
    } else {
      decodeInput = inputText;
    }
    
    // Save state
    saveStateWithStorage({
      encodeInput,
      decodeInput,
      urlSafe: urlSafeCheck ? urlSafeCheck.checked : false,
      autoDetect: autoDetectCheck ? autoDetectCheck.checked : false,
      mode: currentMode
    }, storageKey);
    
    toast(`${currentMode === 'encode' ? 'Encoded' : 'Decoded'} successfully`, 'success');
  } catch (e) {
    console.error('Process error:', e);
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

// Read file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

on(dropZone, 'drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  
  const file = e.dataTransfer.files[0] || fileInput.files[0];
  if (!file) return;
  
  try {
    // Read file contents as text and show in input
    const fileContents = await readFileAsText(file);
    input.value = fileContents;
    // Update encode input storage
    encodeInput = fileContents;
    // Switch to encode mode when loading a file
    currentMode = 'encode';
    updateTabs();
    toast(`File "${file.name}" loaded`, 'success');
    // Auto-process if there's content
    if (fileContents.trim()) {
      process();
    }
  } catch (err) {
    toast(`Failed to read file: ${err.message}`, 'error');
  }
});

on(fileInput, 'change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Read file contents as text and show in input
    const fileContents = await readFileAsText(file);
    input.value = fileContents;
    // Update encode input storage
    encodeInput = fileContents;
    // Switch to encode mode when loading a file
    currentMode = 'encode';
    updateTabs();
    toast(`File "${file.name}" loaded`, 'success');
    // Auto-process if there's content
    if (fileContents.trim()) {
      process();
    }
  } catch (err) {
    toast(`Failed to read file: ${err.message}`, 'error');
  }
});

// Buttons
if (runBtn) {
  on(runBtn, 'click', process);
} else {
  console.error('Run button not found!');
}
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
  if (autoDetectCheck && autoDetectCheck.checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const inputText = input.value.trim();
      if (inputText) {
        // Auto-detect and switch mode if needed
        const detectedIsBase64 = isBase64(inputText);
        if (detectedIsBase64) {
          // If base64 detected, switch to decode mode
          if (currentMode !== 'decode') {
            encodeInput = input.value;
            currentMode = 'decode';
            updateTabs();
          }
          decodeInput = inputText;
          process();
        } else {
          // If not base64, switch to encode mode
          if (currentMode !== 'encode') {
            decodeInput = input.value;
            currentMode = 'encode';
            updateTabs();
          }
          encodeInput = inputText;
          process();
        }
      } else {
        output.value = '';
      }
    }, 300);
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

