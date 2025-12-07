// YAML conversion utilities with advanced features support

// Validate YAML
export function validateYaml(yamlString) {
  try {
    parseYaml(yamlString);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// Convert JSON to YAML
export function jsonToYaml(jsonString, indent = 2) {
  try {
    const obj = JSON.parse(jsonString);
    return objectToYaml(obj, 0, indent);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }
}

// Convert YAML to JSON
export function yamlToJson(yamlString, pretty = true) {
  try {
    const obj = parseYaml(yamlString);
    if (pretty) {
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(obj);
  } catch (e) {
    throw new Error(`Invalid YAML: ${e.message}`);
  }
}

// Convert object to YAML string
function objectToYaml(obj, depth = 0, indent = 2) {
  const indentStr = ' '.repeat(depth * indent);
  const nextIndent = ' '.repeat((depth + 1) * indent);
  
  if (obj === null) {
    return 'null';
  }
  
  if (obj === undefined) {
    return '';
  }
  
  if (typeof obj === 'string') {
    // Escape special characters and quote if needed
    if (needsQuoting(obj)) {
      return `"${escapeString(obj)}"`;
    }
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    
    const items = obj.map(item => {
      if (isComplexType(item)) {
        // For objects in arrays, format specially to get correct indentation
        if (typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item);
          const pairs = keys.map((key, idx) => {
            const value = item[key];
            const escapedKey = needsQuoting(key) ? `"${escapeString(key)}"` : key;
            
            if (isComplexType(value)) {
              // Special handling for arrays as values - use the same logic as in object formatting
              if (Array.isArray(value)) {
                // Use special array-as-value formatting
                if (value.length === 0) {
                  return `${escapedKey}: []`;
                }
                const arrayIndent = ' '.repeat(indent);
                const arrayItems = value.map(item => {
                  if (isComplexType(item)) {
                    if (typeof item === 'object' && !Array.isArray(item)) {
                      const itemKeys = Object.keys(item);
                      const itemPairs = itemKeys.map(itemKey => {
                        const itemValue = item[itemKey];
                        const escapedItemKey = needsQuoting(itemKey) ? `"${escapeString(itemKey)}"` : itemKey;
                        if (isComplexType(itemValue)) {
                          const itemYamlValue = objectToYaml(itemValue, depth + 1, indent);
                          const itemValueLines = itemYamlValue.split('\n');
                          if (itemValueLines.length === 1) {
                            return `${escapedItemKey}: ${itemValueLines[0]}`;
                          }
                          const itemValueIndent = ' '.repeat(indent);
                          return `${escapedItemKey}:\n${itemValueIndent}${itemValueLines.join(`\n${itemValueIndent}`)}`;
                        } else {
                          const itemYamlValue = objectToYaml(itemValue, depth, indent);
                          return `${escapedItemKey}: ${itemYamlValue}`;
                        }
                      });
                      if (itemPairs.length === 1) {
                        return `- ${itemPairs[0]}`;
                      }
                      const itemIndent = ' '.repeat(indent);
                      return `- ${itemPairs[0]}\n${itemIndent}${itemPairs.slice(1).join(`\n${itemIndent}`)}`;
                    } else {
                      const nestedValue = objectToYaml(item, depth + 2, indent);
                      const nestedLines = nestedValue.split('\n');
                      if (nestedLines.length === 1) {
                        return `- ${nestedLines[0]}`;
                      }
                      const nestedIndent = ' '.repeat(indent);
                      return `-\n${nestedIndent}${nestedLines.join(`\n${nestedIndent}`)}`;
                    }
                  } else {
                    const itemValue = objectToYaml(item, 0, indent);
                    return `- ${itemValue}`;
                  }
                });
                const indentedItems = arrayItems.map(item => {
                  const lines = item.split('\n');
                  const indentedLines = lines.map((line, lineIdx) => {
                    if (lineIdx === 0) {
                      // First line (starts with '-') - just add arrayIndent
                      return arrayIndent + line.trimStart();
                    } else {
                      // Subsequent lines (object keys) - preserve their relative indentation
                      // They already have itemIndent (2 spaces) to align with first key
                      // We need to add arrayIndent (2 spaces) to the whole thing
                      // So: existing indent + arrayIndent
                      const trimmed = line.trimStart();
                      const existingIndent = line.length - trimmed.length;
                      // Preserve relative indentation: arrayIndent + existing relative indent
                      return arrayIndent + ' '.repeat(existingIndent) + trimmed;
                    }
                  });
                  return indentedLines.join('\n');
                });
                return `${escapedKey}:\n${indentedItems.join('\n')}`;
              } else {
                // Non-array complex type - use regular formatting
                const yamlValue = objectToYaml(value, depth + 1, indent);
                const valueLines = yamlValue.split('\n');
                if (valueLines.length === 1) {
                  return `${escapedKey}: ${valueLines[0]}`;
                }
                const valueIndent = ' '.repeat(indent);
                return `${escapedKey}:\n${valueIndent}${valueLines.join(`\n${valueIndent}`)}`;
              }
            } else {
              const yamlValue = objectToYaml(value, depth, indent);
              return `${escapedKey}: ${yamlValue}`;
            }
          });
          
          // First pair goes after dash, rest align with first key
          if (pairs.length === 1) {
            return `- ${pairs[0]}`;
          }
          const itemIndent = ' '.repeat(indent);
          return `- ${pairs[0]}\n${itemIndent}${pairs.slice(1).join(`\n${itemIndent}`)}`;
        } else {
          // For nested arrays, format normally
          const value = objectToYaml(item, depth + 1, indent);
          const lines = value.split('\n');
          
          if (lines.length === 1) {
            return `- ${lines[0]}`;
          }
          
          // For multi-line nested arrays, put dash on its own line
          return `-\n${nextIndent}${lines.join(`\n${nextIndent}`)}`;
        }
      } else {
        // Simple values can be on the same line as the dash
        const value = objectToYaml(item, depth, indent);
        return `- ${value}`;
      }
    });
    
    return items.join('\n' + indentStr);
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return '{}';
    }
    
    const pairs = keys.map(key => {
      const value = obj[key];
      const escapedKey = needsQuoting(key) ? `"${escapeString(key)}"` : key;
      
      if (isComplexType(value)) {
        // For arrays, we need special handling to get correct indentation
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${escapedKey}: []`;
          }
          
          // Format array items with proper indentation
          // All items should be indented by 'indent' spaces from the key
          const arrayIndent = ' '.repeat(indent);
          const arrayItems = value.map((item, itemIndex) => {
            if (isComplexType(item)) {
              // For objects in arrays, format them properly
              if (typeof item === 'object' && !Array.isArray(item)) {
                const itemKeys = Object.keys(item);
                const itemPairs = itemKeys.map(itemKey => {
                  const itemValue = item[itemKey];
                  const escapedItemKey = needsQuoting(itemKey) ? `"${escapeString(itemKey)}"` : itemKey;
                  
                  if (isComplexType(itemValue)) {
                    // Item value is complex - format at depth + 1 (one level deeper than the array item)
                    const itemYamlValue = objectToYaml(itemValue, depth + 1, indent);
                    const itemValueLines = itemYamlValue.split('\n');
                    if (itemValueLines.length === 1) {
                      return `${escapedItemKey}: ${itemValueLines[0]}`;
                    }
                    // Indent subsequent lines to align with content after the key
                    const itemValueIndent = ' '.repeat(indent);
                    return `${escapedItemKey}:\n${itemValueIndent}${itemValueLines.join(`\n${itemValueIndent}`)}`;
                  } else {
                    const itemYamlValue = objectToYaml(itemValue, depth, indent);
                    return `${escapedItemKey}: ${itemYamlValue}`;
                  }
                });
                
                // Format the object as an array item
                // First key goes on same line as dash, rest align with first key
                // When this array is a value of an object key, we'll add arrayIndent to all lines
                // So subsequent keys should NOT have extra indentation here - they'll get it when arrayIndent is added
                if (itemPairs.length === 1) {
                  return `- ${itemPairs[0]}`;
                }
                // For subsequent keys, we want them to align with the first key's content
                // Since we'll add arrayIndent to all lines later, we need to account for that
                // The first key is: "- key: value" (no leading spaces yet)
                // Subsequent keys should be: "  key: value" (indented to align with first key's content)
                // But when arrayIndent is added: "  - key: value" and "    key: value"
                // So we need: subsequent keys should have indent spaces to align with content after "- "
                const itemIndent = ' '.repeat(indent);
                const formattedObject = `- ${itemPairs[0]}\n${itemIndent}${itemPairs.slice(1).join(`\n${itemIndent}`)}`;
                return formattedObject;
              } else {
                // Nested array
                const nestedValue = objectToYaml(item, depth + 2, indent);
                const nestedLines = nestedValue.split('\n');
                if (nestedLines.length === 1) {
                  return `- ${nestedLines[0]}`;
                }
                const nestedIndent = ' '.repeat(indent);
                return `-\n${nestedIndent}${nestedLines.join(`\n${nestedIndent}`)}`;
              }
            } else {
              // Simple value - just add the dash
              // For simple values, we don't need any depth-based indentation
              // because we'll add arrayIndent to all items later
              const itemValue = objectToYaml(item, 0, indent);
              return `- ${itemValue}`;
            }
          });
          
          // Join array items - each item starts with '-' and is indented by arrayIndent
          // All items need to be indented, including the first one
          // For multi-line items (objects), all lines need arrayIndent added
          const indentedItems = arrayItems.map((item, itemIdx) => {
            // Split by newlines to handle multi-line items (objects in arrays)
            const lines = item.split('\n');
            // Add arrayIndent to ALL lines of each item
            // Remove any existing leading whitespace first to avoid double-indentation
            const indentedLines = lines.map(line => {
              const trimmed = line.trimStart();
              const existingIndent = line.length - trimmed.length;
              // Only add arrayIndent - don't preserve existing indentation
              return arrayIndent + trimmed;
            });
            return indentedLines.join('\n');
          });
          // Join all indented items with newlines
          return `${escapedKey}:\n${indentedItems.join('\n')}`;
        } else {
          // For objects (non-array complex types)
          const yamlValue = objectToYaml(value, depth + 1, indent);
          return `${escapedKey}:\n${nextIndent}${yamlValue.split('\n').join(`\n${nextIndent}`)}`;
        }
      } else {
        const yamlValue = objectToYaml(value, depth, indent);
        return `${escapedKey}: ${yamlValue}`;
      }
    });
    
    return pairs.join('\n' + indentStr);
  }
  
  return String(obj);
}

// Check if value needs quoting
function needsQuoting(str) {
  if (typeof str !== 'string') return false;
  
  // Quote if empty, starts with number, contains special chars, or is a YAML keyword
  if (str === '') return true;
  if (/^\d/.test(str)) return true;
  if (/[:{}\[\],&*#?|!\-%@`]/.test(str)) return true;
  if (['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(str.toLowerCase())) return true;
  if (str.includes('\n') || str.includes('\r')) return true;
  if (str.trim() !== str) return true;
  
  return false;
}

// Escape string for YAML
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Check if value is a complex type (object or array)
function isComplexType(value) {
  return (typeof value === 'object' && value !== null) || Array.isArray(value);
}

// Enhanced YAML parser with advanced features
function parseYaml(yamlString) {
  if (!yamlString || typeof yamlString !== 'string') {
    throw new Error('YAML input must be a string');
  }
  
  // Store anchors for alias resolution
  const anchors = {};
  const documents = [];
  let currentDoc = {};
  let stack = [{ obj: currentDoc, indent: -1 }];
  
  const lines = yamlString.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Document separator
    if (trimmed === '---') {
      if (Object.keys(currentDoc).length > 0) {
        documents.push(currentDoc);
      }
      currentDoc = {};
      stack = [{ obj: currentDoc, indent: -1 }];
      i++;
      continue;
    }
    
    // Document end
    if (trimmed === '...') {
      if (Object.keys(currentDoc).length > 0) {
        documents.push(currentDoc);
      }
      i++;
      continue;
    }
    
    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      continue;
    }
    
    // Parse line
    const result = parseLine(lines, i, stack, anchors);
    i = result.nextIndex;
  }
  
  // Add last document
  if (Object.keys(currentDoc).length > 0) {
    documents.push(currentDoc);
  }
  
  // Resolve aliases
  resolveAliases(currentDoc, anchors);
  
  // Return first document (or all if multiple)
  return documents.length > 1 ? documents : (documents[0] || currentDoc);
}

// Parse a single line with advanced features
function parseLine(lines, index, stack, anchors) {
  const line = lines[index];
  const trimmed = line.trim();
  const indent = line.length - line.trimStart().length;
  
  // Pop stack until we find the right parent
  while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
    stack.pop();
  }
  
  const current = stack[stack.length - 1];
  if (!current || !current.obj) {
    throw new Error(`Invalid YAML structure at line ${index + 1}`);
  }
  
  // Handle anchors
  let anchorName = null;
  let aliasName = null;
  let processedLine = trimmed;
  
  // Extract anchor (&anchor)
  const anchorMatch = processedLine.match(/^(&\w+)\s+/);
  if (anchorMatch) {
    anchorName = anchorMatch[1].substring(1);
    processedLine = processedLine.substring(anchorMatch[0].length);
  }
  
  // Extract alias (*alias)
  const aliasMatch = processedLine.match(/^(\*\w+)(\s|$|:)/);
  if (aliasMatch) {
    aliasName = aliasMatch[1].substring(1);
    processedLine = processedLine.replace(aliasMatch[0], '').trim();
  }
  
  // Handle alias-only line
  if (aliasName && !processedLine) {
    if (!anchors[aliasName]) {
      throw new Error(`Undefined alias "*${aliasName}" at line ${index + 1}`);
    }
    if (Array.isArray(current.obj)) {
      current.obj.push(cloneValue(anchors[aliasName]));
    } else {
      // Need to determine where to place alias
      throw new Error(`Alias placement ambiguous at line ${index + 1}`);
    }
    return { nextIndex: index + 1 };
  }
  
  // Handle merge key (<<)
  if (processedLine.startsWith('<<:')) {
    const mergeValue = processedLine.substring(3).trim();
    if (mergeValue.startsWith('*')) {
      const mergeAlias = mergeValue.substring(1);
      if (!anchors[mergeAlias]) {
        throw new Error(`Undefined merge alias "*${mergeAlias}" at line ${index + 1}`);
      }
      const mergeObj = anchors[mergeAlias];
      if (typeof mergeObj === 'object' && !Array.isArray(mergeObj)) {
        Object.assign(current.obj, cloneValue(mergeObj));
      }
    } else {
      // Parse inline object
      const mergeObj = parseFlowObject(mergeValue);
      Object.assign(current.obj, mergeObj);
    }
    return { nextIndex: index + 1 };
  }
  
  // Parse key-value pair
  if (processedLine.includes(':')) {
    const colonIndex = processedLine.indexOf(':');
    const key = processedLine.substring(0, colonIndex).trim();
    let value = processedLine.substring(colonIndex + 1).trim();
    
    if (!key) {
      throw new Error(`Missing key at line ${index + 1}`);
    }
    
    // Remove quotes if present
    const cleanKey = unquote(key);
    
    // Handle flow collections
    if (value.startsWith('[') || value.startsWith('{')) {
      const flowResult = parseFlowCollection(value, index);
      const parsedValue = flowResult.value;
      
      // Store anchor if present
      if (anchorName) {
        anchors[anchorName] = parsedValue;
      }
      
      current.obj[cleanKey] = parsedValue;
      return { nextIndex: index + 1 };
    }
    
    // Handle multi-line strings (| and >)
    if (value === '|' || value === '>' || value.startsWith('|') || value.startsWith('>')) {
      const multilineResult = parseMultilineString(lines, index, value);
      const parsedValue = multilineResult.value;
      
      if (anchorName) {
        anchors[anchorName] = parsedValue;
      }
      
      current.obj[cleanKey] = parsedValue;
      return { nextIndex: multilineResult.nextIndex };
    }
    
    // Handle empty value (nested structure)
    if (value === '') {
      const nextLine = index < lines.length - 1 ? lines[index + 1] : null;
      if (nextLine && (nextLine.trim().startsWith('-') || nextLine.trim().includes(':'))) {
        // Array or nested object
        if (nextLine.trim().startsWith('-')) {
          current.obj[cleanKey] = [];
          stack.push({ obj: current.obj[cleanKey], indent });
        } else {
          current.obj[cleanKey] = {};
          stack.push({ obj: current.obj[cleanKey], indent });
        }
      } else {
        current.obj[cleanKey] = null;
      }
      
      if (anchorName) {
        anchors[anchorName] = current.obj[cleanKey];
      }
      
      return { nextIndex: index + 1 };
    }
    
    // Handle alias in value
    if (value.startsWith('*')) {
      const alias = value.substring(1).trim();
      if (!anchors[alias]) {
        throw new Error(`Undefined alias "*${alias}" at line ${index + 1}`);
      }
      const aliasValue = cloneValue(anchors[alias]);
      if (anchorName) {
        anchors[anchorName] = aliasValue;
      }
      current.obj[cleanKey] = aliasValue;
      return { nextIndex: index + 1 };
    }
    
    // Simple value
    try {
      const parsedValue = parseValue(value);
      if (anchorName) {
        anchors[anchorName] = parsedValue;
      }
      current.obj[cleanKey] = parsedValue;
    } catch (e) {
      throw new Error(`Invalid value at line ${index + 1}: ${e.message}`);
    }
    
    return { nextIndex: index + 1 };
  }
  
  // Handle array item
  if (trimmed.startsWith('-')) {
    let itemLine = trimmed.substring(1).trim();
    
    // Extract anchor/alias from array item
    const itemAnchorMatch = itemLine.match(/^(&\w+)\s+/);
    if (itemAnchorMatch) {
      anchorName = itemAnchorMatch[1].substring(1);
      itemLine = itemLine.substring(itemAnchorMatch[0].length);
    }
    
    const itemAliasMatch = itemLine.match(/^(\*\w+)(\s|$)/);
    if (itemAliasMatch) {
      aliasName = itemAliasMatch[1].substring(1);
      if (!anchors[aliasName]) {
        throw new Error(`Undefined alias "*${aliasName}" at line ${index + 1}`);
      }
      if (Array.isArray(current.obj)) {
        current.obj.push(cloneValue(anchors[aliasName]));
      }
      return { nextIndex: index + 1 };
    }
    
    // Handle flow collections in array
    if (itemLine.startsWith('[') || itemLine.startsWith('{')) {
      const flowResult = parseFlowCollection(itemLine, index);
      const parsedValue = flowResult.value;
      if (anchorName) {
        anchors[anchorName] = parsedValue;
      }
      if (Array.isArray(current.obj)) {
        current.obj.push(parsedValue);
      }
      return { nextIndex: index + 1 };
    }
    
    // Handle multi-line strings in array
    if (itemLine === '|' || itemLine === '>' || itemLine.startsWith('|') || itemLine.startsWith('>')) {
      const multilineResult = parseMultilineString(lines, index, itemLine);
      const parsedValue = multilineResult.value;
      if (anchorName) {
        anchors[anchorName] = parsedValue;
      }
      if (Array.isArray(current.obj)) {
        current.obj.push(parsedValue);
      }
      return { nextIndex: multilineResult.nextIndex };
    }
    
    // Simple array item
    try {
      const itemValue = parseValue(itemLine);
      if (anchorName) {
        anchors[anchorName] = itemValue;
      }
      if (Array.isArray(current.obj)) {
        current.obj.push(itemValue);
      } else {
        // Convert current to array
        const parent = stack[stack.length - 2];
        if (parent) {
          const lastKey = Object.keys(parent.obj).pop();
          if (lastKey) {
            parent.obj[lastKey] = [parent.obj[lastKey], itemValue];
          }
        }
      }
    } catch (e) {
      throw new Error(`Invalid array item at line ${index + 1}: ${e.message}`);
    }
    
    return { nextIndex: index + 1 };
  }
  
  throw new Error(`Invalid YAML syntax at line ${index + 1}: "${trimmed}"`);
}

// Parse flow collections (inline arrays/objects)
function parseFlowCollection(value, lineIndex) {
  if (value.startsWith('[')) {
    // Array
    return parseFlowArray(value, lineIndex);
  } else if (value.startsWith('{')) {
    // Object
    return parseFlowObject(value);
  }
  throw new Error(`Invalid flow collection at line ${lineIndex + 1}`);
}

// Parse flow array [item1, item2, ...]
function parseFlowArray(value, lineIndex) {
  if (!value.startsWith('[') || !value.endsWith(']')) {
    throw new Error(`Invalid flow array at line ${lineIndex + 1}`);
  }
  
  const content = value.slice(1, -1).trim();
  if (!content) {
    return { value: [], nextIndex: lineIndex };
  }
  
  const items = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = null;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && content[i - 1] !== '\\') {
      inString = false;
      stringChar = null;
      current += char;
    } else if (!inString) {
      if (char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        items.push(parseValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    items.push(parseValue(current.trim()));
  }
  
  return { value: items, nextIndex: lineIndex };
}

// Parse flow object {key: value, ...}
function parseFlowObject(value) {
  if (typeof value === 'string') {
    if (!value.startsWith('{') || !value.endsWith('}')) {
      return {};
    }
    value = value.slice(1, -1).trim();
  }
  
  if (!value) {
    return {};
  }
  
  const obj = {};
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let key = null;
  
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && value[i - 1] !== '\\') {
      inString = false;
      stringChar = null;
      current += char;
    } else if (!inString) {
      if (char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === ':' && depth === 0 && !key) {
        key = current.trim();
        current = '';
      } else if (char === ',' && depth === 0) {
        if (key) {
          obj[unquote(key)] = parseValue(current.trim());
          key = null;
          current = '';
        }
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  
  if (key && current.trim()) {
    obj[unquote(key)] = parseValue(current.trim());
  }
  
  return obj;
}

// Parse multi-line string (| or >)
function parseMultilineString(lines, startIndex, indicator) {
  const isLiteral = indicator.startsWith('|');
  const isFolded = indicator.startsWith('>');
  
  // Extract modifiers (e.g., |-2, |+1)
  const modifiers = indicator.match(/[+-]\d+$/);
  const stripTrailing = modifiers && modifiers[0].startsWith('-');
  const keepTrailing = modifiers && modifiers[0].startsWith('+');
  
  const content = [];
  let i = startIndex + 1;
  const baseIndent = lines[startIndex].length - lines[startIndex].trimStart().length;
  
  while (i < lines.length) {
    const line = lines[i];
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    
    // Stop if we hit a line with same or less indentation that's not empty
    if (indent <= baseIndent && trimmed !== '' && !trimmed.startsWith('#')) {
      break;
    }
    
    // Skip empty lines at the start
    if (content.length === 0 && trimmed === '') {
      i++;
      continue;
    }
    
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (isLiteral) {
        content.push('');
      }
    } else {
      // Remove base indentation
      const lineContent = line.substring(Math.min(indent, baseIndent + 1));
      content.push(lineContent);
    }
    
    i++;
  }
  
  let result = content.join('\n');
  
  if (isFolded) {
    // Folded: replace newlines with spaces, except for double newlines
    result = result.replace(/\n\n/g, '\x00').replace(/\n/g, ' ').replace(/\x00/g, '\n');
  }
  
  if (stripTrailing) {
    result = result.replace(/\n+$/, '');
  } else if (!keepTrailing) {
    result = result.replace(/\n+$/, '\n');
  }
  
  return { value: result, nextIndex: i - 1 };
}

// Resolve aliases in the parsed object
function resolveAliases(obj, anchors) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        if (obj[i].__alias) {
          const aliasName = obj[i].__alias;
          if (!anchors[aliasName]) {
            throw new Error(`Undefined alias "*${aliasName}"`);
          }
          obj[i] = cloneValue(anchors[aliasName]);
        } else {
          resolveAliases(obj[i], anchors);
        }
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key].__alias) {
          const aliasName = obj[key].__alias;
          if (!anchors[aliasName]) {
            throw new Error(`Undefined alias "*${aliasName}"`);
          }
          obj[key] = cloneValue(anchors[aliasName]);
        } else {
          resolveAliases(obj[key], anchors);
        }
      }
    }
  }
}

// Clone a value (deep copy)
function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item));
  } else if (typeof value === 'object' && value !== null) {
    const cloned = {};
    for (const key in value) {
      cloned[key] = cloneValue(value[key]);
    }
    return cloned;
  }
  return value;
}

// Parse YAML value
function parseValue(value) {
  if (value === '') return null;
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"') && value.endsWith('"')) {
    return unescapeString(value.slice(1, -1));
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d*\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  return value;
}

// Unquote string
function unquote(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

// Unescape string
function unescapeString(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
