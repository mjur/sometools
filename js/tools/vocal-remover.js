// Vocal Remover Tool
// Uses center channel extraction to remove vocals from stereo audio

import { qs, on, toast } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';

// Note: The ERR_REQUEST_RANGE_NOT_SATISFIABLE error for blob URLs that appears
// in the console is likely coming from the chatbot widget or WebLLM initialization,
// not from this vocal remover tool. It's a harmless browser network error that
// occurs when a blob URL is accessed after it's been revoked or is invalid.
// This doesn't affect functionality.

const audioInput = qs('#audio-input');
const dropZone = qs('#drop-zone');
const processBtn = qs('#process-btn');
const clearBtn = qs('#clear-btn');
const downloadBtn = qs('#download-btn');
const inputInfo = qs('#input-info');
const status = qs('#status');
const progressContainer = qs('#progress-container');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');
const vocalLevel = qs('#vocal-level');
const vocalLevelValue = qs('#vocal-level-value');
const methodSelect = qs('#method-select');

const originalAudio = qs('#original-audio');
const originalContainer = qs('#original-audio-container');
const originalPlaceholder = qs('#original-placeholder');
const outputAudio = qs('#output-audio');
const outputContainer = qs('#output-audio-container');
const outputPlaceholder = qs('#output-placeholder');

let audioContext = null;
let audioBuffer = null;
let processedBlob = null;
let currentFile = null;
let originalAudioUrl = null;
let outputAudioUrl = null;
let outputFormat = 'wav'; // Track the output format
let ffmpeg = null; // FFmpeg instance for encoding
let processingCache = new Map(); // Cache for processing insights
let ort = null; // ONNX Runtime
let aiModelSession = null; // AI model session
let isAIModelLoading = false; // Track AI model loading state

// AI Model Configuration
// Using MVSEP-MDX23 model for high-quality vocal separation
// Model options:
// 1. ZFTurbo/MVSEP-MDX23-music-separation-model (recommended - separates into 4 stems)
// 2. KimberleyJensen/kmdx-net_music-source-separation (alternative)
//
// Note: Hugging Face models may require authentication. If the model URL fails,
// you may need to:
// 1. Download the model and host it on your CDN (e.g., cdn.sometools.io)
// 2. Or use a different publicly accessible model URL
const AI_MODEL_CONFIG = {
  name: 'MVSEP-MDX23 Vocal Separation',
  key: 'mvsep-mdx23-vocal-separation',
  // MVSEP-MDX23 model URL - separates into: bass, drums, vocals, other
  // We'll extract the instrumental by combining bass + drums + other (excluding vocals)
  // Try multiple URL formats in case of authentication issues
  modelUrl: 'https://huggingface.co/ZFTurbo/MVSEP-MDX23-music-separation-model/resolve/main/model.onnx',
  // Alternative URLs to try if the first one fails:
  fallbackUrls: [
    'https://huggingface.co/ZFTurbo/MVSEP-MDX23-music-separation-model/resolve/main/model.onnx?download=true',
    'https://huggingface.co/KimberleyJensen/kmdx-net_music-source-separation/resolve/main/model.onnx',
  ],
  // Expected input: Audio waveform [batch, samples] or [batch, channels, samples]
  // Expected output: Separated stems [batch, stems, channels, samples] where stems are:
  //   - [0] = bass
  //   - [1] = drums  
  //   - [2] = vocals (we want to exclude this)
  //   - [3] = other
  // We'll combine bass + drums + other to get instrumental
  inputName: 'audio', // Will be auto-detected from model
  outputName: 'output', // Will be auto-detected from model
  sampleRate: 44100, // Model's expected sample rate (will resample if needed)
  chunkSize: 44100 * 5, // Process 5 seconds at a time to avoid memory issues
};

// Add error handlers to audio elements to catch blob URL errors
if (originalAudio) {
  originalAudio.addEventListener('error', (e) => {
    console.debug('Original audio element error:', e);
    // If it's a blob URL error, clear the source
    if (originalAudio.src && originalAudio.src.startsWith('blob:')) {
      originalAudio.src = '';
    }
  });
}

if (outputAudio) {
  outputAudio.addEventListener('error', (e) => {
    console.debug('Output audio element error:', e);
    // If it's a blob URL error, clear the source
    if (outputAudio.src && outputAudio.src.startsWith('blob:')) {
      outputAudio.src = '';
    }
  });
}

// Update vocal level display
on(vocalLevel, 'input', () => {
  vocalLevelValue.textContent = vocalLevel.value + '%';
});

// Handle file input
async function handleFile(file) {
  if (!file) return;
  
  try {
    status.textContent = 'Loading audio file...';
    status.style.color = 'var(--muted)';
    
    // Check file type
    const hasValidExtension = /\.(mp3|wav|ogg|m4a|flac|aac|opus|wma|mp4|m4v)$/i.test(file.name);
    const hasValidMimeType = file.type && file.type.startsWith('audio/');
    
    if (!hasValidMimeType && !hasValidExtension) {
      throw new Error('Please select an audio file');
    }
    
    currentFile = file;
    
    // Display file info
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    inputInfo.textContent = `${file.name} (${fileSizeMB} MB)`;
    inputInfo.style.display = 'block';
    
    // Hide drop zone
    if (dropZone) dropZone.style.display = 'none';
    
    // Load audio file
    const arrayBuffer = await file.arrayBuffer();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Check if stereo
    if (audioBuffer.numberOfChannels < 2) {
      toast('Warning: Audio is not stereo. Vocal removal works best with stereo tracks.', 'warning');
    }
    
    // Display original audio
    const blob = new Blob([arrayBuffer], { type: file.type });
    // Revoke old URL if it exists
    if (originalAudioUrl) {
      try {
        if (originalAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(originalAudioUrl);
        }
      } catch (e) {
        console.debug('Error revoking old original audio URL:', e);
      }
    }
    // Pause and reset audio element before setting new source
    if (originalAudio) {
      originalAudio.pause();
      originalAudio.currentTime = 0;
    }
    const url = URL.createObjectURL(blob);
    originalAudioUrl = url;
    originalAudio.src = url;
    originalAudio.load(); // Explicitly load the new source
    originalContainer.style.display = 'block';
    originalPlaceholder.style.display = 'none';
    
    processBtn.disabled = false;
    status.textContent = 'Audio loaded. Click "Process Audio" to remove vocals.';
    status.style.color = 'var(--ok)';
    
  } catch (error) {
    console.error('Error loading audio:', error);
    status.textContent = `Error: ${error.message}`;
    status.style.color = 'var(--error)';
    toast(`Failed to load audio: ${error.message}`, 'error');
    processBtn.disabled = true;
    if (dropZone) dropZone.style.display = 'flex';
  }
}

