// Phoneme Tokenizer for TTS Models
// Converts text to phonemes using CMU Pronouncing Dictionary

// CMU Pronouncing Dictionary (subset - common words)
// Full dictionary would be too large, so we use a subset and fallback rules
const CMU_DICT = {
  'hello': ['HH', 'AH', 'L', 'OW'],
  'world': ['W', 'ER', 'L', 'D'],
  'the': ['DH', 'AH'],
  'a': ['AH'],
  'an': ['AE', 'N'],
  'and': ['AE', 'N', 'D'],
  'to': ['T', 'UW'],
  'of': ['AH', 'V'],
  'in': ['IH', 'N'],
  'is': ['IH', 'Z'],
  'it': ['IH', 'T'],
  'that': ['DH', 'AE', 'T'],
  'for': ['F', 'AO', 'R'],
  'with': ['W', 'IH', 'DH'],
  'on': ['AA', 'N'],
  'as': ['AE', 'Z'],
  'be': ['B', 'IY'],
  'by': ['B', 'AY'],
  'this': ['DH', 'IH', 'S'],
  'from': ['F', 'R', 'AH', 'M'],
  'they': ['DH', 'EY'],
  'have': ['HH', 'AE', 'V'],
  'had': ['HH', 'AE', 'D'],
  'has': ['HH', 'AE', 'Z'],
  'was': ['W', 'AA', 'Z'],
  'were': ['W', 'ER'],
  'are': ['AA', 'R'],
  'been': ['B', 'IH', 'N'],
  'being': ['B', 'IY', 'IH', 'NG'],
  'do': ['D', 'UW'],
  'does': ['D', 'AH', 'Z'],
  'did': ['D', 'IH', 'D'],
  'will': ['W', 'IH', 'L'],
  'would': ['W', 'UH', 'D'],
  'could': ['K', 'UH', 'D'],
  'should': ['SH', 'UH', 'D'],
  'can': ['K', 'AE', 'N'],
  'may': ['M', 'EY'],
  'might': ['M', 'AY', 'T'],
  'must': ['M', 'AH', 'S', 'T'],
  'shall': ['SH', 'AE', 'L'],
  'what': ['W', 'AH', 'T'],
  'when': ['W', 'EH', 'N'],
  'where': ['W', 'EH', 'R'],
  'who': ['HH', 'UW'],
  'why': ['W', 'AY'],
  'how': ['HH', 'AW'],
  'which': ['W', 'IH', 'CH'],
  'there': ['DH', 'EH', 'R'],
  'their': ['DH', 'EH', 'R'],
  'them': ['DH', 'EH', 'M'],
  'then': ['DH', 'EH', 'N'],
  'than': ['DH', 'AE', 'N'],
  'these': ['DH', 'IY', 'Z'],
  'those': ['DH', 'OW', 'Z'],
  'time': ['T', 'AY', 'M'],
  'year': ['Y', 'IH', 'R'],
  'people': ['P', 'IY', 'P', 'AH', 'L'],
  'way': ['W', 'EY'],
  'day': ['D', 'EY'],
  'man': ['M', 'AE', 'N'],
  'thing': ['TH', 'IH', 'NG'],
  'woman': ['W', 'UH', 'M', 'AH', 'N'],
  'life': ['L', 'AY', 'F'],
  'child': ['CH', 'AY', 'L', 'D'],
  'work': ['W', 'ER', 'K'],
  'government': ['G', 'AH', 'V', 'ER', 'N', 'M', 'EH', 'N', 'T'],
  'number': ['N', 'AH', 'M', 'B', 'ER'],
  'group': ['G', 'R', 'UW', 'P'],
  'problem': ['P', 'R', 'AA', 'B', 'L', 'AH', 'M'],
  'fact': ['F', 'AE', 'K', 'T'],
  'water': ['W', 'AO', 'T', 'ER'],
  'part': ['P', 'AA', 'R', 'T'],
  'place': ['P', 'L', 'EY', 'S'],
  'case': ['K', 'EY', 'S'],
  'point': ['P', 'OY', 'N', 'T'],
  'company': ['K', 'AH', 'M', 'P', 'AH', 'N', 'IY'],
  'number': ['N', 'AH', 'M', 'B', 'ER'],
  'question': ['K', 'W', 'EH', 'S', 'CH', 'AH', 'N'],
  'right': ['R', 'AY', 'T'],
  'study': ['S', 'T', 'AH', 'D', 'IY'],
  'book': ['B', 'UH', 'K'],
  'eye': ['AY'],
  'job': ['JH', 'AA', 'B'],
  'word': ['W', 'ER', 'D'],
  'business': ['B', 'IH', 'Z', 'N', 'AH', 'S'],
  'issue': ['IH', 'SH', 'UW'],
  'side': ['S', 'AY', 'D'],
  'kind': ['K', 'AY', 'N', 'D'],
  'head': ['HH', 'EH', 'D'],
  'house': ['HH', 'AW', 'S'],
  'service': ['S', 'ER', 'V', 'IH', 'S'],
  'friend': ['F', 'R', 'EH', 'N', 'D'],
  'father': ['F', 'AA', 'DH', 'ER'],
  'power': ['P', 'AW', 'ER'],
  'hour': ['AW', 'ER'],
  'game': ['G', 'EY', 'M'],
  'line': ['L', 'AY', 'N'],
  'end': ['EH', 'N', 'D'],
  'member': ['M', 'EH', 'M', 'B', 'ER'],
  'law': ['L', 'AO'],
  'car': ['K', 'AA', 'R'],
  'city': ['S', 'IH', 'T', 'IY'],
  'community': ['K', 'AH', 'M', 'Y', 'UW', 'N', 'AH', 'T', 'IY'],
  'name': ['N', 'EY', 'M'],
  'president': ['P', 'R', 'EH', 'Z', 'IH', 'D', 'AH', 'N', 'T'],
  'team': ['T', 'IY', 'M'],
  'minute': ['M', 'IH', 'N', 'AH', 'T'],
  'idea': ['AY', 'D', 'IY', 'AH'],
  'kid': ['K', 'IH', 'D'],
  'body': ['B', 'AA', 'D', 'IY'],
  'information': ['IH', 'N', 'F', 'ER', 'M', 'EY', 'SH', 'AH', 'N'],
  'back': ['B', 'AE', 'K'],
  'parent': ['P', 'EH', 'R', 'AH', 'N', 'T'],
  'face': ['F', 'EY', 'S'],
  'others': ['AH', 'DH', 'ER', 'Z'],
  'level': ['L', 'EH', 'V', 'AH', 'L'],
  'office': ['AO', 'F', 'IH', 'S'],
  'door': ['D', 'AO', 'R'],
  'health': ['HH', 'EH', 'L', 'TH'],
  'person': ['P', 'ER', 'S', 'AH', 'N'],
  'art': ['AA', 'R', 'T'],
  'war': ['W', 'AO', 'R'],
  'history': ['HH', 'IH', 'S', 'T', 'ER', 'IY'],
  'party': ['P', 'AA', 'R', 'T', 'IY'],
  'result': ['R', 'IH', 'Z', 'AH', 'L', 'T'],
  'change': ['CH', 'EY', 'N', 'JH'],
  'morning': ['M', 'AO', 'R', 'N', 'IH', 'NG'],
  'reason': ['R', 'IY', 'Z', 'AH', 'N'],
  'research': ['R', 'IH', 'S', 'ER', 'CH'],
  'girl': ['G', 'ER', 'L'],
  'guy': ['G', 'AY'],
  'moment': ['M', 'OW', 'M', 'AH', 'N', 'T'],
  'air': ['EH', 'R'],
  'teacher': ['T', 'IY', 'CH', 'ER'],
  'force': ['F', 'AO', 'R', 'S'],
  'education': ['EH', 'JH', 'AH', 'K', 'EY', 'SH', 'AH', 'N'],
  // Expand with more common words
  'good': ['G', 'UH', 'D'],
  'bad': ['B', 'AE', 'D'],
  'new': ['N', 'UW'],
  'old': ['OW', 'L', 'D'],
  'first': ['F', 'ER', 'S', 'T'],
  'last': ['L', 'AE', 'S', 'T'],
  'long': ['L', 'AO', 'NG'],
  'great': ['G', 'R', 'EY', 'T'],
  'little': ['L', 'IH', 'T', 'AH', 'L'],
  'own': ['OW', 'N'],
  'other': ['AH', 'DH', 'ER'],
  'new': ['N', 'UW'],
  'old': ['OW', 'L', 'D'],
  'right': ['R', 'AY', 'T'],
  'big': ['B', 'IH', 'G'],
  'high': ['HH', 'AY'],
  'small': ['S', 'M', 'AO', 'L'],
  'large': ['L', 'AA', 'R', 'JH'],
  'next': ['N', 'EH', 'K', 'S', 'T'],
  'early': ['ER', 'L', 'IY'],
  'young': ['Y', 'AH', 'NG'],
  'important': ['IH', 'M', 'P', 'AO', 'R', 'T', 'AH', 'N', 'T'],
  'public': ['P', 'AH', 'B', 'L', 'IH', 'K'],
  'different': ['D', 'IH', 'F', 'ER', 'AH', 'N', 'T'],
  'able': ['EY', 'B', 'AH', 'L'],
  'human': ['HH', 'Y', 'UW', 'M', 'AH', 'N'],
  'local': ['L', 'OW', 'K', 'AH', 'L'],
  'late': ['L', 'EY', 'T'],
  'hard': ['HH', 'AA', 'R', 'D'],
  'major': ['M', 'EY', 'JH', 'ER'],
  'better': ['B', 'EH', 'T', 'ER'],
  'economic': ['IY', 'K', 'AH', 'N', 'AA', 'M', 'IH', 'K'],
  'strong': ['S', 'T', 'R', 'AO', 'NG'],
  'possible': ['P', 'AA', 'S', 'AH', 'B', 'AH', 'L'],
  'whole': ['HH', 'OW', 'L'],
  'free': ['F', 'R', 'IY'],
  'military': ['M', 'IH', 'L', 'AH', 'T', 'ER', 'IY'],
  'true': ['T', 'R', 'UW'],
  'federal': ['F', 'EH', 'D', 'ER', 'AH', 'L'],
  'international': ['IH', 'N', 'T', 'ER', 'N', 'AE', 'SH', 'AH', 'N', 'AH', 'L'],
  'full': ['F', 'UH', 'L'],
  'special': ['S', 'P', 'EH', 'SH', 'AH', 'L'],
  'easy': ['IY', 'Z', 'IY'],
  'clear': ['K', 'L', 'IH', 'R'],
  'recent': ['R', 'IY', 'S', 'AH', 'N', 'T'],
  'certain': ['S', 'ER', 'T', 'AH', 'N'],
  'personal': ['P', 'ER', 'S', 'AH', 'N', 'AH', 'L'],
  'open': ['OW', 'P', 'AH', 'N'],
  'red': ['R', 'EH', 'D'],
  'difficult': ['D', 'IH', 'F', 'IH', 'K', 'AH', 'L', 'T'],
  'available': ['AH', 'V', 'EY', 'L', 'AH', 'B', 'AH', 'L'],
  'likely': ['L', 'AY', 'K', 'L', 'IY'],
  'national': ['N', 'AE', 'SH', 'AH', 'N', 'AH', 'L'],
  'political': ['P', 'AH', 'L', 'IH', 'T', 'IH', 'K', 'AH', 'L'],
  'real': ['R', 'IY', 'L'],
  'best': ['B', 'EH', 'S', 'T'],
  'right': ['R', 'AY', 'T'],
  'social': ['S', 'OW', 'SH', 'AH', 'L'],
  'important': ['IH', 'M', 'P', 'AO', 'R', 'T', 'AH', 'N', 'T'],
  'both': ['B', 'OW', 'TH'],
  'public': ['P', 'AH', 'B', 'L', 'IH', 'K'],
  'sure': ['SH', 'UH', 'R'],
  'able': ['EY', 'B', 'AH', 'L'],
  'human': ['HH', 'Y', 'UW', 'M', 'AH', 'N'],
  'local': ['L', 'OW', 'K', 'AH', 'L'],
  'late': ['L', 'EY', 'T'],
  'hard': ['HH', 'AA', 'R', 'D'],
  'major': ['M', 'EY', 'JH', 'ER'],
  'better': ['B', 'EH', 'T', 'ER'],
  'economic': ['IY', 'K', 'AH', 'N', 'AA', 'M', 'IH', 'K'],
  'strong': ['S', 'T', 'R', 'AO', 'NG'],
  'possible': ['P', 'AA', 'S', 'AH', 'B', 'AH', 'L'],
  'whole': ['HH', 'OW', 'L'],
  'free': ['F', 'R', 'IY'],
  'military': ['M', 'IH', 'L', 'AH', 'T', 'ER', 'IY'],
  'true': ['T', 'R', 'UW'],
  'federal': ['F', 'EH', 'D', 'ER', 'AH', 'L'],
  'international': ['IH', 'N', 'T', 'ER', 'N', 'AE', 'SH', 'AH', 'N', 'AH', 'L'],
  'full': ['F', 'UH', 'L'],
  'special': ['S', 'P', 'EH', 'SH', 'AH', 'L'],
  'easy': ['IY', 'Z', 'IY'],
  'clear': ['K', 'L', 'IH', 'R'],
  'recent': ['R', 'IY', 'S', 'AH', 'N', 'T'],
  'certain': ['S', 'ER', 'T', 'AH', 'N'],
  'personal': ['P', 'ER', 'S', 'AH', 'N', 'AH', 'L'],
  'open': ['OW', 'P', 'AH', 'N'],
  'red': ['R', 'EH', 'D'],
  'difficult': ['D', 'IH', 'F', 'IH', 'K', 'AH', 'L', 'T'],
  'available': ['AH', 'V', 'EY', 'L', 'AH', 'B', 'AH', 'L'],
  'likely': ['L', 'AY', 'K', 'L', 'IY'],
  'national': ['N', 'AE', 'SH', 'AH', 'N', 'AH', 'L'],
  'political': ['P', 'AH', 'L', 'IH', 'T', 'IH', 'K', 'AH', 'L'],
  'real': ['R', 'IY', 'L'],
  'best': ['B', 'EH', 'S', 'T'],
  'right': ['R', 'AY', 'T'],
  'social': ['S', 'OW', 'SH', 'AH', 'L'],
  'only': ['OW', 'N', 'L', 'IY'],
  'just': ['JH', 'AH', 'S', 'T'],
  'now': ['N', 'AW'],
  'here': ['HH', 'IH', 'R'],
  'very': ['V', 'EH', 'R', 'IY'],
  'even': ['IY', 'V', 'AH', 'N'],
  'back': ['B', 'AE', 'K'],
  'there': ['DH', 'EH', 'R'],
  'down': ['D', 'AW', 'N'],
  'still': ['S', 'T', 'IH', 'L'],
  'in': ['IH', 'N'],
  'as': ['AE', 'Z'],
  'well': ['W', 'EH', 'L'],
  'too': ['T', 'UW'],
  'when': ['W', 'EH', 'N'],
  'never': ['N', 'EH', 'V', 'ER'],
  'always': ['AO', 'L', 'W', 'EY', 'Z'],
  'often': ['AO', 'F', 'AH', 'N'],
  'usually': ['Y', 'UW', 'ZH', 'AH', 'L', 'IY'],
  'sometimes': ['S', 'AH', 'M', 'T', 'AY', 'M', 'Z'],
  'today': ['T', 'AH', 'D', 'EY'],
  'tomorrow': ['T', 'AH', 'M', 'AO', 'R', 'OW'],
  'yesterday': ['Y', 'EH', 'S', 'T', 'ER', 'D', 'EY'],
  'now': ['N', 'AW'],
  'then': ['DH', 'EH', 'N'],
  'today': ['T', 'AH', 'D', 'EY'],
  'tomorrow': ['T', 'AH', 'M', 'AO', 'R', 'OW'],
  'yesterday': ['Y', 'EH', 'S', 'T', 'ER', 'D', 'EY'],
  'now': ['N', 'AW'],
  'then': ['DH', 'EH', 'N']
};

