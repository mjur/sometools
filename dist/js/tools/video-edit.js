import { toast } from '../ui.js';

const qs = (selector) => document.querySelector(selector);
const on = (el, event, handler) => el?.addEventListener(event, handler);

// Elements
const dropZone = qs('#drop-zone');
const videoInput = qs('#video-input');
const videoPreview = qs('#video-preview');
const previewPlayer = qs('#preview-player');
const videoInfo = qs('#video-info');
const outputArea = qs('#output-area');
const clearBtn = qs('#clear');

// Options
const trimStart = qs('#trim-start');
const trimEnd = qs('#trim-end');
const trimDuration = qs('#trim-duration');
const timelineCanvas = qs('#timeline-canvas');

const rotateOption = qs('#rotate-option');

const speedValue = qs('#speed-value');
const speedDisplay = qs('#speed-display');

const brightness = qs('#brightness');
const brightnessDisplay = qs('#brightness-display');
const contrast = qs('#contrast');
const contrastDisplay = qs('#contrast-display');
const saturation = qs('#saturation');
const saturationDisplay = qs('#saturation-display');

const quality = qs('#quality');
const outputFormat = qs('#output-format');

const processBtn = qs('#process-btn');
const downloadBtn = qs('#download-btn');
const progressContainer = qs('#progress-container');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');

// State
let inputVideoFile = null;
let ffmpeg = null;
let outputVideoBlob = null;
let videoDuration = 0;
let isDraggingTimeline = false;
let draggingHandle = null; // 'start' or 'end'
let activeTool = 'trim'; // Default active tool

// Load FFmpeg
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  try {
    toast('Loading video processor...', 'info');
    
    // Intercept Worker constructor to fix CORS issues
    window.OriginalWorker = window.Worker;
    const workerInterceptor = function(scriptURL, options) {
      const originalURL = String(scriptURL);
      let newURL = originalURL;
      
      // Redirect FFmpeg workers to local path to avoid CORS
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
        console.error('[Video Edit] Worker creation failed:', e);
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
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        updateProgress(percent, `Processing: ${percent}%`);
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
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        updateProgress(percent, `Processing: ${percent}%`);
      });
      await ffmpeg.load();
      ffmpeg._useNewAPI = true;
    }
    
    toast('Video processor loaded', 'success');
    return ffmpeg;
  } catch (error) {
    console.error('FFmpeg load error:', error);
    toast(`Failed to load video processor: ${error.message}`, 'error');
    throw error;
  } finally {
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
  }
}

// Drag and drop
on(dropZone, 'click', () => videoInput.click());

on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
  dropZone.style.background = 'var(--surface)';
});

on(dropZone, 'dragleave', () => {
  dropZone.style.borderColor = '';
  dropZone.style.background = '';
});

on(dropZone, 'drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '';
  dropZone.style.background = '';
  
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) {
    handleVideoFile(file);
  } else {
    toast('Please drop a valid video file', 'error');
  }
});

// Handle video upload
on(videoInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleVideoFile(file);
});

function handleVideoFile(file) {
  inputVideoFile = file;
  
  // Show preview
  const url = URL.createObjectURL(file);
  previewPlayer.src = url;
  dropZone.style.display = 'none';
  videoPreview.style.display = 'flex';
  processBtn.disabled = false;
  
  // Get video metadata
  previewPlayer.onloadedmetadata = () => {
    videoDuration = previewPlayer.duration;
    const width = previewPlayer.videoWidth;
    const height = previewPlayer.videoHeight;
    const size = (file.size / (1024 * 1024)).toFixed(2);
    
    videoInfo.textContent = `${width}×${height} • ${videoDuration.toFixed(1)}s • ${size} MB`;
    trimEnd.value = videoDuration.toFixed(1);
    trimEnd.max = videoDuration;
    trimStart.max = videoDuration;
    
    // Draw initial timeline (trim is default)
    setTimeout(() => {
      drawTimeline();
      updateTrimDuration();
    }, 50);
  };
}

