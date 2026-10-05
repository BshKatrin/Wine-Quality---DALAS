import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal } from "./components/Modal";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  ChartScatter,
  Check,
  DownloadSimple,
  Funnel,
  GridFour,
  Info,
  List,
  MagnifyingGlass,
  Moon,
  SlidersHorizontal,
  Sun,
  UploadSimple,
  Wine as WineIcon,
  X,
} from "@phosphor-icons/react";
import { demoCollection } from "./data/demo";
import {
  collectionMetrics,
  downloadJson,
  filterWines,
  parseCollection,
} from "./data/collection";
import { money, signed } from "./data/types";
import type { Collection, Filters, SortKey, Wine } from "./data/types";
import { WineCard } from "./components/WineCard";
import { CollectionFilters } from "./components/CollectionFilters";
import { ReleaseStore } from "./data/release";
const RatingScatter = lazy(() =>
  import("./components/Charts").then((module) => ({
    default: module.RatingScatter,
  })),
);
const WineDetail = lazy(() =>
  import("./components/WineDetail").then((module) => ({
    default: module.WineDetail,
  })),
);
import "./App.css";

function stored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
const savedKey = (collection: Collection) =>
  `bottle-saved:${collection.source}:${collection.name}`;
function readSaved(collection: Collection): string[] {
  const value = stored<unknown>(savedKey(collection), []);
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}
const maxPriceFor = (c: Collection) =>
  Math.max(
    10,
    Math.ceil(Math.max(...c.wines.map((w) => w.priceUsd)) / 10) * 10,
  );
const defaultFilters = (c: Collection): Filters => ({
  query: "",
  types: [],
  country: "",
  maxPrice: maxPriceFor(c),
  error: "all",
  savedOnly: false,
});
const PAGE_SIZE = 12;

const productionRelease = import.meta.env.MODE !== "demo";

