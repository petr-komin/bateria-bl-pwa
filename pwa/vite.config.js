import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bateria-bl-pwa/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