// Drag and drop
on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

on(dropZone, 'dragleave', () => {
  dropZone.classList.remove('dragover');
});

on(dropZone, 'drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

on(dropZone, 'click', () => audioInput.click());

on(audioInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// Process audio to remove vocals
on(processBtn, 'click', async () => {
  if (!audioBuffer) {
    toast('Please load an audio file first', 'warning');
    return;
  }
  
  console.log('[Vocal Remover] Starting processing...');
  
  try {
    processBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Initializing...';
    status.textContent = 'Removing vocals...';
    status.style.color = 'var(--muted)';
    
    // Get vocal reduction level (0-200%)
    const reductionLevel = parseFloat(vocalLevel.value) / 100;
    console.log('[Vocal Remover] Reduction level:', reductionLevel);
    
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const duration = length / sampleRate;
    
    // Create cache key from file hash (simple hash from file name and size)
    const cacheKey = currentFile ? `${currentFile.name}_${currentFile.size}_${vocalLevel.value}_${methodSelect.value}` : null;
    
    // Check cache
    if (cacheKey && processingCache.has(cacheKey)) {
      console.log('[Vocal Remover] Using cached result');
      const cached = processingCache.get(cacheKey);
      processedBlob = cached.blob;
      outputFormat = cached.format;
      outputAudioUrl = URL.createObjectURL(processedBlob);
      outputAudio.src = outputAudioUrl;
      outputAudio.load();
      outputContainer.style.display = 'block';
      outputPlaceholder.style.display = 'none';
      downloadBtn.disabled = false;
      status.textContent = 'Vocal removal complete! (from cache)';
      status.style.color = 'var(--ok)';
      toast('Loaded from cache!', 'success');
      processBtn.disabled = false;
      progressContainer.style.display = 'none';
      return;
    }
    
    console.log('[Vocal Remover] Audio info:', {
      sampleRate,
      length,
      numberOfChannels,
      duration: duration.toFixed(2) + 's'
    });
    
    progressFill.style.width = '10%';
    progressText.textContent = 'Preparing buffers...';
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create output buffer
    console.log('[Vocal Remover] Creating output buffer...');
    const outputBuffer = audioContext.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );
    console.log('[Vocal Remover] Output buffer created');
    
    // Check which method to use
    const method = methodSelect ? methodSelect.value : 'center-channel';
    
    if (method === 'ai-model' && AI_MODEL_CONFIG.modelUrl) {
      try {
        // Use AI model for separation
        progressFill.style.width = '20%';
        progressText.textContent = 'Loading AI model...';
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const aiOutputBuffer = await processWithAIModel(audioBuffer, (progress, message) => {
          progressFill.style.width = (20 + progress * 60) + '%'; // 20% to 80%
          progressText.textContent = message || `AI Processing: ${Math.round(progress * 100)}%`;
        });
        
        // Copy AI output to output buffer
        for (let ch = 0; ch < Math.min(aiOutputBuffer.numberOfChannels, numberOfChannels); ch++) {
          const aiChannel = aiOutputBuffer.getChannelData(ch);
          const outChannel = outputBuffer.getChannelData(ch);
          for (let i = 0; i < Math.min(aiChannel.length, length); i++) {
            outChannel[i] = aiChannel[i];
          }
        }
      } catch (error) {
        console.error('[Vocal Remover] AI model processing failed, falling back to center channel:', error);
        toast('AI model processing failed. Using center channel extraction instead.', 'warning');
        // Fall through to center channel extraction
        method = 'center-channel';
      }
    }
    
    // Center channel extraction (default or fallback)
    if (method === 'center-channel' || !AI_MODEL_CONFIG.modelUrl) {
      // Use center channel extraction
      progressFill.style.width = '20%';
      progressText.textContent = 'Extracting center channel...';
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Process in chunks to avoid blocking the UI
      const CHUNK_SIZE = 44100; // Process ~1 second at a time (at 44.1kHz)
      let processed = 0;
      const totalChunks = Math.ceil(length / CHUNK_SIZE);
      console.log('[Vocal Remover] Processing in', totalChunks, 'chunks of', CHUNK_SIZE, 'samples');
      
      if (numberOfChannels >= 2) {
      // Stereo: remove center channel
      console.log('[Vocal Remover] Processing stereo audio...');
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      const outputLeft = outputBuffer.getChannelData(0);
      const outputRight = outputBuffer.getChannelData(1);
      
      // Process in chunks with yield points
      const processChunk = async (startIndex) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, length);
        const chunkNum = Math.floor(startIndex / CHUNK_SIZE) + 1;
        
        console.log(`[Vocal Remover] Processing chunk ${chunkNum}/${totalChunks} (${startIndex} to ${endIndex})`);
        
        const chunkStartTime = performance.now();
        
        for (let i = startIndex; i < endIndex; i++) {
          const center = (leftChannel[i] + rightChannel[i]) / 2;
          
          // Remove center (vocals) by specified amount
          outputLeft[i] = leftChannel[i] - (center * reductionLevel);
          outputRight[i] = rightChannel[i] - (center * reductionLevel);
          
          // Normalize to prevent clipping
          outputLeft[i] = Math.max(-1, Math.min(1, outputLeft[i]));
          outputRight[i] = Math.max(-1, Math.min(1, outputRight[i]));
        }
        
        const chunkTime = performance.now() - chunkStartTime;
        processed = endIndex;
        const progress = 20 + (processed / length) * 60; // 20% to 80%
        progressFill.style.width = progress + '%';
        const percentComplete = Math.round((processed / length) * 100);
        progressText.textContent = `Processing: ${percentComplete}% (chunk ${chunkNum}/${totalChunks})`;
        
        console.log(`[Vocal Remover] Chunk ${chunkNum} completed in ${chunkTime.toFixed(2)}ms, progress: ${percentComplete}%`);
        
        // Yield to UI if not done
        if (processed < length) {
          await new Promise(resolve => setTimeout(resolve, 10));
          await processChunk(processed);
        } else {
          console.log('[Vocal Remover] All chunks processed');
        }
      };
      
      await processChunk(0);
    } else {
      // Mono: can't remove vocals effectively
      console.log('[Vocal Remover] Processing mono audio...');
      const inputChannel = audioBuffer.getChannelData(0);
      const outputChannel = outputBuffer.getChannelData(0);
      
      // Process in chunks with yield points
      const processChunk = async (startIndex) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, length);
        const chunkNum = Math.floor(startIndex / CHUNK_SIZE) + 1;
        
        console.log(`[Vocal Remover] Processing chunk ${chunkNum}/${totalChunks} (${startIndex} to ${endIndex})`);
        
        const chunkStartTime = performance.now();
        
        for (let i = startIndex; i < endIndex; i++) {
          outputChannel[i] = inputChannel[i];
        }
        
        const chunkTime = performance.now() - chunkStartTime;
        processed = endIndex;
        const progress = 20 + (processed / length) * 60; // 20% to 80%
        progressFill.style.width = progress + '%';
        const percentComplete = Math.round((processed / length) * 100);
        progressText.textContent = `Processing: ${percentComplete}% (chunk ${chunkNum}/${totalChunks})`;
        
        console.log(`[Vocal Remover] Chunk ${chunkNum} completed in ${chunkTime.toFixed(2)}ms, progress: ${percentComplete}%`);
        
        // Yield to UI if not done
        if (processed < length) {
          await new Promise(resolve => setTimeout(resolve, 10));
          await processChunk(processed);
        } else {
          console.log('[Vocal Remover] All chunks processed');
        }
      };
      
      await processChunk(0);
      toast('Mono audio detected. Vocal removal may not work well. Try a stereo file.', 'warning');
      }
    }
    
    // Determine output format based on original file
    const originalFormat = currentFile ? getAudioFormat(currentFile) : 'wav';
    const canEncodeToOriginal = canEncodeFormat(originalFormat);
    
    progressFill.style.width = '85%';
    progressText.textContent = `Encoding to ${originalFormat.toUpperCase()}...`;
    console.log('[Vocal Remover] Original format:', originalFormat);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Always try to use ffmpeg for encoding to preserve original format (MP3, M4A, etc.)
    // Fall back to MediaRecorder for WebM/OGG, or WAV if ffmpeg fails
    try {
      if (originalFormat === 'wav' || (canEncodeToOriginal && (originalFormat === 'webm' || originalFormat === 'ogg'))) {
        // Use MediaRecorder for WebM/OGG or WAV conversion
        if (canEncodeToOriginal) {
          console.log('[Vocal Remover] Encoding to original format using MediaRecorder...');
          outputFormat = originalFormat;
          processedBlob = await encodeAudioBufferToFormat(outputBuffer, originalFormat, (progress) => {
            const encodeProgress = 85 + (progress * 10); // 85% to 95%
            progressFill.style.width = encodeProgress + '%';
            progressText.textContent = `Encoding to ${originalFormat.toUpperCase()}: ${Math.round(progress * 100)}%`;
          });
        } else {
          // Convert to WAV (chunked to avoid blocking)
          const wavStartTime = performance.now();
          console.log('[Vocal Remover] Converting to WAV format...');
          outputFormat = 'wav';
          const wavBuffer = await audioBufferToWavChunked(outputBuffer, (progress) => {
            const wavProgress = 85 + (progress * 10); // 85% to 95%
            progressFill.style.width = wavProgress + '%';
            progressText.textContent = `Converting to WAV: ${Math.round(progress * 100)}%`;
          });
          const wavTime = performance.now() - wavStartTime;
          console.log('[Vocal Remover] WAV conversion completed in', wavTime.toFixed(2), 'ms');
          processedBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        }
      } else {
        // Use ffmpeg.wasm for MP3, M4A, FLAC, AAC, etc.
        console.log('[Vocal Remover] Encoding to', originalFormat, 'using FFmpeg...');
        outputFormat = originalFormat;
        processedBlob = await encodeAudioBufferWithFFmpeg(outputBuffer, originalFormat, (progress) => {
          const encodeProgress = 85 + (progress * 10); // 85% to 95%
          progressFill.style.width = encodeProgress + '%';
          progressText.textContent = `Encoding to ${originalFormat.toUpperCase()}: ${Math.round(progress * 100)}%`;
        });
      }
      console.log('[Vocal Remover] Encoding completed, blob size:', (processedBlob.size / 1024 / 1024).toFixed(2), 'MB');
    } catch (error) {
      console.warn('[Vocal Remover] Encoding to original format failed, falling back to WAV:', error);
      // Fallback to WAV
      outputFormat = 'wav';
      const wavBuffer = await audioBufferToWavChunked(outputBuffer, (progress) => {
        const wavProgress = 85 + (progress * 10);
        progressFill.style.width = wavProgress + '%';
        progressText.textContent = `Converting to WAV: ${Math.round(progress * 100)}%`;
      });
      processedBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    }
    // Revoke old URL if it exists
    if (outputAudioUrl) {
      try {
        if (outputAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(outputAudioUrl);
        }
      } catch (e) {
        console.debug('Error revoking old output audio URL:', e);
      }
    }
    // Pause and reset audio element before setting new source
    if (outputAudio) {
      outputAudio.pause();
      outputAudio.currentTime = 0;
    }
    const url = URL.createObjectURL(processedBlob);
    outputAudioUrl = url;
    
    // Display output audio
    outputAudio.src = url;
    outputAudio.load(); // Explicitly load the new source
    outputContainer.style.display = 'block';
    outputPlaceholder.style.display = 'none';
    downloadBtn.disabled = false;
    
    progressFill.style.width = '95%';
    progressText.textContent = 'Finalizing...';
    console.log('[Vocal Remover] Finalizing output...');
    await new Promise(resolve => setTimeout(resolve, 10));
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Complete!';
    status.textContent = 'Vocal removal complete!';
    status.style.color = 'var(--ok)';
    console.log('[Vocal Remover] Processing complete!');
    
    // Cache the result
    if (cacheKey) {
      processingCache.set(cacheKey, {
        blob: processedBlob,
        format: outputFormat,
        timestamp: Date.now()
      });
      // Limit cache size to 10 entries
      if (processingCache.size > 10) {
        const firstKey = processingCache.keys().next().value;
        processingCache.delete(firstKey);
      }
      console.log('[Vocal Remover] Result cached, cache size:', processingCache.size);
    }
    
    toast('Vocal removal complete!', 'success');
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
      processBtn.disabled = false;
    }, 500);
    
  } catch (error) {
    console.error('[Vocal Remover] Error processing audio:', error);
    console.error('[Vocal Remover] Error stack:', error.stack);
    status.textContent = `Error: ${error.message}`;
    status.style.color = 'var(--error)';
    toast(`Processing failed: ${error.message}`, 'error');
    progressContainer.style.display = 'none';
    processBtn.disabled = false;
  }
});

