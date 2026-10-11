import Icon, { type IconName } from "./Icon";

export type PageId = "wallet" | "activity" | "send" | "receive" | "merchant" | "more" | "invoice";

const items: { id: PageId; label: string; icon: IconName }[] = [
  { id: "wallet", label: "Wallet", icon: "wallet" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "more", label: "More", icon: "more" },
];

export default function BottomNav({ active, onNavigate }: { active: PageId; onNavigate: (page: PageId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => <button className={active === item.id ? "bottom-nav-item active" : "bottom-nav-item"} key={item.id} onClick={() => onNavigate(item.id)} type="button" aria-current={active === item.id ? "page" : undefined}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}
    </nav>
  );
}
