import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