// Clear
on(clearBtn, 'click', () => {
  inputVideoFile = null;
  outputVideoBlob = null;
  videoInput.value = '';
  previewPlayer.src = '';
  dropZone.style.display = 'flex';
  videoPreview.style.display = 'none';
  processBtn.disabled = true;
  downloadBtn.disabled = true;
  outputArea.innerHTML = '<p>Upload a video to begin editing</p>';
  progressContainer.style.display = 'none';
  
  // Reset trim values
  trimStart.value = 0;
  trimEnd.value = 0;
  updateTrimDuration();
});

// Draw timeline
function drawTimeline() {
  if (!timelineCanvas) return;
  
  const canvas = timelineCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const start = parseFloat(trimStart.value) || 0;
  const end = parseFloat(trimEnd.value) || videoDuration;
  
  // Background
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  ctx.fillRect(0, 0, width, height);
  
  // Timeline
  const startX = (start / videoDuration) * width;
  const endX = (end / videoDuration) * width;
  
  // Unselected regions (darker)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, startX, height);
  ctx.fillRect(endX, 0, width - endX, height);
  
  // Selected region (highlighted)
  ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.fillRect(startX, 0, endX - startX, height);
  
  // Selected region border
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, 0, endX - startX, height);
  
  // Handles (larger, more visible)
  const handleWidth = 12;
  const handleColor = '#3b82f6';
  
  // Start handle
  ctx.fillStyle = handleColor;
  ctx.fillRect(startX - handleWidth / 2, 0, handleWidth, height);
  
  // Start handle grip lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX - 2, height * 0.3);
  ctx.lineTo(startX - 2, height * 0.7);
  ctx.moveTo(startX + 2, height * 0.3);
  ctx.lineTo(startX + 2, height * 0.7);
  ctx.stroke();
  
  // End handle
  ctx.fillStyle = handleColor;
  ctx.fillRect(endX - handleWidth / 2, 0, handleWidth, height);
  
  // End handle grip lines
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(endX - 2, height * 0.3);
  ctx.lineTo(endX - 2, height * 0.7);
  ctx.moveTo(endX + 2, height * 0.3);
  ctx.lineTo(endX + 2, height * 0.7);
  ctx.stroke();
  
  // Time markers (on white background for visibility)
  ctx.font = '12px system-ui, -apple-system';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(startX + 4, 4, 50, 18);
  ctx.fillRect(Math.max(endX - 54, startX + 60), 4, 50, 18);
  
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatTime(start), startX + 8, 17);
  ctx.fillText(formatTime(end), Math.max(endX - 50, startX + 64), 17);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

function updateTrimDuration() {
  const start = parseFloat(trimStart.value) || 0;
  const end = parseFloat(trimEnd.value) || videoDuration;
  const duration = Math.max(0, end - start);
  trimDuration.textContent = `${duration.toFixed(1)}s`;
}

// Timeline interaction
let hoveredHandle = null;

on(timelineCanvas, 'mousemove', (e) => {
  if (!timelineCanvas || isDraggingTimeline) return;
  
  const rect = timelineCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  
  const startX = (parseFloat(trimStart.value) / videoDuration) * width;
  const endX = (parseFloat(trimEnd.value) / videoDuration) * width;
  
  const handleWidth = 20; // Larger hit area
  
  if (Math.abs(x - startX) < handleWidth) {
    timelineCanvas.style.cursor = 'ew-resize';
    hoveredHandle = 'start';
  } else if (Math.abs(x - endX) < handleWidth) {
    timelineCanvas.style.cursor = 'ew-resize';
    hoveredHandle = 'end';
  } else {
    timelineCanvas.style.cursor = 'pointer';
    hoveredHandle = null;
  }
});

