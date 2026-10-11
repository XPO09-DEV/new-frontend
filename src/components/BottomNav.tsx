import Icon, { type IconName } from "./Icon";

export type PageId = "wallet" | "activity" | "notifications" | "send" | "receive" | "merchant" | "more";

const items: { id: PageId; label: string; icon: IconName }[] = [
  { id: "wallet", label: "Wallet", icon: "wallet" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "more", label: "More", icon: "more" },
];

export default function BottomNav({ active, onNavigate }: { active: PageId; onNavigate: (page: PageId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => <button className={`${active === item.id ? "bottom-nav-item active" : "bottom-nav-item"}${item.id === "notifications" ? " bottom-nav-item-notifications" : ""}`} key={item.id} onClick={() => onNavigate(item.id)} type="button" aria-current={active === item.id ? "page" : undefined}><span className="bottom-nav-icon-shell"><Icon name={item.icon} size={20} /></span><span className="bottom-nav-label">{item.label}</span></button>)}
    </nav>
  );
}
