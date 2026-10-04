import { useEffect, useState, useSyncExternalStore } from "react";
import type { ContextPoint } from "../data/release";
import type { Wine } from "../data/types";
import { signed } from "../data/types";

// Subscribe to a breakpoint, not continuous resize or scroll values.
const subscribeCompactChart = (callback: () => void) => {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const compactSnapshot = () => window.matchMedia("(max-width: 767px)").matches;

export function Waterfall({ wine }: { wine: Wine }) {
  const compact = useSyncExternalStore(
    subscribeCompactChart,
    compactSnapshot,
    () => false,
  );
  const sorted = [...wine.shap].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  const rows =
    sorted.length <= 8
      ? sorted
      : [
          ...sorted.slice(0, 7),
          {
            feature: "Other features",
            value: `${sorted.length - 7} combined`,
            contribution: sorted
              .slice(7)
              .reduce((sum, row) => sum + row.contribution, 0),
            group: "Other",
          },
        ];
  const steps = rows.map((row, i) => {
    const start =
      wine.baseValue +
      rows
        .slice(0, i)
        .reduce((sum, previous) => sum + previous.contribution, 0);
    return { ...row, start, end: start + row.contribution };
  });
  const endpoints = [wine.baseValue, ...steps.map((s) => s.end)];
  const low = Math.floor((Math.min(...endpoints) - 0.08) * 10) / 10;
  const high = Math.ceil((Math.max(...endpoints) + 0.08) * 10) / 10;
  const x = (n: number) =>
    (compact ? 20 : 198) + ((n - low) / (high - low)) * (compact ? 310 : 380);
  const height = compact ? 128 + steps.length * 50 : 112 + steps.length * 39;
  const width = compact ? 350 : 650;
  const lastX = width - 12;
  const baselineY = compact ? 40 : 23;
  const finalPointY = height - (compact ? 34 : 50);
  return (
    <>
      <div className="chart-scroll">
        <svg
          className={`waterfall ${compact ? "waterfall-compact" : ""}`}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`SHAP waterfall: starts at ${wine.baseValue.toFixed(3)}, ends at predicted rating ${wine.predictedRating.toFixed(3)}. Feature values are available in the table below.`}
        >
          {[0, 1, 2, 3, 4].map((t) => {
            const v = low + ((high - low) * t) / 4;
            return (
              <g key={t}>
                <line
                  x1={x(v)}
                  x2={x(v)}
                  y1={compact ? 32 : 14}
                  y2={height - (compact ? 25 : 35)}
                  className="grid-line"
                />
                <text
                  x={x(v)}
                  y={height - (compact ? 8 : 12)}
                  textAnchor="middle"
                  className="axis-text"
                >
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
          <text x="0" y={compact ? 18 : 27} className="chart-label">
            Baseline prediction
          </text>
          <circle
            cx={x(wine.baseValue)}
            cy={baselineY}
            r="4"
            className="baseline-point"
          />
          <text
            x={compact ? lastX : x(wine.baseValue) + 10}
            y={compact ? 18 : 27}
            textAnchor={compact ? "end" : "start"}
            className="chart-value"
          >
            {wine.baseValue.toFixed(3)}
          </text>
          {steps.map((s, i) => {
            const y = compact ? 68 + i * 50 : 51 + i * 39;
            const barY = y + (compact ? 19 : 0);
            return (
              <g key={s.feature}>
                <text x="0" y={y + 8} className="chart-label">
                  {compact
                    ? `${s.feature.slice(0, 19)} · ${String(s.value).slice(0, 18)}`
                    : s.feature.slice(0, 24)}
                </text>
                {!compact && (
                  <text x="0" y={y + 24} className="chart-feature-value">
                    {String(s.value).slice(0, 28)}
                  </text>
                )}
                <line
                  x1={x(s.start)}
                  x2={x(s.start)}
                  y1={i ? y - (compact ? 14 : 20) : baselineY}
                  y2={barY + (compact ? 8 : 12)}
                  className="connector"
                />
                <rect
                  x={Math.min(x(s.start), x(s.end))}
                  y={barY}
                  width={Math.max(2, Math.abs(x(s.end) - x(s.start)))}
                  height={compact ? 17 : 23}
                  rx="3"
                  className={
                    s.contribution >= 0 ? "positive-fill" : "negative-fill"
                  }
                >
                  <title>
                    {s.feature}: {signed(s.contribution, 3)} stars
                  </title>
                </rect>
                <text
                  x={lastX}
                  y={y + (compact ? 8 : 17)}
                  textAnchor="end"
                  className={`chart-value ${s.contribution >= 0 ? "positive-text" : "negative-text"}`}
                >
                  {signed(s.contribution, 3)}
                </text>
              </g>
            );
          })}
          <text
            x="0"
            y={height - (compact ? 55 : 46)}
            className="chart-label strong"
          >
            Predicted rating
          </text>
          <circle
            cx={x(wine.predictedRating)}
            cy={finalPointY}
            r="5"
            className="prediction-point"
          />
          <text
            x={lastX}
            y={height - (compact ? 55 : 46)}
            textAnchor="end"
            className="chart-value strong"
          >
            {wine.predictedRating.toFixed(3)}
          </text>
        </svg>
      </div>
      <details className="data-table">
        <summary>View exact feature contributions</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Model input</th>
                <th>SHAP (stars)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.feature}>
                  <th scope="row">{s.feature}</th>
                  <td>
                    {s.value}
                    {s.imputed && (
                      <span className="imputed-label">Imputed</span>
                    )}
                  </td>
                  <td>{signed(s.contribution, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function InfluenceGroups({ wine }: { wine: Wine }) {
  const groups: Record<string, number> = Object.create(null);
  wine.shap.forEach((s) => {
    groups[s.group] = (groups[s.group] ?? 0) + Math.abs(s.contribution);
  });
  const total = Object.values(groups).reduce((s, n) => s + n, 0);
  return (
    <div className="group-chart">
      {Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .map(([group, value]) => (
          <div className="group-row" key={group}>
            <div>
              <span>{group}</span>
              <strong>{total ? Math.round((value / total) * 100) : 0}%</strong>
            </div>
            <div
              className="group-bar"
              style={{ width: `${total ? (value / total) * 100 : 0}%` }}
            />
          </div>
        ))}
      <p className="fine-print">
        Share of total absolute SHAP influence. This chart shows magnitude, not
        direction.
      </p>
    </div>
  );
}
export function RatingScatter({
  wines,
  selected,
  onSelect,
  totalCount,
}: {
  wines: Wine[];
  totalCount?: number;
  selected?: string;
  onSelect: (wine: Wine) => void;
}) {
  const [hover, setHover] = useState<Wine | null>(null);
  const stride = Math.max(1, Math.ceil(wines.length / 400));
  const points = totalCount
    ? wines
    : wines.filter((w, i) => i % stride === 0 || w.id === selected);
  const minimum = Math.min(
    2.5,
    ...wines.map((w) => Math.min(w.actualRating, w.predictedRating)),
  );
  const maximum = Math.max(
    4.8,
    ...wines.map((w) => Math.max(w.actualRating, w.predictedRating)),
  );
  const lo = Math.floor((minimum - 0.1) * 2) / 2,
    hi = Math.ceil((maximum + 0.1) * 2) / 2;
  const x = (v: number) => 60 + ((v - lo) / (hi - lo)) * 520;
  const y = (v: number) => 290 - ((v - lo) / (hi - lo)) * 250;
  return (
    <div className="scatter-wrap">
      <svg
        viewBox="0 0 630 345"
        role="group"
        aria-label="Observed versus predicted ratings. Select a point to inspect its wine."
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = lo + ((hi - lo) * i) / 4;
          return (
            <g key={i}>
              <line
                x1="60"
                x2="580"
                y1={y(v)}
                y2={y(v)}
                className="grid-line"
              />
              <text x="46" y={y(v) + 4} textAnchor="end" className="axis-text">
                {v.toFixed(1)}
              </text>
              <text x={x(v)} y="313" textAnchor="middle" className="axis-text">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <line
          x1={x(lo)}
          y1={y(lo)}
          x2={x(hi)}
          y2={y(hi)}
          className="perfect-line"
        />
        <text x="320" y="341" textAnchor="middle" className="axis-text">
          Actual rating
        </text>
        <text
          transform="translate(17 168) rotate(-90)"
          textAnchor="middle"
          className="axis-text"
        >
          Predicted rating
        </text>
        {points.map((w) => (
          <circle
            key={w.id}
            cx={x(w.actualRating)}
            cy={y(w.predictedRating)}
            r={w.id === selected || hover?.id === w.id ? 8 : 5}
            className={`scatter-dot ${w.id === selected ? "selected" : ""}`}
            tabIndex={0}
            role="button"
            aria-label={`${w.name}: actual ${w.actualRating.toFixed(2)}, predicted ${w.predictedRating.toFixed(2)}`}
            onMouseEnter={() => setHover(w)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(w)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect(w)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(w);
              }
            }}
          >
            <title>{w.name}</title>
          </circle>
        ))}
      </svg>
      <div className="scatter-caption" aria-live="polite">
        {hover ? (
          <>
            <strong>{hover.name}</strong>
            <span>
              Actual {hover.actualRating.toFixed(2)} · Predicted{" "}
              {hover.predictedRating.toFixed(2)}
            </span>
          </>
        ) : (
          <>
            <span>The dotted line marks a perfect prediction.</span>
            <span>
              {points.length < (totalCount ?? wines.length)
                ? `${points.length} sampled from ${(totalCount ?? wines.length).toLocaleString()} wines`
                : `${wines.length} wines`}{" "}
              · Select a point to explore
            </span>
          </>
        )}
      </div>
    </div>
  );
}
export function FeatureContext({
  wine,
  loadPoints,
}: {
  wine: Wine;
  loadPoints: (feature: string) => Promise<ContextPoint[]>;
}) {
  const options = wine.shap
    .filter((s) => typeof s.value === "number")
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const [feature, setFeature] = useState(options[0]?.feature ?? "");
  const [hovered, setHovered] = useState<string | null>(null);
  const [points, setPoints] = useState<ContextPoint[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!feature) return;
    let active = true;
    // This effect starts an external data request; loading describes that request.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setError("");
    void loadPoints(feature)
      .then((result) => {
        if (active) setPoints(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setPoints([]);
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load this comparison.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [feature, loadPoints, attempt]);
  if (!options.length)
    return <p>No numeric features are available for a dependence plot.</p>;
  if (loading) return <p role="status">Loading feature comparison…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button className="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  if (!points.length) return <p>No comparison values are available.</p>;
  const selected = wine.shap.find((item) => item.feature === feature);
  const plotPoints =
    selected &&
    typeof selected.value === "number" &&
    !points.some((point) => point.id === wine.id)
      ? [
          ...points,
          {
            id: wine.id,
            name: wine.name,
            x: selected.value,
            y: selected.contribution,
          },
        ]
      : points;
  const minimum = Math.min(...plotPoints.map((p) => p.x)),
    maximum = Math.max(...plotPoints.map((p) => p.x));
  const padding =
    minimum === maximum
      ? Math.max(1, Math.abs(minimum) * 0.05)
      : (maximum - minimum) * 0.05;
  const lo = minimum - padding,
    hi = maximum + padding;
  const maxY = Math.max(0.05, ...plotPoints.map((p) => Math.abs(p.y))) * 1.15;
  const x = (v: number) => 70 + ((v - lo) / (hi - lo || 1)) * 485;
  const y = (v: number) => 162 - (v / maxY) * 110;
  const step = Math.max(1, Math.ceil(plotPoints.length / 400));
  return (
    <div>
      <label className="select-label">
        Feature
        <select value={feature} onChange={(e) => setFeature(e.target.value)}>
          {options.map((o) => (
            <option key={o.feature}>{o.feature}</option>
          ))}
        </select>
      </label>
      <svg
        viewBox="0 0 620 330"
        role="img"
        aria-label={`${feature} value versus its SHAP contribution; the selected wine is highlighted.`}
      >
        {[-1, -0.5, 0, 0.5, 1].map((i) => (
          <g key={i}>
            <line
              x1="70"
              x2="555"
              y1={y(i * maxY)}
              y2={y(i * maxY)}
              className={i === 0 ? "perfect-line" : "grid-line"}
            />
            <text
              x="58"
              y={y(i * maxY) + 4}
              textAnchor="end"
              className="axis-text"
            >
              {signed(i * maxY)}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => {
          const v = lo + ((hi - lo) * i) / 4;
          return (
            <text
              key={i}
              x={x(v)}
              y="298"
              textAnchor="middle"
              className="axis-text"
            >
              {Number(v.toFixed(1))}
            </text>
          );
        })}
        <text x="320" y="324" textAnchor="middle" className="axis-text">
          {feature} value
        </text>
        <text
          transform="translate(17 165) rotate(-90)"
          textAnchor="middle"
          className="axis-text"
        >
          SHAP contribution (stars)
        </text>
        {plotPoints
          .filter((p, i) => i % step === 0 || p.id === wine.id)
          .map((p) => (
            <circle
              key={p.id}
              cx={x(p.x)}
              cy={y(p.y)}
              r={p.id === wine.id ? 8 : 5}
              className={`scatter-dot ${p.id === wine.id ? "selected" : ""}`}
              onMouseEnter={() =>
                setHovered(`${p.name}: ${p.x}, ${signed(p.y, 3)} stars`)
              }
              onMouseLeave={() => setHovered(null)}
            >
              <title>
                {p.name}: {p.x}, {signed(p.y, 3)} stars
              </title>
            </circle>
          ))}
      </svg>
      <p className="fine-print context-caption">
        {hovered ??
          `Each point is a sampled wine from this collection. The outlined point is ${wine.name}. This shows model behavior, not a causal effect.`}
      </p>
    </div>
  );
}
