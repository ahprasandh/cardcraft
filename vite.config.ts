import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

/**
 * Force a UTF-8 charset on .md responses (skill.md). Without this, some
 * browsers fall back to Latin-1 and render em-dashes as `â€"` mojibake.
 * The file itself is already UTF-8 (with BOM as a backup hint), but
 * setting the explicit Content-Type header is the correct fix for
 * browsers that ignore BOMs and trust headers.
 */
function markdownUtf8(): Plugin {
  return {
    name: "markdown-utf8",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".md")) {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".md")) {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), markdownUtf8()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./core/src"),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
