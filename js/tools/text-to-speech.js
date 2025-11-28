// Text-to-Speech tool with AI models
import { qs, on } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';
import { textToTokens, textToPhonemes } from '/js/utils/phoneme-tokenizer.js';

// Try to load kokoro-js for Kokoro WebGPU model
let kokoroJS = null;
let kokoroModel = null;

let audioBlob = null;
let ort = null;
let ttsSession = null;

// TTS Model configurations
// Using Hugging Face CDN for direct model access
// Note: These models require proper tokenization which may not be fully available
// Output quality may vary without the original tokenizers
const TTS_MODEL_CONFIGS = {
  kokoro: {
    key: 'tts-kokoro-v1',
    url: 'https://huggingface.co/NeuML/kokoro-base-onnx/resolve/main/model.onnx',
    name: 'Kokoro Base TTS (ONNX)',
    description: 'High-quality TTS with multiple speakers and accents',
    requiresSetup: false,
    inputNames: ['tokens', 'style', 'speed'], // Kokoro expects these inputs
    outputName: 'audio',
    defaultStyle: 0, // Default speaker/style ID
    defaultSpeed: 1.0,
    enabled: true,
    type: 'onnx'
  },
  kokoroWebGPU: {
    key: 'tts-kokoro-webgpu',
    modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    name: 'Kokoro WebGPU TTS',
    description: 'Kokoro TTS optimized for WebGPU with better performance and quality',
    requiresSetup: false,
    enabled: true,
    type: 'transformers',
    voices: ['af_heart', 'af_sky', 'af_bella', 'am_adam', 'am_michael', 'am_sky', 'ar_sky', 'cn_xiaoxiao', 'cn_yunxi', 'de_katja', 'es_elvira', 'fr_denise', 'hi_madhur', 'it_elsa', 'ja_aoi', 'ja_akari', 'ko_injong', 'pl_agnieszka', 'pt_raquel', 'ru_svetlana', 'tr_emel', 'uk_ukrainian_tts', 'vi_banmai', 'zh_fengge', 'zh_xiaoyi']
  },
  ljspeech: {
    key: 'tts-ljspeech-v1',
    url: 'https://huggingface.co/NeuML/ljspeech-vits-onnx/resolve/main/model.onnx',
    name: 'LJSpeech VITS TTS',
    description: 'English TTS trained on LJSpeech dataset',
    requiresSetup: false,
    inputNames: ['text'],
    outputName: 'audio',
    enabled: true
  },
  vctk: {
    key: 'tts-vctk-v1',
    url: 'https://huggingface.co/NeuML/vctk-vits-onnx/resolve/main/model.onnx',
    name: 'VCTK VITS TTS',
    description: 'Multiple English speakers with various accents',
    requiresSetup: false,
    inputNames: ['text', 'sids'], // text and speaker IDs
    outputName: 'audio',
    defaultSpeakerId: 0, // Default speaker (0-based index)
    enabled: true
  }
};

