import { toast, on, qs, copy } from '/js/ui.js';
import { loadStateWithStorage, saveStateWithStorage } from '/js/url-state.js';

const mode = qs('#mode');
const ipInput = qs('#ip-input');
const lookupBtn = qs('#lookup-btn');
const lookupOutput = qs('#lookup-output');
const copyLookupBtn = qs('#copy-lookup');
const useCurrentIpBtn = qs('#use-current-ip');
const lookupMode = qs('#lookup-mode');
const subnetMode = qs('#subnet-mode');
const subnetIp = qs('#subnet-ip');
const subnetMask = qs('#subnet-mask');
const calculateSubnetBtn = qs('#calculate-subnet');
const subnetOutput = qs('#subnet-output');
const copySubnetBtn = qs('#copy-subnet');

const storageKey = 'ip-tools-state';

function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number);
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  return false;
}

function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function numberToIP(num) {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

function cidrToMask(cidr) {
  const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
  return numberToIP(mask);
}

function maskToCIDR(mask) {
  const num = ipToNumber(mask);
  let cidr = 0;
  for (let i = 0; i < 32; i++) {
    if (num & (1 << (31 - i))) {
      cidr++;
    } else {
      break;
    }
  }
  return cidr;
}

function updateMode() {
  const currentMode = mode.value;
  if (currentMode === 'lookup') {
    lookupMode.style.display = 'grid';
    subnetMode.style.display = 'none';
  } else {
    lookupMode.style.display = 'none';
    subnetMode.style.display = 'grid';
  }
}

async function lookupIP() {
  const ip = ipInput.value.trim();
  
  if (!ip) {
    lookupOutput.value = '';
    return;
  }
  
  if (!isValidIP(ip)) {
    lookupOutput.value = 'Error: Invalid IP address format';
    return;
  }
  
  const parts = ip.split('.').map(Number);
  const isPrivate = isPrivateIP(ip);
  const isLoopback = parts[0] === 127;
  
  const info = [
    `IP Address: ${ip}`,
    `Version: IPv4`,
    `Type: ${isPrivate ? 'Private' : 'Public'}`,
    isLoopback ? 'Loopback: Yes' : '',
    '',
    'Octets:',
    `  First: ${parts[0]}`,
    `  Second: ${parts[1]}`,
    `  Third: ${parts[2]}`,
    `  Fourth: ${parts[3]}`,
    '',
    'Numeric Representation:',
    `  Decimal: ${ipToNumber(ip)}`,
    `  Binary: ${parts.map(p => p.toString(2).padStart(8, '0')).join('.')}`,
    '',
    isPrivate ? 'Note: This is a private IP address (RFC 1918)' : 'Note: This is a public IP address',
  ].filter(Boolean).join('\n');
  
  lookupOutput.value = info;
  
  saveStateWithStorage(storageKey, {
    mode: mode.value,
    ip: ip
  });
}

function calculateSubnet() {
  const ip = subnetIp.value.trim();
  const maskInput = subnetMask.value.trim();
  
  if (!ip || !maskInput) {
    subnetOutput.value = '';
    return;
  }
  
  if (!isValidIP(ip)) {
    subnetOutput.value = 'Error: Invalid IP address format';
    return;
  }
  
  let cidr, mask;
  if (maskInput.startsWith('/')) {
    cidr = parseInt(maskInput.substring(1));
    if (cidr < 0 || cidr > 32) {
      subnetOutput.value = 'Error: CIDR must be between 0 and 32';
      return;
    }
    mask = cidrToMask(cidr);
  } else {
    if (!isValidIP(maskInput)) {
      subnetOutput.value = 'Error: Invalid subnet mask format';
      return;
    }
    mask = maskInput;
    cidr = maskToCIDR(mask);
  }
  
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const networkNum = ipNum & maskNum;
  const broadcastNum = networkNum | (~maskNum >>> 0);
  const hostCount = Math.pow(2, 32 - cidr) - 2;
  
  const networkIP = numberToIP(networkNum);
  const broadcastIP = numberToIP(broadcastNum);
  const firstHost = networkNum + 1;
  const lastHost = broadcastNum - 1;
  
  const info = [
    `IP Address: ${ip}`,
    `Subnet Mask: ${mask}`,
    `CIDR Notation: /${cidr}`,
    '',
    'Network Information:',
    `  Network Address: ${networkIP}`,
    `  Broadcast Address: ${broadcastIP}`,
    `  First Host: ${numberToIP(firstHost)}`,
    `  Last Host: ${numberToIP(lastHost)}`,
    `  Usable Hosts: ${hostCount}`,
    '',
    'Subnet Details:',
    `  Total Addresses: ${hostCount + 2}`,
    `  Host Bits: ${32 - cidr}`,
    `  Network Bits: ${cidr}`,
  ].join('\n');
  
  subnetOutput.value = info;
  
  saveStateWithStorage(storageKey, {
    mode: mode.value,
    subnetIp: ip,
    subnetMask: maskInput
  });
}

async function getCurrentIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    ipInput.value = data.ip;
    lookupIP();
  } catch (error) {
    toast('Failed to get current IP address', 'error');
  }
}

on(mode, 'change', updateMode);
on(lookupBtn, 'click', lookupIP);
on(ipInput, 'keypress', (e) => {
  if (e.key === 'Enter') {
    lookupIP();
  }
});
on(useCurrentIpBtn, 'click', getCurrentIP);
on(calculateSubnetBtn, 'click', calculateSubnet);
on(copyLookupBtn, 'click', async () => {
  await copy(lookupOutput.value);
  toast('Output copied');
});
on(copySubnetBtn, 'click', async () => {
  await copy(subnetOutput.value);
  toast('Output copied');
});

// Load state
const state = loadStateWithStorage(storageKey);
if (state) {
  if (state.mode) mode.value = state.mode;
  if (state.ip) ipInput.value = state.ip;
  if (state.subnetIp) subnetIp.value = state.subnetIp;
  if (state.subnetMask) subnetMask.value = state.subnetMask;
}

updateMode();

