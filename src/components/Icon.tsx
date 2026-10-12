import type { ReactNode } from "react";

export type IconName =
  | "wallet" | "send" | "receive" | "merchant" | "more" | "activity" | "arrow-up-right" | "arrow-down-left"
  | "bell" | "chevron-down" | "copy" | "check" | "clock" | "shield" | "document" | "download" | "scan" | "upload"
  | "settings" | "user" | "fingerprint" | "refresh" | "arrow-left" | "search" | "close" | "globe" | "building"
  | "trend-up" | "info" | "receipt" | "arrow-right" | "alert" | "lock" | "file" | "link" | "check-circle"
  | "logout" | "users" | "smartphone" | "credit-card" | "key" | "sliders" | "chevrons-up-down" | "qr";

const glyphs: Record<IconName, ReactNode> = {
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18" /><path d="M16 14h.01" /><path d="M6 5V3h12v2" /></>,
  send: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
  receive: <><path d="M17 7 7 17" /><path d="M7 7v10h10" /></>,
  merchant: <><path d="M3 10h18l-2-6H5l-2 6Z" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  "arrow-up-right": <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
  "arrow-down-left": <><path d="M17 7 7 17" /><path d="M17 17H7V7" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.6.9l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.6-.9l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.6-.9l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.6.9l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.9Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  fingerprint: <><path d="M12 11a2 2 0 0 0-2 2c0 3-1 5-2 7" /><path d="M14 13c0 4-.5 6-1.5 8" /><path d="M6 13a6 6 0 1 1 12 0c0 2-.2 4-1 6" /><path d="M4 12a8 8 0 1 1 16 0" /><path d="M12 7a5 5 0 0 1 5 5" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" /></>,
  "arrow-left": <><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" /></>,
  "trend-up": <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 11v5M12 7h.01" /></>,
  receipt: <><path d="M4 3h16v18l-3-2-3 2-2-2-3 2-2-2-3 2Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  "arrow-right": <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  alert: <><path d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" /></>,
  "check-circle": <><circle cx="12" cy="12" r="10" /><path d="m7 12 3 3 7-7" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a5.5 5.5 0 0 1 3.5 5.2" /></>,
  smartphone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>,
  "credit-card": <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  key: <><circle cx="8" cy="15" r="5" /><path d="m12 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  "chevrons-up-down": <><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v2M17 20h4M20 18v3" /></>,
};

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{glyphs[name]}</svg>;
}
