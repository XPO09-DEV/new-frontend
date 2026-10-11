import Icon from "../components/Icon";

export default function Activity() {
  return (
    <div className="page-stack inner-page">
      <div className="page-intro">
        <div><div className="section-kicker">TRANSACTION CENTRE</div><h1>Activity</h1><p>Incoming and outgoing wallet transactions.</p></div>
        <span className="page-icon-bubble"><Icon name="activity" size={20} /></span>
      </div>
      <section className="panel activity-empty-panel">
        <div className="empty-state-illustration"><Icon name="activity" size={25} /></div>
        <h2>No transactions yet</h2>
        <p>Confirmed payments will appear here once your wallet and transaction services are connected.</p>
      </section>
    </div>
  );
}
