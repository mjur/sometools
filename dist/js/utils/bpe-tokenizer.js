// BPE Tokenizer for RoBERTa
// Implements proper Byte Pair Encoding based on tokenizer.json structure

/**
 * BPE Tokenizer class for RoBERTa models
 */
export class BPETokenizer {
  constructor(vocab, merges, config = {}) {
    this.vocab = vocab;
    this.merges = merges;
    this.config = config;
    
    // Build merge lookup for faster access
    this.mergeRanks = new Map();
    merges.forEach((merge, index) => {
      if (Array.isArray(merge)) {
        const key = merge.join(' ');
        this.mergeRanks.set(key, index);
      } else if (typeof merge === 'string') {
        this.mergeRanks.set(merge, index);
      }
    });
    
    // Special tokens
    this.clsToken = '<s>';
    this.sepToken = '</s>';
    this.padToken = '<pad>';
    this.unkToken = '<unk>';
    
    this.clsTokenId = vocab[this.clsToken] || 0;
    this.sepTokenId = vocab[this.sepToken] || 2;
    this.padTokenId = vocab[this.padToken] || 1;
    this.unkTokenId = vocab[this.unkToken] || 3;
    
    // Create reverse vocab for debugging
    this.reverseVocab = {};
    for (const [token, id] of Object.entries(vocab)) {
      this.reverseVocab[id] = token;
    }
  }
  
  /**
   * Encode text to token IDs
   */
  encode(text, maxLength = 512) {
    const tokens = this.tokenize(text);
    
    // Truncate if needed
    if (tokens.length > maxLength) {
      tokens.splice(maxLength - 1);
      tokens.push(this.sepTokenId);
    }
    
    // Pad to maxLength
    while (tokens.length < maxLength) {
      tokens.push(this.padTokenId);
    }
    
    return tokens.slice(0, maxLength);
  }
  
  /**
   * Tokenize text into token IDs
   * RoBERTa's ByteLevel pre-tokenizer adds Ġ prefix to non-first words
   */
  tokenize(text) {
    // Add CLS token
    const tokens = [this.clsTokenId];
    
    // Normalize text - RoBERTa doesn't lowercase by default
    let normalizedText = text.trim();
    
    // RoBERTa uses ByteLevel pre-tokenizer which:
    // 1. Splits on whitespace
    // 2. Adds Ġ prefix to non-first words
    // 3. Converts to bytes
    // 4. Applies BPE
    
    // Split text into words
    const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isFirstWord = (i === 0);
      
      // Tokenize word with BPE (Ġ prefix will be added in wordToByteTokens if needed)
      const wordTokens = this.tokenizeWord(word, isFirstWord);
      tokens.push(...wordTokens);
    }
    
    // Add SEP token
    tokens.push(this.sepTokenId);
    
