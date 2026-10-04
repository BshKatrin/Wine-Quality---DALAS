# Mobile loading and deployment review

Reviewed on 4 October 2026 against all 9,329 held-out wines, not the smaller demonstration collection.

## Changes

Production builds verify the release, bundle the frontend, and render the first 12 genuine wines into static HTML. The browser hydrates those same cards and loads the full catalogue in the background. No Vercel Function, inference service, database, or Python build step is required.

The first-page preview matches the default full-catalogue sort exactly. Its metadata, ordering, checksums, and aggregate metrics are verified against the complete release. Exact predictions and SHAP contributions remain unchanged. The first-page data is 4,702 bytes raw / 1,263 bytes gzip. Built HTML, including the cards and embedded release metadata, is about 76 KB raw / 21 KB gzip / 16 KB Brotli.

Search, filters, sorting, model overview, and pagination wait for the full catalogue. First-page wines can be opened after hydration while that download is still pending. An unsuccessful background download retains the first page and offers a retry. Shared links outside the first page resolve when the full index arrives. Upgrading the catalogue preserves opened explanation caches and does not silently reopen a wine or retry a failed explanation.

Mobile typography and spacing adapt down to 320 px. Main touch controls have 44 px targets. The loading-status area reserves space to keep the cards stable. Saved wines and the chosen theme are restored after hydration without a markup mismatch.

## Performance

Two fresh-browser Lighthouse runs used a warmed local static server with Brotli compression, the same mobile profile as the previous review, and no concurrent builds or test runs. The browser cache was cold for each run. Compression was prepared before benchmarking to avoid including local compression work in response times.

| Metric | Before | After, two runs |
| --- | --- | --- |
| Lighthouse performance | 72 and 82 | 97 and 97 |
| Largest Contentful Paint | about 4.4 s | 2.408 s and 2.406 s |
| First Contentful Paint | about 1.4-1.5 s | 1.573 s and 1.592 s |
| Total blocking time | 480 ms and 180 ms | 106 ms and 83 ms |
| Cumulative layout shift | 0.005 and 0.002 | 0.0048 in both |
| Accessibility / best practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |

LCP improved by approximately 45%. The first-view request budget is about 253 KB with Brotli, excluding the background catalogue. The complete cold-page transfer, including that background download, is about 676 KB (660 KiB); it is slightly larger than before because the first page is embedded in HTML, but rendering no longer waits for the complete index.

The full catalogue still costs about 717 KB gzip / 423 KB Brotli and must finish downloading before full search is ready. Opening an explanation adds approximately 90 KB gzip for its 64-wine chunk. The entire deployment is approximately 121 MB raw, spread over small static assets; it is not downloaded in full by a visitor. The browser retains at most four detail chunks and two feature-context files.

These are local lab measurements using simulated mobile network conditions and fourfold CPU slowdown. They do not establish deployed field performance or INP. The previous agent's gzip benchmark recorded 6.0 s LCP; the before/after comparison above uses this review's comparable Brotli runs.

Raw reports and screenshots are stored locally in ignored `web/qa/`: `lighthouse-hosting-mobile-warm-server.json`, `lighthouse-hosting-mobile-confirm.json`, `lighthouse-mobile-static-1.json`, and `lighthouse-mobile-static-2.json`.

## Verification

Verification includes the production build and full release checks, unit tests, browser workflows, Python tests, lint, formatting, and project structure/documentation checks. Browser coverage includes:

- Real first-page HTML with JavaScript disabled.
- Explanations while the catalogue download is held back.
- Background catalogue failure and successful retry.
- Shareable links beyond the first page and browser history.
- Exact 103-feature explanations and lazy requests.
- Saved wines and dark-theme persistence through hydration at 320 px.
- Mobile filters, narrow-phone overflow, and light/dark accessibility checks.

The production dependency audit reports zero known vulnerabilities. A build requires only the committed static release and Node dependencies; source CSVs, fitted models, and offline export artifacts are excluded from Git.

## Deployment configuration

Use the existing Git integration with production branch `main`:

| Setting | Value |
| --- | --- |
| Root directory | `web` |
| Framework | Vite |
| Node.js | 22.x or 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None |

`web/vercel.json` already defines the framework, build, output, and cache headers. Static pre-rendering happens during the build. Hashed assets use long-lived immutable caching; the release manifest revalidates. Wine URLs use query parameters and need no catch-all rewrite. No external drive, Python environment, database, model upload, or paid backend service is necessary. Vercel account/project configuration was left to the user.
