import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';
import { toast, on, qs } from '/js/ui.js';

let originalText = '';
let checkedText = '';
let errors = [];
let fixedText = '';

const textInput = qs('#text-input');
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const fileInfo = qs('#file-info');
const checkBtn = qs('#check');
const clearBtn = qs('#clear');
const output = qs('#output');
const fixIssuesBtn = qs('#fix-issues');
const downloadBtn = qs('#download');
const errorsSummary = qs('#errors-summary');

// Load state
const storageKey = 'grammar-check-state';
const state = loadStateWithStorage(storageKey);
if (state?.text) textInput.value = state.text;

// Dictionary for spell checking
let dictionary = new Set();
let dictionaryLoaded = false;

// Load comprehensive dictionary from a word list
async function loadDictionary() {
  if (dictionaryLoaded) return dictionary;
  
  try {
    toast('Loading dictionary...', 'info');
    
    // Try to load from a comprehensive word list
    // Using a common English word list from a CDN
    try {
      const response = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
      if (response.ok) {
        const text = await response.text();
        const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        words.forEach(word => dictionary.add(word));
        console.log('Dictionary loaded with', dictionary.size, 'words from GitHub');
        dictionaryLoaded = true;
        toast('Dictionary loaded!', 'success');
        return dictionary;
      }
    } catch (fetchError) {
      console.warn('Failed to load dictionary from GitHub, using fallback:', fetchError);
    }
    
    // Fallback: Load a comprehensive word list from another source
    try {
      // Try loading from jsDelivr CDN with a word list
      const response = await fetch('https://cdn.jsdelivr.net/gh/dwyl/english-words@master/words_alpha.txt');
      if (response.ok) {
        const text = await response.text();
        const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        words.forEach(word => dictionary.add(word));
        console.log('Dictionary loaded with', dictionary.size, 'words from jsDelivr');
        dictionaryLoaded = true;
        toast('Dictionary loaded!', 'success');
        return dictionary;
      }
    } catch (fetchError) {
      console.warn('Failed to load dictionary from jsDelivr, using local fallback:', fetchError);
    }
    
    // Final fallback: Use a comprehensive local word list
    const comprehensiveWords = [
      // Common words
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
      'most', 'us', 'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'does', 'did', 'doing', 'done', 'can', 'could', 'may', 'might', 'must', 'shall',
      'should', 'will', 'would', 'am', 'going', 'goes', 'went', 'gone', 'come', 'comes', 'came', 'coming', 'see', 'sees', 'saw', 'seeing', 'seen',
      'make', 'makes', 'made', 'making', 'take', 'takes', 'took', 'taking', 'taken', 'give', 'gives', 'gave', 'giving', 'given',
      'get', 'gets', 'got', 'getting', 'gotten', 'know', 'knows', 'knew', 'knowing', 'known', 'think', 'thinks', 'thought', 'thinking',
      'see', 'sees', 'saw', 'seeing', 'seen', 'come', 'comes', 'came', 'coming', 'want', 'wants', 'wanted', 'wanting',
      'use', 'uses', 'used', 'using', 'find', 'finds', 'found', 'finding', 'give', 'gives', 'gave', 'giving', 'given',
      'tell', 'tells', 'told', 'telling', 'work', 'works', 'worked', 'working', 'call', 'calls', 'called', 'calling',
      'try', 'tries', 'tried', 'trying', 'ask', 'asks', 'asked', 'asking', 'need', 'needs', 'needed', 'needing',
      'feel', 'feels', 'felt', 'feeling', 'become', 'becomes', 'became', 'becoming', 'leave', 'leaves', 'left', 'leaving',
      'put', 'puts', 'putting', 'mean', 'means', 'meant', 'meaning', 'keep', 'keeps', 'kept', 'keeping',
      'let', 'lets', 'letting', 'begin', 'begins', 'began', 'beginning', 'begun', 'seem', 'seems', 'seemed', 'seeming',
      'help', 'helps', 'helped', 'helping', 'talk', 'talks', 'talked', 'talking', 'turn', 'turns', 'turned', 'turning',
      'start', 'starts', 'started', 'starting', 'show', 'shows', 'showed', 'showing', 'shown', 'hear', 'hears', 'heard', 'hearing',
      'play', 'plays', 'played', 'playing', 'run', 'runs', 'ran', 'running', 'move', 'moves', 'moved', 'moving',
      'like', 'likes', 'liked', 'liking', 'live', 'lives', 'lived', 'living', 'believe', 'believes', 'believed', 'believing',
      'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happened', 'happening', 'write', 'writes', 'wrote', 'writing', 'written',
      'sit', 'sits', 'sat', 'sitting', 'stand', 'stands', 'stood', 'standing', 'lose', 'loses', 'lost', 'losing',
      'pay', 'pays', 'paid', 'paying', 'meet', 'meets', 'met', 'meeting', 'include', 'includes', 'included', 'including',
      'continue', 'continues', 'continued', 'continuing', 'set', 'sets', 'setting', 'learn', 'learns', 'learned', 'learning', 'learnt',
      'change', 'changes', 'changed', 'changing', 'lead', 'leads', 'led', 'leading', 'understand', 'understands', 'understood', 'understanding',
      'watch', 'watches', 'watched', 'watching', 'follow', 'follows', 'followed', 'following', 'stop', 'stops', 'stopped', 'stopping',
      'create', 'creates', 'created', 'creating', 'speak', 'speaks', 'spoke', 'speaking', 'spoken', 'read', 'reads', 'reading',
      'allow', 'allows', 'allowed', 'allowing', 'add', 'adds', 'added', 'adding', 'spend', 'spends', 'spent', 'spending',
      'grow', 'grows', 'grew', 'growing', 'grown', 'open', 'opens', 'opened', 'opening', 'walk', 'walks', 'walked', 'walking',
      'win', 'wins', 'won', 'winning', 'offer', 'offers', 'offered', 'offering', 'remember', 'remembers', 'remembered', 'remembering',
      'love', 'loves', 'loved', 'loving', 'consider', 'considers', 'considered', 'considering', 'appear', 'appears', 'appeared', 'appearing',
      'buy', 'buys', 'bought', 'buying', 'wait', 'waits', 'waited', 'waiting', 'serve', 'serves', 'served', 'serving',
      'die', 'dies', 'died', 'dying', 'send', 'sends', 'sent', 'sending', 'build', 'builds', 'built', 'building',
      'stay', 'stays', 'stayed', 'staying', 'fall', 'falls', 'fell', 'falling', 'fallen', 'cut', 'cuts', 'cutting',
      'reach', 'reaches', 'reached', 'reaching', 'kill', 'kills', 'killed', 'killing', 'raise', 'raises', 'raised', 'raising'
    ];
    
    // Add all words and their common variations
    comprehensiveWords.forEach(word => {
      dictionary.add(word.toLowerCase());
      // Add plural forms for nouns
      if (!word.endsWith('s')) {
        dictionary.add((word + 's').toLowerCase());
      }
      // Add -ing forms
      if (!word.endsWith('ing')) {
        const base = word.replace(/e$/, '');
        dictionary.add((base + 'ing').toLowerCase());
      }
      // Add -ed forms
      if (!word.endsWith('ed')) {
        const base = word.replace(/e$/, '');
        dictionary.add((base + 'ed').toLowerCase());
      }
    });
    
    // Add numbers
    for (let i = 0; i < 10000; i++) {
      dictionary.add(i.toString());
    }
    
    console.log('Dictionary loaded with', dictionary.size, 'words (fallback)');
    dictionaryLoaded = true;
    toast('Dictionary loaded!', 'success');
  } catch (error) {
    console.error('Failed to load dictionary:', error);
    toast('Failed to load dictionary, using basic word list', 'error');
    dictionaryLoaded = true; // Mark as loaded even if failed to prevent infinite retries
  }
  
  return dictionary;
}

