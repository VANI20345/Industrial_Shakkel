import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const BASE = "/Industrial_Shakkel/";

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
  plugins: [react(), devFaviconFallback()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
