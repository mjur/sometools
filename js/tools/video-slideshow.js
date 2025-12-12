// Video Slideshow Generator
// Combines AI image generation, text-to-speech, and FFmpeg to create video slideshows

import { toast, on, qs } from '/js/ui.js';
import { loadONNXRuntime } from '/js/utils/onnx-loader.js';

// UI Elements
const textInput = qs('#text-input');
const splitModeSelect = qs('#split-mode');
const imageModelSelect = qs('#image-model');
const voiceSelect = qs('#voice-select');
const videoResolutionSelect = qs('#video-resolution');
const generateBtn = qs('#generate-btn');
const abortBtn = qs('#abort-btn');
const clearBtn = qs('#clear-btn');
const downloadBtn = qs('#download-btn');
const output = qs('#output');
const progressContainer = qs('#progress-container');
const progressText = qs('#progress-text');
const progressPercent = qs('#progress-percent');
const progressBar = qs('#progress-bar');

// State
let imageClient = null;
let currentImageModel = null;
let kokoroJS = null;
let kokoroModel = null;
let ffmpeg = null;
let isGenerating = false;
let currentAbort = null;
let videoBlob = null;

// Progress helpers
function updateProgress(text, percent) {
  if (progressText) progressText.textContent = text || 'Processing...';
  
  // Ensure percent is a valid number
  let validPercent = 0;
  if (typeof percent === 'number' && isFinite(percent)) {
    validPercent = Math.max(0, Math.min(100, percent));
  }
  
  if (progressPercent) progressPercent.textContent = `${Math.round(validPercent)}%`;
  if (progressBar) progressBar.value = validPercent;
  if (progressContainer) progressContainer.style.display = 'block';
}

function hideProgress() {
  if (progressContainer) progressContainer.style.display = 'none';
}

// Load image generation library
async function loadImageLibrary() {
  if (window.Txt2ImgWorkerClient || window.WebTxt2ImgClient) {
    return window.Txt2ImgWorkerClient || window.WebTxt2ImgClient;
  }
  
  try {
    toast('Loading image generation library...', 'info');
    
    try {
      await import('/js/tools/bundled/web-txt2img-bundle.js');
      const Txt2ImgWorkerClient = window.Txt2ImgWorkerClient || window.WebTxt2ImgClient;
      
      if (Txt2ImgWorkerClient && typeof Txt2ImgWorkerClient === 'function') {
        toast('Image library loaded', 'success');
        return Txt2ImgWorkerClient;
      }
    } catch (e) {
      console.error('Bundled web-txt2img not available:', e);
    }
    
    throw new Error('Failed to load image generation library. Please run: npm install && npm run build');
  } catch (error) {
    console.error('Failed to load image library:', error);
    throw error;
  }
}

// Initialize image generation client
async function initImageClient() {
  const model = imageModelSelect.value;
  
  if (imageClient && currentImageModel === model) {
    return imageClient;
  }
  
  try {
    updateProgress('Loading image generation model...', 5);
    const Txt2ImgWorkerClient = await loadImageLibrary();
    
    // Create client using createDefault (same pattern as image-generate.js)
    if (!imageClient) {
      imageClient = Txt2ImgWorkerClient.createDefault();
      await imageClient.detect(); // Check capabilities
    }
    
    // Load the selected model
    updateProgress(`Loading ${model} model...`, 10);
    await imageClient.loadModel(model, {
      progress: (p) => {
        updateProgress(`Loading image model: ${p.phase || 'processing'}`, 10 + (p.pct || 0) * 0.25);
      }
    });
    
    currentImageModel = model;
    toast('Image model loaded', 'success');
    return imageClient;
  } catch (error) {
    toast(`Failed to load image model: ${error.message}`, 'error');
    throw error;
  }
}