// Check if a word is spelled correctly
function isSpelledCorrectly(word) {
  if (!word || word.length === 0) return true;
  
  // Remove punctuation and check
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
  if (cleanWord.length === 0) return true;
  
  // Check if it's a number
  if (/^\d+$/.test(cleanWord)) return true;
  
  // Check dictionary
  return dictionary.has(cleanWord);
}

// Get suggestions for a misspelled word (simple implementation)
function getSuggestions(word) {
  if (!word || word.length === 0) return [];
  
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
  const suggestions = [];
  
  // Simple edit distance suggestions (very basic)
  // In a real implementation, you'd use a proper spell checker library
  for (const dictWord of dictionary) {
    if (dictWord.length >= cleanWord.length - 2 && dictWord.length <= cleanWord.length + 2) {
      const distance = levenshteinDistance(cleanWord, dictWord);
      if (distance <= 2 && distance > 0) {
        suggestions.push(dictWord);
        if (suggestions.length >= 5) break;
      }
    }
  }
  
  return suggestions.slice(0, 5);
}

// Simple Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Check spelling in text
async function checkSpelling() {
  const text = textInput.value.trim();
  
  if (!text) {
    toast('Please enter text to check', 'error');
    return;
  }
  
  try {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';
    output.innerHTML = '<p class="placeholder" style="color: var(--muted);">Checking spelling...</p>';
    errorsSummary.textContent = '';
    fixIssuesBtn.disabled = true;
    downloadBtn.disabled = true;
    errors = [];
    originalText = text;
    
    // Load dictionary if needed
    await loadDictionary();
    
    // Extract words from text
    const wordRegex = /\b\w+\b/g;
    const words = text.match(wordRegex) || [];
    const wordPositions = [];
    
    // Find positions of each word
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
      wordPositions.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Check each word
    for (const pos of wordPositions) {
      if (!isSpelledCorrectly(pos.word)) {
        const suggestions = getSuggestions(pos.word);
        errors.push({
          text: pos.word,
          start: pos.start,
          end: pos.end,
          type: 'spelling',
          suggestions: suggestions,
          correction: suggestions.length > 0 ? suggestions[0] : pos.word
        });
      }
    }
    
    // Highlight errors in text
    displayHighlightedText(text, errors);
    
    // Show errors summary
    if (errors.length > 0) {
      errorsSummary.innerHTML = `
        <strong>Found ${errors.length} spelling error(s):</strong><br>
        ${errors.map(e => `• "${e.text}"${e.suggestions.length > 0 ? ` (suggestions: ${e.suggestions.slice(0, 3).join(', ')})` : ''}`).join('<br>')}
      `;
      fixIssuesBtn.disabled = false;
    } else {
      errorsSummary.innerHTML = '<strong style="color: var(--ok);">✓ No spelling errors found!</strong>';
      fixIssuesBtn.disabled = true;
    }
    
    checkedText = text;
    downloadBtn.disabled = false;
    
    saveStateWithStorage({
      text
    }, storageKey);
    
    toast('Spell check completed!', 'success');
    
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to check spelling: ${errorMsg}`, 'error');
    output.innerHTML = `<p class="error">Error: ${errorMsg}</p>`;
    console.error('Spell check error:', e);
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check Spelling';
  }
}

// Display text with highlighted errors
function displayHighlightedText(text, errors) {
  if (errors.length === 0) {
    output.innerHTML = `<p style="color: var(--ok);">✓ No spelling errors found in the text!</p>`;
    return;
  }
  
  // Sort errors by position (reverse order for safe replacement)
  const sortedErrors = [...errors].sort((a, b) => b.start - a.start);
  
  let highlighted = text;
  
  // Replace errors with highlighted spans (working backwards to preserve indices)
  for (const error of sortedErrors) {
    const before = highlighted.substring(0, error.start);
    const errorText = highlighted.substring(error.start, error.end);
    const after = highlighted.substring(error.end);
    
    const suggestionsText = error.suggestions.length > 0 
      ? `Suggestions: ${error.suggestions.join(', ')}`
      : 'No suggestions available';
    const tooltip = `${error.type}: ${suggestionsText}`;
    const escapedTooltip = tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const highlight = `<span class="error-highlight" title="${escapedTooltip}">${errorText}<span class="error-tooltip">${escapedTooltip}</span></span>`;
    
    highlighted = before + highlight + after;
  }
  
  output.innerHTML = highlighted;
}

// Fix all issues
function fixAllIssues() {
  if (errors.length === 0 || !checkedText) {
    toast('No errors to fix', 'info');
    return;
  }
  
  try {
    fixIssuesBtn.disabled = true;
    fixIssuesBtn.textContent = 'Fixing...';
    
    // Sort errors by position (reverse order for safe replacement)
    const sortedErrors = [...errors]
      .filter(e => e.correction && e.correction !== e.text)
      .sort((a, b) => b.start - a.start);
    
    let corrected = checkedText;
    
    // Apply corrections from end to start to preserve indices
    for (const error of sortedErrors) {
      const before = corrected.substring(0, error.start);
      const after = corrected.substring(error.end);
      corrected = before + error.correction + after;
    }
    
    fixedText = corrected;
    
    // Update textarea with fixed text
    textInput.value = fixedText;
    
    // Show the fixed text in output
    const escapedText = fixedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    output.innerHTML = `<p style="color: var(--ok); margin-bottom: 1rem;">✓ Text corrected! The corrected text is now in the input field.</p><div class="highlighted-text">${escapedText}</div>`;
    
    // Update errors summary
    errorsSummary.innerHTML = '<strong style="color: var(--ok);">✓ All issues have been fixed!</strong>';
    
    toast('All issues fixed!', 'success');
    
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Failed to fix issues: ${errorMsg}`, 'error');
    console.error('Fix error:', e);
  } finally {
    fixIssuesBtn.disabled = false;
    fixIssuesBtn.textContent = 'Fix All Issues';
  }
}