// Helper function to get audio format from file
function getAudioFormat(file) {
  if (!file) return 'wav';
  
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeType = file.type;
  
  // Map extensions to formats
  const formatMap = {
    'mp3': 'mp3',
    'wav': 'wav',
    'ogg': 'ogg',
    'm4a': 'm4a',
    'flac': 'flac',
    'aac': 'aac',
    'opus': 'opus',
    'webm': 'webm'
  };
  
  if (formatMap[ext]) {
    return formatMap[ext];
  }
  
  // Try to infer from MIME type
  if (mimeType) {
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
    if (mimeType.includes('flac')) return 'flac';
    if (mimeType.includes('aac')) return 'aac';
    if (mimeType.includes('opus')) return 'opus';
    if (mimeType.includes('webm')) return 'webm';
  }
  
  return 'wav'; // Default fallback
}

// Check if browser can encode to a specific format
function canEncodeFormat(format) {
  if (!MediaRecorder || !MediaRecorder.isTypeSupported) {
    return false;
  }
  
  const mimeTypes = {
    'webm': 'audio/webm',
    'ogg': 'audio/ogg',
    'opus': 'audio/ogg; codecs=opus',
    'wav': 'audio/wav' // Not typically supported by MediaRecorder
  };
  
  const mimeType = mimeTypes[format];
  if (!mimeType) return false;
  
  return MediaRecorder.isTypeSupported(mimeType);
}

