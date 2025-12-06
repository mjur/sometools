// AI Music Generator Tool
// Uses MusicGen via Transformers.js for text-to-music generation
// Model: https://huggingface.co/Xenova/musicgen-small
// Uses Web Worker to avoid blocking the main thread

import { toast, on, qs } from '/js/ui.js';

// DOM elements
const promptInput = qs('#prompt-input');
const generateBtn = qs('#generate-btn');
const clearBtn = qs('#clear-btn');
const downloadBtn = qs('#download-btn');
const audioOutput = qs('#audio-output');
const audioContainer = qs('#audio-container');
const audioPlaceholder = qs('#audio-placeholder');
const modelStatus = qs('#model-status');
const progressContainer = qs('#progress-container');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');
const durationSelect = qs('#duration');
const temperatureInput = qs('#temperature');
const topKInput = qs('#top-k');
const topPInput = qs('#top-p');

// State
let worker = null;
let isModelLoading = false;
let generatedAudio = null;

// Initialize Web Worker
function initWorker() {
  if (worker) {
    return worker;
  }
  
  try {
    worker = new Worker('/js/workers/musicgen-worker.js', { type: 'module' });
    
    // Handle messages from worker
    worker.addEventListener('message', (event) => {
      const { type, message, progress, stage, output, error, stack } = event.data;
      
      if (type === 'status') {
        modelStatus.textContent = message;
        modelStatus.style.color = 'var(--muted)';
        console.log('[Worker]', message);
      } else if (type === 'progress') {
        if (progress !== undefined) {
          const percent = Math.min(100, Math.max(0, progress));
          progressFill.style.width = percent + '%';
          progressText.textContent = message || `Progress: ${percent}%`;
        } else {
          progressText.textContent = message || 'Processing...';
        }
        console.log('[Worker Progress]', stage, progress, message);
      } else if (type === 'result') {
        console.log('[Worker] Generation complete!');
        // Worker sends audioData and sampleRate directly
        const { audioData, sampleRate } = event.data;
        if (audioData && sampleRate) {
          progressFill.style.width = '90%';
          progressText.textContent = 'Processing audio...';
          // Convert array back to Float32Array
          const float32Audio = new Float32Array(audioData);
          processAudioData(float32Audio, sampleRate);
        } else {
          modelStatus.textContent = 'Error: Worker did not return audio data';
          modelStatus.style.color = 'var(--error)';
          toast('Generation failed: No audio data received from worker', 'error');
          progressContainer.style.display = 'none';
        }
      } else if (type === 'error') {
        console.error('[Worker Error]', error, stack);
        modelStatus.textContent = `Error: ${error}`;
        modelStatus.style.color = 'var(--error)';
        toast(`Generation failed: ${error}`, 'error');
        progressContainer.style.display = 'none';
      }
    });
    
    worker.addEventListener('error', (error) => {
      console.error('Worker error:', error);
      modelStatus.textContent = `Worker error: ${error.message}`;
      modelStatus.style.color = 'var(--error)';
      toast(`Worker error: ${error.message}`, 'error');
      progressContainer.style.display = 'none';
    });
    
    console.log('✓ Web Worker initialized');
    return worker;
  } catch (error) {
    console.error('Failed to create worker:', error);
    throw new Error(`Failed to create Web Worker: ${error.message}`);
  }
}

// Process audio data and create WAV
function processAudioData(audioData, sampleRate) {
  // Ensure audioData is Float32Array
  if (!(audioData instanceof Float32Array)) {
    if (Array.isArray(audioData)) {
      audioData = new Float32Array(audioData);
    } else if (audioData && audioData.buffer) {
      audioData = new Float32Array(audioData.buffer);
    } else {
      throw new Error('Could not convert audio data to Float32Array');
    }
  }
  
  // Normalize audio to [-1, 1] range
  let maxVal = 0;
  for (let i = 0; i < audioData.length; i++) {
    const val = Math.abs(audioData[i]);
    if (val > maxVal) maxVal = val;
  }
  
  const normalizedAudio = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    normalizedAudio[i] = maxVal > 0 ? audioData[i] / maxVal : audioData[i];
    normalizedAudio[i] = Math.max(-1, Math.min(1, normalizedAudio[i]));
  }
  
  progressFill.style.width = '95%';
  progressText.textContent = 'Converting to WAV...';
  
  // Convert to WAV
  const wavBuffer = audioBufferToWav(normalizedAudio, sampleRate);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  
  progressFill.style.width = '100%';
  progressText.textContent = 'Complete!';
  
  // Display audio
  audioOutput.src = url;
  audioContainer.style.display = 'block';
  audioPlaceholder.style.display = 'none';
  generatedAudio = { blob, url };
  
  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 500);
  
  modelStatus.textContent = 'Generation complete!';
  modelStatus.style.color = 'var(--ok)';
  toast('Music generated successfully!', 'success');
}

// Generate music using Web Worker
async function generateMusic() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    toast('Please enter a text prompt', 'warning');
    return;
  }
  
  // Initialize worker if needed
  const musicWorker = initWorker();
  
  try {
    // Get generation parameters
    const duration = parseInt(durationSelect.value) || 10;
    const temperature = parseFloat(temperatureInput.value) || 1.0;
    const topK = parseInt(topKInput.value) || 250;
    const topP = parseFloat(topPInput.value) || 0.0;
    
    // Show progress
    modelStatus.textContent = 'Generating music...';
    modelStatus.style.color = 'var(--muted)';
    progressContainer.style.display = 'block';
    progressFill.style.width = '10%';
    progressText.textContent = 'Starting generation...';
    
    // Send generate request to worker
    console.log('Sending generate request to worker...');
    musicWorker.postMessage({
      type: 'generate',
      data: {
        prompt,
        duration,
        temperature,
        topK,
        topP
      }
    });
  } catch (error) {
    modelStatus.textContent = `Error: ${error.message}`;
    modelStatus.style.color = 'var(--error)';
    toast(`Generation failed: ${error.message}`, 'error');
    console.error('Generation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
  }
}

// Convert Float32Array audio buffer to WAV format
function audioBufferToWav(buffer, sampleRate) {
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, length * 2, true); // Subchunk2Size
  
  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

// Event listeners
on(generateBtn, 'click', generateMusic);

on(clearBtn, 'click', () => {
  promptInput.value = '';
  audioOutput.src = '';
  audioContainer.style.display = 'none';
  audioPlaceholder.style.display = 'block';
  if (generatedAudio && generatedAudio.url) {
    URL.revokeObjectURL(generatedAudio.url);
  }
  generatedAudio = null;
  modelStatus.textContent = 'Ready to generate';
  modelStatus.style.color = 'var(--muted)';
});

on(downloadBtn, 'click', () => {
  if (generatedAudio && generatedAudio.blob) {
    const url = generatedAudio.url;
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-music-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Download started', 'success');
  } else {
    toast('No audio to download', 'warning');
  }
});

// Allow Enter key to generate (Shift+Enter for new line)
on(promptInput, 'keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateMusic();
  }
});