// ARPAbet phoneme to token ID mapping
// This is a simplified mapping - actual models may use different token IDs
const PHONEME_TO_TOKEN = {
  // Vowels
  'AA': 0, 'AE': 1, 'AH': 2, 'AO': 3, 'AW': 4, 'AY': 5,
  'EH': 6, 'ER': 7, 'EY': 8, 'IH': 9, 'IY': 10, 'OW': 11, 'OY': 12, 'UH': 13, 'UW': 14,
  // Consonants
  'B': 15, 'CH': 16, 'D': 17, 'DH': 18, 'F': 19, 'G': 20, 'HH': 21, 'JH': 22,
  'K': 23, 'L': 24, 'M': 25, 'N': 26, 'NG': 27, 'P': 28, 'R': 29, 'S': 30,
  'SH': 31, 'T': 32, 'TH': 33, 'V': 34, 'W': 35, 'Y': 36, 'Z': 37, 'ZH': 38,
  // Special tokens
  ' ': 39, // Space
  '.': 40, // Period
  ',': 41, // Comma
  '?': 42, // Question mark
  '!': 43  // Exclamation
};

// Reverse mapping for debugging
const TOKEN_TO_PHONEME = {};
for (const [phoneme, token] of Object.entries(PHONEME_TO_TOKEN)) {
  TOKEN_TO_PHONEME[token] = phoneme;
}

