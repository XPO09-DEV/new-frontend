import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { HomeData, Payment } from "../types/api";
import BalanceCard from "../components/BalanceCard";
import BottomNav from "../components/BottomNav";
import TransactionItem from "../components/TransactionItem";

export default function Home() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.getHome(), api.getPayments()])
      .then(([homeData, history]) => {
        if (!active) return;
        setHome(homeData);
        setPayments(history);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your wallet.");
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-5 p-5 pb-24">
      <p className="text-sm text-gray-500">Good evening, <b>@{home?.alias ?? "friend"}</b></p>
      {home ? <BalanceCard wallet={home} /> : <p className="text-sm text-gray-400">Loading your wallet…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/send" className="rounded-xl bg-white p-4 text-center font-medium shadow-sm">Send</Link>
        <Link to="/receive" className="rounded-xl bg-white p-4 text-center font-medium shadow-sm">Receive</Link>
      </div>
      <Link to="/withdraw" className="block text-center text-sm text-brand">Withdraw to bank</Link>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Recent activity</h2>
        <Link to="/history" className="text-sm text-brand">See all</Link>
      </div>
      {payments.length === 0 && !error && <p className="text-sm text-gray-400">No transactions yet</p>}
      {payments.slice(0, 3).map((transaction) => (
        <TransactionItem key={transaction.id} tx={transaction} currency={home?.currency} />
      ))}
      <BottomNav />
    </div>
  );
}
