import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        weapons: resolve(import.meta.dirname, 'tools/weapons/index.html'),
        flight: resolve(import.meta.dirname, 'tools/flight/index.html'),
        streaming: resolve(import.meta.dirname, 'tools/streaming/index.html'),
        editor: resolve(import.meta.dirname, 'tools/voxel-editor/index.html'),
      },
    },
  },
});