    return tokens;
  }
  
  /**
   * Split text into words (handling spaces for Ġ prefix)
   */
  splitText(text) {
    // Split by whitespace, but keep track of word boundaries
    const words = [];
    let currentWord = '';
    let isFirstWord = true;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (/\s/.test(char)) {
        if (currentWord) {
          words.push({ text: currentWord, isFirst: isFirstWord });
          currentWord = '';
          isFirstWord = false;
        }
      } else {
        currentWord += char;
      }
    }
    
    if (currentWord) {
      words.push({ text: currentWord, isFirst: isFirstWord });
    }
    
    return words;
  }
  
  /**
   * Tokenize a single word using BPE
   */
  tokenizeWord(word, isFirstWord = false) {
    // Try whole word first (with Ġ prefix if not first word)
    const prefix = isFirstWord ? '' : 'Ġ';
    const wordWithPrefix = prefix + word;
    
    if (this.vocab[wordWithPrefix] !== undefined) {
      return [this.vocab[wordWithPrefix]];
    }
    
    // Try without prefix
    if (this.vocab[word] !== undefined) {
      return [this.vocab[word]];
    }
    
    // Apply BPE: start with byte-level tokens (Ġ prefix already added if needed)
    let bpeTokens = this.wordToByteTokens(word, isFirstWord);
    
    // Debug logging for problematic words
    const debugWord = word.length > 5 && (word.includes('NASDAQ') || word.includes('Dealers') || word.includes('Automated'));
    if (debugWord) {
      console.log(`\n=== Tokenizing word: "${word}", isFirstWord: ${isFirstWord} ===`);
      console.log('Initial byte tokens:', bpeTokens);
      console.log('Vocab check for first token:', this.vocab[bpeTokens[0]] !== undefined ? '✓' : '✗');
    }
    
    // Apply BPE merges iteratively - this will merge tokens including Ġ-prefixed ones
    const beforeMerge = [...bpeTokens];
    bpeTokens = this.applyBPE(bpeTokens, debugWord);
    
    // Debug logging
    if (debugWord) {
      console.log('After BPE merge:', bpeTokens);
      console.log('Tokens before:', beforeMerge.length, 'after:', bpeTokens.length);
      console.log('Reduction:', beforeMerge.length - bpeTokens.length, 'merges');
    }
    
    // Convert tokens to IDs - tokens already have Ġ prefix if needed
    const tokenIds = bpeTokens.map(token => {
      if (this.vocab[token] !== undefined) {
        return this.vocab[token];
      }
      return this.unkTokenId;
    });
    
    return tokenIds.length > 0 ? tokenIds : [this.unkTokenId];
  }
  
  /**
   * Convert word to byte-level tokens
   * RoBERTa uses byte-level BPE: text -> UTF-8 bytes -> BPE tokens
   * Each byte (0-255) is represented as a single character in the vocab
   * 
   * IMPORTANT: For non-first words, we need to add Ġ prefix to the FIRST byte
   * BEFORE applying BPE, because the vocab has entries like "ĠN", "ĠA", etc.
   */
  wordToByteTokens(word, isFirstWord) {
    const tokens = [];
    const encoder = new TextEncoder();
    const bytes = encoder.encode(word);
    
    // RoBERTa's byte-level BPE: each byte becomes a token
    // The vocab contains all 256 byte values as single characters
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const byteChar = String.fromCharCode(byte);
      
      // For first byte of non-first word, add Ġ prefix
      // This is critical - RoBERTa vocab has "ĠN", "ĠA", etc. for word-starting bytes
      if (i === 0 && !isFirstWord) {
        const withPrefix = 'Ġ' + byteChar;
        if (this.vocab[withPrefix] !== undefined) {
          tokens.push(withPrefix);
        } else if (this.vocab[byteChar] !== undefined) {
          tokens.push(byteChar);
        } else {
          tokens.push(this.unkToken);
        }
      } else {
        // Regular byte token
        if (this.vocab[byteChar] !== undefined) {
          tokens.push(byteChar);
        } else {
          // Fallback to UNK if byte not in vocab (shouldn't happen for 0-255)
          tokens.push(this.unkToken);
        }
      }
    }
    
    return tokens;
  }
  
  /**
   * Apply BPE merges to tokens
   */
  applyBPE(tokens, debug = false) {
    if (tokens.length === 0) return tokens;
    if (tokens.length === 1) return tokens;
    
    // Apply merges iteratively until no more can be applied
    let changed = true;
    let iterations = 0;
    let totalMerges = 0;
    const maxIterations = 1000; // Safety limit
    
    if (debug) {
      console.log('Starting BPE with', tokens.length, 'tokens');
      console.log('First 5 tokens:', tokens.slice(0, 5));
      console.log('First 5 merges:', this.merges.slice(0, 5));
    }
    
    while (changed && iterations < maxIterations) {
      changed = false;
      
      // Try each merge in order (priority order)
      for (let mergeIndex = 0; mergeIndex < this.merges.length; mergeIndex++) {
        const merge = this.merges[mergeIndex];
        if (!merge) continue;
        
        let token1, token2;
        if (Array.isArray(merge)) {
          [token1, token2] = merge;
        } else if (typeof merge === 'string') {
          const parts = merge.trim().split(/\s+/);
          if (parts.length !== 2) continue;
          [token1, token2] = parts;
        } else {
          continue;
        }
        
        // Find leftmost occurrence of this pair
        for (let i = 0; i < tokens.length - 1; i++) {
          if (tokens[i] === token1 && tokens[i + 1] === token2) {
            // Merge the pair
            const merged = token1 + token2;
            
            // Check if merged token exists in vocab
            if (this.vocab[merged] !== undefined) {
              if (debug && totalMerges < 5) {
                console.log(`Merge #${totalMerges + 1}: "${token1}" + "${token2}" → "${merged}" (at position ${i})`);
              }
              tokens.splice(i, 2, merged);
              changed = true;
              totalMerges++;
              break; // Restart from first merge
            }
          }
        }
        
        if (changed) break; // Restart from first merge
      }
      
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn('BPE merging reached max iterations');
    }
    
    if (debug) {
      console.log(`BPE complete: ${totalMerges} merges in ${iterations} iterations`);
    }
    
    return tokens;
  }
}

/**
 * Load tokenizer from tokenizer.json
 */
export async function loadTokenizerFromJSON(tokenizerUrl) {
  try {
    const response = await fetch(tokenizerUrl);
    if (!response.ok) {
      throw new Error(`Failed to load tokenizer.json: ${response.status}`);
    }
    
    const tokenizerData = await response.json();
    
    // Extract vocab and merges from tokenizer.json
    let vocab = null;
    let merges = null;
    
    if (tokenizerData.model) {
      if (tokenizerData.model.vocab) {
        vocab = tokenizerData.model.vocab;
      }
      
      if (tokenizerData.model.merges) {
        // Merges can be array of strings or array of arrays
        merges = tokenizerData.model.merges.map(m => {
          if (Array.isArray(m)) {
            return m;
          } else if (typeof m === 'string') {
            return m.trim().split(/\s+/);
          }
          return null;
        }).filter(m => m !== null);
      }
    }
    
    if (!vocab || !merges) {
      throw new Error('Vocab or merges not found in tokenizer.json');
    }
    
    // Create tokenizer instance
    const tokenizer = new BPETokenizer(vocab, merges, {
      addPrefixSpace: tokenizerData.pre_tokenizer?.add_prefix_space || false,
      modelMaxLength: tokenizerData.model_max_length || 512
    });
    
    return tokenizer;
  } catch (error) {
    console.error('Failed to load tokenizer from JSON:', error);
    throw error;
  }
}

