// Side Menu Component
// Hamburger menu with tool navigation and search

import { qs, on } from '/js/ui.js';

// Tools list - extracted from index.html
const TOOLS = [
  { url: '/ai/chat', name: 'WebLLM Chatbot', category: 'ai', description: 'Chat with local AI models in your browser using WebLLM' },
  { url: '/ai/image-generate', name: 'AI Image Generator', category: 'ai', description: 'Generate images from text prompts using SD-Turbo and Janus-Pro-1B models with WebGPU' },
  { url: '/ai/image-caption', name: 'Image Caption Generator', category: 'ai', description: 'Generate AI-powered captions for images using vit-gpt2-image-captioning model' },
  { url: '/ai/image-ocr', name: 'Image OCR', category: 'ai', description: 'Extract text from images using OCR (Optical Character Recognition) with Tesseract.js' },
  { url: '/ai/video-slideshow', name: 'Video Slideshow Generator', category: 'ai', description: 'Generate video slideshows from text with AI images and voice narration' },
  { url: '/ai/music-generate', name: 'AI Music Generator', category: 'ai', description: 'Generate music from text prompts using MusicGen-small ONNX models' },
  { url: '/regex/generator', name: 'Regex Generator', category: 'ai', description: 'Generate regular expressions from natural language using AI' },
  { url: '/utils/grammar-check', name: 'Grammar & Spelling Checker', category: 'ai', description: 'Check spelling and grammar using AI' },
  { url: '/utils/ai-detector', name: 'AI Text Detector', category: 'ai', description: 'Detect AI-generated text using ModernBERT ONNX model' },
  { url: '/json/validate', name: 'JSON Validator', category: 'json', description: 'Validate JSON with instant feedback and error pointers' },
  { url: '/json/format', name: 'JSON Formatter', category: 'json', description: 'Format and beautify JSON with customizable indentation' },
  { url: '/json/schema', name: 'JSON Schema Validator', category: 'json', description: 'Validate JSON against JSON Schema locally' },
  { url: '/json/schema-generate', name: 'JSON Schema Generator', category: 'json', description: 'Generate JSON Schema from JSON data locally' },
  { url: '/json/yaml', name: 'JSON ↔ YAML ↔ TOML Converter', category: 'json', description: 'Convert between JSON, YAML, and TOML formats' },
  { url: '/json/openapi', name: 'OpenAPI Viewer', category: 'json', description: 'View and explore OpenAPI/Swagger specifications locally' },
  { url: '/convert/csv', name: 'CSV/TSV Converter', category: 'convert', description: 'Convert between CSV, TSV, and JSON formats' },
  { url: '/utils/compression', name: 'Compression Estimator', category: 'utils', description: 'Estimate gzip and brotli compression sizes' },
  { url: '/utils/mock-data', name: 'Mock Data Generator', category: 'utils', description: 'Generate mock JSON data from JSON Schema' },
  { url: '/utils/qr', name: 'QR Code Generator', category: 'utils', description: 'Generate QR codes from text or URLs' },
  { url: '/utils/qr-scanner', name: 'QR Code Scanner', category: 'utils', description: 'Scan QR codes from webcam or uploaded images' },
  { url: '/utils/barcode', name: 'Barcode Generator', category: 'utils', description: 'Generate various barcode formats' },
  { url: '/utils/timer', name: 'Timer & Stopwatch', category: 'utils', description: 'Simple timer and stopwatch with countdown and elapsed time tracking' },
  { url: '/utils/pomodoro', name: 'Pomodoro Timer', category: 'utils', description: 'Pomodoro technique timer for focused work sessions with breaks' },
  { url: '/utils/ip', name: 'IP Address Tools', category: 'utils', description: 'IP address lookup, subnet calculator, and IP address utilities' },
  { url: '/utils/user-agent', name: 'User Agent Parser', category: 'utils', description: 'Parse and analyze user agent strings' },
  { url: '/utils/mime', name: 'MIME Type Checker', category: 'utils', description: 'Check MIME types for files and extensions' },
  { url: '/yaml/validate', name: 'YAML Validator', category: 'yaml', description: 'Validate YAML syntax with instant feedback' },
  { url: '/text/base64', name: 'Base64 Encode/Decode', category: 'text', description: 'Encode and decode Base64 strings with URL-safe option' },
  { url: '/text/url', name: 'URL Encode/Decode', category: 'text', description: 'Encode and decode URL strings locally' },
  { url: '/text/markdown', name: 'Markdown Editor', category: 'text', description: 'Edit Markdown with live preview and HTML export' },
  { url: '/text/html-entities', name: 'HTML Entity Encoder/Decoder', category: 'text', description: 'Convert special characters to/from HTML entities' },
  { url: '/text/case-converter', name: 'String Case Converter', category: 'text', description: 'Convert text between camelCase, snake_case, kebab-case, and more' },
  { url: '/text/statistics', name: 'Text Statistics', category: 'text', description: 'Analyze word count, character count, reading time, and keyword density' },
  { url: '/text/summarize', name: 'Text Summarizer', category: 'text', description: 'Summarize text using AI with WebLLM models' },
  { url: '/text/lorem', name: 'Lorem Ipsum Generator', category: 'text', description: 'Generate Lorem Ipsum placeholder text with customizable options' },
  { url: '/text/slug', name: 'Slug Generator', category: 'text', description: 'Convert text to URL-friendly slugs for SEO and filenames' },
  { url: '/text/password', name: 'Password Generator', category: 'text', description: 'Generate secure passwords with customizable options' },
  { url: '/convert/image-pdf', name: 'Image to PDF', category: 'convert', description: 'Convert images to PDF files with customizable page settings' },
  { url: '/convert/image', name: 'Image Format Converter', category: 'convert', description: 'Convert images between PNG, JPEG, WebP, SVG, and ICO formats' },
  { url: '/convert/image-resize', name: 'Image Resizer', category: 'convert', description: 'Resize images while preserving aspect ratio' },
  { url: '/convert/image-compress', name: 'Image Compressor', category: 'convert', description: 'Compress JPEG and PNG images to reduce file size' },
  { url: '/convert/color-picker', name: 'Color Extractor', category: 'convert', description: 'Extract colors from images and convert between color formats' },
  { url: '/convert/image-metadata', name: 'Image Metadata Viewer', category: 'convert', description: 'View EXIF and other metadata from images' },
  { url: '/convert/image-crop', name: 'Image Cropper', category: 'convert', description: 'Crop images with a visual interface' },
  { url: '/convert/image-bg-remove', name: 'Background Remover', category: 'convert', description: 'Remove backgrounds from images using color-based techniques' },
  { url: '/convert/video', name: 'Video Format Converter', category: 'convert', description: 'Convert videos between MP4, WebM, AVI, MOV, and MKV formats' },
  { url: '/convert/video-audio', name: 'Extract Audio from Video', category: 'convert', description: 'Extract audio tracks from video files and save as MP3, WAV, AAC, and other audio formats' },
  { url: '/convert/audio', name: 'Audio Format Converter', category: 'convert', description: 'Convert audio files between MP3, WAV, OGG, M4A, FLAC, AAC, and Opus formats' },
  { url: '/convert/audio-stem-separator', name: 'Audio Stem Separator', category: 'convert', description: 'Separate audio into stems (drums, bass, vocals, other) using Demucs AI model' },
  { url: '/convert/time', name: 'Time & Timezone Parser', category: 'time', description: 'Parse times, normalize to UTC, and convert across common time zones' },
  { url: '/time/timestamp', name: 'Unix Timestamp Converter', category: 'time', description: 'Convert Unix timestamps to dates and vice versa' },
  { url: '/time/iso8601', name: 'ISO 8601 Parser', category: 'time', description: 'Parse and format ISO 8601 date strings' },
  { url: '/time/date-calc', name: 'Date Calculator', category: 'time', description: 'Calculate differences between dates and add/subtract time' },
  { url: '/time/cron', name: 'Cron Expression Generator', category: 'time', description: 'Generate and validate cron expressions' },
  { url: '/convert/units', name: 'Unit Converter', category: 'convert', description: 'Convert between hundreds of units across all measurement categories', expandable: true },
  { url: '/crypto/hash', name: 'Hash Generator', category: 'crypto', description: 'Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes' },
  { url: '/crypto/uuid', name: 'UUID Generator', category: 'crypto', description: 'Generate UUIDs in versions 1, 2, 3, 4, and 5' },
  { url: '/crypto/jwt', name: 'JWT Decoder', category: 'crypto', description: 'Decode JWT tokens to view header, payload, and signature' },
  { url: '/utils/calculator', name: 'Calculator', category: 'utils', description: 'Simple, advanced, and scientific calculator with history and memory functions' },
  { url: '/utils/bmi-calculator', name: 'BMI Calculator', category: 'utils', description: 'Calculate BMI with basic and advanced body measurements' },
  { url: '/utils/loan-calculator', name: 'Loan Calculator', category: 'utils', description: 'Calculate loan and mortgage payments with detailed amortization schedule' },
  { url: '/utils/random', name: 'Random Number Generator', category: 'utils', description: 'Generate random numbers with customizable range and count' },
  { url: '/utils/shuffler', name: 'List Shuffler', category: 'utils', description: 'Shuffle lists of items with customizable delimiters' },
  { url: '/utils/notes', name: 'Notes', category: 'utils', description: 'Create and manage notes saved locally' },
  { url: '/utils/text-to-speech', name: 'Text to Speech', category: 'utils', description: 'Convert text to speech with various voices and download audio files' },
  { url: '/utils/vocal-remover', name: 'Vocal Remover', category: 'utils', description: 'Remove vocals from audio tracks using center channel extraction' },
  { url: '/utils/model-cache', name: 'Model Cache Manager', category: 'utils', description: 'View and manage all cached AI models across tools' },
  { url: '/utils/color-contrast', name: 'Color Contrast Checker', category: 'utils', description: 'Check color contrast ratios for WCAG accessibility compliance' },
  { url: '/diff/text', name: 'Text Diff', category: 'text', description: 'Compare two texts side-by-side with word/char granularity' },
  { url: '/regex/tester', name: 'Regex Tester', category: 'text', description: 'Test regular expressions with match highlighting and groups' },
  { url: '/code/minify', name: 'Code Minifier', category: 'code', description: 'Minify JavaScript, CSS, and HTML code to reduce file size' },
  { url: '/code/beautify', name: 'Code Beautifier', category: 'code', description: 'Beautify and format JavaScript, CSS, and HTML code' },
  { url: '/code/xml', name: 'XML Validator & Formatter', category: 'code', description: 'Validate and format XML documents with proper indentation' }
];

