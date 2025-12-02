// SQL formatting utilities

// SQL keywords that should be uppercase
const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX',
  'ALTER', 'DROP', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'ELSEIF', 'WHILE', 'FOR', 'LOOP',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'DECLARE', 'CURSOR', 'PROCEDURE',
  'FUNCTION', 'TRIGGER', 'VIEW', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
  'RETURN', 'RETURNS', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION', 'WINDOW',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'CONVERT', 'COALESCE', 'NULLIF',
  'CROSS', 'APPLY', 'PIVOT', 'UNPIVOT', 'TOP', 'FETCH', 'NEXT', 'ONLY'
]);

// Keywords that should be on a new line
const NEWLINE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'GROUP', 'ORDER', 'HAVING', 'UNION', 'INSERT', 'UPDATE', 'DELETE', 'CREATE',
  'ALTER', 'DROP', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
]);

// Keywords that increase indentation
const INDENT_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'GROUP', 'ORDER', 'HAVING', 'UNION', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE'
]);

// Format SQL query
export function formatSQL(sql, options = {}) {
  const {
    indent = 2,
    keywordCase = 'upper'
  } = options;
  
  if (!sql || !sql.trim()) {
    return '';
  }
  
  const indentStr = indent === 'tab' ? '\t' : ' '.repeat(indent);
  
  // Normalize keyword case
  function normalizeKeyword(word) {
    if (keywordCase === 'upper') {
      return word.toUpperCase();
    } else if (keywordCase === 'lower') {
      return word.toLowerCase();
    }
    return word; // preserve case
  }
  
  // Tokenize SQL while preserving strings and comments
  function tokenize(sql) {
    const tokens = [];
    let i = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = '';
    let currentToken = '';
    
    while (i < sql.length) {
      const char = sql[i];
      const nextChar = i + 1 < sql.length ? sql[i + 1] : '';
      
      // Handle strings
      if (!inComment && (char === '"' || char === "'" || char === '`')) {
        if (!inString) {
          if (currentToken) {
            tokens.push({ type: 'word', value: currentToken });
            currentToken = '';
          }
          inString = true;
          stringChar = char;
          tokens.push({ type: 'string', value: char, start: i });
        } else if (char === stringChar) {
          // Check for escaped quote
          if (sql[i - 1] !== '\\' || (i > 1 && sql[i - 2] === '\\')) {
            inString = false;
            stringChar = '';
            const lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'string') {
              lastToken.value += char;
              lastToken.end = i + 1;
            }
          } else {
            const lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'string') {
              lastToken.value += char;
            }
          }
        } else {
          const lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === 'string') {
            lastToken.value += char;
          }
        }
        i++;
        continue;
      }
      
      if (inString) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === 'string') {
          lastToken.value += char;
        }
        i++;
        continue;
      }
      
      // Handle comments
      if (!inComment && char === '-' && nextChar === '-') {
        if (currentToken) {
          tokens.push({ type: 'word', value: currentToken });
          currentToken = '';
        }
        inComment = true;
        commentType = '--';
        tokens.push({ type: 'comment', value: '--', start: i });
        i += 2;
        continue;
      } else if (!inComment && char === '/' && nextChar === '*') {
        if (currentToken) {
          tokens.push({ type: 'word', value: currentToken });
          currentToken = '';
        }
        inComment = true;
        commentType = '/*';
        tokens.push({ type: 'comment', value: '/*', start: i });
        i += 2;
        continue;
      } else if (inComment && commentType === '/*' && char === '*' && nextChar === '/') {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === 'comment') {
          lastToken.value += '*/';
        }
        inComment = false;
        commentType = '';
        i += 2;
        continue;
      } else if (inComment && commentType === '--' && char === '\n') {
        inComment = false;
        commentType = '';
        tokens.push({ type: 'newline', value: '\n' });
        i++;
        continue;
      }
      
      if (inComment) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === 'comment') {
          lastToken.value += char;
        }
        i++;
        continue;
      }
      
      // Handle whitespace
      if (/\s/.test(char)) {
        if (currentToken) {
          tokens.push({ type: 'word', value: currentToken });
          currentToken = '';
        }
        if (char === '\n' || char === '\r') {
          tokens.push({ type: 'newline', value: '\n' });
        } else {
          tokens.push({ type: 'whitespace', value: ' ' });
        }
        i++;
        continue;
      }
      
      // Handle punctuation
      if (/[(),;]/.test(char)) {
        if (currentToken) {
          tokens.push({ type: 'word', value: currentToken });
          currentToken = '';
        }
        tokens.push({ type: 'punctuation', value: char });
        i++;
        continue;
      }
      
      // Collect word
      currentToken += char;
      i++;
    }
    
    if (currentToken) {
      tokens.push({ type: 'word', value: currentToken });
    }
    
    return tokens;
  }
  
  // Format tokens
  const tokens = tokenize(sql);
  let formatted = '';
  let indentLevel = 0;
  let inSelectList = false;
  let lastKeyword = '';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
    
    if (token.type === 'word') {
      const upper = token.value.toUpperCase();
      const isKeyword = SQL_KEYWORDS.has(upper);
      
      if (isKeyword) {
        const normalized = normalizeKeyword(token.value);
        
        // Handle major clauses that should be on new lines
        if (upper === 'SELECT') {
          formatted += normalized;
          inSelectList = true;
          indentLevel = 0;
        } else if (upper === 'FROM' || upper === 'WHERE' || upper === 'GROUP' || 
                   upper === 'ORDER' || upper === 'HAVING' || upper === 'UNION' ||
                   upper === 'INTERSECT' || upper === 'EXCEPT') {
          formatted += '\n' + indentStr.repeat(indentLevel) + normalized;
          inSelectList = false;
        } else if (upper === 'JOIN' || upper === 'INNER' || upper === 'LEFT' || 
                   upper === 'RIGHT' || upper === 'FULL' || upper === 'OUTER') {
          formatted += '\n' + indentStr.repeat(indentLevel + 1) + normalized;
          inSelectList = false;
        } else if (upper === 'ON' || upper === 'AS') {
          formatted += ' ' + normalized;
        } else if (upper === 'AND' || upper === 'OR') {
          formatted += '\n' + indentStr.repeat(indentLevel + 1) + normalized;
        } else {
          formatted += ' ' + normalized;
        }
        
        lastKeyword = upper;
      } else {
        // Not a keyword
        formatted += token.value;
      }
    } else if (token.type === 'punctuation') {
      if (token.value === ',') {
        formatted += ',';
        if (inSelectList && nextToken && nextToken.type === 'word') {
          formatted += '\n' + indentStr.repeat(indentLevel + 1);
        }
      } else if (token.value === '(') {
        formatted += '(';
        indentLevel++;
      } else if (token.value === ')') {
        if (indentLevel > 0) indentLevel--;
        formatted += ')';
      } else {
        formatted += token.value;
      }
    } else if (token.type === 'string') {
      // Extract the full string from original SQL
      const start = token.start || 0;
      let end = token.end || start + 1;
      let j = start + 1;
      const quoteChar = sql[start];
      while (j < sql.length) {
        if (sql[j] === quoteChar && sql[j - 1] !== '\\') {
          end = j + 1;
          break;
        }
        j++;
      }
      formatted += sql.substring(start, end);
      i += (end - start - 1); // Skip ahead
    } else if (token.type === 'comment') {
      formatted += token.value;
      if (token.value.startsWith('--')) {
        formatted += '\n';
      }
    } else if (token.type === 'newline') {
      // Preserve newlines but clean up
      if (!formatted.endsWith('\n')) {
        formatted += '\n';
      }
    } else if (token.type === 'whitespace') {
      // Only add space if needed
      if (!formatted.endsWith(' ') && !formatted.endsWith('\n') && 
          nextToken && nextToken.type !== 'punctuation' && nextToken.type !== 'newline') {
        formatted += ' ';
      }
    }
  }
  
  // Clean up
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.replace(/[ \t]+\n/g, '\n');
  formatted = formatted.trim();
  
  return formatted;
}

// Minify SQL (remove extra whitespace, normalize)
export function minifySQL(sql) {
  if (!sql || !sql.trim()) {
    return '';
  }
  
  let minified = sql;
  
  // Remove comments
  minified = minified.replace(/--[^\n]*/g, '');
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Normalize whitespace
  minified = minified.replace(/\s+/g, ' ');
  
  // Remove whitespace around operators and punctuation
  minified = minified.replace(/\s*([(),;])\s*/g, '$1');
  minified = minified.replace(/\s*([=<>!]+)\s*/g, ' $1 ');
  minified = minified.replace(/\s*([+\-*/%])\s*/g, ' $1 ');
  
  return minified.trim();
}

