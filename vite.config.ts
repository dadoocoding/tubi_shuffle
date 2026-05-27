import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = dirname(fileURLToPath(import.meta.url));

function copyManifest(): Plugin {
  return {
    name: "copy-extension-manifest",
    closeBundle() {
      const target = resolve(rootDir, "dist/manifest.json");
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(resolve(rootDir, "manifest.json"), target);
    }
  };
}

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, "src/popup/index.html"),
        background: resolve(rootDir, "src/background/serviceWorker.ts"),
        content: resolve(rootDir, "src/content/tubiContentScript.ts")
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background/serviceWorker.js";
          if (chunk.name === "content") return "content/tubiContentScript.js";
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
