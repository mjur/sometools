// UUID generation utilities

// UUID v4: Random UUID (most common)
export function generateUUIDv4() {
  // Generate 16 random bytes
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  // Convert to UUID string format
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

// UUID v1: Time-based UUID
export function generateUUIDv1() {
  const now = Date.now();
  const timestamp = now * 10000 + 0x01B21DD213814000; // Convert to 100-nanosecond intervals since 1582-10-15
  
  // Extract timestamp parts
  const timeLow = timestamp & 0xffffffff;
  const timeMid = (timestamp >>> 32) & 0xffff;
  const timeHigh = (timestamp >>> 48) & 0x0fff;
  
  // Generate random clock sequence and node
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const clockSeq = ((bytes[0] << 8) | bytes[1]) & 0x3fff | 0x8000;
  const node = Array.from(bytes.slice(2))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Format as UUID
  const hex = [
    timeLow.toString(16).padStart(8, '0'),
    timeMid.toString(16).padStart(4, '0'),
    ((timeHigh | 0x1000).toString(16).padStart(4, '0')), // Version 1
    clockSeq.toString(16).padStart(4, '0'),
    node
  ].join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

// UUID v3: Name-based using MD5
export async function generateUUIDv3(namespace, name) {
  // Standard namespace UUIDs
  const namespaces = {
    'DNS': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'URL': '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    'OID': '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    'X500': '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
  };
  
  const namespaceUUID = namespaces[namespace] || namespace;
  const namespaceBytes = uuidToBytes(namespaceUUID);
  const nameBytes = new TextEncoder().encode(name);
  
  // Combine namespace and name
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes);
  combined.set(nameBytes, namespaceBytes.length);
  
  // Hash with MD5
  const { md5HashBinary } = await import('./md5.js');
  const hash = md5HashBinary(combined);
  
  // Convert hash to UUID format
  const hashBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    hashBytes[i] = hash.charCodeAt(i);
  }
  
  // Set version (3) and variant bits
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x30; // Version 3
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80; // Variant 10
  
  // Convert to UUID string
  const hex = Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

// UUID v5: Name-based using SHA-1
export async function generateUUIDv5(namespace, name) {
  // Standard namespace UUIDs
  const namespaces = {
    'DNS': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    'URL': '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    'OID': '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    'X500': '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
  };
  
  const namespaceUUID = namespaces[namespace] || namespace;
  const namespaceBytes = uuidToBytes(namespaceUUID);
  const nameBytes = new TextEncoder().encode(name);
  
  // Combine namespace and name
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes);
  combined.set(nameBytes, namespaceBytes.length);
  
  // Hash with SHA-1
  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  const hashBytes = new Uint8Array(hashBuffer);
  
  // Set version (5) and variant bits
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50; // Version 5
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80; // Variant 10
  
  // Convert to UUID string
  const hex = Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

// UUID v2: DCE Security UUID (simplified implementation)
// Note: Full v2 requires domain, identifier, etc. This is a simplified version.
export function generateUUIDv2() {
  // Generate similar to v1 but with different version bits
  const now = Date.now();
  const timestamp = now * 10000 + 0x01B21DD213814000;
  
  const timeLow = timestamp & 0xffffffff;
  const timeMid = (timestamp >>> 32) & 0xffff;
  const timeHigh = (timestamp >>> 48) & 0x0fff;
  
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const clockSeq = ((bytes[0] << 8) | bytes[1]) & 0x3fff | 0x8000;
  const node = Array.from(bytes.slice(2))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const hex = [
    timeLow.toString(16).padStart(8, '0'),
    timeMid.toString(16).padStart(4, '0'),
    ((timeHigh | 0x2000).toString(16).padStart(4, '0')), // Version 2
    clockSeq.toString(16).padStart(4, '0'),
    node
  ].join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

// Helper: Convert UUID string to bytes
function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

