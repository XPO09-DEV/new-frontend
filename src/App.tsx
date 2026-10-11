import { useEffect, useState } from "react";
import BottomNav, { type PageId } from "./components/BottomNav";
import Icon from "./components/Icon";
import WalletCard from "./components/WalletCard";
import Activity from "./pages/Activity";
import Dashboard from "./pages/Dashboard";
import Merchant from "./pages/Merchant";
import More from "./pages/More";
import Receive from "./pages/Receive";
import Send from "./pages/Send";
import { type TokenSymbol } from "./data/walletData";

const desktopItems: { id: PageId; label: string; icon: "wallet" | "activity" | "send" | "receive" | "merchant" | "settings" }[] = [
  { id: "wallet", label: "Wallet", icon: "wallet" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "send", label: "Send money", icon: "send" },
  { id: "receive", label: "Receive money", icon: "receive" },
  { id: "merchant", label: "Merchant centre", icon: "merchant" },
  { id: "more", label: "Settings", icon: "settings" },
];

export default function App() {
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("ETH");
  const [activePage, setActivePage] = useState<PageId>("wallet");
  const [showOpening, setShowOpening] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowOpening(false), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  if (showOpening) {
    return (
      <div className="startup-screen">
        <div className="startup-canvas">
          <WalletCard selectedToken={selectedToken} onTokenChange={setSelectedToken} isOpening />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <span className="brand-monogram">S</span>
          <span><strong>Subtle Pay</strong><small>Wallet</small></span>
        </div>
        <div className="sidebar-label">MENU</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {desktopItems.map((item) => (
            <button className={activePage === item.id ? "sidebar-link active" : "sidebar-link"} key={item.id} onClick={() => setActivePage(item.id)} type="button" aria-current={activePage === item.id ? "page" : undefined}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{activePage === item.id && <span className="sidebar-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom-card">
          <span className="sidebar-bottom-icon"><Icon name="wallet" size={18} /></span>
          <strong>Wallet disconnected</strong>
          <p>Connect wallet services to load balances, rates and payment history.</p>
        </div>
        <div className="sidebar-footer">Subtle Pay <span>Wallet</span></div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <button type="button" className="mobile-menu-button" aria-label="Open more options" aria-expanded={showMobileMenu} aria-controls="mobile-more-menu" onClick={() => setShowMobileMenu((open) => !open)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" /></svg>
          </button>
          <div className="mobile-header-brand"><span className="brand-monogram">S</span><span><strong>Subtle Pay</strong><small>Wallet</small></span></div>
          <div className="header-status"><span className="header-status-dot" /> WALLET DISCONNECTED</div>
          <div className="header-actions">
            <button type="button" className="icon-button" aria-label="Open settings" onClick={() => setActivePage("more")}><Icon name="settings" size={19} /></button>
            <button type="button" className="header-profile" onClick={() => setActivePage("more")} aria-label="Open account settings"><Icon name="user" size={18} /></button>
          </div>
        </header>

        {showMobileMenu && (
          <div className="mobile-menu-backdrop" onClick={() => setShowMobileMenu(false)}>
            <nav id="mobile-more-menu" className="mobile-menu-panel" aria-label="More options" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-menu-heading">More</div>
              {desktopItems.map((item) => (
                <button className={activePage === item.id ? "mobile-menu-item active" : "mobile-menu-item"} key={item.id} type="button" onClick={() => { setActivePage(item.id); setShowMobileMenu(false); }}>
                  <Icon name={item.icon} size={18} /><span>{item.label}</span>{activePage === item.id && <span className="mobile-menu-active-dot" />}
                </button>
              ))}
            </nav>
          </div>
        )}

        <main className="page-scroll">
          {activePage === "wallet" && <Dashboard selectedToken={selectedToken} onTokenChange={setSelectedToken} onNavigate={setActivePage} />}
          {activePage === "send" && <Send onBack={() => setActivePage("wallet")} />}
          {activePage === "receive" && <Receive />}
          {activePage === "merchant" && <Merchant />}
          {activePage === "more" && <More />}
          {activePage === "activity" && <Activity />}
        </main>
      </div>
      <BottomNav active={activePage} onNavigate={setActivePage} />
    </div>
  );
}
