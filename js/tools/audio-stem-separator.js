// Audio Stem Separator Tool
// Separates audio into stems (drums, bass, vocals, other) using Demucs ONNX model

import { qs, on, toast, downloadFile } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';

const audioInput = qs('#audio-input');
const dropZone = qs('#drop-zone');
const processBtn = qs('#process-btn');
const clearBtn = qs('#clear-btn');
const downloadAllBtn = qs('#download-all-btn');
const inputInfo = qs('#input-info');
const status = qs('#status');
const progressContainer = qs('#progress-container');
const progressFill = qs('#progress-fill');
const progressText = qs('#progress-text');
const modelSelect = qs('#model-select');
const originalAudio = qs('#original-audio');
const originalContainer = qs('#original-audio-container');
const originalPlaceholder = qs('#original-placeholder');
const stemsSection = qs('#stems-section');
const stemGrid = qs('#stem-grid');

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let originalAudioUrl = null;
let separatedStems = null;
let stemBlobs = {};
let ort = null;
let modelSession = null;
let isProcessing = false;

// Model configurations
const MODEL_CONFIGS = {
  'htdemucs-6s': {
    name: 'HTDemucs 6s',
    key: 'demucs-htdemucs-6s',
    modelUrl: 'https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs_6s.onnx',
    fallbackUrls: [],
    stems: ['drums', 'bass', 'other', 'vocals', 'piano', 'guitar'],
    inputName: 'input', // Model expects 'input', not 'audio'
    outputName: '5012', // Actual output tensor name for htdemucs_6s
    sampleRate: 44100,
    chunkSize: 343980, // ~7.8 seconds at 44.1kHz (exact chunk size for HTDemucs)
    expectsStereo: true,
  },
  'htdemucs-4s': {
    name: 'HTDemucs 4s',
    key: 'demucs-htdemucs-4s',
    modelUrl: 'https://huggingface.co/arjune123/demucs-onnx/resolve/main/htdemucs.onnx',
    fallbackUrls: [],
    stems: ['drums', 'bass', 'other', 'vocals'],
    inputName: 'input', // Model expects 'input', not 'audio'
    outputName: 'output', // May need to be adjusted based on actual model
    sampleRate: 44100,
    chunkSize: 44100 * 10, // 10 seconds
    expectsStereo: true,
  },
};

// Update progress
function updateProgress(text, percent) {
  if (progressText) progressText.textContent = text || 'Processing...';
  if (progressFill) {
    const validPercent = Math.max(0, Math.min(100, percent || 0));
    progressFill.style.width = `${validPercent}%`;
  }
  if (progressContainer) progressContainer.style.display = 'block';
}

function hideProgress() {
  if (progressContainer) progressContainer.style.display = 'none';
}

// Resample audio buffer
async function resampleAudio(buffer, targetSampleRate) {
  if (buffer.sampleRate === targetSampleRate) {
    return buffer;
  }
  
  const ratio = buffer.sampleRate / targetSampleRate;
  const newLength = Math.floor(buffer.length / ratio);
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    newLength,
    targetSampleRate
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start();
  
  return await offlineContext.startRendering();
}

// Handle file input
async function handleFile(file) {
  if (!file) return;
  
  try {
    status.textContent = 'Loading audio file...';
    status.style.color = 'var(--muted)';
    
    const hasValidExtension = /\.(mp3|wav|ogg|m4a|flac|aac|opus|wma|mp4|m4v)$/i.test(file.name);
    const hasValidMimeType = file.type && file.type.startsWith('audio/');
    
    if (!hasValidMimeType && !hasValidExtension) {
      throw new Error('Please select an audio file');
    }
    
    currentFile = file;
    
    // Display file info
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    inputInfo.textContent = `File: ${file.name} (${fileSize} MB)`;
    inputInfo.style.display = 'block';
    
    // Load and preview audio
    const url = URL.createObjectURL(file);
    originalAudioUrl = url;
    originalAudio.src = url;
    originalContainer.style.display = 'block';
    originalPlaceholder.style.display = 'none';
    
    // Load audio buffer for processing
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    status.textContent = 'Audio file loaded. Click "Separate Stems" to process.';
    status.style.color = 'var(--success)';
    processBtn.disabled = false;
    
  } catch (error) {
    console.error('Error loading file:', error);
    toast(`Error loading file: ${error.message}`, 'error');
    status.textContent = `Error: ${error.message}`;
    status.style.color = 'var(--error)';
  }
}

