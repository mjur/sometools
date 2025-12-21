import { toast, on, qs, copy } from '/js/ui.js';

const mode = qs('#mode');
const webcamMode = qs('#webcam-mode');
const fileMode = qs('#file-mode');
const video = qs('#video');
const canvas = qs('#canvas');
const cameraPlaceholder = qs('#camera-placeholder');
const startCameraBtn = qs('#start-camera');
const stopCameraBtn = qs('#stop-camera');
const fileInput = qs('#file-input');
const imagePreview = qs('#image-preview');
const result = qs('#result');
const copyResultBtn = qs('#copy-result');

let stream = null;
let scanning = false;

function updateMode() {
  const currentMode = mode.value;
  if (currentMode === 'webcam') {
    webcamMode.style.display = 'grid';
    fileMode.style.display = 'none';
    stopCamera();
  } else {
    webcamMode.style.display = 'none';
    fileMode.style.display = 'grid';
    stopCamera();
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    video.srcObject = stream;
    video.style.display = 'block';
    cameraPlaceholder.style.display = 'none';
    startCameraBtn.disabled = true;
    stopCameraBtn.disabled = false;
    scanning = true;
    scanQR();
  } catch (error) {
    toast('Failed to access camera: ' + error.message, 'error');
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
  video.style.display = 'none';
  cameraPlaceholder.style.display = 'flex';
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
  scanning = false;
}

function scanQR() {
  if (!scanning) return;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        result.value = code.data;
        toast('QR code detected!');
      }
    }
  }
  
  if (scanning) {
    requestAnimationFrame(scanQR);
  }
}

function scanImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      imagePreview.src = img.src;
      imagePreview.style.display = 'block';
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          result.value = code.data;
          toast('QR code detected!');
        } else {
          result.value = '';
          toast('No QR code found in image', 'error');
        }
      } else {
        result.value = '';
        toast('QR code library not loaded', 'error');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

on(mode, 'change', updateMode);
on(startCameraBtn, 'click', startCamera);
on(stopCameraBtn, 'click', stopCamera);
on(fileInput, 'change', (e) => {
  const file = e.target.files[0];
  if (file) {
    scanImageFile(file);
  }
});
on(copyResultBtn, 'click', async () => {
  await copy(result.value);
  toast('Result copied');
});

// Initialize
updateMode();