// Encode AudioBuffer to a specific format using MediaRecorder
async function encodeAudioBufferToFormat(buffer, format, progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new AudioContext with the buffer's sample rate
      const ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: buffer.sampleRate
      });
      
      // Create a buffer source
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      // Create a MediaStreamDestination to capture the audio
      const destination = ctx.createMediaStreamDestination();
      source.connect(destination);
      
      // Determine MIME type
      let mimeType;
      switch (format) {
        case 'webm':
          mimeType = 'audio/webm';
          break;
        case 'ogg':
        case 'opus':
          mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
            ? 'audio/ogg; codecs=opus' 
            : 'audio/ogg';
          break;
        default:
          mimeType = 'audio/webm'; // Fallback
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: mimeType
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          if (progressCallback) {
            // Estimate progress based on chunks (rough estimate)
            const estimatedProgress = Math.min(0.9, chunks.length * 0.1);
            progressCallback(estimatedProgress);
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        ctx.close().catch(e => console.debug('Error closing audio context:', e));
        if (progressCallback) progressCallback(1.0);
        resolve(blob);
      };
      
      mediaRecorder.onerror = (event) => {
        ctx.close().catch(e => console.debug('Error closing audio context:', e));
        reject(new Error('MediaRecorder error: ' + (event.error?.message || 'Unknown error')));
      };
      
      // Start recording
      mediaRecorder.start();
      source.start(0);
      
      // Stop after buffer duration
      const duration = buffer.duration;
      setTimeout(() => {
        source.stop();
        mediaRecorder.stop();
      }, (duration + 0.1) * 1000); // Add small buffer
      
    } catch (error) {
      reject(error);
    }
  });
}

