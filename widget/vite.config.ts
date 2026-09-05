import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'KaliGanWidget',
      fileName: () => 'w.js',
      formats: ['iife'],
    },
    outDir: resolve(__dirname, '../app/public'),
    emptyOutDir: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  }
});
