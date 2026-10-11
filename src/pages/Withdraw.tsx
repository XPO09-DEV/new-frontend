import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Wallet } from "../types/api";
import Button from "../components/Button";
import Input from "../components/Input";
import { money } from "../utils/format";

export default function Withdraw() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.getWallet().then((value) => { if (active) setWallet(value); }).catch((cause) => {
      if (active) setMsg(cause instanceof Error ? cause.message : "Could not load wallet.");
    });
    return () => { active = false; };
  }, []);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || submitting) {
      setMsg("Enter an amount greater than zero.");
      return;
    }
    setSubmitting(true);
    setMsg("");
    try {
      const result = await api.withdraw(value, "USD");
      setMsg(`Prototype withdrawal ${result.status}. Payout shown: ${money(result.payoutLocal, result.currency)}`);
    } catch (cause) {
      setMsg(cause instanceof Error ? cause.message : "Withdrawal request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <button type="button" onClick={() => navigate(-1)} className="text-brand">← Back</button>
      <h1 className="text-xl font-semibold">Withdraw</h1>
      {wallet && (
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs text-gray-500">Available balance</p>
          <p className="text-2xl font-semibold">{money(wallet.balanceUsd, "USD")}</p>
        </div>
      )}
      <Input label="Amount (USD)" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} required />
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
        This is a testnet prototype. No bank transfer or real-world payout occurs.
      </p>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <Button onClick={submit} disabled={!amount || submitting}>{submitting ? "Submitting..." : "Request withdrawal"}</Button>
    </div>
  );
}
