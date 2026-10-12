export interface EvmProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EvmProvider;
  }
}

export type WalletStatus = "disconnected" | "connecting" | "loading" | "ready" | "error";

export interface ConnectedWallet {
  address: string;
  chainId: string;
}

export interface WalletAsset {
  /** Stable identity within a chain; native assets and the same token on different chains remain distinct. */
  id: string;
  blockchain: string;
  chainLabel: string;
  tokenName: string;
  tokenSymbol: string;
  balance: number;
  /** Raw base-unit balance, stored as a decimal bigint string when the provider supplies it. */
  balanceRawInteger?: string;
  balanceUsd: number | null;
  priceUsd: number | null;
  tokenDecimals: number;
  contractAddress: string | null;
  thumbnail: string | null;
  tokenType: string;
}

export interface WalletAssetHolding {
  id: string;
  amount: number;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  valueUsd: number | null;
  network: string;
  contractAddress: string | null;
  marketId?: string;
}

interface AnkrAssetResponse {
  blockchain?: string;
  tokenName?: string;
  tokenSymbol?: string;
  balance?: string;
  balanceRawInteger?: string;
  balanceUsd?: string;
  tokenPrice?: string;
  tokenDecimals?: number;
  contractAddress?: string;
  thumbnail?: string;
  tokenType?: string;
}

/**
 * Wallet/provider credentials stay on the Subtle Pay backend.
 * Set VITE_SUBTLEPAY_API_BASE_URL for a separate local/deployed API origin.
 */
const API_BASE_URL = ((import.meta.env.VITE_SUBTLEPAY_API_BASE_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");
const WALLET_ASSETS_PATH = ((import.meta.env.VITE_SUBTLEPAY_WALLET_ASSETS_PATH as string | undefined) ?? "/api/wallet/assets").trim();
const BALANCE_CACHE_TTL = 60_000;
const balanceCache = new Map<string, { savedAt: number; assets: WalletAsset[] }>();

function backendBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window === "undefined") return "";
  // Vite dev server and the Fastify API use separate local ports by default.
  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "5173") {
    return "http://127.0.0.1:4000";
  }
  return window.location.origin;
}

export const SUPPORTED_EVM_NETWORKS = [
  { id: "ethereum", label: "Ethereum", chainId: "0x1", chainNumber: 1, ankrName: "eth" },
  { id: "bnb", label: "BNB Chain", chainId: "0x38", chainNumber: 56, ankrName: "bsc" },
  { id: "polygon", label: "Polygon", chainId: "0x89", chainNumber: 137, ankrName: "polygon" },
  { id: "arbitrum", label: "Arbitrum One", chainId: "0xa4b1", chainNumber: 42161, ankrName: "arbitrum" },
  { id: "optimism", label: "Optimism", chainId: "0xa", chainNumber: 10, ankrName: "optimism" },
  { id: "base", label: "Base", chainId: "0x2105", chainNumber: 8453, ankrName: "base" },
  { id: "avalanche", label: "Avalanche C-Chain", chainId: "0xa86a", chainNumber: 43114, ankrName: "avalanche" },
  { id: "monad", label: "Monad", chainId: "0x8f", chainNumber: 143, ankrName: "monad" },
] as const;

const NETWORK_LABELS: Record<string, string> = {
  eth: "Ethereum", ethereum: "Ethereum",
  bsc: "BNB Chain", "binance-smart-chain": "BNB Chain",
  polygon: "Polygon", arbitrum: "Arbitrum One", optimism: "Optimism",
  base: "Base", avalanche: "Avalanche C-Chain", monad: "Monad",
  gnosis: "Gnosis", fantom: "Fantom", linea: "Linea", scroll: "Scroll",
  flare: "Flare", telos: "Telos", taiko: "Taiko", xlayer: "X Layer",
  somnia_mainnet: "Somnia", story_mainnet: "Story",
  avalanche_fuji: "Avalanche Fuji", base_sepolia: "Base Sepolia",
  eth_sepolia: "Ethereum Sepolia", optimism_sepolia: "Optimism Sepolia",
  polygon_amoy: "Polygon Amoy", story_aeneid_testnet: "Story Aeneid Testnet",
};

