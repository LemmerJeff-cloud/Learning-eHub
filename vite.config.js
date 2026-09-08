import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Learning-eHub/', // sous-dossier GitHub Pages (github.com/LemmerJeff-cloud/Learning-eHub)
})
