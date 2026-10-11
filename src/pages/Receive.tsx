import { useState } from "react";
import Icon from "../components/Icon";
import { DEMO_TRANSACTIONS } from "../data/demo";

const demoAddress = "0x7A31B2E6C49A07B5D14D8F56E2A9C7B031C2D7F9";

function DemoQrPattern() {
  const cells = Array.from({ length: 441 }, (_, index) => {
    const row = Math.floor(index / 21);
    const column = index % 21;
    const finder = (x: number, y: number): boolean | null => {
      const dx = column - x;
      const dy = row - y;
      if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return null;
      return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    };
    const finderValue = finder(0, 0) ?? finder(14, 0) ?? finder(0, 14);
    return { index, row, column, dark: finderValue ?? ((row * 17 + column * 11 + row * column * 3) % 7 < 3) };
  });
  return <svg className="demo-qr-svg" viewBox="0 0 21 21" role="img" aria-label="Illustrative non-scannable QR pattern"><rect width="21" height="21" rx="1" fill="#fff" />{cells.filter((cell) => cell.dark).map((cell) => <rect key={cell.index} x={cell.column + 0.08} y={cell.row + 0.08} width=".84" height=".84" rx=".08" fill="#111827" />)}</svg>;
}

export default function Receive() {
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(demoAddress);
      setCopied(true);
      setNotice("Demo address copied. It is a placeholder and must not be used to receive funds.");
    } catch {
      setCopied(false);
      setNotice("Clipboard access is unavailable. This is a sample address—do not send funds to it.");
    }
  };

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">INCOMING PAYMENTS</div><h1>Receive money</h1><p>Share receiving details with someone you trust.</p></div><span className="page-icon-bubble"><Icon name="receive" size={20} /></span></div>
      <div className="preview-banner warning-banner"><Icon name="info" size={17} /><span>Sample receiving details only. The address and QR below are not connected to a real wallet and are not scannable.</span></div>

      <section className="receive-hero-panel">
        <div className="receive-hero-copy"><span className="section-kicker light">YOUR DEMO HANDLE</span><h2>ani<span>@monad</span></h2><p>Share your handle or address to let others find your profile in the future connected app.</p></div>
        <div className="receive-qr-box"><DemoQrPattern /><span>DEMO QR</span></div>
      </section>

      <section className="panel address-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">WALLET ADDRESS</div><h2>Receiving details</h2></div><span className="status-pill neutral">Preview</span></div>
        <div className="address-field"><span>{demoAddress}</span><button type="button" className="icon-button small-icon-button" onClick={copyAddress} aria-label="Copy demo address"><Icon name={copied ? "check" : "copy"} size={16} /></button></div>
        <div className="button-row"><button type="button" className="primary-button" onClick={copyAddress}><Icon name="copy" size={16} /> Copy address</button><button type="button" className="secondary-button" onClick={() => setNotice("Share sheet and live address sharing will be connected with the wallet service later.")}><Icon name="arrow-up-right" size={16} /> Share</button></div>
        {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      </section>

      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">INBOUND</div><h2>Incoming activity <span className="demo-tag">SAMPLE</span></h2></div><span className="small-muted">Recent</span></div>
        <div className="transaction-list">
          {DEMO_TRANSACTIONS.filter((tx) => tx.direction === "incoming").map((tx) => <div className="transaction-row" key={tx.id}><span className="transaction-icon incoming"><Icon name="arrow-down-left" size={18} /></span><span className="transaction-main"><strong>{tx.name}</strong><small>{tx.detail}</small></span><span className="transaction-amount incoming">{tx.amount}<small>{tx.status}</small></span></div>)}
          <div className="empty-note"><Icon name="clock" size={16} /> The connected version will show verified incoming transactions and invoice access here.</div>
        </div>
      </section>
    </div>
  );
}