export function getChainLabel(chainId: string | null | undefined): string {
  if (!chainId) return "Network not detected";
  const normalized = chainId.toLowerCase();
  return SUPPORTED_EVM_NETWORKS.find((network) => network.chainId === normalized)?.label ?? "Other EVM network";
}

export function isValidEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function requireProvider(): EvmProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No compatible browser wallet was detected. Install or unlock an EVM wallet, then try again.");
  }
  return window.ethereum;
}

export async function connectEvmWallet(): Promise<ConnectedWallet> {
  const provider = requireProvider();
  const value = await provider.request({ method: "eth_requestAccounts" });
  const accounts = Array.isArray(value) ? value : [];
  const address = typeof accounts[0] === "string" ? accounts[0] : "";
  if (!isValidEvmAddress(address)) throw new Error("The wallet did not return a valid EVM address.");
  const chainValue = await provider.request({ method: "eth_chainId" });
  const chainId = typeof chainValue === "string" ? chainValue.toLowerCase() : "";
  return { address, chainId };
}

export async function readConnectedEvmWallet(): Promise<ConnectedWallet | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const [accountValue, chainValue] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      window.ethereum.request({ method: "eth_chainId" }),
    ]);
    const accounts = Array.isArray(accountValue) ? accountValue : [];
    const address = typeof accounts[0] === "string" ? accounts[0] : "";
    const chainId = typeof chainValue === "string" ? chainValue.toLowerCase() : "";
    return isValidEvmAddress(address) ? { address, chainId } : null;
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeAnkrAsset(asset: AnkrAssetResponse): WalletAsset | null {
  const balance = finiteNumber(asset.balance) ?? 0;
  if (!(balance > 0)) return null;
  const blockchain = (asset.blockchain || "unknown").toLowerCase();
  const tokenSymbol = (asset.tokenSymbol || "TOKEN").trim().toUpperCase();
  const tokenName = (asset.tokenName || tokenSymbol).trim();
  const contractAddress = asset.contractAddress?.trim() || null;
  const native = !contractAddress || /^0x0{40}$/i.test(contractAddress);
  const id = `${blockchain}:${native ? `native:${tokenSymbol.toLowerCase()}` : contractAddress.toLowerCase()}`;
  return {
    id,
    blockchain,
    chainLabel: NETWORK_LABELS[blockchain] || blockchain.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    tokenName,
    tokenSymbol,
    balance,
    balanceRawInteger: asset.balanceRawInteger && /^\d+$/.test(asset.balanceRawInteger) ? asset.balanceRawInteger : undefined,
    balanceUsd: finiteNumber(asset.balanceUsd),
    priceUsd: finiteNumber(asset.tokenPrice),
    tokenDecimals: Math.max(0, Math.min(36, Math.trunc(finiteNumber(asset.tokenDecimals) ?? 18))),
    contractAddress: native ? null : contractAddress,
    thumbnail: asset.thumbnail || null,
    tokenType: native ? "Native coin" : (asset.tokenType || "Token"),
  };
}

export async function fetchWalletAssets(address: string, force = false): Promise<WalletAsset[]> {
  const normalizedAddress = address.trim();
  if (!isValidEvmAddress(normalizedAddress)) throw new Error("Enter a valid EVM wallet address.");

  const cacheKey = normalizedAddress.toLowerCase();
  const cached = balanceCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.savedAt < BALANCE_CACHE_TTL) return cached.assets;

  const base = backendBaseUrl();
  if (!base) throw new Error("The Subtle Pay backend URL is not configured.");
  const path = WALLET_ASSETS_PATH.startsWith("/") ? WALLET_ASSETS_PATH : `/${WALLET_ASSETS_PATH}`;
  const url = new URL(path, base);
  url.searchParams.set("address", normalizedAddress);
  if (force) url.searchParams.set("refresh", "true");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "include",
      cache: force ? "no-store" : "default",
    });
  } catch {
    throw new Error("Could not reach the Subtle Pay backend. Start it on port 4000 or set VITE_SUBTLEPAY_API_BASE_URL.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("The backend did not authorize this wallet-asset request.");
    if (response.status === 429) throw new Error("Wallet balances are rate-limited. Wait briefly before refreshing.");
    if (response.status >= 500) throw new Error("The wallet-assets service is temporarily unavailable.");
    throw new Error(`Wallet-assets API returned HTTP ${response.status}. Check VITE_SUBTLEPAY_WALLET_ASSETS_PATH.`);
  }

  const payload: unknown = await response.json();
  let rows: unknown[] | null = null;
  if (Array.isArray(payload)) rows = payload;
  else if (payload && typeof payload === "object") {
    const envelope = payload as Record<string, unknown>;
    if (Array.isArray(envelope.assets)) rows = envelope.assets;
    else if (Array.isArray(envelope.data)) rows = envelope.data;
    if (envelope.partial === true) {
      // The caller may still use the data, but no fabricated missing assets are added.
    }
  }
  if (!rows) throw new Error("Wallet-assets API returned an unexpected response; expected an assets array.");

  const unique = new Map<string, WalletAsset>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const asset = normalizeAnkrAsset(row as AnkrAssetResponse);
    if (!asset) continue;
    const previous = unique.get(asset.id);
    if (!previous || (asset.balanceUsd ?? 0) > (previous.balanceUsd ?? 0)) unique.set(asset.id, asset);
  }
  const normalized = [...unique.values()].sort((a, b) => (b.balanceUsd ?? 0) - (a.balanceUsd ?? 0));
  balanceCache.set(cacheKey, { savedAt: Date.now(), assets: normalized });
  if (balanceCache.size > 80) {
    const oldestKey = balanceCache.keys().next().value;
    if (oldestKey) balanceCache.delete(oldestKey);
  }
  return normalized;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy is unavailable in this browser.");
}

