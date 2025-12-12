#!/usr/bin/env node
/**
 * Deduplicate sitemap.xml by removing duplicate URLs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sitemapPath = path.join(rootDir, 'sitemap.xml');

console.log('Reading sitemap...');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

// Parse XML and extract URLs
const urlPattern = /<url>([\s\S]*?)<\/url>/g;
const locPattern = /<loc>(.*?)<\/loc>/;

const seenUrls = new Set();
const uniqueEntries = [];
let totalEntries = 0;
let duplicateCount = 0;

// Extract header
const headerMatch = sitemapContent.match(/^([\s\S]*?)(<url>)/);
const header = headerMatch ? headerMatch[1] + headerMatch[2] : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Extract footer
const footerMatch = sitemapContent.match(/(<\/urlset>[\s\S]*)$/);
const footer = footerMatch ? footerMatch[1] : '</urlset>\n';

// Process all URL entries
let match;
while ((match = urlPattern.exec(sitemapContent)) !== null) {
  totalEntries++;
  const urlBlock = match[1];
  const locMatch = urlBlock.match(locPattern);
  
  if (locMatch) {
    const url = locMatch[1];
    
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      uniqueEntries.push(`  <url>\n${urlBlock.trim().split('\n').map(line => '    ' + line.trim()).join('\n')}\n  </url>`);
    } else {
      duplicateCount++;
    }
  }
}

console.log(`Total entries: ${totalEntries}`);
console.log(`Unique URLs: ${uniqueEntries.length}`);
console.log(`Duplicates removed: ${duplicateCount}`);

// Reconstruct sitemap
const newSitemap = header.replace(/<url>$/, '') + '\n' + uniqueEntries.join('\n') + '\n' + footer;

// Write back
fs.writeFileSync(sitemapPath, newSitemap, 'utf-8');
console.log(`\nDeduplicated sitemap written to ${sitemapPath}`);

// Validate XML
console.log('\nValidating XML...');
try {
  const { execSync } = await import('child_process');
  execSync(`xmllint --noout "${sitemapPath}"`, { stdio: 'inherit' });
  console.log('✓ XML is valid!');
} catch (error) {
  console.error('✗ XML validation failed:', error.message);
  process.exit(1);
}


