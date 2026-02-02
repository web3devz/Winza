import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        linera: '@linera/client',
      },
      preserveEntrySignatures: 'strict',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5175,
    },
    fs: {
      allow: ['..']
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  optimizeDeps: {
    exclude: ['@linera/client', '@linera/metamask']
  },
  define: {
    global: 'globalThis',
  },
  assetsInclude: ['**/*.wasm']
})
