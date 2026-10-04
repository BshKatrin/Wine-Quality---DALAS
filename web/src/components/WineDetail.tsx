import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Check,
  Info,
  X,
} from "@phosphor-icons/react";
import type { Collection, Wine } from "../data/types";
import type { ContextPoint } from "../data/release";
import { money, signed, displayLabel } from "../data/types";
import { Bottle } from "./Bottle";
import {
  FeatureContext,
  InfluenceGroups,
  RatingScatter,
  Waterfall,
} from "./Charts";

export function WineDetail({
  wine,
  collection,
  saved,
  onSave,
  onClose,
  onSelect,
  adjacent,
  plotWines,
  loadContext,
}: {
  wine: Wine;
  collection: Collection;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onSelect: (wine: Wine) => void;
  adjacent: (direction: number) => void;
  plotWines: Wine[];
  loadContext: (feature: string) => Promise<ContextPoint[]>;
}) {
  const [tab, setTab] = useState("breakdown");
  const error = wine.predictedRating - wine.actualRating;
  const strongest = [...wine.shap].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  )[0];
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="wine-dialog"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="detail-toolbar">
            <span>
              Collection <span className="muted">/ {wine.type} wine</span>
            </span>
            <div className="toolbar-actions">
              <button
                className="icon-button"
                onClick={() => adjacent(-1)}
                aria-label="Previous wine"
              >
                <ArrowLeft size={19} />
              </button>
              <button
                className="icon-button"
                onClick={() => adjacent(1)}
                aria-label="Next wine"
              >
                <ArrowRight size={19} />
              </button>
              <Dialog.Close
                className="icon-button close-button"
                aria-label="Close wine details"
              >
                <X size={21} />
              </Dialog.Close>
            </div>
          </div>
          <div className="detail-scroll">
            <div className="detail-layout">
              <aside className="wine-identity">
                <div
                  className={`detail-bottle-scene scene-${wine.type.toLowerCase()}`}
                >
                  <Bottle type={wine.type} />
                  <span>Illustrative bottle</span>
                </div>
                <div className="wine-origin">
                  {wine.region}, {wine.country}
                </div>
                <Dialog.Title className="detail-title">
                  {wine.name}
                </Dialog.Title>
                <Dialog.Description className="producer">
                  {displayLabel(wine.producer)} · {wine.year ?? "Non-vintage"}
                </Dialog.Description>
                <div className="detail-price">
                  {money(wine.priceUsd)}
                  <span>USD / 750 ml</span>
                </div>
                <button
                  className={`button save-wine ${saved ? "is-saved" : ""}`}
                  onClick={onSave}
                >
                  {saved ? <Check size={18} /> : <BookmarkSimple size={18} />}
                  {saved ? "Saved to your collection" : "Save wine"}
                </button>
                <dl className="wine-facts">
                  <div>
                    <dt>Style</dt>
                    <dd>{wine.type}</dd>
                  </div>
                  <div>
                    <dt>Grapes</dt>
                    <dd>
                      {wine.grapes.map(displayLabel).join(", ") ||
                        "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt>Alcohol</dt>
                    <dd>
                      {wine.alcohol === null
                        ? "Not available"
                        : `${wine.alcohol}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Vintage</dt>
                    <dd>{wine.year ?? "Non-vintage"}</dd>
                  </div>
                </dl>
                <div className="detail-provenance">
                  <Info size={17} />
                  <p>
                    {collection.source === "demo"
                      ? "Demonstration wine. Its ratings and contributions are simulated for this interface."
                      : `Held-out test wine. Predictions and SHAP values supplied by ${collection.modelName}.`}
                  </p>
                </div>
              </aside>
              <div className="wine-analysis">
                <div className="analysis-heading">
                  <span className="eyebrow">Behind the rating</span>
                  <h2>A prediction, explained.</h2>
                  <p>
                    See what raised or lowered this wine’s predicted rating.
                  </p>
                </div>
                <div className="rating-panel">
                  <div>
                    <span className="rating-label">
                      <span className="prediction-key" />
                      Predicted rating
                    </span>
                    <strong>
                      {wine.predictedRating.toFixed(2)}
                      <small>/ 5</small>
                    </strong>
                    <span>
                      {collection.source === "demo"
                        ? "Simulated model output"
                        : "Precomputed model prediction"}
                    </span>
                  </div>
                  <div>
                    <span className="rating-label">
                      <span className="actual-key" />
                      Actual rating
                    </span>
                    <strong>
                      {wine.actualRating.toFixed(2)}
                      <small>/ 5</small>
                    </strong>
                    <span>
                      {collection.source === "demo"
                        ? "Simulated public rating"
                        : "Mean public rating"}
                    </span>
                  </div>
                  <div className="error-summary">
                    <span>Prediction difference</span>
                    <strong>{signed(error)}</strong>
                    <span>
                      {Math.abs(error) < 0.0005
                        ? "An exact match"
                        : `${Math.abs(error).toFixed(2)} stars ${error > 0 ? "above" : "below"} the actual rating`}
                    </span>
                  </div>
                </div>
                <div
                  className="detail-tabs"
                  role="tablist"
                  aria-label="Wine analysis"
                  onKeyDown={(e) => {
                    const tabs = ["breakdown", "context", "comparison"];
                    let next = tabs.indexOf(tab);
                    if (e.key === "ArrowRight") next = (next + 1) % tabs.length;
                    else if (e.key === "ArrowLeft")
                      next = (next + tabs.length - 1) % tabs.length;
                    else if (e.key === "Home") next = 0;
                    else if (e.key === "End") next = tabs.length - 1;
                    else return;
                    e.preventDefault();
                    setTab(tabs[next]);
                    document.getElementById(`tab-${tabs[next]}`)?.focus();
                  }}
                >
                  <button
                    role="tab"
                    aria-selected={tab === "breakdown"}
                    aria-controls="analysis-panel"
                    id="tab-breakdown"
                    tabIndex={tab === "breakdown" ? 0 : -1}
                    onClick={() => setTab("breakdown")}
                  >
                    SHAP breakdown
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "context"}
                    aria-controls="analysis-panel"
                    id="tab-context"
                    tabIndex={tab === "context" ? 0 : -1}
                    onClick={() => setTab("context")}
                  >
                    Feature context
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "comparison"}
                    aria-controls="analysis-panel"
                    id="tab-comparison"
                    tabIndex={tab === "comparison" ? 0 : -1}
                    onClick={() => setTab("comparison")}
                  >
                    Rating comparison
                  </button>
                </div>
                <div
                  id="analysis-panel"
                  role="tabpanel"
                  aria-labelledby={`tab-${tab}`}
                >
                  {tab === "breakdown" && (
                    <>
                      <section className="chart-section">
                        <div className="chart-heading">
                          <div>
                            <h3>From baseline to this bottle</h3>
                            <p>
                              Each feature shifts the model’s starting
                              prediction, measured in stars.
                            </p>
                          </div>
                          <div className="chart-legend">
                            <span>
                              <i className="positive-swatch" />
                              Raises
                            </span>
                            <span>
                              <i className="negative-swatch" />
                              Lowers
                            </span>
                          </div>
                        </div>
                        <Waterfall wine={wine} />
                      </section>
                      <div className="explanation-bottom">
                        <section>
                          <h3>Influence by theme</h3>
                          <InfluenceGroups wine={wine} />
                        </section>
                        <aside className="insight">
                          <Info size={21} />
                          <h3>The strongest signal</h3>
                          <p>
                            <strong>{strongest.feature}</strong> shifts this
                            prediction by{" "}
                            <strong>
                              {signed(strongest.contribution, 3)} stars
                            </strong>{" "}
                            from the model’s baseline.
                          </p>
                          <p>
                            SHAP explains this model’s prediction. It does not
                            establish that changing a feature would change a
                            wine’s quality.
                          </p>
                        </aside>
                      </div>
                    </>
                  )}
                  {tab === "context" && (
                    <section className="chart-section">
                      <h3>How this feature behaves across wines</h3>
                      <p>
                        Compare a feature’s value with its contribution to the
                        model’s prediction.
                      </p>
                      <FeatureContext
                        key={wine.id}
                        wine={wine}
                        loadPoints={loadContext}
                      />
                    </section>
                  )}
                  {tab === "comparison" && (
                    <section className="chart-section">
                      <h3>This wine in the collection</h3>
                      <p>
                        Wines closer to the diagonal have smaller prediction
                        errors.
                      </p>
                      <RatingScatter
                        wines={
                          plotWines.some((point) => point.id === wine.id)
                            ? plotWines
                            : [...plotWines, wine]
                        }
                        totalCount={collection.wines.length}
                        selected={wine.id}
                        onSelect={onSelect}
                      />
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
