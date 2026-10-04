import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "preload-release-manifest",
      apply: "build",
      transformIndexHtml() {
        if (mode === "demo") return [];
        // The first page is embedded by prerender.mjs. Revalidate the release
        // in parallel with JavaScript without preloading the full catalogue.
        return ["/release/manifest.json"].map((href) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            as: "fetch",
            href,
            crossorigin: "anonymous",
          },
          injectTo: "head",
        }));
      },
    },
  ],
}));
