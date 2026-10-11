import { useState } from "react";
import Icon from "./Icon";
import { TOKENS, type TokenSymbol } from "../data/demo";

const periods = ["1H", "1D", "1W", "1M", "1Y"] as const;
type Period = (typeof periods)[number];
const lineSets: Record<Period, string> = {
  "1H": "0,88 16,78 29,83 42,58 57,67 72,46 87,53 102,37 118,43 135,22 151,34 168,17 183,28 199,13 216,24 232,9 248,18 266,7 284,14 300,4",
  "1D": "0,82 16,88 29,65 42,72 57,49 72,60 87,34 102,40 118,28 135,45 151,20 168,29 183,18 199,35 216,17 232,23 248,11 266,18 284,7 300,11",
  "1W": "0,69 16,74 29,62 42,77 57,53 72,58 87,42 102,49 118,31 135,38 151,25 168,30 183,14 199,28 216,20 232,24 248,14 266,17 284,9 300,5",
  "1M": "0,91 16,78 29,83 42,61 57,69 72,48 87,54 102,33 118,42 135,28 151,37 168,23 183,29 199,15 216,25 232,19 248,13 266,16 284,7 300,3",
  "1Y": "0,96 16,88 29,92 42,71 57,75 72,59 87,61 102,49 118,41 135,51 151,31 168,39 183,22 199,31 216,19 232,27 248,13 266,19 284,8 300,4",
};

export default function MarketChart({ selectedToken }: { selectedToken: TokenSymbol }) {
  const [period, setPeriod] = useState<Period>("1D");
  const token = TOKENS[selectedToken];
  const price = token.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const lastPoint = lineSets[period].split(" ").at(-1)?.split(",") ?? ["300", "10"];

  return (
    <section className="panel market-panel">
      <div className="panel-heading"><div><div className="section-kicker">MARKET OVERVIEW · DEMO</div><h2>{token.symbol} <span className="market-pair">/ USD</span></h2></div><div className="market-price"><strong>${price}</strong><span className="positive-text"><Icon name="trend-up" size={14} /> Sample market value</span></div></div>
      <div className="chart-demo-note"><span className="demo-dot" /> Illustrative chart · not live market data</div>
      <div className="chart-shell" role="img" aria-label={`Illustrative ${token.symbol} chart for the ${period} period`}>
        <div className="chart-grid"><svg viewBox="0 0 300 112" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8DA9FF" stopOpacity=".3" /><stop offset="100%" stopColor="#8DA9FF" stopOpacity="0" /></linearGradient></defs><path d={`M ${lineSets[period]} L 300 112 L 0 112 Z`} fill="url(#chartArea)" /><polyline points={lineSets[period]} fill="none" stroke="#7696FF" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /><circle cx={Number(lastPoint[0])} cy={Number(lastPoint[1])} r="3.2" fill="#AFC0FF" /></svg><div className="chart-time-labels"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div></div>
      </div>
      <div className="chart-footer"><div className="chart-token-name"><span className={`token-mini token-${selectedToken.toLowerCase()}`}>{selectedToken.slice(0, 1)}</span><span>{token.name}</span></div><div className="period-switcher" aria-label="Chart period">{periods.map((value) => <button className={period === value ? "period-button selected" : "period-button"} key={value} onClick={() => setPeriod(value)} type="button">{value}</button>)}</div></div>
    </section>
  );
}
