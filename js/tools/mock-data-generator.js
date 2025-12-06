import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const schemaInput = qs('#schema-input');
const output = qs('#output');
const generateBtn = qs('#generate');
const schemaCopyBtn = qs('#schema-copy');
const outputCopyBtn = qs('#output-copy');
const outputFormatBtn = qs('#output-format');
const exampleBtn = qs('#schema-example');

// Load state from URL or localStorage
const storageKey = 'mock-data-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.schema) {
  schemaInput.value = state.schema;
}

// Example schema
const exampleSchema = JSON.stringify({
  "type": "object",
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "active": { "type": "boolean" },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "zip": { "type": "string" }
      }
    }
  },
  "required": ["id", "name", "email"]
}, null, 2);

// Generate mock value from schema
function generateMockValue(schema) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }
  
  const type = schema.type;
  
  switch (type) {
    case 'string':
      if (schema.format === 'email') {
        return 'user@example.com';
      } else if (schema.format === 'date') {
        return new Date().toISOString().split('T')[0];
      } else if (schema.format === 'date-time') {
        return new Date().toISOString();
      } else if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      return 'string';
    
    case 'number':
    case 'integer':
      if (schema.minimum !== undefined && schema.maximum !== undefined) {
        return Math.floor((schema.minimum + schema.maximum) / 2);
      } else if (schema.minimum !== undefined) {
        return schema.minimum;
      } else if (schema.maximum !== undefined) {
        return Math.min(schema.maximum, 100);
      }
      return type === 'integer' ? 0 : 0.0;
    
    case 'boolean':
      return false;
    
    case 'null':
      return null;
    
    case 'array':
      const items = schema.items || {};
      return [generateMockValue(items)];
    
    case 'object':
      const obj = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateMockValue(propSchema);
        }
      }
      return obj;
    
    default:
      return null;
  }
}

function generate() {
  const schemaStr = schemaInput.value.trim();
  
  if (!schemaStr) {
    output.value = '';
    toast('Please enter a JSON Schema', 'error');
    return;
  }
  
  const result = safeParse(schemaStr);
  
  if (!result.success) {
    output.value = `Error: Invalid JSON Schema\n${result.error?.message || 'Failed to parse schema'}`;
    output.className = 'error';
    return;
  }
  
  try {
    const mockData = generateMockValue(result.data);
    const mockDataStr = JSON.stringify(mockData, null, 2);
    output.value = mockDataStr;
    output.className = 'ok';
    
    // Save state
    saveStateWithStorage({ schema: schemaStr }, storageKey);
  } catch (error) {
    output.value = `Error generating mock data: ${error.message}`;
    output.className = 'error';
  }
}

// Generate button
on(generateBtn, 'click', generate);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

// Copy buttons
on(schemaCopyBtn, 'click', async () => {
  await copy(schemaInput.value, 'Schema copied to clipboard!');
});

on(outputCopyBtn, 'click', async () => {
  if (output.value) {
    await copy(output.value, 'Mock data copied to clipboard!');
  } else {
    toast('No mock data to copy', 'error');
  }
});

// Format button
on(outputFormatBtn, 'click', () => {
  if (!output.value) {
    toast('No data to format', 'error');
    return;
  }
  
  const result = safeParse(output.value);
  if (result.success) {
    output.value = JSON.stringify(result.data, null, 2);
    toast('Data formatted', 'success');
  } else {
    toast('Invalid JSON', 'error');
  }
});

// Example button
on(exampleBtn, 'click', () => {
  schemaInput.value = exampleSchema;
  generate();
});

// Auto-generate on input (debounced)
let debounceTimer;
on(schemaInput, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (schemaInput.value.trim()) {
      generate();
    }
  }, 1000);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.schema) {
    schemaInput.value = urlState.schema;
    generate();
  }
}

// Initial generate if there's content
if (schemaInput.value) {
  generate();
}

