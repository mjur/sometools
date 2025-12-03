# Cloudflare Pages Deployment

## Quick Start

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Setup Cloudflare Pages deployment"
   git push
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your GitHub repository

3. **Configure Build Settings**
   - **Framework preset**: None (or Vite if available)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty)
   - **Deploy command**: Leave this EMPTY (do not set `npx wrangler deploy` - that's for Workers, not Pages)

4. **Deploy!**
   - Click "Save and Deploy"
   - Your site will be available at `your-project.pages.dev`

## Build Process

The build script (`npm run build`) does:
1. ✅ Builds Vite bundles (WebLLM, regex, image generation)
2. ✅ Copies WASM files for ONNX Runtime
3. ✅ Copies all static files to `dist/`
4. ✅ Creates `_redirects` for Cloudflare routing

## Files Created

- `scripts/build-for-pages.js` - Build script for copying static files
- `_redirects` - Cloudflare Pages routing rules
- `cloudflare-pages.md` - Detailed deployment guide

## Testing Locally

Test the build locally before deploying:
```bash
npm run build
npm run preview
```

This will build everything and serve it from the `dist` directory.

## Notes

- **Models**: The `models/` directory is excluded (gitignored). If you need specific models, remove them from `.gitignore` or add them manually.
- **Node Version**: Cloudflare Pages uses Node 18 by default. If you need a different version, set it in Environment Variables.