let categories = null;

// Initialize side menu
export function initSideMenu() {
  // Don't show on front page
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html' || path === '') {
    console.log('Side menu: Skipping front page');
    return;
  }
  
  console.log('Side menu: Initializing on', path);
  
  const header = qs('header');
  if (!header) {
    console.warn('Side menu: Header not found');
    return;
  }
  
  // Check if hamburger button already exists
  let hamburgerBtn = qs('#menu-toggle');
  if (hamburgerBtn) {
    console.log('Side menu: Hamburger button already exists');
    return; // Already initialized
  }
  
  // Create hamburger button
  hamburgerBtn = document.createElement('button');
  hamburgerBtn.id = 'menu-toggle';
  hamburgerBtn.className = 'menu-toggle';
  hamburgerBtn.setAttribute('aria-label', 'Toggle menu');
  hamburgerBtn.innerHTML = '☰';
  hamburgerBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    color: var(--text);
    margin-right: 1rem;
    display: inline-block;
  `;
  
  // Insert before the logo (first child)
  const firstChild = header.firstElementChild;
  if (firstChild) {
    header.insertBefore(hamburgerBtn, firstChild);
  } else {
    header.appendChild(hamburgerBtn);
  }
  
  console.log('Side menu: Hamburger button created');
  
  // Create side menu overlay
  const overlay = document.createElement('div');
  overlay.id = 'menu-overlay';
  overlay.className = 'menu-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9998;
    display: none;
  `;
  
  // Create side menu
  const sideMenu = document.createElement('div');
  sideMenu.id = 'side-menu';
  sideMenu.className = 'side-menu';
  sideMenu.style.cssText = `
    position: fixed;
    top: 0;
    left: -350px;
    width: 350px;
    max-width: 90vw;
    height: 100%;
    background-color: var(--bg);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    transition: left 0.3s ease;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  `;
  
  // Menu header
  const menuHeader = document.createElement('div');
  menuHeader.style.cssText = `
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const menuTitle = document.createElement('h2');
  menuTitle.textContent = 'Tools';
  menuTitle.style.cssText = `
    margin: 0;
    font-size: 1.25rem;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.setAttribute('aria-label', 'Close menu');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text);
    padding: 0;
    line-height: 1;
    width: 2rem;
    height: 2rem;
  `;
  
  menuHeader.appendChild(menuTitle);
  menuHeader.appendChild(closeBtn);
  
  // Search input
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    padding: 1rem;
    border-bottom: 1px solid var(--border);
  `;
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'menu-search';
  searchInput.placeholder = 'Search tools...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background-color: var(--bg);
    color: var(--text);
    box-sizing: border-box;
  `;
  
  searchContainer.appendChild(searchInput);
  
  // Tools list container
  const toolsList = document.createElement('div');
  toolsList.id = 'menu-tools-list';
  toolsList.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  `;
  
  sideMenu.appendChild(menuHeader);
  sideMenu.appendChild(searchContainer);
  sideMenu.appendChild(toolsList);
  
  document.body.appendChild(overlay);
  document.body.appendChild(sideMenu);
  
  // Load unit categories for expandable unit converter
  loadUnitCategories().then(() => {
    renderToolsList('');
  });
  
  // Toggle menu
  function toggleMenu() {
    const isOpen = sideMenu.style.left === '0px';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }
  
  function openMenu() {
    sideMenu.style.left = '0';
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    searchInput.focus();
  }
  
  function closeMenu() {
    sideMenu.style.left = '-350px';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  // Event listeners
  on(hamburgerBtn, 'click', toggleMenu);
  on(closeBtn, 'click', closeMenu);
  on(overlay, 'click', closeMenu);
  
  // Close on Escape key
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && sideMenu.style.left === '0px') {
      closeMenu();
    }
  });
  
  // Search functionality
  on(searchInput, 'input', (e) => {
    renderToolsList(e.target.value);
  });
  
  function renderToolsList(searchQuery = '') {
    const query = searchQuery.toLowerCase().trim();
    toolsList.innerHTML = '';
    
    const filteredTools = TOOLS.filter(tool => {
      if (!query) return true;
      return tool.name.toLowerCase().includes(query) ||
             tool.description.toLowerCase().includes(query) ||
             tool.category.toLowerCase().includes(query);
    });
    
    // Group by category
    const grouped = {};
    filteredTools.forEach(tool => {
      if (!grouped[tool.category]) {
        grouped[tool.category] = [];
      }
      grouped[tool.category].push(tool);
    });
    
    // Render tools
    Object.keys(grouped).sort().forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.style.cssText = `
        margin-bottom: 1rem;
      `;
      
      const categoryTitle = document.createElement('h3');
      categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      categoryTitle.style.cssText = `
        margin: 0 0 0.5rem 0;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-subtle);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      `;
      
      categoryDiv.appendChild(categoryTitle);
      
      grouped[category].forEach(tool => {
        if (tool.expandable && tool.url === '/convert/units') {
          // Render expandable unit converter
          renderExpandableUnitConverter(categoryDiv, tool);
        } else {
          // Render regular tool
          const toolLink = document.createElement('a');
          toolLink.href = tool.url;
          toolLink.className = 'menu-tool-item';
          toolLink.style.cssText = `
            display: block;
            padding: 0.75rem 1rem;
            color: var(--text);
            text-decoration: none;
            border-bottom: 1px solid var(--border);
            transition: background-color 0.2s;
          `;
          
          toolLink.addEventListener('mouseenter', () => {
            toolLink.style.backgroundColor = 'var(--bg-elev)';
          });
          
          toolLink.addEventListener('mouseleave', () => {
            toolLink.style.backgroundColor = '';
          });
          
          // Highlight current page
          if (window.location.pathname === tool.url || window.location.pathname.startsWith(tool.url + '/')) {
            toolLink.style.backgroundColor = 'var(--bg-elev)';
            toolLink.style.fontWeight = '600';
          }
          
          const toolName = document.createElement('div');
          toolName.textContent = tool.name;
          toolName.style.cssText = `
            font-weight: 500;
            margin-bottom: 0.25rem;
          `;
          
          const toolDesc = document.createElement('div');
          toolDesc.textContent = tool.description;
          toolDesc.style.cssText = `
            font-size: 0.875rem;
            color: var(--text-subtle);
          `;
          
          toolLink.appendChild(toolName);
          toolLink.appendChild(toolDesc);
          categoryDiv.appendChild(toolLink);
        }
      });
      
      toolsList.appendChild(categoryDiv);
    });
  }
  
  async function loadUnitCategories() {
    if (categories) return categories;
    
    try {
      const { CATEGORIES } = await import('/js/utils/unit-definitions.js');
      categories = CATEGORIES;
      return categories;
    } catch (error) {
      console.error('Failed to load unit categories:', error);
      return [];
    }
  }
  
  function renderExpandableUnitConverter(container, tool) {
    const toolContainer = document.createElement('div');
    toolContainer.style.cssText = `
      border-bottom: 1px solid var(--border);
    `;
    
    const toolHeader = document.createElement('div');
    toolHeader.className = 'menu-tool-expandable';
    toolHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;
      user-select: none;
    `;
    
    const toolInfo = document.createElement('div');
    toolInfo.style.cssText = `
      flex: 1;
    `;
    
    const toolName = document.createElement('div');
    toolName.textContent = tool.name;
    toolName.style.cssText = `
      font-weight: 500;
      margin-bottom: 0.25rem;
    `;
    
    const toolDesc = document.createElement('div');
    toolDesc.textContent = tool.description;
    toolDesc.style.cssText = `
      font-size: 0.875rem;
      color: var(--text-subtle);
    `;
    
    toolInfo.appendChild(toolName);
    toolInfo.appendChild(toolDesc);
    
    const expandIcon = document.createElement('span');
    expandIcon.textContent = '▼';
    expandIcon.style.cssText = `
      font-size: 0.75rem;
      transition: transform 0.2s;
      margin-left: 0.5rem;
    `;
    
    toolHeader.appendChild(toolInfo);
    toolHeader.appendChild(expandIcon);
    
    const categoriesList = document.createElement('div');
    categoriesList.className = 'menu-categories-list';
    categoriesList.style.cssText = `
      display: none;
      background-color: var(--bg-elev);
    `;
    
    let isExpanded = false;
    
    toolHeader.addEventListener('click', async () => {
      isExpanded = !isExpanded;
      
      if (isExpanded && categoriesList.children.length === 0) {
        // Load and render categories
        const cats = await loadUnitCategories();
        cats.forEach(category => {
          const categoryLink = document.createElement('a');
          categoryLink.href = `/convert/units/${category.id}`;
          categoryLink.style.cssText = `
            display: block;
            padding: 0.5rem 1rem 0.5rem 2rem;
            color: var(--text);
            text-decoration: none;
            border-bottom: 1px solid var(--border);
            transition: background-color 0.2s;
          `;
          
          categoryLink.addEventListener('mouseenter', () => {
            categoryLink.style.backgroundColor = 'var(--bg-elev)';
          });
          
          categoryLink.addEventListener('mouseleave', () => {
            categoryLink.style.backgroundColor = 'transparent';
          });
          
          categoryLink.textContent = category.name;
          categoriesList.appendChild(categoryLink);
        });
      }
      
      categoriesList.style.display = isExpanded ? 'block' : 'none';
      expandIcon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    });
    
    // Main tool link
    const mainLink = document.createElement('a');
    mainLink.href = tool.url;
    mainLink.style.cssText = `
      display: block;
      padding: 0.5rem 1rem 0.5rem 2rem;
      color: var(--link);
      text-decoration: none;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--border);
    `;
    mainLink.textContent = 'All Categories';
    
    toolContainer.appendChild(toolHeader);
    toolContainer.appendChild(categoriesList);
    toolContainer.appendChild(mainLink);
    container.appendChild(toolContainer);
  }
}

