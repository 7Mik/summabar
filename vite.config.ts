import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        inlineDynamicImports: true
      }
    }
  },
  plugins: [
    {
      name: 'copy-manifest-and-assets',
      closeBundle() {
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        if (existsSync('manifest.json')) {
          copyFileSync('manifest.json', 'dist/manifest.json');
        }
        if (existsSync('src/content/styles.css')) {
          copyFileSync('src/content/styles.css', 'dist/styles.css');
        }
        if (existsSync('icon.png')) {
          copyFileSync('icon.png', 'dist/icon.png');
        }
      }
    }
  ]
});
