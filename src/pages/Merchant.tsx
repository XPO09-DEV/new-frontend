import { useRef, useState, type FormEvent } from "react";
import Icon from "../components/Icon";

export default function Merchant() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("small");
  const [country, setCountry] = useState("IN");
  const [documentName, setDocumentName] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("Merchant applications are unavailable until verification services are connected. Your details have not been submitted.");
  };

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">BUSINESS TOOLS</div><h1>Merchant centre</h1><p>Accept payments with a verified merchant profile.</p></div><span className="page-icon-bubble"><Icon name="merchant" size={20} /></span></div>
      <section className="merchant-status-panel"><div className="merchant-status-icon"><Icon name="building" size={23} /></div><div className="merchant-status-content"><span className="status-pill neutral">Not connected</span><h2>Merchant verification</h2><p>Verification status and merchant-only features will appear here when the merchant service is connected.</p></div></section>

      <section className="panel">
        <div className="panel-heading"><div><div className="section-kicker">APPLICATION</div><h2>Business details</h2></div><span className="step-number">01</span></div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="business-name">Registered business name</label>
          <input id="business-name" className="text-input" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Legal business name" required />
          <div className="two-column-fields">
            <div><label className="field-label" htmlFor="business-size">Business size</label><select id="business-size" className="form-select" value={businessType} onChange={(event) => setBusinessType(event.target.value)}><option value="small">Small business</option><option value="large">Large business</option></select></div>
            <div><label className="field-label" htmlFor="business-country">Country / region</label><select id="business-country" className="form-select" value={country} onChange={(event) => setCountry(event.target.value)}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="SG">Singapore</option><option value="AE">United Arab Emirates</option><option value="OTHER">Other</option></select></div>
          </div>
          <div className="upload-document-box"><span className="upload-document-icon"><Icon name="file" size={20} /></span><div><strong>Legal document</strong><small>{documentName || "Choose a document"}</small></div><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Browse</button><input ref={fileRef} type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setDocumentName(event.target.files?.[0]?.name ?? "")} /></div>
          <p className="tiny-note">Choosing a file does not upload it. Secure document submission and country-specific checks require the merchant service.</p>
          <button className="primary-button wide-button" type="submit"><Icon name="document" size={17} /> Submit application</button>
        </form>
        {notice && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      </section>

      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">MERCHANT PRIVILEGES</div><h2>Feature access</h2></div><Icon name="shield" size={22} className="panel-heading-icon" /></div>
        <div className="feature-access-row"><span className="feature-access-icon"><Icon name="credit-card" size={18} /></span><div><strong>Merchant checkout</strong><small>Available after approval</small></div><span className="status-pill neutral">Unavailable</span></div>
        <div className="feature-access-row"><span className="feature-access-icon"><Icon name="check-circle" size={18} /></span><div><strong>Verified merchant badge</strong><small>Shown only after approval</small></div><span className="status-pill neutral">Unavailable</span></div>
      </section>

      <section className="panel autopay-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">RECURRING PAYMENTS</div><h2>Autopay mandates</h2></div><span className="feature-access-icon"><Icon name="refresh" size={18} /></span></div>
        <p className="body-copy">Autopay requires separate merchant approval, clear monthly pricing and explicit mandate permissions.</p>
        <div className="autopay-meta"><span>Monthly fee</span><strong>To be confirmed</strong></div>
        <button type="button" className="secondary-button wide-button" onClick={() => setNotice("Merchant support contact is not configured yet.")}>Contact Subtle Pay <Icon name="arrow-right" size={16} /></button>
      </section>
    </div>
  );
}