// Load kokoro-js library
async function loadKokoroJS() {
  if (kokoroJS) return kokoroJS;
  
  try {
    const sources = [
      'https://esm.sh/kokoro-js@latest',
      'https://cdn.jsdelivr.net/npm/kokoro-js@latest/+esm',
      'https://unpkg.com/kokoro-js@latest?module'
    ];
    
    for (const url of sources) {
      try {
        const module = await import(/* @vite-ignore */ url);
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

// Load TTS (Kokoro)
async function loadTTS() {
  if (kokoroModel) return kokoroModel;
  
  try {
    updateProgress('Loading text-to-speech library...', 35);
    toast('Loading TTS library...', 'info');
    
    // Load kokoro-js library
    const KokoroTTS = await loadKokoroJS();
    
    if (!KokoroTTS) {
      throw new Error('kokoro-js not available');
    }
    
    updateProgress('Library loaded, detecting device...', 38);
    
    // Detect device (WebGPU preferred, fallback to WASM)
    let device = 'wasm';
    let dtype = 'q8';
    
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = 'webgpu';
          dtype = 'fp32';
        }
      } catch (e) {
        console.warn('WebGPU not available, using WASM:', e);
      }
    }
    
    updateProgress(`Loading Kokoro model (${device})... This may take a few minutes on first use.`, 40);
    toast(`Loading TTS model (${device})... This may take several minutes on first use.`, 'info');
    
    console.log('[Video Slideshow] Starting TTS model loading...');
    
    // Add periodic progress updates to show it's still working
    let progressCounter = 0;
    let progressInterval = setInterval(() => {
      progressCounter++;
      const messages = [
        'Downloading model files...',
        'Loading model weights...',
        'Initializing ONNX runtime...',
        'Preparing model for inference...',
        'Almost ready...'
      ];
      const message = messages[progressCounter % messages.length];
      const baseProgress = 40 + Math.min(20, progressCounter * 2);
      updateProgress(`Loading TTS model: ${message} (this may take several minutes)`, baseProgress);
      console.log(`[Video Slideshow] TTS loading progress update ${progressCounter}: ${message}`);
    }, 3000); // Update every 3 seconds
    
    // Add a timeout wrapper to detect if loading is stuck (10 minutes max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        clearInterval(progressInterval);
        reject(new Error('TTS model loading timed out after 10 minutes. Please try again or check your internet connection.'));
      }, 10 * 60 * 1000); // 10 minutes
    });
    
    const loadingPromise = KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      device,
      dtype,
      progress_callback: (progress) => {
        clearInterval(progressInterval); // Clear the periodic updates when real progress comes in
        progressInterval = null;
        
        // progress might be a number between 0-1, or an object with progress property
        let progressValue = 0;
        if (typeof progress === 'number' && isFinite(progress)) {
          progressValue = progress;
        } else if (progress && typeof progress.progress === 'number' && isFinite(progress.progress)) {
          progressValue = progress.progress;
        } else if (progress && typeof progress.ratio === 'number' && isFinite(progress.ratio)) {
          progressValue = progress.ratio;
        }
        
        const percent = Math.round(progressValue * 100);
        const baseProgress = 40;
        const maxProgress = 70;
        const calculatedProgress = baseProgress + (progressValue * (maxProgress - baseProgress));
        updateProgress(`Loading TTS model: ${percent}% (downloading/processing...)`, calculatedProgress);
        console.log(`[Video Slideshow] TTS model loading progress: ${percent}%`);
      }
    });
    
    try {
      kokoroModel = await Promise.race([loadingPromise, timeoutPromise]);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      console.log('[Video Slideshow] TTS model loaded successfully');
      toast('TTS model loaded', 'success');
      return kokoroModel;
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      console.error('[Video Slideshow] TTS model loading error:', error);
      throw error;
    }
  } catch (error) {
    toast(`Failed to load TTS: ${error.message}`, 'error');
    console.error('TTS loading error:', error);
    throw error;
  }
}

