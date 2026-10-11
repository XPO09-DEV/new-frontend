import Icon from "../components/Icon";

export default function Notifications() {
  return (
    <div className="page-stack inner-page">
      <div className="page-intro">
        <div>
          <div className="section-kicker">INBOX</div>
          <h1>Notifications</h1>
          <p>Payment and account updates, all in one place.</p>
        </div>
        <span className="page-icon-bubble notification-page-icon"><Icon name="bell" size={20} /></span>
      </div>

      <section className="panel activity-empty-panel notification-empty-panel">
        <div className="notification-empty-illustration">
          <span className="notification-illustration-orbit" />
          <span className="notification-illustration-bell"><Icon name="bell" size={28} /></span>
          <span className="notification-illustration-spark spark-one" />
          <span className="notification-illustration-spark spark-two" />
        </div>
        <h2>You're all caught up</h2>
        <p>New payment, wallet and security notifications will appear here.</p>
      </section>
    </div>
  );
}
