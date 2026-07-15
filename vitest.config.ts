import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  // tsconfig uses "jsx": "preserve" (Next transforms it); tests need esbuild
  // to compile JSX itself.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
