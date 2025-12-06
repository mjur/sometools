import { encodeState, decodeState, loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { safeParse } from '/js/utils/json.js';

const input = qs('#input');
const output = qs('#output');
const generateBtn = qs('#generate');
const inputCopyBtn = qs('#input-copy');
const outputCopyBtn = qs('#output-copy');
const outputFormatBtn = qs('#output-format');
const exampleBtn = qs('#input-example');
const clearBtn = qs('#clear');
const inputTypeSelect = qs('#input-type');
const inputLabel = qs('#input-label');

// Load state from URL or localStorage
const storageKey = 'mock-data-generator-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) {
  input.value = state.input;
}
if (state?.inputType) {
  inputTypeSelect.value = state.inputType;
  updateInputType();
}

// Example schema
const exampleSchema = JSON.stringify({
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "uuid": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "website": { "type": "string", "format": "uri" },
    "phone": { "type": "string", "format": "phone" },
    "birthDate": { "type": "string", "format": "date" },
    "createdAt": { "type": "string", "format": "date-time" },
    "active": { "type": "boolean" },
    "score": { "type": "number", "minimum": 0, "maximum": 100 },
    "color": { "type": "string", "format": "color" },
    "ipAddress": { "type": "string", "format": "ipv4" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5
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

// Example JSON
const exampleJson = JSON.stringify({
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "active": true,
  "tags": ["developer", "javascript"],
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zip": "10001"
  }
}, null, 2);

// Generate schema from JSON (similar to json-schema-generate.js)
function generateSchemaFromJson(value, path = '') {
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
      const itemSchemas = value.map(item => generateSchemaFromJson(item, path + '[]'));
      const firstSchema = itemSchemas[0];
      const allSame = itemSchemas.every(s => JSON.stringify(s) === JSON.stringify(firstSchema));
      if (allSame) {
        return { type: 'array', items: firstSchema };
      } else {
        const uniqueSchemas = [];
        for (const schema of itemSchemas) {
          const schemaStr = JSON.stringify(schema);
          if (!uniqueSchemas.some(s => JSON.stringify(s) === schemaStr)) {
            uniqueSchemas.push(schema);
          }
        }
        if (uniqueSchemas.length === 1) {
          return { type: 'array', items: uniqueSchemas[0] };
        } else {
          return { type: 'array', items: { oneOf: uniqueSchemas } };
        }
      }
    case 'object':
      const properties = {};
      const required = [];
      for (const [key, val] of Object.entries(value)) {
        if (val !== undefined && val !== null) {
          properties[key] = generateSchemaFromJson(val, path ? `${path}.${key}` : key);
          required.push(key);
        }
      }
      const schema = { type: 'object', properties };
      if (required.length > 0) {
        schema.required = required;
      }
      return schema;
    default:
      return {};
  }
}

// Update UI based on input type
function updateInputType() {
  const inputType = inputTypeSelect.value;
  
  if (inputType === 'json') {
    inputLabel.textContent = 'JSON Structure (Optional)';
    input.placeholder = '{"name": "John", "age": 30, "email": "john@example.com"} (leave empty for random data)';
  } else {
    inputLabel.textContent = 'JSON Schema (Optional)';
    input.placeholder = '{"type": "object", "properties": {"name": {"type": "string"}, "age": {"type": "number"}}} (leave empty for random data)';
  }
  
  // Clear output when type changes
  output.value = '';
  saveState();
}

// Initial update
updateInputType();

// Update on change
on(inputTypeSelect, 'change', () => {
  updateInputType();
  if (input.value.trim()) {
    generate();
  }
});

// Generate random string
function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate mock value from schema
function generateMockValue(schema) {
  if (!schema || typeof schema !== 'object') {
    return null;
  }
  
  const type = schema.type;
  
  switch (type) {
    case 'string':
      // Handle format
      if (schema.format) {
        switch (schema.format) {
          case 'email':
            return `user${Math.floor(Math.random() * 1000)}@example.com`;
          case 'uri':
          case 'url':
            return 'https://example.com';
          case 'date':
            return new Date().toISOString().split('T')[0];
          case 'date-time':
            return new Date().toISOString();
          case 'time':
            return new Date().toTimeString().split(' ')[0];
          case 'uuid':
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          case 'hostname':
            return 'example.com';
          case 'ipv4':
            return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          case 'ipv6':
            return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
          case 'color':
          case 'hex':
            return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
          case 'phone':
            return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
          default:
            // Fall through to default string generation
        }
      }
      
      // Handle enum
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      
      // Handle pattern hints in property names
      const propertyName = schema.propertyName || '';
      if (propertyName.toLowerCase().includes('email')) {
        return `user${Math.floor(Math.random() * 1000)}@example.com`;
      } else if (propertyName.toLowerCase().includes('url') || propertyName.toLowerCase().includes('uri')) {
        return 'https://example.com';
      } else if (propertyName.toLowerCase().includes('phone')) {
        return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
      } else if (propertyName.toLowerCase().includes('name')) {
        const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
        return names[Math.floor(Math.random() * names.length)];
      } else if (propertyName.toLowerCase().includes('id') && propertyName.toLowerCase().includes('uuid')) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      } else if (propertyName.toLowerCase().includes('color')) {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      } else if (propertyName.toLowerCase().includes('date')) {
        return new Date().toISOString().split('T')[0];
      }
      
      // Default string generation with length constraints
      const minLength = schema.minLength || 0;
      const maxLength = schema.maxLength || 10;
      const length = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
      return randomString(Math.max(length, 1));
    
    case 'number':
    case 'integer':
      let value;
      if (schema.minimum !== undefined && schema.maximum !== undefined) {
        value = schema.minimum + Math.random() * (schema.maximum - schema.minimum);
      } else if (schema.minimum !== undefined) {
        value = schema.minimum + Math.random() * 100;
      } else if (schema.maximum !== undefined) {
        value = Math.random() * schema.maximum;
      } else {
        value = Math.random() * 100;
      }
      
      if (type === 'integer') {
        return Math.floor(value);
      }
      return Math.round(value * 100) / 100;
    
    case 'boolean':
      return Math.random() > 0.5;
    
    case 'null':
      return null;
    
    case 'array':
      const items = schema.items || {};
      const minItems = schema.minItems || 1;
      const maxItems = schema.maxItems || 3;
      const itemCount = minItems + Math.floor(Math.random() * (maxItems - minItems + 1));
      const arr = [];
      for (let i = 0; i < itemCount; i++) {
        arr.push(generateMockValue(items));
      }
      return arr;
    
    case 'object':
      const obj = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          // Pass property name for context
          const propWithName = { ...propSchema, propertyName: key };
          obj[key] = generateMockValue(propWithName);
        }
      }
      return obj;
    
    default:
      return null;
  }
}