// Download fixed text
function downloadFixedText() {
  const textToDownload = fixedText || checkedText || textInput.value;
  
  if (!textToDownload) {
    toast('No text to download', 'error');
    return;
  }
  
  const blob = new Blob([textToDownload], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `corrected-text-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Text downloaded!', 'success');
}

// Handle file upload
function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    textInput.value = content;
    fileInfo.textContent = `Loaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    toast('File loaded!', 'success');
  };
  reader.onerror = () => {
    toast('Failed to read file', 'error');
  };
  reader.readAsText(file);
}

// Clear
function clearAll() {
  textInput.value = '';
  output.innerHTML = '<p class="placeholder" style="color: var(--muted);">Checked text with highlighted errors will appear here...</p>';
  errorsSummary.textContent = '';
  fixIssuesBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInfo.textContent = '';
  errors = [];
  originalText = '';
  checkedText = '';
  fixedText = '';
}

// Event listeners
on(checkBtn, 'click', checkSpelling);
on(clearBtn, 'click', clearAll);
on(fixIssuesBtn, 'click', fixAllIssues);
on(downloadBtn, 'click', downloadFixedText);

// File upload handlers
on(fileUploadArea, 'click', () => fileInput.click());
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileUpload(file);
  }
});

// Drag and drop
on(fileUploadArea, 'dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

on(fileUploadArea, 'dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

on(fileUploadArea, 'drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
    handleFileUpload(file);
  } else {
    toast('Please upload a text file', 'error');
  }
});

// Load dictionary on page load
loadDictionary().catch(console.error);
