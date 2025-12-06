import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, downloadFile, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';
import { jsonToYaml, yamlToJson } from '/js/utils/yaml.js';

// Load TOML library dynamically
let TOML = null;
let tomlLoading = false;

async function loadTOML() {
  if (TOML) return true;
  if (tomlLoading) {
    // Wait for existing load
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (TOML) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (!tomlLoading) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }
  
  tomlLoading = true;
  try {
    // Use jsdelivr with +esm which handles Node.js polyfills better
    // Wrap in try-catch to handle Node.js module errors gracefully
    const tomlModule = await import('https://cdn.jsdelivr.net/npm/@iarna/toml@2.2.5/+esm').catch(err => {
      // If import fails due to Node.js modules, try alternative
      throw new Error('TOML library requires Node.js modules');
    });
    TOML = tomlModule.default || tomlModule;
    // Verify TOML is actually usable
    if (!TOML || typeof TOML.parse !== 'function') {
      throw new Error('TOML library loaded but not usable');
    }
    tomlLoading = false;
    return true;
  } catch (error) {
    console.warn('Failed to load TOML from jsdelivr:', error.message);
    tomlLoading = false;
    // Don't try fallback - if jsdelivr doesn't work, others likely won't either
    return false;
  }
}

// Don't preload TOML - load it only when needed to avoid Node.js module errors

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
  
  const [fromFormat, toFormat] = currentDirection.split('-to-');
  
  // Update labels and placeholders
  const formatNames = {
    'toml': 'TOML',
    'json': 'JSON',
    'yaml': 'YAML'
  };
  
  inputLabel.textContent = `${formatNames[fromFormat]} Input`;
  outputLabel.textContent = `${formatNames[toFormat]} Output`;
  
  // Update placeholders
  const placeholders = {
    'toml': 'name = "John"\nage = 30',
    'json': '{"name": "John", "age": 30}',
    'yaml': 'name: John\nage: 30'
  };
  input.placeholder = placeholders[fromFormat];
  
  // Show/hide options
  if (toFormat === 'yaml') {
    indentGroup.style.display = 'flex';
    prettyGroup.style.display = 'none';
  } else if (toFormat === 'json') {
    indentGroup.style.display = 'none';
    prettyGroup.style.display = 'flex';
  } else {
    indentGroup.style.display = 'none';
    prettyGroup.style.display = 'none';
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
async function convert() {
  const inputText = input.value.trim();
  
  if (!inputText) {
    toast('Please enter input to convert', 'error');
    return;
  }
  
  try {
    const [fromFormat, toFormat] = currentDirection.split('-to-');
    let jsonData;
    
    // Parse input
    if (fromFormat === 'json') {
      const result = safeParse(inputText);
      if (!result.success) {
        toast(`Error: Invalid JSON - ${result.error?.message || 'Failed to parse JSON'}`, 'error');
        output.value = '';
        return;
      }
      jsonData = result.data;
    } else if (fromFormat === 'yaml') {
      try {
        const jsonStr = yamlToJson(inputText, false);
        const result = safeParse(jsonStr);
        if (!result.success) {
          toast(`Error: Invalid YAML - ${result.error?.message || 'Failed to parse YAML'}`, 'error');
          output.value = '';
          return;
        }
        jsonData = result.data;
      } catch (e) {
        toast(`Error: Invalid YAML - ${e.message}`, 'error');
        output.value = '';
        return;
      }
    } else if (fromFormat === 'toml') {
      const loaded = await loadTOML();
      if (!loaded || !TOML) {
        toast('Error: TOML library not loaded. Please refresh the page.', 'error');
        output.value = '';
        return;
      }
      try {
        jsonData = TOML.parse(inputText);
      } catch (e) {
        toast(`Error: Invalid TOML - ${e.message}`, 'error');
        output.value = '';
        return;
      }
    }
    
    // Convert to output format
    let outputText;
    if (toFormat === 'json') {
      const pretty = prettyCheck.checked;
      outputText = pretty ? JSON.stringify(jsonData, null, 2) : JSON.stringify(jsonData);
      toast('Converted to JSON', 'success');
    } else if (toFormat === 'yaml') {
      const indent = parseInt(indentSelect.value, 10);
      outputText = jsonToYaml(JSON.stringify(jsonData), indent);
      toast('Converted to YAML', 'success');
    } else if (toFormat === 'toml') {
      const loaded = await loadTOML();
      if (!loaded || !TOML) {
        toast('Error: TOML library not loaded. Please refresh the page.', 'error');
        output.value = '';
        return;
      }
      try {
        // TOML.stringify requires an object, not an array
        let dataToStringify = jsonData;
        if (Array.isArray(jsonData)) {
          dataToStringify = { items: jsonData };
        } else if (jsonData === null || typeof jsonData !== 'object') {
          dataToStringify = { value: jsonData };
        }
        outputText = TOML.stringify(dataToStringify);
        toast('Converted to TOML', 'success');
      } catch (e) {
        toast(`Error: Failed to convert to TOML - ${e.message}`, 'error');
        output.value = '';
        return;
      }
    }
    
    output.value = outputText;
    
    // Save state
    saveState();
  } catch (error) {
    output.value = '';
    toast(`Error: ${error.message}`, 'error');
    console.error('Conversion error:', error);
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
  
  const [, toFormat] = currentDirection.split('-to-');
  const extensions = {
    'toml': 'toml',
    'json': 'json',
    'yaml': 'yaml'
  };
  const mimeTypes = {
    'toml': 'text/plain',
    'json': 'application/json',
    'yaml': 'text/yaml'
  };
  
  const extension = extensions[toFormat];
  const mimeType = mimeTypes[toFormat];
  const filename = `converted.${extension}`;
  
  downloadFile(output.value, filename, mimeType);
  toast('File downloaded', 'success');
});

// Auto-convert on option change
on(indentSelect, 'change', () => {
  const [, toFormat] = currentDirection.split('-to-');
  if (toFormat === 'yaml' && input.value.trim()) {
    convert();
  }
  saveState();
});

on(prettyCheck, 'change', () => {
  const [, toFormat] = currentDirection.split('-to-');
  if (toFormat === 'json' && input.value.trim()) {
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

