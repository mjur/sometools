import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const runBtn = qs('#run');
const copyBtn = qs('#copy');
const shareBtn = qs('#share');
const liveMode = qs('#live-mode');

// Load state from URL or localStorage
const storageKey = 'json-validate-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.liveMode !== undefined) {
    liveMode.checked = state.liveMode;
  }
}

function validate(str) {
  if (!str.trim()) {
    output.textContent = 'Enter JSON to validate';
    output.className = '';
    return;
  }
  
  const result = safeParse(str);
  
  if (result.success) {
    output.textContent = 'Valid JSON ✅';
    output.className = 'ok';
  } else {
    let errorMsg = `Invalid JSON ❌\n${result.error.message}`;
    if (result.error.line) {
      errorMsg += `\nLine: ${result.error.line}`;
    }
    if (result.error.column) {
      errorMsg += `, Column: ${result.error.column}`;
    }
    output.textContent = errorMsg;
    output.className = 'error';
  }
  
  // Save state
  saveStateWithStorage({
    input: str,
    liveMode: liveMode.checked
  }, storageKey);
}

// Validate button
on(runBtn, 'click', () => validate(input.value));

// Live mode
on(liveMode, 'change', (e) => {
  if (e.target.checked) {
    validate(input.value);
  }
});

// Live validation on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  if (liveMode.checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      validate(input.value);
    }, 300);
  }
});

// Copy button
on(copyBtn, 'click', async () => {
  await copy(input.value, 'Input copied to clipboard!');
});

// Share button
on(shareBtn, 'click', () => {
  const state = encodeState({ input: input.value });
  if (state) {
    history.replaceState(null, '', `#${state}`);
    copy(location.href, 'Shareable link copied!');
  } else {
    toast('Failed to create shareable link', 'error');
  }
});

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    validate(input.value);
  }
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
    validate(input.value);
  }
}

// Initial validation if there's content
if (input.value) {
  validate(input.value);
}

