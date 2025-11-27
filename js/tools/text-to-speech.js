// Text-to-Speech tool with AI models
import { qs, on } from '/js/ui.js';
import { loadONNXRuntime, createInferenceSession, runInference } from '/js/utils/onnx-loader.js';
import { getOrDownloadModel } from '/js/utils/model-cache.js';

let voices = [];
let audioBlob = null;
let ort = null;
let ttsSession = null;

// TTS Model configurations
// Using Hugging Face CDN for direct model access
const TTS_MODEL_CONFIGS = {
  kokoro: {
    key: 'tts-kokoro-v1',
    url: 'https://huggingface.co/NeuML/kokoro-base-onnx/resolve/main/model.onnx',
    name: 'Kokoro Base TTS',
    description: 'High-quality TTS with multiple speakers and accents',
    requiresSetup: false,
    inputName: 'text',
    outputName: 'audio'
  },
  ljspeech: {
    key: 'tts-ljspeech-v1',
    url: 'https://huggingface.co/NeuML/ljspeech-vits-onnx/resolve/main/model.onnx',
    name: 'LJSpeech VITS TTS',
    description: 'English TTS trained on LJSpeech dataset',
    requiresSetup: false,
    inputName: 'text',
    outputName: 'audio'
  },
  vctk: {
    key: 'tts-vctk-v1',
    url: 'https://huggingface.co/NeuML/vctk-vits-onnx/resolve/main/model.onnx',
    name: 'VCTK VITS TTS',
    description: 'Multiple English speakers with various accents',
    requiresSetup: false,
    inputName: 'text',
    outputName: 'audio'
  }
};

