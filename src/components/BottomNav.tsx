import { NavLink } from "react-router-dom";

type IconName = "home" | "activity" | "settings";

const links: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/history", label: "Activity", icon: "activity" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: IconName }) {
  const shared = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "home") {
    return <svg {...shared}><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9" /><path d="M9 21v-7h6v7" /></svg>;
  }
  if (name === "activity") {
    return <svg {...shared}><path d="M8 7H3V2" /><path d="M3 7a9 9 0 0 1 15.5-3.5L21 6" /><path d="M16 17h5v5" /><path d="M21 17A9 9 0 0 1 5.5 20.5L3 18" /></svg>;
  }
  return <svg {...shared}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.6.9l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.6-.9l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.6-.9l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.6.9l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.9Z" /></svg>;
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
              isActive ? "font-semibold text-brand" : "text-gray-400"
            }`
          }
        >
          <NavIcon name={icon} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
