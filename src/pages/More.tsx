import { useState } from "react";
import Icon, { type IconName } from "../components/Icon";

type SectionId = "account" | "security" | "merchant" | "privacy";

const groups: { id: SectionId; title: string; description: string; icon: IconName; rows: { title: string; description: string; icon: IconName }[] }[] = [
  { id: "account", title: "Account management", description: "Profiles, handles and account switching", icon: "user", rows: [
    { title: "Personal information", description: "Display name and account identity", icon: "user" },
    { title: "Wallet handle", description: "Custom name such as ani@monad", icon: "link" },
    { title: "Accounts and switching", description: "Add, switch or request account deletion", icon: "wallet" },
  ]},
  { id: "security", title: "Security & authentication", description: "Passwords, MPIN and device access", icon: "shield", rows: [
    { title: "Password & MPIN", description: "Secure change and recovery flows", icon: "key" },
    { title: "Biometric access", description: "Fingerprint or face authentication", icon: "fingerprint" },
    { title: "Active sessions", description: "Devices and account recovery options", icon: "smartphone" },
  ]},
  { id: "merchant", title: "Merchant management", description: "Verification, privileges and mandates", icon: "merchant", rows: [
    { title: "Verification status", description: "Review your application and required documents", icon: "file" },
    { title: "Merchant privileges", description: "Manage features after approval", icon: "shield" },
    { title: "Autopay mandates", description: "Permission status and deactivation request", icon: "refresh" },
  ]},
  { id: "privacy", title: "Privacy & preferences", description: "Notifications, visibility and app settings", icon: "settings", rows: [
    { title: "Notifications", description: "Payment and account alerts", icon: "bell" },
    { title: "Currency preference", description: "Default fiat denomination", icon: "globe" },
    { title: "Privacy controls", description: "Visibility, consent and data options", icon: "lock" },
  ]},
];

export default function More() {
  const [expanded, setExpanded] = useState<SectionId | null>("account");
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState("Anirban");
  const [savedName, setSavedName] = useState("Anirban");
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true);

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">CONTROL CENTRE</div><h1>More</h1><p>Account, security and wallet preferences in one place.</p></div><span className="page-icon-bubble"><Icon name="settings" size={20} /></span></div>
      <div className="preview-banner warning-banner"><Icon name="info" size={17} /><span>Changes on this page are local UI previews. Account and security services are not connected.</span></div>

      <section className="profile-panel">
        <span className="profile-avatar">AS</span>
        <div className="profile-copy"><strong>{savedName}</strong><span>ani@monad · Demo profile</span><small>Account not connected</small></div>
        <span className="profile-status-dot" />
      </section>

      <section className="panel account-name-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">PERSONALISE</div><h2>Display name</h2></div></div>
        <div className="inline-edit-row"><input className="text-input" aria-label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /><button className="secondary-button" type="button" onClick={() => { setSavedName(displayName.trim() || "Anirban"); setNotice("Display name updated in this page session only."); }}>Save preview</button></div>
      </section>

      <div className="settings-group-list">
        {groups.map((group) => (
          <section className={expanded === group.id ? "panel settings-group expanded" : "panel settings-group"} key={group.id}>
            <button className="settings-group-head" type="button" onClick={() => setExpanded((current) => current === group.id ? null : group.id)} aria-expanded={expanded === group.id}>
              <span className="settings-group-icon"><Icon name={group.icon} size={19} /></span>
              <span className="settings-group-copy"><strong>{group.title}</strong><small>{group.description}</small></span>
              <Icon name="chevron-down" size={18} className={expanded === group.id ? "group-chevron rotated" : "group-chevron"} />
            </button>
            {expanded === group.id && <div className="settings-rows">{group.rows.map((row) => <button className="settings-row" type="button" key={row.title} onClick={() => setNotice(`${row.title}: this control will be enabled when the account/security backend is connected.`)}><span className="settings-row-icon"><Icon name={row.icon} size={17} /></span><span><strong>{row.title}</strong><small>{row.description}</small></span><Icon name="arrow-right" size={15} /></button>)}</div>}
          </section>
        ))}
      </div>

      <section className="panel preference-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">LOCAL INTERACTION PREVIEW</div><h2>Notification preference</h2></div><Icon name="bell" size={20} className="panel-heading-icon" /></div>
        <label className="toggle-row"><span><strong>Low balance reminders</strong><small>Preview only; not saved to an account.</small></span><input type="checkbox" checked={lowBalanceAlerts} onChange={(event) => setLowBalanceAlerts(event.target.checked)} /><span className="toggle-visual" /></label>
      </section>

      {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      <button type="button" className="logout-preview" onClick={() => setNotice("Sign out will be connected to the session service later. No account session exists in this prototype.")}><Icon name="logout" size={17} /> Sign out · preview</button>
    </div>
  );
}
