import { useState } from "react";
import Icon, { type IconName } from "../components/Icon";
import CurrencyPreference from "../components/CurrencyPreference";

type SectionId = "account" | "security" | "merchant" | "privacy";

const groups: { id: SectionId; title: string; description: string; icon: IconName; rows: { title: string; description: string; icon: IconName }[] }[] = [
  { id: "account", title: "Account management", description: "Profile, accounts and wallet handle", icon: "user", rows: [
    { title: "Personal information", description: "Name and account details", icon: "user" },
    { title: "Wallet handle", description: "Manage your custom receiving name", icon: "link" },
    { title: "Accounts and switching", description: "Add, switch or request account deletion", icon: "wallet" },
  ]},
  { id: "security", title: "Security & authentication", description: "Password, MPIN and device access", icon: "shield", rows: [
    { title: "Password & MPIN", description: "Change or recover credentials", icon: "key" },
    { title: "Biometric access", description: "Fingerprint or face authentication", icon: "fingerprint" },
    { title: "Active sessions", description: "Manage devices and account access", icon: "smartphone" },
  ]},
  { id: "merchant", title: "Merchant management", description: "Verification, privileges and mandates", icon: "merchant", rows: [
    { title: "Verification status", description: "Application status and required documents", icon: "file" },
    { title: "Merchant privileges", description: "Manage approved merchant features", icon: "shield" },
    { title: "Autopay mandates", description: "Mandate status and deactivation", icon: "refresh" },
  ]},
  { id: "privacy", title: "Privacy & preferences", description: "Notifications, currency and privacy", icon: "settings", rows: [
    { title: "Notifications", description: "Payment and account alerts", icon: "bell" },
    { title: "Currency preference", description: "Default fiat denomination", icon: "globe" },
    { title: "Privacy controls", description: "Visibility, consent and data options", icon: "lock" },
  ]},
];

export default function More({ accountId = "", walletAddress = null, onLogout }: { accountId?: string; walletAddress?: string | null; onLogout: () => void }) {
  const [expanded, setExpanded] = useState<SectionId | null>("account");
  const [notice, setNotice] = useState("");
  const [currencySettingsOpen, setCurrencySettingsOpen] = useState(false);

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">PREFERENCES</div><h1>More</h1><p>Account, security and wallet controls.</p></div><span className="page-icon-bubble"><Icon name="settings" size={20} /></span></div>

      <section className="profile-panel">
        <span className="profile-avatar"><Icon name="user" size={22} /></span>
        <div className="profile-copy"><strong>Subtle Pay account</strong><span>{accountId || "Signed-in account"}</span><small>{walletAddress ? `Monad Testnet · ${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}` : "Account wallet unavailable"}</small></div>
        <span className="profile-status-dot" />
      </section>
      <button type="button" className="secondary-button" onClick={onLogout}><Icon name="logout" size={16} /> Sign out</button>

      <div className="settings-group-list">
        {groups.map((group) => (
          <section className={expanded === group.id ? "panel settings-group expanded" : "panel settings-group"} key={group.id}>
            <button className="settings-group-head" type="button" onClick={() => setExpanded((current) => current === group.id ? null : group.id)} aria-expanded={expanded === group.id}>
              <span className="settings-group-icon"><Icon name={group.icon} size={19} /></span>
              <span className="settings-group-copy"><strong>{group.title}</strong><small>{group.description}</small></span>
              <Icon name="chevron-down" size={18} className={expanded === group.id ? "group-chevron rotated" : "group-chevron"} />
            </button>
            {expanded === group.id && <div className="settings-rows">{group.rows.map((row) => (
              <button className="settings-row" type="button" key={row.title} onClick={() => {
                if (row.title === "Currency preference") {
                  setCurrencySettingsOpen((open) => !open);
                  setNotice("");
                } else {
                  setNotice(`${row.title} is unavailable until account services are connected.`);
                }
              }} aria-expanded={row.title === "Currency preference" ? currencySettingsOpen : undefined}>
                <span className="settings-row-icon"><Icon name={row.icon} size={17} /></span><span><strong>{row.title}</strong><small>{row.description}</small></span><Icon name="arrow-right" size={15} />
              </button>
            ))}</div>}
          </section>
        ))}
      </div>

      {currencySettingsOpen && <CurrencyPreference />}
      {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
    </div>
  );
}
