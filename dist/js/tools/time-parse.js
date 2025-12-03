// Time & Timezone Parser
// Uses Luxon (global `luxon`) for robust timezone handling

import { qs, on, toast, copy } from '/js/ui.js';

const DateTime = window.luxon?.DateTime;

const timeInput = qs('#time-input');
const refTzSelect = qs('#reference-timezone');
const outputArea = qs('#output-area');
const parseBtn = qs('#parse');
const clearBtn = qs('#clear');
const copyResultBtn = qs('#copy-result');

let lastIso = null;

function ensureLuxon() {
  if (!DateTime) {
    toast('Luxon failed to load. Check your network connection.', 'error');
    throw new Error('Luxon not available');
  }
}

function getReferenceZone() {
  const value = refTzSelect?.value || 'local';
  if (value === 'local') return DateTime.local().zoneName;
  return value;
}

function parseKeyword(input, zone) {
  const lower = input.trim().toLowerCase();
  const now = DateTime.now().setZone(zone);

  if (lower === 'now') return now;
  if (lower === 'today') return now.startOf('day');
  if (lower === 'tomorrow') return now.plus({ days: 1 }).startOf('day');

  // "tomorrow 14:00"
  if (lower.startsWith('tomorrow ')) {
    const timePart = lower.replace(/^tomorrow\s+/, '');
    const base = now.plus({ days: 1 }).startOf('day');
    const t = DateTime.fromFormat(timePart, 'H:mm', { zone }) ||
              DateTime.fromFormat(timePart, 'HH:mm', { zone }) ||
              DateTime.fromFormat(timePart, 'h:mm a', { zone });
    if (t.isValid) {
      return base.set({ hour: t.hour, minute: t.minute });
    }
  }

  return null;
}

function tryParsers(raw, zone) {
  const input = raw.trim();
  if (!input) return null;

  // Pure numeric Unix timestamp (seconds or milliseconds)
  if (/^-?\d+$/.test(input)) {
    const num = Number(input);
    if (Number.isFinite(num)) {
      // Heuristic: 13+ digits -> milliseconds, otherwise seconds
      const isMillis = input.length >= 13;
      const seconds = isMillis ? num / 1000 : num;
      const dtFromEpoch = DateTime.fromSeconds(seconds, { zone: 'UTC' });
      if (dtFromEpoch.isValid) return dtFromEpoch;
    }
  }

  // Keywords / simple phrases
  const keyword = parseKeyword(input, zone);
  if (keyword && keyword.isValid) return keyword;

  // If last token looks like a TZ abbrev or IANA zone, pull it out and treat separately
  const parts = input.split(/\s+/);
  let explicitZone = zone;
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    // Basic heuristic: contains "/" or is all letters and <= 5 chars (e.g. PST)
    if (/[A-Za-z]/.test(last) && (last.includes('/') || last.length <= 5)) {
      const withoutLast = parts.slice(0, -1).join(' ');
      explicitZone = last;
      return tryParsers(withoutLast, explicitZone) || null;
    }
  }

  // ISO 8601
  let dt = DateTime.fromISO(input, { setZone: true });
  if (dt.isValid) return dt;

  // RFC 2822
  dt = DateTime.fromRFC2822(input, { setZone: true });
  if (dt.isValid) return dt;

  // SQL-like
  dt = DateTime.fromSQL(input, { zone });
  if (dt.isValid) return dt;

  // Common custom formats
  const formats = [
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd H:mm',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd H:mm:ss',
    'yyyy/MM/dd HH:mm',
    'yyyy/MM/dd H:mm',
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy H:mm'
  ];

  for (const fmt of formats) {
    dt = DateTime.fromFormat(input, fmt, { zone });
    if (dt.isValid) return dt;
  }

  return null;
}

