import { useCallback, useEffect, useState } from "react";
import AccountGate from "./components/AccountGate";
import { logoutAccount, restoreAccountSession, updateAccountProfile, type AccountProfile } from "./services/accountService";
import BottomNav, { type PageId } from "./components/BottomNav";
import Icon from "./components/Icon";
import WalletCard from "./components/WalletCard";
import Activity from "./pages/Activity";
import Dashboard from "./pages/Dashboard";
import Merchant from "./pages/Merchant";
import More from "./pages/More";
import Notifications from "./pages/Notifications";
import Receive from "./pages/Receive";
import Send from "./pages/Send";
import { type WalletAsset, copyText, fetchWalletAssets, getChainLabel } from "./services/walletService";

type WalletStatus = "disconnected" | "connecting" | "loading" | "ready" | "error";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const item = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function hasResumeConsent() {
  return readCookie("subtlepay_resume_choice") === "yes";
}

function readRestorablePage(): PageId {
  if (!hasResumeConsent()) return "wallet";
  try {
    const page = window.localStorage.getItem("subtlePayLastPage") as PageId | null;
    return page && ["wallet", "activity", "notifications", "send", "receive", "merchant", "more"].includes(page) ? page : "wallet";
  } catch {
    return "wallet";
  }
}

function walletNameKey(address: string) {
  return `subtlePayWalletName:${address.toLowerCase()}`;
}

function readSavedName(address?: string | null) {
  try {
    if (address) {
      const key = walletNameKey(address);
      const scoped = window.localStorage.getItem(key);
      if (scoped !== null) return scoped.trim();

      // Migrate an older single-device name to the first wallet it is associated with.
      const legacy = window.localStorage.getItem("subtlePayUserName")?.trim() ?? "";
      window.localStorage.setItem(key, legacy);
      window.localStorage.removeItem("subtlePayUserName");
      return legacy;
    }
    return window.localStorage.getItem("subtlePayUserName")?.trim() ?? "";
  } catch {
    return "";
  }
}

