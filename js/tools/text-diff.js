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

// Maximum text size limits (in characters)
const MAX_TEXT_SIZE = {
  char: 50000,   // Character diff is expensive
  word: 500000,  // Word diff is moderate
  line: 1000000  // Line diff is most efficient
};

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
  
  const granularity = granularitySelect.value;
  const maxSize = MAX_TEXT_SIZE[granularity];
  const oldSize = old.length;
  const newSize = new_.length;
  const maxInputSize = Math.max(oldSize, newSize);
  
  // Check size limits
  if (maxInputSize > maxSize) {
    const sizeMB = (maxInputSize / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    diffOutput.textContent = `Text too large for ${granularity} diff (${sizeMB} MB). Maximum size: ${maxMB} MB. Try line-level diff or split the text.`;
    diffOutput.className = 'error';
    if (oldTextHighlight) oldTextHighlight.innerHTML = '';
    if (newTextHighlight) newTextHighlight.innerHTML = '';
    toast(`Text too large for ${granularity} diff. Use line-level diff for large texts.`, 'error');
    return;
  }
  
  // Show progress for large texts
  if (maxInputSize > 100000) {
    diffOutput.textContent = 'Processing large text, please wait...';
    diffOutput.className = '';
    compareBtn.disabled = true;
    compareBtn.textContent = 'Processing...';
  }
  
  // Debug: Check if highlight elements exist
  if (!oldTextHighlight) console.error('oldTextHighlight element not found!');
  if (!newTextHighlight) console.error('newTextHighlight element not found!');
  
  let diff;
  let output = '';
  
  // Use requestAnimationFrame to allow UI updates during processing
  requestAnimationFrame(() => {
    try {
      if (granularity === 'line') {
        diff = diffLines(old, new_);
        if (!diff || !Array.isArray(diff)) {
          throw new Error('Failed to generate line diff');
        }
        // Render line-based diff (optimized for large texts)
        const outputParts = [];
        let lineCount = 0;
        const maxLinesToShow = 10000; // Limit output size
        
        for (const change of diff) {
          if (lineCount >= maxLinesToShow) {
            outputParts.push(`\n... (${diff.length - maxLinesToShow} more lines) ...`);
            break;
          }
          
          if (change.type === 'context') {
            outputParts.push(`  ${change.line}`);
          } else if (change.type === 'removed') {
            outputParts.push(`- ${change.line}`);
          } else if (change.type === 'added') {
            outputParts.push(`+ ${change.line}`);
          }
          lineCount++;
        }
        output = outputParts.join('\n');
      } else if (granularity === 'word') {
        diff = diffWords(old, new_);
        if (!diff || !Array.isArray(diff)) {
          throw new Error('Failed to generate word diff');
        }
        // For large word diffs, show summary instead of full text
        if (diff.length > 100000) {
          const removed = diff.filter(c => c && c.type === 'removed').length;
          const added = diff.filter(c => c && c.type === 'added').length;
          output = `Large diff detected:\n- ${removed} words removed\n+ ${added} words added\n\nUse line-level diff for better performance with large texts.`;
        } else {
          // Render word-based diff (only show changes)
          const outputParts = [];
          for (const change of diff) {
            if (!change) continue;
            if (change.type === 'removed') {
              outputParts.push(`- ${change.text || ''}`);
            } else if (change.type === 'added') {
              outputParts.push(`+ ${change.text || ''}`);
            }
            // Skip 'context' (unchanged) parts
          }
          output = outputParts.join('\n') || 'No differences found';
        }
      } else if (granularity === 'char') {
        diff = diffChars(old, new_);
        if (!diff || !Array.isArray(diff)) {
          throw new Error('Failed to generate character diff');
        }
        // For large char diffs, show summary
        if (diff.length > 50000) {
          const removed = diff.filter(c => c && c.type === 'removed').length;
          const added = diff.filter(c => c && c.type === 'added').length;
          output = `Large diff detected:\n- ${removed} characters removed\n+ ${added} characters added\n\nCharacter-level diff is limited for performance. Use word or line-level diff for large texts.`;
        } else {
          // Render char-based diff (only show changes)
          const outputParts = [];
          for (const change of diff) {
            if (!change) continue;
            if (change.type === 'removed') {
              outputParts.push(`- ${change.char || ''}`);
            } else if (change.type === 'added') {
              outputParts.push(`+ ${change.char || ''}`);
            }
            // Skip 'context' (unchanged) parts
          }
          output = outputParts.join('\n') || 'No differences found';
        }
      }
      
      diffOutput.textContent = output || 'No differences found';
      diffOutput.className = output ? '' : 'ok';
    
      // Create highlighted versions for textareas (only for smaller texts)
      // Use the actual textarea values to match exactly
      const oldActual = oldText.value;
      const newActual = newText.value;
      
      // Skip highlighting for very large texts to avoid performance issues
      const highlightThreshold = granularity === 'char' ? 50000 : granularity === 'word' ? 200000 : 1000000;
      const oldActualLength = oldActual ? oldActual.length : 0;
      const newActualLength = newActual ? newActual.length : 0;
      const shouldHighlight = Math.max(oldActualLength, newActualLength) <= highlightThreshold;
      
      if (shouldHighlight && oldActual !== undefined && newActual !== undefined) {
        // Create diff from actual values (not normalized) for accurate highlighting
        const oldForHighlight = ignoreWhitespaceCheck.checked ? (oldActual.replace(/\s+/g, ' ').trim() || '') : (oldActual || '');
        const newForHighlight = ignoreWhitespaceCheck.checked ? (newActual.replace(/\s+/g, ' ').trim() || '') : (newActual || '');
        
        if (granularity === 'word' || granularity === 'char') {
          // For word/char granularity, use the same diff for both
          const highlightDiff = granularity === 'word' ? diffWords(oldForHighlight, newForHighlight) : diffChars(oldForHighlight, newForHighlight);
          
          if (!highlightDiff || !Array.isArray(highlightDiff)) {
            // Skip highlighting if diff failed
            if (oldTextHighlight) oldTextHighlight.innerHTML = '';
            if (newTextHighlight) newTextHighlight.innerHTML = '';
          } else {
            // Build highlighted version matching the actual old text
            let oldHighlight = '';
            let oldPos = 0;
            highlightDiff.forEach(change => {
              if (!change) return;
              if (change.type === 'removed') {
                const text = change.text || change.char || '';
                oldHighlight += `<span class="diff-removed">${escapeHtml(text)}</span>`;
                oldPos += text.length;
              } else if (change.type === 'context') {
                const text = change.text || change.char || '';
                oldHighlight += escapeHtml(text);
                oldPos += text.length;
              }
              // Skip 'added' in old text view
            });
            // Fill remaining text if any
            const oldForHighlightLength = oldForHighlight ? oldForHighlight.length : 0;
            if (oldPos < oldForHighlightLength) {
              oldHighlight += escapeHtml(oldForHighlight.substring(oldPos));
            }
            if (oldTextHighlight) {
              oldTextHighlight.innerHTML = oldHighlight;
            }
            
            // Build highlighted version matching the actual new text
            let newHighlight = '';
            let newPos = 0;
            highlightDiff.forEach(change => {
              if (!change) return;
              if (change.type === 'added') {
                const text = change.text || change.char || '';
                newHighlight += `<span class="diff-added">${escapeHtml(text)}</span>`;
                newPos += text.length;
              } else if (change.type === 'context') {
                const text = change.text || change.char || '';
                newHighlight += escapeHtml(text);
                newPos += text.length;
              }
              // Skip 'removed' in new text view
            });
            // Fill remaining text if any
            const newForHighlightLength = newForHighlight ? newForHighlight.length : 0;
            if (newPos < newForHighlightLength) {
              newHighlight += escapeHtml(newForHighlight.substring(newPos));
            }
            if (newTextHighlight) {
              newTextHighlight.innerHTML = newHighlight;
            }
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
          }
        }
    } else {
      // For large texts, clear highlights to save memory
      if (oldTextHighlight) oldTextHighlight.innerHTML = '';
      if (newTextHighlight) newTextHighlight.innerHTML = '';
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
      
      compareBtn.disabled = false;
      compareBtn.textContent = 'Compare';
      toast('Comparison complete', 'success');
    } catch (e) {
      diffOutput.textContent = `Error: ${e.message}`;
      diffOutput.className = 'error';
      toast(`Error: ${e.message}`, 'error');
      // Clear highlights on error
      if (oldTextHighlight) oldTextHighlight.innerHTML = '';
      if (newTextHighlight) newTextHighlight.innerHTML = '';
      compareBtn.disabled = false;
      compareBtn.textContent = 'Compare';
    }
  });
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

