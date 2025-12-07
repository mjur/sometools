import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const schemaInput = qs('#schema-input');
const jsonInput = qs('#json-input');
const output = qs('#output');
const runBtn = qs('#run');
const schemaCopyBtn = qs('#schema-copy');
const jsonCopyBtn = qs('#json-copy');
const schemaExampleBtn = qs('#schema-example');
const jsonExampleBtn = qs('#json-example');

// Load state from URL or localStorage
const storageKey = 'json-schema-state';
const state = loadStateWithStorage(storageKey);
if (state?.schema) {
  schemaInput.value = state.schema;
}
if (state?.json) {
  jsonInput.value = state.json;
}

// Example schema and JSON
const exampleSchema = JSON.stringify({
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "age": {
      "type": "number",
      "minimum": 0,
      "maximum": 150
    },
    "email": {
      "type": "string",
      "format": "email"
    }
  },
  "required": ["name", "age"]
}, null, 2);

const exampleJson = JSON.stringify({
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}, null, 2);

// Load Ajv as ES module
let Ajv = null;
let ajvLoading = false;

async function loadAjv() {
  if (Ajv) return true;
  if (ajvLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (Ajv) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (!ajvLoading) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }
  
  ajvLoading = true;
  try {
    // Use ES module version from esm.sh (better ES module support)
    const ajvModule = await import('https://esm.sh/ajv@8.12.0');
    // Ajv is the default export in ES modules
    Ajv = ajvModule.default || ajvModule.Ajv || ajvModule;
    ajvLoading = false;
    return true;
  } catch (error) {
    console.error('Failed to load Ajv:', error);
    // Try alternative CDN
    try {
      const ajvModule = await import('https://cdn.skypack.dev/ajv@8.12.0');
      Ajv = ajvModule.default || ajvModule.Ajv || ajvModule;
      ajvLoading = false;
      return true;
    } catch (error2) {
      console.error('Failed to load Ajv from alternative CDN:', error2);
      ajvLoading = false;
      return false;
    }
  }
}

async function validate() {
  if (!Ajv) {
    const loaded = await loadAjv();
    if (!loaded) {
      output.textContent = 'Failed to load JSON Schema validator. Please refresh the page.';
      output.className = 'error';
      return;
    }
  }

  const schemaStr = schemaInput.value.trim();
  const jsonStr = jsonInput.value.trim();

  if (!schemaStr) {
    output.textContent = 'Please enter a JSON Schema';
    output.className = '';
    return;
  }

  if (!jsonStr) {
    output.textContent = 'Please enter JSON to validate';
    output.className = '';
    return;
  }

  // Parse schema
  const schemaResult = safeParse(schemaStr);
  if (!schemaResult.success) {
    output.textContent = `Invalid JSON Schema ❌\n${schemaResult.error?.message || 'Failed to parse schema'}`;
    output.className = 'error';
    return;
  }

  // Parse JSON
  const jsonResult = safeParse(jsonStr);
  if (!jsonResult.success) {
    output.textContent = `Invalid JSON ❌\n${jsonResult.error?.message || 'Failed to parse JSON'}`;
    output.className = 'error';
    return;
  }

  try {
    // Create Ajv instance
    const ajv = new Ajv({ allErrors: true, verbose: true });
    
    // Validate
    const valid = ajv.validate(schemaResult.data, jsonResult.data);

    if (valid) {
      output.textContent = 'Valid JSON ✅\n\nThe JSON conforms to the schema.';
      output.className = 'ok';
    } else {
      let errorMsg = 'Invalid JSON ❌\n\nThe JSON does not conform to the schema.\n\n';
      errorMsg += `Found ${ajv.errors.length} error${ajv.errors.length > 1 ? 's' : ''}:\n\n`;
      
      ajv.errors.forEach((err, index) => {
        errorMsg += `${index + 1}. ${err.instancePath || '/'}: ${err.message}`;
        if (err.params) {
          const params = Object.entries(err.params)
            .filter(([k, v]) => k !== 'type' || v !== err.schemaPath)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(', ');
          if (params) {
            errorMsg += ` (${params})`;
          }
        }
        errorMsg += '\n';
      });
      
      output.textContent = errorMsg;
      output.className = 'error';
    }
  } catch (error) {
    output.textContent = `Validation Error ❌\n${error.message}`;
    output.className = 'error';
  }

  // Save state
  saveStateWithStorage({
    schema: schemaStr,
    json: jsonStr
  }, storageKey);
}

// Validate button
on(runBtn, 'click', validate);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    validate();
  }
});

// Copy buttons
on(schemaCopyBtn, 'click', async () => {
  await copy(schemaInput.value, 'Schema copied to clipboard!');
});

on(jsonCopyBtn, 'click', async () => {
  await copy(jsonInput.value, 'JSON copied to clipboard!');
});

// Example buttons
on(schemaExampleBtn, 'click', () => {
  schemaInput.value = exampleSchema;
  validate();
});

on(jsonExampleBtn, 'click', () => {
  jsonInput.value = exampleJson;
  validate();
});

// Auto-validate on input (debounced)
let debounceTimer;
[schemaInput, jsonInput].forEach(input => {
  on(input, 'input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (schemaInput.value.trim() && jsonInput.value.trim()) {
        validate();
      }
    }, 500);
  });
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.schema) {
    schemaInput.value = urlState.schema;
  }
  if (urlState?.json) {
    jsonInput.value = urlState.json;
  }
  if (urlState?.schema || urlState?.json) {
    validate();
  }
}

// Preload Ajv on page load
loadAjv().catch(err => {
  console.error('Failed to preload Ajv:', err);
});

// Auto-validate if both inputs have content
if (schemaInput.value.trim() && jsonInput.value.trim()) {
  // Wait a bit for Ajv to load, then validate
  setTimeout(() => {
    if (schemaInput.value.trim() && jsonInput.value.trim()) {
      validate();
    }
  }, 500);
}

