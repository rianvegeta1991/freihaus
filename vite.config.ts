import { defineConfig } from 'vite'

// VITE_BASE ist der Unterpfad auf GitHub Pages (z. B. "/freihaus/"); lokal und auf einer eigenen Domain "/".
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: { target: 'es2022', sourcemap: false },
})
