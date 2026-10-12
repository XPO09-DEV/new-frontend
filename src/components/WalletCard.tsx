import Icon from "./Icon";
import type { WalletAsset } from "../services/walletService";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1000 ? 3 : value >= 1 ? 5 : 8 }).format(value);
}

function formatUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Math.abs(value) >= 1 ? 2 : 5 }).format(value);
}

function shortAddress(address: string) {
  return address.length > 16 ? `${address.slice(0, 7)}…${address.slice(-6)}` : address;
}

export default function WalletCard({
  selectedToken,
  onTokenChange,
  isOpening = false,
  walletAddress = null,
  walletAssets = [],
  walletStatus = "disconnected",
  walletError = null,
  onConnectWallet,
  onCopyAddress,
  onRefreshWallet,
  onDisconnectWallet,
}: {
  selectedToken: string;
  onTokenChange: (token: string) => void;
  isOpening?: boolean;
  walletAddress?: string | null;
  walletAssets?: WalletAsset[];
  walletStatus?: "disconnected" | "connecting" | "loading" | "ready" | "error";
  walletError?: string | null;
  onConnectWallet?: () => void;
  onCopyAddress?: () => void;
  onRefreshWallet?: () => void;
  onDisconnectWallet?: () => void;
}) {
  const token = walletAssets.find((asset) => asset.id === selectedToken) ?? walletAssets[0] ?? null;
  const busy = walletStatus === "connecting" || walletStatus === "loading";

  return (
    <section className={`glass-card wallet-card ${isOpening ? "wallet-card-opening" : ""} ${walletAddress ? "" : "wallet-card-disconnected"}`} aria-label="Wallet summary">
      <div className="wallet-card-top">
        <span className="card-brand">Subtle Pay</span>
        {token && (
          <label className="token-select-wrap">
            <span className="sr-only">Owned wallet asset</span>
            <select className="token-select" value={token.id} onChange={(event) => onTokenChange(event.target.value)} aria-label="Choose an asset held in this wallet">
              {walletAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.tokenSymbol} · {asset.chainLabel}</option>)}
            </select>
            <span className="token-select-chevron">⌄</span>
          </label>
        )}
      </div>

      {walletAddress ? (
        <div className="wallet-card-address" aria-label="Connected wallet address">
          <Icon name="wallet" size={12} />
          <span title={walletAddress}>{shortAddress(walletAddress)}</span>
          <button type="button" onClick={onCopyAddress} aria-label="Copy wallet address" title="Copy address"><Icon name="copy" size={12} /></button>
          {onRefreshWallet && <button type="button" onClick={onRefreshWallet} disabled={busy} aria-label="Refresh wallet assets" title="Refresh wallet assets"><Icon name="refresh" size={12} /></button>}
          {onDisconnectWallet && <button type="button" className="wallet-disconnect-button" onClick={onDisconnectWallet} aria-label="Disconnect wallet" title="Disconnect wallet"><Icon name="logout" size={12} /></button>}
        </div>
      ) : (
        <div className="wallet-card-address muted"><Icon name="shield" size={12} /><span>Non-custodial · Connect your wallet to view real balances</span></div>
      )}

      <div className={`wallet-balance-row ${token ? "" : "wallet-balance-row-empty"}`}>
        <div className="wallet-balance-main">
          <span className="eyebrow light">QUANTITY HELD</span>
          <div className="wallet-token-quantity">{token ? formatAmount(token.balance) : "—"}{token && <span>{token.tokenSymbol}</span>}</div>
          <span className="wallet-token-name">{token ? `${token.tokenName} · ${token.chainLabel}` : walletAddress ? (walletStatus === "error" ? "Balances unavailable" : "No supported asset balances found") : "Your assets stay in your wallet"}</span>
          {!walletAddress && !isOpening && (
            <button type="button" className="wallet-connect-button" onClick={onConnectWallet} disabled={busy}>
              <Icon name={busy ? "refresh" : "wallet"} size={14} /> {busy ? "Connecting…" : "Connect wallet"}
            </button>
          )}
          {walletError && walletAddress && <span className="wallet-inline-error" title={walletError}>{walletError}</span>}
        </div>
        <div className="wallet-market-value">
          <span className="eyebrow light">MARKET VALUE</span>
          <strong>{token ? formatUsd(token.balanceUsd) : "—"}</strong>
          <span>{token ? (token.balanceUsd == null ? "Price unavailable" : "Market value · USD") : walletAddress ? (walletStatus === "loading" ? "Syncing on-chain assets…" : "Only verified indexed assets") : "No wallet connected"}</span>
        </div>
      </div>
      <div className="wallet-card-divider" />
      <div className="wallet-flow-row">
        <div><span className="flow-label"><span className="flow-dot outgoing" />Outgoing total</span><strong>—</strong></div>
        <div><span className="flow-label"><span className="flow-dot incoming" />Incoming total</span><strong>—</strong></div>
      </div>
    </section>
  );
}
