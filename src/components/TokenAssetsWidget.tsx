import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { CURRENCIES, DEFAULT_CURRENCY_KEY, getCurrencySymbol, readDefaultCurrency } from "../data/currencies";
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

/** A wallet holding can be a CoinGecko ID or a chain-qualified Ankr asset. */
export interface Holding {
  id: string;
  amount: number;
  symbol?: string;
  name?: string;
  image?: string | null;
  price?: number | null;
  valueUsd?: number | null;
  network?: string;
  contractAddress?: string | null;
  marketId?: string;
}

export interface TokenAsset {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  pct24: number | null;
  amount: number;
  /** amount × price */
  value: number;
  pinned: boolean;
  network?: string;
  contractAddress?: string | null;
  chartId?: string;
}

export interface TokenAssetsWidgetProps {
  /** Wallet holdings supplied by the connected account/provider. IDs are CoinGecko coin IDs. */
  holdings?: Holding[];
  /** Set true only when holdings come from a connected wallet provider. */
  walletConnected?: boolean;
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
  onConnectWallet?: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */

const EMPTY_HOLDINGS: Holding[] = [];

const DEFAULT_PINNED: PinnedToken[] = [
  { id: "tether", symbol: "USDT", name: "Tether USD" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "monad", symbol: "MON", name: "Monad" },
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
    if (e.status === 429) return "Rate limit reached. Try again in a moment.";
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

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Tiny optional tap feedback for browsers that expose the Vibration API. */
function triggerHaptic(duration = 7): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  } catch {
    // Haptics are progressive enhancement; unsupported devices remain fully usable.
  }
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

type SearchNetworkId = "bitcoin" | "ethereum" | "bnb" | "polygon" | "arbitrum" | "optimism" | "base" | "avalanche" | "solana" | "monad" | "tron" | "ton" | "xrp";
type SearchNetworkFilter = "all" | SearchNetworkId;

interface SearchCoin {
  id: string;
  symbol: string;
  name: string;
  thumb?: string;
  resultKey: string;
  networkId: SearchNetworkId;
  networkLabel: string;
  contractAddress?: string;
  assetKind: "Native coin" | "Token";
}
interface RawSearchCoin {
  id: string;
  symbol: string;
  name: string;
  thumb?: string;
}
interface SearchCoinDetails {
  asset_platform_id?: string | null;
  platforms?: Record<string, string>;
}

const SEARCH_NETWORKS: { id: SearchNetworkId; label: string; platformAliases: string[]; nativeCoinIds: string[] }[] = [
  { id: "bitcoin", label: "Bitcoin", platformAliases: [], nativeCoinIds: ["bitcoin"] },
  { id: "ethereum", label: "Ethereum", platformAliases: ["ethereum"], nativeCoinIds: ["ethereum"] },
  { id: "bnb", label: "BNB Chain", platformAliases: ["binance-smart-chain", "bnb-smart-chain", "bnb-chain"], nativeCoinIds: ["binancecoin"] },
  { id: "polygon", label: "Polygon", platformAliases: ["polygon-pos", "polygon"], nativeCoinIds: ["matic-network", "polygon-ecosystem-token"] },
  { id: "arbitrum", label: "Arbitrum", platformAliases: ["arbitrum-one", "arbitrum"], nativeCoinIds: ["arbitrum"] },
  { id: "optimism", label: "Optimism", platformAliases: ["optimistic-ethereum", "optimism"], nativeCoinIds: ["optimism"] },
  { id: "base", label: "Base", platformAliases: ["base"], nativeCoinIds: [] },
  { id: "avalanche", label: "Avalanche", platformAliases: ["avalanche", "avalanche-x"], nativeCoinIds: ["avalanche-2"] },
  { id: "solana", label: "Solana", platformAliases: ["solana"], nativeCoinIds: ["solana"] },
  { id: "monad", label: "Monad", platformAliases: ["monad", "monad-mainnet"], nativeCoinIds: ["monad"] },
  { id: "tron", label: "TRON", platformAliases: ["tron"], nativeCoinIds: ["tron"] },
  { id: "ton", label: "TON", platformAliases: ["the-open-network", "ton"], nativeCoinIds: ["the-open-network"] },
  { id: "xrp", label: "XRP Ledger", platformAliases: [], nativeCoinIds: ["ripple"] },
];
const SEARCH_NETWORK_FILTERS: { id: SearchNetworkFilter; label: string }[] = [
  { id: "all", label: "All networks" },
  ...SEARCH_NETWORKS.map(({ id, label }) => ({ id, label })),
];
const MULTICHAIN_SEARCH_CACHE = new Map<string, SearchCoin[]>();
const SEARCH_DETAILS_CACHE = new Map<string, SearchCoinDetails>();
const MAX_MULTICHAIN_SEARCH_CANDIDATES = 20;
const MAX_MULTICHAIN_DETAILS_REQUESTS = 8;
const MAX_MULTICHAIN_SEARCH_RESULTS = 48;

const MARKET_CACHE_TTL = 90_000;
const MARKET_PRICE_CACHE = new Map<string, { savedAt: number; data: Record<string, MarketInfo> }>();
const MARKET_PRICE_INFLIGHT = new Map<string, Promise<Record<string, MarketInfo>>>();

async function fetchMarketsUncached(
  base: string,
  headers: Record<string, string>,
  ids: string[],
  currency: string,
  signal: AbortSignal,
): Promise<Record<string, MarketInfo>> {
  const out: Record<string, MarketInfo> = {};
  if (ids.length === 0) return out;
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

async function fetchMarkets(
  base: string,
  headers: Record<string, string>,
  ids: string[],
  currency: string,
  signal: AbortSignal,
): Promise<Record<string, MarketInfo>> {
  if (ids.length === 0) return {};
  const stableIds = [...new Set(ids)].sort();
  const key = `${base}|${currency}|${stableIds.join(",")}`;
  const cached = MARKET_PRICE_CACHE.get(key);
  if (cached && Date.now() - cached.savedAt < MARKET_CACHE_TTL) return cached.data;
  const inFlight = MARKET_PRICE_INFLIGHT.get(key);
  if (inFlight) return inFlight;

  const request = fetchMarketsUncached(base, headers, stableIds, currency, signal);
  MARKET_PRICE_INFLIGHT.set(key, request);
  try {
    const data = await request;
    MARKET_PRICE_CACHE.set(key, { savedAt: Date.now(), data });
    if (MARKET_PRICE_CACHE.size > 100) {
      const oldestKey = MARKET_PRICE_CACHE.keys().next().value;
      if (oldestKey) MARKET_PRICE_CACHE.delete(oldestKey);
    }
    return data;
  } catch (error) {
    if (signal.aborted) throw error;
    if (cached) return cached.data;
    throw error;
  } finally {
    if (MARKET_PRICE_INFLIGHT.get(key) === request) MARKET_PRICE_INFLIGHT.delete(key);
  }
}

async function searchMultichainAssets(base: string, headers: Record<string, string>, query: string, signal: AbortSignal): Promise<SearchCoin[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `${base}|${normalizedQuery}`;
  const cached = MULTICHAIN_SEARCH_CACHE.get(cacheKey);
  if (cached) return cached;

  const payload = await getJSON<{ coins: RawSearchCoin[] }>(
    `${base}/search?query=${encodeURIComponent(query.trim())}`, headers, signal,
  );
  const candidates = (payload.coins ?? []).slice(0, MAX_MULTICHAIN_SEARCH_CANDIDATES);
  const results: SearchCoin[] = [];
  const seen = new Set<string>();

  const addResult = (coin: RawSearchCoin, network: typeof SEARCH_NETWORKS[number], assetKind: SearchCoin["assetKind"], contractAddress?: string) => {
    const normalizedAddress = contractAddress?.trim();
    const identity = `${coin.id}|${network.id}|${normalizedAddress?.toLowerCase() ?? "native"}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    results.push({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      thumb: coin.thumb,
      resultKey: identity,
      networkId: network.id,
      networkLabel: network.label,
      assetKind,
      ...(normalizedAddress ? { contractAddress: normalizedAddress } : {}),
    });
  };

  // Native coins do not need token contract addresses.
  for (const coin of candidates) {
    const nativeNetwork = SEARCH_NETWORKS.find((network) => network.nativeCoinIds.includes(coin.id.toLowerCase()));
    if (nativeNetwork) addResult(coin, nativeNetwork, "Native coin");
  }

  // A token appears on a network only when the market index lists a real deployment address.
  const tokenCandidates = candidates.filter((coin) => !SEARCH_NETWORKS.some((network) => network.nativeCoinIds.includes(coin.id.toLowerCase())));
  const matchedTokens = tokenCandidates.filter((coin) =>
    coin.name.toLowerCase().includes(normalizedQuery) || coin.symbol.toLowerCase().includes(normalizedQuery)
  );
  const detailCandidates = (matchedTokens.length ? matchedTokens : tokenCandidates).slice(0, MAX_MULTICHAIN_DETAILS_REQUESTS);
  const detailsRows = await Promise.all(detailCandidates.map(async (coin): Promise<{ coin: RawSearchCoin; details: SearchCoinDetails | null }> => {
    const cachedDetails = SEARCH_DETAILS_CACHE.get(coin.id);
    if (cachedDetails) return { coin, details: cachedDetails };
    try {
      const details = await getJSON<SearchCoinDetails>(
        `${base}/coins/${encodeURIComponent(coin.id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
        headers,
        signal,
      );
      SEARCH_DETAILS_CACHE.set(coin.id, details);
      if (SEARCH_DETAILS_CACHE.size > 300) SEARCH_DETAILS_CACHE.clear();
      return { coin, details };
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof HttpError && (error.status === 429 || error.status >= 500)) throw error;
      return { coin, details: null };
    }
  }));

  for (const { coin, details } of detailsRows) {
    if (!details) continue;
    for (const [platformId, address] of Object.entries(details.platforms ?? {})) {
      const platform = platformId.toLowerCase();
      const network = SEARCH_NETWORKS.find((candidate) =>
        candidate.platformAliases.some((alias) => platform === alias || platform.includes(alias))
      );
      if (network && address?.trim()) addResult(coin, network, "Token", address);
    }
  }

  const networkOrder: Record<SearchNetworkId, number> = {
    bitcoin: 0, ethereum: 1, bnb: 2, polygon: 3, arbitrum: 4, optimism: 5,
    base: 6, avalanche: 7, solana: 8, monad: 9, tron: 10, ton: 11, xrp: 12,
  };
  results.sort((a, b) => {
    const aRank = candidates.findIndex((coin) => coin.id === a.id);
    const bRank = candidates.findIndex((coin) => coin.id === b.id);
    return aRank - bRank || networkOrder[a.networkId] - networkOrder[b.networkId];
  });
  const limited = results.slice(0, MAX_MULTICHAIN_SEARCH_RESULTS);
  if (MULTICHAIN_SEARCH_CACHE.size > 60) MULTICHAIN_SEARCH_CACHE.clear();
  MULTICHAIN_SEARCH_CACHE.set(cacheKey, limited);
  return limited;
}

