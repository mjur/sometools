import { on, qs } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const statisticsContainer = qs('#statistics');
const clearBtn = qs('#clear');

// Load state
const storageKey = 'text-statistics-state';
const state = loadStateWithStorage(storageKey);
if (state?.text) input.value = state.text;

function calculateStatistics(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || (text.trim() ? 1 : 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const lines = text.split('\n').length;
  const avgWordsPerSentence = sentences > 0 ? (words.length / sentences).toFixed(1) : 0;
  
  // Reading time (average 200 words per minute)
  const readingTimeMinutes = Math.ceil(words.length / 200);
  const readingTime = readingTimeMinutes === 1 ? '1 minute' : `${readingTimeMinutes} minutes`;
  
  // Keyword frequency (top 10)
  const wordFreq = {};
  words.forEach(word => {
    const normalized = word.toLowerCase().replace(/[^\w]/g, '');
    if (normalized.length > 3) { // Only count words longer than 3 characters
      wordFreq[normalized] = (wordFreq[normalized] || 0) + 1;
    }
  });
  
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => `${word} (${count})`)
    .join(', ') || 'None';
  
  return {
    words: words.length,
    characters,
    charactersNoSpaces,
    paragraphs,
    sentences,
    lines,
    avgWordsPerSentence,
    readingTime,
    topKeywords,
  };
}

function createStatCard(label, value) {
  const card = document.createElement('div');
  card.style.cssText = `
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
    background-color: var(--bg-elev);
  `;
  
  const labelEl = document.createElement('div');
  labelEl.textContent = label;
  labelEl.style.cssText = `
    font-size: 0.875rem;
    color: var(--muted);
    margin-bottom: 0.5rem;
  `;
  
  const valueEl = document.createElement('div');
  valueEl.textContent = value;
  valueEl.style.cssText = `
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text);
  `;
  
  card.appendChild(labelEl);
  card.appendChild(valueEl);
  return card;
}

function updateStatistics() {
  const text = input.value;
  const stats = calculateStatistics(text);
  
  statisticsContainer.innerHTML = '';
  
  statisticsContainer.appendChild(createStatCard('Words', stats.words.toLocaleString()));
  statisticsContainer.appendChild(createStatCard('Characters', stats.characters.toLocaleString()));
  statisticsContainer.appendChild(createStatCard('Characters (no spaces)', stats.charactersNoSpaces.toLocaleString()));
  statisticsContainer.appendChild(createStatCard('Paragraphs', stats.paragraphs));
  statisticsContainer.appendChild(createStatCard('Sentences', stats.sentences));
  statisticsContainer.appendChild(createStatCard('Lines', stats.lines));
  statisticsContainer.appendChild(createStatCard('Avg. Words/Sentence', stats.avgWordsPerSentence));
  statisticsContainer.appendChild(createStatCard('Reading Time', stats.readingTime));
  
  // Top keywords (larger card)
  const keywordsCard = document.createElement('div');
  keywordsCard.style.cssText = `
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
    background-color: var(--bg-elev);
    grid-column: 1 / -1;
  `;
  
  const keywordsLabel = document.createElement('div');
  keywordsLabel.textContent = 'Top Keywords';
  keywordsLabel.style.cssText = `
    font-size: 0.875rem;
    color: var(--muted);
    margin-bottom: 0.5rem;
  `;
  
  const keywordsValue = document.createElement('div');
  keywordsValue.textContent = stats.topKeywords || 'None';
  keywordsValue.style.cssText = `
    font-size: 0.875rem;
    color: var(--text);
    word-break: break-word;
  `;
  
  keywordsCard.appendChild(keywordsLabel);
  keywordsCard.appendChild(keywordsValue);
  statisticsContainer.appendChild(keywordsCard);
  
  saveStateWithStorage(storageKey, { text });
}

on(input, 'input', updateStatistics);
on(clearBtn, 'click', () => {
  input.value = '';
  updateStatistics();
  saveStateWithStorage(storageKey, { text: '' });
});

// Initial update
updateStatistics();

