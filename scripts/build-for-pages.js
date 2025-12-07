#!/usr/bin/env node
/**
 * Build script for Cloudflare Pages
 * Copies all static files to dist directory after Vite build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

// Directories and files to copy
const staticDirs = [
  'css',
  'js',
  'assets',
  'convert',
  'ai',
  'utils',
  'crypto',
  'diff',
  'json',
  'regex',
  'sql',
  'text',
  'yaml',
  'examples'
];

const rootFiles = [
  'index.html',
  'favicon.ico',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml'
];

// Files/directories to exclude
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /\.vscode/,
  /\.idea/,
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.log$/,
  /\.tmp$/,
  /\.swp$/,
  /\.swo$/,
  /~$/,
  /\.py$/,
  /\.ipynb$/,
  /\.yml$/,
  /\.yaml$/,
  /\.txt$/,  // Exclude .txt files EXCEPT robots.txt and sitemap.xml (handled separately)
  /\.md$/,
  /DeOldify/,
  /^workers$/,  // Only exclude root-level workers directory, not ffmpeg-workers
  /vite$/,
  /devtools-toolset@/,
  /\.config\.js$/,
  /package.*\.json$/,
  /package-lock\.json$/,
  /\.gitignore$/,
  /README.*\.md$/,
  /QUICKSTART\.md$/,
  /MODELS.*\.md$/,
  /FAVICON\.md$/,
  /cursor_client_side_dev_tools_website_sp\.md$/,
  /generate-unit-pages\.py$/,
  /convert-.*\.py$/,
  /server-with-cors\.py$/,
  /test\.py$/,
  /ffmpeg-core\.wasm$/,  // Exclude large WASM file (30.6 MB, exceeds Cloudflare Pages 25 MB limit)
  // Exclude development directories
  /\/scripts\//,  // Exclude scripts directory (matches anywhere in path)
  /\/tests\//,  // Exclude tests directory (matches anywhere in path)
  /\/models\//,  // Exclude models directory (models are downloaded at runtime)
  // Exclude test files
  /test.*\.mjs$/,  // Exclude test .mjs files
  /test.*\.js$/,  // Exclude test .js files (like js/tests/)
  /\.test\.js$/,  // Exclude .test.js files
  /\.spec\.js$/   // Exclude .spec.js files
];

function shouldExclude(filePath) {
  // Convert to relative path for better matching
  const relativePath = path.relative(rootDir, filePath);
  const fileName = path.basename(filePath);
  
  // Never exclude root files that are explicitly copied
  const isRootFile = rootFiles.includes(fileName);
  if (isRootFile) {
    return false;
  }
  
  // Check both full path and filename
  return excludePatterns.some(pattern => 
    pattern.test(filePath) || 
    pattern.test(relativePath) || 
    pattern.test(fileName)
  );
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      
      // Skip excluded files (check both relative and absolute paths)
      if (shouldExclude(srcPath) || shouldExclude(entry)) {
        console.log(`  Skipping excluded file: ${entry}`);
        continue;
      }
      
      copyRecursive(srcPath, destPath);
    }
  } else {
    // Check exclusion before copying file
    if (shouldExclude(src) || shouldExclude(path.basename(src))) {
      console.log(`  Skipping excluded file: ${path.basename(src)}`);
      return;
    }
    
    // Copy file
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('Building for Cloudflare Pages...');
console.log(`Source: ${rootDir}`);
console.log(`Destination: ${distDir}`);

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy static directories
console.log('\nCopying static directories...');
for (const dir of staticDirs) {
  const src = path.join(rootDir, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    console.log(`  Copying ${dir}/...`);
    copyRecursive(src, dest);
  }
}

// Copy root files
console.log('\nCopying root files...');
for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    console.log(`  Copying ${file}`);
    fs.copyFileSync(src, dest);
  }
}

// Copy _redirects file if it exists, or create a default one
console.log('\nSetting up _redirects file...');
const redirectsSource = path.join(rootDir, '_redirects');
const redirectsDest = path.join(distDir, '_redirects');
if (fs.existsSync(redirectsSource)) {
  fs.copyFileSync(redirectsSource, redirectsDest);
  console.log('  Copied _redirects');
} else {
  const redirectsContent = `# Cloudflare Pages redirects
# Handle unit conversion URLs
/convert/units/*/index.html /convert/units/*/index.html 200
`;
  fs.writeFileSync(redirectsDest, redirectsContent);
  console.log('  Created default _redirects');
}

// Verify critical files were copied
const criticalFiles = ['index.html', '_redirects'];
let missingFiles = [];
for (const file of criticalFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('\n✗ Build failed: Missing critical files:', missingFiles.join(', '));
  process.exit(1);
}

console.log('\n✓ Build complete!');
console.log(`Output directory: ${distDir}`);

