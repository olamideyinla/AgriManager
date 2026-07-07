import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Minimal, isolated config for building the prerender SSR entry (scripts/prerender.mjs).
 * Deliberately excludes the PWA/visualizer plugins from vite.config.ts — those assume
 * a client build and would conflict with an SSR bundle target.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    ssr: 'src/prerender/entry-server.tsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'entry-server.mjs' },
    },
  },
})
