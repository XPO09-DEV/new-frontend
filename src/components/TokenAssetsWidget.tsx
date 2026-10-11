import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CURRENCIES, getCurrencySymbol, readDefaultCurrency } from "../data/currencies";
import "./TokenAssetsWidget.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "All";
type Point = [number, number]; // [timestamp ms, price]

/** A token that is always shown at the top of the list, even with a zero balance. */
export interface PinnedToken {
  /** CoinGecko id, e.g. "monad" */
  id: string;
  symbol: string;
  name: string;
}

/** What the user owns. `id` is the CoinGecko id of the token. */
export interface Holding {
  id: string;
  amount: number;
}

export interface TokenAsset {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  pct24: number | null;
  amount: number;
  /** amount Ã— price */
  value: number;
  pinned: boolean;
}

export interface TokenAssetsWidgetProps {
  /** Wallet holdings supplied by the connected account/provider. IDs are CoinGecko coin IDs. */
  holdings?: Holding[];
  /** Fallback tokens included when market data is available, even without a supplied holding. */
  pinned?: PinnedToken[];
  apiKey?: string;
  /** Demo: https://api.coingecko.com/api/v3 â€” Pro: https://pro-api.coingecko.com/api/v3 â€” or your own proxy. */
  baseUrl?: string;
  /** Demo: x-cg-demo-api-key â€” Pro: x-cg-pro-api-key */
  keyHeader?: string;
  currency?: string;
  refreshMs?: number;
  defaultTimeframe?: Timeframe;
  /** How many highest-value tokens show before "See more". */
  visibleHeld?: number;
  /** Compatibility with the dashboard's prior widget prop. */
  visibleTokens?: number;
  /** Small chain badge on each logo. Pass null to hide. */
  badge?: string | null;
  className?: string;
  onSelect?: (asset: TokenAsset) => void;
}

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_PINNED: PinnedToken[] = [
  { id: "monad", symbol: "MON", name: "Monad" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "tether", symbol: "USDT", name: "Tether USD" },
];

const TFS: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "All"];
const DAYS: Record<Timeframe, number | "max"> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, All: "max" };

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

function errMsg(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 401 || e.status === 403) return "API key was rejected. Check apiKey and keyHeader.";
    if (e.status === 429) return "Rate limit reached. Retrying shortly.";
    if (e.status >= 500) return "The price service is having trouble.";
    return `Request failed (${e.status}).`;
  }
  return "Can't reach the price service.";
}

function fmtMoney(n: number | null | undefined, currency: string, kind: "price" | "value"): string {
  if (n == null || !isFinite(n)) return "â€”";
  const a = Math.abs(n);
  let max: number;
  if (kind === "value") max = a >= 1 ? 2 : a >= 0.01 ? 3 : a >= 0.0001 ? 5 : 8;
  else max = a >= 1000 ? 2 : a >= 1 ? 4 : 6;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: kind === "value" && a >= 1 ? 2 : 0,
      maximumFractionDigits: max,
    }).format(n);
  } catch {
    return n.toLocaleString("en-US", { maximumFractionDigits: max });
  }
}

function fmtAmount(n: number): string {
  if (!isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 2 : 6 });
}

function thin(pts: Point[], max = 140): Point[] {
  if (pts.length <= max) return pts;
  const out: Point[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round((i / (max - 1)) * (pts.length - 1))]);
  return out;
}

function smooth(p: [number, number][]): string {
  if (p.length < 2) return "";
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function fmtAxis(t: number, tf: Timeframe): string {
  const d = new Date(t);
  if (tf === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (tf === "1W" || tf === "1M" || tf === "3M") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}


/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function getJSON<T>(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { headers, signal });
  if (!r.ok) throw new HttpError(r.status);
  return r.json() as Promise<T>;
}

interface RawMarket {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number | null;
  price_change_percentage_24h?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
}
interface MarketInfo {
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  pct24: number | null;
}

async function fetchMarkets(
  base: string,
  headers: Record<string, string>,
  ids: string[],
  currency: string,
  signal: AbortSignal,
): Promise<Record<string, MarketInfo>> {
  const out: Record<string, MarketInfo> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const rows = await getJSON<RawMarket[]>(
      `${base}/coins/markets?vs_currency=${currency}&ids=${encodeURIComponent(chunk.join(","))}&per_page=250&page=1&sparkline=false&price_change_percentage=24h`,
      headers,
      signal,
    );
    for (const c of rows) {
      out[c.id] = {
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name,
        image: c.image ?? null,
        price: c.current_price ?? null,
        pct24: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? null,
      };
    }
  }
  return out;
}

