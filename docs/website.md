# Is a website worth building?

**Yes, as a focused interactive research showcase.** The project has an interesting question, a real collection effort, thoughtful handling of missingness, a model comparison, and useful explanations. A website would make that work accessible to someone who will not read a 30-page report or run notebooks.

A general wine recommendation service would require considerably more work. The historical model predicts public ratings, the price-relative task reaches about 67% accuracy, and several model inputs are difficult for a visitor to supply. Data and fitted artifacts also need recovery before any real inference.

## Options

| Direction | Visitor experience | Prerequisites | Assessment |
| --- | --- | --- | --- |
| Interactive project story | Explore the question, collection, missingness, models, price effects, and report | Existing report, historical charts, results JSON | Best first release; useful for a portfolio |
| Selected-wine explanation explorer | Pick an example and see its observed rating, prediction, and contributing features | Recover data/model; export verified examples with SHAP and metadata | Strong next step; no inference server needed |
| Live rating / price-relative predictor | Enter wine characteristics and receive a fresh prediction | Reproducible preprocessing and model, validation, input design, deployment checks | A later experiment; more maintenance and uncertain consumer value |
| Personalized recommendations | Find bottles matched to a visitor’s taste and available budget | Preference/interaction data and current catalog/availability | Outside what the existing experiments establish |

## Recommended first release: “Decoding the Bottle”

Build a small interactive site around the project’s actual findings:

1. **The question:** does a higher price correspond to a higher public rating? Explain the observed association and the limits on causal conclusions.
2. **From websites to data:** show the two sources, parent/vintage structure, missingness, and imputation decisions.
3. **What worked best:** compare the tested models, explain MAE in stars, and show held-out results for both tasks.
4. **What shaped predictions:** explore price, vintage, geography, and taste using verified historical figures. Pair each chart with a short interpretation and a limitation.
5. **Above average for the price:** explain the adjusted-rating target, including why it is different from predicted stars or a personalized recommendation.
6. **Methodology and credits:** link the full report, code, authors, sources, and reproduction status.

Existing results support a story with chart switching, annotations, and metric explanations. Dataset filters and individual-wine explanations should be added only after their underlying records have been recovered and exported. Do not invent interactive observations from chart screenshots or generate plausible-looking predictions from summary metrics.

## Hosting and implementation

A static React/Vite site with chart components and small checked JSON exports would be sufficient for the first version. Keep the frontend in a future `web/` directory and give Vercel that directory as its project root. Vercel supports deployment of Vite projects; see the [official Vite deployment guide](https://vite.dev/guide/static-deploy#vercel).

Training, imputation fitting, and SHAP computation can happen offline. The browser can display published summaries and selected example explanations without running Python. This is a proposed architecture; no website has been scaffolded or deployed in this reorganization.

Vercel also supports Python functions, so live inference is possible in principle. Its [Python runtime guide](https://vercel.com/docs/functions/runtimes/python) and [function limits](https://vercel.com/docs/functions/limitations) would need review against the actual exported model, package sizes, and latency. Keep only inference dependencies in a deployment. Whether a function or a separate inference service is appropriate should be measured after the model is recovered.

## What an example explorer needs

Export a small set of real held-out examples containing:

- A stable example ID, provenance, public-safe display information, and the observed input features.
- Observed mean rating and predicted stars for the rating model.
- Observed and predicted adjusted rating for the price-relative model, with its zero-threshold class label.
- SHAP base value and feature contributions for the correct model, plus aggregation rules for food/grape indicators.
- Training-derived bin metadata and a clear statement that the adjusted model is not a calibrated probability.
- Model/data version and the evaluation method used to produce the example.

Confirm that SHAP contributions sum to the prediction in the relevant output units. Label observed, imputed, and unavailable inputs. Use historical prices as historical prices; do not imply that an old catalog is current shopping advice.

## Decision

The worthwhile scope is a polished project story, optionally followed by a handful of verified wine explanations. It gives the course work a public identity and makes both the results and your reasoning visible.

A live predictor becomes worth considering if your goal is to practice model deployment and product development, and you can recover the data. It is harder to justify as a useful consumer service with the evidence currently available. Start with the showcase and treat live predictions as a separately validated extension.
