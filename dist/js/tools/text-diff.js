import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { diffLines, diffWords, diffChars, generateUnifiedDiff } from '/js/utils/diff.js';

const oldText = qs('#old-text');
const newText = qs('#new-text');
const diffOutput = qs('#diff-output');
const oldTextHighlight = qs('#old-text-highlight');
const newTextHighlight = qs('#new-text-highlight');
const compareBtn = qs('#compare');
const copyDiffBtn = qs('#copy-diff');
const swapBtn = qs('#swap');
const granularitySelect = qs('#granularity');
const ignoreWhitespaceCheck = qs('#ignore-whitespace');

// Load state
const storageKey = 'text-diff-state';
const state = loadStateWithStorage(storageKey);
if (state?.oldText) oldText.value = state.oldText;
if (state?.newText) newText.value = state.newText;
if (state?.granularity) granularitySelect.value = state.granularity;
if (state?.ignoreWhitespace !== undefined) ignoreWhitespaceCheck.checked = state.ignoreWhitespace;

function normalizeText(text, ignoreWhitespace) {
  if (ignoreWhitespace) {
    return text.replace(/\s+/g, ' ').trim();
  }
  return text;
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create highlighted HTML from diff
function createHighlightedHTML(text, diff, granularity) {
  if (!diff || diff.length === 0) {
    return escapeHtml(text);
  }
  
  let html = '';
  
  if (granularity === 'line') {
    // For line-based, highlight entire lines
    const lines = text.split('\n');
    let lineIndex = 0;
    diff.forEach(change => {
      if (change.type === 'removed') {
        html += `<span class="diff-removed">${escapeHtml(change.line)}</span>\n`;
      } else if (change.type === 'added') {
        // Skip added lines in old text view
        if (lineIndex < lines.length && lines[lineIndex] === change.line) {
          html += escapeHtml(change.line) + '\n';
          lineIndex++;
        }
      } else {
        html += escapeHtml(change.line) + '\n';
        lineIndex++;
      }
    });
  } else if (granularity === 'word') {
    diff.forEach(change => {
      if (change.type === 'removed') {
        html += `<span class="diff-removed">${escapeHtml(change.text)}</span>`;
      } else if (change.type === 'added') {
        html += `<span class="diff-added">${escapeHtml(change.text)}</span>`;
      } else {
        html += escapeHtml(change.text);
      }
    });
  } else if (granularity === 'char') {
    diff.forEach(change => {
      if (change.type === 'removed') {
        html += `<span class="diff-removed">${escapeHtml(change.char)}</span>`;
      } else if (change.type === 'added') {
        html += `<span class="diff-added">${escapeHtml(change.char)}</span>`;
      } else {
        html += escapeHtml(change.char);
      }
    });
  }
  
  return html;
}

function compare() {
  const old = normalizeText(oldText.value, ignoreWhitespaceCheck.checked);
  const new_ = normalizeText(newText.value, ignoreWhitespaceCheck.checked);
  
  if (!old && !new_) {
    diffOutput.textContent = 'Enter texts to compare';
    diffOutput.className = '';
    // Clear highlights
    if (oldTextHighlight) oldTextHighlight.innerHTML = '';
    if (newTextHighlight) newTextHighlight.innerHTML = '';
    return;
  }
  
  // Debug: Check if highlight elements exist
  if (!oldTextHighlight) console.error('oldTextHighlight element not found!');
  if (!newTextHighlight) console.error('newTextHighlight element not found!');
  
  const granularity = granularitySelect.value;
  let diff;
  let output = '';
  
  try {
    if (granularity === 'line') {
      diff = diffLines(old, new_);
      // Render line-based diff
      diff.forEach(change => {
        if (change.type === 'context') {
          output += `  ${change.line}\n`;
        } else if (change.type === 'removed') {
          output += `- ${change.line}\n`;
        } else if (change.type === 'added') {
          output += `+ ${change.line}\n`;
        }
      });
    } else if (granularity === 'word') {
      diff = diffWords(old, new_);
      // Render word-based diff (simplified)
      let oldLine = '';
      let newLine = '';
      diff.forEach(change => {
        if (change.type === 'removed') {
          oldLine += change.text;
        } else if (change.type === 'added') {
          newLine += change.text;
        } else {
          oldLine += change.text;
          newLine += change.text;
        }
      });
      output = `Old: ${oldLine}\nNew: ${newLine}`;
    } else if (granularity === 'char') {
      diff = diffChars(old, new_);
      // Render char-based diff (simplified)
      let oldLine = '';
      let newLine = '';
      diff.forEach(change => {
        if (change.type === 'removed') {
          oldLine += change.char;
        } else if (change.type === 'added') {
          newLine += change.char;
        } else {
          oldLine += change.char;
          newLine += change.char;
        }
      });
      output = `Old: ${oldLine}\nNew: ${newLine}`;
    }
    
    diffOutput.textContent = output || 'No differences found';
    diffOutput.className = output ? '' : 'ok';
    
    // Create highlighted versions for textareas
    // Use the actual textarea values to match exactly
    const oldActual = oldText.value;
    const newActual = newText.value;
    
    // Create diff from actual values (not normalized) for accurate highlighting
    const oldForHighlight = ignoreWhitespaceCheck.checked ? oldActual.replace(/\s+/g, ' ').trim() : oldActual;
    const newForHighlight = ignoreWhitespaceCheck.checked ? newActual.replace(/\s+/g, ' ').trim() : newActual;
    
    if (granularity === 'word' || granularity === 'char') {
      // For word/char granularity, use the same diff for both
      const diff = granularity === 'word' ? diffWords(oldForHighlight, newForHighlight) : diffChars(oldForHighlight, newForHighlight);
      
      // Build highlighted version matching the actual old text
      let oldHighlight = '';
      let oldPos = 0;
      diff.forEach(change => {
        if (change.type === 'removed') {
          const text = change.text || change.char;
          oldHighlight += `<span class="diff-removed">${escapeHtml(text)}</span>`;
          oldPos += text.length;
        } else if (change.type === 'context') {
          const text = change.text || change.char;
          oldHighlight += escapeHtml(text);
          oldPos += text.length;
        }
        // Skip 'added' in old text view
      });
      // Fill remaining text if any
      if (oldPos < oldForHighlight.length) {
        oldHighlight += escapeHtml(oldForHighlight.substring(oldPos));
      }
      if (oldTextHighlight) {
        oldTextHighlight.innerHTML = oldHighlight;
        console.log('Old highlight set:', oldHighlight.substring(0, 100));
      }
      
      // Build highlighted version matching the actual new text
      let newHighlight = '';
      let newPos = 0;
      diff.forEach(change => {
        if (change.type === 'added') {
          const text = change.text || change.char;
          newHighlight += `<span class="diff-added">${escapeHtml(text)}</span>`;
          newPos += text.length;
        } else if (change.type === 'context') {
          const text = change.text || change.char;
          newHighlight += escapeHtml(text);
          newPos += text.length;
        }
        // Skip 'removed' in new text view
      });
      // Fill remaining text if any
      if (newPos < newForHighlight.length) {
        newHighlight += escapeHtml(newForHighlight.substring(newPos));
      }
      if (newTextHighlight) {
        newTextHighlight.innerHTML = newHighlight;
        console.log('New highlight set:', newHighlight.substring(0, 100));
      }
    } else if (granularity === 'line') {
      // For line granularity, highlight lines
      const lineDiff = diffLines(oldForHighlight, newForHighlight);
      const oldLines = oldForHighlight.split('\n');
      const newLines = newForHighlight.split('\n');
      
      // Old text: highlight removed lines
      let oldHighlight = '';
      let oldLineIdx = 0;
      lineDiff.forEach(change => {
        if (change.type === 'removed') {
          if (oldLineIdx < oldLines.length) {
            oldHighlight += `<span class="diff-removed">${escapeHtml(oldLines[oldLineIdx])}</span>\n`;
            oldLineIdx++;
          }
        } else if (change.type === 'context') {
          if (oldLineIdx < oldLines.length) {
            oldHighlight += escapeHtml(oldLines[oldLineIdx]) + '\n';
            oldLineIdx++;
          }
        }
        // Skip 'added' in old text view
      });
      // Add remaining lines
      while (oldLineIdx < oldLines.length) {
        oldHighlight += escapeHtml(oldLines[oldLineIdx]) + '\n';
        oldLineIdx++;
      }
      if (oldTextHighlight) {
        oldTextHighlight.innerHTML = oldHighlight;
        console.log('Old highlight (line) set:', oldHighlight.substring(0, 100));
      }
      
      // New text: highlight added lines
      let newHighlight = '';
      let newLineIdx = 0;
      lineDiff.forEach(change => {
        if (change.type === 'added') {
          if (newLineIdx < newLines.length) {
            newHighlight += `<span class="diff-added">${escapeHtml(newLines[newLineIdx])}</span>\n`;
            newLineIdx++;
          }
        } else if (change.type === 'context') {
          if (newLineIdx < newLines.length) {
            newHighlight += escapeHtml(newLines[newLineIdx]) + '\n';
            newLineIdx++;
          }
        }
        // Skip 'removed' in new text view
      });
      // Add remaining lines
      while (newLineIdx < newLines.length) {
        newHighlight += escapeHtml(newLines[newLineIdx]) + '\n';
        newLineIdx++;
      }
      if (newTextHighlight) {
        newTextHighlight.innerHTML = newHighlight;
        console.log('New highlight (line) set:', newHighlight.substring(0, 100));
      }
    }
    
    // Sync scroll between textarea and overlay
    function syncScroll(textarea, overlay) {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    }
    
    if (oldText && oldTextHighlight) {
      oldText.addEventListener('scroll', () => syncScroll(oldText, oldTextHighlight));
    }
    if (newText && newTextHighlight) {
      newText.addEventListener('scroll', () => syncScroll(newText, newTextHighlight));
    }
    
    // Save state
    saveStateWithStorage({
      oldText: oldText.value,
      newText: newText.value,
      granularity,
      ignoreWhitespace: ignoreWhitespaceCheck.checked
    }, storageKey);
    
    toast('Comparison complete', 'success');
  } catch (e) {
    diffOutput.textContent = `Error: ${e.message}`;
    diffOutput.className = 'error';
    toast(`Error: ${e.message}`, 'error');
    // Clear highlights on error
    if (oldTextHighlight) oldTextHighlight.innerHTML = '';
    if (newTextHighlight) newTextHighlight.innerHTML = '';
  }
}

// Buttons
on(compareBtn, 'click', compare);
on(copyDiffBtn, 'click', () => {
  if (diffOutput.textContent) {
    const unified = generateUnifiedDiff(oldText.value, newText.value);
    copy(unified, 'Diff copied to clipboard!');
  } else {
    toast('No diff to copy', 'error');
  }
});
on(swapBtn, 'click', () => {
  const temp = oldText.value;
  oldText.value = newText.value;
  newText.value = temp;
  // Clear highlights before swapping
  if (oldTextHighlight) oldTextHighlight.innerHTML = '';
  if (newTextHighlight) newTextHighlight.innerHTML = '';
  compare();
  toast('Texts swapped', 'success');
});

// Auto-compare on option change
on(granularitySelect, 'change', () => {
  if (oldText.value || newText.value) {
    compare();
  }
});

on(ignoreWhitespaceCheck, 'change', () => {
  if (oldText.value || newText.value) {
    compare();
  }
});

// Clear highlights when text changes
on(oldText, 'input', () => {
  if (oldTextHighlight) oldTextHighlight.innerHTML = '';
});

on(newText, 'input', () => {
  if (newTextHighlight) newTextHighlight.innerHTML = '';
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    compare();
  }
});

