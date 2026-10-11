import { useEffect, useState } from "react";
import BottomNav, { type PageId } from "./components/BottomNav";
import Icon from "./components/Icon";
import WalletCard from "./components/WalletCard";
import Activity from "./pages/Activity";
import Dashboard from "./pages/Dashboard";
import Merchant from "./pages/Merchant";
import More from "./pages/More";
import PaymentPreview from "./pages/PaymentPreview";
import Receive from "./pages/Receive";
import Send from "./pages/Send";
import { type InvoiceDraft, type TokenSymbol } from "./data/demo";

const desktopItems: { id: PageId; label: string; icon: "wallet" | "activity" | "send" | "receive" | "merchant" | "settings" }[] = [
  { id: "wallet", label: "Wallet overview", icon: "wallet" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "send", label: "Send money", icon: "send" },
  { id: "receive", label: "Receive money", icon: "receive" },
  { id: "merchant", label: "Merchant centre", icon: "merchant" },
  { id: "more", label: "Settings & more", icon: "settings" },
];

export default function App() {
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("ETH");
  const [activePage, setActivePage] = useState<PageId>("wallet");
  const [showOpening, setShowOpening] = useState(true);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(null);
  const [invoiceReturnPage, setInvoiceReturnPage] = useState<PageId>("send");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowOpening(false), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  const openInvoice = (draft: InvoiceDraft, returnPage: PageId) => {
    setInvoiceDraft(draft);
    setInvoiceReturnPage(returnPage);
    setActivePage("invoice");
  };

  const openSampleInvoice = () => {
    openInvoice({
      recipientName: "Emon Hossain · sample contact",
      recipientHandle: "emon@monad",
      recipientAddress: "0x2F41…9D07",
      amount: "₹1,500.00",
      currency: "INR",
      token: selectedToken,
      tokenAmount: "0.00625",
      exchangeRate: "Illustrative rate only",
      fee: "₹7.50 · sample",
      senderAddress: "Your wallet · demo address",
      createdAtLabel: new Date().toLocaleString("en-IN"),
    }, "activity");
  };

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
          <span><strong>Subtle Pay</strong><small>Wallet workspace</small></span>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Desktop navigation">
          {desktopItems.map((item) => (
            <button
              className={activePage === item.id ? "sidebar-link active" : "sidebar-link"}
              key={item.id}
              onClick={() => setActivePage(item.id)}
              type="button"
              aria-current={activePage === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {activePage === item.id && <span className="sidebar-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom-card">
          <span className="sidebar-bottom-icon"><Icon name="shield" size={18} /></span>
          <strong>Designed for clarity</strong>
          <p>Wallet services will connect in a later integration stage.</p>
          <span className="sidebar-demo-status"><span /> Preview environment</span>
        </div>
        <div className="sidebar-footer"><span className="sidebar-footer-dot" /> Prototype build <span>v0.1</span></div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <div className="mobile-header-brand">
            <span className="brand-monogram">S</span>
            <span><strong>Subtle Pay</strong><small>Wallet workspace</small></span>
          </div>
          <div className="header-status"><span className="header-status-dot" /> DEMO MODE</div>
          <div className="header-actions">
            <button type="button" className="icon-button" aria-label="Account and notifications" onClick={() => setActivePage("more")}><Icon name="bell" size={19} /><span className="notification-dot" /></button>
            <button type="button" className="header-profile" onClick={() => setActivePage("more")} aria-label="Open profile settings"><span>AS</span><Icon name="chevron-down" size={14} /></button>
          </div>
        </header>

        <main className="page-scroll">
          {activePage === "wallet" && <Dashboard selectedToken={selectedToken} onTokenChange={setSelectedToken} onNavigate={setActivePage} />}
          {activePage === "send" && <Send onBack={() => setActivePage("wallet")} onPreviewInvoice={(draft) => openInvoice(draft, "send")} />}
          {activePage === "receive" && <Receive />}
          {activePage === "merchant" && <Merchant />}
          {activePage === "more" && <More />}
          {activePage === "activity" && <Activity onOpenInvoice={openSampleInvoice} />}
          {activePage === "invoice" && invoiceDraft && <PaymentPreview draft={invoiceDraft} onBack={() => setActivePage(invoiceReturnPage)} />}
        </main>
      </div>
      <BottomNav active={activePage} onNavigate={setActivePage} />
    </div>
  );
}
