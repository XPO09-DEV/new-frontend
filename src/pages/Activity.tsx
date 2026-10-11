import Icon from "../components/Icon";
import { DEMO_TRANSACTIONS } from "../data/demo";

export default function Activity({ onOpenInvoice }: { onOpenInvoice: () => void }) {
  return (
    <div className="page-stack inner-page">
      <div className="page-intro">
        <div>
          <div className="section-kicker">TRANSACTION CENTRE</div>
          <h1>Activity</h1>
          <p>Keep track of incoming and outgoing movements.</p>
        </div>
        <span className="page-icon-bubble"><Icon name="activity" size={20} /></span>
      </div>
      <div className="preview-banner"><Icon name="info" size={17} /><span>Sample activity only. These are not real transactions and have no blockchain IDs.</span></div>
      <section className="panel">
        <div className="filter-row">
          <span className="filter-pill active"><Icon name="sliders" size={14} /> All activity</span>
          <span className="filter-pill">Incoming</span>
          <span className="filter-pill">Outgoing</span>
          <span className="filter-pill">Merchant</span>
        </div>
        <div className="transaction-list large">
          {DEMO_TRANSACTIONS.map((tx) => (
            <div className="transaction-row" key={tx.id}>
              <span className={`transaction-icon ${tx.direction}`}><Icon name={tx.direction === "incoming" ? "arrow-down-left" : "arrow-up-right"} size={18} /></span>
              <span className="transaction-main"><strong>{tx.name}</strong><small>{tx.detail}</small><small className="transaction-status"><span className="status-dot" /> {tx.status} · {tx.token}</small></span>
              <span className={`transaction-amount ${tx.direction}`}>{tx.amount}<button className="mini-link" type="button" onClick={onOpenInvoice}>Details <Icon name="arrow-right" size={12} /></button></span>
            </div>
          ))}
        </div>
      </section>
      <section className="subtle-note-card">
        <Icon name="shield" size={20} />
        <div><strong>Transaction truth matters</strong><p>In the connected product, payment status and invoices will come from backend and network confirmations—not from a button press.</p></div>
      </section>
    </div>
  );
}