// Generate random schema
function generateRandomSchema(depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) {
    // At max depth, return simple types
    const simpleTypes = ['string', 'number', 'boolean'];
    const type = simpleTypes[Math.floor(Math.random() * simpleTypes.length)];
    return { type };
  }
  
  const structureTypes = ['object', 'array', 'string', 'number', 'boolean'];
  const weights = [0.4, 0.3, 0.1, 0.1, 0.1]; // Prefer objects and arrays
  const rand = Math.random();
  let cumulative = 0;
  let selectedType = 'string';
  
  for (let i = 0; i < structureTypes.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      selectedType = structureTypes[i];
      break;
    }
  }
  
  switch (selectedType) {
    case 'object':
      const propertyCount = Math.floor(Math.random() * 5) + 2; // 2-6 properties
      const properties = {};
      const required = [];
      const propertyNames = [
        'id', 'name', 'email', 'age', 'active', 'score', 'title', 'description',
        'createdAt', 'updatedAt', 'status', 'type', 'value', 'count', 'price',
        'address', 'phone', 'website', 'color', 'tags', 'items', 'data'
      ];
      
      for (let i = 0; i < propertyCount; i++) {
        const propName = propertyNames[Math.floor(Math.random() * propertyNames.length)] + 
                        (i > 0 ? i : '');
        properties[propName] = generateRandomSchema(depth + 1, maxDepth);
        if (Math.random() > 0.3) { // 70% chance of being required
          required.push(propName);
        }
      }
      
      const schema = { type: 'object', properties };
      if (required.length > 0) {
        schema.required = required;
      }
      return schema;
    
    case 'array':
      const itemSchema = generateRandomSchema(depth + 1, maxDepth);
      return {
        type: 'array',
        items: itemSchema,
        minItems: Math.floor(Math.random() * 2) + 1, // 1-2
        maxItems: Math.floor(Math.random() * 4) + 2 // 2-5
      };
    
    case 'string':
      // Add format hints based on common property names
      const formats = ['email', 'uri', 'date', 'date-time', 'uuid', 'ipv4', 'color'];
      if (Math.random() > 0.7) { // 30% chance of format
        return { type: 'string', format: formats[Math.floor(Math.random() * formats.length)] };
      }
      return { type: 'string' };
    
    case 'number':
      if (Math.random() > 0.5) {
        return {
          type: 'number',
          minimum: Math.floor(Math.random() * 100),
          maximum: Math.floor(Math.random() * 1000) + 100
        };
      }
      return { type: 'number' };
    
    case 'boolean':
      return { type: 'boolean' };
    
    default:
      return { type: 'string' };
  }
}

