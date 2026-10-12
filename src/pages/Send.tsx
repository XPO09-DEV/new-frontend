import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { getAccountRates, submitAccountPayment, type SendPaymentResult } from "../services/accountService";

function fmt(value: number, maximumFractionDigits = 6) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}
function statusCopy(status: string) {
  if (status === "confirmed") return "Confirmed on Monad Testnet";
  if (status === "failed") return "The transaction failed on-chain";
  if (status === "submitted" || status === "pending") return "Submitted; confirmation is still pending";
  return "Payment status received";
}

export default function Send({
  onBack,
  initialRecipient = "",
  walletAddress = null,
  onTransactionSubmitted,
}: {
  onBack: () => void;
  initialRecipient?: string;
  walletAddress?: string | null;
  walletChainId?: string | null;
  walletAssets?: unknown[];
  onConnectWallet?: () => void;
  onTransactionSubmitted?: () => void;
}) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [note, setNote] = useState("");
  const [rates, setRates] = useState<{ tokenUsd: number; usdLocal: number } | null>(null);
  const [ratesError, setRatesError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendPaymentResult | null>(null);

  useEffect(() => {
    let alive = true;
    setRates(null);
    setRatesError("");
    void getAccountRates(currency).then((value) => {
      if (alive) setRates({ tokenUsd: value.tokenUsd, usdLocal: value.usdLocal });
    }).catch((error) => {
      if (alive) setRatesError(error instanceof Error ? error.message : "A live payment quote is unavailable.");
    });
    return () => { alive = false; };
  }, [currency]);

  useEffect(() => {
    if (initialRecipient) {
      setRecipient(initialRecipient);
      setResult(null);
      setNotice("");
    }
  }, [initialRecipient]);

  const amountNumber = Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(amountNumber) && amountNumber > 0;
  const estimatedMon = rates && validAmount
    ? (currency === "INR" ? amountNumber / rates.usdLocal : amountNumber) / rates.tokenUsd
    : null;

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setNotice("");
    setResult(null);
    if (!walletAddress) {
      setNotice("Your Subtle Pay account wallet is unavailable. Sign in again before sending.");
      return;
    }
    if (!recipient.trim()) {
      setNotice("Enter a recipient account ID, Subtle Pay handle, or EVM address.");
      return;
    }
    if (!validAmount) {
      setNotice("Enter an amount greater than zero.");
      return;
    }
    if (ratesError || !rates) {
      setNotice("A live quote is unavailable. No payment was sent; retry when the rate service is available.");
      return;
    }
    setBusy(true);
    try {
      const payment = await submitAccountPayment({
        to: recipient.trim(),
        amount,
        amountCurrency: currency,
        note: note.trim() || undefined,
        asset: "MON",
      });
      setResult(payment);
      setNotice(statusCopy(payment.status));
      onTransactionSubmitted?.();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Payment failed. No success has been assumed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack inner-page send-page">
      <button className="back-link" type="button" onClick={onBack}><Icon name="arrow-left" size={17} /> Back to wallet</button>
      <div className="page-intro">
        <div><div className="section-kicker">MONAD TESTNET PAYMENT</div><h1>Send money</h1><p>Payments are signed by your Subtle Pay account wallet and settle in native testnet MON.</p></div>
        <span className="page-icon-bubble"><Icon name="send" size={20} /></span>
      </div>

      <section className="panel send-panel">
        <div className="send-connected-line"><span className="send-connected-dot" /><div><strong>Subtle Pay account wallet</strong><small>{walletAddress ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)} · Monad Testnet` : "Account wallet unavailable"}</small></div></div>
        <div className="account-testnet-note">Hackathon mode · Native MON on Monad Testnet only. Testnet tokens are not money and have no cash value. Other coins may be shown for market information but cannot be sent through this payment flow.</div>

        <form onSubmit={(event) => void submit(event)}>
          <div className="step-heading"><span className="step-number">01</span><div><h2>Recipient</h2><p>Use an account ID, claimed Subtle Pay handle, or full EVM address.</p></div></div>
          <label className="field-label" htmlFor="payment-recipient">Recipient</label>
          <div className="input-with-icon"><Icon name="user" size={18} /><input id="payment-recipient" value={recipient} onChange={(event) => { setRecipient(event.target.value); setResult(null); setNotice(""); }} placeholder="Account ID, handle or 0x address" autoComplete="off" spellCheck={false} required /></div>

          <div className="step-heading send-step-heading"><span className="step-number">02</span><div><h2>Payment value</h2><p>Enter a value to convert to MON using the backend's current market quote.</p></div></div>
          <label className="field-label" htmlFor="payment-currency">Currency</label>
          <select id="payment-currency" className="form-select full-select" value={currency} onChange={(event) => setCurrency(event.target.value as "INR" | "USD")}>
            <option value="INR">Indian rupee (INR)</option><option value="USD">US dollar (USD)</option>
          </select>
          <label className="field-label" htmlFor="payment-amount">Amount</label>
          <input id="payment-amount" className="form-input" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setResult(null); setNotice(""); }} placeholder="0.00" required />
          <label className="field-label" htmlFor="payment-note">Note (optional)</label>
          <input id="payment-note" className="form-input" value={note} onChange={(event) => setNote(event.target.value.slice(0, 140))} maxLength={140} placeholder="What is this payment for?" />

          <div className="send-selected-asset"><span className="send-selected-asset-mark"><Icon name="coins" size={19} /></span><span><strong>MON · Monad Testnet</strong><small>Settlement asset · Native token</small></span><span className="send-balance-copy">{estimatedMon == null ? "—" : `≈ ${fmt(estimatedMon, 8)} MON`}<small>estimate only</small></span></div>
          <p className="account-gate-hint">{rates ? `Quote updated with the rate service. 1 MON ≈ ${currency === "INR" ? fmt(rates.tokenUsd * rates.usdLocal, 2) + " INR" : "$" + fmt(rates.tokenUsd, 4)}. The final sent amount is returned by the backend.` : ratesError || "Loading a current estimate…"}</p>

          <button className="primary-button" type="submit" disabled={busy || !walletAddress || !validAmount}>{busy ? "Submitting payment…" : "Review and send testnet MON"}</button>
        </form>
      </section>

      {notice && <div className={result?.status === "confirmed" ? "inline-notice success" : "inline-notice"} role="status"><Icon name={result?.status === "confirmed" ? "check-circle" : "info"} size={16} /><span>{notice}</span></div>}
      {result && <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">PAYMENT RESULT</div><h2>{result.tokenAmount} MON</h2></div><span className={result.status === "confirmed" ? "status-pill success" : result.status === "failed" ? "status-pill warning" : "status-pill neutral"}>{result.status}</span></div>
        <p>Transaction ID: <code>{result.txId}</code></p>
        <p>Transaction hash: <code className="receive-full-address">{result.txHash}</code></p>
        <a href={`https://testnet.monadexplorer.com/tx/${result.txHash}`} target="_blank" rel="noreferrer">View on Monad Testnet Explorer ↗</a>
      </section>}
    </div>
  );
}