// Load ONNX model
async function loadModel(modelConfig) {
  if (modelSession && modelSession.modelKey === modelConfig.key) {
    return modelSession.session;
  }
  
  updateProgress('Loading ONNX Runtime...', 5);
  
  if (!ort) {
    ort = await loadONNXRuntime();
  }
  
  updateProgress(`Downloading model: ${modelConfig.name}...`, 10);
  
  // Try primary URL first, then fallbacks
  let modelData = null;
  const urlsToTry = [modelConfig.modelUrl, ...(modelConfig.fallbackUrls || [])];
  
  for (const modelUrl of urlsToTry) {
    try {
      console.log(`[Audio Stem Separator] Trying to load model from: ${modelUrl}`);
      modelData = await getOrDownloadModel(
        modelConfig.key + '_' + modelUrl.split('/').slice(-2).join('_'), // Unique key per URL
        modelUrl,
        (loaded, total) => {
          if (total > 0) {
            const percent = Math.round((loaded / total) * 100);
            const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
            const totalMB = (total / (1024 * 1024)).toFixed(1);
            updateProgress(`Downloading model: ${loadedMB} MB / ${totalMB} MB (${percent}%)...`, 10 + (percent * 0.2));
          }
        }
      );
      console.log(`[Audio Stem Separator] Model loaded successfully from: ${modelUrl}`);
      break; // Success, exit loop
    } catch (error) {
      console.warn(`[Audio Stem Separator] Failed to load from ${modelUrl}:`, error);
      if (modelUrl === urlsToTry[urlsToTry.length - 1]) {
        // Last URL failed, throw error
        throw new Error(`Failed to load model from all URLs: ${error.message}`);
      }
      // Try next URL
      continue;
    }
  }
  
  if (!modelData) {
    throw new Error('Failed to load model: No data received');
  }
  
  updateProgress('Creating inference session...', 30);
  
  const session = await createInferenceSession(modelData, {
    executionProviders: ['wasm'],
  });
  
  modelSession = { session, modelKey: modelConfig.key };
  return session;
}

