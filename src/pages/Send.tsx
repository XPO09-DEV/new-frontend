import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Button from "../components/Button";
import Input from "../components/Input";
import { money } from "../utils/format";

type Step = "form" | "confirm" | "done";

export default function Send() {
  const [step, setStep] = useState<Step>("form");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ txId: string; txHash?: string; status: string } | null>(null);
  const navigate = useNavigate();

  async function goConfirm() {
    setError("");
    const raw = to.trim();
    const value = Number(amount);
    if (!raw) return setError("Enter a recipient.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than zero.");

    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(raw);
    const handle = raw.replace(/^@/, "").replace(/@monad$/i, "").trim();
    // The backend issues 27-character account IDs and expects them in uppercase.
    const isAccountId = /^[a-zA-Z0-9]{27}$/.test(handle);
    const recipient = isAddress ? raw : isAccountId ? handle.toUpperCase() : handle.toLowerCase();

    try {
      if (!isAddress && !isAccountId) {
        await api.resolveAlias(recipient);
      }
      setTo(recipient);
      setStep("confirm");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recipient could not be found.");
    }
  }

  async function pay() {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const result = await api.send(to, Number(amount), currency, note.trim() || undefined);
      setReceipt(result);
      setStep("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed.");
    } finally {
      setSending(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4 p-6 pt-32 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand text-4xl text-white">✓</div>
        <h1 className="text-2xl font-semibold">Payment submitted</h1>
        <p className="text-3xl font-bold">{money(amount, currency)}</p>
        <p className="break-all">To {to}</p>
        {receipt?.status && <p className="text-sm text-gray-500">Status: {receipt.status}</p>}
        {receipt?.txHash && <p className="break-all text-xs text-gray-400">Transaction: {receipt.txHash}</p>}
        <p className="text-xs text-gray-500">A payment is complete only when the network confirms it.</p>
        <Button onClick={() => navigate("/", { replace: true })}>Done</Button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="space-y-4 p-6 pt-20">
        <button type="button" onClick={() => setStep("form")} className="text-brand">← Edit payment</button>
        <h1 className="text-xl font-semibold">Confirm payment</h1>
        <p className="text-4xl font-bold">{money(amount, currency)}</p>
        <p>To: <b className="break-all">{to}</b></p>
        {note && <p>Note: {note}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button onClick={pay} disabled={sending}>{sending ? "Submitting..." : "Confirm payment"}</Button>
        <Button variant="light" onClick={() => setStep("form")} disabled={sending}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <button type="button" onClick={() => navigate(-1)} className="text-brand">← Back</button>
      <h1 className="text-xl font-semibold">Send money</h1>
      <Input label="To (name, account ID or address)" value={to} onChange={(event) => setTo(event.target.value)} autoComplete="off" required />
      <Input label="Amount" type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required />
      <label className="block space-y-1 text-sm">
        <span className="text-gray-600">Currency</span>
        <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-xl border bg-white p-3">
          <option>USD</option>
          <option>INR</option>
        </select>
      </label>
      <Input label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={goConfirm} disabled={!to.trim() || !amount}>Continue</Button>
    </div>
  );
}
