import { useState } from "react";
import Icon from "../components/Icon";

export default function Receive() {
  const [notice, setNotice] = useState("");

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">INCOMING PAYMENTS</div><h1>Receive money</h1><p>Your receiving details and incoming transfers.</p></div><span className="page-icon-bubble"><Icon name="receive" size={20} /></span></div>

      <section className="receive-hero-panel">
        <div className="receive-hero-copy"><span className="section-kicker light">YOUR WALLET</span><h2>Receiving details</h2><p>Connect a wallet to generate your personal address, handle and receiving QR code.</p></div>
        <div className="receive-qr-box unavailable-qr"><Icon name="qr" size={46} /><span>UNAVAILABLE</span></div>
      </section>

      <section className="panel address-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">WALLET ADDRESS</div><h2>Receiving address</h2></div><span className="status-pill neutral">Unavailable</span></div>
        <div className="address-field"><span>Connect a wallet to view your address</span><Icon name="lock" size={16} /></div>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => setNotice("Your receiving address will be available after a wallet is connected.")}><Icon name="copy" size={16} /> Copy address</button>
          <button type="button" className="secondary-button" onClick={() => setNotice("Address sharing will be available after a wallet is connected.")}><Icon name="arrow-up-right" size={16} /> Share</button>
        </div>
        {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      </section>

      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">INBOUND</div><h2>Incoming activity</h2></div><span className="small-muted">Recent</span></div>
        <div className="empty-activity"><Icon name="receive" size={21} /><strong>No incoming transfers</strong><span>Confirmed incoming payments will appear here when transaction services are connected.</span></div>
      </section>
    </div>
  );
}
