import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const jsonInput = qs('#json-input');
const output = qs('#output');
const runBtn = qs('#run');
const jsonCopyBtn = qs('#json-copy');
const schemaCopyBtn = qs('#schema-copy');
const schemaFormatBtn = qs('#schema-format');
const exampleBtn = qs('#json-example');

// Load state from URL or localStorage
const storageKey = 'json-schema-generate-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  jsonInput.value = state.input;
}
if (state?.output) {
  output.value = state.output;
}

// Example JSON
const exampleJson = JSON.stringify({
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "active": true,
  "tags": ["developer", "javascript"],
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  },
  "scores": [95, 87, 92]
}, null, 2);

// Generate schema from JSON value
function generateSchema(value, path = '') {
  if (value === null) {
    return { type: 'null' };
  }
  
  const type = Array.isArray(value) ? 'array' : typeof value;
  
  switch (type) {
    case 'string':
      return { type: 'string' };
    
    case 'number':
      return { type: 'number' };
    
    case 'boolean':
      return { type: 'boolean' };
    
    case 'null':
      return { type: 'null' };
    
    case 'array':
      if (value.length === 0) {
        return { type: 'array', items: {} };
      }
      
      // Analyze all items to find common schema
      const itemSchemas = value.map(item => generateSchema(item, path + '[]'));
      
      // If all items have the same structure, use that
      const firstSchema = itemSchemas[0];
      const allSame = itemSchemas.every(s => JSON.stringify(s) === JSON.stringify(firstSchema));
      
      if (allSame) {
        return {
          type: 'array',
          items: firstSchema
        };
      } else {
        // Mixed types - use oneOf
        const uniqueSchemas = [];
        for (const schema of itemSchemas) {
          const schemaStr = JSON.stringify(schema);
          if (!uniqueSchemas.some(s => JSON.stringify(s) === schemaStr)) {
            uniqueSchemas.push(schema);
          }
        }
        
        if (uniqueSchemas.length === 1) {
          return {
            type: 'array',
            items: uniqueSchemas[0]
          };
        } else {
          return {
            type: 'array',
            items: {
              oneOf: uniqueSchemas
            }
          };
        }
      }
    
    case 'object':
      const properties = {};
      const required = [];
      
      for (const [key, val] of Object.entries(value)) {
        if (val !== undefined && val !== null) {
          properties[key] = generateSchema(val, path ? `${path}.${key}` : key);
          required.push(key);
        }
      }
      
      const schema = {
        type: 'object',
        properties
      };
      
      if (required.length > 0) {
        schema.required = required;
      }
      
      return schema;
    
    default:
      return {};
  }
}

// Generate full schema with metadata
function generateFullSchema(jsonData) {
  const schema = generateSchema(jsonData);
  
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    ...schema,
    title: 'Generated Schema',
    description: 'Auto-generated JSON Schema'
  };
}

function generate() {
  const jsonStr = jsonInput.value.trim();
  
  if (!jsonStr) {
    output.value = '';
    toast('Please enter JSON to generate schema', 'error');
    return;
  }
  
  const result = safeParse(jsonStr);
  
  if (!result.success) {
    output.value = `Error: Invalid JSON\n${result.error?.message || 'Failed to parse JSON'}`;
    output.className = 'error';
    return;
  }
  
  try {
    const schema = generateFullSchema(result.data);
    const schemaStr = JSON.stringify(schema, null, 2);
    output.value = schemaStr;
    output.className = 'ok';
    
    // Save state
    saveStateWithStorage({
      input: jsonStr,
      output: schemaStr
    }, storageKey);
  } catch (error) {
    output.value = `Error generating schema: ${error.message}`;
    output.className = 'error';
  }
}

// Generate button
on(runBtn, 'click', generate);

// Keyboard shortcut: Cmd/Ctrl+Enter
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

// Copy buttons
on(jsonCopyBtn, 'click', async () => {
  await copy(jsonInput.value, 'JSON copied to clipboard!');
});

on(schemaCopyBtn, 'click', async () => {
  if (output.value) {
    await copy(output.value, 'Schema copied to clipboard!');
  } else {
    toast('No schema to copy', 'error');
  }
});

// Format button
on(schemaFormatBtn, 'click', () => {
  if (!output.value) {
    toast('No schema to format', 'error');
    return;
  }
  
  const result = safeParse(output.value);
  if (result.success) {
    output.value = JSON.stringify(result.data, null, 2);
    toast('Schema formatted', 'success');
  } else {
    toast('Invalid schema JSON', 'error');
  }
});

// Example button
on(exampleBtn, 'click', () => {
  jsonInput.value = exampleJson;
  generate();
});

// Auto-generate on input (debounced)
let debounceTimer;
on(jsonInput, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (jsonInput.value.trim()) {
      generate();
    }
  }, 1000);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    jsonInput.value = urlState.input;
    generate();
  }
}

// Initial generate if there's content
if (jsonInput.value) {
  generate();
}