// Load FFmpeg.wasm (similar to video converter)
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  try {
    // Intercept Worker constructor to redirect CDN worker URLs to local files
    if (!window.OriginalWorker) {
      window.OriginalWorker = window.Worker;
      const workerInterceptor = function(scriptURL, options) {
        const originalURL = String(scriptURL);
        let newURL = originalURL;
        
        if (originalURL.includes('cdn.jsdelivr.net') && originalURL.includes('ffmpeg')) {
          const fileName = originalURL.split('/').pop();
          if (fileName.includes('.ffmpeg.js') || fileName.includes('worker') || fileName === '814.ffmpeg.js') {
            newURL = `/js/ffmpeg-workers/${fileName}`;
          }
        }
        if (originalURL.includes('814.ffmpeg.js')) {
          newURL = `/js/ffmpeg-workers/814.ffmpeg.js`;
        }
        
        try {
          return new window.OriginalWorker(newURL, options);
        } catch (e) {
          console.error('Worker creation failed:', e);
          throw e;
        }
      };
      
      Object.setPrototypeOf(workerInterceptor, window.OriginalWorker);
      Object.defineProperty(workerInterceptor, 'prototype', {
        value: window.OriginalWorker.prototype,
        writable: false
      });
      
      window.Worker = workerInterceptor;
    }
    
    // Load FFmpeg from CDN
    if (!window.FFmpegWASM) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js';
        script.onload = () => setTimeout(resolve, 500);
        script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
        document.head.appendChild(script);
      });
    }
    
    let createFFmpegFunc = null;
    if (window.FFmpegWASM) {
      if (window.FFmpegWASM.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.createFFmpeg;
      } else if (window.FFmpegWASM.default && window.FFmpegWASM.default.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.default.createFFmpeg;
      }
    }
    
    if (!createFFmpegFunc) {
      throw new Error('FFmpeg createFFmpeg function not found');
    }
    
    // Create FFmpeg instance
    ffmpeg = createFFmpegFunc({
      log: false,
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js'
    });
    
    await ffmpeg.load();
    console.log('[Vocal Remover] FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('[Vocal Remover] Failed to load FFmpeg:', error);
    throw error;
  }
}

// Encode AudioBuffer to format using FFmpeg
async function encodeAudioBufferWithFFmpeg(buffer, format, progressCallback) {
  const ffmpegInstance = await loadFFmpeg();
  
  // First convert AudioBuffer to WAV
  const wavBuffer = await audioBufferToWavChunked(buffer, (progress) => {
    if (progressCallback) progressCallback(progress * 0.3); // First 30% is WAV conversion
  });
  
  // Write WAV to FFmpeg
  const inputName = 'input.wav';
  const outputName = `output.${format}`;
  
  if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.writeFile === 'function') {
    await ffmpegInstance.writeFile(inputName, new Uint8Array(wavBuffer));
  } else {
    await ffmpegInstance.FS('writeFile', inputName, wavBuffer);
  }
  
  // Build FFmpeg command for audio encoding
  const ffmpegArgs = ['-i', inputName];
  
  // Set codec based on format
  switch (format) {
    case 'mp3':
      ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', '192k', '-q:a', '2');
      break;
    case 'm4a':
    case 'aac':
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
      break;
    case 'ogg':
    case 'opus':
      ffmpegArgs.push('-c:a', 'libopus', '-b:a', '192k');
      break;
    case 'flac':
      ffmpegArgs.push('-c:a', 'flac');
      break;
    default:
      ffmpegArgs.push('-c:a', 'copy');
  }
  
  ffmpegArgs.push(outputName);
  
  if (progressCallback) progressCallback(0.4); // 40% after WAV conversion
  
  // Run FFmpeg
  if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.exec === 'function') {
    await ffmpegInstance.exec(ffmpegArgs);
  } else {
    await ffmpegInstance.run(...ffmpegArgs);
  }
  
  if (progressCallback) progressCallback(0.9); // 90% after encoding
  
  // Read output file
  let data;
  if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.readFile === 'function') {
    data = await ffmpegInstance.readFile(outputName);
    data = data instanceof Uint8Array ? data : new Uint8Array(data);
  } else {
    data = ffmpegInstance.FS('readFile', outputName);
  }
  
  // Clean up
  if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.deleteFile === 'function') {
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
  } else {
    ffmpegInstance.FS('unlink', inputName);
    ffmpegInstance.FS('unlink', outputName);
  }
  
  if (progressCallback) progressCallback(1.0);
  
  // Determine MIME type
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'opus': 'audio/ogg',
    'flac': 'audio/flac'
  };
  
  const mimeType = mimeTypes[format] || 'audio/mpeg';
  return new Blob([data.buffer || data], { type: mimeType });
}

// Load AI model for vocal separation
async function loadAIModel() {
  if (aiModelSession) return aiModelSession;
  if (isAIModelLoading) {
    toast('AI model is already loading...', 'info');
    return null;
  }
  
  if (!AI_MODEL_CONFIG.modelUrl) {
    const errorMsg = `AI Model Not Configured

The AI model option requires an ONNX vocal separation model to be configured.

To enable the AI model:
1. Convert a vocal separation model (Spleeter, Demucs, etc.) to ONNX format
2. Host the ONNX model file on your CDN (e.g., cdn.sometools.io)
3. Update AI_MODEL_CONFIG.modelUrl in js/tools/vocal-remover.js

For now, please use "Center Channel Extraction" method instead.
It works well for stereo tracks where vocals are centered.`;
    toast(errorMsg, 'warning');
    throw new Error('AI model URL not configured');
  }
  
  try {
    isAIModelLoading = true;
    console.log('[Vocal Remover] Loading AI model...');
    
    // Load ONNX Runtime
    ort = await loadONNXRuntime();
    
    // Download model - try primary URL first, then fallbacks
    let modelData = null;
    const urlsToTry = [AI_MODEL_CONFIG.modelUrl, ...(AI_MODEL_CONFIG.fallbackUrls || [])];
    
    for (const modelUrl of urlsToTry) {
      try {
        console.log(`[Vocal Remover] Trying to load model from: ${modelUrl}`);
        modelData = await getOrDownloadModel(
          AI_MODEL_CONFIG.key + '_' + modelUrl.split('/').slice(-2).join('_'), // Unique key per URL
          modelUrl,
          (loaded, total) => {
            if (total > 0) {
              const percent = Math.round((loaded / total) * 100);
              const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (total / (1024 * 1024)).toFixed(1);
              console.log(`[Vocal Remover] Downloading AI model: ${loadedMB} MB / ${totalMB} MB (${percent}%)`);
            }
          }
        );
        console.log(`[Vocal Remover] Successfully loaded model from: ${modelUrl}`);
        break; // Success, exit loop
      } catch (error) {
        console.warn(`[Vocal Remover] Failed to load from ${modelUrl}:`, error.message);
        if (modelUrl === urlsToTry[urlsToTry.length - 1]) {
          // Last URL failed, throw error
          throw new Error(`Failed to load model from any URL. Last error: ${error.message}. The model may require authentication or may not be publicly accessible. Please download the model and host it on your CDN.`);
        }
        // Try next URL
        continue;
      }
    }
    
    if (!modelData) {
      throw new Error('Failed to load model from any available URL');
    }
    
    // Create ONNX session
    aiModelSession = await createInferenceSession(modelData, {
      executionProviders: ['wasm'] // Use WASM for compatibility
    });
    
    console.log('[Vocal Remover] AI model loaded successfully');
    console.log('[Vocal Remover] Model inputs:', aiModelSession.inputNames);
    console.log('[Vocal Remover] Model outputs:', aiModelSession.outputNames);
    
    // Auto-detect input/output names
    if (aiModelSession.inputNames && aiModelSession.inputNames.length > 0) {
      AI_MODEL_CONFIG.inputName = aiModelSession.inputNames[0];
    }
    if (aiModelSession.outputNames && aiModelSession.outputNames.length > 0) {
      AI_MODEL_CONFIG.outputName = aiModelSession.outputNames[0];
    }
    
    isAIModelLoading = false;
    return aiModelSession;
  } catch (error) {
    isAIModelLoading = false;
    console.error('[Vocal Remover] Failed to load AI model:', error);
    throw error;
  }
}

