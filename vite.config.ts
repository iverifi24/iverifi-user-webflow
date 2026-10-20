import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The browsers this app is built for. Tailwind 4's styles need these versions or newer (cascade layers, color-mix, @property, :has):
  // Chrome / Edge 111, Safari and iOS Safari 16.4, Firefox 128. index.html shows a notice on anything older.
  build: { target: ["chrome111", "edge111", "safari16.4", "firefox128"] },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
