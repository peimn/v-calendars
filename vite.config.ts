/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { createViteConfig } from './build/configs/vite.common';

export default defineConfig({
  ...createViteConfig('es'),
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
  },
  build: {
    rollupOptions: {
      // This ensures that only named exports are used and avoids conflicts with default exports
      output: {
        exports: 'named',  // Ensure the output uses named exports
      },
    },
  },
});