async function fetchChart(
  base: string,
  headers: Record<string, string>,
  id: string,
  currency: string,
  days: number | "max",
): Promise<Point[]> {
  const d = await getJSON<{ prices: Point[] }>(
    `${base}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${currency}&days=${days}`,
    headers,
  );
  if (!d.prices?.length) throw new HttpError(404);
  return d.prices;
}

/* ------------------------------------------------------------------ */
/* Small bits                                                          */
/* ------------------------------------------------------------------ */

function Logo({ src, symbol, size = 40, badge }: { src: string | null; symbol: string; size?: number; badge?: string | null }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="ta-logo" style={{ width: size, height: size }}>
      {src && ok ? (
        <img src={src} alt="" loading="lazy" onError={() => setOk(false)} />
      ) : (
        <span className="ta-logo-fb">{symbol.slice(0, 1)}</span>
      )}
      {badge ? <i className="ta-badge">{badge}</i> : null}
    </span>
  );
}

const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform .25s" }}>
    <path d="m5 7.5 5 5 5-5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Chart                                                               */
/* ------------------------------------------------------------------ */

const CH_H = 124;

interface ChartProps {
  pts: Point[] | null;
  tf: Timeframe;
  error: string | null;
  hover: number | null;
  onHover: (i: number | null) => void;
  animKey: string;
}

