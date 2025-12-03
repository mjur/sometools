// Text diff utilities (simple implementation)

// Simple line-based diff
export function diffLines(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      result.push({ type: 'added', line: newLines[j], oldIndex: null, newIndex: j });
      j++;
    } else if (j >= newLines.length) {
      result.push({ type: 'removed', line: oldLines[i], oldIndex: i, newIndex: null });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      result.push({ type: 'context', line: oldLines[i], oldIndex: i, newIndex: j });
      i++;
      j++;
    } else {
      // Check if line was moved
      const nextMatch = findNextMatch(oldLines, newLines, i, j);
      if (nextMatch.found) {
        // Add removed lines
        for (let k = i; k < nextMatch.oldIndex; k++) {
          result.push({ type: 'removed', line: oldLines[k], oldIndex: k, newIndex: null });
        }
        // Add added lines
        for (let k = j; k < nextMatch.newIndex; k++) {
          result.push({ type: 'added', line: newLines[k], oldIndex: null, newIndex: k });
        }
        i = nextMatch.oldIndex;
        j = nextMatch.newIndex;
      } else {
        // Simple: mark as removed and added
        result.push({ type: 'removed', line: oldLines[i], oldIndex: i, newIndex: null });
        result.push({ type: 'added', line: newLines[j], oldIndex: null, newIndex: j });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

// Find next matching line
function findNextMatch(oldLines, newLines, startOld, startNew) {
  // Look ahead in both directions
  for (let lookahead = 1; lookahead <= 5; lookahead++) {
    if (startOld + lookahead < oldLines.length) {
      const idx = newLines.indexOf(oldLines[startOld + lookahead], startNew);
      if (idx !== -1) {
        return { found: true, oldIndex: startOld + lookahead, newIndex: idx };
      }
    }
    if (startNew + lookahead < newLines.length) {
      const idx = oldLines.indexOf(newLines[startNew + lookahead], startOld);
      if (idx !== -1) {
        return { found: true, oldIndex: idx, newIndex: startNew + lookahead };
      }
    }
  }
  return { found: false };
}

// Word-based diff (simple)
export function diffWords(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  // Simple word-by-word comparison
  const result = [];
  let i = 0, j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      result.push({ type: 'added', text: newWords[j] });
      j++;
    } else if (j >= newWords.length) {
      result.push({ type: 'removed', text: oldWords[i] });
      i++;
    } else if (oldWords[i] === newWords[j]) {
      result.push({ type: 'context', text: oldWords[i] });
      i++;
      j++;
    } else {
      result.push({ type: 'removed', text: oldWords[i] });
      result.push({ type: 'added', text: newWords[j] });
      i++;
      j++;
    }
  }
  
  return result;
}

// Character-based diff (simple)
export function diffChars(oldText, newText) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < oldText.length || j < newText.length) {
    if (i >= oldText.length) {
      result.push({ type: 'added', char: newText[j] });
      j++;
    } else if (j >= newText.length) {
      result.push({ type: 'removed', char: oldText[i] });
      i++;
    } else if (oldText[i] === newText[j]) {
      result.push({ type: 'context', char: oldText[i] });
      i++;
      j++;
    } else {
      result.push({ type: 'removed', char: oldText[i] });
      result.push({ type: 'added', char: newText[j] });
      i++;
      j++;
    }
  }
  
  return result;
}

// Generate unified diff format
export function generateUnifiedDiff(oldText, newText, oldFile = 'old', newFile = 'new') {
  const diff = diffLines(oldText, newText);
  let output = `--- ${oldFile}\n+++ ${newFile}\n`;
  
  let oldLineNum = 1;
  let newLineNum = 1;
  
  for (const change of diff) {
    if (change.type === 'context') {
      output += ` ${change.line}\n`;
      oldLineNum++;
      newLineNum++;
    } else if (change.type === 'removed') {
      output += `-${change.line}\n`;
      oldLineNum++;
    } else if (change.type === 'added') {
      output += `+${change.line}\n`;
      newLineNum++;
    }
  }
  
  return output;
}

