# WebLLM Setup for Regex Generator

The Regex Generator tool uses WebLLM, which requires bundling before it can be used in the browser.

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the WebLLM bundle:**
   ```bash
   npm run build
   ```

3. **Serve the application:**
   ```bash
   python3 -m http.server 8000
   # or
   npm run dev  # Uses Vite dev server
   ```

4. **Access the tool:**
   Open `http://localhost:8000/regex/generator` in your browser.

## What gets built?

The build process creates a bundled version of WebLLM at:
- `js/tools/bundled/regex-generator-bundle.js`

This bundle includes WebLLM with all necessary dependencies and polyfills.

## Development

For development with hot reload:
```bash
npm run dev
```

This starts a Vite dev server with hot module replacement.

## Production

For production builds:
```bash
npm run build
```

The bundled files will be in the `js/tools/bundled/` directory.

## Troubleshooting

- **"WebLLM library not found"**: Make sure you've run `npm install && npm run build`
- **Build errors**: Ensure you have Node.js 18+ installed
- **Module errors**: Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