function renderResult(dt) {
  const zones = [
    { id: 'UTC', label: 'UTC' },
    { id: DateTime.local().zoneName, label: `Local (${DateTime.local().zoneName})` },
    { id: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
    { id: 'America/New_York', label: 'America/New_York (ET)' },
    { id: 'Europe/London', label: 'Europe/London' },
    { id: 'Europe/Berlin', label: 'Europe/Berlin' },
    { id: 'Asia/Tokyo', label: 'Asia/Tokyo' },
    { id: 'Australia/Sydney', label: 'Australia/Sydney' }
  ];

  const iso = dt.toUTC().toISO();
  lastIso = iso;

  const lines = zones.map(z => {
    const zdt = dt.setZone(z.id, { keepLocalTime: false });
    return `
      <tr>
        <td style="padding: 0.25rem 0.5rem; white-space: nowrap;">${z.label}</td>
        <td style="padding: 0.25rem 0.5rem;">${zdt.toFormat('yyyy-LL-dd HH:mm:ss')}</td>
        <td style="padding: 0.25rem 0.5rem; color: var(--text-subtle); font-size: 0.75rem;">${zdt.toISO()}</td>
      </tr>
    `;
  }).join('');

  outputArea.innerHTML = `
    <div style="margin-bottom: 0.75rem;">
      <p style="margin: 0 0 0.25rem 0;"><strong>Parsed successfully</strong></p>
      <p class="text-sm text-muted" style="margin: 0;">Normalized (UTC): <code style="font-size: 0.8rem;">${iso}</code></p>
      <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">Epoch (seconds): <code style="font-size: 0.8rem;">${Math.floor(dt.toUTC().toSeconds())}</code></p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border);">
          <th style="text-align: left; padding: 0.25rem 0.5rem;">Zone</th>
          <th style="text-align: left; padding: 0.25rem 0.5rem;">Local Time</th>
          <th style="text-align: left; padding: 0.25rem 0.5rem;">ISO</th>
        </tr>
      </thead>
      <tbody>
        ${lines}
      </tbody>
    </table>
  `;

  copyResultBtn.disabled = !iso;
}

function handleParse() {
  try {
    ensureLuxon();
  } catch {
    return;
  }

  const raw = timeInput.value;
  if (!raw.trim()) {
    toast('Please enter a time to parse.', 'error');
    return;
  }

  const refZone = getReferenceZone();
  const dt = tryParsers(raw, refZone);

  if (!dt || !dt.isValid) {
    toast('Could not parse time. Try a more standard format (ISO, RFC 2822, or YYYY-MM-DD HH:mm).', 'error');
    outputArea.innerHTML = `
      <p style="color: var(--error); margin-bottom: 0.5rem;">Failed to parse time.</p>
      <p class="text-sm text-muted" style="margin: 0;">Supported examples:</p>
      <ul class="text-sm text-muted" style="margin: 0.25rem 0 0 1rem; padding: 0;">
        <li>2025-11-26T18:00:00+01:00</li>
        <li>2025-11-26 17:00 Europe/Berlin</li>
        <li>Wed, 26 Nov 2025 17:00:00 GMT</li>
        <li>2025-11-26 08:00 PST</li>
        <li>tomorrow 14:00</li>
      </ul>
    `;
    copyResultBtn.disabled = true;
    lastIso = null;
    return;
  }

  renderResult(dt);
  toast('Time parsed successfully.', 'success');
}

function handleClear() {
  timeInput.value = '';
  outputArea.innerHTML = '<p>Enter a time on the left and click “Parse time” to see normalized and converted results.</p>';
  copyResultBtn.disabled = true;
  lastIso = null;
}

if (parseBtn) {
  on(parseBtn, 'click', handleParse);
}

if (clearBtn) {
  on(clearBtn, 'click', handleClear);
}

if (timeInput) {
  on(timeInput, 'keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleParse();
    }
  });
}

if (copyResultBtn) {
  on(copyResultBtn, 'click', async () => {
    if (!lastIso) {
      toast('No parsed timestamp to copy.', 'error');
      return;
    }
    await copy(lastIso, 'ISO timestamp copied to clipboard.');
  });
}


