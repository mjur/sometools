# Cloudflare Pages Deployment Guide

## Build Settings

When setting up your project in Cloudflare Pages, use these settings:

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave empty or use `/`)
- **Deploy command**: Leave EMPTY (do not set this - Pages automatically deploys the build output)
- **Node version**: `18` or `20` (set in Environment Variables if needed)

⚠️ **Important**: Do NOT set a deploy command. Cloudflare Pages automatically deploys your `dist` directory. The deploy command (`npx wrangler deploy`) is only for Cloudflare Workers, not Pages.

## Environment Variables

No environment variables are required for basic deployment.

## What Gets Deployed

The build process:
1. Builds Vite bundles (WebLLM, regex generator, image generation)
2. Copies WASM files for ONNX Runtime
3. Copies all static files (HTML, CSS, JS, assets) to `dist/`
4. Creates `_redirects` file for Cloudflare Pages routing

## Excluded Files

The following are NOT included in the build:
- `node_modules/`
- `models/` (gitignored - large model files)
- Python files (`.py`, `.ipynb`)
- Documentation files (`.md`)
- Development files (`.config.js`, `package.json`, etc.)

## Models

The `models/` directory is excluded from git and the build. If you need to include specific model files:
1. Remove `models/` from `.gitignore` (or add specific model files)
2. The build script will automatically copy them to `dist/models/`

## GitHub Setup

1. Push your code to GitHub
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect to GitHub and select your repository
4. Use the build settings above
5. Deploy!

## Custom Domain

After deployment, you can add a custom domain in the Cloudflare Pages settings.

