import type { Payment } from "../types/api";
import { money } from "../utils/format";

type Props = { tx: Payment; showLocal?: boolean; currency?: string };

export default function TransactionItem({ tx, showLocal, currency = "INR" }: Props) {
  const incoming = tx.direction === "in";
  const displayCurrency = tx.displayCurrency ?? currency;
  const main = showLocal ? money(tx.localValue, displayCurrency) : money(tx.usdValue, "USD");
  const secondary = showLocal ? money(tx.usdValue, "USD") : money(tx.localValue, displayCurrency);
  const counterparty = tx.counterparty || "Unknown account";

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft font-semibold text-brand">
        {counterparty[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{counterparty}</p>
        <p className="text-xs text-gray-400">
          {incoming ? "Received" : "Sent"} · {new Date(tx.createdAt).toLocaleDateString()} · {tx.status}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${incoming ? "text-brand" : ""}`}>
          {incoming ? "+" : "-"}{main}
        </p>
        <p className="text-xs text-gray-400">({secondary})</p>
      </div>
    </div>
  );
}
