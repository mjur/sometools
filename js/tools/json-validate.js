import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const runBtn = qs('#run');
const copyBtn = qs('#copy');
const shareBtn = qs('#share');
const liveMode = qs('#live-mode');
const lineNumbers = qs('#line-numbers');

// Update line numbers
function updateLineNumbers() {
  const text = input.value;
  const lines = text.split('\n');
  const lineCount = Math.max(lines.length, 1);
  
  // Generate line numbers
  const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  lineNumbers.textContent = numbers;
  
  // Ensure line numbers container matches textarea height
  lineNumbers.style.height = input.scrollHeight + 'px';
  
  // Sync scroll
  lineNumbers.scrollTop = input.scrollTop;
}

// Sync scroll between textarea and line numbers
function syncScroll() {
  if (lineNumbers) {
    lineNumbers.scrollTop = input.scrollTop;
  }
}

// Load state from URL or localStorage
const storageKey = 'json-validate-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
  if (state.liveMode !== undefined) {
    liveMode.checked = state.liveMode;
  }
}

// Initialize line numbers
updateLineNumbers();

// Update line numbers on input
on(input, 'input', () => {
  updateLineNumbers();
  if (liveMode.checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      validate(input.value);
    }, 300);
  }
});

// Sync scroll
on(input, 'scroll', syncScroll);

// Update line numbers on resize (for textarea resize)
let resizeObserver;
if (window.ResizeObserver) {
  resizeObserver = new ResizeObserver(() => {
    updateLineNumbers();
  });
  resizeObserver.observe(input);
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

// Live validation on input (debounced) - moved to updateLineNumbers handler
let debounceTimer;

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
    updateLineNumbers();
    validate(input.value);
  }
}

// Initial validation if there's content
if (input.value) {
  updateLineNumbers();
  validate(input.value);
}

