import { toast, on, qs } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const audioPreviewContainer = qs('#audio-preview-container');
const previewAudio = qs('#preview-audio');
const audioInfo = qs('#audio-info');
const convertBtn = qs('#convert');
const outputFormat = qs('#output-format');
const quality = qs('#quality');
const status = qs('#status');
const progressBar = qs('#progress-bar');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');
const outputSection = qs('#output-section');
const audioPreview = qs('#audio-preview');
const outputInfo = qs('#output-info');
const downloadBtn = qs('#download');

let currentFile = null;
let convertedBlob = null;
let isConverting = false;

// Load FFmpeg
let ffmpegInstance = null;
async function loadFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  
  try {
    status.innerHTML = '<p style="color: var(--text-subtle);">Loading FFmpeg...</p>';
    
    // Intercept Worker constructor to redirect CDN worker URLs to local files
    if (!window.OriginalWorker) {
      window.OriginalWorker = window.Worker;
      const workerInterceptor = function(scriptURL, options) {
        const originalURL = String(scriptURL);
        let newURL = originalURL;
        
        // Check for any CDN URL with ffmpeg worker files
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
    
    // Load FFmpeg from CDN using script tag
    if (!window.FFmpegWASM) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js';
        script.onload = () => {
          setTimeout(resolve, 500);
        };
        script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
        document.head.appendChild(script);
      });
    }
    
    // Check how FFmpeg is exposed - UMD build uses FFmpegWASM as a Module
    let createFFmpegFunc = null;
    let ffmpeg = null;
    
    if (window.FFmpegWASM) {
      // It's a Module object, check its exports
      if (window.FFmpegWASM.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.createFFmpeg;
      } else if (window.FFmpegWASM.default && window.FFmpegWASM.default.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.default.createFFmpeg;
      } else if (window.FFmpegWASM.default && typeof window.FFmpegWASM.default === 'function') {
        createFFmpegFunc = window.FFmpegWASM.default;
      } else if (window.FFmpegWASM.FFmpeg) {
        // It exports the FFmpeg class - use it directly (new API)
        const { FFmpeg: FFmpegClass } = window.FFmpegWASM;
        ffmpeg = new FFmpegClass({
          corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js',
          log: false
        });
        await ffmpeg.load();
        ffmpeg._useNewAPI = true;
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      }
    }
    
    if (window.FFmpeg && window.FFmpeg.createFFmpeg) {
      createFFmpegFunc = window.FFmpeg.createFFmpeg;
    } else if (window.createFFmpeg) {
      createFFmpegFunc = window.createFFmpeg;
    }
    
    // If createFFmpeg not found, try using ESM import which we know works
    if (!createFFmpegFunc && !ffmpeg) {
      console.log('createFFmpeg not found in UMD, trying ESM import...');
      try {
        const { FFmpeg: FFmpegClass } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
        ffmpeg = new FFmpegClass({
          corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js',
          log: false
        });
        await ffmpeg.load();
        ffmpeg._useNewAPI = true;
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (esmError) {
        console.error('ESM import also failed:', esmError);
        throw new Error('FFmpeg requires workers which cannot be loaded from CDN. Please ensure the worker file is accessible.');
      }
    }
    
    // If we found createFFmpeg, use it (old API)
    if (createFFmpegFunc && !ffmpeg) {
      ffmpeg = createFFmpegFunc({
        log: false,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js'
      });
      await ffmpeg.load();
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    }
    
    throw new Error('FFmpeg createFFmpeg function not found');
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    // Restore original Worker constructor
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
    throw new Error('Failed to load FFmpeg. Please refresh the page.');
  }
}

