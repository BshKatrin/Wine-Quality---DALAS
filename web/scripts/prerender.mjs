import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "dist/release/manifest.json"), "utf8"),
);
const preview = JSON.parse(
  await readFile(resolve(root, `dist${manifest.preview.url}`), "utf8"),
);
const server = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  mode: "production",
  appType: "custom",
  server: { middlewareMode: true },
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { ReleaseStore } = await server.ssrLoadModule("/src/data/release.ts");
  const initialRelease = ReleaseStore.fromPreview(manifest, preview);
  const content = renderToString(
    createElement(StrictMode, null, createElement(App, { initialRelease })),
  );
  // Escape raw '<' so wine names cannot terminate the JSON script element.
  const data = JSON.stringify({ manifest, preview }).replaceAll("<", "\\u003c");
  const path = resolve(root, "dist/index.html");
  const html = await readFile(path, "utf8");
  if (!html.includes('<div id="root"></div>'))
    throw new Error("Static root placeholder missing");
  await writeFile(
    path,
    html.replace(
      '<div id="root"></div>',
      `<div id="root">${content}</div><script id="wine-bootstrap" type="application/json">${data}</script><noscript>These first wines are a preview. Enable JavaScript to search the full collection and open explanations.</noscript>`,
    ),
  );
  console.log(
    `Rendered ${preview.wines.length} genuine wines into static HTML. No runtime server required.`,
  );
} finally {
  await server.close();
}