// Process audio in chunks
async function separateStems(audioBuffer, modelConfig, session) {
  const sampleRate = modelConfig.sampleRate;
  const chunkSize = modelConfig.chunkSize;
  const expectsStereo = modelConfig.expectsStereo;
  
  // Resample if needed
  let processedBuffer = audioBuffer;
  if (audioBuffer.sampleRate !== sampleRate) {
    updateProgress('Resampling audio...', 40);
    processedBuffer = await resampleAudio(audioBuffer, sampleRate);
  }
  
  // Get audio data
  const numberOfChannels = processedBuffer.numberOfChannels;
  const length = processedBuffer.length;
  
  // Prepare input data
  let inputData;
  if (expectsStereo) {
    // Convert to stereo if needed
    if (numberOfChannels === 1) {
      // Mono to stereo
      const monoData = processedBuffer.getChannelData(0);
      inputData = new Float32Array(length * 2);
      for (let i = 0; i < length; i++) {
        inputData[i * 2] = monoData[i];
        inputData[i * 2 + 1] = monoData[i];
      }
    } else {
      // Use first two channels or duplicate first channel
      const leftChannel = processedBuffer.getChannelData(0);
      const rightChannel = numberOfChannels > 1 ? processedBuffer.getChannelData(1) : leftChannel;
      inputData = new Float32Array(length * 2);
      for (let i = 0; i < length; i++) {
        inputData[i * 2] = leftChannel[i];
        inputData[i * 2 + 1] = rightChannel[i];
      }
    }
  } else {
    // Mono input
    inputData = processedBuffer.getChannelData(0);
  }
  
  const numStems = modelConfig.stems.length;
  const samplesPerChannel = expectsStereo ? length : length;
  const chunkSizeSamples = expectsStereo ? chunkSize : chunkSize;
  const totalChunks = Math.ceil(samplesPerChannel / chunkSizeSamples);
  
  const stems = Array(numStems).fill(null).map(() => []);
  
  updateProgress(`Processing ${totalChunks} chunks...`, 50);
  
  // Process in chunks
  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const startSample = chunkIdx * chunkSizeSamples;
    const endSample = Math.min(startSample + chunkSizeSamples, samplesPerChannel);
    const actualChunkSize = endSample - startSample;
    
    // Yield to UI
    if (chunkIdx > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    const progress = 50 + (chunkIdx / totalChunks) * 40;
    updateProgress(`Processing chunk ${chunkIdx + 1}/${totalChunks}...`, progress);
    
    // Extract chunk
    let chunk;
    if (expectsStereo) {
      // Extract stereo chunk (planar format: [L, L, L, ..., R, R, R, ...])
      const leftChannel = new Float32Array(actualChunkSize);
      const rightChannel = new Float32Array(actualChunkSize);
      for (let i = 0; i < actualChunkSize; i++) {
        const interleavedIdx = (startSample + i) * 2;
        leftChannel[i] = inputData[interleavedIdx];
        rightChannel[i] = inputData[interleavedIdx + 1];
      }
      chunk = new Float32Array(actualChunkSize * 2);
      chunk.set(leftChannel, 0);
      chunk.set(rightChannel, actualChunkSize);
    } else {
      chunk = inputData.slice(startSample, endSample);
    }
    
    // Pad chunk to exact size if needed
    if (actualChunkSize < chunkSizeSamples) {
      const paddedChunk = new Float32Array(chunkSizeSamples * (expectsStereo ? 2 : 1));
      paddedChunk.set(chunk, 0);
      chunk = paddedChunk;
    }
    
    // Prepare input tensor
    const inputShape = expectsStereo ? [1, 2, chunkSizeSamples] : [1, chunkSizeSamples];
    const inputTensor = new ort.Tensor('float32', chunk, inputShape);
    
    // Prepare feeds - check what inputs the session expects
    const feeds = { [modelConfig.inputName]: inputTensor };
    
    // Handle additional inputs that the model might require
    // Some Demucs models require 'onnx::ReduceMean_1' input
    const allInputNames = session.inputNames || [];
    for (const inputName of allInputNames) {
      if (inputName !== modelConfig.inputName && !feeds[inputName]) {
        if (inputName === 'onnx::ReduceMean_1') {
          // Check if this input is optional by looking at the input metadata
          const inputMeta = session.inputs?.find(inp => inp.name === inputName);
          const isOptional = inputMeta?.optional || false;
          
          if (!isOptional) {
            // Compute statistics from the chunk to create the ReduceMean input
            const expectedShape = inputMeta?.shape || [1, 4, 2048, 336];
            const totalSize = expectedShape.reduce((a, b) => a * (b > 0 ? b : 1), 1);
            
            // Compute statistics from the chunk
            let sum = 0;
            let sumSq = 0;
            const chunkLength = chunk.length;
            
            for (let i = 0; i < chunkLength; i++) {
              const val = chunk[i];
              sum += val;
              sumSq += val * val;
            }
            
            const mean = sum / chunkLength;
            const variance = (sumSq / chunkLength) - (mean * mean);
            const std = Math.sqrt(Math.max(0, variance));
            const rms = Math.sqrt(sumSq / chunkLength);
            
            // Use RMS-based fill value
            const fillValue = Math.max(0.0001, Math.min(0.1, rms * 0.1));
            
            console.log(`[Audio Stem Separator] Chunk ${chunkIdx}: onnx::ReduceMean_1 - mean: ${mean.toFixed(6)}, std: ${std.toFixed(6)}, rms: ${rms.toFixed(6)}, fillValue: ${fillValue.toFixed(6)}`);
            
            const meanData = new Float32Array(totalSize).fill(fillValue);
            feeds[inputName] = new ort.Tensor('float32', meanData, expectedShape);
          } else {
            console.log(`[Audio Stem Separator] Chunk ${chunkIdx}: onnx::ReduceMean_1 is optional, skipping`);
          }
        } else {
          // Default scalar or tensor
          const inputMeta = session.inputs?.find(inp => inp.name === inputName);
          const shape = inputMeta?.shape || [];
          const type = inputMeta?.type || 'float32';
          
          if (shape.length === 0) {
            feeds[inputName] = new ort.Tensor(type, new Float32Array([0]), []);
          } else {
            const totalSize = shape.reduce((a, b) => a * (b > 0 ? b : 1), 1);
            feeds[inputName] = new ort.Tensor(type, new Float32Array(totalSize).fill(0), shape);
          }
        }
      }
    }
    
    // Run inference
    const results = await runInference(session, feeds);
    
    // Find output tensor
    let outputTensor = results[modelConfig.outputName];
    if (!outputTensor || (outputTensor.dims && outputTensor.dims.length !== 4)) {
      // Try to find 4D output tensor
      for (const [name, tensor] of Object.entries(results)) {
        if (tensor.dims && tensor.dims.length === 4) {
          const [batch, stems, channels, samples] = tensor.dims;
          if (batch === 1 && stems > 0 && channels > 0 && samples > 0) {
            outputTensor = tensor;
            console.log(`[Audio Stem Separator] Using output tensor: ${name}`);
            break;
          }
        }
      }
    }
    
    if (!outputTensor) {
      throw new Error('No suitable output tensor found');
    }
    
    // Extract stems from output
    // Output shape: [batch, stems, channels, samples]
    const dims = outputTensor.dims;
    const [batch, numOutputStems, numChannels, numSamples] = dims;
    
    const outputData = outputTensor.data instanceof Float32Array 
      ? outputTensor.data 
      : new Float32Array(outputTensor.data);
    
    // Extract each stem (average channels if stereo)
    for (let stemIdx = 0; stemIdx < Math.min(numStems, numOutputStems); stemIdx++) {
      const stemData = new Float32Array(Math.min(actualChunkSize, numSamples));
      for (let i = 0; i < stemData.length; i++) {
        if (numChannels === 2) {
          // Average stereo channels
          const leftIdx = stemIdx * numChannels * numSamples + i;
          const rightIdx = stemIdx * numChannels * numSamples + numSamples + i;
          stemData[i] = (outputData[leftIdx] + outputData[rightIdx]) / 2;
        } else {
          stemData[i] = outputData[stemIdx * numSamples + i];
        }
      }
      stems[stemIdx].push(stemData);
    }
  }
  
  // Concatenate all chunks for each stem
  const finalStems = stems.map(stemChunks => {
    const totalLength = stemChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const concatenated = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of stemChunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }
    return concatenated;
  });
  
  return finalStems;
}

