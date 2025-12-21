// Video to Audio Extractor
// Extracts audio tracks from video files using FFmpeg.wasm

import { toast, on, qs } from '/js/ui.js';

// DOM elements
const fileInput = qs('#file-input');
const fileUploadArea = qs('#file-upload-area');
const videoPreview = qs('#video-preview');
const previewVideo = qs('#preview-video');
const videoInfo = qs('#video-info');
const outputFormat = qs('#output-format');
const audioQuality = qs('#audio-quality');
const status = qs('#status');
const extractBtn = qs('#extract-btn');
const clearBtn = qs('#clear-btn');
const output = qs('#output');
const outputPlaceholder = qs('#output-placeholder');
const audioResult = qs('#audio-result');
const audioPreview = qs('#audio-preview');
const audioInfo = qs('#audio-info');
const downloadBtn = qs('#download-btn');
const progressContainer = qs('#progress-container');
const progressText = qs('#progress-text');
const progressPercent = qs('#progress-percent');
const progressBar = qs('#progress-bar');

// State
let currentFile = null;
let extractedAudioBlob = null;
let isProcessing = false;
let ffmpeg = null;

// Progress helpers
function updateProgress(text, percent) {
  if (progressText) progressText.textContent = text || 'Processing...';
  
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

// Load FFmpeg.wasm
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  try {
    status.textContent = 'Loading FFmpeg...';
    status.style.color = 'var(--muted)';
    
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
        script.onload = () => setTimeout(resolve, 500);
        script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
        document.head.appendChild(script);
      });
    }
    
    // Check how FFmpeg is exposed
    if (window.FFmpegWASM && window.FFmpegWASM.FFmpeg) {
      // New API - FFmpeg class
      const { FFmpeg: FFmpegClass } = window.FFmpegWASM;
      ffmpeg = new FFmpegClass({
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js',
        log: false
      });
      
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        updateProgress('Extracting audio...', 20 + (percent * 0.7)); // 20-90%
      });
      
      updateProgress('Loading FFmpeg core...', 10);
      await ffmpeg.load();
      ffmpeg._useNewAPI = true;
      console.log('[Video Audio] ✓ FFmpeg loaded (new API)');
      return ffmpeg;
    }
    
    // Try old API
    let createFFmpegFunc = null;
    if (window.FFmpegWASM) {
      if (window.FFmpegWASM.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.createFFmpeg;
      } else if (window.FFmpegWASM.default && window.FFmpegWASM.default.createFFmpeg) {
        createFFmpegFunc = window.FFmpegWASM.default.createFFmpeg;
      }
    }
    
    if (window.FFmpeg && window.FFmpeg.createFFmpeg) {
      createFFmpegFunc = window.FFmpeg.createFFmpeg;
    } else if (window.createFFmpeg) {
      createFFmpegFunc = window.createFFmpeg;
    }
    
    if (createFFmpegFunc) {
      ffmpeg = createFFmpegFunc({
        log: false,
        progress: (p) => {
          const percent = Math.round(p.ratio * 100);
          updateProgress('Extracting audio...', 20 + (percent * 0.7));
        },
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/ffmpeg-core.js'
      });
      
      updateProgress('Loading FFmpeg core...', 10);
      await ffmpeg.load();
      console.log('[Video Audio] ✓ FFmpeg loaded (old API)');
      return ffmpeg;
    }
    
    throw new Error('FFmpeg not found');
  } catch (error) {
    console.error('[Video Audio] Failed to load FFmpeg:', error);
    throw new Error(`Failed to load FFmpeg: ${error.message}`);
  } finally {
    // Restore original Worker constructor
    if (window.OriginalWorker) {
      window.Worker = window.OriginalWorker;
    }
  }
}