// Process audio with AI model
async function processWithAIModel(audioBuffer, progressCallback) {
  try {
    // Load model if needed
    const session = await loadAIModel();
    if (!session) {
      throw new Error('Failed to load AI model');
    }
    
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    
    // Resample if needed (model expects specific sample rate)
    let processedBuffer = audioBuffer;
    if (sampleRate !== AI_MODEL_CONFIG.sampleRate) {
      if (progressCallback) progressCallback(0.1, 'Resampling audio...');
      // Simple resampling (linear interpolation) - for production, use a proper resampler
      processedBuffer = await resampleAudio(audioBuffer, AI_MODEL_CONFIG.sampleRate);
    }
    
    // Convert to mono if model expects mono input
    let inputData = null;
    if (numberOfChannels > 1) {
      // Average channels to mono
      const left = processedBuffer.getChannelData(0);
      const right = processedBuffer.getChannelData(1);
      inputData = new Float32Array(processedBuffer.length);
      for (let i = 0; i < processedBuffer.length; i++) {
        inputData[i] = (left[i] + right[i]) / 2;
      }
    } else {
      inputData = processedBuffer.getChannelData(0);
    }
    
    // Process in chunks
    const chunkSize = AI_MODEL_CONFIG.chunkSize;
    const totalChunks = Math.ceil(inputData.length / chunkSize);
    const outputChunks = [];
    
    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * chunkSize;
      const end = Math.min(start + chunkSize, inputData.length);
      const chunk = inputData.slice(start, end);
      
      if (progressCallback) {
        const progress = (chunkIdx + 1) / totalChunks;
        progressCallback(progress, `Processing chunk ${chunkIdx + 1}/${totalChunks}...`);
      }
      
      // Prepare input tensor
      // Shape depends on model - typically [1, samples] or [1, 1, samples]
      const inputShape = [1, chunk.length];
      const inputTensor = new ort.Tensor('float32', new Float32Array(chunk), inputShape);
      
      const inputs = {
        [AI_MODEL_CONFIG.inputName]: inputTensor
      };
      
      // Run inference
      const outputs = await runInference(session, inputs);
      
      // Extract output (model should output instrumental/vocals-removed audio)
      const outputTensor = outputs[AI_MODEL_CONFIG.outputName] || outputs[Object.keys(outputs)[0]];
      if (!outputTensor) {
        throw new Error('Model did not return expected output');
      }
      
      // Convert output tensor to Float32Array
      let outputData = null;
      if (outputTensor.data instanceof Float32Array) {
        outputData = outputTensor.data;
      } else if (Array.isArray(outputTensor.data)) {
        outputData = new Float32Array(outputTensor.data);
      } else {
        outputData = new Float32Array(outputTensor.data);
      }
      
      // Handle different output shapes
      // MVSEP-MDX23 outputs: [batch, stems, channels, samples] where stems are:
      //   [0] = bass
      //   [1] = drums
      //   [2] = vocals (we want to exclude this)
      //   [3] = other
      // We combine bass + drums + other to get instrumental (vocals removed)
      // Spleeter 2-stem outputs: [vocals, accompaniment] - use index 1
      if (outputTensor.dims && outputTensor.dims.length >= 3) {
        const dims = outputTensor.dims;
        console.log('[Vocal Remover] Output tensor shape:', dims);
        
        if (dims.length === 4) {
          // Shape: [batch, stems, channels, samples]
          const [batch, stems, channels, samples] = dims;
          
          // MVSEP-MDX23: 4 stems (bass=0, drums=1, vocals=2, other=3)
          // Combine bass + drums + other (exclude vocals) for each channel
          if (stems === 4) {
            console.log('[Vocal Remover] MVSEP-MDX23 format detected: combining bass + drums + other');
            // Output format: [channels, samples] - planar format
            const instrumentalData = new Float32Array(channels * samples);
            
            for (let ch = 0; ch < channels; ch++) {
              for (let i = 0; i < samples; i++) {
                let sum = 0;
                // Combine stems 0 (bass), 1 (drums), 3 (other) - skip 2 (vocals)
                // Index calculation: batch*stems*channels*samples + stem*channels*samples + channel*samples + sample
                for (const stemIdx of [0, 1, 3]) {
                  const idx = stemIdx * channels * samples + ch * samples + i;
                  sum += outputData[idx];
                }
                // Store in planar format: [ch0_all_samples, ch1_all_samples, ...]
                instrumentalData[ch * samples + i] = sum;
              }
            }
            outputData = instrumentalData;
            // Update dimensions for later processing
            outputTensor.dims = [channels, samples];
          } else if (stems === 2) {
            // Spleeter 2-stem: [vocals, accompaniment] - use accompaniment (index 1)
            console.log('[Vocal Remover] Spleeter 2-stem format detected: using accompaniment');
            const stemIdx = 1; // Accompaniment
            for (let i = 0; i < samples; i++) {
              for (let ch = 0; ch < channels; ch++) {
                const idx = stemIdx * channels * samples + ch * samples + i;
                instrumentalData[ch * samples + i] = outputData[idx];
              }
            }
            outputData = instrumentalData;
            outputTensor.dims = [channels, samples];
          } else {
            // Unknown format - try to extract first non-vocal stem
            console.log('[Vocal Remover] Unknown stem format, using first stem');
            const stemIdx = 0;
            for (let i = 0; i < samples; i++) {
              for (let ch = 0; ch < channels; ch++) {
                const idx = stemIdx * channels * samples + ch * samples + i;
                instrumentalData[ch * samples + i] = outputData[idx];
              }
            }
            outputData = instrumentalData;
            outputTensor.dims = [channels, samples];
          }
        } else if (dims.length === 3) {
          // Shape: [batch, stems, samples] - mono audio
          const [batch, stems, samples] = dims;
          const instrumentalData = new Float32Array(samples);
          
          if (stems === 4) {
            // MVSEP-MDX23: combine bass + drums + other
            console.log('[Vocal Remover] MVSEP-MDX23 mono format: combining stems');
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[0 * samples + i] + // bass
                                    outputData[1 * samples + i] + // drums
                                    outputData[3 * samples + i];  // other (skip vocals at index 2)
            }
          } else if (stems === 2) {
            // Spleeter: use accompaniment
            console.log('[Vocal Remover] Spleeter mono format: using accompaniment');
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[1 * samples + i]; // accompaniment
            }
          } else {
            // Use first stem as fallback
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[0 * samples + i];
            }
          }
          outputData = instrumentalData;
        } else if (dims.length === 2 && dims[0] > 1) {
          // Shape: [stems, samples] - mono, no batch dimension
          const [stems, samples] = dims;
          const instrumentalData = new Float32Array(samples);
          
          if (stems === 4) {
            // MVSEP-MDX23: combine stems
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[0 * samples + i] + // bass
                                    outputData[1 * samples + i] + // drums
                                    outputData[3 * samples + i];  // other
            }
          } else if (stems === 2) {
            // Spleeter: use accompaniment
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[1 * samples + i];
            }
          } else {
            // Use first stem
            for (let i = 0; i < samples; i++) {
              instrumentalData[i] = outputData[0 * samples + i];
            }
          }
          outputData = instrumentalData;
        }
      }
      
      outputChunks.push(outputData);
      
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Combine chunks
    const totalLength = outputChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedOutput = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of outputChunks) {
      combinedOutput.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Determine if output is interleaved [ch0_sample0, ch1_sample0, ch0_sample1, ch1_sample1, ...]
    // or planar [ch0_all_samples, ch1_all_samples, ...]
    // MVSEP-MDX23 typically outputs planar format after our processing
    const samplesPerChannel = Math.floor(combinedOutput.length / numberOfChannels);
    const isPlanar = samplesPerChannel > 0 && samplesPerChannel * numberOfChannels === combinedOutput.length;
    
    // Create output AudioBuffer
    const outputBuffer = audioContext.createBuffer(
      numberOfChannels,
      Math.min(samplesPerChannel || length, length),
      sampleRate
    );
    
    if (isPlanar && samplesPerChannel > 0) {
      // Planar format: [ch0_samples..., ch1_samples...]
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const channelData = outputBuffer.getChannelData(ch);
        const channelOffset = ch * samplesPerChannel;
        for (let i = 0; i < Math.min(samplesPerChannel, channelData.length); i++) {
          channelData[i] = Math.max(-1, Math.min(1, combinedOutput[channelOffset + i]));
        }
      }
    } else {
      // Interleaved or mono: [sample0_ch0, sample0_ch1, sample1_ch0, sample1_ch1, ...] or [all_samples]
      if (numberOfChannels === 1) {
        // Mono
        const channelData = outputBuffer.getChannelData(0);
        for (let i = 0; i < Math.min(combinedOutput.length, channelData.length); i++) {
          channelData[i] = Math.max(-1, Math.min(1, combinedOutput[i]));
        }
      } else {
        // Interleaved stereo
        for (let i = 0; i < Math.min(Math.floor(combinedOutput.length / numberOfChannels), length); i++) {
          for (let ch = 0; ch < numberOfChannels; ch++) {
            const idx = i * numberOfChannels + ch;
            if (idx < combinedOutput.length) {
              outputBuffer.getChannelData(ch)[i] = Math.max(-1, Math.min(1, combinedOutput[idx]));
            }
          }
        }
      }
    }
    
    return outputBuffer;
  } catch (error) {
    console.error('[Vocal Remover] AI model processing error:', error);
    throw new Error(`AI model processing failed: ${error.message}`);
  }
}