// Convert Float32Array to WAV blob
function float32ToWav(audioData, sampleRate) {
  const length = audioData.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  
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
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float32 to int16
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

// Display separated stems
function displayStems(stems, modelConfig) {
  stemsSection.style.display = 'block';
  stemGrid.innerHTML = '';
  
  separatedStems = {};
  stemBlobs = {};
  
  stems.forEach((stemData, index) => {
    const stemName = modelConfig.stems[index];
    separatedStems[stemName] = stemData;
    
    const card = document.createElement('div');
    card.className = 'stem-card';
    
    const blob = float32ToWav(stemData, modelConfig.sampleRate);
    stemBlobs[stemName] = blob;
    const url = URL.createObjectURL(blob);
    
    card.innerHTML = `
      <h3>${stemName.charAt(0).toUpperCase() + stemName.slice(1)}</h3>
      <audio class="stem-audio" controls src="${url}"></audio>
      <div class="stem-actions">
        <button class="download-stem-btn" data-stem="${stemName}">Download</button>
      </div>
    `;
    
    stemGrid.appendChild(card);
  });
  
  // Add download handlers
  document.querySelectorAll('.download-stem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stemName = btn.dataset.stem;
      const blob = stemBlobs[stemName];
      if (blob) {
        const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
        downloadFile(blob, `${baseName}_${stemName}.wav`);
      }
    });
  });
}