// Improved G2P conversion using rules for unknown words
function simpleG2P(word) {
  word = word.toLowerCase().trim();
  
  // Remove common suffixes for lookup
  const baseWord = word.replace(/(ed|ing|er|est|ly|s|es|tion|sion)$/, '');
  
  // Check dictionary first (try original and base word)
  if (CMU_DICT[word]) {
    return CMU_DICT[word];
  }
  if (baseWord !== word && CMU_DICT[baseWord]) {
    const basePhonemes = CMU_DICT[baseWord];
    // Simple suffix handling
    if (word.endsWith('ed')) {
      return [...basePhonemes, 'D'];
    } else if (word.endsWith('ing')) {
      return [...basePhonemes, 'IH', 'NG'];
    } else if (word.endsWith('er')) {
      return [...basePhonemes, 'ER'];
    } else if (word.endsWith('ly')) {
      return [...basePhonemes, 'L', 'IY'];
    } else if (word.endsWith('s') || word.endsWith('es')) {
      return [...basePhonemes, 'Z'];
    }
    return basePhonemes;
  }
  
  // Improved rule-based fallback
  const phonemes = [];
  let i = 0;
  const len = word.length;
  
  // Handle common prefixes
  if (word.startsWith('un')) {
    phonemes.push('AH', 'N');
    i = 2;
  } else if (word.startsWith('re')) {
    phonemes.push('R', 'IY');
    i = 2;
  } else if (word.startsWith('pre')) {
    phonemes.push('P', 'R', 'IY');
    i = 3;
  } else if (word.startsWith('dis')) {
    phonemes.push('D', 'IH', 'S');
    i = 3;
  }
  
  while (i < len) {
    const char = word[i];
    const nextChar = i + 1 < len ? word[i + 1] : '';
    const prevChar = i > 0 ? word[i - 1] : '';
    const twoChars = char + nextChar;
    const threeChars = i + 2 < len ? word.substring(i, i + 3) : '';
    
    // Handle common trigraphs first
    if (threeChars === 'tch') {
      phonemes.push('CH');
      i += 3;
      continue;
    } else if (threeChars === 'sch') {
      phonemes.push('SH');
      i += 3;
      continue;
    }
    
    // Handle digraphs
    if (i + 1 < len) {
      if (twoChars === 'th') {
        phonemes.push('TH');
        i += 2;
        continue;
      } else if (twoChars === 'ch') {
        phonemes.push('CH');
        i += 2;
        continue;
      } else if (twoChars === 'sh') {
        phonemes.push('SH');
        i += 2;
        continue;
      } else if (twoChars === 'ph') {
        phonemes.push('F');
        i += 2;
        continue;
      } else if (twoChars === 'gh' && (i === 0 || prevChar === 'i' || prevChar === 'e')) {
        // Silent or 'F' sound
        if (nextChar === 't') {
          phonemes.push('F');
          i += 2;
          continue;
        }
        i += 2;
        continue; // Silent
      } else if (twoChars === 'ng') {
        phonemes.push('NG');
        i += 2;
        continue;
      } else if (twoChars === 'ck') {
        phonemes.push('K');
        i += 2;
        continue;
      } else if (twoChars === 'qu') {
        phonemes.push('K', 'W');
        i += 2;
        continue;
      } else if (twoChars === 'wh') {
        phonemes.push('W');
        i += 2;
        continue;
      } else if (twoChars === 'wr') {
        phonemes.push('R');
        i += 2;
        continue;
      } else if (twoChars === 'kn') {
        phonemes.push('N');
        i += 2;
        continue;
      } else if (twoChars === 'ps') {
        phonemes.push('S');
        i += 2;
        continue;
      }
    }
    
    // Vowel handling with context
    if (char === 'a') {
      if (nextChar === 'i' || nextChar === 'y') {
        phonemes.push('EY');
        i += 2;
        continue;
      } else if (nextChar === 'u') {
        phonemes.push('AO');
        i += 2;
        continue;
      } else if (nextChar === 'w') {
        phonemes.push('AO');
        i += 2;
        continue;
      } else if (i + 1 < len && word[i + 1] === 'r' && (i + 2 >= len || !/[aeiou]/.test(word[i + 2]))) {
        phonemes.push('AA', 'R');
        i += 2;
        continue;
      } else {
        phonemes.push('AE');
      }
    } else if (char === 'e') {
      if (nextChar === 'e') {
        phonemes.push('IY');
        i += 2;
        continue;
      } else if (nextChar === 'a') {
        phonemes.push('IY');
        i += 2;
        continue;
      } else if (i === len - 1) {
        // Silent e at end
        i++;
        continue;
      } else {
        phonemes.push('EH');
      }
    } else if (char === 'i') {
      if (nextChar === 'e' && i + 2 < len && word[i + 2] === 'd') {
        phonemes.push('IY');
        i += 2;
        continue;
      } else if (nextChar === 'g' && i + 2 < len && word[i + 2] === 'h') {
        phonemes.push('AY');
        i += 3;
        continue;
      } else {
        phonemes.push('IH');
      }
    } else if (char === 'o') {
      if (nextChar === 'o') {
        phonemes.push('UW');
        i += 2;
        continue;
      } else if (nextChar === 'u') {
        phonemes.push('AW');
        i += 2;
        continue;
      } else if (nextChar === 'w') {
        phonemes.push('OW');
        i += 2;
        continue;
      } else if (nextChar === 'i') {
        phonemes.push('OY');
        i += 2;
        continue;
      } else {
        phonemes.push('AO');
      }
    } else if (char === 'u') {
      if (nextChar === 'e') {
        phonemes.push('UW');
        i += 2;
        continue;
      } else {
        phonemes.push('UH');
      }
    } else if (char === 'y') {
      if (i === 0 || prevChar === ' ') {
        phonemes.push('Y');
      } else if (i === len - 1) {
        phonemes.push('IY');
      } else {
        phonemes.push('IH');
      }
    } else if (char === 'c') {
      if (nextChar === 'e' || nextChar === 'i' || nextChar === 'y') {
        phonemes.push('S');
      } else {
        phonemes.push('K');
      }
    } else if (char === 'g') {
      if (nextChar === 'e' || nextChar === 'i' || nextChar === 'y') {
        phonemes.push('JH');
      } else {
        phonemes.push('G');
      }
    } else if (char === 's') {
      if (nextChar === 'h') {
        // Already handled
      } else if (i === 0 && nextChar && /[aeiou]/.test(nextChar)) {
        phonemes.push('S');
      } else {
        phonemes.push('S');
      }
    } else if (char === 'x') {
      if (i === 0) {
        phonemes.push('Z');
      } else {
        phonemes.push('K', 'S');
      }
    } else if (char === 'b' && i > 0 && prevChar === 'm' && i === len - 1) {
      // Silent b after m
      i++;
      continue;
    } else if (char === 'h' && prevChar && /[csptg]/.test(prevChar)) {
      // Silent h after certain consonants
      i++;
      continue;
    } else {
      // Consonants
      const consonantMap = {
        'b': 'B', 'd': 'D', 'f': 'F', 'g': 'G', 'h': 'HH',
        'j': 'JH', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N',
        'p': 'P', 'q': 'K', 'r': 'R', 's': 'S', 't': 'T',
        'v': 'V', 'w': 'W', 'z': 'Z'
      };
      if (consonantMap[char]) {
        phonemes.push(consonantMap[char]);
      }
    }
    i++;
  }
  
  return phonemes.length > 0 ? phonemes : ['AH']; // Fallback to schwa
}

