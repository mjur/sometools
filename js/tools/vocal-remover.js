// Vocal Remover Tool
// Uses center channel extraction to remove vocals from stereo audio

import { qs, on, toast } from '/js/ui.js';

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
    
    progressFill.style.width = '85%';
    progressText.textContent = 'Converting to WAV...';
    console.log('[Vocal Remover] Converting to WAV format...');
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Convert to WAV (chunked to avoid blocking)
    const wavStartTime = performance.now();
    console.log('[Vocal Remover] Starting WAV conversion, buffer length:', outputBuffer.length);
    const wavBuffer = await audioBufferToWavChunked(outputBuffer, (progress) => {
      const wavProgress = 85 + (progress * 10); // 85% to 95%
      progressFill.style.width = wavProgress + '%';
      progressText.textContent = `Converting to WAV: ${Math.round(progress * 100)}%`;
    });
    const wavTime = performance.now() - wavStartTime;
    console.log('[Vocal Remover] WAV conversion completed in', wavTime.toFixed(2), 'ms, buffer size:', wavBuffer.byteLength);
    
    processedBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    console.log('[Vocal Remover] Blob created, size:', (processedBlob.size / 1024 / 1024).toFixed(2), 'MB');
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

// Download processed audio
on(downloadBtn, 'click', () => {
  if (!processedBlob) {
    toast('No processed audio available', 'warning');
    return;
  }
  
  // Use the existing blob URL if available, otherwise create a new one
  const url = outputAudioUrl || URL.createObjectURL(processedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `instrumental_${Date.now()}.wav`;
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

