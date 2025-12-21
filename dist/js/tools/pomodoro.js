import { on, qs } from '/js/ui.js';

const workDuration = qs('#work-duration');
const shortBreak = qs('#short-break');
const longBreak = qs('#long-break');
const status = qs('#status');
const display = qs('#display');
const sessionCount = qs('#session-count');
const startBtn = qs('#start');
const pauseBtn = qs('#pause');
const resetBtn = qs('#reset');

let intervalId = null;
let startTime = null;
let pausedTime = 0;
let isRunning = false;
let currentMode = 'work'; // 'work', 'short-break', 'long-break'
let sessionNumber = 0;
let targetTime = 0;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDuration() {
  if (currentMode === 'work') {
    return parseInt(workDuration.value) * 60 * 1000;
  } else if (currentMode === 'short-break') {
    return parseInt(shortBreak.value) * 60 * 1000;
  } else {
    return parseInt(longBreak.value) * 60 * 1000;
  }
}

function updateDisplay() {
  const elapsed = Date.now() - startTime + pausedTime;
  const remaining = Math.max(0, targetTime - elapsed);
  display.textContent = formatTime(remaining);
  
  if (remaining === 0 && isRunning) {
    completeSession();
  }
}

function stop() {
  if (isRunning) {
    pausedTime += Date.now() - startTime;
    clearInterval(intervalId);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function completeSession() {
  // Stop the timer
  clearInterval(intervalId);
  isRunning = false;
  
  // Play alert sound
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
    // Fallback
  }
  
  // Determine next mode
  if (currentMode === 'work') {
    if (sessionNumber >= 4) {
      currentMode = 'long-break';
      status.textContent = 'Long break time!';
      sessionNumber = 0;
    } else {
      currentMode = 'short-break';
      status.textContent = 'Short break time!';
    }
  } else {
    currentMode = 'work';
    status.textContent = 'Work time!';
  }
  
  // Reset timing for next session - completely fresh start
  pausedTime = 0;
  startTime = null;
  targetTime = getDuration();
  display.textContent = formatTime(targetTime);
  
  // Auto-start the next phase after a short delay
  setTimeout(() => {
    start();
  }, 1000);
}

function start() {
  if (!isRunning) {
    // Update session counter when work phase starts
    if (currentMode === 'work') {
      sessionNumber++;
      sessionCount.textContent = `Session: ${sessionNumber}/4`;
    }
    
    // Get fresh duration for current mode
    targetTime = getDuration();
    // Reset start time - if resuming from pause, pausedTime already has the accumulated time
    startTime = Date.now();
    isRunning = true;
    intervalId = setInterval(updateDisplay, 100);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    workDuration.disabled = true;
    shortBreak.disabled = true;
    longBreak.disabled = true;
    
    if (currentMode === 'work') {
      status.textContent = 'Working...';
    } else if (currentMode === 'short-break') {
      status.textContent = 'Short break...';
    } else {
      status.textContent = 'Long break...';
    }
  }
}

function pause() {
  if (isRunning) {
    pausedTime += Date.now() - startTime;
    clearInterval(intervalId);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    status.textContent = 'Paused';
  }
}

function reset() {
  clearInterval(intervalId);
  isRunning = false;
  startTime = null;
  pausedTime = 0;
  currentMode = 'work';
  sessionNumber = 0;
  targetTime = getDuration();
  display.textContent = formatTime(targetTime);
  status.textContent = 'Ready to start';
  sessionCount.textContent = 'Session: 0/4';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  workDuration.disabled = false;
  shortBreak.disabled = false;
  longBreak.disabled = false;
}

on(startBtn, 'click', start);
on(pauseBtn, 'click', pause);
on(resetBtn, 'click', reset);

// Initialize
reset();

