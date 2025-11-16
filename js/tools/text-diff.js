import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, copy, qs } from '/js/ui.js';
import { diffLines, diffWords, diffChars, generateUnifiedDiff } from '/js/utils/diff.js';

const oldText = qs('#old-text');
const newText = qs('#new-text');
const diffOutput = qs('#diff-output');
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

function compare() {
  const old = normalizeText(oldText.value, ignoreWhitespaceCheck.checked);
  const new_ = normalizeText(newText.value, ignoreWhitespaceCheck.checked);
  
  if (!old && !new_) {
    diffOutput.textContent = 'Enter texts to compare';
    diffOutput.className = '';
    return;
  }
  
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

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    compare();
  }
});