on(timelineCanvas, 'mousedown', (e) => {
  if (!timelineCanvas) return;
  
  const rect = timelineCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  
  const startX = (parseFloat(trimStart.value) / videoDuration) * width;
  const endX = (parseFloat(trimEnd.value) / videoDuration) * width;
  
  const handleWidth = 20; // Larger hit area
  
  if (Math.abs(x - startX) < handleWidth) {
    isDraggingTimeline = true;
    draggingHandle = 'start';
  } else if (Math.abs(x - endX) < handleWidth) {
    isDraggingTimeline = true;
    draggingHandle = 'end';
  } else {
    // Click anywhere to set the nearest handle
    const clickTime = (x / width) * videoDuration;
    const currentStart = parseFloat(trimStart.value);
    const currentEnd = parseFloat(trimEnd.value);
    const midPoint = (currentStart + currentEnd) / 2;
    
    if (clickTime < midPoint) {
      trimStart.value = Math.max(0, Math.min(clickTime, currentEnd - 0.1)).toFixed(1);
    } else {
      trimEnd.value = Math.max(currentStart + 0.1, Math.min(clickTime, videoDuration)).toFixed(1);
    }
    
    drawTimeline();
    updateTrimDuration();
  }
});

on(document, 'mousemove', (e) => {
  if (!isDraggingTimeline || !timelineCanvas) return;
  
  const rect = timelineCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  const time = (x / width) * videoDuration;
  
  if (draggingHandle === 'start') {
    trimStart.value = Math.max(0, Math.min(time, parseFloat(trimEnd.value) - 0.1)).toFixed(1);
  } else if (draggingHandle === 'end') {
    trimEnd.value = Math.max(parseFloat(trimStart.value) + 0.1, Math.min(time, videoDuration)).toFixed(1);
  }
  
  drawTimeline();
  updateTrimDuration();
});

on(document, 'mouseup', () => {
  isDraggingTimeline = false;
  draggingHandle = null;
});

// Update timeline when inputs change
on(trimStart, 'input', () => {
  drawTimeline();
  updateTrimDuration();
});

on(trimEnd, 'input', () => {
  drawTimeline();
  updateTrimDuration();
});

// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  on(btn, 'click', () => {
    // Remove active class from all tabs
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab
    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    document.getElementById(tabId).classList.add('active');
    
    // Update active tool
    activeTool = btn.dataset.tab;
    
    // Draw timeline if switching to trim tab
    if (activeTool === 'trim' && videoDuration > 0) {
      setTimeout(() => {
        drawTimeline();
        updateTrimDuration();
      }, 50);
    }
  });
});

// Update displays
on(speedValue, 'input', () => {
  speedDisplay.textContent = speedValue.value;
});

on(brightness, 'input', () => {
  brightnessDisplay.textContent = brightness.value;
});

on(contrast, 'input', () => {
  contrastDisplay.textContent = contrast.value;
});

on(saturation, 'input', () => {
  saturationDisplay.textContent = saturation.value;
});

// Update progress
function updateProgress(percent, message) {
  progressFill.style.width = `${percent}%`;
  progressText.textContent = message;
}

