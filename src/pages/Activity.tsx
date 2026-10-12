import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import { getPaymentHistory, type PaymentRecord } from "../services/accountService";

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
function statusLabel(status: string) {
  if (status === "confirmed") return "Confirmed";
  if (status === "failed") return "Failed";
  if (status === "submitted" || status === "pending") return "Pending";
  return status;
}

export default function Activity() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setPayments(await getPaymentHistory());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment history could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="page-stack inner-page">
      <div className="page-intro">
        <div><div className="section-kicker">TRANSACTION CENTRE</div><h1>Activity</h1><p>Incoming and outgoing Subtle Pay account payments.</p></div>
        <span className="page-icon-bubble"><Icon name="activity" size={20} /></span>
      </div>
      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">PAYMENT HISTORY</div><h2>Recent payments</h2></div><button type="button" className="secondary-button" onClick={() => void refresh()} disabled={busy}><Icon name="refresh" size={15} /> Refresh</button></div>
        {busy ? <div className="empty-activity"><span className="ta-search-spinner" /><strong>Loading payment history…</strong></div>
          : error ? <div className="inline-notice" role="alert"><Icon name="info" size={16} /><span>{error}</span></div>
          : payments.length === 0 ? <div className="empty-state-illustration"><Icon name="activity" size={25} /><h2>No transactions yet</h2><p>Your sent and received account payments will appear here after the backend records them.</p></div>
          : <div className="payment-history-list">{payments.map((payment) => <article className="payment-history-row" key={payment.id}>
            <span className={payment.direction === "out" ? "payment-direction-icon outgoing" : "payment-direction-icon incoming"}><Icon name={payment.direction === "out" ? "arrow-up-right" : "arrow-down-left"} size={18} /></span>
            <div className="payment-history-main"><strong>{payment.direction === "out" ? "Sent payment" : "Received payment"}</strong><span>{payment.counterparty}</span><small>{displayDate(payment.createdAt)}</small>{payment.txHash && <a href={`https://testnet.monadexplorer.com/tx/${payment.txHash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}</div>
            <div className="payment-history-value"><strong>{payment.localValue} {payment.displayCurrency}</strong><span className={payment.status === "confirmed" ? "status-pill success" : payment.status === "failed" ? "status-pill warning" : "status-pill neutral"}>{statusLabel(payment.status)}</span></div>
          </article>)}</div>}
      </section>
    </div>
  );
}