function Chart({ pts, tf, error, hover, onHover, animKey }: ChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(300);
  const [range, setRange] = useState({ start: 0, end: Math.max(1, (pts?.length ?? 2) - 1) });
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pointerPositions = useRef(new Map<number, { x: number; y: number }>());
  const pinchBase = useRef<null | { distance: number; start: number; end: number; anchorIndex: number; anchorRatio: number }>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 300));
    ro.observe(el);
    setW(el.clientWidth || 300);
    return () => ro.disconnect();
  }, []);

  const fullEnd = Math.max(1, (pts?.length ?? 2) - 1);
  useEffect(() => {
    setRange({ start: 0, end: Math.max(1, (pts?.length ?? 2) - 1) });
    onHover(null);
    // Reset view when the selected asset, timeframe, currency, or series changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, pts?.length]);

  const safeStart = Math.max(0, Math.min(range.start, fullEnd - 1));
  const safeEnd = Math.max(safeStart + 1, Math.min(range.end, fullEnd));
  const visiblePts = useMemo(() => pts ? pts.slice(safeStart, safeEnd + 1) : null, [pts, safeStart, safeEnd]);

  const geo = useMemo(() => {
    if (!visiblePts || visiblePts.length < 2) return null;
    const padT = 10, padB = 8, padR = 8;
    const ps = visiblePts.map((p) => p[1]);
    const min = Math.min(...ps), max = Math.max(...ps), rg = max - min || 1;
    const flat = max === min;
    const xy: [number, number][] = visiblePts.map((p, i) => [
      (i / (visiblePts.length - 1)) * (w - padR),
      flat ? CH_H / 2 : padT + (1 - (p[1] - min) / rg) * (CH_H - padT - padB),
    ]);
    const line = smooth(xy);
    const last = xy[xy.length - 1];
    return { xy, line, area: `${line} L${last[0].toFixed(1)} ${CH_H} L0 ${CH_H} Z`, last };
  }, [visiblePts, w]);

  const axis = useMemo(() => {
    if (!visiblePts || visiblePts.length < 2) return [];
    return [0, 1, 2, 3].map((i) => fmtAxis(visiblePts[Math.round((i / 3) * (visiblePts.length - 1))][0], tf));
  }, [visiblePts, tf]);

  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!geo || !wrapRef.current || pointerPositions.current.size > 1) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * w;
    let best = 0, bd = Infinity;
    geo.xy.forEach((p, i) => {
      const d = Math.abs(p[0] - x);
      if (d < bd) { bd = d; best = i; }
    });
    onHover(Math.min((pts?.length ?? 1) - 1, safeStart + best));
  }

  function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerPositions.current.size >= 2 && wrapRef.current) {
      const pair = Array.from(pointerPositions.current.values()).slice(0, 2);
      const distance = Math.max(1, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
      const rect = wrapRef.current.getBoundingClientRect();
      const midpointX = (pair[0].x + pair[1].x) / 2;
      const anchorRatio = Math.min(1, Math.max(0, (midpointX - rect.left) / Math.max(1, rect.width)));
      pinchBase.current = {
        distance,
        start: safeStart,
        end: safeEnd,
        anchorRatio,
        anchorIndex: safeStart + anchorRatio * (safeEnd - safeStart),
      };
      onHover(null);
    } else {
      move(e);
    }
  }

  function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerPositions.current.has(e.pointerId)) {
      pointerPositions.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositions.current.size >= 2 && pinchBase.current) {
        const pair = Array.from(pointerPositions.current.values()).slice(0, 2);
        const distance = Math.max(1, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
        const base = pinchBase.current;
        const spanBase = Math.max(1, base.end - base.start);
        const span = Math.max(1, Math.min(fullEnd, Math.round(spanBase * (base.distance / distance))));
        const proposedStart = Math.round(base.anchorIndex - base.anchorRatio * span);
        const nextStart = Math.max(0, Math.min(fullEnd - span, proposedStart));
        setRange({ start: nextStart, end: Math.min(fullEnd, nextStart + span) });
        onHover(null);
        return;
      }
    }
    move(e);
  }

  function pointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    pointerPositions.current.delete(e.pointerId);
    if (pointerPositions.current.size < 2) pinchBase.current = null;
    if (pointerPositions.current.size === 0) onHover(null);
  }

  function resetZoom() {
    setRange({ start: 0, end: fullEnd });
    onHover(null);
  }

  const hp = geo && hover != null ? geo.xy[Math.max(0, Math.min(geo.xy.length - 1, hover - safeStart))] : null;
  const isZoomed = safeStart > 0 || safeEnd < fullEnd;

  return (
    <>
      <div
        ref={wrapRef}
        className="ta-chart"
        onPointerMove={pointerMove}
        onPointerDown={pointerDown}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onPointerLeave={() => { if (pointerPositions.current.size === 0) onHover(null); }}
        aria-label="Price graph. Drag to inspect and pinch with two fingers to zoom."
      >
        {geo && (
          <svg width={w} height={CH_H} viewBox={`0 0 ${w} ${CH_H}`} role="img" aria-label="Price chart">
            <defs>
              <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4285F4" stopOpacity=".24" />
                <stop offset="1" stopColor="#4285F4" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={CH_H * f} y2={CH_H * f} className="ta-grid" />)}
            <g key={animKey}>
              <path d={geo.area} fill={`url(#g${gid})`} className="ta-area" />
              <path d={geo.line} fill="none" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="ta-line" />
            </g>
            {hp ? (
              <>
                <line x1={hp[0]} x2={hp[0]} y1="0" y2={CH_H} className="ta-cross" />
                <circle cx={hp[0]} cy={hp[1]} r="8" fill="#4285F4" opacity=".16" />
                <circle cx={hp[0]} cy={hp[1]} r="4.5" fill="#4285F4" stroke="#fff" strokeWidth="2" />
              </>
            ) : (
              <>
                <circle cx={geo.last[0]} cy={geo.last[1]} r="4" fill="#4285F4" className="ta-pulse" />
                <circle cx={geo.last[0]} cy={geo.last[1]} r="4.5" fill="#4285F4" stroke="#fff" strokeWidth="2" />
              </>
            )}
          </svg>
        )}
        {!geo && !error && <div className="ta-skel ta-chart-skel" />}
        {error && <div className="ta-chart-err">{error}</div>}
      </div>
      <div className="ta-axis" aria-hidden="true">
        <span>{axis[0] ?? "Earlier"}</span>
        <span>{axis[1] ?? ""}</span>
        <span>{axis[2] ?? ""}</span>
        <span>{axis[3] ?? "Latest"}</span>
      </div>
      <div className="ta-chart-tools">
        <span>Pinch to zoom Â· drag to inspect</span>
        {isZoomed && <button type="button" onClick={resetZoom}>Reset zoom</button>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

export default function TokenAssetsWidget({
  holdings = [],
  pinned = DEFAULT_PINNED,
  apiKey,
  baseUrl = "https://api.coingecko.com/api/v3",
  keyHeader = "x-cg-demo-api-key",
  currency: currencyProp,
  refreshMs = 30000,
  defaultTimeframe = "1D",
  visibleHeld: visibleHeldProp,
  visibleTokens,
  badge = "M",
  className = "",
  onSelect,
}: TokenAssetsWidgetProps) {
  const headers = useMemo<Record<string, string>>(() => (apiKey ? { [keyHeader]: apiKey } : {}), [apiKey, keyHeader]);
  const visibleHeld = visibleHeldProp ?? visibleTokens ?? 3;
  const [currency, setCurrency] = useState(() => (currencyProp || readDefaultCurrency()).toLowerCase());
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currencyProp) setCurrency(currencyProp.toLowerCase());
  }, [currencyProp]);

  useEffect(() => {
    const syncDefaultCurrency = (event: Event) => {
      const customCurrency = (event as CustomEvent<string>).detail;
      const saved = customCurrency || readDefaultCurrency();
      if (CURRENCIES.some((option) => option.code === saved.toLowerCase())) setCurrency(saved.toLowerCase());
    };
    window.addEventListener("subtlepay:default-currency", syncDefaultCurrency);
    window.addEventListener("storage", syncDefaultCurrency);
    return () => {
      window.removeEventListener("subtlepay:default-currency", syncDefaultCurrency);
      window.removeEventListener("storage", syncDefaultCurrency);
    };
  }, []);

  useEffect(() => {
    if (!currencyMenuOpen) return;
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (!currencyMenuRef.current?.contains(event.target as Node)) setCurrencyMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCurrencyMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [currencyMenuOpen]);

  const [tf, setTf] = useState<Timeframe>(defaultTimeframe);
  const [selectedId, setSelectedId] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  /* ---- ids we need prices for ---- */
  const idsKey = useMemo(
    () => Array.from(new Set([...pinned.map((p) => p.id), ...holdings.map((h) => h.id)])).join(","),
    [pinned, holdings],
  );

  /* ---- markets (live) ---- */
  const [market, setMarket] = useState<Record<string, MarketInfo>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  const previousCurrency = useRef(currency);
  useEffect(() => {
    const ac = new AbortController();
    const currencyChanged = previousCurrency.current !== currency;
    previousCurrency.current = currency;
    if (currencyChanged) {
      setMarket({});
      setError(null);
      setStatus("loading");
    }
    const ids = idsKey.split(",").filter(Boolean);
    const load = async () => {
      try {
        const m = await fetchMarkets(baseUrl, headers, ids, currency, ac.signal);
        if (ac.signal.aborted) return;
        setMarket(m);
        setStatus("ready");
        setError(null);
        setUpdatedAt(Date.now());
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(errMsg(e));
        setStatus((s) => (s === "ready" ? "ready" : "error"));
      }
    };
    setStatus((s) => (s === "ready" ? s : "loading"));
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, refreshMs);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      ac.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [idsKey, baseUrl, headers, currency, refreshMs, reload]);

  /* ---- build the asset rows ---- */
  const { pinnedAssets, heldAssets, total } = useMemo(() => {
    const amounts = new Map<string, number>();
    holdings.forEach((h) => amounts.set(h.id, (amounts.get(h.id) ?? 0) + (h.amount || 0)));
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const build = (id: string, symbol: string, name: string, isPinned: boolean): TokenAsset => {
      const m = market[id];
      const price = m?.price ?? null;
      const amount = amounts.get(id) ?? 0;
      return {
        id,
        symbol: m?.symbol || symbol,
        name: m?.name || name,
        image: m?.image ?? null,
        price,
        pct24: m?.pct24 ?? null,
        amount,
        value: price != null ? amount * price : 0,
        pinned: isPinned,
      };
    };
    const pinnedAssets = pinned.map((p) => build(p.id, p.symbol, p.name, true));
    const heldAssets = Array.from(amounts.entries())
      .filter(([id, amt]) => !pinnedIds.has(id) && amt > 0)
      .map(([id]) => build(id, id.toUpperCase(), id, false))
      .sort((a, b) => b.value - a.value);
    const total = [...pinnedAssets, ...heldAssets].reduce((s, a) => s + a.value, 0);
    return { pinnedAssets, heldAssets, total };
  }, [holdings, pinned, market]);

  const allAssets = useMemo(
    () => [...pinnedAssets, ...heldAssets].sort((a, b) => b.value - a.value),
    [pinnedAssets, heldAssets],
  );
  const hiddenCount = Math.max(0, allAssets.length - visibleHeld);
  const rows = expanded ? allAssets : allAssets.slice(0, visibleHeld);
  const selected = allAssets.find((a) => a.id === selectedId) ?? allAssets[0] ?? null;

  /* ---- chart for the selected token (cached) ---- */
  const [charts, setCharts] = useState<Record<string, Point[]>>({});
  const fetchedAt = useRef<Record<string, number>>({});
  const inflight = useRef<Set<string>>(new Set());
  const [limitedAll, setLimitedAll] = useState(false);
  const [chartErr, setChartErr] = useState<string | null>(null);

  const ensureChart = useCallback(
    async (id: string, t: Timeframe) => {
      const key = `${id}:${t}:${currency}`;
      const ttl = t === "1D" ? 60_000 : 300_000;
      if (inflight.current.has(key)) return;
      if (fetchedAt.current[key] && Date.now() - fetchedAt.current[key] < ttl) return;
      inflight.current.add(key);
      try {
        let pts: Point[];
        try {
          pts = await fetchChart(baseUrl, headers, id, currency, DAYS[t]);
        } catch (e) {
          if (t !== "All") throw e;
          pts = await fetchChart(baseUrl, headers, id, currency, 365); // plan without full history
          setLimitedAll(true);
        }
        fetchedAt.current[key] = Date.now();
        setCharts((c) => ({ ...c, [key]: pts }));
      } finally {
        inflight.current.delete(key);
      }
    },
    [baseUrl, headers, currency],
  );

  const selId = selected?.id;
  useEffect(() => {
    if (!selId) return;
    let alive = true;
    setChartErr(null);
    ensureChart(selId, tf).catch((e) => alive && setChartErr(errMsg(e)));
    return () => {
      alive = false;
    };
  }, [selId, tf, ensureChart, updatedAt]);

  /* ---- chart view model ---- */
  const base = selected ? charts[`${selected.id}:${tf}:${currency}`] : undefined;
  const view = useMemo<Point[] | null>(() => {
    if (!base || !selected) return null;
    if (selected.price == null) return thin(base);
    return thin([...base.slice(0, -1), [base[base.length - 1][0], selected.price] as Point]);
  }, [base, selected]);

  const hv = view && hover != null ? view[hover] : null;
  const shownPrice = hv ? hv[1] : selected?.price ?? null;
  const first = view?.[0][1];
  const deltaPct = first && shownPrice != null ? (shownPrice / first - 1) * 100 : selected?.pct24 ?? null;
  const holdValue = selected && shownPrice != null ? selected.amount * shownPrice : 0;

  const choose = (a: TokenAsset) => {
    setSelectedId(a.id);
    setHover(null);
    onSelect?.(a);
  };

  const stale = status === "ready" && !!error;

  return (
    <section className={`ta ${className}`} aria-label="Token assets">
      {/* ---------------- selected token ---------------- */}
      <div className="ta-hero">
        {selected ? (
          <>
            <div className="ta-hero-top">
              <span className="ta-hero-name">
                <Logo src={selected.image} symbol={selected.symbol} size={26} />
                <b>{selected.symbol}</b>
                <small>{selected.name}</small>
              </span>
              <div className="ta-hero-actions" ref={currencyMenuRef}>
                <span className={`ta-live-status ${status !== "ready" || stale ? "off" : ""}`} aria-live="polite">
                  <i />
                  {status === "error" ? "Offline" : stale ? "Delayed" : status === "loading" ? "Connecting" : "Live"}
                </span>
                <button
                  type="button"
                  className="ta-currency-trigger"
                  aria-label={`Display currency ${currency.toUpperCase()}. Change currency`}
                  aria-haspopup="listbox"
                  aria-expanded={currencyMenuOpen}
                  onClick={() => setCurrencyMenuOpen((open) => !open)}
                >
                  <span className="ta-currency-symbol">{getCurrencySymbol(currency)}</span>
                  <span>{currency.toUpperCase()}</span>
                  <Chevron up={currencyMenuOpen} />
                </button>
                {currencyMenuOpen && (
                  <div className="ta-currency-menu" role="dialog" aria-label="Choose display currency">
                    <div className="ta-currency-menu-title">Display currency</div>
                    <div className="ta-currency-options" role="listbox" aria-label="Currencies">
                      {CURRENCIES.map((option) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={currency === option.code}
                          key={option.code}
                          className={`ta-currency-option ${currency === option.code ? "selected" : ""}`}
                          onClick={() => {
                            setCurrency(option.code);
                            setCurrencyMenuOpen(false);
                            setHover(null);
                          }}
                        >
                          <span className="ta-option-symbol">{option.symbol}</span>
                          <span className="ta-option-copy"><b>{option.code.toUpperCase()}</b><small>{option.name}</small></span>
                          {currency === option.code && <span className="ta-option-check" aria-hidden="true">âœ“</span>}
                        </button>
                      ))}
                    </div>
                    <p className="ta-currency-menu-note">Set your default in More â†’ Privacy & preferences â†’ Currency preference.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="ta-hero-main">
              <span className="ta-big">{fmtMoney(shownPrice, currency, "price")}</span>
              {deltaPct != null && (
                <span className={`ta-delta ${deltaPct >= 0 ? "up" : "down"}`}>
                  {deltaPct >= 0 ? "â–²" : "â–¼"} {Math.abs(deltaPct).toFixed(2)}%
                </span>
              )}
            </div>

            <div className="ta-hold">
              <span>Your balance</span>
              <b>{fmtAmount(selected.amount)} {selected.symbol}</b>
              <span className="ta-hold-val">â‰ˆ {fmtMoney(holdValue, currency, "value")}</span>
            </div>

            <Chart pts={view} tf={tf} error={!view ? chartErr : null} hover={hover} onHover={setHover} animKey={`${selected.id}:${tf}:${currency}`} />
          </>
        ) : (
          <div className="ta-skel" style={{ height: 190 }} />
        )}

        <div className="ta-tfs" role="tablist" aria-label="Timeframe" style={{ ["--n" as string]: TFS.length, ["--i" as string]: TFS.indexOf(tf) }}>
          {TFS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === tf}
              title={t === "All" && limitedAll ? "Your API plan limits history to 1 year" : undefined}
              onClick={() => { setTf(t); setHover(null); }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {status === "error" && (
        <div className="ta-state" role="status">
          <p>Couldn't load token prices</p>
          <span>{error || "Check your API key and internet connection."}</span>
          <button type="button" onClick={() => setReload((n) => n + 1)}>Try again</button>
        </div>
      )}

      {/* ---------------- token assets list ---------------- */}
      <div className="ta-list-head">
        <span>
          Token Assets
          <i className="ta-q" title="Total value of the tokens in your wallet">?</i>
        </span>
        <b>{status === "loading" ? "â€”" : fmtMoney(total, currency, "value")}</b>
      </div>

      <div className="ta-list" role="listbox" aria-label="Your tokens">
        {status === "loading" &&
          Array.from({ length: 3 }).map((_, i) => (
            <div className="ta-row ta-row-skel" key={i}>
              <div className="ta-skel" style={{ width: 40, height: 40, borderRadius: "50%" }} />
              <div className="ta-meta">
                <div className="ta-skel" style={{ width: 56, height: 14 }} />
                <div className="ta-skel" style={{ width: 80, height: 11, marginTop: 8 }} />
              </div>
              <div className="ta-nums">
                <div className="ta-skel" style={{ width: 64, height: 14, marginLeft: "auto" }} />
                <div className="ta-skel" style={{ width: 44, height: 11, marginTop: 8, marginLeft: "auto" }} />
              </div>
            </div>
          ))}

        {status === "ready" &&
          rows.map((a) => (
            <button
              key={a.id}
              role="option"
              aria-selected={a.id === selected?.id}
              className={`ta-row ${a.id === selected?.id ? "is-sel" : ""}`}
              onClick={() => choose(a)}
            >
              <Logo src={a.image} symbol={a.symbol} badge={badge} />
              <span className="ta-meta">
                <b>{a.symbol}</b>
                <small>{fmtMoney(a.price, currency, "price")}</small>
              </span>
              <span className="ta-nums">
                <b>{fmtAmount(a.amount)}</b>
                <small>{fmtMoney(a.value, currency, "value")}</small>
              </span>
            </button>
          ))}
      </div>

      {status === "ready" && allAssets.length > visibleHeld && (
        <div className="ta-more-wrap">
          <button className="ta-more" type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? "Show less" : `See more (${hiddenCount})`}
            <Chevron up={expanded} />
          </button>
        </div>
      )}
    </section>
  );
}