// Default model
let currentModelConfig = TTS_MODEL_CONFIGS.kokoroWebGPU;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const textInput = qs('#text-input');
  const rateSlider = qs('#rate-slider');
  const pitchSlider = qs('#pitch-slider');
  const volumeSlider = qs('#volume-slider');
  const rateValue = qs('#rate-value');
  const pitchValue = qs('#pitch-value');
  const volumeValue = qs('#volume-value');
  const generateBtn = qs('#generate-btn');
  const downloadBtn = qs('#download-btn');
  const clearBtn = qs('#clear-btn');
  const status = qs('#status');
  const audioContainer = qs('#audio-container');
  const audioPlayer = qs('#audio-player');
  
  // Get voice selector elements for Kokoro WebGPU
  const voiceSelectKokoro = qs('#voice-select-kokoro');
  const voiceSelectGroup = qs('#voice-select-group');

  // Initialize ONNX Runtime
  async function initONNX() {
    if (ort) return ort;
    try {
      ort = await loadONNXRuntime();
      return ort;
    } catch (error) {
      console.error('Failed to load ONNX Runtime:', error);
      throw error;
    }
  }

  // Get model selector (created in HTML)
  const modelSelect = qs('#model-select');
  
  // Update current model when selection changes
  if (modelSelect) {
    on(modelSelect, 'change', (e) => {
      const selectedKey = e.target.value;
      const config = TTS_MODEL_CONFIGS[selectedKey];
      if (!config) {
        status.textContent = 'Invalid model selection';
        status.className = 'status-message error';
        return;
      }
      currentModelConfig = config;
      ttsSession = null; // Reset ONNX session
      kokoroModel = null; // Reset kokoro-js model
      
      // Show/hide voice selector for Kokoro WebGPU
      if (voiceSelectGroup) {
        if (config.type === 'transformers') {
          voiceSelectGroup.style.display = 'block';
          // Voices will be populated when model loads
          if (voiceSelectKokoro) {
            voiceSelectKokoro.innerHTML = '<option value="">Loading voices...</option>';
          }
          // Load the model and voices immediately
          loadTTSModel().then(() => {
            // Voices will be populated in loadTTSModel
          }).catch(err => {
            console.error('Failed to load model:', err);
            if (voiceSelectKokoro) {
              voiceSelectKokoro.innerHTML = '<option value="">Failed to load voices</option>';
            }
          });
        } else {
          voiceSelectGroup.style.display = 'none';
        }
      }
      
      status.textContent = `Switched to ${currentModelConfig.name}`;
      status.className = 'status-message info';
      setTimeout(() => {
        if (status.textContent.includes('Switched to')) {
          status.textContent = '';
        }
      }, 2000);
    });
  }
  
  // Initialize voice selector visibility based on default model
  if (voiceSelectGroup) {
    if (currentModelConfig.type === 'transformers') {
      voiceSelectGroup.style.display = 'block';
      // Load voices for default model
      if (voiceSelectKokoro) {
        voiceSelectKokoro.innerHTML = '<option value="">Loading voices...</option>';
      }
      // Load the model and voices on page load
      loadTTSModel().then(() => {
        // Voices will be populated in loadTTSModel
      }).catch(err => {
        console.error('Failed to load default model:', err);
        if (voiceSelectKokoro) {
          voiceSelectKokoro.innerHTML = '<option value="">Failed to load voices</option>';
        }
      });
    } else {
      voiceSelectGroup.style.display = 'none';
    }
  }

  // Load kokoro-js library
  async function loadKokoroJS() {
    if (kokoroJS) return kokoroJS;
    
    try {
      // Try ES module import from various CDNs
      const cdnUrls = [
        'https://esm.sh/kokoro-js@latest',
        'https://cdn.jsdelivr.net/npm/kokoro-js@latest/+esm',
        'https://unpkg.com/kokoro-js@latest?module'
      ];
      
      for (const url of cdnUrls) {
        try {
          const module = await import(url);
          // kokoro-js exports KokoroTTS
          if (module.KokoroTTS) {
            kokoroJS = module.KokoroTTS;
            return kokoroJS;
          } else if (module.default) {
            kokoroJS = module.default;
            return kokoroJS;
          } else {
            kokoroJS = module;
            return kokoroJS;
          }
        } catch (err) {
          console.warn(`Failed to load kokoro-js from ${url}:`, err);
          continue;
        }
      }
      
      throw new Error('Failed to load kokoro-js from all CDN sources. The library may not be available as an ES module.');
    } catch (error) {
      console.error('Failed to load kokoro-js:', error);
      throw new Error(`kokoro-js library not available: ${error.message}. Please ensure you have internet connectivity.`);
    }
  }

  // Load TTS model
  async function loadTTSModel() {
    // Handle kokoro-js models (Kokoro WebGPU)
    if (currentModelConfig.type === 'transformers') {
      if (kokoroModel) return kokoroModel;
      
      try {
        status.textContent = `Loading ${currentModelConfig.name}...`;
        status.className = 'status-message info';
        
        const KokoroTTS = await loadKokoroJS();
        
        // Load Kokoro TTS model using kokoro-js
        // Model ID from Hugging Face
        kokoroModel = await KokoroTTS.from_pretrained(currentModelConfig.modelId, {
          dtype: 'q8', // Quantized for faster loading
          device: 'webgpu' // Use WebGPU if available, falls back to WASM
        });
        
        // Get available voices from the model
        let availableVoices = [];
        let voiceMetadata = {}; // Store voice metadata for display names
        try {
          if (kokoroModel.list_voices && typeof kokoroModel.list_voices === 'function') {
            const voicesResult = await kokoroModel.list_voices();
            console.log('Voices result from model:', voicesResult);
            
            // Handle different return formats
            if (Array.isArray(voicesResult)) {
              availableVoices = voicesResult;
            } else if (voicesResult && typeof voicesResult === 'object') {
              // If it's an object, the keys are voice IDs (e.g., 'af_heart', 'af_alloy')
              // and values are objects with metadata (name, language, gender, etc.)
              if (voicesResult.voices) {
                // If there's a nested voices property
                if (Array.isArray(voicesResult.voices)) {
                  availableVoices = voicesResult.voices;
                } else {
                  availableVoices = Object.keys(voicesResult.voices);
                  voiceMetadata = voicesResult.voices;
                }
              } else {
                // The object itself contains voice IDs as keys
                availableVoices = Object.keys(voicesResult);
                voiceMetadata = voicesResult;
              }
            }
            
            console.log('Available voices extracted:', availableVoices);
            console.log('Voice metadata:', voiceMetadata);
          } else if (kokoroModel.voices) {
            availableVoices = Array.isArray(kokoroModel.voices) ? kokoroModel.voices : Object.keys(kokoroModel.voices);
            if (!Array.isArray(kokoroModel.voices)) {
              voiceMetadata = kokoroModel.voices;
            }
          }
          
          // Update the voice selector with available voices
          if (voiceSelectKokoro) {
            if (availableVoices.length > 0) {
              voiceSelectKokoro.innerHTML = '';
              
              // Group voices by language/gender for better organization
              const groupedVoices = {};
              availableVoices.forEach(voiceId => {
                // voiceId is the key (e.g., 'af_heart')
                const voiceInfo = voiceMetadata[voiceId] || {};
                const displayName = voiceInfo.name || voiceId.substring(3).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                const prefix = voiceId.substring(0, 2); // e.g., 'af', 'am', 'bf', 'bm'
                const lang = prefix[0] === 'a' ? 'American' : prefix[0] === 'b' ? 'British' : 
                            prefix[0] === 'c' ? 'Chinese' : prefix[0] === 'd' ? 'German' :
                            prefix[0] === 'e' ? 'Spanish' : prefix[0] === 'f' ? 'French' :
                            prefix[0] === 'h' ? 'Hindi' : prefix[0] === 'i' ? 'Italian' :
                            prefix[0] === 'j' ? 'Japanese' : prefix[0] === 'k' ? 'Korean' :
                            prefix[0] === 'p' ? (prefix[1] === 't' ? 'Portuguese' : 'Polish') :
                            prefix[0] === 'r' ? 'Russian' : prefix[0] === 't' ? 'Turkish' :
                            prefix[0] === 'u' ? 'Ukrainian' : prefix[0] === 'v' ? 'Vietnamese' :
                            prefix[0] === 'z' ? 'Chinese' : 'Other';
                const gender = prefix[1] === 'f' ? 'Female' : prefix[1] === 'm' ? 'Male' : 'Other';
                const groupKey = `${lang} ${gender}`;
                
                if (!groupedVoices[groupKey]) {
                  groupedVoices[groupKey] = [];
                }
                groupedVoices[groupKey].push({ id: voiceId, name: displayName });
              });
              
              // Create optgroups for better organization
              const sortedGroups = Object.keys(groupedVoices).sort();
              sortedGroups.forEach(groupName => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = groupName;
                
                groupedVoices[groupName].forEach(voice => {
                  const option = document.createElement('option');
                  option.value = voice.id; // Use voice ID (e.g., 'af_heart')
                  option.textContent = voice.name; // Use display name (e.g., 'Heart')
                  optgroup.appendChild(option);
                });
                
                voiceSelectKokoro.appendChild(optgroup);
              });
              
              // Set default voice
              voiceSelectKokoro.value = availableVoices[0] || 'af_heart';
              console.log('Voice selector populated with', availableVoices.length, 'voices');
            } else {
              console.warn('No voices found from model, using fallback list');
              // Use fallback voices from config
              if (currentModelConfig.voices && currentModelConfig.voices.length > 0) {
                voiceSelectKokoro.innerHTML = '';
                currentModelConfig.voices.forEach(voice => {
                  const option = document.createElement('option');
                  option.value = voice;
                  option.textContent = voice.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  voiceSelectKokoro.appendChild(option);
                });
                voiceSelectKokoro.value = currentModelConfig.voices[0] || 'af_heart';
                console.log('Using fallback voices from config:', currentModelConfig.voices.length, 'voices');
              } else {
                voiceSelectKokoro.innerHTML = '<option value="">No voices available</option>';
                console.error('No fallback voices available in config');
              }
            }
          } else {
            console.warn('Voice selector element not found');
          }
        } catch (voiceError) {
          console.warn('Failed to get voices from model, using default list:', voiceError);
          // Fallback to hardcoded voices if list_voices fails
          if (voiceSelectKokoro && currentModelConfig.voices) {
            voiceSelectKokoro.innerHTML = '';
            currentModelConfig.voices.forEach(voice => {
              const option = document.createElement('option');
              option.value = voice;
              option.textContent = voice.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              voiceSelectKokoro.appendChild(option);
            });
            voiceSelectKokoro.value = currentModelConfig.voices[0] || 'af_heart';
          }
        }
        
        status.textContent = `${currentModelConfig.name} loaded successfully!`;
        status.className = 'status-message success';
        setTimeout(() => {
          if (status.textContent.includes('loaded successfully')) {
            status.textContent = '';
          }
        }, 2000);
        
        return kokoroModel;
      } catch (error) {
        console.error('Failed to load kokoro-js model:', error);
        status.textContent = `${currentModelConfig.name} failed to load: ${error.message}`;
        status.className = 'status-message error';
        return null;
      }
    }
    
    // Handle ONNX models (existing code)
    if (ttsSession && currentModelConfig.type === 'onnx') return ttsSession;
    
    try {
      await initONNX();
      
      status.textContent = `Loading ${currentModelConfig.name}...`;
      status.className = 'status-message info';
      
      // Download or get cached model from Hugging Face CDN
      const modelData = await getOrDownloadModel(
        currentModelConfig.key,
        currentModelConfig.url,
        (progress) => {
          status.textContent = `Downloading ${currentModelConfig.name}: ${Math.round(progress)}%`;
        }
      );
      
      // Create inference session
      ttsSession = await createInferenceSession(modelData, {
        executionProviders: ['wasm'] // Use WASM for compatibility
      });
      
      status.textContent = `${currentModelConfig.name} loaded successfully!`;
      status.className = 'status-message success';
      setTimeout(() => {
        if (status.textContent.includes('loaded successfully')) {
          status.textContent = '';
        }
        }, 2000);
      
      return ttsSession;
    } catch (error) {
      console.error('Failed to load TTS model:', error);
      status.textContent = `${currentModelConfig.name} not available. Using basic synthesis.`;
      status.className = 'status-message error';
      return null;
    }
  }


  // Update slider value displays
  on(rateSlider, 'input', (e) => {
    rateValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  on(pitchSlider, 'input', (e) => {
    pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  on(volumeSlider, 'input', (e) => {
    volumeValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  // Preprocess text for TTS model
  function preprocessText(text, modelConfig = null) {
    // Normalize text for TTS models
    // Most TTS models expect lowercase, normalized text
    
    // Remove extra whitespace
    text = text.trim().replace(/\s+/g, ' ');
    
    // Convert to lowercase (most TTS models expect this)
    text = text.toLowerCase();
    
    // Normalize punctuation and special characters
    // Replace common punctuation with spaces or remove
    text = text.replace(/[^\w\s']/g, ' ');
    
    // Normalize multiple spaces
    text = text.replace(/\s+/g, ' ');
    
    // Remove leading/trailing spaces
    text = text.trim();
    
    return text;
  }

  // Create a character-to-token mapping for VITS models
  // VITS models typically use a character vocabulary
  function createCharacterVocab() {
    // Common character vocabulary for English TTS models
    // Based on typical VITS model vocabularies
    const vocab = {};
    let tokenId = 0;
    
    // Space (usually token 0)
    vocab[' '] = tokenId++;
    
    // Lowercase letters a-z
    for (let i = 0; i < 26; i++) {
      vocab[String.fromCharCode(97 + i)] = tokenId++;
    }
    
    // Numbers 0-9
    for (let i = 0; i < 10; i++) {
      vocab[i.toString()] = tokenId++;
    }
    
    // Common punctuation (if needed)
    const punctuation = ["'", '-', '.', ',', '!', '?', ';', ':'];
    punctuation.forEach(p => {
      if (tokenId < 100) { // Limit vocab size
        vocab[p] = tokenId++;
      }
    });
    
    return vocab;
  }

  // Create optimized character vocabulary for VITS models
  // Based on common character vocabularies used in TTS models
  // Order matters - most common characters first
  function createVITSCharacterVocab() {
    const vocab = {};
    let id = 0;
    
    // Most common: space and lowercase letters (most TTS models prioritize these)
    vocab[' '] = id++;
    
    // Lowercase letters a-z (most common in text)
    for (let i = 0; i < 26; i++) {
      vocab[String.fromCharCode(97 + i)] = id++;
    }
    
    // Numbers 0-9 (before uppercase to keep range smaller)
    for (let i = 0; i < 10; i++) {
      vocab[i.toString()] = id++;
    }
    
    // Common punctuation (ordered by frequency)
    const punctuation = ['.', ',', "'", '-', '!', '?', ';', ':', '"'];
    punctuation.forEach(p => {
      vocab[p] = id++;
    });
    
    // Uppercase letters A-Z (less common, map after lowercase)
    for (let i = 0; i < 26; i++) {
      vocab[String.fromCharCode(65 + i)] = id++;
    }
    
    // Less common punctuation
    const rarePunctuation = ['(', ')', '[', ']', '{', '}'];
    rarePunctuation.forEach(p => {
      vocab[p] = id++;
    });
    
    return vocab;
  }
  
  // Advanced text preprocessing for TTS
  function preprocessTextForTTS(text) {
    // Step 1: Expand common abbreviations
    const abbreviations = {
      "mr.": "mister",
      "mrs.": "missus",
      "dr.": "doctor",
      "prof.": "professor",
      "vs.": "versus",
      "etc.": "etcetera",
      "e.g.": "for example",
      "i.e.": "that is",
      "a.m.": "am",
      "p.m.": "pm",
      "st.": "street",
      "ave.": "avenue",
      "blvd.": "boulevard",
      "rd.": "road",
      "inc.": "incorporated",
      "ltd.": "limited",
      "&": "and",
      "@": "at",
      "#": "number",
      "$": "dollars",
      "%": "percent"
    };
    
    let processed = text.toLowerCase();
    
    // Replace abbreviations
    for (const [abbr, expansion] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      processed = processed.replace(regex, expansion);
    }
    
    // Step 2: Expand numbers to words (simple cases)
    processed = processed.replace(/\b(\d+)\b/g, (match, num) => {
      const n = parseInt(num);
      if (n < 20) {
        const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
                       'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 
                       'seventeen', 'eighteen', 'nineteen'];
        return words[n] || num;
      }
      return num; // Keep larger numbers as digits for now
    });
    
    // Step 3: Remove or replace special characters
    processed = processed
      .replace(/[^\w\s.,!?;:'-]/g, ' ') // Remove special chars, keep basic punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Step 4: Handle contractions
    const contractions = {
      "n't": " not",
      "'re": " are",
      "'ve": " have",
      "'ll": " will",
      "'d": " would",
      "'m": " am",
      "'s": " is"
    };
    
    for (const [contraction, expansion] of Object.entries(contractions)) {
      processed = processed.replace(new RegExp(contraction, 'g'), expansion);
    }
    
    // Step 5: Final cleanup
    processed = processed
      .replace(/\s+/g, ' ')
      .trim();
    
    return processed;
  }

  // Encode text to token IDs for a specific model
  function encodeTextToTokens(text, modelConfig) {
    // Advanced preprocessing
    const preprocessed = preprocessTextForTTS(text);
    console.log('Preprocessed text:', preprocessed.substring(0, 100));
    
    const textChars = preprocessed.split('');
    
    // For Kokoro model - use direct character codes with optimized mapping
    if (modelConfig.inputNames && modelConfig.inputNames.includes('tokens')) {
      console.log('Using optimized character codes for Kokoro model');
      
      // Create a compact character-to-token mapping for Kokoro
      const kokoroVocab = {};
      let tokenId = 0;
      
      // Space
      kokoroVocab[' '] = tokenId++;
      
      // Lowercase a-z
      for (let i = 0; i < 26; i++) {
        kokoroVocab[String.fromCharCode(97 + i)] = tokenId++;
      }
      
      // Numbers 0-9
      for (let i = 0; i < 10; i++) {
        kokoroVocab[i.toString()] = tokenId++;
      }
      
      // Common punctuation
      ['.', ',', "'", '-', '!', '?'].forEach(p => {
        kokoroVocab[p] = tokenId++;
      });
      
      // Map characters using vocabulary, fallback to ASCII
      return textChars.map(c => {
        if (kokoroVocab.hasOwnProperty(c)) {
          return kokoroVocab[c];
        } else {
          const charCode = c.charCodeAt(0);
          // Map to reasonable range (0-127 for ASCII)
          if (charCode >= 32 && charCode <= 126) {
            return charCode;
          } else {
            return 32; // Space for unknown
          }
        }
      });
    }
    
    // For VITS models (LJSpeech/VCTK) - use optimized character vocabulary
    console.log('Using optimized character vocabulary for VITS model');
    const vocab = createVITSCharacterVocab();
    const MIN_TOKEN = -77;
    const MAX_TOKEN = 76;
    const TOKEN_RANGE = MAX_TOKEN - MIN_TOKEN + 1; // 154
    
    // Calculate vocabulary size
    const vocabSize = Object.keys(vocab).length;
    console.log('Vocabulary size:', vocabSize, 'Token range:', TOKEN_RANGE);
    
    const tokens = textChars.map(c => {
      // Use vocabulary if available
      if (vocab.hasOwnProperty(c)) {
        const vocabId = vocab[c];
        // Map vocabulary ID to model's token range
        // Use a more intelligent mapping that preserves distinctions
        // Map vocab IDs (0-~100) to model range (-77 to 76)
        if (vocabSize <= TOKEN_RANGE) {
          // If vocab fits in range, use direct mapping
          return MIN_TOKEN + vocabId;
        } else {
          // If vocab is larger, use modulo but try to preserve order
          const mapped = vocabId % TOKEN_RANGE;
          return MIN_TOKEN + mapped;
        }
      } else {
        // Unknown character - try to map intelligently
        const charCode = c.charCodeAt(0);
        
        // If it's a letter, map to corresponding letter in vocab
        if (charCode >= 97 && charCode <= 122) {
          // Lowercase letter - should be in vocab
          return MIN_TOKEN + (charCode - 97 + 1); // +1 for space
        } else if (charCode >= 65 && charCode <= 90) {
          // Uppercase - map to lowercase equivalent
          return MIN_TOKEN + (charCode - 65 + 1);
        } else if (charCode >= 48 && charCode <= 57) {
          // Number
          return MIN_TOKEN + (charCode - 48 + 27); // After 26 letters
        } else if (charCode === 32) {
          // Space
          return MIN_TOKEN;
        } else {
          // Other - map to space
          return MIN_TOKEN;
        }
      }
    });
    
    console.log('Character tokens (first 30):', tokens.slice(0, 30).join(', '));
    console.log('Token range:', Math.min(...tokens), 'to', Math.max(...tokens));
    return tokens;
  }

  // Postprocess audio from model output
  function postprocessAudio(audioTensor, sampleRate = 22050) {
    console.log('Postprocessing audio tensor:', {
      isTensor: audioTensor instanceof ort.Tensor,
      type: audioTensor.type,
      dims: audioTensor.dims,
      size: audioTensor.size
    });
    
    // Get audio data from ONNX tensor
    let audioArray;
    if (audioTensor instanceof ort.Tensor) {
      // ONNX Runtime tensor - access .data property
      const tensorData = audioTensor.data;
      console.log('Tensor data type:', tensorData.constructor.name, 'length:', tensorData.length);
      
      if (tensorData instanceof Float32Array) {
        audioArray = tensorData;
      } else if (tensorData instanceof Float64Array) {
        // Convert Float64 to Float32
        audioArray = new Float32Array(tensorData);
      } else if (tensorData instanceof Int16Array || tensorData instanceof Int32Array) {
        // Convert integer audio to float (-1 to 1 range)
        audioArray = new Float32Array(tensorData.length);
        const maxInt = tensorData instanceof Int16Array ? 32767 : 2147483647;
        for (let i = 0; i < tensorData.length; i++) {
          audioArray[i] = tensorData[i] / maxInt;
        }
      } else {
        // Fallback: convert to Float32Array
        audioArray = new Float32Array(tensorData);
      }
    } else {
      // Fallback for non-tensor data
      const audioData = audioTensor.data || audioTensor;
      if (audioData instanceof Float32Array) {
        audioArray = audioData;
      } else if (audioData instanceof Array) {
        audioArray = new Float32Array(audioData);
      } else {
        audioArray = new Float32Array(audioData.length || audioData.size || 0);
        for (let i = 0; i < audioArray.length; i++) {
          audioArray[i] = audioData[i] || 0;
        }
      }
    }
    
    console.log('Extracted audio array:', {
      length: audioArray.length,
      min: Math.min(...audioArray),
      max: Math.max(...audioArray),
      sampleRate
    });
    
    // Normalize audio (ensure values are in [-1, 1] range)
    let max = 0;
    for (let i = 0; i < audioArray.length; i++) {
      const abs = Math.abs(audioArray[i]);
      if (abs > max) max = abs;
    }
    
    if (max > 1.0) {
      console.log(`Normalizing audio: max value was ${max}`);
      for (let i = 0; i < audioArray.length; i++) {
        audioArray[i] /= max;
      }
    }
    
    return { audioArray, sampleRate };
  }

  // Generate speech using AI model
  async function generateSpeechWithAI(text, rate, pitch, volume) {
    // Always try to load the model first
    const model = await loadTTSModel();
    
    if (!model) {
      throw new Error('TTS model not available. Please check console for errors.');
    }
    
    // Handle kokoro-js models (Kokoro WebGPU)
    if (currentModelConfig.type === 'transformers' && kokoroModel) {
      try {
        status.textContent = 'Generating speech with Kokoro WebGPU...';
        status.className = 'status-message info';
        
        // Get selected voice
        // Re-query element to ensure we have the latest reference
        const voiceSelect = qs('#voice-select-kokoro');
        const selectedVoice = voiceSelect ? voiceSelect.value : (currentModelConfig.voices?.[0] || 'af_heart');
        
        // Generate audio using kokoro-js
        const audio = await kokoroModel.generate(text, {
          voice: selectedVoice
        });
        
        // kokoro-js returns an audio object with structure: {audio: Float32Array, sampling_rate: number}
        // Based on the console logs, we know it has:
        // - audio.audio: Float32Array
        // - audio.sampling_rate: number
        // - Methods: toWav(), toBlob(), save()
        
        let audioArray;
        let sampleRate = 24000; // Kokoro typically uses 24kHz
        
        // Extract audio data - the structure is {audio: Float32Array, sampling_rate: number}
        if (audio.audio && audio.audio instanceof Float32Array) {
          audioArray = audio.audio;
          sampleRate = audio.sampling_rate || audio.sampleRate || 24000;
        } else if (audio.data && audio.data instanceof Float32Array) {
          audioArray = audio.data;
          sampleRate = audio.sampling_rate || audio.sampleRate || 24000;
        } else if (audio instanceof AudioBuffer) {
          audioArray = audio.getChannelData(0);
          sampleRate = audio.sampleRate;
        } else {
          // Fallback: try to use toBlob() method and decode
          try {
            if (audio.toBlob && typeof audio.toBlob === 'function') {
              const blob = await audio.toBlob();
              const arrayBuffer = await blob.arrayBuffer();
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              audioArray = audioBuffer.getChannelData(0);
              sampleRate = audioBuffer.sampleRate;
            } else {
              throw new Error('Audio object does not have expected structure');
            }
          } catch (error) {
            console.error('Failed to extract audio data:', error);
            throw new Error(`Unable to extract audio data: ${error.message}`);
          }
        }
        
        // Create AudioContext and process audio
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        const buffer = ctx.createBuffer(1, audioArray.length, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // Copy and apply volume
        for (let i = 0; i < audioArray.length; i++) {
          channelData[i] = audioArray[i] * volume;
        }
        
        // Apply rate using playbackRate
        const destination = ctx.createMediaStreamDestination();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        
        source.connect(destination);
        source.connect(ctx.destination);
        
        // Record for download
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
        });
        
        const audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        return new Promise((resolve) => {
          mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { 
              type: mediaRecorder.mimeType || 'audio/webm' 
            });
            resolve(audioBlob);
          };
          
          mediaRecorder.start();
          source.start(0);
          
          source.onended = () => {
            setTimeout(() => {
              if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, 500);
          };
        });
      } catch (error) {
        console.error('Kokoro WebGPU generation error:', error);
        throw new Error(`Kokoro WebGPU failed: ${error.message}`);
      }
    }
    
    // Handle ONNX models (existing code)
    if (!ttsSession) {
      throw new Error('TTS model not available. Please check console for errors.');
    }
    
    // Limit text length to prevent model errors
    // Most TTS models have practical limits (e.g., 512-1024 tokens)
    const MAX_TEXT_LENGTH = 500; // Conservative limit
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`Text length ${text.length} exceeds limit ${MAX_TEXT_LENGTH}, truncating...`);
      text = text.substring(0, MAX_TEXT_LENGTH);
    }
    
    // Inspect model input specifications to get correct types
    console.log('Inspecting model input specifications...');
    console.log('ttsSession.inputs:', ttsSession.inputs);
    console.log('ttsSession.inputNames:', ttsSession.inputNames);
    
    // Try to get input metadata from session
    let inputMetadata = null;
    try {
      // Try different ways to access input metadata
      if (ttsSession.inputMetadata) {
        inputMetadata = ttsSession.inputMetadata;
      } else if (ttsSession.inputs && Array.isArray(ttsSession.inputs)) {
        inputMetadata = ttsSession.inputs;
      } else if (ttsSession.inputNames) {
        // Try to get metadata by calling a method or accessing properties
        inputMetadata = ttsSession.inputNames.map(name => ({ name }));
      }
      
      if (inputMetadata) {
        console.log('Input metadata:', inputMetadata);
        if (Array.isArray(inputMetadata)) {
          inputMetadata.forEach((inp, idx) => {
            console.log(`  Input ${idx}:`, inp);
            if (inp.name) console.log(`    name: ${inp.name}`);
            if (inp.type) console.log(`    type: ${inp.type}`);
            if (inp.shape) console.log(`    shape: ${JSON.stringify(inp.shape)}`);
          });
        }
      }
    } catch (e) {
      console.log('Could not access input metadata:', e);
    }
    
    // Preprocess text
    const processedText = preprocessText(text, currentModelConfig);
    
    // Prepare input tensor
    // TTS models typically expect:
    // - Text as character IDs or token IDs
    // - Or text embeddings
    // The exact format depends on the model architecture
    
    // For VITS-based models (Kokoro, LJSpeech, VCTK), we typically need:
    // 1. Text tokenization (character or phoneme IDs)
    // 2. Speaker ID (for multi-speaker models)
    
    // Prepare inputs based on model requirements
    const inputs = {};
    
    // Kokoro model requires: tokens, style, speed
    if (currentModelConfig.inputNames && currentModelConfig.inputNames.includes('tokens')) {
      // Get expected types from model if available
      // Based on latest error: "Actual: (tensor(float)) , expected: (tensor(int64))"
      // Since speed must be float32, and tokens should be int64, style should also be int64
      let tokensType = 'int64'; // Token IDs are integers
      let styleType = 'int64'; // Style ID is an integer
      
      // Try to get types from input metadata
      if (inputMetadata && Array.isArray(inputMetadata)) {
        const tokensInput = inputMetadata.find(inp => inp.name === 'tokens');
        const styleInput = inputMetadata.find(inp => inp.name === 'style');
        
        if (tokensInput && tokensInput.type) {
          tokensType = tokensInput.type;
          console.log(`Tokens input type from model metadata: ${tokensType}`);
        }
        if (styleInput && styleInput.type) {
          styleType = styleInput.type;
          console.log(`Style input type from model metadata: ${styleType}`);
        }
      } else if (ttsSession.inputs && Array.isArray(ttsSession.inputs)) {
        const tokensInput = ttsSession.inputs.find(inp => inp.name === 'tokens');
        const styleInput = ttsSession.inputs.find(inp => inp.name === 'style');
        
        if (tokensInput && tokensInput.type) {
          tokensType = tokensInput.type;
          console.log(`Tokens input type from model: ${tokensType}`);
        }
        if (styleInput && styleInput.type) {
          styleType = styleInput.type;
          console.log(`Style input type from model: ${styleType}`);
        }
      }
      
      // Simple character-based encoding for tokens
      const textChars = processedText.split('');
      
      // Create tokens tensor with correct type
      let tokensTensor;
      if (tokensType.includes('float') || tokensType === 'float32') {
        // Normalize character codes to 0-1 range (common for embeddings)
        const maxCharCode = 127; // ASCII range
        const textArray = new Float32Array(textChars.map(c => c.charCodeAt(0) / maxCharCode));
        tokensTensor = new ort.Tensor('float32', textArray, [1, textArray.length]);
        console.log('Created tokens as float32 (normalized 0-1)');
      } else {
        const textArray = new BigInt64Array(textChars.map(c => BigInt(c.charCodeAt(0))));
        tokensTensor = new ort.Tensor('int64', textArray, [1, textArray.length]);
        console.log('Created tokens as int64');
      }
      inputs['tokens'] = tokensTensor;
      
      // Add style (speaker/style embedding) - shape should be [1, 256] based on model metadata
      // Style is a 256-dimensional embedding vector, not just an ID
      const styleId = currentModelConfig.defaultStyle || 0;
      let styleTensor;
      
      // Get style shape from metadata (should be [1, 256])
      let styleShape = [1, 256]; // Default from model metadata
      if (inputMetadata && Array.isArray(inputMetadata)) {
        const styleInput = inputMetadata.find(inp => inp.name === 'style');
        if (styleInput && styleInput.shape) {
          styleShape = styleInput.shape;
          console.log(`Style shape from model: ${JSON.stringify(styleShape)}`);
        }
      }
      
      if (styleType.includes('float') || styleType === 'float32') {
        // Create a 256-dimensional style embedding vector
        // For now, use zeros (could be improved with actual style embeddings)
        const styleSize = styleShape[1] || 256;
        const styleArray = new Float32Array(styleSize).fill(0);
        // Optionally set first element to styleId for variation
        if (styleSize > 0) {
          styleArray[0] = styleId;
        }
        styleTensor = new ort.Tensor('float32', styleArray, styleShape);
        console.log(`Created style as float32 with shape [${styleShape.join(',')}]`);
      } else {
        // If somehow int64, create as int64 array
        const styleSize = styleShape[1] || 256;
        const styleArray = new BigInt64Array(styleSize).fill(BigInt(styleId));
        styleTensor = new ort.Tensor('int64', styleArray, styleShape);
        console.log(`Created style as int64 with shape [${styleShape.join(',')}]`);
      }
      inputs['style'] = styleTensor;
      
      // Add speed (use rate parameter, convert to appropriate range)
      // Kokoro speed might expect a specific range, defaulting to 1.0
      const speedValue = Math.max(0.5, Math.min(2.0, rate)); // Clamp between 0.5 and 2.0
      const speedTensor = new ort.Tensor('float32', new Float32Array([speedValue]), [1]);
      inputs['speed'] = speedTensor;
      
      console.log('Prepared Kokoro inputs:', {
        tokens: tokensTensor.dims,
        style: styleId,
        speed: speedValue
      });
    } else {
      // For other models (LJSpeech, VCTK), encode text to token IDs
      const tokenIds = encodeTextToTokens(processedText, currentModelConfig);
      console.log('Encoded text to tokens:', {
        text: processedText.substring(0, 20) + (processedText.length > 20 ? '...' : ''),
        tokenCount: tokenIds.length,
        tokenRange: `[${Math.min(...tokenIds)}, ${Math.max(...tokenIds)}]`,
        sampleTokens: tokenIds.slice(0, 10)
      });
      
      const textArray = new BigInt64Array(tokenIds.map(id => BigInt(id)));
      
      // Check if model expects 1D or 2D input
      let textShape;
      if (inputMetadata && Array.isArray(inputMetadata)) {
        const textInput = inputMetadata.find(inp => inp.name === 'text' || inp.name === currentModelConfig.inputNames?.[0]);
        if (textInput && textInput.shape) {
          // Check if shape indicates 1D (e.g., ["text_length"]) or 2D (e.g., [1, "text_length"])
          const shape = textInput.shape;
          if (shape.length === 1 || (shape.length === 2 && shape[0] === 1)) {
            // Model expects 1D: [text_length]
            textShape = [textArray.length];
          } else {
            // Model expects 2D: [1, text_length]
            textShape = [1, textArray.length];
          }
          console.log(`Text input shape from model: ${JSON.stringify(shape)}, using: ${JSON.stringify(textShape)}`);
        } else {
          // Default to 1D for text inputs (most common)
          textShape = [textArray.length];
        }
      } else {
        // Default to 1D for text inputs (most common)
        textShape = [textArray.length];
      }
      
      const textTensor = new ort.Tensor('int64', textArray, textShape);
      const inputName = currentModelConfig.inputNames?.[0] || 'text';
      inputs[inputName] = textTensor;
      console.log(`Created text tensor with shape [${textShape.join(',')}]`);
      
      // Check if model requires speaker IDs (sids)
      if (currentModelConfig.inputNames && currentModelConfig.inputNames.includes('sids')) {
        const speakerId = currentModelConfig.defaultSpeakerId || 0;
        const sidsTensor = new ort.Tensor('int64', new BigInt64Array([BigInt(speakerId)]), [1]);
        inputs['sids'] = sidsTensor;
        console.log(`Created speaker ID tensor: ${speakerId}`);
      }
    }
    
    // Run inference
    console.log('Running inference with inputs:', Object.keys(inputs));
    for (const [key, tensor] of Object.entries(inputs)) {
      console.log(`  ${key}: shape ${tensor.dims}, type ${tensor.type}`);
    }
    
    const outputs = await runInference(ttsSession, inputs);
    
    console.log('Inference completed. Output keys:', Object.keys(outputs));
    
    // Get audio output - output name from config
    const audioOutput = outputs[currentModelConfig.outputName || 'audio'] || 
                       outputs.output || 
                       outputs[Object.keys(outputs)[0]];
    
    if (!audioOutput) {
      console.error('No audio output found. Available outputs:', Object.keys(outputs));
      throw new Error('Model did not return audio output');
    }
    
    console.log('Audio output found:', {
      type: typeof audioOutput,
      isTensor: audioOutput instanceof ort.Tensor,
      dims: audioOutput.dims,
      size: audioOutput.size
    });
    
    // Postprocess audio
    const { audioArray, sampleRate } = postprocessAudio(audioOutput);
    
    // Apply rate, pitch, and volume
    // Rate: resample or change playback speed
    // Pitch: use Web Audio API pitch shifting
    // Volume: simple multiplication
    
    // Create AudioContext
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const buffer = ctx.createBuffer(1, audioArray.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Copy audio data
    for (let i = 0; i < audioArray.length; i++) {
      channelData[i] = audioArray[i] * volume;
    }
    
    // Apply rate by resampling if needed
    let finalBuffer = buffer;
    if (rate !== 1.0) {
      // Simple rate adjustment using playbackRate
      // For better quality, use proper resampling
      finalBuffer = buffer; // We'll use playbackRate on the source instead
    }
    
    // Create MediaStreamDestination to capture
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = finalBuffer;
    source.playbackRate.value = rate;
    
    // Apply pitch if needed (requires more complex processing)
    // For now, we'll use playbackRate which affects both speed and pitch
    // A proper implementation would use a pitch shifter
    
    source.connect(destination);
    source.connect(ctx.destination); // Also play through speakers
    
    // Record the stream
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
    });
    
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        resolve(audioBlob);
      };
      
      mediaRecorder.start();
      source.start(0);
      
      source.onended = () => {
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 500);
      };
    });
  }

  // Generate speech using AI model
  async function generateSpeech() {
    const text = textInput.value.trim();
    
    if (!text) {
      status.textContent = 'Please enter some text to convert.';
      status.className = 'status-message error';
      return;
    }

    try {
      status.textContent = 'Generating audio with AI model...';
      status.className = 'status-message info';
      generateBtn.disabled = true;
      downloadBtn.disabled = true;

      // Get settings
      const rate = parseFloat(rateSlider.value);
      const pitch = parseFloat(pitchSlider.value);
      const volume = parseFloat(volumeSlider.value);

      // Generate audio using AI model
      const blob = await generateSpeechWithAI(text, rate, pitch, volume);
      if (blob) {
        audioBlob = blob;
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioContainer.style.display = 'block';
        downloadBtn.disabled = false;
        status.textContent = 'Audio generated successfully!';
        status.className = 'status-message success';
      } else {
        throw new Error('AI model returned no audio');
      }
      
      generateBtn.disabled = false;
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
      status.className = 'status-message error';
      generateBtn.disabled = false;
      downloadBtn.disabled = true;
    }
  }


  // Download audio file
  function downloadAudio() {
    if (!audioBlob) {
      status.textContent = 'No audio available to download.';
      status.className = 'status-message error';
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speech-${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'ogg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    status.textContent = 'Audio file downloaded!';
    status.className = 'status-message success';
  }

  // Clear all
  function clearAll() {
    textInput.value = '';
    audioBlob = null;
    audioContainer.style.display = 'none';
    audioPlayer.src = '';
    downloadBtn.disabled = true;
    status.textContent = '';
    status.className = 'status-message';
  }

  // Event listeners
  on(generateBtn, 'click', generateSpeech);
  on(downloadBtn, 'click', downloadAudio);
  on(clearBtn, 'click', clearAll);
});