// Convert text to phoneme sequence
export function textToPhonemes(text) {
  // Normalize text - more aggressive normalization
  text = text.toLowerCase()
    .replace(/[^\w\s.,!?;:'-]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Split into words and punctuation
  const tokens = text.match(/[\w']+|[.,!?;:]/g) || [];
  const phonemes = [];
  
  for (const token of tokens) {
    if (/[.,!?;:]/.test(token)) {
      // Punctuation
      phonemes.push(token);
    } else {
      // Word - remove apostrophes for lookup
      const cleanToken = token.replace(/'/g, '');
      const wordPhonemes = simpleG2P(cleanToken);
      phonemes.push(...wordPhonemes);
      phonemes.push(' '); // Space between words
    }
  }
  
  // Remove trailing space
  if (phonemes[phonemes.length - 1] === ' ') {
    phonemes.pop();
  }
  
  return phonemes;
}

// Convert phonemes to token IDs
export function phonemesToTokens(phonemes, modelConfig = null) {
  const tokens = [];
  
  for (const phoneme of phonemes) {
    if (PHONEME_TO_TOKEN.hasOwnProperty(phoneme)) {
      tokens.push(PHONEME_TO_TOKEN[phoneme]);
    } else {
      // Unknown phoneme - use a default based on character
      if (phoneme.length === 1 && /[aeiou]/.test(phoneme.toLowerCase())) {
        tokens.push(2); // 'AH' (schwa) for vowels
      } else {
        tokens.push(2); // Default to schwa
      }
    }
  }
  
  // Model-specific token range mapping
  if (modelConfig) {
    // Check if this is a VITS model (LJSpeech/VCTK)
    const isVITS = modelConfig.inputNames && 
                   (modelConfig.inputNames.includes('text') || 
                    modelConfig.inputNames.includes('sids'));
    
    if (isVITS) {
      // VITS models expect tokens in range [-77, 76]
      const MIN_TOKEN = -77;
      const MAX_TOKEN = 76;
      const TOKEN_RANGE = MAX_TOKEN - MIN_TOKEN + 1; // 154
      
      // Map our token IDs to the model's expected range
      // Use a more intelligent mapping to preserve phoneme distinctions
      return tokens.map(tokenId => {
        // Preserve relative ordering while mapping to target range
        const mapped = tokenId % TOKEN_RANGE;
        return MIN_TOKEN + mapped;
      });
    } else {
      // For Kokoro, tokens might be used differently
      // Keep original token IDs but ensure they're in a reasonable range
      return tokens.map(tokenId => {
        // Kokoro might accept a wider range, but clamp to reasonable values
        return Math.max(0, Math.min(255, tokenId));
      });
    }
  }
  
  return tokens;
}

// Main function: convert text directly to token IDs
export function textToTokens(text, modelConfig = null) {
  const phonemes = textToPhonemes(text);
  return phonemesToTokens(phonemes, modelConfig);
}

// For debugging
export function getPhonemeSequence(text) {
  return textToPhonemes(text);
}