// Process video
on(processBtn, 'click', async () => {
  if (!inputVideoFile) {
    toast('Please upload a video first', 'error');
    return;
  }
  
  try {
    processBtn.disabled = true;
    progressContainer.style.display = 'block';
    outputArea.innerHTML = '<p>Processing video...</p>';
    updateProgress(0, 'Initializing...');
    
    // Load FFmpeg
    await loadFFmpeg();
    
    // Write input file
    updateProgress(5, 'Loading video...');
    const inputData = new Uint8Array(await inputVideoFile.arrayBuffer());
    const inputExt = inputVideoFile.name.split('.').pop();
    const inputName = `input.${inputExt}`;
    await ffmpeg.writeFile(inputName, inputData);
    
    // Build FFmpeg command
    const args = ['-i', inputName];
    
    // Trim - apply if active
    if (activeTool === 'trim') {
      const start = parseFloat(trimStart.value);
      const end = parseFloat(trimEnd.value);
      if (start > 0) {
        args.push('-ss', start.toString());
      }
      if (end > start) {
        args.push('-to', end.toString());
      }
    }
    
    // Build filter string
    const filters = [];
    
    // Speed - apply if active
    if (activeTool === 'speed') {
      const speed = parseFloat(speedValue.value);
      if (speed !== 1.0) {
        filters.push(`setpts=${(1/speed).toFixed(3)}*PTS`);
        // Also adjust audio speed
        args.push('-filter:a', `atempo=${speed}`);
      }
    }
    
    // Rotate/Flip - apply if active
    if (activeTool === 'rotate') {
      const rotate = rotateOption.value;
      if (rotate === '90') {
        filters.push('transpose=1');
      } else if (rotate === '180') {
        filters.push('transpose=1,transpose=1');
      } else if (rotate === '270') {
        filters.push('transpose=2');
      } else if (rotate === 'hflip') {
        filters.push('hflip');
      } else if (rotate === 'vflip') {
        filters.push('vflip');
      }
    }
    
    // Filters - apply if active
    if (activeTool === 'filters') {
      const b = parseFloat(brightness.value);
      const c = parseFloat(contrast.value);
      const s = parseFloat(saturation.value);
      if (b !== 1.0 || c !== 1.0 || s !== 1.0) {
        filters.push(`eq=brightness=${(b-1).toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}`);
      }
    }
    
    // Apply video filters
    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }
    
    // Output format
    const format = outputFormat.value;
    const outputName = `output.${format}`;
    
    // For trim-only (no filters), use fast stream copy instead of re-encoding
    if (activeTool === 'trim' && filters.length === 0) {
      args.push('-c', 'copy');
      updateProgress(10, 'Trimming video (fast copy)...');
    } else {
      // Re-encode with quality settings
      const qualityMap = {
        high: 18,
        medium: 23,
        low: 28
      };
      const crf = qualityMap[quality.value];
      
      // Use ultrafast preset for rotate/flip/speed to speed up processing
      // Only use medium preset for filters where quality matters more
      const preset = (activeTool === 'filters') ? 'medium' : 'ultrafast';
      
      if (format === 'mp4' || format === 'mov') {
        args.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', preset);
        // Copy audio for rotate/flip, keep processed audio for speed
        if (activeTool !== 'speed') {
          args.push('-c:a', 'copy');
        } else {
          args.push('-c:a', 'aac', '-b:a', '128k');
        }
      } else if (format === 'webm') {
        args.push('-c:v', 'libvpx-vp9', '-crf', crf.toString(), '-b:v', '0');
        if (activeTool !== 'speed') {
          args.push('-c:a', 'copy');
        } else {
          args.push('-c:a', 'libopus', '-b:a', '128k');
        }
      } else {
        args.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', preset);
        if (activeTool !== 'speed') {
          args.push('-c:a', 'copy');
        } else {
          args.push('-c:a', 'aac', '-b:a', '128k');
        }
      }
      updateProgress(10, 'Processing video...');
    }
    
    args.push(outputName);
    
    updateProgress(10, 'Processing video...');
    console.log('[FFmpeg] Command:', args.join(' '));
    
    // Execute FFmpeg
    await ffmpeg.exec(args);
    
    // Read output
    updateProgress(95, 'Finalizing...');
    const data = await ffmpeg.readFile(outputName);
    outputVideoBlob = new Blob([data.buffer], { type: `video/${format}` });
    
    // Show output
    const url = URL.createObjectURL(outputVideoBlob);
    const size = (outputVideoBlob.size / (1024 * 1024)).toFixed(2);
    
    outputArea.innerHTML = `
      <video controls style="max-width: 100%; max-height: calc(100% - 2rem); object-fit: contain;">
        <source src="${url}" type="video/${format}">
      </video>
      <p class="text-sm text-muted" style="margin-top: 0.5rem; text-align: center;">${size} MB • Format: ${format.toUpperCase()}</p>
    `;
    
    downloadBtn.disabled = false;
    updateProgress(100, 'Complete!');
    toast('Video processed successfully!', 'success');
    
    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
  } catch (error) {
    console.error('Processing error:', error);
    toast(`Failed to process video: ${error.message}`, 'error');
    updateProgress(0, 'Error occurred');
  } finally {
    processBtn.disabled = false;
  }
});

// Download
on(downloadBtn, 'click', () => {
  if (!outputVideoBlob) return;
  
  const format = outputFormat.value;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(outputVideoBlob);
  a.download = `edited-video.${format}`;
  a.click();
  toast('Download started', 'success');
});

