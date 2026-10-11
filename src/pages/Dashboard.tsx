import { useState } from "react";
import type { PageId } from "../components/BottomNav";
import Icon from "../components/Icon";
import MarketChart from "../components/MarketChart";
import WalletCard from "../components/WalletCard";
import { DEMO_FX, DEMO_TRANSACTIONS, FIAT_CURRENCIES, formatFiat, type TokenSymbol } from "../data/demo";

export default function Dashboard({
  selectedToken,
  onTokenChange,
  onNavigate,
}: {
  selectedToken: TokenSymbol;
  onTokenChange: (token: TokenSymbol) => void;
  onNavigate: (page: PageId) => void;
}) {
  const [currency, setCurrency] = useState("INR");
  const currentCurrency = FIAT_CURRENCIES.find((item) => item.code === currency) ?? FIAT_CURRENCIES[0];
  const quickActions: { page: PageId; label: string; icon: "send" | "receive" | "merchant" | "more"; helper: string }[] = [
    { page: "send", label: "Send Money", icon: "send", helper: "To a person" },
    { page: "receive", label: "Receive Money", icon: "receive", helper: "Your QR & address" },
    { page: "merchant", label: "Merchant Payment", icon: "merchant", helper: "Business payments" },
    { page: "more", label: "More", icon: "more", helper: "Account & security" },
  ];

  return (
    <div className="page-stack dashboard-page">
      <div className="page-intro">
        <div><div className="section-kicker">YOUR MONEY, IN MOTION</div><h1>Wallet overview</h1><p>A clearer view of your digital assets.</p></div>
        <button className="icon-button notification-button" type="button" aria-label="Open account settings" onClick={() => onNavigate("more")}><Icon name="bell" size={19} /><span className="notification-dot" /></button>
      </div>

      <div className="preview-banner"><Icon name="info" size={17} /><span><strong>Preview mode.</strong> All balances, rates and activity below are sample data. No wallet is connected.</span></div>

      <WalletCard selectedToken={selectedToken} onTokenChange={onTokenChange} />

      <section className="panel fx-panel">
        <div className="panel-heading compact">
          <div><div className="section-kicker">CURRENCY EXCHANGE</div><h2>Global rates <span className="demo-tag">SAMPLE</span></h2></div>
          <label className="select-wrap compact-select"><span className="sr-only">Choose display currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Display currency">{FIAT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select><Icon name="chevrons-up-down" size={14} /></label>
        </div>
        <div className="currency-converter-row"><div><span className="muted-label">Indicative value</span><strong>{formatFiat(1 / currentCurrency.demoUsdPerUnit, currency)}</strong><span className="tiny-note">for 1 USD · demo estimate only</span></div><div className="currency-globe"><Icon name="globe" size={20} /></div></div>
        <div className="rates-strip">{DEMO_FX.map((rate) => <div className="rate-chip" key={rate.pair}><span>{rate.pair}</span><strong>{rate.value}</strong><small className={rate.change.startsWith("+") ? "positive-text" : "neutral-text"}>{rate.change}</small></div>)}</div>
        <p className="panel-footnote">More than 70 fiat currencies are available in the interface. Rates are illustrative until a live provider is connected.</p>
      </section>

      <MarketChart selectedToken={selectedToken} />

      <section className="quick-actions-section">
        <div className="section-header"><div><div className="section-kicker">MOVE WITH SUBTLE</div><h2>Quick actions</h2></div></div>
        <div className="quick-action-grid">{quickActions.map((action, index) => <button className="quick-action" key={action.page} onClick={() => onNavigate(action.page)} type="button"><span className={`quick-action-icon action-tone-${index}`}><Icon name={action.icon} size={21} /></span><span className="quick-action-copy"><strong>{action.label}</strong><small>{action.helper}</small></span><Icon name="arrow-right" size={16} className="quick-action-arrow" /></button>)}</div>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">YOUR LATEST MOVES</div><h2>Recent activity <span className="demo-tag">SAMPLE</span></h2></div><button type="button" className="text-button" onClick={() => onNavigate("activity")}>View all <Icon name="arrow-right" size={15} /></button></div>
        <div className="transaction-list">{DEMO_TRANSACTIONS.slice(0, 3).map((tx) => <div className="transaction-row" key={tx.id}><span className={`transaction-icon ${tx.direction}`}><Icon name={tx.direction === "incoming" ? "arrow-down-left" : "arrow-up-right"} size={18} /></span><span className="transaction-main"><strong>{tx.name}</strong><small>{tx.detail}</small></span><span className={`transaction-amount ${tx.direction}`}>{tx.amount}<small>{tx.status}</small></span></div>)}</div>
      </section>
      <div className="mobile-nav-spacer" />
    </div>
  );
}
