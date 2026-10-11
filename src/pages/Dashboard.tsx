import type { PageId } from "../components/BottomNav";
import Icon from "../components/Icon";
import WalletCard from "../components/WalletCard";
import TokenAssetsWidget from "../components/TokenAssetsWidget";
import { type TokenSymbol } from "../data/walletData";

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
  const quickActions: { page: PageId; label: string; icon: "send" | "receive" | "merchant" | "more" }[] = [
    { page: "send", label: "Send", icon: "send" },
    { page: "receive", label: "Receive", icon: "receive" },
    { page: "merchant", label: "Merchant", icon: "merchant" },
    { page: "more", label: "More", icon: "more" },
  ];

  return (
    <div className="page-stack dashboard-page">
      <div className="page-intro wallet-greeting-intro">
        <h1 className="wallet-greeting">{walletGreeting(displayName)}</h1>
      </div>


      <WalletCard selectedToken={selectedToken} onTokenChange={onTokenChange} />

      <section className="quick-actions-section" aria-label="Wallet actions">
        <div className="quick-action-grid">
          {quickActions.map((action) => (
            <button className="quick-action" key={action.page} onClick={() => onNavigate(action.page)} type="button">
              <span className="quick-action-icon"><Icon name={action.icon} size={22} /></span>
              <span className="quick-action-copy"><strong>{action.label}</strong></span>
            </button>
          ))}
        </div>
      </section>

      <TokenAssetsWidget
        apiKey={import.meta.env.VITE_COINSTATS_API_KEY ?? ""}
        baseUrl={import.meta.env.VITE_COINSTATS_API_BASE_URL || "https://openapiv1.coinstats.app"}
        keyHeader={import.meta.env.VITE_COINSTATS_API_KEY_HEADER || "X-API-KEY"}
        visibleTokens={3}
      />




      <div className="mobile-nav-spacer" />
    </div>
  );
}
