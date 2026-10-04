# Decoding the Bottle: local wine explorer

A browsable catalogue of held-out wines, actual and predicted public ratings, and individual SHAP explanations. Built with React, TypeScript, Vite, Radix Dialog, Phosphor icons, and self-hosted Manrope. No inference server or account is required.

The default site uses **all 9,329 held-out wines** from a newly retrained CatBoost raw-rating model, with genuine predictions and 103 SHAP contributions per wine. The prepared data was recovered from the archived project. Test MAE is **0.162445 stars**, RMSE **0.243121**, and R² **0.553889**. These new-run scores are separate from the course report's historical results. See [data provenance and limitations](../docs/web-data.md).

## Run locally

Use Node.js 22.12+ (or a supported later LTS version):

```bash
cd web
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173`. To test a production build:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

Both development and production use the prepared real release. Production builds render the first 12 real wines directly into static HTML, then hydrate the interface and download the full searchable catalogue in the background. For the explicit fictional fixture and local JSON importer, run `npm run dev -- --mode demo`. `npm run build:demo` is a development-only build; it must not be used for the production deployment.

## Deploy to Vercel

Commit the website, including `public/release/`, and import the repository into Vercel with:

| Setting               | Value           |
| --------------------- | --------------- |
| Root directory        | `web`           |
| Framework             | Vite            |
| Install               | `npm ci`        |
| Build                 | `npm run build` |
| Output                | `dist`          |
| Node.js               | 22.x or 24.x    |
| Environment variables | None required   |

`vercel.json` sets the build and cache headers. The deployment needs no Python, source CSV, fitted model, external drive, database, API route, or inference service. The prepared static release is sufficient for a fresh checkout to build. Wine links use `/?wine=<id>`, so they do not require a catch-all rewrite; missing JSON assets stay genuine 404s.

The manifest revalidates on each visit; content-hashed release assets and Vite assets can be cached for a year. A failed release or detail download shows a retry action. An absent, demo, corrupted, or internally inconsistent release fails `npm run build` rather than silently publishing fictional wines.

## Regenerate a release offline

After [retraining/exporting](../docs/web-data.md) from the recovered local dataset:

```bash
cd web
npm run prepare:release
npm run build
```

The preparation command reads `../artifacts/web/test-wines.json` and `../artifacts/web/provenance.json`. Optional `--collection`, `--provenance`, and `--output` arguments override paths. **Only offline preparation uses these ignored artifacts.** Build verification reads `public/release/` only. Commit the regenerated release as a complete unit with any code changes before deploying.

The verifier checks checksums, exact source-row split coverage and disjointness, ID ordering, metadata consistency, every SHAP sum, aggregate metrics, and chart sample consistency. Declared provenance and source hashes support auditing; these checks cannot prove the original upstream imputation was free from leakage.

The full catalogue is about 3.4 MB uncompressed / 717 KB gzip. It contains all wines for local search, filtering, sorting and pagination, and now loads after the first page is visible. The first 12 real wines and their release metadata are embedded in the built HTML, so their appearance does not wait for JavaScript or the full catalogue. Search, filters, sorting, overview, and pagination become available after the full catalogue arrives; explanations for the first wines can be opened immediately after hydration. Failed background downloads retain the first page and offer a retry. Shared links to other wines wait for the complete index.

Full explanations load in 64-wine chunks, around 89 KB gzip each. Numeric contexts load separately as approximately 400-point samples. The browser retains up to four detail chunks and two context files; analytical components are also loaded on demand. The complete release is about 120 MB raw / 15.4 MB gzip across all assets, **not an initial page download**. Gzip sizes are local measurements; actual CDN transfer sizes may differ. Exact prediction and explanation values are preserved.

## Explore

- Search names, producers, grapes, and regions; accents are optional.
- Filter by wine style, country, price, or absolute prediction error; sort and switch between grid and list views.
- Bookmark wines. Saved IDs and your theme preference remain in this browser's local storage.
- Open a wine for its predicted and actual rating, signed prediction error, SHAP waterfall, exact contribution table, influence by theme, numeric feature context, and actual-versus-predicted scatter plot.
- Select scatter points or use previous/next controls to change wines.
- Review aggregate metrics for the currently loaded collection under **Model overview**. These are not the report's historical scores.