// Extract audio from video
async function extractAudio() {
  if (!currentFile) {
    toast('Please upload a video first', 'error');
    return;
  }
  
  if (isProcessing) {
    toast('Already processing...', 'info');
    return;
  }
  
  try {
    isProcessing = true;
    extractBtn.disabled = true;
    outputPlaceholder.style.display = 'none';
    audioResult.style.display = 'none';
    updateProgress('Initializing...', 0);
    
    console.log('[Video Audio] Starting audio extraction...');
    
    // Load FFmpeg if needed
    if (!ffmpeg) {
      status.textContent = 'Loading FFmpeg...';
      await loadFFmpeg();
    }
    
    status.textContent = 'Processing video...';
    status.style.color = 'var(--muted)';
    
    // Get output format and quality
    let format = outputFormat.value;
    const quality = audioQuality.value;
    
    // Determine input filename - use a safe extension
    // Try to get extension from filename, fallback to mp4
    let inputExt = 'mp4';
    if (currentFile.name.includes('.')) {
      const ext = currentFile.name.split('.').pop().toLowerCase();
      // Only use extension if it's a known video format
      const validExts = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'm4v', 'flv', '3gp', 'ogv', 'mpeg', 'mpg', 'wmv', 'asf'];
      if (validExts.includes(ext)) {
        inputExt = ext;
      }
    }
    const inputName = `input.${inputExt}`;
    let outputName = `output.${format}`;
    
    console.log('[Video Audio] Input file:', inputName, 'Output:', outputName);
    
    updateProgress('Reading video file...', 10);
    
    // Read video file
    const videoData = await currentFile.arrayBuffer();
    const videoArray = new Uint8Array(videoData);
    
    console.log('[Video Audio] Video file size:', videoArray.length, 'bytes');
    
    updateProgress('Writing video to FFmpeg...', 15);
    
    // Write video to FFmpeg filesystem
    if (ffmpeg._useNewAPI || typeof ffmpeg.writeFile === 'function') {
      // New API - use Uint8Array
      await ffmpeg.writeFile(inputName, videoArray);
      console.log('[Video Audio] ✓ File written using new API');
    } else {
      // Old API - use ArrayBuffer
      await ffmpeg.FS('writeFile', inputName, videoData);
      console.log('[Video Audio] ✓ File written using old API');
    }
    
    // Verify file was written
    try {
      let writtenFile;
      if (ffmpeg._useNewAPI || typeof ffmpeg.readFile === 'function') {
        writtenFile = await ffmpeg.readFile(inputName);
      } else {
        writtenFile = ffmpeg.FS('readFile', inputName);
      }
      console.log('[Video Audio] ✓ Verified file written, size:', writtenFile.length, 'bytes');
    } catch (verifyError) {
      console.error('[Video Audio] Failed to verify written file:', verifyError);
      throw new Error('Failed to write video file to FFmpeg. File may be too large or corrupted.');
    }
    
    updateProgress('Extracting audio track...', 20);
    
    // Build FFmpeg command to extract audio
    // -i: input file
    // -vn: disable video (no video output)
    // -c:a: audio codec (newer syntax, preferred)
    // -b:a: audio bitrate (for lossy formats)
    const ffmpegArgs = ['-i', inputName, '-vn'];
    
    // Set audio codec and quality based on format
    // Using -c:a instead of -acodec (newer FFmpeg syntax)
    switch (format) {
      case 'mp3':
        ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', quality);
        break;
      case 'aac':
        ffmpegArgs.push('-c:a', 'aac', '-b:a', quality);
        break;
      case 'm4a':
        // M4A uses AAC codec in MP4 container
        ffmpegArgs.push('-c:a', 'aac', '-b:a', quality);
        break;
      case 'ogg':
        // OGG uses Vorbis codec, use quality scale instead of bitrate
        const oggQuality = quality === '192k' ? '5' : quality === '128k' ? '3' : '1';
        ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', oggQuality);
        break;
      case 'opus':
        ffmpegArgs.push('-c:a', 'libopus', '-b:a', quality);
        break;
      case 'flac':
        // FLAC is lossless
        ffmpegArgs.push('-c:a', 'flac');
        break;
      case 'wav':
        // WAV uses PCM codec (uncompressed)
        ffmpegArgs.push('-c:a', 'pcm_s16le');
        break;
      default:
        // Try to copy audio codec if possible
        ffmpegArgs.push('-c:a', 'copy');
    }
    
    ffmpegArgs.push('-y', outputName); // -y: overwrite output file if it exists
    
    console.log('[Video Audio] FFmpeg command:', ffmpegArgs.join(' '));
    
    // Enable FFmpeg logging to see what's happening
    let ffmpegLogs = [];
    let hasAudioStream = false;
    
    if (ffmpeg.on && typeof ffmpeg.on === 'function') {
      ffmpeg.on('log', ({ type, message }) => {
        console.log(`[Video Audio] FFmpeg ${type}:`, message);
        ffmpegLogs.push(message);
        
        // Check for audio stream in the logs
        if (type === 'stderr' || type === 'fferr') {
          // Look for audio stream indicators
          if (message.includes('Stream #') && (message.includes('Audio:') || message.includes('audio'))) {
            hasAudioStream = true;
            console.log('[Video Audio] ✓ Audio stream detected in video');
          }
          // Also check for "no audio" or "does not contain any stream"
          if (message.includes('does not contain any stream') || message.includes('no audio')) {
            console.warn('[Video Audio] ⚠ FFmpeg indicates no audio stream');
          }
        }
      });
    }
    
    // Run FFmpeg with error handling
    try {
      if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
        // New API - use exec
        console.log('[Video Audio] Executing FFmpeg with args:', ffmpegArgs);
        await ffmpeg.exec(ffmpegArgs);
        console.log('[Video Audio] ✓ FFmpeg execution completed');
        
        // Check logs for "does not contain any stream" error
        const logText = ffmpegLogs.join('\n');
        if (logText.includes('does not contain any stream')) {
          // Check if video has audio stream
          const audioStreamRegex = /Stream #\d+:\d+.*Audio:/i;
          const hasAudioInLogs = audioStreamRegex.test(logText);
          
          if (!hasAudioInLogs) {
            throw new Error('This video file does not contain an audio track. It only has a video stream. Please use a video file that includes audio.');
          }
        }
      } else {
        // Old API - use run
        console.log('[Video Audio] Running FFmpeg with args:', ffmpegArgs);
        await ffmpeg.run(...ffmpegArgs);
        console.log('[Video Audio] ✓ FFmpeg execution completed');
      }
    } catch (ffmpegError) {
      console.error('[Video Audio] FFmpeg execution error:', ffmpegError);
      
      // Provide more helpful error messages
      const errorMsg = ffmpegError?.message || String(ffmpegError);
      console.error('[Video Audio] Full FFmpeg error:', ffmpegError);
      
      if (errorMsg.includes('FS error') || errorMsg.includes('No such file') || errorMsg.includes('ENOENT')) {
        throw new Error('FFmpeg could not access the video file. The file may be corrupted, too large, or in an unsupported format.');
      } else if (errorMsg.includes('codec') || errorMsg.includes('encoder') || errorMsg.includes('not found')) {
        // Try fallback: extract as WAV first, then convert if needed
        console.log('[Video Audio] Codec error, trying WAV fallback...');
        throw new Error(`Audio codec not available in FFmpeg.wasm. Try using WAV format instead, or a different output format. Error: ${errorMsg}`);
      } else if (errorMsg.includes('Invalid data') || errorMsg.includes('Invalid argument')) {
        throw new Error('The video file appears to be corrupted or in an unsupported format. Try a different video file.');
      } else if (errorMsg.includes('Stream') || errorMsg.includes('audio')) {
        throw new Error('Could not find audio track in video. The video may not have an audio stream.');
      }
      throw new Error(`FFmpeg error: ${errorMsg}`);
    }
    
    updateProgress('Reading extracted audio...', 90);
    
    // Wait a moment for FFmpeg to finish writing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // List files to debug
    let filesInFS = [];
    let fileNames = [];
    try {
      if (ffmpeg._useNewAPI || typeof ffmpeg.listDir === 'function') {
        filesInFS = await ffmpeg.listDir('/');
        // Extract file names from objects
        fileNames = filesInFS.map(f => f.isDir ? `${f.name}/` : f.name);
        console.log('[Video Audio] Files in FFmpeg FS:', fileNames);
      } else if (ffmpeg.FS) {
        filesInFS = ffmpeg.FS('readdir', '/');
        fileNames = filesInFS;
        console.log('[Video Audio] Files in FFmpeg FS:', fileNames);
      }
      
      // Check if output file exists
      if (!fileNames.includes(outputName)) {
        console.error('[Video Audio] Output file not found in FS. Available files:', fileNames);
        console.error('[Video Audio] This usually means the codec is not available in FFmpeg.wasm');
        
        // Try to probe the video first to check if it has audio
        console.log('[Video Audio] Probing video file to check for audio track...');
        try {
          const probeArgs = ['-i', inputName, '-hide_banner'];
          if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
            // Try to get video info (this will fail but give us error output)
            try {
              await ffmpeg.exec(probeArgs);
            } catch (probeError) {
              // FFmpeg always exits with error when using -i without output, but we can check stderr
              const errorMsg = probeError?.message || String(probeError);
              console.log('[Video Audio] Video probe output:', errorMsg);
              
              // Check if error mentions "no audio" or similar
              if (errorMsg.includes('no audio') || errorMsg.includes('Stream #0') && !errorMsg.includes('Audio:')) {
                throw new Error('The video file does not appear to have an audio track.');
              }
            }
          }
        } catch (probeError) {
          if (probeError.message && probeError.message.includes('no audio')) {
            throw probeError;
          }
          console.warn('[Video Audio] Could not probe video:', probeError);
        }
        
        // Try fallback: extract to WAV (PCM is always available)
        if (format !== 'wav') {
          console.log('[Video Audio] Codec not available, attempting fallback: extracting to WAV...');
          const wavOutputName = 'output.wav';
          // Try simpler WAV command - just copy audio if possible, otherwise encode
          const wavArgs = ['-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', '-y', wavOutputName];
          
          console.log('[Video Audio] WAV extraction command:', wavArgs.join(' '));
          
          try {
            if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
              await ffmpeg.exec(wavArgs);
            } else {
              await ffmpeg.run(...wavArgs);
            }
            
            // Wait a bit for file to be written
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Check if WAV was created
            const wavFiles = ffmpeg._useNewAPI ? await ffmpeg.listDir('/') : ffmpeg.FS('readdir', '/');
            const wavFileNames = ffmpeg._useNewAPI ? wavFiles.map(f => f.isDir ? `${f.name}/` : f.name) : wavFiles;
            
            console.log('[Video Audio] Files after WAV extraction:', wavFileNames);
            
            if (wavFileNames.includes(wavOutputName)) {
              console.log('[Video Audio] ✓ WAV extraction successful as fallback');
              // Use WAV as output instead
              outputName = wavOutputName;
              format = 'wav';
              toast(`The requested codec is not available in FFmpeg.wasm. Extracted as WAV instead.`, 'warning');
            } else {
              // Try even simpler - just copy the audio stream
              console.log('[Video Audio] Trying audio stream copy...');
              const copyArgs = ['-i', inputName, '-vn', '-acodec', 'copy', '-y', wavOutputName];
              try {
                if (ffmpeg._useNewAPI || typeof ffmpeg.exec === 'function') {
                  await ffmpeg.exec(copyArgs);
                } else {
                  await ffmpeg.run(...copyArgs);
                }
                await new Promise(resolve => setTimeout(resolve, 200));
                const copyFiles = ffmpeg._useNewAPI ? await ffmpeg.listDir('/') : ffmpeg.FS('readdir', '/');
                const copyFileNames = ffmpeg._useNewAPI ? copyFiles.map(f => f.isDir ? `${f.name}/` : f.name) : copyFiles;
                if (copyFileNames.includes(wavOutputName)) {
                  outputName = wavOutputName;
                  format = 'wav';
                  toast(`Extracted audio using stream copy.`, 'info');
                } else {
                  throw new Error('WAV extraction failed - video may not have audio track');
                }
              } catch (copyError) {
                throw new Error('WAV extraction also failed - video may not have an audio track or FFmpeg.wasm has limitations');
              }
            }
          } catch (fallbackError) {
            console.error('[Video Audio] WAV fallback failed:', fallbackError);
            const errorMsg = fallbackError?.message || String(fallbackError);
            
            // Check if the issue is no audio stream
            const logText = ffmpegLogs.join('\n');
            if (logText.includes('does not contain any stream') || logText.includes('Output file #0 does not contain any stream')) {
              const audioStreamRegex = /Stream #\d+:\d+.*Audio:/i;
              const hasAudioInLogs = audioStreamRegex.test(logText);
              
              if (!hasAudioInLogs) {
                throw new Error('This video file does not contain an audio track. It only has a video stream. Please use a video file that includes audio.');
              }
            }
            
            throw new Error(`Audio extraction failed. The video may not have an audio track, or FFmpeg.wasm encountered an error: ${errorMsg}`);
          }
        } else {
          throw new Error(`Output file '${outputName}' was not created by FFmpeg. The video may not have an audio track, or FFmpeg encountered an error.`);
        }
      }
    } catch (listError) {
      // If it's our custom error, rethrow it
      if (listError.message && listError.message.includes('Codec') || listError.message.includes('WAV')) {
        throw listError;
      }
      console.warn('[Video Audio] Could not list/verify files:', listError);
      // Continue anyway - might still work
    }
    
    // Read output file with error handling
    let audioData;
    try {
      if (ffmpeg._useNewAPI || typeof ffmpeg.readFile === 'function') {
        console.log('[Video Audio] Reading file using new API:', outputName);
        audioData = await ffmpeg.readFile(outputName);
        console.log('[Video Audio] Raw readFile result type:', typeof audioData, 'constructor:', audioData?.constructor?.name);
        
        // Handle different return types
        if (audioData instanceof Uint8Array) {
          console.log('[Video Audio] Got Uint8Array, size:', audioData.length);
        } else if (audioData instanceof ArrayBuffer) {
          console.log('[Video Audio] Got ArrayBuffer, converting to Uint8Array');
          audioData = new Uint8Array(audioData);
        } else if (audioData && typeof audioData === 'object') {
          if ('data' in audioData) {
            // Some FFmpeg.wasm versions return {data: Uint8Array}
            console.log('[Video Audio] Got object with data property');
            audioData = audioData.data instanceof Uint8Array ? audioData.data : new Uint8Array(audioData.data);
          } else if (Array.isArray(audioData)) {
            console.log('[Video Audio] Got array, converting to Uint8Array');
            audioData = new Uint8Array(audioData);
          } else {
            // Try to convert to Uint8Array
            console.log('[Video Audio] Converting object to Uint8Array');
            audioData = new Uint8Array(Object.values(audioData));
          }
        } else {
          console.log('[Video Audio] Converting to Uint8Array');
          audioData = new Uint8Array(audioData);
        }
      } else {
        console.log('[Video Audio] Reading file using old API:', outputName);
        audioData = ffmpeg.FS('readFile', outputName);
        if (!(audioData instanceof Uint8Array)) {
          audioData = new Uint8Array(audioData);
        }
      }
      
      if (!audioData || audioData.length === 0) {
        throw new Error('Output file is empty or could not be read');
      }
      
      console.log('[Video Audio] ✓ Audio data read, size:', audioData.length, 'bytes');
    } catch (readError) {
      console.error('[Video Audio] Failed to read output file:', readError);
      const errorMsg = readError?.message || String(readError);
      if (errorMsg.includes('FS error') || errorMsg.includes('No such file') || errorMsg.includes('ENOENT')) {
        throw new Error(`Output file '${outputName}' not found. FFmpeg may have failed to create the audio file. Possible causes: codec not available (try WAV format), video has no audio track, or FFmpeg.wasm limitation.`);
      }
      throw new Error(`Failed to read output file: ${errorMsg}`);
    }
    
    // Create blob from audio data
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'opus': 'audio/opus',
      'flac': 'audio/flac'
    };
    
    const mimeType = mimeTypes[format] || 'audio/mpeg';
    
    // Create blob - handle both ArrayBuffer and Uint8Array
    // Use .buffer if it's a Uint8Array to get the underlying ArrayBuffer
    const blobData = audioData.buffer || audioData;
    extractedAudioBlob = new Blob([blobData], { type: mimeType });
    
    console.log('[Video Audio] ✓ Audio extracted, size:', (extractedAudioBlob.size / (1024 * 1024)).toFixed(2), 'MB');
    
    // Display audio preview
    const audioUrl = URL.createObjectURL(extractedAudioBlob);
    audioPreview.src = audioUrl;
    
    // Show audio info
    const audioSizeMB = (extractedAudioBlob.size / (1024 * 1024)).toFixed(2);
    audioInfo.textContent = `Format: ${format.toUpperCase()} | Size: ${audioSizeMB} MB | Quality: ${quality}`;
    
    audioResult.style.display = 'block';
    downloadBtn.disabled = false;
    
    updateProgress('Complete!', 100);
    setTimeout(hideProgress, 1000);
    
    status.textContent = 'Audio extracted successfully!';
    status.style.color = 'var(--ok)';
    
    toast('Audio extracted successfully!', 'success');
  } catch (error) {
    console.error('[Video Audio] Extraction error:', error);
    hideProgress();
    status.textContent = `Error: ${error.message}`;
    status.style.color = 'var(--error)';
    toast(`Failed to extract audio: ${error.message}`, 'error');
    outputPlaceholder.style.display = 'block';
    outputPlaceholder.textContent = `Error: ${error.message}`;
  } finally {
    isProcessing = false;
    extractBtn.disabled = false;
    
    // Clean up FFmpeg filesystem
    if (ffmpeg) {
      try {
        const inputName = `input.${currentFile.name.split('.').pop().toLowerCase()}`;
        const outputName = `output.${outputFormat.value}`;
        
        if (ffmpeg._useNewAPI || typeof ffmpeg.deleteFile === 'function') {
          await ffmpeg.deleteFile(inputName).catch(() => {});
          await ffmpeg.deleteFile(outputName).catch(() => {});
        } else {
          try {
            ffmpeg.FS('unlink', inputName);
            ffmpeg.FS('unlink', outputName);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Handle file input
function handleFileSelect(file) {
  if (!file) return;
  
  // Validate file type
  const hasValidExtension = /\.(mp4|webm|avi|mov|mkv|m4v|flv|3gp|ogv|mpeg|mpg|wmv|asf)$/i.test(file.name);
  const hasValidMimeType = file.type && file.type.startsWith('video/');
  
  if (!hasValidMimeType && !hasValidExtension) {
    toast('Please upload a video file (MP4, WebM, AVI, MOV, etc.)', 'error');
    return;
  }
  
  // Validate file size (max 500MB)
  if (file.size > 500 * 1024 * 1024) {
    toast('Video file is too large. Please use a video smaller than 500MB', 'error');
    return;
  }
  
  currentFile = file;
  extractedAudioBlob = null;
  
  // Show preview
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  videoPreview.style.display = 'block';
  
  // Show file info
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const duration = 'Loading...';
  videoInfo.textContent = `${file.name} (${sizeMB} MB)`;
  
  // Try to get video duration
  previewVideo.onloadedmetadata = () => {
    const durationSeconds = previewVideo.duration;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    videoInfo.textContent = `${file.name} (${sizeMB} MB, ${minutes}:${seconds.toString().padStart(2, '0')})`;
  };
  
  extractBtn.disabled = false;
  audioResult.style.display = 'none';
  outputPlaceholder.style.display = 'block';
  status.textContent = 'Ready to extract audio';
  status.style.color = 'var(--muted)';
  hideProgress();
}

// Clear everything
function clearAll() {
  fileInput.value = '';
  currentFile = null;
  extractedAudioBlob = null;
  videoPreview.style.display = 'none';
  previewVideo.src = '';
  videoInfo.textContent = '';
  extractBtn.disabled = false;
  outputPlaceholder.style.display = 'block';
  outputPlaceholder.textContent = 'Upload a video and click "Extract Audio" to get the audio track';
  audioResult.style.display = 'none';
  audioPreview.src = '';
  audioInfo.textContent = '';
  downloadBtn.disabled = true;
  status.textContent = 'Ready';
  status.style.color = 'var(--muted)';
  hideProgress();
  
  // Clean up object URLs
  if (previewVideo.src && previewVideo.src.startsWith('blob:')) {
    URL.revokeObjectURL(previewVideo.src);
  }
  if (audioPreview.src && audioPreview.src.startsWith('blob:')) {
    URL.revokeObjectURL(audioPreview.src);
  }
}

// Download extracted audio
function downloadAudio() {
  if (!extractedAudioBlob) return;
  
  try {
    const format = outputFormat.value;
    const originalName = currentFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const fileName = `${originalName}.${format}`;
    
    const url = URL.createObjectURL(extractedAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast('Audio downloaded!', 'success');
  } catch (error) {
    console.error('Failed to download:', error);
    toast('Failed to download audio', 'error');
  }
}

// Event listeners
on(fileUploadArea, 'click', () => fileInput.click());

on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelect(file);
  }
});

// Drag and drop
on(fileUploadArea, 'dragover', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--primary)';
  fileUploadArea.style.background = 'var(--bg)';
});

on(fileUploadArea, 'dragleave', () => {
  fileUploadArea.style.borderColor = 'var(--border)';
  fileUploadArea.style.background = 'var(--bg-elev)';
});

on(fileUploadArea, 'drop', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--border)';
  fileUploadArea.style.background = 'var(--bg-elev)';
  
  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelect(file);
  }
});

on(extractBtn, 'click', extractAudio);
on(clearBtn, 'click', clearAll);
on(downloadBtn, 'click', downloadAudio);

