// JSON utilities

// Safe JSON parse with position information
export function safeParse(jsonString) {
  try {
    const result = JSON.parse(jsonString);
    return { success: true, data: result, error: null };
  } catch (e) {
    // Try to extract line/column info from error message
    let line = null;
    let column = null;
    const match = e.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      const lines = jsonString.substring(0, pos).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }
    
    return {
      success: false,
      data: null,
      error: {
        message: e.message,
        line,
        column,
        position: match ? parseInt(match[1], 10) : null
      }
    };
  }
}

// Format JSON with options
export function formatJSON(obj, options = {}) {
  const {
    indent = 2,
    sortKeys = false,
    trailingCommas = false
  } = options;
  
  let jsonString;
  
  if (sortKeys) {
    const sorted = sortObjectKeys(obj);
    jsonString = JSON.stringify(sorted, null, indent === 'tab' ? '\t' : indent);
  } else {
    jsonString = JSON.stringify(obj, null, indent === 'tab' ? '\t' : indent);
  }
  
  // Note: trailing commas are not valid JSON, so we can't add them
  // This would require a custom formatter
  return jsonString;
}

// Sort object keys recursively
function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null ? sortObjectKeys(item) : item
    );
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const value = obj[key];
      sorted[key] = typeof value === 'object' && value !== null
        ? sortObjectKeys(value)
        : value;
    }
    return sorted;
  }
  
  return obj;
}

// Minify JSON
export function minifyJSON(obj) {
  return JSON.stringify(obj);
}

// Validate JSON Schema (basic implementation)
export function validateSchema(json, schema) {
  // This is a very basic implementation
  // For production, consider using a library like ajv
  const errors = [];
  
  if (schema.type) {
    const actualType = Array.isArray(json) ? 'array' : typeof json;
    if (actualType !== schema.type) {
      errors.push({
        path: '/',
        message: `Expected type ${schema.type}, got ${actualType}`
      });
    }
  }
  
  if (schema.required && Array.isArray(schema.required)) {
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
      for (const key of schema.required) {
        if (!(key in json)) {
          errors.push({
            path: `/${key}`,
            message: `Required property ${key} is missing`
          });
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

