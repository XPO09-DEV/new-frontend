import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import "./TokenAssetsWidget.css";

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "All";

export interface Holding {
  /** Monad token contract address, lower- or upper-case. */
  id: string;
  amount: number;
}

export interface TokenAsset {
  id: string;
  address: string | null;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  pct24: number | null;
  coinId: string;
  amount: number | null;
  value: number | null;
}

export interface TokenAssetsWidgetProps {
  /** Demo-only direct provider access. The key is exposed in the browser. */
  apiKey?: string;
  currency?: string;
  refreshMs?: number;
  defaultTimeframe?: Timeframe;
  visibleTokens?: number;
  holdings?: Holding[];
  className?: string;
  onSelect?: (asset: TokenAsset) => void;
}

type CoinStatsCoin = {
  id: string;
  name?: string;
  symbol?: string;
  icon?: string | null;
  price?: number | null;
  priceChange1d?: number | null;
  contractAddress?: string | null;
  contractAddresses?: Array<{ blockchain?: string; address?: string; contractAddress?: string }>;
};

type CoinStatsCoinsResponse = {
  meta?: { page?: number; limit?: number; pageCount?: number; hasNextPage?: boolean };
  result?: CoinStatsCoin[];
};

type NetworkToken = {
  id: string;
  coinId: string;
  address: string;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  pct24: number | null;
};

type CoinStatsChartResponse = number[][] | { result?: number[][] };

type Point = [number, number];

const MONAD_BLOCKCHAIN = "monad";
const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "All"];
const COINSTATS_PERIOD: Record<Timeframe, string> = {
  "1D": "24h",
  "1W": "1w",
  "1M": "1m",
  "3M": "3m",
  "1Y": "1y",
  All: "all",
};

const NATIVE_FALLBACK: NetworkToken = {
  id: "monad",
  coinId: "monad",
  address: "",
  symbol: "MON",
  name: "Monad",
  image: null,
  price: null,
  pct24: null,
};

class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "The API key was rejected. Check the key and header type.";
    if (error.status === 429) return "The API rate limit was reached. Try again shortly.";
    if (error.status >= 500) return error.message || "The market data service is temporarily unavailable.";
    return error.message || `Request failed (${error.status}).`;
  }
  return error instanceof Error ? error.message : "Couldn't reach Monad market data.";
}