export function getChainIdFromNetwork(id: string): string | null {
  return SUPPORTED_EVM_NETWORKS.find((network) => network.id === id)?.chainId ?? null;
}

export function isSameNetwork(sourceChainId: string | null | undefined, destinationChainId: string | null | undefined): boolean {
  return !!sourceChainId && !!destinationChainId && sourceChainId.toLowerCase() === destinationChainId.toLowerCase();
}


export function getWalletAssetNetwork(asset: WalletAsset) {
  const blockchain = asset.blockchain.toLowerCase();
  return SUPPORTED_EVM_NETWORKS.find((network) =>
    network.ankrName === blockchain || network.id === blockchain
      || (network.id === "bnb" && ["binance-smart-chain", "binance-smart-chain-mainnet"].includes(blockchain))
  ) ?? null;
}

function amountToBaseUnits(value: string, decimals: number): bigint {
  const input = value.trim();
  if (!/^(?:\d+)(?:\.\d*)?$/.test(input)) throw new Error("Enter a valid positive amount.");
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals) throw new Error(`This token supports at most ${decimals} decimal places.`);
  const scaled = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return BigInt(scaled || "0");
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function rawBalance(asset: WalletAsset): bigint | null {
  if (asset.balanceRawInteger && /^\d+$/.test(asset.balanceRawInteger)) {
    try { return BigInt(asset.balanceRawInteger); } catch { return null; }
  }
  // Fallback only for providers that omit the raw quantity; UI balances can be rounded.
  try { return amountToBaseUnits(String(asset.balance), asset.tokenDecimals); } catch { return null; }
}

export interface SendTransactionRequest {
  walletAddress: string;
  recipient: string;
  asset: WalletAsset;
  amount: string;
}

/**
 * Sends a native coin or standard ERC-20 token only on the selected asset's own EVM chain.
 * The injected wallet must display and approve the transaction; this app never handles keys.
 * Cross-chain transfers are deliberately not simulated as direct sends.
 */