Charts use a deterministic sample of at most 401 points for large collections, always including the selected wine. Metrics use the entire loaded collection. Positive and negative SHAP contributions have signed labels as well as different colors. Contributions explain the model; they do not establish causation.

## Local imports and demonstrations

The explicit `demo` mode includes 24 fictional wines and a local JSON importer for development. Imported files stay in browser memory and are not uploaded. Its 25 MB file limit is intended for small fixtures; the full test export is packaged offline instead. Production hides the importer and uses only the verified static release.

The [Python export helper](../docs/web-data.md) checks processed row alignment, model feature order, raw-rating units, declared train/test separation and SHAP additivity. It does not infer missing historical preparation steps. Numeric missing inputs remain native CatBoost missing values, and earlier imputation flags are unavailable.

## Project layout

```text
src/App.tsx                  Collection state, navigation, import, and filters
src/components/              Bottle, wine detail dialog, and chart views
src/data/                    Types, clearly labeled fixtures, validation, filtering
src/index.css                Fonts, theme tokens, global accessibility rules
src/App.css                  Responsive catalogue and analytical views
src/data/collection.test.ts   Data integrity, filtering, sorting, and metric tests
tests/explorer.spec.ts        Browser workflows and axe accessibility checks
public/images/               Generated, generic wine illustrations
```

## Verify

```bash
npm run test
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser coverage includes search, filters, sorting, pagination, bookmarks, all chart tabs, keyboard navigation and focus restoration, valid/invalid imports, JSON download, light/dark contrast, and mobile overflow. Run the Python export tests from the repository root with `uv run python -m unittest discover -s tests`.

## Design and image provenance

The design follows the explicitly requested `design-taste-frontend` skill: a calm wine catalogue with burgundy accents, beige surfaces, black text, a single type family, and restrained interaction feedback. Design variance 6, motion 3, density 5. Native CSS provides the catalogue aesthetic; Radix provides accessible modal behavior. Radius rules are 6 px controls and 10 px surfaces, with circles reserved for icon controls and wine-style markers. Layer tokens live in `src/index.css`. Beige is the default theme; a warm dark alternative, keyboard paths, and reduced motion are supported.

`assets/wine-bottles-source.png` was generated with OpenAI's image generation tool for this prototype. It is a transparent six-bottle sprite sheet with fictional botanical labels, cropped by CSS rather than presented as photographs of named wines. The web delivery file is `public/images/wine-bottles.webp` (103 KB); `npm run assets` regenerates its compression and the Phosphor favicon. Source prompt: “Realistic product cutouts of six generic wine bottles in a precisely aligned 3-column, 2-row sprite sheet: red, white, rosé; sparkling, orange, dessert. Transparent background, consistent studio lighting, complete bottle silhouettes, minimal botanical labels, no readable text or logos.” No existing wine brand artwork is represented intentionally. Illustrations remain generic even when real test data is imported.

## Local verification record

The genuine release is covered by browser tests for the 9,329-wine catalogue, lazy requests, all 103 feature rows, reloadable wine URLs, browser history, download retry, fortified filtering, and mobile accessibility/overflow. Further coverage checks static HTML with JavaScript disabled, first-page explanations while the full catalogue is held back, background failure and retry, links outside the first page, and saved wines/theme persistence during hydration at a 320 px viewport. Separate demo tests cover imports, search/filter/sort/pagination, keyboard focus, and both themes. Release tests also exercise a clearly artificial 9,329-wine capacity fixture, bounded caches, and rejection of incomplete or inconsistent assets.

Local screenshots and Lighthouse output live under ignored `qa/`. These are local lab checks, not deployed field measurements or an exhaustive accessibility certification.

See [mobile performance and deployment review](../docs/web-performance.md) for the final verification results, before/after measurements, and deployment configuration.
