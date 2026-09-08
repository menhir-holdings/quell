import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["cubing"],
  },
  build: {
    target: "es2022",
  },
});
