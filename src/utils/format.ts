import { CURRENCIES } from "./currencies";

export function money(amount: number | string | null | undefined, currency = "USD") {
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;
  const digits = CURRENCIES[currency]?.exponent ?? 2;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(safeValue);
  } catch {
    return `${currency} ${safeValue.toFixed(digits)}`;
  }
}
