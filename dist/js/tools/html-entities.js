import { on, copy, qs, toast } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const encodeBtn = qs('#encode');
const decodeBtn = qs('#decode');
const copyInputBtn = qs('#copy-input');
const copyOutputBtn = qs('#copy-output');
const clearBtn = qs('#clear');

// Load state
const storageKey = 'html-entities-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.output) output.value = state.output;

function encodeEntities(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function decodeEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

on(encodeBtn, 'click', () => {
  const text = input.value;
  const encoded = encodeEntities(text);
  output.value = encoded;
  saveStateWithStorage(storageKey, { input: text, output: encoded });
  toast('Encoded');
});

on(decodeBtn, 'click', () => {
  const text = input.value;
  const decoded = decodeEntities(text);
  output.value = decoded;
  saveStateWithStorage(storageKey, { input: text, output: decoded });
  toast('Decoded');
});

on(copyInputBtn, 'click', async () => {
  await copy(input.value);
  toast('Input copied');
});

on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});

on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  saveStateWithStorage(storageKey, { input: '', output: '' });
});

