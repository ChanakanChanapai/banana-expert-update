import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // ✅ เพิ่มตรงนี้ครับ
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // พอร์ตมาตรฐานของ vercel dev
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ✅ Vitest Configuration — ติดตั้งระบบเทสอัตโนมัติ
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