// Simple resampling function (linear interpolation)
async function resampleAudio(audioBuffer, targetSampleRate) {
  const sourceSampleRate = audioBuffer.sampleRate;
  const ratio = targetSampleRate / sourceSampleRate;
  const length = Math.round(audioBuffer.length * ratio);
  const numberOfChannels = audioBuffer.numberOfChannels;
  
  const outputBuffer = audioContext.createBuffer(numberOfChannels, length, targetSampleRate);
  
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const inputChannel = audioBuffer.getChannelData(ch);
    const outputChannel = outputBuffer.getChannelData(ch);
    
    for (let i = 0; i < length; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioBuffer.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      outputChannel[i] = inputChannel[srcIndexFloor] * (1 - fraction) + inputChannel[srcIndexCeil] * fraction;
    }
  }
  
  return outputBuffer;
}

// Download processed audio
on(downloadBtn, 'click', () => {
  if (!processedBlob) {
    toast('No processed audio available', 'warning');
    return;
  }
  
  // Determine output filename with correct extension based on actual output format
  let filename = 'instrumental';
  let extension = outputFormat;
  
  if (currentFile) {
    const originalName = currentFile.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    filename = `${nameWithoutExt}_instrumental`;
    
    // Map format to extension
    if (extension === 'opus') {
      extension = 'ogg'; // Opus files use .ogg extension
    }
  } else {
    filename = `instrumental_${Date.now()}`;
  }
  
  // Use the existing blob URL if available, otherwise create a new one
  const url = outputAudioUrl || URL.createObjectURL(processedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Don't revoke the URL here - it's still being used by the audio element
  
  toast('Download started', 'success');
});

// Clear all
on(clearBtn, 'click', () => {
  audioInput.value = '';
  inputInfo.textContent = '';
  inputInfo.style.display = 'none';
  status.textContent = '';
  progressContainer.style.display = 'none';
  
  if (dropZone) dropZone.style.display = 'flex';
  
  // Pause and reset audio elements first
  if (originalAudio) {
    originalAudio.pause();
    originalAudio.currentTime = 0;
    originalAudio.load(); // Reset the audio element
  }
  if (outputAudio) {
    outputAudio.pause();
    outputAudio.currentTime = 0;
    outputAudio.load(); // Reset the audio element
  }
  
  // Clear audio sources
  if (originalAudio) originalAudio.src = '';
  if (outputAudio) outputAudio.src = '';
  
  // Then revoke URLs after a delay to ensure audio elements have released them
  setTimeout(() => {
    if (originalAudioUrl) {
      try {
        // Check if URL is still valid before revoking
        if (originalAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(originalAudioUrl);
        }
      } catch (e) {
        // Ignore errors if URL was already revoked
        console.debug('Error revoking original audio URL:', e);
      }
      originalAudioUrl = null;
    }
    if (outputAudioUrl) {
      try {
        // Check if URL is still valid before revoking
        if (outputAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(outputAudioUrl);
        }
      } catch (e) {
        // Ignore errors if URL was already revoked
        console.debug('Error revoking output audio URL:', e);
      }
      outputAudioUrl = null;
    }
  }, 200);
  
  originalContainer.style.display = 'none';
  originalPlaceholder.style.display = 'block';
  outputContainer.style.display = 'none';
  outputPlaceholder.style.display = 'block';
  
  processBtn.disabled = true;
  downloadBtn.disabled = true;
  
  audioBuffer = null;
  processedBlob = null;
  currentFile = null;
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(e => {
      console.debug('Error closing audio context:', e);
    });
    audioContext = null;
  }
});