export default function App() {
  const [selectedToken, setSelectedToken] = useState(() => {
    if (!hasResumeConsent()) return "";
    try { return window.localStorage.getItem("subtlePayLastAsset") ?? ""; } catch { return ""; }
  });
  const [activePage, setActivePage] = useState<PageId>(readRestorablePage);
  const [prefilledRecipient, setPrefilledRecipient] = useState("");
  const [showOpening, setShowOpening] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [displayName, setDisplayName] = useState(readSavedName);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<string | null>(null);
  const [walletAssets, setWalletAssets] = useState<WalletAsset[]>([]);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("disconnected");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [resumeConsent, setResumeConsent] = useState(hasResumeConsent);
  const [showConsent, setShowConsent] = useState(() => readCookie("subtlepay_resume_choice") == null);

  const refreshWallet = useCallback(async (address: string, force = false) => {
    setWalletStatus((current) => current === "disconnected" ? "loading" : current);
    setWalletError(null);
    try {
      const assets = await fetchWalletAssets(address, force);
      setWalletAssets(assets);
      setWalletStatus("ready");
      setSelectedToken((current) => assets.some((asset) => asset.id === current) ? current : assets[0]?.id ?? "");
    } catch (error) {
      setWalletStatus("error");
      setWalletError(error instanceof Error ? error.message : "Wallet balances couldn't be loaded.");
    }
  }, []);

  const connectWallet = useCallback(() => {
    setWalletError("Sign in to use the Subtle Pay account wallet. External wallet transfers are disabled in this testnet payment flow.");
  }, []);

  const disconnectWallet = useCallback(() => {
    void logoutAccount().catch(() => undefined);
    setAccountProfile(null);
    setWalletAddress(null);
    setWalletChainId(null);
    setWalletAssets([]);
    setSelectedToken("");
    setWalletError(null);
    setWalletStatus("disconnected");
    setActivePage("wallet");
  }, []);

  const copyWalletAddress = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await copyText(walletAddress);
      window.dispatchEvent(new CustomEvent("subtlepay:notice", { detail: "Wallet address copied." }));
    } catch {
      setWalletError("Copy is unavailable in this browser.");
    }
  }, [walletAddress]);

  useEffect(() => {
    let alive = true;
    void restoreAccountSession().then((profile) => {
      if (!alive) return;
      setAccountProfile(profile);
      setDisplayName(profile?.displayName ?? "");
      setWalletAddress(profile?.walletAddress ?? null);
      setWalletChainId(profile ? "0x279f" : null);
      setWalletStatus(profile?.walletAddress ? "loading" : "disconnected");
    }).finally(() => {
      if (alive) setAccountLoading(false);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setShowOpening(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    let alive = true;
    const load = async (force = false) => {
      try {
        const assets = await fetchWalletAssets(walletAddress, force);
        if (!alive) return;
        setWalletAssets(assets);
        setWalletStatus("ready");
        setWalletError(null);
        setSelectedToken((current) => assets.some((asset) => asset.id === current) ? current : assets[0]?.id ?? "");
      } catch (error) {
        if (!alive) return;
        setWalletStatus("error");
        setWalletError(error instanceof Error ? error.message : "Wallet balances couldn't be loaded.");
      }
    };
    setWalletStatus("loading");
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(true);
    }, 120_000);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [walletAddress]);

  useEffect(() => {
    const syncNotice = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) {
        document.title = message;
        window.setTimeout(() => { document.title = "Subtle Pay"; }, 1800);
      }
    };
    window.addEventListener("subtlepay:notice", syncNotice);
    return () => window.removeEventListener("subtlepay:notice", syncNotice);
  }, []);

  useEffect(() => {
    if (!resumeConsent) return;
    try {
      window.localStorage.setItem("subtlePayLastPage", activePage);
      if (selectedToken) window.localStorage.setItem("subtlePayLastAsset", selectedToken);
    } catch {
      // Local progress is optional; the app remains usable when storage is disabled.
    }
  }, [resumeConsent, activePage, selectedToken]);

  function saveDisplayName(value: string) {
    const cleaned = value.trim().slice(0, 80);
    setDisplayName(cleaned);
    void updateAccountProfile({ displayName: cleaned || null }).then((updated) => {
      setAccountProfile((current) => current ? { ...current, ...updated } : current);
    }).catch((error) => {
      window.dispatchEvent(new CustomEvent("subtlepay:notice", { detail: error instanceof Error ? error.message : "Profile update failed." }));
    });
  }

  function chooseResumeConsent(allow: boolean) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `subtlepay_resume_choice=${allow ? "yes" : "no"}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    setResumeConsent(allow);
    setShowConsent(false);
    if (allow) {
      try {
        window.localStorage.setItem("subtlePayLastPage", activePage);
        if (selectedToken) window.localStorage.setItem("subtlePayLastAsset", selectedToken);
      } catch {
        // Optional persistence.
      }
    } else {
      try {
        window.localStorage.removeItem("subtlePayLastPage");
        window.localStorage.removeItem("subtlePayLastAsset");
      } catch {
        // Optional persistence.
      }
    }
  }

  if (showOpening) {
    return (
      <div className="startup-screen">
        <div className="startup-canvas">
          <WalletCard selectedToken={selectedToken} onTokenChange={setSelectedToken} isOpening />
        </div>
      </div>
    );
  }

  if (accountLoading) {
    return <main className="account-gate"><section className="account-gate-card"><strong>Subtle Pay</strong><p className="account-gate-muted">Restoring your secure account session…</p></section></main>;
  }

  if (!accountProfile) {
    return <AccountGate onAuthenticated={(profile) => {
      setAccountProfile(profile);
      setDisplayName(profile.displayName ?? "");
      setWalletAddress(profile.walletAddress);
      setWalletChainId("0x279f");
      setWalletStatus("loading");
      setActivePage("wallet");
    }} />;
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
          {[
            { id: "wallet", label: "Wallet", icon: "wallet" },
            { id: "activity", label: "Activity", icon: "activity" },
            { id: "notifications", label: "Notifications", icon: "bell" },
            { id: "send", label: "Send money", icon: "send" },
            { id: "receive", label: "Receive money", icon: "receive" },
            { id: "merchant", label: "Merchant centre", icon: "merchant" },
            { id: "more", label: "Settings", icon: "settings" },
          ].map((item) => (
            <button className={activePage === item.id ? "sidebar-link active" : "sidebar-link"} key={item.id} onClick={() => setActivePage(item.id as PageId)} type="button" aria-current={activePage === item.id ? "page" : undefined}>
              <Icon name={item.icon as "wallet"} size={19} /><span>{item.label}</span>{activePage === item.id && <span className="sidebar-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom-card">
          <span className="sidebar-bottom-icon"><Icon name="wallet" size={18} /></span>
          <strong>{walletAddress ? "Wallet connected" : "Wallet disconnected"}</strong>
          <p>{walletAddress ? `${walletAddress.slice(0, 7)}…${walletAddress.slice(-5)} · ${getChainLabel(walletChainId)}` : "Connect a wallet to load real token balances and network details."}</p>
        </div>
        <div className="sidebar-footer">Subtle Pay <span>Wallet</span></div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <button type="button" className="mobile-menu-button" aria-label="Open navigation" aria-expanded={showMobileMenu} aria-controls="mobile-more-menu" onClick={() => setShowMobileMenu((open) => !open)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" /></svg>
          </button>
        </header>

        {showMobileMenu && (
          <div className="mobile-menu-backdrop" onClick={() => setShowMobileMenu(false)}>
            <nav id="mobile-more-menu" className="mobile-menu-panel" aria-label="Navigation menu" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-menu-heading">Navigate</div>
              {[
                { id: "wallet", label: "Wallet", icon: "wallet" },
                { id: "activity", label: "Activity", icon: "activity" },
                { id: "notifications", label: "Notifications", icon: "bell" },
                { id: "send", label: "Send money", icon: "send" },
                { id: "receive", label: "Receive money", icon: "receive" },
                { id: "merchant", label: "Merchant centre", icon: "merchant" },
                { id: "more", label: "Settings", icon: "settings" },
              ].map((item) => (
                <button className={activePage === item.id ? "mobile-menu-item active" : "mobile-menu-item"} key={item.id} type="button" onClick={() => { setActivePage(item.id as PageId); setShowMobileMenu(false); }}>
                  <Icon name={item.icon as "wallet"} size={18} /><span>{item.label}</span>{activePage === item.id && <span className="mobile-menu-active-dot" />}
                </button>
              ))}
            </nav>
          </div>
        )}

        <main className="page-scroll">
          {activePage === "wallet" && <Dashboard
            selectedToken={selectedToken}
            onTokenChange={setSelectedToken}
            onNavigate={setActivePage}
            onSendToContact={(recipient) => { setPrefilledRecipient(recipient); setActivePage("send"); }}
            displayName={displayName}
            onDisplayNameChange={saveDisplayName}
            walletAddress={walletAddress}
            walletAssets={walletAssets}
            walletStatus={walletStatus}
            walletError={walletError}
            onConnectWallet={connectWallet}
            onCopyAddress={copyWalletAddress}
            onRefreshWallet={() => { if (walletAddress) void refreshWallet(walletAddress, true); }}
            onDisconnectWallet={disconnectWallet}
          />}
          {activePage === "send" && <Send
            onBack={() => { setPrefilledRecipient(""); setActivePage("wallet"); }}
            initialRecipient={prefilledRecipient}
            walletAddress={walletAddress}
            walletChainId={walletChainId}
            walletAssets={walletAssets}
            onConnectWallet={connectWallet}
            onTransactionSubmitted={() => { if (walletAddress) void refreshWallet(walletAddress, true); }}
          />}
          {activePage === "receive" && <Receive
            walletAddress={walletAddress}
            walletChainId={walletChainId}
            displayName={displayName}
            onConnectWallet={connectWallet}
          />}
          {activePage === "merchant" && <Merchant />}
          {activePage === "more" && <More accountId={accountProfile.accountId} walletAddress={walletAddress} onLogout={disconnectWallet} />}
          {activePage === "activity" && <Activity />}
          {activePage === "notifications" && <Notifications />}
        </main>
      </div>
      <BottomNav active={activePage} onNavigate={setActivePage} />

      {showConsent && (
        <div className="resume-consent-backdrop" role="presentation">
          <section className="resume-consent-panel" role="dialog" aria-modal="true" aria-labelledby="resume-consent-title">
            <span className="resume-consent-icon"><Icon name="shield" size={21} /></span>
            <div>
              <h2 id="resume-consent-title">Pick up where you left off?</h2>
              <p>Allow Subtle Pay to remember the last page and selected asset on this device. This stays in your browser; it is not analytics and is not sent to a server. You can refuse and still use the wallet.</p>
              <div className="resume-consent-actions">
                <button type="button" className="secondary-button" onClick={() => chooseResumeConsent(false)}>Not now</button>
                <button type="button" className="primary-button" onClick={() => chooseResumeConsent(true)}>Allow remembering</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
