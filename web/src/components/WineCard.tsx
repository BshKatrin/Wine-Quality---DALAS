import { ArrowUpRight, BookmarkSimple } from "@phosphor-icons/react";
import { money, displayLabel } from "../data/types";
import type { Wine } from "../data/types";
import { Bottle } from "./Bottle";
export function WineCard({
  wine: w,
  saved,
  onSave,
  onOpen,
}: {
  wine: Wine;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="wine-card">
      <button
        className={`bookmark-button ${saved ? "saved" : ""}`}
        aria-label={`${saved ? "Unsave" : "Save"} ${w.name}`}
        aria-pressed={saved}
        onClick={onSave}
      >
        <BookmarkSimple size={20} weight={saved ? "fill" : "regular"} />
      </button>
      <button className="wine-card-open" onClick={onOpen}>
        <span className="sr-only">Explore </span>
        <div className={`bottle-scene scene-${w.type.toLowerCase()}`}>
          <Bottle type={w.type} />
        </div>
        <div className="wine-card-content">
          <div className="card-meta">
            <span className={`wine-color color-${w.type.toLowerCase()}`} />
            {w.type}
            <span className="meta-divider" />
            {w.country}
          </div>
          <h2>{w.name}</h2>
          <p className="card-producer">
            {displayLabel(w.producer)} · {w.year ?? "NV"}
          </p>
          <div className="card-price">
            <span>{money(w.priceUsd)}</span>
            <small>{displayLabel(w.grapes[0] ?? "")}</small>
          </div>
          <div className="card-ratings">
            <div>
              <span>Predicted</span>
              <strong>{w.predictedRating.toFixed(2)}</strong>
            </div>
            <div>
              <span>Actual</span>
              <strong>{w.actualRating.toFixed(2)}</strong>
            </div>
            <span className="card-explore">
              <ArrowUpRight size={21} />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
