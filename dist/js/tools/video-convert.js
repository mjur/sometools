import { toast, on, qs, downloadFile } from '/js/ui.js';

const fileInput = qs('#file-input');
const dropZone = qs('#drop-zone');
const videoPreview = qs('#video-preview');
const previewVideo = qs('#preview-video');
const videoInfo = qs('#video-info');
const outputArea = qs('#output-area');
const convertBtn = qs('#convert');
const downloadBtn = qs('#download');
const clearBtn = qs('#clear');
const outputFormatSelect = qs('#output-format');
const videoQualitySelect = qs('#video-quality');
const progressContainer = qs('#progress-container');
const progressBar = qs('#progress-bar');
const progressPercent = qs('#progress-percent');
const progressText = qs('#progress-text');

let currentFile = null;
let convertedBlob = null;
let ffmpeg = null;
let isConverting = false;

// Audio-only formats
const audioFormats = ['mp3', 'aac', 'wav', 'ogg', 'm4a', 'flac', 'opus'];

// Load FFmpeg.wasm
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  try {
    toast('Loading FFmpeg...', 'info');
    
    // Intercept Worker constructor to redirect CDN worker URLs to local files
    window.OriginalWorker = window.Worker;
    const workerInterceptor = function(scriptURL, options) {
      const originalURL = String(scriptURL);
      let newURL = originalURL;
      
      console.log('Worker constructor called with URL:', originalURL);
      
      // Check for any CDN URL with ffmpeg worker files
      if (originalURL.includes('cdn.jsdelivr.net') && originalURL.includes('ffmpeg')) {
        const fileName = originalURL.split('/').pop();
        console.log('Detected CDN ffmpeg URL, filename:', fileName);
        if (fileName.includes('.ffmpeg.js') || fileName.includes('worker') || fileName === '814.ffmpeg.js') {
          newURL = `/js/ffmpeg-workers/${fileName}`;
          console.log('✓ Intercepting Worker: CDN -> Local', originalURL, '->', newURL);
        }
      }
      // Also check for the specific file name pattern anywhere in URL
      if (originalURL.includes('814.ffmpeg.js')) {
        newURL = `/js/ffmpeg-workers/814.ffmpeg.js`;
        console.log('✓ Intercepting Worker: by filename pattern', originalURL, '->', newURL);
      }
      
      // Create Worker with potentially modified URL
      try {
        return new window.OriginalWorker(newURL, options);
      } catch (e) {
        console.error('Worker creation failed. Original URL:', originalURL, 'New URL:', newURL, 'Error:', e);
        throw e;
      }
    };
    
    // Copy Worker properties to maintain compatibility
    Object.setPrototypeOf(workerInterceptor, window.OriginalWorker);
    Object.defineProperty(workerInterceptor, 'prototype', {
      value: window.OriginalWorker.prototype,
      writable: false
    });
    
    // Replace Worker constructor
    window.Worker = workerInterceptor;
    
    // Load FFmpeg from CDN using script tag
    if (!window.FFmpegWASM) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js';
        script.onload = () => {
          // Wait a bit for the library to initialize
          setTimeout(resolve, 500);
        };
        script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
        document.head.appendChild(script);
      });
    }
    
    // Check how FFmpeg is exposed - UMD build uses FFmpegWASM as a Module
    let createFFmpegFunc = null;
    
    console.log('Checking FFmpegWASM module:', window.FFmpegWASM);
    console.log('FFmpegWASM keys:', Object.keys(window.FFmpegWASM || {}));
    
    if (window.FFmpegWASM) {
      // It's a Module object, check its exports
      if (window.FFmpegWASM.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.createFFmpeg;
      } else if (window.FFmpegWASM.default && window.FFmpegWASM.default.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.default.createFFmpeg;
      } else if (window.FFmpegWASM.default && typeof window.FFmpegWASM.default === 'function') {
        createFFmpegFunc = window.FFmpegWASM.default;
      } else if (window.FFmpegWASM.FFmpeg) {
        // It exports the FFmpeg class - use it directly
        const { FFmpeg: FFmpegClass } = window.FFmpegWASM;
        ffmpeg = new FFmpegClass();
        ffmpeg.on('log', ({ message }) => console.log('FFmpeg:', message));
        ffmpeg.on('progress', ({ progress }) => {
          if (progressBar && progressPercent) {
            const percent = Math.round(progress * 100);
            progressBar.value = percent;
            progressPercent.textContent = `${percent}%`;
          }
        });
        toast('Loading FFmpeg core files (this may take a minute on first use)...', 'info');
        
        // Load FFmpeg - use local JS but CDN for WASM (too large for Cloudflare Pages 25MB limit)
        await ffmpeg.load({
          coreURL: '/js/ffmpeg-core/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm'
        });
        
        toast('FFmpeg loaded successfully!', 'success');
        // Mark that we're using new API
        ffmpeg._useNewAPI = true;
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
        ffmpeg = new FFmpegClass();
        ffmpeg.on('log', ({ message }) => console.log('FFmpeg:', message));
        ffmpeg.on('progress', ({ progress }) => {
          if (progressBar && progressPercent) {
            const percent = Math.round(progress * 100);
            progressBar.value = percent;
            progressPercent.textContent = `${percent}%`;
          }
        });
        toast('Loading FFmpeg core files (this may take a minute on first use)...', 'info');
        // ESM build - use local core files to avoid CORS issues
        await ffmpeg.load({
          coreURL: '/js/ffmpeg-core/ffmpeg-core.js',
          wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm'
        });
        toast('FFmpeg loaded successfully!', 'success');
        // Mark that we're using new API
        ffmpeg._useNewAPI = true;
        return ffmpeg;
      } catch (esmError) {
        console.error('ESM import also failed:', esmError);
        // If ESM also fails due to worker, the UMD build worker issue is the problem
        throw new Error('FFmpeg requires workers which cannot be loaded from CDN. Please ensure the worker file is accessible at /js/ffmpeg-workers/814.ffmpeg.js');
      }
    }
    
    // If we found createFFmpeg, use it (old API)
    if (createFFmpegFunc && !ffmpeg) {
      console.log('Using createFFmpeg:', createFFmpegFunc);
      
      // Create FFmpeg instance
      ffmpeg = createFFmpegFunc({
        log: true,
        progress: (p) => {
          if (progressBar && progressPercent) {
            const percent = Math.round(p.ratio * 100);
            progressBar.value = percent;
            progressPercent.textContent = `${percent}%`;
          }
        },
        corePath: '/js/ffmpeg-core/ffmpeg-core.js'
      });

      toast('Loading FFmpeg core files (this may take a minute on first use)...', 'info');
      await ffmpeg.load();
      
      toast('FFmpeg loaded successfully!', 'success');
      return ffmpeg;
    }
  } catch (e) {
    const errorMsg = e?.message || String(e);
    let errorMessage = `Failed to load FFmpeg: ${errorMsg}`;
    
    // Provide helpful error message for CORS/Worker issues
    if (errorMsg && (errorMsg.includes('Worker') || errorMsg.includes('CORS') || errorMsg.includes('SecurityError') || errorMsg.includes('DataClone'))) {
      errorMessage = 'FFmpeg.wasm cannot load Worker scripts from CDN due to browser security restrictions.\n\n' +
        'Solutions:\n' +
        '1. Use `npm run dev` (Vite server) which is configured correctly\n' +
        '2. Host the FFmpeg worker files locally in your project\n' +
        '3. Use a server that supports Cross-Origin-Embedder-Policy headers\n\n' +
        'The worker file needs to be served from the same origin as your page.';
    }
    
    toast(errorMessage, 'error');
    console.error('FFmpeg load error:', e);
    throw e;
  } finally {
    // Restore original Worker constructor
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
  }
}

