import { ArrowUpRight, Info } from "@phosphor-icons/react";
import { WINE_TYPES, money } from "../data/types";
import type { Collection, Filters } from "../data/types";
export function CollectionFilters({
  collection,
  filters,
  countries,
  maxPrice,
  mobileFilters,
  updateFilter,
  reset,
  onHelp,
}: {
  collection: Collection;
  filters: Filters;
  countries: string[];
  maxPrice: number;
  mobileFilters: boolean;
  updateFilter: (patch: Partial<Filters>) => void;
  reset: () => void;
  onHelp: () => void;
}) {
  return (
    <>
      <div className="filters-heading">
        <h2>Filters</h2>
        <button className="text-button" onClick={reset}>
          Reset all
        </button>
      </div>
      <fieldset>
        <legend>Wine style</legend>
        {WINE_TYPES.map((type) => (
          <label className="check-row" key={type}>
            <input
              type="checkbox"
              checked={filters.types.includes(type)}
              onChange={() =>
                updateFilter({
                  types: filters.types.includes(type)
                    ? filters.types.filter((t) => t !== type)
                    : [...filters.types, type],
                })
              }
            />
            <span className={`wine-color color-${type.toLowerCase()}`} />
            <span>{type}</span>
            <span className="filter-count">
              {collection.wines.filter((w) => w.type === type).length}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="filter-field">
        Country
        <select
          value={filters.country}
          onChange={(e) => updateFilter({ country: e.target.value })}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="price-filter">
        <label htmlFor={mobileFilters ? "mobile-price" : "price"}>
          Price per bottle{" "}
          <strong>
            {filters.maxPrice >= maxPrice
              ? "Any price"
              : `Up to ${money(filters.maxPrice)}`}
          </strong>
        </label>
        <input
          id={mobileFilters ? "mobile-price" : "price"}
          type="range"
          min="0"
          max="1000"
          step="1"
          value={Math.round(
            (Math.log1p(filters.maxPrice) / Math.log1p(maxPrice)) * 1000,
          )}
          aria-valuetext={
            filters.maxPrice >= maxPrice
              ? "Any price"
              : `Up to ${money(filters.maxPrice)}`
          }
          onChange={(e) =>
            updateFilter({
              maxPrice:
                Number(e.target.value) === 1000
                  ? maxPrice
                  : Math.round(
                      100 *
                        Math.expm1(
                          (Math.log1p(maxPrice) * Number(e.target.value)) /
                            1000,
                        ),
                    ) / 100,
            })
          }
        />
        <div>
          <span>$0</span>
          <span>{money(maxPrice)}</span>
        </div>
        <p>USD, standardized to 750 ml</p>
      </div>
      <label className="filter-field">
        Prediction difference
        <select
          value={filters.error}
          onChange={(e) => updateFilter({ error: e.target.value })}
        >
          <option value="all">Any difference</option>
          <option value="close">Within 0.20 stars</option>
          <option value="far">More than 0.20 stars</option>
        </select>
      </label>
      <aside className="filter-note">
        <Info size={19} />
        <h3>A rating is a perception.</h3>
        <p>
          These predictions describe public ratings, not an objective measure of
          wine quality.
        </p>
        <button className="text-button" onClick={onHelp}>
          How to read the results <ArrowUpRight size={14} />
        </button>
      </aside>
    </>
  );
}