interface CachedChartHistory {
  points: Point[];
  fetchedAt: number;
}
const CHART_HISTORY_CACHE = new Map<string, CachedChartHistory>();

function chartCacheTtl(days: number | "max"): number {
  if (days === 1) return 60_000;
  if (days === 7) return 4 * 60_000;
  if (days === 30) return 8 * 60_000;
  if (days === 90) return 15 * 60_000;
  return 30 * 60_000;
}

async function fetchChart(base: string, headers: Record<string, string>, id: string, currency: string, days: number | "max", signal?: AbortSignal): Promise<Point[]> {
  const cacheKey = `${base}|${id}|${currency}|${days}`;
  const cached = CHART_HISTORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < chartCacheTtl(days)) return cached.points;
  try {
    const data = await getJSON<{ prices: Point[] }>(
      `${base}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${currency}&days=${days}`,
      headers,
      signal,
    );
    if (!data.prices?.length) throw new HttpError(404);
    CHART_HISTORY_CACHE.set(cacheKey, { points: data.prices, fetchedAt: Date.now() });
    if (CHART_HISTORY_CACHE.size > 180) {
      const oldestKey = CHART_HISTORY_CACHE.keys().next().value;
      if (oldestKey) CHART_HISTORY_CACHE.delete(oldestKey);
    }
    return data.prices;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (cached) return cached.points;
    throw error;
  }
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
  currency: string;
}