// Load FFmpeg
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  try {
    updateProgress('Loading FFmpeg...', 70);
    toast('Loading FFmpeg...', 'info');
    
    // Intercept Worker constructor
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
    
    // Check for FFmpeg class (new API)
    if (window.FFmpegWASM && window.FFmpegWASM.FFmpeg) {
      const { FFmpeg: FFmpegClass } = window.FFmpegWASM;
      ffmpeg = new FFmpegClass({
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js',
        log: true
      });
      ffmpeg.on('log', ({ message }) => console.log('FFmpeg:', message));
      ffmpeg.on('progress', ({ progress }) => {
        updateProgress('Assembling video...', 90 + progress * 10);
      });
      await ffmpeg.load();
      ffmpeg._useNewAPI = true;
    } else {
      // Try ESM import
      const { FFmpeg: FFmpegClass } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
      ffmpeg = new FFmpegClass({
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js',
        log: true
      });
      ffmpeg.on('log', ({ message }) => console.log('FFmpeg:', message));
      ffmpeg.on('progress', ({ progress }) => {
        updateProgress('Assembling video...', 90 + progress * 10);
      });
      await ffmpeg.load();
      ffmpeg._useNewAPI = true;
    }
    
    toast('FFmpeg loaded', 'success');
    return ffmpeg;
  } catch (error) {
    toast(`Failed to load FFmpeg: ${error.message}`, 'error');
    throw error;
  } finally {
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
  }
}

// Split text into segments
function splitText(text, mode) {
  if (mode === 'sentence') {
    // Split by sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  } else if (mode === 'paragraph') {
    // Split by paragraphs
    return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  } else {
    // Fixed duration - split into chunks of ~5 seconds worth of text
    // Estimate: ~150 characters per 5 seconds
    const chunks = [];
    const chunkSize = 150;
    let currentChunk = '';
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    
    return chunks;
  }
}

// Generate image for text segment
async function generateImageForSegment(text, segmentIndex, totalSegments) {
  updateProgress(`Generating image ${segmentIndex + 1}/${totalSegments}...`, 
    10 + (segmentIndex / totalSegments) * 30);
  
  if (!imageClient || currentImageModel !== imageModelSelect.value) {
    await initImageClient();
  }
  
  const params = {
    prompt: text,
    model: currentImageModel
  };
  
  const { promise, abort } = imageClient.generate(
    params,
    (progress) => {
      updateProgress(`Generating image ${segmentIndex + 1}/${totalSegments}: ${progress.phase || 'processing'}`,
        10 + (segmentIndex / totalSegments) * 30 + (progress.pct || 0) * 0.3);
    },
    {
      busyPolicy: 'queue',
      debounceMs: 200
    }
  );
  
  // Store abort function for potential cancellation
  const previousAbort = currentAbort;
  currentAbort = () => {
    if (abort) abort();
    if (previousAbort) previousAbort();
    return Promise.resolve();
  };
  
  const result = await promise;
  const actualResult = result.data || result;
  
  if (actualResult.ok && actualResult.blob) {
    return actualResult.blob;
  } else {
    throw new Error(actualResult.reason || actualResult.message || 'Image generation failed');
  }
}

// Generate audio for text segment
async function generateAudioForSegment(text, segmentIndex, totalSegments) {
  updateProgress(`Generating audio ${segmentIndex + 1}/${totalSegments}...`,
    70 + (segmentIndex / totalSegments) * 20);
  
  // TTS should already be loaded before this is called
  if (!kokoroModel) {
    throw new Error('TTS model not loaded. Please try again.');
  }
  
  const voice = voiceSelect.value;
  
  // Generate audio
  const audio = await kokoroModel.generate(text, { voice });
  
  // Convert to AudioBuffer to get duration
  let audioArray;
  let sampleRate = 24000;
  
  if (audio.toBlob && typeof audio.toBlob === 'function') {
    const blob = await audio.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioArray = audioBuffer.getChannelData(0);
    sampleRate = audioBuffer.sampleRate;
    
    // Return both blob and duration
    return {
      blob,
      duration: audioBuffer.duration,
      sampleRate
    };
  } else if (audio.audio && audio.audio instanceof Float32Array) {
    audioArray = audio.audio;
    sampleRate = audio.sampling_rate || audio.sampleRate || 24000;
    const duration = audioArray.length / sampleRate;
    
    // Convert to blob
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const buffer = ctx.createBuffer(1, audioArray.length, sampleRate);
    buffer.getChannelData(0).set(audioArray);
    const blob = await new Promise(resolve => {
      bufferToWav(buffer, resolve);
    });
    
    return { blob, duration, sampleRate };
  } else {
    throw new Error('Unexpected audio format');
  }
}

