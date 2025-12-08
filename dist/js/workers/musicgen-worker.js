// Web Worker for MusicGen generation
// This runs in a separate thread to avoid blocking the main thread

import { AutoTokenizer, MusicgenForConditionalGeneration } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.x/dist/transformers.min.js';

let model = null;
let tokenizer = null;

// Load models
async function loadModels() {
  if (model && tokenizer) {
    return { model, tokenizer };
  }
  
  self.postMessage({ type: 'status', message: 'Loading tokenizer...' });
  tokenizer = await AutoTokenizer.from_pretrained('Xenova/musicgen-small', {
    progress_callback: (progress) => {
      if (progress && progress.status === 'progress' && progress.progress !== undefined) {
        const percent = Math.min(100, Math.max(0, Math.round(progress.progress * 100)));
        self.postMessage({ 
          type: 'progress', 
          stage: 'tokenizer',
          progress: percent,
          message: `Loading tokenizer: ${percent}%`
        });
      }
    }
  });
  
  self.postMessage({ type: 'status', message: 'Loading MusicGen model...' });
  model = await MusicgenForConditionalGeneration.from_pretrained('Xenova/musicgen-small', {
    quantized: false,
    device: 'wasm',
    dtype: 'q8',
    text_encoder: 'q8',
    decoder_model_merged: 'q8',
    encodec_decode: 'fp32',
    progress_callback: (progress) => {
      if (progress && progress.status === 'progress' && progress.progress !== undefined) {
        const percent = Math.min(100, Math.max(0, Math.round(progress.progress * 100)));
        self.postMessage({ 
          type: 'progress', 
          stage: 'model',
          progress: percent,
          message: `Loading model: ${percent}%`
        });
      }
    }
  });
  
  self.postMessage({ type: 'status', message: 'Models loaded and ready!' });
  return { model, tokenizer };
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  try {
    if (type === 'generate') {
      const { prompt, duration, temperature, topK, topP } = data;
      
      // Load models if needed
      const models = await loadModels();
      if (!models) {
        self.postMessage({ type: 'error', message: 'Failed to load models' });
        return;
      }
      
      const { model: musicModel, tokenizer: textTokenizer } = models;
      
      // Tokenize prompt
      self.postMessage({ type: 'status', message: 'Tokenizing prompt...' });
      const inputTokens = await textTokenizer(prompt, {
        padding: true,
        truncation: true,
        max_length: 512,
        return_tensors: 'pt'
      });
      
      // Generate audio
      self.postMessage({ type: 'status', message: 'Generating audio...' });
      
      // MusicGen generates at 50 Hz, but the model has a maximum sequence length of 2048 tokens
      // Cap max_new_tokens to prevent index out of bounds errors
      const MAX_SEQUENCE_LENGTH = 2048;
      const requestedTokens = Math.floor(duration * 50); // 50 Hz generation rate
      const maxNewTokens = Math.min(requestedTokens, MAX_SEQUENCE_LENGTH);
      
      const generateOptions = {
        ...inputTokens,
        max_new_tokens: maxNewTokens,
        temperature: temperature,
        top_k: topK,
        top_p: topP > 0 ? topP : undefined,
        do_sample: true,
        progress_callback: (progress) => {
          if (progress && progress.status === 'progress' && progress.progress !== undefined) {
            const percent = Math.min(100, Math.max(0, Math.round(progress.progress * 100)));
            self.postMessage({ 
              type: 'progress', 
              stage: 'generation',
              progress: percent,
              message: `Generating: ${percent}%`
            });
          } else if (progress && progress.stage) {
            self.postMessage({ 
              type: 'progress', 
              stage: 'generation',
              message: `Generating: ${progress.stage}`
            });
          }
        }
      };
      
      const output = await musicModel.generate(generateOptions);
      
      console.log('[Worker] Generation complete, output type:', typeof output);
      console.log('[Worker] Output keys:', output ? Object.keys(output) : 'null');
      
      // Extract audio data before sending (workers can't transfer complex objects)
      let audioData;
      let sampleRate = 32000;
      
      if (output && output.audio) {
        audioData = output.audio[0] || output.audio;
        sampleRate = output.sampling_rate || 32000;
      } else if (output && output.data) {
        audioData = output.data;
        sampleRate = output.sampling_rate || 32000;
      } else if (Array.isArray(output)) {
        audioData = output;
      } else if (output && typeof output === 'object') {
        // Try to find audio data
        for (const key of Object.keys(output)) {
          if (key.toLowerCase().includes('audio') || Array.isArray(output[key])) {
            audioData = output[key];
            break;
          }
        }
        sampleRate = output.sampling_rate || 32000;
      } else {
        audioData = output;
      }
      
      // Convert to array if needed for transfer
      let audioArray;
      if (audioData instanceof Float32Array) {
        audioArray = Array.from(audioData);
      } else if (Array.isArray(audioData)) {
        audioArray = audioData;
      } else if (audioData && audioData.buffer) {
        audioArray = Array.from(new Float32Array(audioData.buffer));
      } else {
        audioArray = audioData;
      }
      
      // Send result back with audio data as array
      self.postMessage({ 
        type: 'result', 
        audioData: audioArray,
        sampleRate: sampleRate,
        message: 'Generation complete!'
      });
      
    } else if (type === 'load') {
      // Preload models
      await loadModels();
      self.postMessage({ type: 'status', message: 'Models preloaded' });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ 
      type: 'error', 
      message: error.message,
      stack: error.stack
    });
  }
});

