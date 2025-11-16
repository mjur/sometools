# Quick Start Guide

## Running Locally

### Option 1: Python HTTP Server
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000

### Option 2: Node.js http-server
```bash
npx http-server -p 8000
```

### Option 3: PHP Built-in Server
```bash
php -S localhost:8000
```

### Option 4: VS Code Live Server
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Testing the Tools

1. **JSON Validator** - Visit `/json/validate` and paste invalid JSON to see error messages
2. **JSON Formatter** - Visit `/json/format` and paste minified JSON to format it
3. **Base64** - Visit `/text/base64` and try encoding/decoding text
4. **Hash Generator** - Visit `/crypto/hash` and generate hashes from text or files
5. **Text Diff** - Visit `/diff/text` and compare two texts
6. **Regex Tester** - Visit `/regex/tester` and test regular expressions

## Features to Test

- ✅ Dark/Light theme toggle (button in header)
- ✅ Keyboard shortcuts (Ctrl/Cmd+Enter to run tools)
- ✅ Share buttons (creates URL with encoded state)
- ✅ LocalStorage persistence (tool state saved automatically)
- ✅ File drag & drop (Base64 and Hash tools)
- ✅ Responsive design (try resizing browser)

## Before Deploying

1. Update all `https://example.com` references in:
   - `sitemap.xml`
   - `robots.txt`
   - All HTML files (canonical URLs, Open Graph URLs, structured data)

2. Create a favicon:
   - See `FAVICON.md` for instructions
   - Place `favicon.ico` in the root directory

3. Test in multiple browsers:
   - Chrome/Edge
   - Firefox
   - Safari

4. Run Lighthouse audit:
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Run audit for Performance, SEO, Accessibility, Best Practices

## Deployment

### Netlify
1. Drag and drop the folder to Netlify
2. Or connect a Git repository

### Vercel
```bash
npm i -g vercel
vercel
```

### GitHub Pages
1. Push to a GitHub repository
2. Go to Settings > Pages
3. Select branch and folder (usually `/root`)

### Cloudflare Pages
1. Connect your Git repository
2. Or upload the folder directly

## Troubleshooting

**Issue**: Tools don't work, console shows CORS errors
**Solution**: Make sure you're using a local server, not opening files directly (file://)

**Issue**: Theme toggle doesn't work
**Solution**: Check browser console for errors, ensure `/js/header.js` loads correctly

**Issue**: State not persisting
**Solution**: Check browser LocalStorage settings, ensure it's enabled

**Issue**: Hash tool doesn't work
**Solution**: Ensure you're using HTTPS or localhost (Web Crypto API requirement)