function Chart({ pts, tf, error, hover, onHover, animKey, currency }: ChartProps) {
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

  function zoomBy(factor: number, anchorRatio = 0.5) {
    if (fullEnd < 2) return;
    const currentSpan = Math.max(1, safeEnd - safeStart);
    const nextSpan = Math.max(1, Math.min(fullEnd, Math.round(currentSpan * factor)));
    const ratio = Math.min(1, Math.max(0, anchorRatio));
    const anchorIndex = safeStart + ratio * currentSpan;
    const proposedStart = Math.round(anchorIndex - ratio * nextSpan);
    const nextStart = Math.max(0, Math.min(fullEnd - nextSpan, proposedStart));
    setRange({ start: nextStart, end: Math.min(fullEnd, nextStart + nextSpan) });
    onHover(null);
  }
  function wheel(e: ReactWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    zoomBy(e.deltaY < 0 ? 0.72 : 1.4, ratio);
  }

  const hp = geo && hover != null ? geo.xy[Math.max(0, Math.min(geo.xy.length - 1, hover - safeStart))] : null;
  const inspectedPoint = pts && hover != null ? pts[Math.max(0, Math.min(pts.length - 1, hover))] : null;
  const trendColor = pts && pts.length > 1 && pts[pts.length - 1][1] < pts[0][1] ? "#dc2626" : "#16a34a";
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
        onWheel={wheel}
        onDoubleClick={resetZoom}
        aria-label="Price graph. Hover or drag to inspect; scroll, use the zoom controls, or pinch to zoom."
      >
        {geo && (
          <svg width={w} height={CH_H} viewBox={`0 0 ${w} ${CH_H}`} role="img" aria-label="Price chart">
            <defs>
              <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={trendColor} stopOpacity=".24" />
                <stop offset="1" stopColor={trendColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={CH_H * f} y2={CH_H * f} className="ta-grid" />)}
            <g key={animKey}>
              <path d={geo.area} fill={`url(#g${gid})`} className="ta-area" />
              <path d={geo.line} fill="none" stroke={trendColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="ta-line" />
            </g>
            {hp ? (
              <>
                <line x1={hp[0]} x2={hp[0]} y1="0" y2={CH_H} className="ta-cross" />
                <circle cx={hp[0]} cy={hp[1]} r="8" fill={trendColor} opacity=".16" />
                <circle cx={hp[0]} cy={hp[1]} r="4.5" fill={trendColor} stroke="#fff" strokeWidth="2" />
              </>
            ) : (
              <>
                <circle cx={geo.last[0]} cy={geo.last[1]} r="4" fill={trendColor} className="ta-pulse" />
                <circle cx={geo.last[0]} cy={geo.last[1]} r="4.5" fill={trendColor} stroke="#fff" strokeWidth="2" />
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
        <span className="ta-chart-inspection" aria-live="polite">
          {inspectedPoint ? (
            <>
              <b>{fmtMoney(inspectedPoint[1], currency, "price")}</b>
              <span>{new Date(inspectedPoint[0]).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
            </>
          ) : "Hover for exact price · scroll/pinch to zoom"}
        </span>
        <div className="ta-chart-zoom">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => { triggerHaptic(); zoomBy(1.4); }}>−</button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => { triggerHaptic(); zoomBy(0.72); }}>+</button>
          {isZoomed && <button type="button" onClick={() => { triggerHaptic(); resetZoom(); }}>Reset</button>}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

export default function TokenAssetsWidget({
  holdings = EMPTY_HOLDINGS,
  walletConnected: walletConnectedProp = false,
  pinned = DEFAULT_PINNED,
  apiKey,
  baseUrl = "https://api.coingecko.com/api/v3",
  keyHeader = "x-cg-demo-api-key",
  currency: currencyProp,
  refreshMs = 120000,
  defaultTimeframe = "1D",
  visibleHeld: visibleHeldProp,
  visibleTokens,
  badge = "M",
  className = "",
  onSelect,
  onConnectWallet,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchCoin[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSelected, setSearchSelected] = useState<SearchCoin | null>(null);
  const [searchNetworkFilter, setSearchNetworkFilter] = useState<SearchNetworkFilter>("all");
  const [searchRetry, setSearchRetry] = useState(0);
  const visibleSearchResults = useMemo(
    () => searchNetworkFilter === "all" ? searchResults : searchResults.filter((coin) => coin.networkId === searchNetworkFilter),
    [searchNetworkFilter, searchResults],
  );
  const searchNetworkCounts = useMemo(() => {
    const counts: Record<SearchNetworkFilter, number> = { all: searchResults.length, bitcoin: 0, ethereum: 0, bnb: 0, polygon: 0, arbitrum: 0, optimism: 0, base: 0, avalanche: 0, solana: 0, monad: 0, tron: 0, ton: 0, xrp: 0 };
    searchResults.forEach((coin) => { counts[coin.networkId] += 1; });
    return counts;
  }, [searchResults]);
  const walletConnected = walletConnectedProp || holdings.length > 0;

  /* ---- ids we need prices for ---- */
  const idsKey = useMemo(
    () => Array.from(new Set([
      ...pinned.map((p) => p.id),
      ...holdings.map((holding) => holding.marketId).filter((id): id is string => Boolean(id)),
      ...(searchSelected ? [searchSelected.id] : []),
    ])).join(","),
    [pinned, holdings, searchSelected?.id],
  );

  /* ---- markets (live) ---- */
  const [market, setMarket] = useState<Record<string, MarketInfo>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const ticker = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  const previousCurrency = useRef(currency);
  const lastMarketLoadAt = useRef(0);
  useEffect(() => {
    const ac = new AbortController();
    const currencyChanged = previousCurrency.current !== currency;
    previousCurrency.current = currency;
    if (currencyChanged) {
      setMarket({});
      setError(null);
      setUpdatedAt(null);
      setStatus("loading");
    }
    const ids = idsKey.split(",").filter(Boolean);
    const load = async (force = false) => {
      if (!force && Date.now() - lastMarketLoadAt.current < refreshMs) return;
      lastMarketLoadAt.current = Date.now();
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
    void load(true);
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, refreshMs);
    const onVis = () => {
      if (!document.hidden) void load();
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
    const holdingById = new Map<string, Holding>();
    holdings.forEach((holding) => {
      amounts.set(holding.id, (amounts.get(holding.id) ?? 0) + (holding.amount || 0));
      holdingById.set(holding.id, holding);
    });
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const build = (id: string, symbol: string, name: string, isPinned: boolean): TokenAsset => {
      const m = market[id];
      const holding = holdingById.get(id);
      const price = m?.price ?? holding?.price ?? null;
      const amount = amounts.get(id) ?? 0;
      const value = holding?.valueUsd ?? (price != null ? amount * price : 0);
      return {
        id,
        symbol: m?.symbol || holding?.symbol || symbol,
        name: m?.name || holding?.name || name,
        image: m?.image ?? holding?.image ?? null,
        price,
        pct24: m?.pct24 ?? null,
        amount,
        value: Number.isFinite(value) ? value : 0,
        pinned: isPinned,
        network: holding?.network,
        contractAddress: holding?.contractAddress ?? null,
        chartId: holding?.marketId,
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
    // Keep pinned assets in the explicit USDT, USDC, MON order; wallet holdings stay value-sorted below them.
    () => [...pinnedAssets, ...heldAssets],
    [pinnedAssets, heldAssets],
  );
  const hiddenCount = Math.max(0, allAssets.length - visibleHeld);
  const rows = expanded ? allAssets : allAssets.slice(0, visibleHeld);
  const selectedSearchAsset: TokenAsset | null = searchSelected ? {
    id: searchSelected.id,
    symbol: market[searchSelected.id]?.symbol || searchSelected.symbol.toUpperCase(),
    name: market[searchSelected.id]?.name || searchSelected.name,
    image: market[searchSelected.id]?.image ?? searchSelected.thumb ?? null,
    price: market[searchSelected.id]?.price ?? null,
    pct24: market[searchSelected.id]?.pct24 ?? null,
    amount: 0,
    value: 0,
    pinned: false,
    network: searchSelected.networkLabel,
    contractAddress: searchSelected.contractAddress ?? null,
    chartId: searchSelected.id,
  } : null;
  const selected = allAssets.find((a) => a.id === selectedId) ?? selectedSearchAsset ?? allAssets[0] ?? null;
  const selectedIsSearchPreview = !!selected && !allAssets.some((asset) => asset.id === selected.id);

  /* ---- chart for the selected token (cached) ---- */
  const [charts, setCharts] = useState<Record<string, Point[]>>({});
  const fetchedAt = useRef<Record<string, number>>({});
  const inflight = useRef<Set<string>>(new Set());
  const [limitedAll, setLimitedAll] = useState(false);
  const [chartErr, setChartErr] = useState<string | null>(null);

  const ensureChart = useCallback(
    async (id: string, t: Timeframe) => {
      const key = `${id}:${t}:${currency}`;
      const ttl = t === "1D" ? 60_000 : t === "1W" ? 240_000 : t === "1M" ? 480_000 : 600_000;
      if (inflight.current.has(key)) return;
      if (fetchedAt.current[key] && Date.now() - fetchedAt.current[key] < ttl) return;
      inflight.current.add(key);
      try {
        let pts: Point[];
        try {
          pts = await fetchChart(baseUrl, headers, id, currency, DAYS[t]);
        } catch (e) {
          if (t !== "All") throw e;
          pts = await fetchChart(baseUrl, headers, id, currency, 365);
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
    if (!selId) {
      setChartErr(null);
      return;
    }
    let alive = true;
    const chartId = selected?.chartId ?? selected?.id ?? "";
    if (!chartId || (selected?.id.includes(":") && !selected.chartId)) {
      setChartErr("Historical price history isn't available for this indexed wallet asset yet. Its current balance remains available.");
      return () => { alive = false; };
    }
    setChartErr(null);
    ensureChart(chartId, tf).catch((error) => {
      if (!alive) return;
      setChartErr(error instanceof HttpError && error.status === 429
        ? "Historical prices are temporarily rate-limited. Please retry shortly; spot prices continue updating."
        : "Historical price history is temporarily unavailable. Please retry in a moment.");
    });
    return () => { alive = false; };
  }, [selId, tf, ensureChart, updatedAt, selected?.chartId]);

  /* ---- chart view model ---- */
  const chartDataId = selected?.chartId ?? selected?.id;
  const base = chartDataId ? charts[`${chartDataId}:${tf}:${currency}`] : undefined;
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
    triggerHaptic();
    setSearchSelected(null);
    setSelectedId(a.id);
    setHover(null);
    onSelect?.(a);
  };

  const chooseSearchToken = (coin: SearchCoin) => {
    triggerHaptic();
    setSearchSelected(coin);
    setSelectedId(coin.id);
    setHover(null);
    setChartErr(null);
    const existing = allAssets.find((asset) => asset.id === coin.id);
    if (existing) onSelect?.(existing);
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const results = await searchMultichainAssets(baseUrl, headers, query, controller.signal);
        if (!controller.signal.aborted) setSearchResults(results);
      } catch (e) {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(errMsg(e));
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [baseUrl, headers, searchOpen, searchQuery, searchRetry]);

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
                <span className={`ta-live-status ${status !== "ready" || stale ? "off" : ""}`} title={updatedAt ? `Last successful price fetch ${formatElapsed(clockNow - updatedAt)}` : "Waiting for the first successful price fetch"}>
                  {status === "error"
                    ? updatedAt ? `Offline · updated ${formatElapsed(clockNow - updatedAt)}` : "Price unavailable"
                    : !updatedAt ? "Fetching price…"
                    : stale ? `Delayed · updated ${formatElapsed(clockNow - updatedAt)}`
                    : `Updated ${formatElapsed(clockNow - updatedAt)}`}
                </span>
                <button
                  type="button"
                  className="ta-currency-trigger"
                  aria-label={`Display currency ${currency.toUpperCase()}. Change currency`}
                  aria-haspopup="listbox"
                  aria-expanded={currencyMenuOpen}
                  onClick={() => { triggerHaptic(); setCurrencyMenuOpen((open) => !open); }}
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
                            triggerHaptic();
                            setCurrency(option.code);
                            try {
                              window.localStorage.setItem(DEFAULT_CURRENCY_KEY, option.code);
                            } catch {
                              // Keep the selection usable when browser storage is unavailable.
                            }
                            window.dispatchEvent(new CustomEvent("subtlepay:default-currency", { detail: option.code }));
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
              {selectedIsSearchPreview ? (
                <>
                  <span>Market preview</span>
                  <b>Not in wallet</b>
                  <span className="ta-hold-val">{fmtMoney(selected.price, currency, "price")}</span>
                </>
              ) : walletConnected ? (
                <>
                  <span>Your balance</span>
                  <b>{fmtAmount(selected.amount)} {selected.symbol}</b>
                  <span className="ta-hold-val">≈ {fmtMoney(holdValue, currency, "value")}</span>
                </>
              ) : (
                <>
                  <span>Wallet</span>
                  <b>Not connected</b>
                  <span className="ta-hold-val">Connect a wallet to view holdings</span>
                </>
              )}
            </div>

            <Chart pts={view} tf={tf} error={!view ? chartErr : null} hover={hover} onHover={setHover} animKey={`${selected.id}:${tf}:${currency}`} currency={currency} />
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
              onClick={() => { triggerHaptic(); setTf(t); setHover(null); }}
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
          <button type="button" onClick={() => { triggerHaptic(10); setReload((n) => n + 1); }}>Try again</button>
        </div>
      )}

      {/* ---------------- token assets list ---------------- */}
      <div className="ta-list-head">
        <span>
          Token Assets
          <i className="ta-q" title="Total value of the tokens in your wallet">?</i>
        </span>
        <div className="ta-list-controls">
          <b title={walletConnected ? "Total wallet market value" : "Wallet is not connected"}>
            {status === "loading" ? "—" : walletConnected ? fmtMoney(total, currency, "value") : "—"}
          </b>
          <div className={`ta-search ${searchOpen ? "is-open" : ""}`}>
            <button type="button" className="ta-search-trigger"
              aria-label={searchOpen ? "Close multichain search" : "Search any coin on supported blockchains"} aria-expanded={searchOpen}
              onClick={() => {
                triggerHaptic();
                if (searchOpen) { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); setSearchNetworkFilter("all"); }
                else { setSearchQuery(""); setSearchResults([]); setSearchNetworkFilter("all"); setSearchOpen(true); }
              }}>
              {searchOpen ? (
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
              ) : (
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
              )}
            </button>
            {searchOpen && (
              <div className="ta-search-page-backdrop" role="presentation" onClick={() => setSearchOpen(false)}>
                <section className="ta-search-page" role="dialog" aria-modal="true" aria-label="Multichain asset search" onClick={(event) => event.stopPropagation()}>
                  <header className="ta-search-page-header">
                    <button type="button" className="ta-search-back" onClick={() => setSearchOpen(false)} aria-label="Back to token assets">
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6M9 12h12" /></svg>
                    </button>
                    <div className="ta-search-page-title"><span>SUBTLE PAY · MARKET DISCOVERY</span><strong>Search assets</strong></div>
                    <button type="button" className="ta-search-page-close" onClick={() => setSearchOpen(false)} aria-label="Close search">
                      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>
                    </button>
                  </header>

                  <label className="ta-search-page-field">
                    <svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
                    <input type="search" value={searchQuery}
                      onChange={(event) => { setSearchQuery(event.target.value); setSearchSelected(null); }}
                      onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); setSearchNetworkFilter("all"); } }}
                      placeholder="Search any coin, ticker, or asset name" aria-label="Search any coin across supported blockchains" autoFocus />
                    {searchQuery && <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchSelected(null); }} aria-label="Clear search">Clear</button>}
                  </label>

                  <div className="ta-search-page-helper"><span>SEARCH ACROSS NETWORKS</span><small>Native coins and indexed token deployments</small></div>

                  {searchQuery.trim().length >= 2 && (
                    <div className="ta-search-filters" role="tablist" aria-label="Filter results by blockchain">
                      {SEARCH_NETWORK_FILTERS.map((filter) => (
                        <button key={filter.id} type="button" role="tab" aria-selected={searchNetworkFilter === filter.id}
                          className={searchNetworkFilter === filter.id ? "ta-search-filter on" : "ta-search-filter"}
                          onClick={() => { triggerHaptic(5); setSearchNetworkFilter(filter.id); }}>
                          {filter.label}<span>{searchNetworkCounts[filter.id]}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchSelected && selected && (
                    <section className="ta-search-preview" aria-label={`${selected.name} selected asset details`}>
                      <div className="ta-search-preview-header">
                        <Logo src={selected.image} symbol={selected.symbol} size={42} />
                        <div className="ta-search-preview-title"><strong>{selected.name}</strong><span>{selected.symbol.toUpperCase()} · {searchSelected.networkLabel} · {searchSelected.assetKind}</span></div>
                        <button type="button" className="ta-search-preview-dismiss" onClick={() => { setSearchSelected(null); setSelectedId(""); setChartErr(null); }}>Hide details</button>
                      </div>
                      <div className="ta-search-preview-price">
                        <strong>{fmtMoney(selected.price, currency, "price")}</strong>
                        {deltaPct != null && <span className={deltaPct < 0 ? "ta-search-change down" : "ta-search-change up"}>{deltaPct < 0 ? "−" : "+"}{Math.abs(deltaPct).toFixed(2)}%</span>}
                      </div>
                      <div className="ta-search-preview-network"><span>{searchSelected.contractAddress ? "TOKEN CONTRACT" : "ASSET TYPE"}</span><code title={searchSelected.contractAddress ?? "Native coin"}>{searchSelected.contractAddress ?? "Native coin — no token contract"}</code></div>
                      <div className="ta-search-preview-tfs" role="tablist" aria-label="Chart timeframe">
                        {TFS.map((frame) => <button key={frame} type="button" role="tab" aria-selected={tf === frame} className={tf === frame ? "on" : ""} onClick={() => { triggerHaptic(5); setTf(frame); setHover(null); }}>{frame}</button>)}
                      </div>
                      <Chart pts={view} tf={tf} error={chartErr} hover={hover} onHover={setHover} animKey={`${selected.id}:${tf}:search`} currency={currency} />
                    </section>
                  )}

                  {searchQuery.trim().length < 2 ? (
                    <div className="ta-search-welcome">
                      <span className="ta-search-welcome-icon">⌕</span><strong>Find a coin across chains</strong>
                      <p>Try Bitcoin, BTC, USDC, ETH, or a token name. Results show the network and contract when indexed.</p>
                      <div className="ta-search-suggestions">{["Bitcoin", "USDC", "ETH", "Monad"].map((term) => <button key={term} type="button" onClick={() => setSearchQuery(term)}>{term}<span>↗</span></button>)}</div>
                    </div>
                  ) : (
                    <div className="ta-search-page-results" role="listbox" aria-label="Multichain asset results" aria-busy={searchLoading}>
                      <div className="ta-search-results-head"><div><strong>Matches</strong><span>Only indexed assets with a known network deployment</span></div><span className="ta-search-count">{searchLoading ? "Searching…" : `${visibleSearchResults.length} shown`}</span></div>
                      {searchLoading ? (
                        <div className="ta-search-message search-loading-message"><span className="ta-search-spinner" />Searching indexed assets and verifying deployments…</div>
                      ) : searchError ? (
                        <div className="ta-search-empty error"><strong>Search is temporarily unavailable</strong><span>{searchError}</span><button type="button" className="ta-search-retry" onClick={() => setSearchRetry((retry) => retry + 1)}>Try again</button></div>
                      ) : visibleSearchResults.length === 0 ? (
                        <div className="ta-search-empty"><span className="ta-search-empty-icon">⌕</span><strong>{searchResults.length === 0 ? "No indexed assets found" : "No matches on this network"}</strong><span>{searchResults.length === 0 ? `No indexed native asset or verified token deployment matched “${searchQuery.trim()}”.` : "Choose another network or return to All networks."}</span></div>
                      ) : visibleSearchResults.map((coin) => (
                        <button key={coin.resultKey} type="button" role="option" aria-selected={coin.resultKey === searchSelected?.resultKey}
                          className="ta-search-result" onClick={() => chooseSearchToken(coin)}>
                          <Logo src={coin.thumb ?? null} symbol={coin.symbol.toUpperCase()} size={42} />
                          <span className="ta-search-result-copy"><b>{coin.name}</b><small>{coin.symbol.toUpperCase()} <span className="ta-search-dot">·</span> {coin.assetKind}</small><small className="ta-search-address" title={coin.contractAddress ?? "Native asset"}>{coin.contractAddress ? `${coin.contractAddress.slice(0, 8)}…${coin.contractAddress.slice(-5)}` : "Native asset · no contract"}</small></span>
                          <span className={`ta-search-network-badge ${coin.networkId}`}>{coin.networkLabel}</span><span className="ta-search-result-view" aria-hidden="true">↗</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <footer className="ta-search-page-footer">Search covers indexed assets, not every contract ever deployed. Verify the network and full contract before sending funds.</footer>
                </section>
              </div>
            )}
          </div>
        </div>
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
                <b>{walletConnected ? fmtAmount(a.amount) : "—"}</b>
                <small>{walletConnected ? fmtMoney(a.value, currency, "value") : "Wallet not connected"}</small>
              </span>
            </button>
          ))}
      </div>

      {status === "ready" && allAssets.length === 0 && !selectedSearchAsset && (
        <div className="ta-no-wallet-assets">
          <span className="ta-no-wallet-assets-icon">◈</span>
          <strong>{walletConnected ? "No indexed token balances found" : "Connect your wallet to see your coins"}</strong>
          <span>{walletConnected
            ? "No supported positive balances were returned for this address. New tokens appear here when the indexer recognises their network and contract."
            : "Your Token Assets list stays empty until a wallet is connected. Search remains available for market discovery."}</span>
          {!walletConnected && onConnectWallet && <button type="button" onClick={() => { triggerHaptic(); onConnectWallet(); }}>Connect wallet</button>}
        </div>
      )}

      {status === "ready" && allAssets.length > visibleHeld && (
        <div className="ta-more-wrap">
          <button className="ta-more" type="button" onClick={() => { triggerHaptic(); setExpanded((v) => !v); }} aria-expanded={expanded}>
            {expanded ? "Show less" : `See more (${hiddenCount})`}
            <Chevron up={expanded} />
          </button>
        </div>
      )}
    </section>
  );
}