async function getJSON<T>(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) {
    let message = "";
    try {
      const body = await response.json() as { error?: string | { message?: string }; message?: string };
      message = typeof body.error === "string" ? body.error : body.error?.message || body.message || "";
    } catch {
      // Keep the HTTP status as the useful fallback.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

async function fetchMonadTokens(
  headers: Record<string, string>,
  signal: AbortSignal,
  currency: string,
): Promise<NetworkToken[]> {
  const params = new URLSearchParams({
    currency: currency.toUpperCase(),
    page: "1",
    limit: "100",
  });
  params.set("blockchains", MONAD_BLOCKCHAIN);
  const response = await getJSON<CoinStatsCoinsResponse>(`https://openapiv1.coinstats.app/coins?${params.toString()}`, headers, signal);
  const coins = response.result ?? [];
  const tokens = coins
    .filter((coin) => Boolean(coin.id && (coin.symbol || coin.name)))
    .map((coin): NetworkToken => {
      const monadContract = coin.contractAddresses?.find((item) => (item.blockchain || "").toLowerCase() === MONAD_BLOCKCHAIN);
      const address = monadContract?.address || monadContract?.contractAddress || coin.contractAddress || "";
      const price = coin.price == null ? null : Number(coin.price);
      const change = coin.priceChange1d == null ? null : Number(coin.priceChange1d);
      return {
        id: coin.id,
        coinId: coin.id,
        address,
        symbol: (coin.symbol || "TOKEN").toUpperCase(),
        name: coin.name || coin.symbol || coin.id,
        image: coin.icon || null,
        price: price != null && Number.isFinite(price) ? price : null,
        pct24: change != null && Number.isFinite(change) ? change : null,
      };
    });
  if (!tokens.length) {
    throw new ApiError(404, "CoinStats returned no listed assets for the Monad blockchain filter.");
  }
  return tokens;
}

async function fetchChart(
  headers: Record<string, string>,
  coinId: string,
  timeframe: Timeframe,
  currency: string,
  signal: AbortSignal,
): Promise<Point[]> {
  const params = new URLSearchParams({
    period: COINSTATS_PERIOD[timeframe],
    currency: currency.toUpperCase(),
  });
  const response = await getJSON<CoinStatsChartResponse>(
    `https://openapiv1.coinstats.app/coins/${encodeURIComponent(coinId)}/charts?${params.toString()}`,
    headers,
    signal,
  );
  const rows = Array.isArray(response) ? response : response.result ?? [];
  return rows
    .filter((row) => Array.isArray(row) && row.length >= 2 && Number.isFinite(row[0]) && Number.isFinite(row[1]))
    .map((row): Point => [row[0] > 1e12 ? row[0] : row[0] * 1000, row[1]])
    .sort((a, b) => a[0] - b[0]);
}

function money(value: number | null, currency: string, valueKind: "price" | "value" = "price") {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const maxDigits = valueKind === "value"
    ? absolute >= 1 ? 2 : absolute >= 0.01 ? 3 : 6
    : absolute >= 1000 ? 2 : absolute >= 1 ? 4 : 8;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: valueKind === "value" && absolute >= 1 ? 2 : 0,
    }).format(value);
  } catch {
    return value.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
  }
}

function amount(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 1000 ? 2 : 6 });
}

function smooth(points: [number, number][]) {
  if (points.length < 2) return "";
  let path = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    path += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return path;
}

