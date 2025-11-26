import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
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

