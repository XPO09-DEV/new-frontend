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
 * Temporary frontend-only Ankr setup for local development.
 * VITE_* secrets are visible to users in the browser bundle and network requests.
 * Never use this direct-key mode in a public production deployment.
 */
const API_KEY = (import.meta.env.VITE_ANKR_API_KEY as string | undefined)?.trim() ?? "";
const MULTICHAIN_URL = API_KEY ? `https://rpc.ankr.com/multichain/${encodeURIComponent(API_KEY)}` : "";
const MONAD_RPC_URL = API_KEY ? `https://rpc.ankr.com/monad/${encodeURIComponent(API_KEY)}` : "";
const BALANCE_CACHE_TTL = 60_000;
const balanceCache = new Map<string, { savedAt: number; assets: WalletAsset[] }>();

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

async function postAnkr<T>(url: string, method: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Ankr request failed (${response.status}). Please retry in a moment.`);
  const payload = await response.json() as { error?: { message?: string }; result?: T };
  if (payload.error) throw new Error(payload.error.message || "Ankr couldn't return wallet data for this address.");
  if (payload.result == null) throw new Error("Ankr returned an empty wallet response.");
  return payload.result;
}

async function fetchMonadNativeBalance(address: string): Promise<WalletAsset | null> {
  if (!MONAD_RPC_URL) return null;
  const response = await fetch(MONAD_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Monad balance request failed (${response.status}).`);
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (payload.error || typeof payload.result !== "string") throw new Error(payload.error?.message || "Monad balance unavailable.");

  let raw: bigint;
  try { raw = BigInt(payload.result); } catch { throw new Error("Monad returned an invalid native balance."); }
  if (raw <= 0n) return null;
  const amount = Number(raw) / 1e18;
  if (!Number.isFinite(amount)) return null;
  return {
    id: "monad:native:mon",
    blockchain: "monad",
    chainLabel: "Monad",
    tokenName: "Monad",
    tokenSymbol: "MON",
    balance: amount,
    balanceRawInteger: raw.toString(),
    balanceUsd: null,
    priceUsd: null,
    tokenDecimals: 18,
    contractAddress: null,
    thumbnail: null,
    tokenType: "Native coin",
  };
}

/**
 * Temporary direct Ankr wallet discovery for local testing.
 * The browser calls Ankr directly; the Vite key is public and must be rotated/moved
 * server-side before this frontend is deployed to real users.
 */
export async function fetchWalletAssets(address: string, force = false): Promise<WalletAsset[]> {
  const normalizedAddress = address.trim();
  if (!isValidEvmAddress(normalizedAddress)) throw new Error("Enter a valid EVM wallet address.");
  if (!API_KEY || !MULTICHAIN_URL) {
    throw new Error("Ankr isn't configured. Add VITE_ANKR_API_KEY to your local .env.local file, then restart the frontend.");
  }

  const cacheKey = normalizedAddress.toLowerCase();
  const cached = balanceCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.savedAt < BALANCE_CACHE_TTL) return cached.assets;

  const [accountResult, monadResult] = await Promise.allSettled([
    (async () => {
      const all: WalletAsset[] = [];
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const params: Record<string, unknown> = {
          walletAddress: normalizedAddress,
          nativeFirst: true,
          onlyWhitelisted: false,
          pageSize: 100,
        };
        if (pageToken) params.pageToken = pageToken;
        const result = await postAnkr<{ assets?: AnkrAssetResponse[]; nextPageToken?: string }>(
          MULTICHAIN_URL, "ankr_getAccountBalance", params,
        );
        all.push(...(result.assets ?? []).map(normalizeAnkrAsset).filter((asset): asset is WalletAsset => asset !== null));
        pageToken = result.nextPageToken || undefined;
        pages += 1;
      } while (pageToken && pages < 5);
      return all;
    })(),
    fetchMonadNativeBalance(normalizedAddress),
  ]);

  const assets: WalletAsset[] = [];
  if (accountResult.status === "fulfilled") assets.push(...accountResult.value);
  if (monadResult.status === "fulfilled" && monadResult.value) assets.push(monadResult.value);

  // If the multichain indexer failed, return only when the Monad RPC provided a real balance.
  if (accountResult.status === "rejected" && !(monadResult.status === "fulfilled" && monadResult.value)) {
    const reason = accountResult.reason;
    throw reason instanceof Error ? reason : new Error("Couldn't load wallet assets from Ankr. Check the API key and network.");
  }
  if (accountResult.status === "rejected" && monadResult.status === "fulfilled" && monadResult.value) {
    // Keep the native Monad result; non-Monad assets may be missing until the indexer recovers.
  } else if (accountResult.status === "fulfilled" && monadResult.status === "rejected") {
    // The indexed multi-chain list is still useful even if the optional native Monad request fails.
  }

  const unique = new Map<string, WalletAsset>();
  for (const asset of assets) {
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