function App({
  initialRelease = null,
}: {
  initialRelease?: ReleaseStore | null;
}) {
  const initialCollection = initialRelease?.collection ?? demoCollection;
  const [collection, setCollection] = useState<Collection>(initialCollection);
  const [release, setRelease] = useState<ReleaseStore | null>(initialRelease);
  const [releaseStatus, setReleaseStatus] = useState<
    "loading" | "ready" | "error"
  >(productionRelease && !initialRelease ? "loading" : "ready");
  const [releaseError, setReleaseError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState("");
  const requestNumber = useRef(0);
  const navigationId = useRef<string | null>(null);
  const [filters, setFilters] = useState<Filters>(
    defaultFilters(initialCollection),
  );
  const [sort, setSort] = useState<SortKey>("predicted");
  const [saved, setSaved] = useState<string[]>(() =>
    initialRelease ? [] : readSaved(initialCollection),
  );
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeWine, setActiveWine] = useState<Wine | null>(null);
  const [modal, setModal] = useState<"help" | "import" | null>(null);
  const [section, setSection] = useState<"collection" | "overview">(
    "collection",
  );
  const [mobileFilters, setMobileFilters] = useState(false);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Beige is the default palette; an explicit theme choice still persists.
    if (initialRelease) return "light";
    return stored<string>("bottle-theme", "light") === "dark"
      ? "dark"
      : "light";
  });
  // Hydration starts from the same state as static HTML. Capture browser
  // preferences before persistence effects run, then restore them after mount.
  const initialPreferences = useRef({
    saved: readSaved(initialCollection),
    theme:
      stored<string>("bottle-theme", "light") === "dark"
        ? ("dark" as const)
        : ("light" as const),
  });
  useEffect(() => {
    if (initialRelease) {
      setSaved(initialPreferences.current.saved);
      setTheme(initialPreferences.current.theme);
    }
  }, [initialRelease]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const loadRelease = useCallback(
    async (signal?: AbortSignal) => {
      let hasPreview = Boolean(initialRelease);
      setReleaseError("");
      try {
        const store = await ReleaseStore.open(
          (preview) => {
            if (signal?.aborted) return;
            hasPreview = true;
            setRelease(preview);
            setCollection(preview.collection);
            setFilters(defaultFilters(preview.collection));
            setSaved(readSaved(preview.collection));
            setReleaseStatus("ready");
          },
          signal,
          initialRelease,
        );
        if (signal?.aborted) return;
        setRelease(store);
        setCollection(store.collection);
        setFilters(defaultFilters(store.collection));
        setReleaseStatus("ready");
      } catch (error) {
        if (signal?.aborted) return;
        setReleaseError(
          error instanceof Error
            ? error.message
            : "The collection could not be loaded.",
        );
        // Keep the first wines and their explanations usable if the full
        // catalogue request fails; search remains disabled until retry succeeds.
        setReleaseStatus(hasPreview ? "ready" : "error");
      }
    },
    [initialRelease],
  );
  useEffect(() => {
    // Hydrate the initial catalogue from an external static release.
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect
    if (productionRelease) void loadRelease(controller.signal);
    return () => controller.abort();
  }, [loadRelease]);
  const urlWine = () => new URLSearchParams(window.location.search).get("wine");
  const showWine = useCallback(
    async (id: string | null) => {
      navigationId.current = id;
      const request = ++requestNumber.current;
      setActiveWine(null);
      setOpeningId(id);
      setOpenError("");
      if (!id) return;
      try {
        const wine = release
          ? await release.wine(id)
          : collection.wines.find((w) => w.id === id);
        if (!wine) throw new Error("This wine is not in the collection.");
        if (request === requestNumber.current) {
          setActiveWine(wine);
          setOpeningId(null);
        }
      } catch (error) {
        if (request === requestNumber.current)
          setOpenError(
            error instanceof Error
              ? error.message
              : "The wine could not be opened.",
          );
      }
    },
    [release, collection],
  );
  useEffect(() => {
    if (releaseStatus !== "ready") return;
    // A shared link may point beyond the first page. Wait for the full index
    // before resolving it instead of showing a temporary 'not found' error.
    if (
      release &&
      !release.complete &&
      urlWine() &&
      !collection.wines.some((wine) => wine.id === urlWine())
    )
      return;
    const sync = () => void showWine(urlWine());
    window.addEventListener("popstate", sync);
    // Upgrading the catalogue must not reopen a selected wine or silently
    // retry a failed detail request. History changes still resolve every URL.
    if (urlWine() !== navigationId.current) sync();
    return () => window.removeEventListener("popstate", sync);
  }, [releaseStatus, showWine, release, collection]);
  const cataloguePending = Boolean(release && !release.complete);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("bottle-theme", JSON.stringify(theme));
    } catch {
      /* Session-only theme remains available. */
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(savedKey(collection), JSON.stringify(saved));
    } catch {
      /* Session-only bookmarks remain available. */
    }
  }, [saved, collection]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const countries = useMemo(
    () => [...new Set(collection.wines.map((w) => w.country))].sort(),
    [collection],
  );
  const filtered = useMemo(
    () => filterWines(collection.wines, filters, sort, saved),
    [collection, filters, sort, saved],
  );
  const metrics = useMemo(
    () => release?.metrics ?? collectionMetrics(collection.wines),
    [release, collection],
  );
  const plotWines = release?.plotWines ?? collection.wines;
  const loadContext = useCallback(
    (feature: string) =>
      release
        ? release.context(feature)
        : Promise.resolve(
            collection.wines.flatMap((w) => {
              const item = w.shap.find((s) => s.feature === feature);
              return item && typeof item.value === "number"
                ? [
                    {
                      id: w.id,
                      name: w.name,
                      x: item.value,
                      y: item.contribution,
                    },
                  ]
                : [];
            }),
          ),
    [release, collection],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  );
  const updateFilter = (patch: Partial<Filters>) => {
    setFilters((v) => ({ ...v, ...patch }));
    setPage(1);
  };
  const toggleSave = (id: string) =>
    setSaved((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const navigateWine = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("wine", id);
    else url.searchParams.delete("wine");
    window.history.pushState({}, "", url);
    void showWine(id);
  };
  const openWine = (w: Wine) => {
    if (!activeWine && !openingId)
      returnFocus.current = document.activeElement as HTMLElement;
    navigateWine(w.id);
  };
  const closeWine = () => {
    navigateWine(null);
    requestAnimationFrame(
      () => returnFocus.current?.isConnected && returnFocus.current.focus(),
    );
  };
  const reset = () => {
    setFilters(defaultFilters(collection));
    setPage(1);
  };
  const activeFilterCount =
    filters.types.length +
    Number(!!filters.country) +
    Number(filters.maxPrice < maxPriceFor(collection)) +
    Number(filters.error !== "all");
  const loadCollection = (c: Collection) => {
    setCollection(c);
    setFilters(defaultFilters(c));
    setSaved(readSaved(c));
    setPage(1);
    setActiveWine(null);
    setModal(null);
    setSection("collection");
    setNotice(`Loaded ${c.wines.length.toLocaleString()} wines.`);
    const url = new URL(window.location.href);
    url.searchParams.delete("wine");
    window.history.replaceState({}, "", url);
  };
  async function importFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      if (file.size > 25 * 1024 * 1024)
        throw new Error("Please use a JSON file smaller than 25 MB.");
      loadCollection(parseCollection(JSON.parse(await file.text())));
    } catch (error) {
      setImportError(
        error instanceof SyntaxError
          ? "This file is not valid JSON. Check the export and try again."
          : (error as Error).message,
      );
    } finally {
      setImporting(false);
    }
  }
  const filterContents = (
    <fieldset className="filter-loading-group" disabled={cataloguePending}>
      <CollectionFilters
        collection={collection}
        filters={filters}
        countries={countries}
        maxPrice={maxPriceFor(collection)}
        mobileFilters={mobileFilters}
        updateFilter={updateFilter}
        reset={reset}
        onHelp={() => {
          setMobileFilters(false);
          setModal("help");
        }}
      />
    </fieldset>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to collection
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setSection("collection");
              updateFilter({ savedOnly: false });
            }}
          >
            <span className="brand-icon">
              <WineIcon size={23} weight="light" />
            </span>
            <span>
              Decoding<span className="brand-second">the bottle</span>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <button
              className={section === "collection" ? "active" : ""}
              onClick={() => setSection("collection")}
            >
              Wine collection
            </button>
            <button
              className={section === "overview" ? "active" : ""}
              disabled={cataloguePending}
              onClick={() => setSection("overview")}
            >
              Model overview
            </button>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button theme-button"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {!productionRelease && (
              <button
                className="button import-button"
                onClick={() => {
                  setImportError("");
                  setModal("import");
                }}
              >
                <UploadSimple size={17} />
                <span>Import collection</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="page-shell">
        <section className="intro">
          <div>
            <div className="intro-eyebrow">
              <span className="tiny-rule" />
              Wine ratings & machine learning
            </div>
            <h1>
              {section === "collection" ? (
                <>
                  What’s in a <span>wine rating?</span>
                </>
              ) : (
                <>
                  Where did the model <span>miss the mark?</span>
                </>
              )}
            </h1>
            <p>
              {section === "collection"
                ? "Pick a bottle and see where the model agrees with the people who rated it."
                : "See which ratings the model got close to, and which ones surprised it."}
            </p>
          </div>
          <button className="how-link" onClick={() => setModal("help")}>
            <span className="round-icon">
              <Info size={22} weight="light" />
            </span>
            <span>
              What’s behind
              <br />
              <strong>a prediction?</strong>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </section>
        {releaseStatus !== "ready" ? (
          <div
            className="release-status"
            role={releaseStatus === "error" ? "alert" : "status"}
          >
            <p>
              {releaseStatus === "loading"
                ? "Opening the full test-wine collection…"
                : releaseError}
            </p>
            {releaseStatus === "error" && (
              <button
                className="button primary"
                onClick={() => {
                  setReleaseStatus("loading");
                  void loadRelease();
                }}
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`data-banner ${collection.source === "test" ? "real-data" : ""}`}
            >
              <span className="banner-icon">
                {collection.source === "demo" ? (
                  <Info size={18} />
                ) : (
                  <Check size={18} />
                )}
              </span>
              <p>
                <strong>
                  {collection.source === "demo"
                    ? "You’re exploring a demo collection."
                    : release
                      ? "The held-out wine collection"
                      : collection.name}
                </strong>{" "}
                {collection.source === "demo"
                  ? "These wines, ratings, and SHAP values are illustrative."
                  : `${(release?.manifest.testCount ?? collection.wines.length).toLocaleString()} test wines · ${release ? "CatBoost rating model" : collection.modelName}`}
              </p>
              {!productionRelease && (
                <button
                  className="text-button"
                  onClick={() => {
                    setImportError("");
                    setModal("import");
                  }}
                >
                  {collection.source === "demo"
                    ? "Use your test data"
                    : "Change collection"}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
            {section === "collection" ? (
              <>
                <div className="collection-toolbar">
                  <div className="collection-tabs">
                    <button
                      className={!filters.savedOnly ? "active" : ""}
                      disabled={cataloguePending}
                      onClick={() => updateFilter({ savedOnly: false })}
                    >
                      All wines{" "}
                      <span>
                        {release?.manifest.testCount ?? collection.wines.length}
                      </span>
                    </button>
                    <button
                      className={filters.savedOnly ? "active" : ""}
                      disabled={cataloguePending}
                      onClick={() => updateFilter({ savedOnly: true })}
                    >
                      <BookmarkSimple size={17} />
                      Saved{" "}
                      <span>
                        {
                          collection.wines.filter((w) => saved.includes(w.id))
                            .length
                        }
                      </span>
                    </button>
                  </div>
                  <div className="toolbar-note">
                    {collection.source === "demo"
                      ? "Illustrative bottles & data"
                      : "Held-out test collection"}
                  </div>
                </div>
                <div className="collection-layout">
                  <aside className="desktop-filters">
                    {!mobileFilters && filterContents}
                  </aside>
                  <div className="catalogue" ref={resultsRef}>
                    <div className="catalogue-controls">
                      <div className="search-box">
                        <MagnifyingGlass size={20} />
                        <label className="sr-only" htmlFor="wine-search">
                          Search wines, grapes, or regions
                        </label>
                        <input
                          id="wine-search"
                          type="search"
                          disabled={cataloguePending}
                          aria-describedby="catalogue-progress"
                          placeholder="Search wines, grapes, or regions…"
                          value={filters.query}
                          onChange={(e) =>
                            updateFilter({ query: e.target.value })
                          }
                        />
                      </div>
                      <label className="sort-select">
                        <span className="sr-only">Sort wines</span>
                        <select
                          disabled={cataloguePending}
                          value={sort}
                          onChange={(e) => {
                            setSort(e.target.value as SortKey);
                            setPage(1);
                          }}
                        >
                          <option value="predicted">
                            Highest predicted rating
                          </option>
                          <option value="actual">Highest actual rating</option>
                          <option value="price-low">Price: low to high</option>
                          <option value="price-high">Price: high to low</option>
                          <option value="error-low">Closest predictions</option>
                          <option value="error-high">
                            Largest differences
                          </option>
                          <option value="name">Wine name: A to Z</option>
                        </select>
                      </label>
                    </div>
                    <div className="results-heading">
                      <div>
                        <button
                          className="button mobile-filter-button"
                          disabled={cataloguePending}
                          onClick={() => setMobileFilters(true)}
                        >
                          <SlidersHorizontal size={17} />
                          Filters
                          {activeFilterCount > 0 && ` (${activeFilterCount})`}
                        </button>
                        <p aria-live="polite">
                          <strong>{filtered.length.toLocaleString()}</strong>{" "}
                          {filters.savedOnly ? "saved wines" : "wines"}
                          {filtered.length !== collection.wines.length &&
                            ` of ${collection.wines.length.toLocaleString()}`}
                        </p>
                      </div>
                      <div
                        className="view-toggle"
                        aria-label="Collection layout"
                      >
                        <button
                          className={view === "grid" ? "active" : ""}
                          aria-label="Grid view"
                          aria-pressed={view === "grid"}
                          onClick={() => setView("grid")}
                        >
                          <GridFour size={19} />
                        </button>
                        <button
                          className={view === "list" ? "active" : ""}
                          aria-label="List view"
                          aria-pressed={view === "list"}
                          onClick={() => setView("list")}
                        >
                          <List size={20} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="catalogue-progress"
                      id="catalogue-progress"
                      role={
                        releaseError && cataloguePending ? "alert" : "status"
                      }
                    >
                      {cataloguePending ? (
                        <>
                          <span>
                            {releaseError
                              ? "Full search is unavailable. You can still explore these wines."
                              : "First wines ready. Loading search for the full collection…"}
                          </span>
                          {releaseError && (
                            <button
                              className="text-button"
                              onClick={() => void loadRelease()}
                            >
                              Retry full collection
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="sr-only">Full collection ready.</span>
                      )}
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="filter-chips">
                        {filters.types.map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              updateFilter({
                                types: filters.types.filter((x) => x !== t),
                              })
                            }
                          >
                            {t}
                            <X size={13} />
                            <span className="sr-only">Remove filter</span>
                          </button>
                        ))}
                        {filters.country && (
                          <button onClick={() => updateFilter({ country: "" })}>
                            {filters.country}
                            <X size={13} />
                          </button>
                        )}
                        {filters.maxPrice < maxPriceFor(collection) && (
                          <button
                            onClick={() =>
                              updateFilter({
                                maxPrice: maxPriceFor(collection),
                              })
                            }
                          >
                            Up to {money(filters.maxPrice)}
                            <X size={13} />
                          </button>
                        )}
                        {filters.error !== "all" && (
                          <button
                            onClick={() => updateFilter({ error: "all" })}
                          >
                            {filters.error === "close"
                              ? "Within 0.20 stars"
                              : "Over 0.20 stars"}
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    {visible.length ? (
                      <div
                        className={`wine-grid ${view === "list" ? "list-view" : ""}`}
                      >
                        {visible.map((w) => (
                          <WineCard
                            key={w.id}
                            wine={w}
                            saved={saved.includes(w.id)}
                            onSave={() => toggleSave(w.id)}
                            onOpen={() => openWine(w)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Funnel size={36} weight="light" />
                        <h2>
                          {filters.savedOnly && !saved.length
                            ? "Your collection starts here."
                            : "No wines match just yet."}
                        </h2>
                        <p>
                          {filters.savedOnly && !saved.length
                            ? "Save a bottle while browsing to find it here."
                            : "Try a different search or give your filters a little more room."}
                        </p>
                        <button className="button primary" onClick={reset}>
                          {filters.savedOnly && !saved.length
                            ? "Browse all wines"
                            : "Clear all filters"}
                        </button>
                      </div>
                    )}
                    {filtered.length > 0 && (
                      <div className="pagination">
                        <span>
                          Showing {(visiblePage - 1) * PAGE_SIZE + 1}-
                          {Math.min(visiblePage * PAGE_SIZE, filtered.length)}{" "}
                          of {filtered.length}
                        </span>
                        <div>
                          <button
                            className="icon-button"
                            aria-label="Previous page"
                            disabled={visiblePage === 1}
                            onClick={() => {
                              setPage(visiblePage - 1);
                              resultsRef.current?.scrollIntoView({
                                block: "start",
                              });
                            }}
                          >
                            <CaretLeft size={18} />
                          </button>
                          <span>
                            Page {visiblePage} of {pageCount}
                          </span>
                          <button
                            className="icon-button"
                            aria-label="Next page"
                            disabled={
                              cataloguePending || visiblePage === pageCount
                            }
                            onClick={() => {
                              setPage(visiblePage + 1);
                              resultsRef.current?.scrollIntoView({
                                block: "start",
                              });
                            }}
                          >
                            <CaretRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="overview">
                <div className="overview-stats">
                  <div>
                    <span>Wines in this collection</span>
                    <strong>{collection.wines.length.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Mean absolute error</span>
                    <strong>
                      {metrics.mae.toFixed(3)}
                      <small>stars</small>
                    </strong>
                  </div>
                  <div>
                    <span>Within 0.20 stars</span>
                    <strong>
                      {(metrics.within * 100).toFixed(1)}
                      <small>%</small>
                    </strong>
                  </div>
                  <div>
                    <span>Average prediction bias</span>
                    <strong>
                      {signed(metrics.bias, 3)}
                      <small>stars</small>
                    </strong>
                  </div>
                </div>
                <div className="overview-grid">
                  <section className="overview-chart">
                    <div className="chart-heading">
                      <div>
                        <h2>How close did the model get?</h2>
                        <p>
                          Select any wine to explore its individual explanation.
                        </p>
                      </div>
                      <ChartScatter size={25} />
                    </div>
                    <Suspense fallback={<p>Loading chart…</p>}>
                      <RatingScatter
                        wines={plotWines}
                        totalCount={collection.wines.length}
                        onSelect={openWine}
                      />
                    </Suspense>
                  </section>
                  <aside className="overview-note">
                    <span className="eyebrow">Reading the plot</span>
                    <h2>
                      Every point
                      <br />
                      is a bottle.
                    </h2>
                    <p>
                      Points above the diagonal are rated higher by the model
                      than by the public. Points below it are rated lower.
                    </p>
                    <div className="mini-equation">
                      <ArrowUpRight size={20} />
                      <span>
                        Above the line
                        <br />
                        <strong>Model overestimates</strong>
                      </span>
                    </div>
                    <div className="mini-equation">
                      <ArrowDown size={20} />
                      <span>
                        Below the line
                        <br />
                        <strong>Model underestimates</strong>
                      </span>
                    </div>
                    <p className="fine-print">
                      {collection.source === "demo"
                        ? "All metrics on this page are calculated from the illustrative collection, not from the original course experiment."
                        : "Metrics summarize every held-out wine in this collection."}
                    </p>
                  </aside>
                </div>
              </div>
            )}
          </>
        )}
        <footer className="site-footer">
          <span>
            Decoding the bottle <span className="footer-divider">/</span> DALAS:
            Data Science, Learning and Applications
          </span>
          <span>Ekaterina Bogush & Amélie Chu</span>
          <button className="text-button" onClick={() => setModal("help")}>
            Understanding the model
            <ArrowUpRight size={14} />
          </button>
        </footer>
      </main>
      {activeWine && (
        <Suspense fallback={<p role="status">Opening wine analysis…</p>}>
          <WineDetail
            wine={activeWine}
            collection={collection}
            plotWines={plotWines}
            loadContext={loadContext}
            saved={saved.includes(activeWine.id)}
            onSave={() => toggleSave(activeWine.id)}
            onClose={closeWine}
            onSelect={openWine}
            adjacent={(direction) => {
              const list =
                filtered.length && filtered.some((w) => w.id === activeWine.id)
                  ? filtered
                  : collection.wines;
              const i = list.findIndex((w) => w.id === activeWine.id);
              openWine(list[(i + direction + list.length) % list.length]);
            }}
          />
        </Suspense>
      )}
      <Modal
        open={modal === "help"}
        onClose={() => setModal(null)}
        title="How to read the ratings"
        description="What the model predicts and how to read its explanations."
      >
        <div className="help-content">
          <p>
            We built Decoding the Bottle for the Data Science, Learning and
            Applications (DALAS) course. The question: how much can a wine’s
            price, origin, grapes, and taste profile tell us about its public
            rating?
          </p>
          <section>
            <span className="help-icon">
              <WineIcon size={23} />
            </span>
            <div>
              <h3>Predicted and actual ratings</h3>
              <p>
                The actual rating is the mean public rating. The prediction is
                the model’s estimate for a wine held out of its training data.
                Their difference shows how far the model missed.
              </p>
            </div>
          </section>
          <section>
            <span className="help-icon">
              <ChartScatter size={23} />
            </span>
            <div>
              <h3>Reading a SHAP explanation</h3>
              <p>
                Start at the SHAP baseline, the model’s expected prediction for
                its reference data. Each feature adds or subtracts a
                contribution, in stars. Add them all to reach the predicted
                rating. Burgundy raises it; brown lowers it.
              </p>
            </div>
          </section>
          <section>
            <span className="help-icon">
              <Info size={23} />
            </span>
            <div>
              <h3>A model’s explanation, not a cause</h3>
              <p>
                A positive contribution from price means this model used the
                price to predict a higher rating. It does not prove a more
                expensive wine tastes better.
              </p>
            </div>
          </section>
          {release && (
            <section>
              <div>
                <h3>About this retraining run</h3>
                <p>
                  CatBoost was retrained on 37,315 wines from a recovered
                  prepared table, with 9,329 rows held out. These are new
                  results, separate from the course report. The missing final
                  food-filtering column was reconstructed using the available
                  food labels. Earlier imputation may have used the full
                  dataset; its fitting scope is unknown. Related wines and
                  producers can appear in both sets.
                </p>
              </div>
            </section>
          )}
          <p className="help-data-note">
            {collection.source === "demo"
              ? "You are currently using fictional wines and simulated outputs. Import a test-set export to explore your own results."
              : `Current collection: ${collection.name}. Model: ${collection.modelName}.`}
          </p>
        </div>
      </Modal>
      <Modal
        open={!!openingId && !activeWine}
        onClose={closeWine}
        title={openError ? "Could not open this wine" : "Opening wine…"}
        description={openError || "Loading its explanation."}
      >
        {openError && (
          <button
            className="button primary"
            onClick={() => void showWine(openingId)}
          >
            Try again
          </button>
        )}
      </Modal>
      {!productionRelease && (
        <Modal
          open={modal === "import"}
          onClose={() => setModal(null)}
          title="Try your own test wines"
          description="Load a collection with actual ratings, model predictions, and per-wine SHAP contributions."
        >
          <div className="import-area">
            <UploadSimple size={33} weight="light" />
            <h3>
              {importing
                ? "Checking your collection…"
                : "Choose a collection file"}
            </h3>
            <p>JSON format, up to 25 MB. Read locally in your browser.</p>
            <label
              className={`button primary file-label ${importing ? "disabled" : ""}`}
            >
              {importing ? "Loading…" : "Choose JSON file"}
              <input
                aria-label="Choose collection JSON file"
                type="file"
                accept=".json,application/json"
                disabled={importing}
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importError && (
            <p className="import-error" role="alert">
              <Info size={18} />
              {importError}
            </p>
          )}
          <div className="import-instructions">
            <h3>What’s in an export?</h3>
            <p>
              Each wine needs its identity, actual and predicted ratings, a SHAP
              baseline, and feature contributions. The browser checks that the
              contributions add up to the prediction.
            </p>
            <button
              className="text-button"
              onClick={() =>
                downloadJson(
                  {
                    ...demoCollection,
                    wines: demoCollection.wines.slice(0, 2),
                  },
                  "wine-collection-example.json",
                )
              }
            >
              <DownloadSimple size={17} />
              Download example JSON
            </button>
          </div>
          {collection.source !== "demo" && (
            <button
              className="button"
              onClick={() => loadCollection(demoCollection)}
            >
              Return to demonstration collection
            </button>
          )}
        </Modal>
      )}
      <Modal
        open={mobileFilters}
        onClose={() => setMobileFilters(false)}
        title="Filter the collection"
        description="Find a wine by style, origin, price, or prediction difference."
        className="mobile-filters-dialog"
      >
        {mobileFilters && filterContents}
        <button
          className="button primary filter-apply"
          onClick={() => setMobileFilters(false)}
        >
          Show {filtered.length} wines <ArrowRight size={17} />
        </button>
      </Modal>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </>
  );
}
export default App;
