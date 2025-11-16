# DevTools - Framework-Free Client-Side Developer Tools

A collection of fast, privacy-first developer tools that run entirely in your browser. No data leaves your device.

## Features

- ✅ 100% client-side processing (privacy-first)
- ✅ SEO-optimized with per-tool URLs and metadata
- ✅ No JavaScript frameworks - pure vanilla JS, HTML, CSS
- ✅ Consistent design system with dark/light mode
- ✅ Accessible (WCAG AA), keyboard-first navigation
- ✅ Shareable permalinks encoding tool state via URL
- ✅ LocalStorage persistence for tool state

## Tools

### JSON Tools
- **JSON Validator** (`/json/validate`) - Validate JSON with line/column error pointers
- **JSON Formatter** (`/json/format`) - Format and beautify JSON with customizable indentation

### Text Tools
- **Base64 Encode/Decode** (`/text/base64`) - Encode/decode Base64 with URL-safe option
- **Text Diff** (`/diff/text`) - Compare two texts side-by-side with word/char granularity
- **Regex Tester** (`/regex/tester`) - Test regular expressions with match highlighting

### Crypto Tools
- **Hash Generator** (`/crypto/hash`) - Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes

## Getting Started

### Local Development

1. Serve the files using a static file server. For example:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

2. Open `http://localhost:8000` in your browser

### Deployment

This is a static site that can be deployed to any static hosting service:

- **Netlify**: Drag and drop the folder or connect a Git repository
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to a repository and enable Pages
- **Cloudflare Pages**: Connect repository or upload folder

### Configuration

Update the following files with your actual domain:

- `sitemap.xml` - Replace `https://example.com` with your domain
- `robots.txt` - Replace `https://example.com` with your domain
- All HTML files - Update canonical URLs and Open Graph URLs

## Project Structure

```
/
├── index.html              # Home page
├── css/
│   ├── base.css           # Base design system styles
│   └── tool.css           # Tool-specific shared styles
├── js/
│   ├── ui.js              # UI utilities (toasts, theme, etc.)
│   ├── url-state.js       # URL state management
│   ├── header.js          # Shared header functionality
│   ├── utils/             # Utility modules
│   │   ├── json.js
│   │   ├── base64.js
│   │   ├── hash.js
│   │   ├── diff.js
│   │   └── regex.js
│   └── tools/              # Tool-specific modules
│       ├── json-validate.js
│       ├── json-format.js
│       ├── base64.js
│       ├── hash.js
│       ├── text-diff.js
│       └── regex-tester.js
├── json/
│   ├── validate/
│   └── format/
├── text/
│   └── base64/
├── crypto/
│   └── hash/
├── diff/
│   └── text/
├── regex/
│   └── tester/
├── manifest.webmanifest   # PWA manifest
├── robots.txt             # SEO robots file
└── sitemap.xml            # SEO sitemap
```

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search (home page) or open command palette
- `Ctrl/Cmd + Enter` - Run current tool
- `Ctrl/Cmd + /` - Focus help/FAQ section

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

Requires modern browser features:
- ES6 modules
- Web Crypto API (for hash tool)
- LocalStorage
- Fetch API

## Performance

Targets:
- LCP < 1.8s
- CLS ~ 0
- TBT < 100ms

All tools are optimized for performance with:
- Minimal JavaScript (no frameworks)
- Inline critical CSS
- Deferred non-critical scripts
- Web Workers for heavy operations (future enhancement)

## Privacy

- All processing happens locally in your browser
- No data is sent to any server
- No analytics by default
- No cookies required
- Optional LocalStorage for tool state persistence

## License

MIT License - feel free to use this project for your own tools.

## Roadmap

### Phase 2
- JSON Schema validation
- JWT decode
- URL encode/decode
- Color contrast checker
- Web Workers for diff and large JSON

### Phase 3
- CSV/TSV converters
- OpenAPI viewer
- gzip/brotli estimator
- YAML/TOML conversion
- Mock data generator
- QR encoder/decoder

### Phase 4
- Protobuf/Avro viewers
- Directory diff
- SVG optimizer
- Webhook tester

