import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

const BASE = "/Industrial_Shakkel/";

/** GitHub Pages serves 404.html for unknown paths; copy index.html so the SPA router can run. */
function ghPagesSpaFallback(): Plugin {
  return {
    name: "gh-pages-spa-fallback",
    apply: "build",
    closeBundle() {
      const index = path.resolve(__dirname, "dist/index.html");
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.resolve(__dirname, "dist/404.html"));
      }
    },
  };
}

/** Browsers request /favicon.ico at site root; with a non-root base that 404s in dev. */
function devFaviconFallback(): Plugin {
  return {
    name: "dev-favicon-fallback",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/favicon.ico" || req.url?.startsWith("/favicon.ico?")) {
          req.url = `${BASE}favicon.ico`;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: BASE,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), devFaviconFallback(), ghPagesSpaFallback()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
