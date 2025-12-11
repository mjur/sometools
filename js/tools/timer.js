import { on, qs } from '/js/ui.js';

const mode = qs('#mode');
const timerMode = qs('#timer-mode');
const hours = qs('#hours');
const minutes = qs('#minutes');
const seconds = qs('#seconds');
const display = qs('#display');
const startBtn = qs('#start');
const pauseBtn = qs('#pause');
const resetBtn = qs('#reset');

let intervalId = null;
let startTime = null;
let pausedTime = 0;
let isRunning = false;
let timerTarget = 0; // For timer mode

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  if (mode.value === 'stopwatch') {
    const elapsed = Date.now() - startTime + pausedTime;
    display.textContent = formatTime(elapsed);
  } else {
    const elapsed = Date.now() - startTime + pausedTime;
    const remaining = Math.max(0, timerTarget - elapsed);
    display.textContent = formatTime(remaining);
    
    if (remaining === 0 && isRunning) {
      stop();
      // Play alert sound (using Web Audio API)
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        // Fallback: just show alert
        alert('Timer finished!');
      }
    }
  }
}

function start() {
  if (mode.value === 'timer') {
    const h = parseInt(hours.value) || 0;
    const m = parseInt(minutes.value) || 0;
    const s = parseInt(seconds.value) || 0;
    timerTarget = (h * 3600 + m * 60 + s) * 1000;
    
    if (timerTarget === 0) {
      alert('Please set a timer duration');
      return;
    }
  }
  
  if (!isRunning) {
    startTime = Date.now();
    isRunning = true;
    intervalId = setInterval(updateDisplay, 100);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    hours.disabled = true;
    minutes.disabled = true;
    seconds.disabled = true;
  }
}

function pause() {
  if (isRunning) {
    pausedTime += Date.now() - startTime;
    clearInterval(intervalId);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function reset() {
  clearInterval(intervalId);
  isRunning = false;
  startTime = null;
  pausedTime = 0;
  timerTarget = 0;
  display.textContent = '00:00:00';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  hours.disabled = false;
  minutes.disabled = false;
  seconds.disabled = false;
}

function updateMode() {
  reset();
  if (mode.value === 'timer') {
    timerMode.style.display = 'grid';
  } else {
    timerMode.style.display = 'none';
  }
}

on(mode, 'change', updateMode);
on(startBtn, 'click', start);
on(pauseBtn, 'click', pause);
on(resetBtn, 'click', reset);

// Initialize
updateMode();

