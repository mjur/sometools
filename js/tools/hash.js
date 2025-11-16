import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { hashText, hashFile, hashTextBase64, hashFileBase64, ALGORITHMS } from '/js/utils/hash.js';

const input = qs('#input');
const output = qs('#output');
const hashBtn = qs('#hash');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const algorithmSelect = qs('#algorithm');
const formatSelect = qs('#format');
const dropZone = qs('#drop-zone');
const fileInput = qs('#file-input');

let currentFile = null;

// Load state
const storageKey = 'hash-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.algorithm) algorithmSelect.value = state.algorithm;
  if (state.format) formatSelect.value = state.format;
}

async function generateHash() {
  // Check if Web Crypto API is available
  if (!crypto || !crypto.subtle) {
    const errorMsg = 'Web Crypto API is not available. Please access this page via HTTPS or localhost (http://localhost:8000).';
    output.textContent = errorMsg;
    output.className = 'error';
    toast(errorMsg, 'error');
    return;
  }
  
  const algorithm = algorithmSelect.value;
  const format = formatSelect.value;
  
  if (currentFile) {
    // Hash file
    try {
      output.className = 'loading';
      let hash;
      if (format === 'base64') {
        hash = await hashFileBase64(currentFile, algorithm);
      } else {
        hash = await hashFile(currentFile, algorithm);
      }
      output.textContent = hash;
      output.className = 'ok';
      toast('Hash generated successfully', 'success');
    } catch (e) {
      output.textContent = `Error: ${e.message}`;
      output.className = 'error';
      toast(`Error: ${e.message}`, 'error');
    }
  } else {
    // Hash text
    const inputText = input.value.trim();
    if (!inputText) {
      toast('Please enter text to hash', 'error');
      return;
    }
    
    try {
      output.className = 'loading';
      let hash;
      if (format === 'base64') {
        hash = await hashTextBase64(inputText, algorithm);
      } else {
        hash = await hashText(inputText, algorithm);
      }
      output.textContent = hash;
      output.className = 'ok';
      
      // Save state
      saveStateWithStorage({
        input: inputText,
        algorithm,
        format
      }, storageKey);
      
      toast('Hash generated successfully', 'success');
    } catch (e) {
      output.textContent = `Error: ${e.message}`;
      output.className = 'error';
      toast(`Error: ${e.message}`, 'error');
    }
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
  
  currentFile = file;
  input.value = `File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  input.disabled = true;
  generateHash();
});

on(fileInput, 'change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  currentFile = file;
  input.value = `File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  input.disabled = true;
  generateHash();
});

// Clear file selection
function clearFile() {
  currentFile = null;
  input.value = '';
  input.disabled = false;
  output.textContent = '';
  output.className = '';
  fileInput.value = '';
}

// Buttons
on(hashBtn, 'click', generateHash);
on(copyInputBtn, 'click', () => {
  if (currentFile) {
    toast('Cannot copy file input', 'error');
  } else {
    copy(input.value, 'Input copied!');
  }
});
on(copyOutputBtn, 'click', () => {
  if (output.textContent) {
    copy(output.textContent, 'Hash copied!');
  } else {
    toast('No hash to copy', 'error');
  }
});

// Auto-hash on option change
on(algorithmSelect, 'change', () => {
  if (input.value || currentFile) {
    generateHash();
  }
});

on(formatSelect, 'change', () => {
  if (input.value || currentFile) {
    generateHash();
  }
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateHash();
  }
});

// Load from URL (if needed)
if (window.location.hash) {
  // Could decode state here if needed
}

