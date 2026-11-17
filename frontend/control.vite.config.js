import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base:'/control-panel/',
  build:{
    outDir:'dist/control-panel',
    emptyOutDir:false,
    rollupOptions:{input:{control:fileURLToPath(new URL('./control.html',import.meta.url))}},
  },
});
