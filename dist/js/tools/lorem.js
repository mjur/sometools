import { on, copy, qs, toast } from '/js/ui.js';

const typeSelect = qs('#type');
const countInput = qs('#count');
const startWithLoremCheck = qs('#start-with-lorem');
const generateBtn = qs('#generate');
const output = qs('#output');
const copyBtn = qs('#copy');
const clearBtn = qs('#clear');

const loremWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

function getRandomWord() {
  return loremWords[Math.floor(Math.random() * loremWords.length)];
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSentence() {
  const wordCount = Math.floor(Math.random() * 10) + 8; // 8-17 words
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(getRandomWord());
  }
  return capitalizeFirst(words.join(' ')) + '.';
}

function generateParagraph() {
  const sentenceCount = Math.floor(Math.random() * 3) + 3; // 3-5 sentences
  const sentences = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence());
  }
  return sentences.join(' ');
}

function generateLorem() {
  const type = typeSelect.value;
  const count = parseInt(countInput.value) || 1;
  const startWithLorem = startWithLoremCheck.checked;
  
  let result = '';
  
  if (type === 'words') {
    const words = [];
    if (startWithLorem && count >= 5) {
      words.push('Lorem', 'ipsum', 'dolor', 'sit', 'amet');
      for (let i = 5; i < count; i++) {
        words.push(getRandomWord());
      }
    } else {
      for (let i = 0; i < count; i++) {
        words.push(getRandomWord());
      }
    }
    result = words.join(' ');
  } else if (type === 'sentences') {
    const sentences = [];
    if (startWithLorem && count >= 1) {
      sentences.push('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
      for (let i = 1; i < count; i++) {
        sentences.push(generateSentence());
      }
    } else {
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence());
      }
    }
    result = sentences.join(' ');
  } else if (type === 'paragraphs') {
    const paragraphs = [];
    if (startWithLorem && count >= 1) {
      paragraphs.push('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
      for (let i = 1; i < count; i++) {
        paragraphs.push(generateParagraph());
      }
    } else {
      for (let i = 0; i < count; i++) {
        paragraphs.push(generateParagraph());
      }
    }
    result = paragraphs.join('\n\n');
  }
  
  output.value = result;
}

on(generateBtn, 'click', generateLorem);
on(copyBtn, 'click', async () => {
  await copy(output.value);
  toast('Copied to clipboard');
});
on(clearBtn, 'click', () => {
  output.value = '';
});

// Generate on Enter key in count input
on(countInput, 'keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generateLorem();
  }
});

// Initial generation
generateLorem();