// Default model
let currentModelConfig = TTS_MODEL_CONFIGS.kokoro;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const textInput = qs('#text-input');
  const voiceSelect = qs('#voice-select');
  const rateSlider = qs('#rate-slider');
  const pitchSlider = qs('#pitch-slider');
  const volumeSlider = qs('#volume-slider');
  const rateValue = qs('#rate-value');
  const pitchValue = qs('#pitch-value');
  const volumeValue = qs('#volume-value');
  const generateBtn = qs('#generate-btn');
  const downloadBtn = qs('#download-btn');
  const clearBtn = qs('#clear-btn');
  const status = qs('#status');
  const audioContainer = qs('#audio-container');
  const audioPlayer = qs('#audio-player');

  // Initialize ONNX Runtime
  async function initONNX() {
    if (ort) return ort;
    try {
      ort = await loadONNXRuntime();
      return ort;
    } catch (error) {
      console.error('Failed to load ONNX Runtime:', error);
      throw error;
    }
  }

  // Get model selector (created in HTML)
  const modelSelect = qs('#model-select');
  
  // Update current model when selection changes
  if (modelSelect) {
    on(modelSelect, 'change', (e) => {
      const selectedKey = e.target.value;
      currentModelConfig = TTS_MODEL_CONFIGS[selectedKey];
      ttsSession = null; // Reset session to load new model
      status.textContent = `Switched to ${currentModelConfig.name}`;
      status.className = 'status-message info';
      setTimeout(() => {
        if (status.textContent.includes('Switched to')) {
          status.textContent = '';
        }
      }, 2000);
    });
  }

  // Load TTS model
  async function loadTTSModel() {
    if (ttsSession) return ttsSession;
    
    try {
      await initONNX();
      
      status.textContent = `Loading ${currentModelConfig.name}...`;
      status.className = 'status-message info';
      
      // Download or get cached model from Hugging Face CDN
      const modelData = await getOrDownloadModel(
        currentModelConfig.key,
        currentModelConfig.url,
        (progress) => {
          status.textContent = `Downloading ${currentModelConfig.name}: ${Math.round(progress)}%`;
        }
      );
      
      // Create inference session
      ttsSession = await createInferenceSession(modelData, {
        executionProviders: ['wasm'] // Use WASM for compatibility
      });
      
      status.textContent = `${currentModelConfig.name} loaded successfully!`;
      status.className = 'status-message success';
      setTimeout(() => {
        if (status.textContent.includes('loaded successfully')) {
          status.textContent = '';
        }
        }, 2000);
      
      return ttsSession;
    } catch (error) {
      console.error('Failed to load TTS model:', error);
      status.textContent = `${currentModelConfig.name} not available. Using basic synthesis.`;
      status.className = 'status-message error';
      return null;
    }
  }

  // Load available voices
  function loadVoices() {
    voices = speechSynthesis.getVoices();
    
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">No voices available</option>';
      return;
    }
    
    // Group voices by language
    const voicesByLang = {};
    voices.forEach(voice => {
      const lang = voice.lang || 'Unknown';
      if (!voicesByLang[lang]) {
        voicesByLang[lang] = [];
      }
      voicesByLang[lang].push(voice);
    });
    
    // Sort languages
    const sortedLangs = Object.keys(voicesByLang).sort();
    
    // Create option groups
    sortedLangs.forEach(lang => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = lang;
      
      voicesByLang[lang].forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name}${voice.default ? ' (default)' : ''}`;
        optgroup.appendChild(option);
      });
      
      voiceSelect.appendChild(optgroup);
    });
    
    // Select default voice if available
    const defaultVoice = voices.find(v => v.default);
    if (defaultVoice) {
      voiceSelect.value = defaultVoice.name;
    }
  }

  // Load voices when they become available
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  loadVoices();

  // Update slider value displays
  on(rateSlider, 'input', (e) => {
    rateValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  on(pitchSlider, 'input', (e) => {
    pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  on(volumeSlider, 'input', (e) => {
    volumeValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  // Preprocess text for TTS model
  function preprocessText(text) {
    // Convert text to phonemes or token IDs
    // This depends on the specific TTS model
    // For now, we'll use a simple character-based approach
    // In production, you'd use a proper text processor
    
    // Remove extra whitespace
    text = text.trim().replace(/\s+/g, ' ');
    
    // Convert to lowercase (some models expect this)
    // text = text.toLowerCase();
    
    // Convert to character codes or use a tokenizer
    // For a real TTS model, you'd need proper text preprocessing
    return text;
  }

  // Postprocess audio from model output
  function postprocessAudio(audioTensor, sampleRate = 22050) {
    // Get audio data from tensor
    const audioData = audioTensor.data || audioTensor;
    
    // Convert to Float32Array if needed
    let audioArray;
    if (audioData instanceof Float32Array) {
      audioArray = audioData;
    } else if (audioData instanceof Array) {
      audioArray = new Float32Array(audioData);
    } else {
      // Try to extract from tensor structure
      audioArray = new Float32Array(audioData.length || audioData.size || 0);
      for (let i = 0; i < audioArray.length; i++) {
        audioArray[i] = audioData[i] || 0;
      }
    }
    
    // Normalize audio (ensure values are in [-1, 1] range)
    let max = 0;
    for (let i = 0; i < audioArray.length; i++) {
      const abs = Math.abs(audioArray[i]);
      if (abs > max) max = abs;
    }
    
    if (max > 1.0) {
      for (let i = 0; i < audioArray.length; i++) {
        audioArray[i] /= max;
      }
    }
    
    return { audioArray, sampleRate };
  }

  // Generate speech using AI model
  async function generateSpeechWithAI(text, rate, pitch, volume) {
    if (!ttsSession) {
      await loadTTSModel();
    }
    
    if (!ttsSession) {
      throw new Error('TTS model not available');
    }
    
    // Preprocess text
    const processedText = preprocessText(text);
    
    // Prepare input tensor
    // TTS models typically expect:
    // - Text as character IDs or token IDs
    // - Or text embeddings
    // The exact format depends on the model architecture
    
    // For VITS-based models (Kokoro, LJSpeech, VCTK), we typically need:
    // 1. Text tokenization (character or phoneme IDs)
    // 2. Speaker ID (for multi-speaker models)
    
    // Simple character-based encoding (may need adjustment per model)
    const textChars = processedText.split('');
    const textArray = new Int32Array(textChars.map(c => c.charCodeAt(0)));
    
    // Create input tensor - shape depends on model
    // Common shapes: [1, seq_len] or [batch, seq_len]
    const textTensor = new ort.Tensor('int64', textArray, [1, textArray.length]);
    
    // Prepare inputs - input name from config
    const inputs = {};
    inputs[currentModelConfig.inputName || 'text'] = textTensor;
    
    // For multi-speaker models, you might need speaker ID
    // inputs['speaker_id'] = new ort.Tensor('int64', new Int32Array([0]), [1]);
    
    // Run inference
    const outputs = await runInference(ttsSession, inputs);
    
    // Get audio output - output name from config
    const audioOutput = outputs[currentModelConfig.outputName || 'audio'] || 
                       outputs.output || 
                       outputs[Object.keys(outputs)[0]];
    
    // Postprocess audio
    const { audioArray, sampleRate } = postprocessAudio(audioOutput);
    
    // Apply rate, pitch, and volume
    // Rate: resample or change playback speed
    // Pitch: use Web Audio API pitch shifting
    // Volume: simple multiplication
    
    // Create AudioContext
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const buffer = ctx.createBuffer(1, audioArray.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Copy audio data
    for (let i = 0; i < audioArray.length; i++) {
      channelData[i] = audioArray[i] * volume;
    }
    
    // Apply rate by resampling if needed
    let finalBuffer = buffer;
    if (rate !== 1.0) {
      // Simple rate adjustment using playbackRate
      // For better quality, use proper resampling
      finalBuffer = buffer; // We'll use playbackRate on the source instead
    }
    
    // Create MediaStreamDestination to capture
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = finalBuffer;
    source.playbackRate.value = rate;
    
    // Apply pitch if needed (requires more complex processing)
    // For now, we'll use playbackRate which affects both speed and pitch
    // A proper implementation would use a pitch shifter
    
    source.connect(destination);
    source.connect(ctx.destination); // Also play through speakers
    
    // Record the stream
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
    });
    
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        resolve(audioBlob);
      };
      
      mediaRecorder.start();
      source.start(0);
      
      source.onended = () => {
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 500);
      };
    });
  }

  // Generate speech (with AI model if available, otherwise fallback)
  async function generateSpeech() {
    const text = textInput.value.trim();
    
    if (!text) {
      status.textContent = 'Please enter some text to convert.';
      status.className = 'status-message error';
      return;
    }

    if (voices.length === 0) {
      status.textContent = 'No voices available. Please wait for voices to load.';
      status.className = 'status-message error';
      return;
    }

    try {
      status.textContent = 'Generating audio...';
      status.className = 'status-message info';
      generateBtn.disabled = true;
      downloadBtn.disabled = true;

      // Get selected voice and settings
      const selectedVoiceName = voiceSelect.value;
      const selectedVoice = voices.find(v => v.name === selectedVoiceName) || voices[0];
      const rate = parseFloat(rateSlider.value);
      const pitch = parseFloat(pitchSlider.value);
      const volume = parseFloat(volumeSlider.value);

      // Play using Web Speech API (so user can hear it with the selected voice)
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      speechSynthesis.speak(utterance);

      // Try to generate downloadable audio using AI model
      try {
        const blob = await generateSpeechWithAI(text, rate, pitch, volume);
        audioBlob = blob;
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioContainer.style.display = 'block';
        downloadBtn.disabled = false;
        status.textContent = 'Audio generated successfully with AI!';
        status.className = 'status-message success';
      } catch (aiError) {
        console.warn('AI TTS failed, using fallback:', aiError);
        // Fallback to basic synthesis
        await generateDownloadableAudio(text, rate, pitch, volume);
      }
      
      generateBtn.disabled = false;
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
      status.className = 'status-message error';
      generateBtn.disabled = false;
      downloadBtn.disabled = true;
    }
  }

  // Fallback: Generate downloadable audio using Web Audio API (basic synthesis)
  async function generateDownloadableAudio(text, rate, pitch, volume) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = ctx.sampleRate;
    
    const estimatedDuration = (text.length * 0.1) / rate;
    const bufferLength = Math.ceil(estimatedDuration * sampleRate);
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    
    let position = 0;
    const baseFreq = 180;
    
    for (let i = 0; i < text.length && position < data.length; i++) {
      const char = text[i];
      
      if (char === ' ' || char === '\n' || char === '\t') {
        position += Math.floor(sampleRate * 0.08 / rate);
        continue;
      }
      
      const charCode = char.charCodeAt(0);
      const freq = baseFreq + (charCode % 250) * pitch;
      const charDuration = Math.floor(sampleRate * 0.1 / rate);
      
      for (let j = 0; j < charDuration && position < data.length; j++) {
        const t = j / sampleRate;
        let envelope = 1.0;
        if (j < charDuration * 0.15) {
          envelope = j / (charDuration * 0.15);
        } else if (j > charDuration * 0.85) {
          envelope = (charDuration - j) / (charDuration * 0.15);
        }
        
        let sample = 0;
        sample += Math.sin(2 * Math.PI * freq * t) * 0.5;
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
        sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
        sample += Math.sin(2 * Math.PI * freq * 4 * t) * 0.1;
        
        data[position] = sample * envelope * volume * 0.25;
        position++;
      }
    }
    
    const actualBuffer = ctx.createBuffer(1, position, sampleRate);
    const actualData = actualBuffer.getChannelData(0);
    for (let i = 0; i < position; i++) {
      actualData[i] = data[i];
    }
    
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = actualBuffer;
    source.playbackRate.value = 1.0;
    source.connect(destination);
    
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
    });
    
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { 
        type: mediaRecorder.mimeType || 'audio/webm' 
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioUrl;
      audioContainer.style.display = 'block';
      downloadBtn.disabled = false;
      status.textContent = 'Audio generated successfully!';
      status.className = 'status-message success';
    };
    
    mediaRecorder.start();
    source.start(0);
    
    source.onended = () => {
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 500);
    };
  }

  // Download audio file
  function downloadAudio() {
    if (!audioBlob) {
      status.textContent = 'No audio available to download.';
      status.className = 'status-message error';
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speech-${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'ogg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    status.textContent = 'Audio file downloaded!';
    status.className = 'status-message success';
  }

  // Clear all
  function clearAll() {
    textInput.value = '';
    audioBlob = null;
    audioContainer.style.display = 'none';
    audioPlayer.src = '';
    downloadBtn.disabled = true;
    status.textContent = '';
    status.className = 'status-message';
    speechSynthesis.cancel();
  }

  // Event listeners
  on(generateBtn, 'click', generateSpeech);
  on(downloadBtn, 'click', downloadAudio);
  on(clearBtn, 'click', clearAll);
});