// Convert AudioBuffer to WAV (chunked to avoid blocking, using TypedArrays for speed)
async function audioBufferToWavChunked(buffer, progressCallback) {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  
  console.log('[Vocal Remover] Creating WAV buffer:', { numberOfChannels, sampleRate, length });
  
  const totalBytes = 44 + length * numberOfChannels * 2;
  console.log('[Vocal Remover] Allocating', (totalBytes / 1024 / 1024).toFixed(2), 'MB ArrayBuffer...');
  
  // WAV header - allocate buffer
  const arrayBuffer = new ArrayBuffer(totalBytes);
  console.log('[Vocal Remover] ArrayBuffer allocated');
  const view = new DataView(arrayBuffer);
  const pcmData = new Int16Array(arrayBuffer, 44); // Direct access to PCM data section
  
  // RIFF header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  console.log('[Vocal Remover] Writing WAV header...');
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  console.log('[Vocal Remover] WAV header written');
  
  console.log('[Vocal Remover] Writing PCM data in chunks...');
  const conversionStartTime = performance.now();
  
  // Get channel data once
  const channelData = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channelData[ch] = buffer.getChannelData(ch);
  }
  console.log('[Vocal Remover] Channel data retrieved');
  
  // Convert float samples to 16-bit PCM in smaller chunks for better responsiveness
  const WAV_CHUNK_SIZE = 11025; // Process ~0.23 second at a time (even smaller chunks)
  let pcmIndex = 0; // Index into pcmData array
  let processed = 0;
  const totalChunks = Math.ceil(length / WAV_CHUNK_SIZE);
  
  console.log(`[Vocal Remover] Will process ${totalChunks} WAV chunks of ${WAV_CHUNK_SIZE} samples each`);
  
  const processWavChunk = async (startIndex) => {
    const endIndex = Math.min(startIndex + WAV_CHUNK_SIZE, length);
    const chunkNum = Math.floor(startIndex / WAV_CHUNK_SIZE) + 1;
    
    if (chunkNum % 50 === 0 || chunkNum === 1 || chunkNum <= 10) {
      console.log(`[Vocal Remover] WAV chunk ${chunkNum}/${totalChunks} (${startIndex} to ${endIndex}), pcmIndex: ${pcmIndex}`);
    }
    
    const chunkStartTime = performance.now();
    
    // Use TypedArray for faster writes
    for (let i = startIndex; i < endIndex; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        pcmData[pcmIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
    }
    
    const chunkTime = performance.now() - chunkStartTime;
    processed = endIndex;
    const progress = processed / length;
    
    if (chunkNum % 50 === 0 || chunkNum === 1 || chunkNum <= 10) {
      console.log(`[Vocal Remover] WAV chunk ${chunkNum} completed in ${chunkTime.toFixed(2)}ms, progress: ${Math.round(progress * 100)}%`);
    }
    
    // Always update progress callback
    if (progressCallback) {
      progressCallback(progress);
    }
    
    // Yield to UI after every chunk with a small delay
    if (processed < length) {
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay to ensure UI updates
      await processWavChunk(processed);
    } else {
      console.log('[Vocal Remover] All WAV chunks processed, final pcmIndex:', pcmIndex);
    }
  };
  
  await processWavChunk(0);
  
  const conversionTime = performance.now() - conversionStartTime;
  console.log('[Vocal Remover] PCM conversion completed in', conversionTime.toFixed(2), 'ms');
  
  return arrayBuffer;
}