export async function sendEvmAssetTransaction(request: SendTransactionRequest): Promise<string> {
  const { walletAddress, recipient, asset, amount } = request;
  if (!isValidEvmAddress(walletAddress)) throw new Error("Connect a valid EVM wallet before sending.");
  if (!isValidEvmAddress(recipient)) throw new Error("Enter a valid 0x wallet address. Account handles need the account directory backend.");
  if (walletAddress.toLowerCase() === recipient.toLowerCase()) throw new Error("Choose a different recipient address.");
  const network = getWalletAssetNetwork(asset);
  if (!network) throw new Error(`Sending from ${asset.chainLabel} is not supported yet. No transaction has been sent.`);
  const units = amountToBaseUnits(amount, asset.tokenDecimals);
  if (units <= 0n) throw new Error("Amount must be greater than zero.");
  const holdingRawBalance = rawBalance(asset);
  if (holdingRawBalance == null || units > holdingRawBalance) throw new Error("Amount exceeds the indexed wallet balance. Refresh your assets before sending.");

  const provider = requireProvider();
  const accountsValue = await provider.request({ method: "eth_accounts" });
  const accounts = Array.isArray(accountsValue) ? accountsValue : [];
  const activeAddress = typeof accounts[0] === "string" ? accounts[0] : "";
  if (!activeAddress || activeAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error("The active wallet account changed. Reconnect and review the recipient again.");
  }

  const chainValue = await provider.request({ method: "eth_chainId" });
  const activeChainId = typeof chainValue === "string" ? chainValue.toLowerCase() : "";
  if (activeChainId !== network.chainId) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainId }] });
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 4001) throw new Error("Network switch was rejected. No transaction was sent.");
      throw new Error(`Switch your wallet to ${network.label} manually, then retry. No transaction was sent.`);
    }
    const switchedChain = await provider.request({ method: "eth_chainId" });
    if (typeof switchedChain !== "string" || switchedChain.toLowerCase() !== network.chainId) {
      throw new Error(`Your wallet is not on ${network.label}. No transaction was sent.`);
    }
  }

  if (asset.contractAddress) {
    if (!isValidEvmAddress(asset.contractAddress)) {
      throw new Error("The token contract address is invalid. No transaction was sent.");
    }
    const balanceOfData = `0x70a08231${walletAddress.slice(2).toLowerCase().padStart(64, "0")}`;
    const onChainBalance = await provider.request({
      method: "eth_call",
      params: [{ to: asset.contractAddress, data: balanceOfData }, "latest"],
    });
    if (typeof onChainBalance !== "string" || !/^0x[a-fA-F0-9]+$/.test(onChainBalance)) {
      throw new Error("The wallet could not verify the token balance on-chain. No transaction was sent.");
    }
    let freshRawBalance: bigint;
    try { freshRawBalance = BigInt(onChainBalance); }
    catch { throw new Error("The token returned an invalid on-chain balance. No transaction was sent."); }
    if (units > freshRawBalance) throw new Error("The current on-chain token balance is lower than the indexed balance. Refresh and try again.");
  }

  const tx: Record<string, string> = { from: walletAddress, to: asset.contractAddress ?? recipient };
  if (asset.contractAddress) {
    const recipientWord = recipient.slice(2).toLowerCase().padStart(64, "0");
    const amountWord = units.toString(16).padStart(64, "0");
    tx.data = `0xa9059cbb${recipientWord}${amountWord}`;
    tx.value = "0x0";
  } else {
    tx.value = toHex(units);
  }

  const [estimateValue, gasPriceValue, nativeBalanceValue] = await Promise.all([
    provider.request({ method: "eth_estimateGas", params: [tx] }),
    provider.request({ method: "eth_gasPrice" }),
    provider.request({ method: "eth_getBalance", params: [walletAddress, "latest"] }),
  ]);
  if (typeof estimateValue !== "string" || typeof gasPriceValue !== "string" || typeof nativeBalanceValue !== "string") {
    throw new Error("The wallet couldn't estimate network fees. No transaction was sent.");
  }
  let gasLimit: bigint;
  let gasPrice: bigint;
  let nativeBalance: bigint;
  try {
    gasLimit = (BigInt(estimateValue) * 120n + 99n) / 100n;
    gasPrice = BigInt(gasPriceValue);
    nativeBalance = BigInt(nativeBalanceValue);
  } catch {
    throw new Error("The wallet returned invalid network fee data. No transaction was sent.");
  }
  const estimatedFee = gasLimit * gasPrice;
  const requiredNative = asset.contractAddress ? estimatedFee : units + estimatedFee;
  if (nativeBalance < requiredNative) {
    throw new Error(`Not enough ${network.label} native coin to cover the amount and estimated gas fees. No transaction was sent.`);
  }
  tx.gas = toHex(gasLimit);
  tx.gasPrice = toHex(gasPrice);

  try {
    const result = await provider.request({ method: "eth_sendTransaction", params: [tx] });
    if (typeof result !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(result)) {
      throw new Error("The wallet did not return a valid transaction hash.");
    }
    return result;
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code === 4001) throw new Error("You rejected the transaction in your wallet. No funds were sent.");
    throw error instanceof Error ? error : new Error("The wallet could not submit this transaction.");
  }
}
