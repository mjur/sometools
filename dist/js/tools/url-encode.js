import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';

const input = qs('#input');
const output = qs('#output');
const encodeBtn = qs('#encode');
const decodeBtn = qs('#decode');
const copyBtn = qs('#copy');
const clearBtn = qs('#clear');

// Load state from URL or localStorage
const storageKey = 'url-encode-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}
if (state?.output) {
  output.value = state.output;
}

function encode() {
  const text = input.value;
  if (!text) {
    output.value = '';
    return;
  }
  
  try {
    const encoded = encodeURIComponent(text);
    output.value = encoded;
    saveStateWithStorage({ input: text, output: encoded }, storageKey);
  } catch (error) {
    toast('Encoding failed: ' + error.message, 'error');
    output.value = '';
  }
}

function decode() {
  const text = input.value;
  if (!text) {
    output.value = '';
    return;
  }
  
  try {
    const decoded = decodeURIComponent(text);
    output.value = decoded;
    saveStateWithStorage({ input: text, output: decoded }, storageKey);
  } catch (error) {
    toast('Decoding failed: ' + error.message, 'error');
    output.value = 'Error: Invalid URL-encoded string';
  }
}

// Buttons
on(encodeBtn, 'click', encode);
on(decodeBtn, 'click', decode);

on(copyBtn, 'click', async () => {
  if (output.value) {
    await copy(output.value, 'Output copied to clipboard!');
  } else {
    toast('No output to copy', 'error');
  }
});

on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  saveStateWithStorage({ input: '', output: '' }, storageKey);
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    encode();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    decode();
  }
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    if (urlState.operation === 'encode') {
      encode();
    } else if (urlState.operation === 'decode') {
      decode();
    }
  }
}

