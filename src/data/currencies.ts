export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

/** Common fiat display currencies for major crypto-trading and adoption markets. */
export const CURRENCIES: CurrencyOption[] = [
  { code: "usd", name: "US Dollar", symbol: "$" },
  { code: "krw", name: "South Korean Won", symbol: "₩" },
  { code: "jpy", name: "Japanese Yen", symbol: "¥" },
  { code: "eur", name: "Euro", symbol: "€" },
  { code: "inr", name: "Indian Rupee", symbol: "₹" },
  { code: "try", name: "Turkish Lira", symbol: "₺" },
  { code: "brl", name: "Brazilian Real", symbol: "R$" },
  { code: "idr", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "vnd", name: "Vietnamese Dong", symbol: "₫" },
  { code: "ngn", name: "Nigerian Naira", symbol: "₦" },
  { code: "php", name: "Philippine Peso", symbol: "₱" },
  { code: "thb", name: "Thai Baht", symbol: "฿" },
  { code: "gbp", name: "British Pound", symbol: "£" },
  { code: "twd", name: "New Taiwan Dollar", symbol: "NT$" },
  { code: "aud", name: "Australian Dollar", symbol: "A$" },
  { code: "cad", name: "Canadian Dollar", symbol: "C$" },
  { code: "sgd", name: "Singapore Dollar", symbol: "S$" },
  { code: "hkd", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "mxn", name: "Mexican Peso", symbol: "MX$" },
  { code: "pln", name: "Polish Złoty", symbol: "zł" },
  { code: "zar", name: "South African Rand", symbol: "R" },
  { code: "aed", name: "UAE Dirham", symbol: "د.إ" },
  { code: "sar", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "pkr", name: "Pakistani Rupee", symbol: "₨" },
  { code: "chf", name: "Swiss Franc", symbol: "CHF" },
];

export const DEFAULT_CURRENCY_KEY = "subtlePayDefaultCurrency";

export function readDefaultCurrency(): string {
  try {
    const saved = window.localStorage.getItem(DEFAULT_CURRENCY_KEY)?.toLowerCase();
    if (saved && CURRENCIES.some((currency) => currency.code === saved)) return saved;
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  return "usd";
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((currency) => currency.code === code.toLowerCase())?.symbol ?? code.toUpperCase();
}