// Convert AudioBuffer to WAV blob
function bufferToWav(buffer, callback) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  const channels = buffer.numberOfChannels;
  const data = buffer.getChannelData(0);
  
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  callback(new Blob([arrayBuffer], { type: 'audio/wav' }));
}

// Create video from slides
async function createVideoFromSlides(slides) {
  updateProgress('Assembling video...', 90);
  
  if (!ffmpeg) {
    await loadFFmpeg();
  }
  
  const resolution = videoResolutionSelect.value.split('x');
  const width = parseInt(resolution[0]);
  const height = parseInt(resolution[1]);
  
  // Write all images and audio to FFmpeg
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    
    // Write image
    const imageData = await slide.imageBlob.arrayBuffer();
    const imageName = `image_${i}.png`;
    if (ffmpeg._useNewAPI || typeof ffmpeg.writeFile === 'function') {
      await ffmpeg.writeFile(imageName, new Uint8Array(imageData));
    } else {
      await ffmpeg.FS('writeFile', imageName, imageData);
    }
    
    // Write audio
    const audioData = await slide.audioBlob.arrayBuffer();
    const audioName = `audio_${i}.wav`;
    if (ffmpeg._useNewAPI || typeof ffmpeg.writeFile === 'function') {
      await ffmpeg.writeFile(audioName, new Uint8Array(audioData));
    } else {
      await ffmpeg.FS('writeFile', audioName, audioData);
    }
  }
  
  // Build FFmpeg command to create video
  // For each slide: loop image for duration, combine with audio
  let ffmpegArgs = [];
  let filterComplex = [];
  let inputs = [];
  
  for (let i = 0; i < slides.length; i++) {
    const duration = slides[i].duration;
    inputs.push(`-loop`, `1`, `-t`, duration.toString(), `-i`, `image_${i}.png`);
    inputs.push(`-i`, `audio_${i}.wav`);
    
    // Scale image to target resolution
    filterComplex.push(`[${i * 2}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[v${i}]`);
    filterComplex.push(`[${i * 2 + 1}:a]asetpts=PTS-STARTPTS[a${i}]`);
  }
  
  // Concatenate all video and audio streams
  const videoConcat = slides.map((_, i) => `[v${i}]`).join('');
  const audioConcat = slides.map((_, i) => `[a${i}]`).join('');
  filterComplex.push(`${videoConcat}concat=n=${slides.length}:v=1:a=0[outv]`);
  filterComplex.push(`${audioConcat}concat=n=${slides.length}:v=0:a=1[outa]`);
  
  ffmpegArgs = [
    ...inputs,
    '-filter_complex', filterComplex.join(';'),
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    'output.mp4'
  ];
  
  // Run FFmpeg
  if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
    await ffmpeg.exec(ffmpegArgs);
  } else {
    await ffmpeg.run(...ffmpegArgs);
  }
  
  // Read output
  let data;
  if (ffmpeg._useNewAPI || typeof ffmpeg.readFile === 'function') {
    data = await ffmpeg.readFile('output.mp4');
    data = data instanceof Uint8Array ? data : new Uint8Array(data);
  } else {
    data = ffmpeg.FS('readFile', 'output.mp4');
  }
  
  // Clean up
  for (let i = 0; i < slides.length; i++) {
    const imageName = `image_${i}.png`;
    const audioName = `audio_${i}.wav`;
    if (ffmpeg._useNewAPI || typeof ffmpeg.deleteFile === 'function') {
      await ffmpeg.deleteFile(imageName);
      await ffmpeg.deleteFile(audioName);
    } else {
      ffmpeg.FS('unlink', imageName);
      ffmpeg.FS('unlink', audioName);
    }
  }
  
  if (ffmpeg._useNewAPI || typeof ffmpeg.deleteFile === 'function') {
    await ffmpeg.deleteFile('output.mp4');
  } else {
    ffmpeg.FS('unlink', 'output.mp4');
  }
  
  return new Blob([data.buffer || data], { type: 'video/mp4' });
}