function generate() {
  const inputText = input.value.trim();
  const inputType = inputTypeSelect.value;
  
  // If no input, generate random JSON
  if (!inputText) {
    try {
      const randomSchema = generateRandomSchema();
      const mockData = generateMockValue(randomSchema);
      const mockDataStr = JSON.stringify(mockData, null, 2);
      output.value = mockDataStr;
      output.className = 'ok';
      saveState();
      return;
    } catch (error) {
      output.value = `Error generating random data: ${error.message}`;
      output.className = 'error';
      return;
    }
  }
  
  const result = safeParse(inputText);
  
  if (!result.success) {
    output.value = `Error: Invalid JSON\n${result.error?.message || 'Failed to parse JSON'}`;
    output.className = 'error';
    return;
  }
  
  try {
    let schema;
    
    if (inputType === 'json') {
      // Generate schema from JSON
      schema = generateSchemaFromJson(result.data);
      // Wrap in object if needed
      if (schema.type !== 'object') {
        schema = {
          type: 'object',
          properties: { value: schema },
          required: ['value']
        };
      }
    } else {
      // Use as schema directly
      schema = result.data;
    }
    
    const mockData = generateMockValue(schema);
    const mockDataStr = JSON.stringify(mockData, null, 2);
    output.value = mockDataStr;
    output.className = 'ok';
    
    // Save state
    saveState();
  } catch (error) {
    output.value = `Error generating mock data: ${error.message}`;
    output.className = 'error';
  }
}

// Save state
function saveState() {
  saveStateWithStorage({
    input: input.value,
    inputType: inputTypeSelect.value
  }, storageKey);
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
on(inputCopyBtn, 'click', async () => {
  await copy(input.value, 'Input copied to clipboard!');
});

on(clearBtn, 'click', () => {
  input.value = '';
  output.value = '';
  input.focus();
  saveState();
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
  const inputType = inputTypeSelect.value;
  input.value = inputType === 'json' ? exampleJson : exampleSchema;
  generate();
});

// Auto-generate on input (debounced)
let debounceTimer;
on(input, 'input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generate(); // Generate even if empty (will create random data)
  }, 1000);
});

// Load from URL fragment on load
if (window.location.hash) {
  const urlState = decodeState(window.location.hash.slice(1));
  if (urlState?.input) {
    input.value = urlState.input;
  }
  if (urlState?.inputType) {
    inputTypeSelect.value = urlState.inputType;
    updateInputType();
  }
  if (urlState?.input) {
    generate();
  }
}

// Initial generate if there's content
if (input.value) {
  generate();
}

