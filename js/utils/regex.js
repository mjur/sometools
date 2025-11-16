// Regex utilities

// Test regex pattern
export function testRegex(pattern, flags, text) {
  try {
    const regex = new RegExp(pattern, flags);
    const matches = [];
    let match;
    let lastIndex = 0;
    
    // Reset lastIndex for global matches
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1).map((g, i) => ({
          index: i + 1,
          value: g,
          name: match.groups ? Object.keys(match.groups)[i] : null
        })),
        fullMatch: match
      });
      
      // Prevent infinite loop on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      
      // Break if not global
      if (!flags.includes('g')) {
        break;
      }
      
      // Safety check
      if (matches.length > 1000) {
        break;
      }
    }
    
    return {
      valid: true,
      matches,
      error: null
    };
  } catch (e) {
    return {
      valid: false,
      matches: [],
      error: e.message
    };
  }
}

// Get regex flags from string
export function parseFlags(flagString) {
  const flags = {
    g: flagString.includes('g'),
    i: flagString.includes('i'),
    m: flagString.includes('m'),
    s: flagString.includes('s'),
    u: flagString.includes('u'),
    y: flagString.includes('y')
  };
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag)
    .join('');
}

// Highlight matches in text
export function highlightMatches(text, pattern, flags) {
  try {
    const regex = new RegExp(pattern, flags);
    const parts = [];
    let lastIndex = 0;
    let match;
    
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Add match
      parts.push({
        type: 'match',
        content: match[0],
        index: match.index,
        groups: match.slice(1)
      });
      
      lastIndex = match.index + match[0].length;
      
      // Prevent infinite loop
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      
      if (!flags.includes('g')) {
        break;
      }
      
      if (parts.length > 2000) {
        break;
      }
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts;
  } catch (e) {
    return [{ type: 'error', content: e.message }];
  }
}

// Explain regex (basic)
export function explainRegex(pattern) {
  // This is a very basic explanation
  // For production, consider using a library like regexp-tree
  const explanations = [];
  
  try {
    new RegExp(pattern); // Validate
    
    explanations.push({
      part: pattern,
      meaning: 'Valid regular expression'
    });
    
    // Basic patterns
    if (pattern.includes('^')) {
      explanations.push({
        part: '^',
        meaning: 'Start of string'
      });
    }
    
    if (pattern.includes('$')) {
      explanations.push({
        part: '$',
        meaning: 'End of string'
      });
    }
    
    if (pattern.includes('.')) {
      explanations.push({
        part: '.',
        meaning: 'Any character (except newline)'
      });
    }
    
    if (pattern.includes('*')) {
      explanations.push({
        part: '*',
        meaning: 'Zero or more of preceding element'
      });
    }
    
    if (pattern.includes('+')) {
      explanations.push({
        part: '+',
        meaning: 'One or more of preceding element'
      });
    }
    
    if (pattern.includes('?')) {
      explanations.push({
        part: '?',
        meaning: 'Zero or one of preceding element (optional)'
      });
    }
    
    return {
      valid: true,
      explanations,
      error: null
    };
  } catch (e) {
    return {
      valid: false,
      explanations: [],
      error: e.message
    };
  }
}

