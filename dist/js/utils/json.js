// JSON utilities

// Safe JSON parse with position information
export function safeParse(jsonString) {
  try {
    const result = JSON.parse(jsonString);
    return { success: true, data: result, error: null, errors: [] };
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
    
    const firstError = {
      message: e.message,
      line,
      column,
      position: match ? parseInt(match[1], 10) : null
    };
    
    // Find all errors, not just the first one
    const allErrors = findAllErrors(jsonString, firstError);
    
    return {
      success: false,
      data: null,
      error: firstError, // Keep for backward compatibility
      errors: allErrors
    };
  }
}

// Find all JSON errors in a string
function findAllErrors(jsonString, firstError) {
  const errors = [];
  if (firstError) {
    errors.push(firstError);
  }
  
  // Helper to get line/column from position
  function getLineCol(pos) {
    const before = jsonString.substring(0, Math.min(pos, jsonString.length));
    const lines = before.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }
  
  // Helper to check if position is inside a string
  function isInString(pos) {
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < pos && i < jsonString.length; i++) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (jsonString[i] === '\\') {
        escapeNext = true;
        continue;
      }
      if (jsonString[i] === '"') {
        inString = !inString;
      }
    }
    return inString;
  }
  
  // Pass 1: Find unclosed strings
  let inString = false;
  let escapeNext = false;
  let stringStart = -1;
  for (let i = 0; i < jsonString.length; i++) {
    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }
    if (jsonString[i] === '\\') {
      escapeNext = true;
      i++;
      continue;
    }
    if (jsonString[i] === '"') {
      if (inString) {
        inString = false;
        stringStart = -1;
      } else {
        inString = true;
        stringStart = i;
      }
    }
  }
  if (inString && stringStart >= 0) {
    const { line, column } = getLineCol(stringStart);
    errors.push({
      message: 'Unclosed string',
      line,
      column,
      position: stringStart
    });
  }
  
  // Pass 2: Find bracket/brace mismatches and unclosed brackets
  const bracketStack = [];
  const bracketMap = { '{': '}', '[': ']' };
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    const char = jsonString[i];
    if (char === '{' || char === '[') {
      const { line, column } = getLineCol(i);
      bracketStack.push({ char, line, column, position: i });
    } else if (char === '}' || char === ']') {
      if (bracketStack.length === 0) {
        const { line, column } = getLineCol(i);
        errors.push({
          message: `Unexpected closing ${char === '}' ? 'brace' : 'bracket'}`,
          line,
          column,
          position: i
        });
      } else {
        const lastBracket = bracketStack.pop();
        const expected = bracketMap[lastBracket.char];
        if (char !== expected) {
          const { line, column } = getLineCol(i);
          errors.push({
            message: `Mismatched brackets: expected ${expected}, got ${char}`,
            line,
            column,
            position: i
          });
        }
      }
    }
  }
  for (const bracket of bracketStack) {
    errors.push({
      message: `Unclosed ${bracket.char === '{' ? 'brace' : 'bracket'}`,
      line: bracket.line,
      column: bracket.column,
      position: bracket.position
    });
  }
  
  // Pass 3: Find double commas (including with whitespace: , , or },, or ],,)
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (jsonString[i] === ',') {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j < jsonString.length && jsonString[j] === ',') {
        const { line, column } = getLineCol(i);
        errors.push({
          message: 'Double comma not allowed',
          line,
          column,
          position: i
        });
      }
    }
    if ((jsonString[i] === '}' || jsonString[i] === ']') && !isInString(i)) {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j < jsonString.length && jsonString[j] === ',') {
        let k = j + 1;
        while (k < jsonString.length && /[\s\n\r\t]/.test(jsonString[k])) {
          k++;
        }
        if (k < jsonString.length && jsonString[k] === ',') {
          const { line, column } = getLineCol(j);
          errors.push({
            message: 'Double comma not allowed',
            line,
            column,
            position: j
          });
        }
      }
    }
  }
  
  // Pass 4: Find trailing commas
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (jsonString[i] === ',') {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j >= jsonString.length || jsonString[j] === '}' || jsonString[j] === ']') {
        const { line, column } = getLineCol(i);
        errors.push({
          message: 'Trailing comma not allowed',
          line,
          column,
          position: i
        });
      }
    }
  }
  
  // Pass 5: Find empty array elements (comma followed by comma or ])
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (jsonString[i] === ',') {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j < jsonString.length && (jsonString[j] === ',' || jsonString[j] === ']')) {
        const { line, column } = getLineCol(i);
        errors.push({
          message: 'Empty array element (double comma)',
          line,
          column,
          position: i
        });
      }
    }
  }
  
  // Pass 5b: Find missing commas - only check clear cases
  // Case 1: String value followed by property name (like "John Doe" "age":)
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (jsonString[i] === '"') {
      // Find end of this string
      let strEnd = i + 1;
      let escapeNext = false;
      while (strEnd < jsonString.length) {
        if (escapeNext) {
          escapeNext = false;
          strEnd++;
          continue;
        }
        if (jsonString[strEnd] === '\\') {
          escapeNext = true;
          strEnd++;
          continue;
        }
        if (jsonString[strEnd] === '"') {
          strEnd++;
          break;
        }
        strEnd++;
      }
      
      // Check if this string is a property name (has : after it)
      let afterStr = strEnd;
      while (afterStr < jsonString.length && /[\s\n\r\t]/.test(jsonString[afterStr])) {
        afterStr++;
      }
      if (afterStr < jsonString.length && jsonString[afterStr] === ':') {
        // This is a property name, skip it
        continue;
      }
      
      // This is a value, check if next is a property name
      let j = strEnd;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j < jsonString.length && jsonString[j] === '"') {
        // Check if next string is a property name
        let nextStrEnd = j + 1;
        escapeNext = false;
        while (nextStrEnd < jsonString.length) {
          if (escapeNext) {
            escapeNext = false;
            nextStrEnd++;
            continue;
          }
          if (jsonString[nextStrEnd] === '\\') {
            escapeNext = true;
            nextStrEnd++;
            continue;
          }
          if (jsonString[nextStrEnd] === '"') {
            let afterNext = nextStrEnd + 1;
            while (afterNext < jsonString.length && /[\s\n\r\t]/.test(jsonString[afterNext])) {
              afterNext++;
            }
            // If next is a property name (has colon), we need a comma
            if (afterNext < jsonString.length && jsonString[afterNext] === ':') {
              let hasComma = false;
              for (let k = strEnd; k < j; k++) {
                if (jsonString[k] === ',') {
                  hasComma = true;
                  break;
                }
              }
              if (!hasComma) {
                const { line, column } = getLineCol(j);
                errors.push({
                  message: 'Missing comma between values',
                  line,
                  column,
                  position: j
                });
              }
            }
            break;
          }
          nextStrEnd++;
        }
      }
    }
  }
  
  // Pass 6: Find unquoted property names by scanning for identifier: pattern
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (/[\s\n\r\t]/.test(jsonString[i])) continue;
    if (/[a-zA-Z_]/.test(jsonString[i])) {
      let prev = i - 1;
      while (prev >= 0 && /[\s\n\r\t]/.test(jsonString[prev])) {
        prev--;
      }
      if (prev >= 0 && jsonString[prev] === '"') continue;
      
      let identStart = i;
      let identEnd = i;
      while (identEnd < jsonString.length && /[a-zA-Z0-9_]/.test(jsonString[identEnd])) {
        identEnd++;
      }
      const ident = jsonString.substring(identStart, identEnd);
      
      let k = identEnd;
      while (k < jsonString.length && /[\s\n\r\t]/.test(jsonString[k])) {
        k++;
      }
      if (k < jsonString.length && jsonString[k] === ':') {
        if (!/^(true|false|null)$/.test(ident)) {
          let lookBack = i - 1;
          while (lookBack >= 0 && /[\s\n\r\t]/.test(jsonString[lookBack])) {
            lookBack--;
          }
          if (lookBack < 0 || jsonString[lookBack] === '{' || jsonString[lookBack] === ',') {
            const { line, column } = getLineCol(identStart);
            errors.push({
              message: `Unquoted property name: ${ident}`,
              line,
              column,
              position: identStart
            });
          }
        }
      }
    }
  }
  
  // Pass 7: Find invalid keywords (tru, yes, no, etc.)
  const invalidKeywords = [
    { pattern: /\btru\b/g, message: 'Invalid keyword: tru (should be true)' },
    { pattern: /\byes\b/g, message: 'Invalid value: yes (should be boolean true or quoted string)' },
    { pattern: /\bno\b/g, message: 'Invalid value: no (should be boolean false or quoted string)' }
  ];
  for (const { pattern, message } of invalidKeywords) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(jsonString)) !== null) {
      if (!isInString(match.index)) {
        const { line, column } = getLineCol(match.index);
        errors.push({
          message,
          line,
          column,
          position: match.index
        });
      }
    }
  }
  
  // Pass 8: Find unquoted string values by scanning character by character
  for (let i = 0; i < jsonString.length; i++) {
    if (isInString(i)) continue;
    if (jsonString[i] === ':') {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j >= jsonString.length) continue;
      
      if (/[0-9]/.test(jsonString[j])) {
        let numEnd = j;
        while (numEnd < jsonString.length && /[0-9.eE+-]/.test(jsonString[numEnd])) {
          numEnd++;
        }
        let textStart = numEnd;
        while (textStart < jsonString.length && /[\s\n\r\t]/.test(jsonString[textStart])) {
          textStart++;
        }
        if (textStart < jsonString.length && /[a-zA-Z]/.test(jsonString[textStart])) {
          let valueEnd = textStart;
          while (valueEnd < jsonString.length && !/[,\s\n\r\t:}\]]/.test(jsonString[valueEnd])) {
            valueEnd++;
          }
          const unquotedValue = jsonString.substring(j, valueEnd);
          const { line, column } = getLineCol(j);
          errors.push({
            message: `Invalid unquoted value: ${unquotedValue} (should be quoted string)`,
            line,
            column,
            position: j
          });
        }
      }
      else if (/[a-zA-Z_]/.test(jsonString[j])) {
        let identEnd = j;
        while (identEnd < jsonString.length && /[a-zA-Z0-9_]/.test(jsonString[identEnd])) {
          identEnd++;
        }
        const ident = jsonString.substring(j, identEnd);
        if (!/^(true|false|null)$/.test(ident)) {
          let next = identEnd;
          while (next < jsonString.length && /[\s\n\r\t]/.test(jsonString[next])) {
            next++;
          }
          if (next >= jsonString.length || /[,}\]]/.test(jsonString[next])) {
            const { line, column } = getLineCol(j);
            errors.push({
              message: `Invalid unquoted value: ${ident} (should be quoted string, number, true, false, or null)`,
              line,
              column,
              position: j
            });
          }
        }
      }
    }
  }
  
  // Pass 9: Find missing commas after closing braces/brackets
  // Only report if followed by a property name (has colon)
  for (let i = 0; i < jsonString.length - 1; i++) {
    if (isInString(i)) continue;
    if ((jsonString[i] === '}' || jsonString[i] === ']')) {
      let j = i + 1;
      while (j < jsonString.length && /[\s\n\r\t]/.test(jsonString[j])) {
        j++;
      }
      if (j < jsonString.length && jsonString[j] === '"') {
        // Check if this is a property name (has colon after the string)
        let nextStrEnd = j + 1;
        let escapeNext = false;
        let isPropertyName = false;
        while (nextStrEnd < jsonString.length) {
          if (escapeNext) {
            escapeNext = false;
            nextStrEnd++;
            continue;
          }
          if (jsonString[nextStrEnd] === '\\') {
            escapeNext = true;
            nextStrEnd++;
            continue;
          }
          if (jsonString[nextStrEnd] === '"') {
            let afterNext = nextStrEnd + 1;
            while (afterNext < jsonString.length && /[\s\n\r\t]/.test(jsonString[afterNext])) {
              afterNext++;
            }
            if (afterNext < jsonString.length && jsonString[afterNext] === ':') {
              isPropertyName = true;
            }
            break;
          }
          nextStrEnd++;
        }
        
        // Only report missing comma if next is a property name
        if (isPropertyName) {
          let hasComma = false;
          for (let k = i + 1; k < j; k++) {
            if (jsonString[k] === ',') {
              hasComma = true;
              break;
            }
          }
          if (!hasComma) {
            let depth = 0;
            for (let k = 0; k < i; k++) {
              if (isInString(k)) continue;
              if (jsonString[k] === '{' || jsonString[k] === '[') depth++;
              if (jsonString[k] === '}' || jsonString[k] === ']') depth--;
            }
            if (depth > 0) {
              const { line, column } = getLineCol(j);
              errors.push({
                message: `Missing comma after closing ${jsonString[i] === '}' ? 'brace' : 'bracket'}`,
                line,
                column,
                position: j
              });
            }
          }
        }
      }
    }
  }
  
  // Remove duplicates and sort by position
  const uniqueErrors = [];
  const seenErrors = new Set();
  for (const error of errors) {
    const key = `${error.position || 0}-${error.message || ''}`;
    if (!seenErrors.has(key)) {
      seenErrors.add(key);
      uniqueErrors.push(error);
    }
  }
  
  uniqueErrors.sort((a, b) => {
    const posA = a.position !== null && a.position !== undefined ? a.position : (a.line || 0) * 1000 + (a.column || 0);
    const posB = b.position !== null && b.position !== undefined ? b.position : (b.line || 0) * 1000 + (b.column || 0);
    return posA - posB;
  });
  
  return uniqueErrors;
}

// Format JSON with options
export function formatJSON(obj, options = {}) {
  const {
    indent = 2,
    sortKeys = false,
    trailingCommas = false
  } = options;
  
  // Convert indent to number if it's not 'tab'
  let indentValue;
  if (indent === 'tab') {
    indentValue = '\t';
  } else if (typeof indent === 'string') {
    const parsed = parseInt(indent, 10);
    indentValue = isNaN(parsed) ? 2 : parsed; // Default to 2 if parsing fails
  } else {
    indentValue = indent;
  }
  
  let jsonString;
  
  if (sortKeys) {
    const sorted = sortObjectKeys(obj);
    jsonString = JSON.stringify(sorted, null, indentValue);
  } else {
    jsonString = JSON.stringify(obj, null, indentValue);
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

