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
  amount: number | null;
  value: number | null;
}

export interface TokenAssetsWidgetProps {
  apiKey?: string;
  baseUrl?: string;
  keyHeader?: string;
  currency?: string;
  refreshMs?: number;
  defaultTimeframe?: Timeframe;
  visibleTokens?: number;
  holdings?: Holding[];
  className?: string;
  onSelect?: (asset: TokenAsset) => void;
}

type TokenResource = {
  id: string;
  type: string;
  attributes?: {
    address?: string;
    name?: string;
    symbol?: string;
    image_url?: string | null;
  };
};

type PoolResource = {
  id: string;
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
  };
};

type PoolsResponse = { data?: PoolResource[]; included?: TokenResource[] };

type NetworkToken = {
  id: string;
  address: string;
  symbol: string;
  name: string;
  image: string | null;
};

type TokenPriceResponse = {
  data?: {
    attributes?: {
      token_prices?: Record<string, string | number>;
      h24_price_change_percentage?: Record<string, string | number>;
    };
  };
};

type OHLCVResponse = {
  data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
};

type Point = [number, number];

const NETWORK = "monad";
const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "All"];
const CHART_CONFIG: Record<Timeframe, { interval: "minute" | "hour" | "day"; aggregate: number; limit: number; chunks: number }> = {
  "1D": { interval: "minute", aggregate: 15, limit: 96, chunks: 1 },
  "1W": { interval: "hour", aggregate: 4, limit: 42, chunks: 1 },
  "1M": { interval: "hour", aggregate: 12, limit: 60, chunks: 1 },
  "3M": { interval: "day", aggregate: 1, limit: 90, chunks: 1 },
  "1Y": { interval: "day", aggregate: 1, limit: 180, chunks: 2 },
  All: { interval: "day", aggregate: 1, limit: 180, chunks: 2 },
};

const NATIVE_FALLBACK: NetworkToken = {
  id: "native-mon",
  address: "",
  symbol: "MON",
  name: "Monad",
  image: null,
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
    if (error.status >= 500) return "The market data service is temporarily unavailable.";
    return error.message || `Request failed (${error.status}).`;
  }
  return error instanceof Error ? error.message : "Couldn't reach Monad market data.";
}

