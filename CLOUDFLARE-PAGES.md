# Cloudflare Pages Deployment Configuration

## Required Build Settings

In your Cloudflare Pages dashboard, configure the following:

### Build Configuration

- **Build command:** `npm install && npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (root of repository)
- **Node.js version:** `18` or higher

### Environment Variables

No environment variables are required for this project.

## Build Process

The build process:
1. Installs dependencies (`npm install`)
2. Runs Vite build (`vite build`)
3. Copies WASM files (`node scripts/copy-wasm-files.js`)
4. Prepares files for Cloudflare Pages (`node scripts/build-for-pages.js`)

The output is placed in the `dist` directory, which should be set as the build output directory in Cloudflare Pages.

## Troubleshooting

If deployment fails:
1. Ensure Node.js version is 18 or higher
2. Check that `package.json` and `package-lock.json` are committed
3. Verify the build command is exactly: `npm install && npm run build`
4. Check build logs in Cloudflare Pages dashboard for specific errors