// Handle file selection
function handleFile(file) {
  if (!file) {
    toast('No file selected', 'error');
    return;
  }
  
  // More permissive file type checking - check extension if MIME type is missing
  const hasValidExtension = /\.(mp4|webm|avi|mov|mkv|m4v|flv|3gp|ogv|mpeg|mpg|wmv|asf|mp3|aac|wav|ogg|m4a|flac|opus)$/i.test(file.name);
  const hasValidMimeType = file.type && (file.type.startsWith('video/') || file.type.startsWith('audio/'));
  
  if (!hasValidMimeType && !hasValidExtension) {
    toast('Please select a video or audio file', 'error');
    return;
  }

  currentFile = file;
  convertedBlob = null;
  
  if (downloadBtn) downloadBtn.disabled = true;
  
  // Show preview
  const url = URL.createObjectURL(file);
  if (previewVideo) previewVideo.src = url;
  if (dropZone) dropZone.style.display = 'none';
  if (videoPreview) videoPreview.style.display = 'flex';
  
  // Show file info
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  if (videoInfo) videoInfo.textContent = `${file.name} (${sizeMB} MB)`;
  
  if (convertBtn) convertBtn.disabled = false;
  if (progressContainer) progressContainer.style.display = 'none';
  if (outputArea) outputArea.innerHTML = '<p>Click "Convert" to start conversion</p>';
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

// Convert video
on(convertBtn, 'click', async () => {
  if (!currentFile || isConverting) return;

  try {
    isConverting = true;
    convertBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressPercent.textContent = '0%';
    progressText.textContent = 'Loading FFmpeg...';
    outputArea.innerHTML = '<p>Preparing conversion...</p>';

    // Load FFmpeg if not already loaded
    const ffmpegInstance = await loadFFmpeg();
    
    progressText.textContent = 'Reading video file...';
    
    // Write input file to FFmpeg
    // Get file extension from filename
    const fileExt = currentFile.name.split('.').pop() || 'mp4';
    const inputName = `input.${fileExt}`;
    
    // Read file as ArrayBuffer
    const fileData = await currentFile.arrayBuffer();
    const uint8Array = new Uint8Array(fileData);
    
    console.log('Writing file to FFmpeg:', inputName, 'Size:', uint8Array.length);
    
    // Check which API we're using
    if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.writeFile === 'function') {
      // New API
      await ffmpegInstance.writeFile(inputName, uint8Array);
    } else {
      // Old API - needs ArrayBuffer, not Uint8Array
      await ffmpegInstance.FS('writeFile', inputName, fileData);
    }
    
    console.log('File written successfully');
    
    // Get output format and quality settings
    const outputFormat = outputFormatSelect.value;
    const quality = videoQualitySelect.value;
    
    // Build FFmpeg command
    const outputName = `output.${outputFormat}`;
    let ffmpegArgs = ['-i', inputName];
    
    // Check if audio-only format
    const isAudioFormat = audioFormats.includes(outputFormat);
    
    // For video formats, always add scale filter to reduce memory usage
    // Browser memory is limited, so scale down high-resolution videos
    if (!isAudioFormat) {
      console.log('Adding scale filter to reduce memory usage for video conversion');
      // Scale to max 1280x720 to ensure it fits in browser memory
      // This is a good balance between quality and memory usage
      ffmpegArgs.push('-vf', 'scale=1280:720:force_original_aspect_ratio=decrease');
    }
    
    if (isAudioFormat) {
      // Audio-only conversion
      if (outputFormat === 'mp3') {
        ffmpegArgs.push('-c:a', 'libmp3lame');
        if (quality === 'high') {
          ffmpegArgs.push('-b:a', '320k');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:a', '192k');
        } else {
          ffmpegArgs.push('-b:a', '128k');
        }
      } else if (outputFormat === 'aac') {
        ffmpegArgs.push('-c:a', 'aac');
        if (quality === 'high') {
          ffmpegArgs.push('-b:a', '256k');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:a', '192k');
        } else {
          ffmpegArgs.push('-b:a', '128k');
        }
      } else if (outputFormat === 'wav') {
        ffmpegArgs.push('-c:a', 'pcm_s16le'); // Uncompressed WAV
      } else if (outputFormat === 'ogg') {
        ffmpegArgs.push('-c:a', 'libvorbis');
        if (quality === 'high') {
          ffmpegArgs.push('-q:a', '5');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-q:a', '3');
        } else {
          ffmpegArgs.push('-q:a', '1');
        }
      } else if (outputFormat === 'm4a') {
        ffmpegArgs.push('-c:a', 'aac');
        if (quality === 'high') {
          ffmpegArgs.push('-b:a', '256k');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:a', '192k');
        } else {
          ffmpegArgs.push('-b:a', '128k');
        }
      } else if (outputFormat === 'flac') {
        ffmpegArgs.push('-c:a', 'flac'); // Lossless
      } else if (outputFormat === 'opus') {
        ffmpegArgs.push('-c:a', 'libopus');
        if (quality === 'high') {
          ffmpegArgs.push('-b:a', '192k');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:a', '128k');
        } else {
          ffmpegArgs.push('-b:a', '96k');
        }
      }
      // Remove video stream for audio-only
      ffmpegArgs.push('-vn');
    } else {
      // Video formats
      if (outputFormat === 'mp4' || outputFormat === 'm4v') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
        if (outputFormat === 'm4v') {
          ffmpegArgs.push('-f', 'mp4');
        }
      } else if (outputFormat === 'webm') {
        ffmpegArgs.push('-c:v', 'libvpx-vp9');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '30', '-b:v', '0');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '35', '-b:v', '0');
        } else {
          ffmpegArgs.push('-crf', '40', '-b:v', '0');
        }
        ffmpegArgs.push('-c:a', 'libopus', '-b:a', '128k');
      } else if (outputFormat === 'avi') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'mp3', '-b:a', '128k');
      } else if (outputFormat === 'mov') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
      } else if (outputFormat === 'mkv') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
      } else if (outputFormat === 'flv') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
      } else if (outputFormat === '3gp') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-b:v', '512k');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:v', '384k');
        } else {
          ffmpegArgs.push('-b:v', '256k');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '64k');
        ffmpegArgs.push('-s', '320x240'); // 3GP typically uses small resolution
      } else if (outputFormat === 'ogv') {
        ffmpegArgs.push('-c:v', 'libtheora');
        if (quality === 'high') {
          ffmpegArgs.push('-q:v', '8');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-q:v', '5');
        } else {
          ffmpegArgs.push('-q:v', '3');
        }
        ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', '5');
      } else if (outputFormat === 'mpeg' || outputFormat === 'mpg') {
        ffmpegArgs.push('-c:v', 'mpeg2video');
        if (quality === 'high') {
          ffmpegArgs.push('-b:v', '5M');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:v', '3M');
        } else {
          ffmpegArgs.push('-b:v', '1M');
        }
        ffmpegArgs.push('-c:a', 'mp2', '-b:a', '192k');
      } else if (outputFormat === 'wmv') {
        // WMV support may be limited in FFmpeg.wasm
        ffmpegArgs.push('-c:v', 'wmv2');
        if (quality === 'high') {
          ffmpegArgs.push('-b:v', '5M');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-b:v', '3M');
        } else {
          ffmpegArgs.push('-b:v', '1M');
        }
        ffmpegArgs.push('-c:a', 'wmav2', '-b:a', '128k');
      } else if (outputFormat === 'asf') {
        ffmpegArgs.push('-c:v', 'libx264');
        if (quality === 'high') {
          ffmpegArgs.push('-crf', '18');
        } else if (quality === 'medium') {
          ffmpegArgs.push('-crf', '23');
        } else {
          ffmpegArgs.push('-crf', '28');
        }
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
      }
    }
    
    ffmpegArgs.push(outputName);
    
    progressText.textContent = 'Converting video (this may take several minutes)...';
    
    // Run FFmpeg
    if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.exec === 'function') {
      // New API
      await ffmpegInstance.exec(ffmpegArgs);
    } else {
      // Old API
      await ffmpegInstance.run(...ffmpegArgs);
    }
    
    progressText.textContent = 'Reading converted file...';
    
    // Read output file
    let data;
    if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.readFile === 'function') {
      // New API
      data = await ffmpegInstance.readFile(outputName);
      data = data instanceof Uint8Array ? data : new Uint8Array(data);
    } else {
      // Old API
      data = ffmpegInstance.FS('readFile', outputName);
    }
    
    const isAudioOutput = audioFormats.includes(outputFormat);
    const mimeType = isAudioOutput ? `audio/${outputFormat === 'ogg' ? 'ogg' : outputFormat}` : `video/${outputFormat}`;
    convertedBlob = new Blob([data.buffer || data], { type: mimeType });
    
    // Clean up
    if (ffmpegInstance._useNewAPI || typeof ffmpegInstance.deleteFile === 'function') {
      // New API
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
    } else {
      // Old API
      ffmpegInstance.FS('unlink', inputName);
      ffmpegInstance.FS('unlink', outputName);
    }
    
    // Show output
    const outputUrl = URL.createObjectURL(convertedBlob);
    
    if (isAudioOutput) {
      outputArea.innerHTML = `
        <audio controls style="max-width: 100%; margin: auto;">
          <source src="${outputUrl}" type="audio/${outputFormat === 'ogg' ? 'ogg' : outputFormat}">
          Your browser does not support the audio tag.
        </audio>
        <p class="text-sm text-muted" style="margin-top: 0.5rem; text-align: center;">Audio file converted successfully</p>
      `;
    } else {
      outputArea.innerHTML = `
        <video controls style="max-width: 100%; max-height: 100%; border-radius: 6px;">
          <source src="${outputUrl}" type="video/${outputFormat}">
          Your browser does not support the video tag.
        </video>
      `;
    }
    
    downloadBtn.disabled = false;
    progressContainer.style.display = 'none';
    
    const outputSizeMB = (convertedBlob.size / (1024 * 1024)).toFixed(2);
    toast(`Conversion complete! Output size: ${outputSizeMB} MB`, 'success');
    
  } catch (e) {
    const errorMsg = e?.message || String(e);
    let userMessage = `Conversion failed: ${errorMsg}`;
    
    // Provide helpful error messages for common issues
    if (errorMsg.includes('memory access out of bounds') || errorMsg.includes('out of memory')) {
      userMessage = 'Video is too large for browser memory. Try:\n' +
        '1. Using a smaller video file (< 100MB recommended)\n' +
        '2. Converting to a lower resolution format\n' +
        '3. Splitting the video into smaller segments';
    } else if (errorMsg.includes('FS error') || errorMsg.includes('Invalid data')) {
      userMessage = 'Error processing video file. The file may be corrupted or in an unsupported format.';
    }
    
    toast(userMessage, 'error');
    console.error('Conversion error:', e);
    outputArea.innerHTML = `<p style="color: var(--error);">Error: ${userMessage}</p>`;
    progressContainer.style.display = 'none';
  } finally {
    isConverting = false;
    convertBtn.disabled = false;
  }
});

// Download
on(downloadBtn, 'click', () => {
  if (!convertedBlob) return;
  
  const outputFormat = outputFormatSelect.value;
  const originalName = currentFile.name.split('.')[0];
  const outputName = `${originalName}.${outputFormat}`;
  
  downloadFile(convertedBlob, outputName);
  toast('Download started', 'success');
});

// Clear
on(clearBtn, 'click', () => {
  currentFile = null;
  convertedBlob = null;
  fileInput.value = '';
  dropZone.style.display = 'flex';
  videoPreview.style.display = 'none';
  outputArea.innerHTML = '<p>Upload a video to convert</p>';
  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  progressContainer.style.display = 'none';
  
  // Clean up object URLs
  if (previewVideo.src) {
    URL.revokeObjectURL(previewVideo.src);
    previewVideo.src = '';
  }
});