function TokenLogo({ token, size = 38 }: { token: NetworkToken | TokenAsset; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="ta-logo" style={{ width: size, height: size }}>
      {token.image && !imageFailed
        ? <img src={token.image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        : <span className="ta-logo-fb">{token.symbol.slice(0, 1)}</span>}
      <i className="ta-badge" aria-label="Monad network">M</i>
    </span>
  );
}

function PriceChart({
  points,
  error,
  loading,
  hover,
  onHover,
  timeframe,
}: {
  points: Point[];
  error: string | null;
  loading: boolean;
  hover: number | null;
  onHover: (index: number | null) => void;
  timeframe: Timeframe;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(() => setWidth(element.clientWidth || 300));
    resizeObserver.observe(element);
    setWidth(element.clientWidth || 300);
    return () => resizeObserver.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const prices = points.map((point) => point[1]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const flat = max === min;
    const xy: Point[] = points.map((point, index) => [
      (index / (points.length - 1)) * (width - 8),
      flat ? 62 : 8 + (1 - (point[1] - min) / range) * 108,
    ]);
    const line = smooth(xy);
    const last = xy[xy.length - 1];
    return { xy, line, area: `${line} L${last[0].toFixed(1)} 124 L0 124 Z`, last };
  }, [points, width]);

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!geometry || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let distance = Number.POSITIVE_INFINITY;
    geometry.xy.forEach((point, index) => {
      const current = Math.abs(point[0] - x);
      if (current < distance) { best = index; distance = current; }
    });
    onHover(best);
  };
  const selectedPoint = geometry && hover != null ? geometry.xy[hover] : null;
  const axisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeframe === "1D") return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (timeframe === "1W" || timeframe === "1M" || timeframe === "3M") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  return (
    <>
      <div className="ta-chart" ref={wrap} onPointerMove={move} onPointerDown={move} onPointerLeave={() => onHover(null)} onPointerUp={() => onHover(null)} onPointerCancel={() => onHover(null)}>
        {geometry && (
          <svg width={width} height="124" viewBox={`0 0 ${width} 124`} role="img" aria-label="Monad token price chart">
            <defs>
              <linearGradient id={`ta-gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4285f4" stopOpacity=".22" />
                <stop offset="1" stopColor="#4285f4" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[31, 62, 93].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} className="ta-grid" />)}
            <path d={geometry.area} fill={`url(#ta-gradient-${gradientId})`} className="ta-area" />
            <path d={geometry.line} fill="none" stroke="#4285f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ta-line" />
            {selectedPoint
              ? <><line x1={selectedPoint[0]} x2={selectedPoint[0]} y1="0" y2="124" className="ta-cross" /><circle cx={selectedPoint[0]} cy={selectedPoint[1]} r="4.5" fill="#4285f4" stroke="#fff" strokeWidth="2" /></>
              : <><circle cx={geometry.last[0]} cy={geometry.last[1]} r="4.5" fill="#4285f4" stroke="#fff" strokeWidth="2" /><circle cx={geometry.last[0]} cy={geometry.last[1]} r="8" fill="#4285f4" className="ta-pulse" /></>}
          </svg>
        )}
        {!geometry && loading && <div className="ta-skel ta-chart-skel" />}
        {!geometry && !loading && <div className="ta-chart-err">{error || "Chart history is not available for this token yet."}</div>}
      </div>
      <div className="ta-axis" aria-hidden="true">
        {geometry && points.length > 1
          ? [0, 1, 2, 3].map((i) => <span key={i}>{axisLabel(points[Math.round((i / 3) * (points.length - 1))][0])}</span>)
          : <><span>Earlier</span><span>Latest</span></>}
      </div>
    </>
  );
}

export default function TokenAssetsWidget({
  apiKey = import.meta.env.VITE_COINSTATS_API_KEY || "",
  currency = "USD",
  refreshMs = 300000,
  defaultTimeframe = "1D",
  visibleTokens = 3,
  holdings = [],
  className = "",
  onSelect,
}: TokenAssetsWidgetProps) {
  const headers = useMemo<Record<string, string>>(() => apiKey ? { "X-API-KEY": apiKey } : {}, [apiKey]);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [selectedId, setSelectedId] = useState("native-mon");
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [tokens, setTokens] = useState<NetworkToken[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [chartPulse, setChartPulse] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>("Waiting for live chart data.");
  const [charts, setCharts] = useState<Record<string, Point[]>>({});
  const fetchedAt = useRef<Record<string, number>>({});
  const requestsInFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setChartPulse((pulse) => pulse + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const assets = useMemo<TokenAsset[]>(() => {
    const source = tokens.length ? tokens : [NATIVE_FALLBACK];
    const balances = new Map<string, number>();
    for (const holding of holdings) {
      balances.set(holding.id.toLowerCase(), (balances.get(holding.id.toLowerCase()) ?? 0) + holding.amount);
    }
    return source.map((token) => {
      const price = token.price;
      const hasBalance = balances.has(token.id) || balances.has(token.address.toLowerCase());
      const balance = hasBalance ? balances.get(token.id) ?? balances.get(token.address.toLowerCase()) ?? 0 : null;
      return {
        ...token,
        price,
        pct24: token.pct24,
        amount: balance,
        value: balance != null && price != null ? balance * price : null,
      };
    });
  }, [tokens, holdings]);

  const selected = assets.find((asset) => asset.id === selectedId) ?? assets[0] ?? null;
  const selectedPrice = selected?.price ?? null;
  const chartKey = selected?.coinId ? `${selected.coinId}:${timeframe}` : "";
  const chartPoints = chartKey ? charts[chartKey] ?? [] : [];
  const hoveredPoint = hover != null ? chartPoints[hover] : null;
  const shownPrice = hoveredPoint?.[1] ?? chartPoints[chartPoints.length - 1]?.[1] ?? selectedPrice;
  const delta = chartPoints.length > 1 && shownPrice != null
    ? (shownPrice / chartPoints[0][1] - 1) * 100
    : selected?.pct24 ?? null;
  const total = holdings.length
    ? assets.reduce((sum, asset) => sum + (asset.value ?? 0), 0)
    : null;
  const stale = status === "error" && tokens.length > 0 && updatedAt != null;
  const updatedLabel = updatedAt == null ? "" : Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) < 5
    ? "just now"
    : `${Math.max(0, Math.round((Date.now() - updatedAt) / 1000))}s ago`;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setStatus((current) => current === "ready" ? "ready" : "loading");
      try {
        if (!apiKey) throw new Error("Set VITE_COINSTATS_API_KEY in your local .env file and restart Vite.");
        const discovered = await fetchMonadTokens(headers, controller.signal, currency);
        if (controller.signal.aborted) return;
        setTokens(discovered);
        setStatus("ready");
        setError(null);
        setUpdatedAt(Date.now());
      } catch (exception) {
        if (controller.signal.aborted) return;
        setError(errorMessage(exception));
        setStatus("error");
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, refreshMs);
    const onVisibility = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [apiKey, headers, refreshMs, reload, currency]);

  const loadChart = useCallback(async (asset: TokenAsset, tf: Timeframe) => {
    if (!asset.coinId) {
      setChartError("CoinStats does not provide a chart ID for this asset.");
      setChartLoading(false);
      return;
    }
    const key = `${asset.id}:${tf}`;
    if (requestsInFlight.current.has(key)) return;
    if (fetchedAt.current[key] && Date.now() - fetchedAt.current[key] < (tf === "1D" ? 60000 : 300000)) return;
    requestsInFlight.current.add(key);
    setChartLoading(true);
    setChartError(null);
    try {
      const points = await fetchChart(headers, asset.coinId, tf, currency, new AbortController().signal);
      if (!points.length) throw new ApiError(404, "No chart history is available for this token yet.");
      fetchedAt.current[key] = Date.now();
      setCharts((current) => ({ ...current, [key]: points }));
    } catch (exception) {
      setChartError(errorMessage(exception));
    } finally {
      requestsInFlight.current.delete(key);
      setChartLoading(false);
    }
  }, [headers, currency]);

  useEffect(() => {
    setHover(null);
    if (!selected) {
      setChartError("Waiting for a Monad token to be discovered.");
      return;
    }
    void loadChart(selected, timeframe);
  }, [selected?.id, selected?.address, selected?.coinId, timeframe, loadChart]);

  useEffect(() => {
    if (chartPulse === 0 || !selected) return;
    void loadChart(selected, timeframe);
  }, [chartPulse, selected?.id, selected?.address, selected?.coinId, timeframe, loadChart]);

  const choose = (asset: TokenAsset) => {
    setSelectedId(asset.id);
    setHover(null);
    onSelect?.(asset);
  };

  return (
    <section className={`ta ${className}`} aria-label="Monad token market and assets">
      <div className="ta-header">
        <div>
          <div className="ta-eyebrow">MONAD ECOSYSTEM</div>
          <h2>Token assets</h2>
        </div>
        <span className={`ta-live ${status === "ready" && !stale ? "" : "off"}`}>
          <i />
          {status === "ready" ? "Live prices" : status === "loading" ? "Connecting" : "Offline"}
        </span>
      </div>

      <div className="ta-hero">
        {selected ? (
          <>
            <div className="ta-hero-top">
              <span className="ta-hero-name">
                <TokenLogo token={selected} size={27} />
                <b>{selected.symbol}</b>
                <small>{selected.name}</small>
              </span>
              <span className="ta-hero-time">{hoveredPoint ? new Date(hoveredPoint[0]).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "USD"}</span>
            </div>
            <div className="ta-hero-main">
              <span className="ta-big">{money(shownPrice ?? null, currency)}</span>
              {delta != null && (
                <span className={`ta-delta ${delta >= 0 ? "up" : "down"}`}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="ta-hold">
              <span>Wallet balance</span>
              <b>{amount(selected.amount)} {selected.symbol}</b>
              <span className="ta-hold-val">{selected.amount == null ? "Connect wallet to view your balance" : `≈ ${money(selected.value, currency, "value")}`}</span>
            </div>
          </>
        ) : (
          <div className="ta-chart-err">Waiting for Monad market data.</div>
        )}

        <PriceChart
          points={chartPoints}
          error={chartError || error}
          loading={chartLoading || status === "loading"}
          hover={hover}
          onHover={setHover}
          timeframe={timeframe}
        />

        <div className="ta-tfs" role="tablist" aria-label="Chart timeframe" style={{ ["--n" as string]: TIMEFRAMES.length, ["--i" as string]: TIMEFRAMES.indexOf(timeframe) }}>
          {TIMEFRAMES.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={timeframe === item} className={timeframe === item ? "on" : ""} onClick={() => setTimeframe(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="ta-list-head">
        <span>Monad tokens <i className="ta-q" title="CoinStats assets matched to the Monad blockchain filter">?</i></span>
        <b>{holdings.length ? money(total, currency, "value") : "Balances unavailable"}</b>
      </div>

      <div className="ta-list" role="listbox" aria-label="CoinStats Monad assets, regardless of wallet balance">
        {status === "loading" && tokens.length === 0 && [0, 1, 2].map((i) => (
          <div className="ta-row ta-row-skel" key={i}>
            <div className="ta-skel" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <div className="ta-meta"><div className="ta-skel" style={{ width: 56, height: 14 }} /><div className="ta-skel" style={{ width: 80, height: 11, marginTop: 8 }} /></div>
            <div className="ta-nums"><div className="ta-skel" style={{ width: 64, height: 14, marginLeft: "auto" }} /><div className="ta-skel" style={{ width: 44, height: 11, marginTop: 8, marginLeft: "auto" }} /></div>
          </div>
        ))}

        {assets.slice(0, expanded ? assets.length : visibleTokens).map((asset) => (
          <button key={asset.id} type="button" role="option" aria-selected={asset.id === selected?.id} className={`ta-row ${asset.id === selected?.id ? "is-sel" : ""}`} onClick={() => choose(asset)}>
            <TokenLogo token={asset} />
            <span className="ta-meta">
              <b>{asset.symbol}</b>
              <small>{money(asset.price, currency)}{asset.pct24 == null ? "" : ` · ${asset.pct24 >= 0 ? "+" : ""}${asset.pct24.toFixed(2)}%`}</small>
            </span>
            <span className="ta-nums">
              <b>{amount(asset.amount)}</b>
              <small>{asset.amount == null ? "Not connected" : money(asset.value, currency, "value")}</small>
            </span>
          </button>
        ))}
      </div>

      {assets.length > visibleTokens && (
        <button className="ta-more" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? "Show less" : `See more (${assets.length - visibleTokens})`}
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform .2s" }}><path d="m5 7.5 5 5 5-5" /></svg>
        </button>
      )}

      {error && (
        <div className="ta-inline-state" role="status">
          <span>{error}</span>
          <button type="button" onClick={() => setReload((current) => current + 1)}>Try again</button>
        </div>
      )}

      <footer className="ta-foot">
        <span className={`ta-live ${status === "ready" && !stale ? "" : "off"}`}><i />{status === "ready" ? "Monad market data" : status === "loading" ? "Connecting to CoinStats" : "Live data unavailable"}{updatedAt ? ` · ${updatedLabel}` : ""}</span>
        <a className="ta-attribution" href="https://coinstats.app" target="_blank" rel="noreferrer">Powered by CoinStats</a>
        <small>Wallet balances require a connected wallet service.</small>
        <small>Temporary direct API demo: the key is exposed in browser requests. Do not use in production.</small>
      </footer>
    </section>
  );
}