// Process audio
async function processAudio() {
  if (!currentFile || !audioBuffer || isProcessing) return;
  
  isProcessing = true;
  processBtn.disabled = true;
  stemsSection.style.display = 'none';
  
  try {
    const modelKey = modelSelect.value;
    const modelConfig = MODEL_CONFIGS[modelKey];
    
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`);
    }
    
    updateProgress('Loading model...', 0);
    const session = await loadModel(modelConfig);
    
    updateProgress('Separating stems...', 50);
    const stems = await separateStems(audioBuffer, modelConfig, session);
    
    updateProgress('Finalizing...', 95);
    displayStems(stems, modelConfig);
    
    hideProgress();
    status.textContent = 'Stems separated successfully!';
    status.style.color = 'var(--success)';
    downloadAllBtn.disabled = false;
    
  } catch (error) {
    console.error('Error processing audio:', error);
    toast(`Error: ${error.message}`, 'error');
    status.textContent = `Error: ${error.message}`;
    status.style.color = 'var(--error)';
    hideProgress();
  } finally {
    isProcessing = false;
    processBtn.disabled = false;
  }
}

// Download all stems as ZIP (using JSZip if available, otherwise individual downloads)
async function downloadAllStems() {
  if (!separatedStems || !stemBlobs) return;
  
  try {
    // Try to use JSZip if available
    let JSZip;
    try {
      JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    } catch (e) {
      console.log('JSZip not available, downloading individually');
    }
    
    if (JSZip) {
      updateProgress('Creating ZIP file...', 0);
      const zip = new JSZip();
      const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
      
      for (const [stemName, blob] of Object.entries(stemBlobs)) {
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(`${baseName}_${stemName}.wav`, arrayBuffer);
      }
      
      updateProgress('Generating ZIP...', 50);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `${baseName}_stems.zip`);
      hideProgress();
      toast('All stems downloaded as ZIP!', 'success');
    } else {
      // Fallback: download individually
      toast('Downloading all stems...', 'info');
      const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
      
      for (const [stemName, blob] of Object.entries(stemBlobs)) {
        downloadFile(blob, `${baseName}_${stemName}.wav`);
        // Small delay to avoid browser blocking multiple downloads
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast('All stems downloaded!', 'success');
    }
  } catch (error) {
    console.error('Error downloading stems:', error);
    toast(`Error: ${error.message}`, 'error');
  }
}

// Clear everything
function clearAll() {
  currentFile = null;
  audioBuffer = null;
  separatedStems = null;
  stemBlobs = {};
  
  if (originalAudioUrl) {
    URL.revokeObjectURL(originalAudioUrl);
    originalAudioUrl = null;
  }
  
  // Revoke all stem blob URLs
  document.querySelectorAll('.stem-audio').forEach(audio => {
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
  });
  
  originalAudio.src = '';
  originalContainer.style.display = 'none';
  originalPlaceholder.style.display = 'block';
  stemsSection.style.display = 'none';
  stemGrid.innerHTML = '';
  inputInfo.style.display = 'none';
  status.textContent = '';
  processBtn.disabled = true;
  downloadAllBtn.disabled = true;
  hideProgress();
}

// Event listeners
on(audioInput, 'change', (e) => handleFile(e.target.files[0]));
on(dropZone, 'click', () => audioInput.click());
on(dropZone, 'dragover', (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = 'var(--bg-hover)';
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
on(processBtn, 'click', processAudio);
on(clearBtn, 'click', clearAll);
on(downloadAllBtn, 'click', downloadAllStems);

console.log('🎵 Audio Stem Separator loaded');

