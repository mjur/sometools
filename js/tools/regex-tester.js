import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, qs, qsa } from '/js/ui.js';
import { testRegex, parseFlags } from '/js/utils/regex.js';

const patternInput = qs('#pattern');
const sampleText = qs('#sample-text');
const matchesOutput = qs('#matches');
const groupsOutput = qs('#groups');
const testBtn = qs('#test');
const clearBtn = qs('#clear');
const flagCheckboxes = qsa('input[type="checkbox"][id^="flag-"]');

// Load state
const storageKey = 'regex-tester-state';
const state = loadStateWithStorage(storageKey);
if (state?.pattern) patternInput.value = state.pattern;
if (state?.sampleText) sampleText.value = state.sampleText;
if (state?.flags) {
  flagCheckboxes.forEach(cb => {
    cb.checked = state.flags.includes(cb.value);
  });
}

function getFlags() {
  return flagCheckboxes
    .filter(cb => cb.checked)
    .map(cb => cb.value)
    .join('');
}

function test() {
  const pattern = patternInput.value.trim();
  const text = sampleText.value;
  const flags = getFlags();
  
  if (!pattern) {
    matchesOutput.textContent = 'Enter a regex pattern';
    matchesOutput.className = '';
    groupsOutput.innerHTML = '';
    return;
  }
  
  const result = testRegex(pattern, flags, text);
  
  if (!result.valid) {
    matchesOutput.textContent = `Invalid regex: ${result.error}`;
    matchesOutput.className = 'error';
    groupsOutput.innerHTML = '';
    return;
  }
  
  if (result.matches.length === 0) {
    matchesOutput.textContent = 'No matches found';
    matchesOutput.className = '';
    groupsOutput.innerHTML = '';
  } else {
    let output = `Found ${result.matches.length} match(es):\n\n`;
    result.matches.forEach((match, idx) => {
      output += `Match ${idx + 1}:\n`;
      output += `  Text: "${match.match}"\n`;
      output += `  Index: ${match.index}\n`;
      if (match.groups && match.groups.length > 0) {
        output += `  Groups: ${match.groups.length}\n`;
      }
      output += '\n';
    });
    matchesOutput.textContent = output;
    matchesOutput.className = 'ok';
    
    // Display groups in a table
    const hasGroups = result.matches.some(m => m.groups && m.groups.length > 0);
    if (hasGroups) {
      let groupsHTML = '<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;"><thead><tr><th style="padding: 0.5rem; border: 1px solid var(--border);">Match</th><th style="padding: 0.5rem; border: 1px solid var(--border);">Group</th><th style="padding: 0.5rem; border: 1px solid var(--border);">Name</th><th style="padding: 0.5rem; border: 1px solid var(--border);">Value</th></tr></thead><tbody>';
      
      result.matches.forEach((match, matchIdx) => {
        if (match.groups && match.groups.length > 0) {
          match.groups.forEach((group) => {
            const groupLabel = group.name ? `${group.index} (${group.name})` : group.index;
            groupsHTML += `<tr><td style="padding: 0.5rem; border: 1px solid var(--border);">${matchIdx + 1}</td><td style="padding: 0.5rem; border: 1px solid var(--border);">${group.index}</td><td style="padding: 0.5rem; border: 1px solid var(--border); font-family: monospace; color: var(--muted);">${group.name ? escapeHtml(group.name) : '—'}</td><td style="padding: 0.5rem; border: 1px solid var(--border); font-family: monospace;">${escapeHtml(group.value !== undefined && group.value !== null ? group.value : '(empty)')}</td></tr>`;
          });
        }
      });
      
      groupsHTML += '</tbody></table>';
      groupsOutput.innerHTML = groupsHTML;
    } else {
      groupsOutput.innerHTML = '<p style="color: var(--muted);">No capture groups</p>';
    }
  }
  
  // Save state
  saveStateWithStorage({
    pattern,
    sampleText: text,
    flags
  }, storageKey);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Buttons
on(testBtn, 'click', test);
on(clearBtn, 'click', () => {
  patternInput.value = '';
  sampleText.value = '';
  matchesOutput.textContent = '';
  matchesOutput.className = '';
  groupsOutput.innerHTML = '';
  patternInput.focus();
});

// Auto-test on input (debounced)
let debounceTimer;
function debouncedTest() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(test, 300);
}

on(patternInput, 'input', debouncedTest);
on(sampleText, 'input', debouncedTest);
flagCheckboxes.forEach(cb => {
  on(cb, 'change', debouncedTest);
});

// Keyboard shortcuts
on(document, 'keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    test();
  }
});

// Initial test if there's content
if (patternInput.value && sampleText.value) {
  test();
}

