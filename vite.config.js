import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    // Rewrite URLs with unit conversions to the category index page
    // e.g., /convert/units/length/cm-to-inch -> /convert/units/length/index.html
    fs: {
      allow: ['..']
    }
  },
  // Add middleware to handle unit conversion URLs
  plugins: [
    {
      name: 'unit-converter-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Check if this is a unit conversion URL pattern
          const match = req.url.match(/^\/convert\/units\/([^\/]+)\/([^-]+)-to-(.+)$/);
          if (match) {
            // Rewrite to the category index page
            req.url = `/convert/units/${match[1]}/index.html`;
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        'regex-generator-bundle': resolve(__dirname, 'js/tools/regex-generator-bundle.js'),
        'webllm-bundle': resolve(__dirname, 'js/tools/webllm-bundle-entry.js')
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        dir: 'js/tools/bundled'
      }
    },
    // Don't minify for easier debugging
    minify: false,
    // Target modern browsers
    target: 'esnext'
  },
  resolve: {
    // Handle Node.js built-ins for WebLLM
    alias: {
      'perf_hooks': false,
      'url': false
    }
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm']
  }
});

