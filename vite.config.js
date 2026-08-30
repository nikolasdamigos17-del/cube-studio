import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Διαγνωστικό + πιθανή λύση: χωρίς συμπίεση ονομάτων,
    // ώστε το σφάλμα να δείχνει αληθινά ονόματα (όχι 'P'/'N').
    // Αν το πρόβλημα ήταν από τον minifier, εξαφανίζεται κιόλας.
    minify: false,
    sourcemap: true,
  },
})
