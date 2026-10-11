import { useState } from "react";
import Icon from "./Icon";
import { TOKENS, type TokenSymbol } from "../data/walletData";

const periods = ["1H", "1D", "1W", "1M", "1Y"] as const;

export default function MarketChart({ selectedToken }: { selectedToken: TokenSymbol }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>("1D");
  const token = TOKENS[selectedToken];

  return (
    <section className="panel market-panel">
      <div className="panel-heading">
        <div><div className="section-kicker">MARKETS</div><h2>{token.symbol} <span className="market-pair">/ USD</span></h2></div>
        <div className="market-price"><strong>—</strong><span className="neutral-text">Price unavailable</span></div>
      </div>
      <div className="chart-shell" role="img" aria-label={`${token.name} market chart unavailable until a market data provider is connected`}>
        <div className="chart-empty-grid">
          <div className="chart-empty-message"><Icon name="trend-up" size={20} /><strong>Market data unavailable</strong><span>Connect a market data provider to load prices and chart history.</span></div>
        </div>
      </div>
      <div className="chart-footer">
        <div className="chart-token-name"><span className={`token-mini token-${selectedToken.toLowerCase()}`}>{selectedToken.slice(0, 1)}</span><span>{token.name}</span></div>
        <div className="period-switcher" aria-label="Chart period">
          {periods.map((value) => <button className={period === value ? "period-button selected" : "period-button"} key={value} onClick={() => setPeriod(value)} type="button" disabled>{value}</button>)}
        </div>
      </div>
    </section>
  );
}
