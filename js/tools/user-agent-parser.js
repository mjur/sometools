import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const input = qs('#input');
const output = qs('#output');
const parseBtn = qs('#parse');
const copyOutputBtn = qs('#copy-output');
const useCurrentCheckbox = qs('#use-current');

const storageKey = 'user-agent-parser-state';
const state = loadStateWithStorage(storageKey);
if (state?.input) input.value = state.input;
if (state?.useCurrent !== undefined) useCurrentCheckbox.checked = state.useCurrent;

function parseUserAgent(ua) {
  const info = {
    browser: 'Unknown',
    browserVersion: 'Unknown',
    os: 'Unknown',
    osVersion: 'Unknown',
    device: 'Unknown',
    engine: 'Unknown',
    mobile: false,
    tablet: false,
    desktop: false
  };
  
  // Browser detection
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    info.browser = 'Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    if (match) info.browserVersion = match[1];
  } else if (ua.includes('Firefox')) {
    info.browser = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    if (match) info.browserVersion = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    info.browser = 'Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    if (match) info.browserVersion = match[1];
  } else if (ua.includes('Edg')) {
    info.browser = 'Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    if (match) info.browserVersion = match[1];
  } else if (ua.includes('OPR')) {
    info.browser = 'Opera';
    const match = ua.match(/OPR\/([\d.]+)/);
    if (match) info.browserVersion = match[1];
  }
  
  // OS detection
  if (ua.includes('Windows')) {
    info.os = 'Windows';
    if (ua.includes('Windows NT 10.0')) info.osVersion = '10/11';
    else if (ua.includes('Windows NT 6.3')) info.osVersion = '8.1';
    else if (ua.includes('Windows NT 6.2')) info.osVersion = '8';
    else if (ua.includes('Windows NT 6.1')) info.osVersion = '7';
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    info.os = 'macOS';
    const match = ua.match(/Mac OS X (\d+)[._](\d+)/);
    if (match) info.osVersion = `${match[1]}.${match[2]}`;
  } else if (ua.includes('Linux')) {
    info.os = 'Linux';
  } else if (ua.includes('Android')) {
    info.os = 'Android';
    const match = ua.match(/Android ([\d.]+)/);
    if (match) info.osVersion = match[1];
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    info.os = 'iOS';
    const match = ua.match(/OS ([\d_]+)/);
    if (match) info.osVersion = match[1].replace(/_/g, '.');
  }
  
  // Device detection
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    info.device = 'Mobile';
    info.mobile = true;
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    info.device = 'Tablet';
    info.tablet = true;
  } else {
    info.device = 'Desktop';
    info.desktop = true;
  }
  
  // Engine detection
  if (ua.includes('Gecko')) info.engine = 'Gecko';
  else if (ua.includes('WebKit')) info.engine = 'WebKit';
  else if (ua.includes('Blink')) info.engine = 'Blink';
  else if (ua.includes('Trident')) info.engine = 'Trident';
  
  return info;
}

function parse() {
  let inputValue = input.value.trim();
  
  if (useCurrentCheckbox.checked && !inputValue) {
    inputValue = navigator.userAgent;
    input.value = inputValue;
  }
  
  if (!inputValue) {
    output.value = '';
    return;
  }
  
  const info = parseUserAgent(inputValue);
  
  const result = [
    `User Agent: ${inputValue}`,
    '',
    'Browser Information:',
    `  Browser: ${info.browser}`,
    `  Version: ${info.browserVersion}`,
    `  Engine: ${info.engine}`,
    '',
    'Operating System:',
    `  OS: ${info.os}`,
    `  Version: ${info.osVersion}`,
    '',
    'Device Information:',
    `  Device Type: ${info.device}`,
    `  Mobile: ${info.mobile ? 'Yes' : 'No'}`,
    `  Tablet: ${info.tablet ? 'Yes' : 'No'}`,
    `  Desktop: ${info.desktop ? 'Yes' : 'No'}`,
  ].join('\n');
  
  output.value = result;
  
  saveStateWithStorage(storageKey, {
    input: inputValue,
    useCurrent: useCurrentCheckbox.checked
  });
}

on(parseBtn, 'click', parse);
on(input, 'keypress', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    parse();
  }
});
on(useCurrentCheckbox, 'change', () => {
  if (useCurrentCheckbox.checked) {
    input.value = navigator.userAgent;
    parse();
  }
});
on(copyOutputBtn, 'click', async () => {
  await copy(output.value);
  toast('Output copied');
});

// Auto-parse on input
on(input, 'input', () => {
  if (!useCurrentCheckbox.checked) {
    parse();
  }
});

// Initial parse if use current is checked
if (useCurrentCheckbox.checked) {
  input.value = navigator.userAgent;
  parse();
}

