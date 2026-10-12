import { useRef, useState } from "react";
import Icon from "../components/Icon";
import { FIAT_CURRENCIES } from "../data/walletData";

export default function Send({ onBack, initialRecipient = "" }: { onBack: () => void; initialRecipient?: string }) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [notice, setNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  return (
    <div className="page-stack inner-page">
      <button className="back-link" type="button" onClick={onBack}><Icon name="arrow-left" size={17} /> Back to wallet</button>
      <div className="page-intro"><div><div className="section-kicker">PAYMENTS</div><h1>Send money</h1><p>Choose a recipient and review the transfer details.</p></div><span className="page-icon-bubble"><Icon name="send" size={20} /></span></div>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">01</span><div><h2>Recipient</h2><p>Enter a wallet address or Subtle Pay handle.</p></div></div>
        <label className="field-label" htmlFor="recipient-identity">Wallet address or handle</label>
        <div className="input-with-icon"><Icon name="search" size={18} /><input id="recipient-identity" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Wallet address or handle" autoComplete="off" /></div>
        <div className="recipient-availability"><Icon name="info" size={16} /><span>Recipient verification is unavailable until account services are connected.</span></div>
        <div className="qr-tools">
          <button type="button" className="secondary-button" onClick={() => setNotice("Camera scanning is unavailable until QR services are configured.")}><Icon name="scan" size={17} /> Scan QR</button>
          <button type="button" className="secondary-button" onClick={() => uploadRef.current?.click()}><Icon name="upload" size={17} /> Choose QR image</button>
          <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setSelectedFile(file.name); setNotice("QR decoding is unavailable. The selected image has not been interpreted as a recipient."); } }} />
        </div>
        {selectedFile && <p className="tiny-note">Selected file: {selectedFile}</p>}
        {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      </section>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">02</span><div><h2>Amount & currency</h2><p>Choose the amount the recipient should receive.</p></div></div>
        <div className="amount-input-card"><div><span className="muted-label">Recipient receives</span><div className="amount-field-row"><input aria-label="Recipient amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /><select aria-label="Payment currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{FIAT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></div></div><div className="amount-caption">Amount in {currency}</div></div>
        <label className="field-label" htmlFor="asset-select">Payment asset</label>
        <select id="asset-select" className="form-select full-select" value="unavailable" disabled><option value="unavailable">Asset options load when network support is configured</option></select>
        <div className="conversion-breakdown">
          <div><span>Token quantity</span><strong>—</strong></div>
          <div><span>Exchange rate</span><strong>—</strong></div>
          <div><span>Network & service fees</span><strong>—</strong></div>
        </div>
        <div className="authorization-note"><Icon name="info" size={19} /><div><strong>Quotes are unavailable</strong><p>Connect market rates and payment services to calculate the token amount, lock a 50-second quote and confirm the final payment value.</p></div></div>
        <button className="primary-button wide-button" type="button" onClick={() => setNotice("Payment quotes are unavailable until pricing and transaction services are connected.")} disabled={!recipient.trim() || !amount || Number(amount) <= 0}><Icon name="clock" size={17} /> Get payment quote</button>
      </section>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">03</span><div><h2>Authorize payment</h2><p>Review and securely approve before funds move.</p></div></div>
        <div className="authorization-methods">
          <div><span className="feature-access-icon"><Icon name="key" size={18} /></span><span><strong>MPIN</strong><small>Unavailable</small></span></div>
          <div><span className="feature-access-icon"><Icon name="fingerprint" size={18} /></span><span><strong>Biometrics</strong><small>Unavailable</small></span></div>
        </div>
        <p className="tiny-note">Authorization is disabled until secure account and device authentication services are configured.</p>
        <button className="primary-button wide-button" type="button" disabled><Icon name="lock" size={16} /> Confirm payment</button>
      </section>
    </div>
  );
}
