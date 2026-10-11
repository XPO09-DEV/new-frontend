import { useState } from "react";
import type { PageId } from "../components/BottomNav";
import Icon from "../components/Icon";
import MarketChart from "../components/MarketChart";
import WalletCard from "../components/WalletCard";
import { FIAT_CURRENCIES, type TokenSymbol } from "../data/walletData";

function walletGreeting(displayName: string) {
  const name = displayName.trim();
  if (!name) return "Your wallet";
  if (name.includes("@")) return name.toLowerCase();
  const firstName = name.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return firstName ? `${firstName}@monad` : "Your wallet";
}

export default function Dashboard({
  selectedToken,
  onTokenChange,
  onNavigate,
  displayName,
}: {
  selectedToken: TokenSymbol;
  onTokenChange: (token: TokenSymbol) => void;
  onNavigate: (page: PageId) => void;
  displayName: string;
}) {
  const [currency, setCurrency] = useState("INR");
  const quickActions: { page: PageId; label: string; icon: "send" | "receive" | "merchant" | "more"; helper: string }[] = [
    { page: "send", label: "Send Money", icon: "send", helper: "To a person" },
    { page: "receive", label: "Receive Money", icon: "receive", helper: "Your address & QR" },
    { page: "merchant", label: "Merchant Payment", icon: "merchant", helper: "Pay a business" },
    { page: "more", label: "More", icon: "more", helper: "Account & security" },
  ];

  return (
    <div className="page-stack dashboard-page">
      <div className="page-intro wallet-greeting-intro">
        <h1 className="wallet-greeting">{walletGreeting(displayName)}</h1>
      </div>


      <WalletCard selectedToken={selectedToken} onTokenChange={onTokenChange} />

      <section className="panel fx-panel">
        <div className="panel-heading compact">
          <div><div className="section-kicker">FIAT CURRENCIES</div><h2>Currency converter</h2></div>
          <label className="select-wrap compact-select"><span className="sr-only">Choose currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Choose display currency">{FIAT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select><Icon name="chevrons-up-down" size={14} /></label>
        </div>
        <div className="currency-converter-row"><div><span className="muted-label">1 USD in {currency}</span><strong>—</strong><span className="tiny-note">Exchange rate unavailable</span></div><div className="currency-globe"><Icon name="globe" size={20} /></div></div>
        <div className="rates-unavailable"><Icon name="info" size={16} /><span>Live conversion rates will appear after the rate provider is connected.</span></div>
        <p className="panel-footnote">{FIAT_CURRENCIES.length} currencies are available for selection. Supported conversions depend on live rate availability.</p>
      </section>

      <MarketChart selectedToken={selectedToken} />

      <section className="quick-actions-section">
        <div className="section-header"><div><div className="section-kicker">PAYMENTS</div><h2>Quick actions</h2></div></div>
        <div className="quick-action-grid">{quickActions.map((action, index) => <button className="quick-action" key={action.page} onClick={() => onNavigate(action.page)} type="button"><span className={`quick-action-icon action-tone-${index}`}><Icon name={action.icon} size={21} /></span><span className="quick-action-copy"><strong>{action.label}</strong><small>{action.helper}</small></span><Icon name="arrow-right" size={16} className="quick-action-arrow" /></button>)}</div>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">PAYMENT HISTORY</div><h2>Recent activity</h2></div><button type="button" className="text-button" onClick={() => onNavigate("activity")}>View all <Icon name="arrow-right" size={15} /></button></div>
        <div className="empty-activity"><Icon name="activity" size={21} /><strong>No transactions yet</strong><span>Confirmed activity will appear here when the wallet is connected.</span></div>
      </section>
      <div className="mobile-nav-spacer" />
    </div>
  );
}
