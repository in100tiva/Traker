import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Isola o three.js (usado só pela tela de carregamento) num chunk
          // próprio e cacheável, fora do bundle de entrada.
          three: ["three"],
        },
      },
    },
  },
});