// Main generation function
async function generateVideo() {
  if (isGenerating) {
    toast('Generation already in progress', 'info');
    return;
  }
  
  const text = textInput.value.trim();
  if (!text) {
    toast('Please enter text', 'error');
    return;
  }
  
  try {
    isGenerating = true;
    generateBtn.disabled = true;
    abortBtn.disabled = false;
    downloadBtn.disabled = true;
    output.innerHTML = '<p class="text-muted">Preparing...</p>';
    
    // Split text
    updateProgress('Splitting text...', 1);
    const segments = splitText(text, splitModeSelect.value);
    
    if (segments.length === 0) {
      throw new Error('No text segments found');
    }
    
    toast(`Generating ${segments.length} slides...`, 'info');
    
    // Pre-load TTS model before generating segments (to avoid loading it multiple times)
    updateProgress('Preparing models...', 5);
    await loadTTS();
    
    // Pre-load image model
    updateProgress('Preparing image model...', 8);
    await initImageClient();
    
    // Generate images and audio for each segment
    const slides = [];
    
    for (let i = 0; i < segments.length; i++) {
      if (currentAbort && (await currentAbort())) {
        throw new Error('Generation aborted');
      }
      
      const segment = segments[i];
      
      updateProgress(`Processing slide ${i + 1}/${segments.length}...`, 10 + (i / segments.length) * 70);
      
      // Generate image and audio in parallel
      try {
        const [imageBlob, audioData] = await Promise.all([
          generateImageForSegment(segment, i, segments.length),
          generateAudioForSegment(segment, i, segments.length)
        ]);
        
        slides.push({
          imageBlob,
          audioBlob: audioData.blob,
          duration: audioData.duration,
          text: segment
        });
        
        updateProgress(`Slide ${i + 1}/${segments.length} completed`, 10 + ((i + 1) / segments.length) * 70);
      } catch (error) {
        console.error(`Error generating slide ${i + 1}:`, error);
        toast(`Error generating slide ${i + 1}: ${error.message}`, 'error');
        // Continue with other slides instead of failing completely
        continue;
      }
    }
    
    if (slides.length === 0) {
      throw new Error('No slides were generated successfully');
    }
    
    // Create video
    updateProgress('Assembling video...', 80);
    videoBlob = await createVideoFromSlides(slides);
    
    // Display video
    const videoUrl = URL.createObjectURL(videoBlob);
    output.innerHTML = `
      <video controls style="max-width: 100%; max-height: 100%; border-radius: 6px;">
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
    
    downloadBtn.disabled = false;
    toast('Video generated successfully!', 'success');
    updateProgress('Complete!', 100);
    
  } catch (error) {
    if (error.message.includes('aborted')) {
      toast('Generation aborted', 'info');
      output.innerHTML = '<p class="text-muted">Generation was cancelled.</p>';
    } else {
      console.error('Generation error:', error);
      output.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
      toast(`Generation failed: ${error.message}`, 'error');
    }
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    abortBtn.disabled = true;
    currentAbort = null;
  }
}

// Abort generation
async function abortGeneration() {
  if (currentAbort) {
    try {
      await currentAbort();
    } catch (e) {
      console.error('Abort error:', e);
    }
  }
  isGenerating = false;
  generateBtn.disabled = false;
  abortBtn.disabled = true;
  currentAbort = null;
}

// Clear inputs
function clearInputs() {
  textInput.value = '';
  output.innerHTML = '<p class="text-muted">Generated video will appear here...</p>';
  videoBlob = null;
  downloadBtn.disabled = true;
  hideProgress();
}

// Download video
function downloadVideo() {
  if (!videoBlob) {
    toast('No video to download', 'error');
    return;
  }
  
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'slideshow.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast('Video downloaded', 'success');
}

// Event listeners
on(generateBtn, 'click', generateVideo);
on(abortBtn, 'click', abortGeneration);
on(clearBtn, 'click', clearInputs);
on(downloadBtn, 'click', downloadVideo);

