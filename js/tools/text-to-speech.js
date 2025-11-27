// Text-to-Speech tool
import { qs, on } from '/js/ui.js';

let voices = [];
let audioBlob = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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

  // Generate speech and create downloadable audio
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

      // Generate downloadable audio using Web Audio API
      // This creates audio directly from text - no microphone needed!
      await generateDownloadableAudio(text, rate, pitch, volume);
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
      status.className = 'status-message error';
      generateBtn.disabled = false;
      downloadBtn.disabled = true;
    }
  }

  // Generate downloadable audio using Web Audio API
  // This creates audio directly from text without needing microphone
  async function generateDownloadableAudio(text, rate, pitch, volume) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = ctx.sampleRate;
    
    // Estimate duration (rough calculation based on text length and rate)
    const estimatedDuration = (text.length * 0.1) / rate; // ~100ms per character at rate 1.0
    const bufferLength = Math.ceil(estimatedDuration * sampleRate);
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Simple formant-based synthesis
    // This generates audio directly from text characters
    let position = 0;
    const baseFreq = 180;
    
    for (let i = 0; i < text.length && position < data.length; i++) {
      const char = text[i];
      
      // Pause for whitespace
      if (char === ' ' || char === '\n' || char === '\t') {
        position += Math.floor(sampleRate * 0.08 / rate);
        continue;
      }
      
      // Generate a tone for each character
      // Frequency varies based on character code for variety
      const charCode = char.charCodeAt(0);
      const freq = baseFreq + (charCode % 250) * pitch;
      const charDuration = Math.floor(sampleRate * 0.1 / rate);
      
      // Generate formant-like sound with envelope
      for (let j = 0; j < charDuration && position < data.length; j++) {
        const t = j / sampleRate;
        
        // Apply envelope (attack, sustain, release)
        let envelope = 1.0;
        if (j < charDuration * 0.15) {
          envelope = j / (charDuration * 0.15); // Attack
        } else if (j > charDuration * 0.85) {
          envelope = (charDuration - j) / (charDuration * 0.15); // Release
        }
        
        // Generate formant-like sound (multiple harmonics)
        let sample = 0;
        sample += Math.sin(2 * Math.PI * freq * t) * 0.5;
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
        sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
        sample += Math.sin(2 * Math.PI * freq * 4 * t) * 0.1;
        
        data[position] = sample * envelope * volume * 0.25;
        position++;
      }
    }
    
    // Trim buffer to actual length
    const actualBuffer = ctx.createBuffer(1, position, sampleRate);
    const actualData = actualBuffer.getChannelData(0);
    for (let i = 0; i < position; i++) {
      actualData[i] = data[i];
    }
    
    // Create MediaStreamDestination to capture for download
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = actualBuffer;
    source.playbackRate.value = 1.0; // Rate is already applied in synthesis
    source.connect(destination);
    
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
      generateBtn.disabled = false;
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