async function getJSON<T>(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) {
    let message = "";
    try {
      const body = await response.json() as { error?: string; message?: string };
      message = body.error || body.message || "";
    } catch {
      // Keep the HTTP status as the useful fallback.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function uniqueTokens(response: PoolsResponse): NetworkToken[] {
  const resources = response.included ?? [];
  const byId = new Map(resources.filter((r) => r.type === "token" && r.attributes?.address).map((r) => [r.id, r]));
  const orderedIds = (response.data ?? []).flatMap((pool) => [
    pool.relationships?.base_token?.data?.id,
    pool.relationships?.quote_token?.data?.id,
  ]).filter((id): id is string => Boolean(id));
  const ids = [...orderedIds, ...byId.keys()];
  const seen = new Set<string>();
  const tokens: NetworkToken[] = [];
  for (const id of ids) {
    const resource = byId.get(id);
    const address = resource?.attributes?.address?.trim();
    if (!resource || !address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const symbol = resource.attributes?.symbol?.trim() || "TOKEN";
    tokens.push({
      id: key,
      address,
      symbol: symbol.toUpperCase(),
      name: resource.attributes?.name?.trim() || symbol.toUpperCase(),
      image: resource.attributes?.image_url || null,
    });
  }
  return tokens;
}

async function fetchMonadTokens(baseUrl: string, headers: Record<string, string>, signal: AbortSignal) {
  const url = `${baseUrl}/onchain/networks/${NETWORK}/trending_pools?include=base_token,quote_token&page=1&duration=24h`;
  const response = await getJSON<PoolsResponse>(url, headers, signal);
  const tokens = uniqueTokens(response);
  if (!tokens.length) throw new ApiError(404, "No token metadata was returned for Monad's trending pools.");
  return tokens;
}

async function fetchTokenPrices(
  baseUrl: string,
  headers: Record<string, string>,
  tokens: NetworkToken[],
  signal: AbortSignal,
): Promise<Record<string, { price: number | null; pct24: number | null }>> {
  const addresses = tokens.map((token) => token.address);
  if (!addresses.length) return {};
  const url = `${baseUrl}/onchain/simple/networks/${NETWORK}/token_price/${addresses.join(",")}?include_24hr_price_change=true`;
  const response = await getJSON<TokenPriceResponse>(url, headers, signal);
  const prices = response.data?.attributes?.token_prices ?? {};
  const changes = response.data?.attributes?.h24_price_change_percentage ?? {};
  const output: Record<string, { price: number | null; pct24: number | null }> = {};
  for (const token of tokens) {
    const key = token.address.toLowerCase();
    const price = prices[key] == null ? prices[token.address] : prices[key];
    const change = changes[key] == null ? changes[token.address] : changes[key];
    const priceNumber = price == null ? null : Number(price);
    const changeNumber = change == null ? null : Number(change);
    output[key] = {
      price: priceNumber != null && Number.isFinite(priceNumber) ? priceNumber : null,
      pct24: changeNumber != null && Number.isFinite(changeNumber) ? changeNumber : null,
    };
  }
  return output;
}

async function fetchChart(
  baseUrl: string,
  headers: Record<string, string>,
  tokenAddress: string,
  timeframe: Timeframe,
  signal: AbortSignal,
): Promise<Point[]> {
  const config = CHART_CONFIG[timeframe];
  const readChunk = async (before?: number) => {
    const params = new URLSearchParams({
      aggregate: String(config.aggregate),
      limit: String(config.limit),
      currency: "usd",
    });
    if (before) params.set("before_timestamp", String(before));
    const url = `${baseUrl}/onchain/networks/${NETWORK}/tokens/${encodeURIComponent(tokenAddress)}/ohlcv/${config.interval}?${params.toString()}`;
    const response = await getJSON<OHLCVResponse>(url, headers, signal);
    return (response.data?.attributes?.ohlcv_list ?? [])
      .filter((row) => Number.isFinite(row[0]) && Number.isFinite(row[4]))
      .map((row): Point => [row[0] * 1000, row[4]])
      .sort((a, b) => a[0] - b[0]);
  };

  let points = await readChunk();
  const maxChunks = config.chunks;
  for (let chunk = 1; chunk < maxChunks && points.length > 1; chunk++) {
    const oldest = Math.floor(points[0][0] / 1000) - 1;
    const older = await readChunk(oldest);
    if (!older.length) break;
    points = [...older, ...points].filter((point, index, all) => index === 0 || point[0] !== all[index - 1][0]);
  }
  return points;
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
  apiKey = "",
  baseUrl = "https://api.coingecko.com/api/v3",
  keyHeader = "x-cg-demo-api-key",
  currency = "usd",
  refreshMs = 30000,
  defaultTimeframe = "1D",
  visibleTokens = 3,
  holdings = [],
  className = "",
  onSelect,
}: TokenAssetsWidgetProps) {
  const headers = useMemo<Record<string, string>>(() => apiKey.trim() ? { [keyHeader]: apiKey.trim() } : {}, [apiKey, keyHeader]);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [selectedId, setSelectedId] = useState("native-mon");
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [tokens, setTokens] = useState<NetworkToken[]>([]);
  const [prices, setPrices] = useState<Record<string, { price: number | null; pct24: number | null }>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">(apiKey.trim() ? "loading" : "error");
  const [error, setError] = useState<string | null>(apiKey.trim() ? null : "Add VITE_COINGECKO_API_KEY to .env.local to load live Monad market data.");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(apiKey.trim() ? "Waiting for live chart data." : "Add your CoinGecko API key to load the Monad chart.");
  const [charts, setCharts] = useState<Record<string, Point[]>>({});
  const fetchedAt = useRef<Record<string, number>>({});
  const requestsInFlight = useRef<Set<string>>(new Set());

  const assets = useMemo<TokenAsset[]>(() => {
    const source = tokens.length ? tokens : [NATIVE_FALLBACK];
    const balances = new Map<string, number>();
    for (const holding of holdings) {
      balances.set(holding.id.toLowerCase(), (balances.get(holding.id.toLowerCase()) ?? 0) + holding.amount);
    }
    return source.map((token) => {
      const priceInfo = prices[token.id] ?? prices[token.address.toLowerCase()];
      const price = priceInfo?.price ?? null;
      const hasBalance = balances.has(token.id) || balances.has(token.address.toLowerCase());
      const balance = hasBalance ? balances.get(token.id) ?? balances.get(token.address.toLowerCase()) ?? 0 : null;
      return {
        ...token,
        price,
        pct24: priceInfo?.pct24 ?? null,
        amount: balance,
        value: balance != null && price != null ? balance * price : null,
      };
    });
  }, [tokens, prices, holdings]);

  const selected = assets.find((asset) => asset.id === selectedId) ?? assets[0] ?? null;
  const selectedPrice = selected?.price ?? null;
  const chartKey = selected?.address ? `${selected.id}:${timeframe}` : "";
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
    if (!apiKey.trim()) {
      setStatus("error");
      setError("Add VITE_COINGECKO_API_KEY to .env.local to load live Monad market data.");
      setChartError("Add your CoinGecko API key to load the Monad chart.");
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setStatus((current) => current === "ready" ? "ready" : "loading");
      try {
        const discovered = await fetchMonadTokens(baseUrl, headers, controller.signal);
        if (controller.signal.aborted) return;
        setTokens(discovered);
        const nextPrices = await fetchTokenPrices(baseUrl, headers, discovered, controller.signal);
        if (controller.signal.aborted) return;
        setPrices(nextPrices);
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
  }, [apiKey, baseUrl, headers, refreshMs, reload]);

  const loadChart = useCallback(async (asset: TokenAsset, tf: Timeframe) => {
    if (!asset.address) {
      setChartError("Live MON chart history will appear when the on-chain token feed is available.");
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
      const points = await fetchChart(baseUrl, headers, asset.address, tf, new AbortController().signal);
      if (!points.length) throw new ApiError(404, "No chart history is available for this token yet.");
      fetchedAt.current[key] = Date.now();
      setCharts((current) => ({ ...current, [key]: points }));
    } catch (exception) {
      setChartError(errorMessage(exception));
    } finally {
      requestsInFlight.current.delete(key);
      setChartLoading(false);
    }
  }, [baseUrl, headers]);

  useEffect(() => {
    setHover(null);
    if (!selected) {
      setChartError("Waiting for a Monad token to be discovered.");
      return;
    }
    if (!apiKey.trim()) {
      setChartError("Add your CoinGecko API key to load the Monad chart.");
      return;
    }
    void loadChart(selected, timeframe);
  }, [selected?.id, selected?.address, timeframe, apiKey, loadChart]);

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
        <span>Monad tokens <i className="ta-q" title="Tokens discovered through Monad on-chain DEX pools">?</i></span>
        <b>{holdings.length ? money(total, currency, "value") : "Balances unavailable"}</b>
      </div>

      <div className="ta-list" role="listbox" aria-label="Monad tokens, regardless of wallet balance">
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
        <span className={`ta-live ${status === "ready" && !stale ? "" : "off"}`}><i />{status === "ready" ? "Monad DEX prices" : status === "loading" ? "Connecting to Monad" : "Live data unavailable"}{updatedAt ? ` · ${updatedLabel}` : ""}</span>
        <small>Market data is sourced from Monad pools. Wallet balances require a connected wallet service.</small>
      </footer>
    </section>
  );
}
