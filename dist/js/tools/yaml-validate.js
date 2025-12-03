import { loadStateWithStorage, saveStateWithStorage, encodeState } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { validateYaml } from '/js/utils/yaml.js';

const input = qs('#input');
const output = qs('#output');
const validateBtn = qs('#validate');
const copyBtn = qs('#copy');
const shareBtn = qs('#share');
const liveModeCheck = qs('#live-mode');

// Load state
const storageKey = 'yaml-validate-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.liveMode !== undefined) liveModeCheck.checked = state.liveMode;

// Validate function
function validate() {
  const yamlText = input.value.trim();
  
  if (!yamlText) {
    output.textContent = 'Enter YAML to validate';
    output.className = '';
    return;
  }
  
  const result = validateYaml(yamlText);
  
  if (result.valid) {
    output.textContent = '✓ Valid YAML';
    output.className = 'ok';
    toast('YAML is valid', 'success');
  } else {
    output.textContent = `✗ Invalid YAML\n\nError: ${result.error}`;
    output.className = 'error';
    toast('YAML is invalid', 'error');
  }
  
  // Save state
  saveStateWithStorage({
    input: yamlText,
    liveMode: liveModeCheck.checked
  }, storageKey);
}

// Buttons
on(validateBtn, 'click', validate);
on(copyBtn, 'click', () => {
  if (input.value) {
    copy(input.value, 'YAML copied!');
  } else {
    toast('No YAML to copy', 'error');
  }
});

on(shareBtn, 'click', () => {
  if (!input.value.trim()) {
    toast('No YAML to share', 'error');
    return;
  }
  
  const state = encodeState({ input: input.value });
  const url = `${window.location.origin}${window.location.pathname}#${state}`;
  
  copy(url, 'Share link copied!');
});

// Live validation
let debounceTimer;
on(input, 'input', () => {
  if (liveModeCheck.checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      validate();
    }, 300);
  }
});

on(liveModeCheck, 'change', () => {
  saveStateWithStorage({
    input: input.value,
    liveMode: liveModeCheck.checked
  }, storageKey);
  
  if (liveModeCheck.checked && input.value.trim()) {
    validate();
  }
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    validate();
  }
});

// Load from URL
if (window.location.hash) {
  try {
    const { decodeState } = await import('/js/url-state.js');
    const urlState = decodeState(window.location.hash.slice(1));
    if (urlState?.input) {
      input.value = urlState.input;
      validate();
    }
  } catch (e) {
    console.error('Failed to load from URL:', e);
  }
}

// Initial validation if there's content
if (input.value.trim() && liveModeCheck.checked) {
  validate();
}