function getAudioFormat(file) {
  if (!file) return 'wav';
  
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeType = file.type;
  
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
  
  return 'wav';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function handleFile(file) {
  if (!file) {
    toast('No file selected', 'error');
    return;
  }
  
  // Check if it's an audio file
  const hasValidExtension = /\.(mp3|wav|ogg|m4a|flac|aac|opus|webm|m4p|wma|amr|3gp)$/i.test(file.name);
  const hasValidMimeType = file.type && file.type.startsWith('audio/');
  
  if (!hasValidMimeType && !hasValidExtension) {
    toast('Please select an audio file', 'error');
    return;
  }
  
  currentFile = file;
  convertedBlob = null;
  
  // Show preview
  const url = URL.createObjectURL(file);
  if (previewAudio) previewAudio.src = url;
  if (dropZone) dropZone.style.display = 'none';
  if (audioPreviewContainer) {
    audioPreviewContainer.style.display = 'flex';
  }
  
  // Show file info
  const format = getAudioFormat(file);
  const size = formatFileSize(file.size);
  if (audioInfo) audioInfo.textContent = `${file.name} | ${format.toUpperCase()} | ${size}`;
  
  status.innerHTML = '<p style="color: var(--text-subtle);">Ready to convert. Click "Convert" to start.</p>';
  progressBar.style.display = 'none';
  outputSection.style.display = 'none';
  
  if (convertBtn) convertBtn.disabled = false;
}

async function convertAudio() {
  if (!currentFile || isConverting) return;
  
  isConverting = true;
  downloadBtn.disabled = true;
  if (convertBtn) convertBtn.disabled = true;
  outputSection.style.display = 'none';
  
  try {
    status.innerHTML = '<p>Loading FFmpeg...</p>';
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    progressText.textContent = 'Loading FFmpeg...';
    
    const ffmpeg = await loadFFmpeg();
    
    progressFill.style.width = '20%';
    progressText.textContent = 'Reading audio file...';
    status.innerHTML = '<p>Reading audio file...</p>';
    
    const inputFormat = getAudioFormat(currentFile);
    const outputFormatValue = outputFormat.value;
    
    if (inputFormat === outputFormatValue) {
      toast('Input and output formats are the same', 'error');
      isConverting = false;
      downloadBtn.disabled = false;
      if (convertBtn) convertBtn.disabled = false;
      return;
    }
    
    // Read file
    const fileData = await currentFile.arrayBuffer();
    const inputName = `input.${inputFormat}`;
    // Opus uses .ogg extension but opus codec
    const outputName = outputFormatValue === 'opus' ? 'output.ogg' : `output.${outputFormatValue}`;
    
    progressFill.style.width = '30%';
    progressText.textContent = 'Preparing conversion...';
    status.innerHTML = '<p>Preparing conversion...</p>';
    
    // Write input file
    // Check which API we're using
    if (ffmpeg._useNewAPI || typeof ffmpeg.writeFile === 'function') {
      // New API
      await ffmpeg.writeFile(inputName, new Uint8Array(fileData));
    } else {
      // Old API - needs ArrayBuffer, not Uint8Array
      await ffmpeg.FS('writeFile', inputName, fileData);
    }
    
    progressFill.style.width = '40%';
    progressText.textContent = 'Converting audio...';
    status.innerHTML = '<p>Converting audio...</p>';
    
    // Build FFmpeg command
    const ffmpegArgs = ['-i', inputName];
    
    // Remove video stream for audio-only conversion (must be before codec settings)
    ffmpegArgs.push('-vn');
    
    // Set codec and quality based on output format
    switch (outputFormatValue) {
      case 'mp3':
        ffmpegArgs.push('-c:a', 'libmp3lame');
        if (quality.value === 'high') {
          ffmpegArgs.push('-b:a', '320k', '-q:a', '0');
        } else if (quality.value === 'medium') {
          ffmpegArgs.push('-b:a', '192k', '-q:a', '2');
        } else {
          ffmpegArgs.push('-b:a', '128k', '-q:a', '4');
        }
        break;
      case 'm4a':
      case 'aac':
        ffmpegArgs.push('-c:a', 'aac');
        if (quality.value === 'high') {
          ffmpegArgs.push('-b:a', '256k');
        } else if (quality.value === 'medium') {
          ffmpegArgs.push('-b:a', '192k');
        } else {
          ffmpegArgs.push('-b:a', '128k');
        }
        break;
      case 'ogg':
        ffmpegArgs.push('-c:a', 'libvorbis');
        if (quality.value === 'high') {
          ffmpegArgs.push('-q:a', '5');
        } else if (quality.value === 'medium') {
          ffmpegArgs.push('-q:a', '3');
        } else {
          ffmpegArgs.push('-q:a', '1');
        }
        break;
      case 'opus':
        // Opus encoding - use OGG container
        ffmpegArgs.push('-c:a', 'libopus');
        if (quality.value === 'high') {
          ffmpegArgs.push('-b:a', '192k');
        } else if (quality.value === 'medium') {
          ffmpegArgs.push('-b:a', '128k');
        } else {
          ffmpegArgs.push('-b:a', '96k');
        }
        break;
      case 'flac':
        ffmpegArgs.push('-c:a', 'flac');
        break;
      case 'wav':
        ffmpegArgs.push('-c:a', 'pcm_s16le');
        break;
    }
    
    // For Opus, specify OGG format before output filename
    if (outputFormatValue === 'opus') {
      ffmpegArgs.push('-f', 'ogg');
    }
    
    ffmpegArgs.push(outputName);
    
    progressFill.style.width = '60%';
    progressText.textContent = 'Encoding audio...';
    
    // Run FFmpeg
    // Check which API we're using
    try {
      if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
        // New API
        await ffmpeg.exec(ffmpegArgs);
      } else {
        // Old API
        await ffmpeg.run(...ffmpegArgs);
      }
    } catch (execError) {
      // If Opus fails, it might be because libopus isn't available
      if (outputFormatValue === 'opus' && execError.message && execError.message.includes('memory')) {
        throw new Error('Opus encoding failed. The Opus codec may not be available in this FFmpeg build. Try using OGG format instead.');
      }
      throw execError;
    }
    
    progressFill.style.width = '90%';
    progressText.textContent = 'Finalizing...';
    
    // Read output file
    let data;
    if (ffmpeg._useNewAPI || typeof ffmpeg.readFile === 'function') {
      // New API
      data = await ffmpeg.readFile(outputName);
      data = data instanceof Uint8Array ? data : new Uint8Array(data);
    } else {
      // Old API
      data = ffmpeg.FS('readFile', outputName);
    }
    const outputArray = data instanceof Uint8Array ? data : new Uint8Array(data);
    
    // Create blob
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'opus': 'audio/opus'
    };
    
    convertedBlob = new Blob([outputArray], { type: mimeTypes[outputFormatValue] || 'audio/mpeg' });
    
    // Update UI
    progressFill.style.width = '100%';
    progressText.textContent = 'Conversion complete!';
    status.innerHTML = '<p style="color: var(--success);">Conversion complete!</p>';
    
    // Show output
    const outputUrl = URL.createObjectURL(convertedBlob);
    audioPreview.src = outputUrl;
    outputInfo.textContent = `Format: ${outputFormatValue.toUpperCase()} | Size: ${formatFileSize(convertedBlob.size)}`;
    outputSection.style.display = 'grid';
    downloadBtn.disabled = false;
    
    // Clean up
    if (ffmpeg._useNewAPI || typeof ffmpeg.deleteFile === 'function') {
      // New API
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } else {
      // Old API
      ffmpeg.FS('unlink', inputName);
      ffmpeg.FS('unlink', outputName);
    }
    
    toast('Audio converted successfully!');
  } catch (error) {
    console.error('Conversion error:', error);
    status.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
    progressBar.style.display = 'none';
    toast('Conversion failed: ' + error.message, 'error');
  } finally {
    isConverting = false;
    if (convertBtn) convertBtn.disabled = false;
  }
}

// Drag and drop
on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = 'var(--bg-elev)';
});

on(dropZone, 'dragleave', () => {
  dropZone.style.backgroundColor = '';
});

on(dropZone, 'drop', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = '';
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

on(dropZone, 'click', () => fileInput.click());

on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

on(convertBtn, 'click', () => {
  if (currentFile && !isConverting) {
    convertAudio();
  }
});

on(outputFormat, 'change', () => {
  if (currentFile && convertedBlob) {
    // Re-enable convert button if format changed
    if (convertBtn) convertBtn.disabled = false;
    convertedBlob = null;
    outputSection.style.display = 'none';
  }
});

on(quality, 'change', () => {
  if (currentFile && convertedBlob) {
    // Re-enable convert button if quality changed
    if (convertBtn) convertBtn.disabled = false;
    convertedBlob = null;
    outputSection.style.display = 'none';
  }
});

on(downloadBtn, 'click', () => {
  if (convertedBlob) {
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    // Opus uses .ogg extension
    const ext = outputFormat.value === 'opus' ? 'ogg' : outputFormat.value;
    a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '.' + ext;
    a.click();
    URL.revokeObjectURL(url);
    toast('Download started');
  }
});


