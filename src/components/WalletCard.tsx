import { TOKENS, type TokenSymbol } from "../data/demo";

export default function WalletCard({
  selectedToken,
  onTokenChange,
  isOpening = false,
}: {
  selectedToken: TokenSymbol;
  onTokenChange: (token: TokenSymbol) => void;
  isOpening?: boolean;
}) {
  const token = TOKENS[selectedToken];

  return (
    <section className={`glass-card wallet-card ${isOpening ? "wallet-card-opening" : ""}`} aria-label="Wallet summary preview">
      <div className="wallet-card-top">
        <span className="card-brand">Subtle Pay</span>
        <label className="token-select-wrap">
          <span className="sr-only">Selected token</span>
          <select className="token-select" value={selectedToken} onChange={(event) => onTokenChange(event.target.value as TokenSymbol)} aria-label="Choose token">
            {Object.values(TOKENS).map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
          <span className="token-select-chevron">⌄</span>
        </label>
      </div>
      <div className="wallet-balance-row">
        <div className="wallet-balance-main">
          <span className="eyebrow light">TOTAL HELD · DEMO</span>
          <div className="wallet-token-quantity">{token.quantity}<span>{token.symbol}</span></div>
          <span className="wallet-token-name">{token.name}</span>
        </div>
        <div className="wallet-market-value"><span className="eyebrow light">MARKET VALUE</span><strong>{token.valueUsd}</strong><span>Sample estimate</span></div>
      </div>
      <div className="wallet-card-divider" />
      <div className="wallet-flow-row">
        <div><span className="flow-label"><span className="flow-dot outgoing" />Outgoing total</span><strong>{token.outgoing}</strong></div>
        <div><span className="flow-label"><span className="flow-dot incoming" />Incoming total</span><strong>{token.incoming}</strong></div>
      </div>
    </section>
  );
}
