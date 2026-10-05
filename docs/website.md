# Website direction: browse the model's test wines

The live site is [Decoding the Bottle](https://decodingthebottle.ekat.world/), a project for the **Data Science, Learning and Applications (DALAS)** course.

The chosen direction is a **wine catalogue with individual model explanations**. The report tells the research story. The website adds something the PDF cannot: choose a wine, compare its actual and predicted rating, and inspect the factors behind that prediction.

## Production data

The [React/Vite frontend](../web/README.md) uses the complete **9,329-wine held-out set** from a newly retrained CatBoost raw-rating regressor. The recovered prepared table contains 50,141 rows; the historical eligibility filters leave 46,644. A country-stratified 80/20 split with seed 42 yields 37,315 training rows and 9,329 test rows. Every held-out prediction has all 103 native CatBoost SHAP contributions.

The new model achieves test **MAE 0.162445 stars, RMSE 0.243121, and R² 0.553889**. These are new-run results, separate from the historical scores preserved in the report and results summary.

The recovered table lacks the later `food_filt` column, so this run uses its existing food labels. Some inputs were imputed before the recovered table was saved; the scope of that historical fitting cannot be verified. Newly fitted multi-label vocabularies use only training rows. This row split does not evaluate generalization to entirely unseen wineries or wine families. See [data preparation and provenance](web-data.md) for the exact choices.

## Browser experience

The explorer supports searchable, filterable browsing; saved wines; grid/list layouts; actual and predicted ratings; signed prediction errors; SHAP waterfalls and exact tables; theme-level influence; feature-context plots; and an interactive actual-versus-predicted scatter plot. Wine URLs can be shared and reopened. The interface retains the approved beige, black, and burgundy palette, with an optional dark theme.

The full catalogue supports searching and filtering all test wines. Production builds render the first 12 real wines into static HTML and hydrate the interface in the browser; the full catalogue downloads in the background before enabling full search and filtering. Individual explanations load on demand in small batches, and feature-context data loads only when requested. Chart samples are explicitly labeled; the catalogue and aggregate metrics cover the entire test set. Versioned assets support long-lived caching, while the release manifest is revalidated. Production builds validate the prepared release and reject missing or inconsistent data.

## Hosting

Vercel serves a static frontend and prepared JSON assets. **No model runs on the server**: training, inference, and SHAP calculation happen offline. A fresh deployment builds using the prepared release under `web/public/release`, without Python, the source CSV, the fitted model, or the external drive. See [the website README](../web/README.md) for deployment settings and release regeneration.

The local demonstration collection remains available for development and tests; production uses the genuine held-out release. See the [mobile performance review](web-performance.md) for verification and deployment details.

## Is it worth it?

Yes, for demonstrating model interpretation and software work. Browsing a familiar product catalogue makes prediction errors and feature contributions concrete, adding portfolio value beyond reproducing report pages and charts.

This is a research explorer. Public ratings describe perception and may reflect popularity, price, selection bias, and other confounders. SHAP explains what the fitted model used; it does not identify causal effects. Live inference and personalized recommendations remain outside the current scope.
