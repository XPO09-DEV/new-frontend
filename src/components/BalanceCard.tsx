import type { Wallet } from "../types/api";
import { money } from "../utils/format";

export default function BalanceCard({ wallet }: { wallet: Wallet }) {
  return (
    <div className="rounded-2xl bg-brand p-5 text-white">
      <p className="text-sm opacity-80">Total balance</p>
      <p className="text-4xl font-semibold">{money(wallet.balanceUsd)}</p>
      <p className="opacity-80">≈ {money(wallet.balanceLocal, wallet.currency)}</p>
    </div>
  );
}