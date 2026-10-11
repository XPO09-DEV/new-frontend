import { useRef, useState, type FormEvent } from "react";
import Icon from "../components/Icon";

export default function Merchant() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("small");
  const [country, setCountry] = useState("IN");
  const [documentName, setDocumentName] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDraftSaved(true);
    setNotice("Application draft saved in this page session only. Nothing was uploaded or submitted.");
  };

  return (
    <div className="page-stack inner-page">
      <div className="page-intro"><div><div className="section-kicker">BUSINESS TOOLS</div><h1>Merchant centre</h1><p>Accept payments with a verified Subtle Pay merchant profile.</p></div><span className="page-icon-bubble"><Icon name="merchant" size={20} /></span></div>
      <div className="preview-banner warning-banner"><Icon name="info" size={17} /><span>Merchant review, document upload and licensing are not connected yet. This page is a UI prototype.</span></div>
      <section className="merchant-status-panel"><div className="merchant-status-icon"><Icon name="building" size={23} /></div><div className="merchant-status-content"><span className="status-pill neutral">Not verified</span><h2>Build your merchant profile</h2><p>Merchant-only tools and badges stay locked until a real verification service approves the application.</p></div></section>

      <section className="panel">
        <div className="panel-heading"><div><div className="section-kicker">01 · APPLICATION</div><h2>Business details</h2></div><span className="step-number">01</span></div>
        <form className="form-stack" onSubmit={saveDraft}>
          <label className="field-label" htmlFor="business-name">Registered business name</label>
          <input id="business-name" className="text-input" value={businessName} onChange={(event) => { setBusinessName(event.target.value); setDraftSaved(false); }} placeholder="Your legal business name" required />
          <div className="two-column-fields">
            <div><label className="field-label" htmlFor="business-size">Business size</label><select id="business-size" className="form-select" value={businessType} onChange={(event) => setBusinessType(event.target.value)}><option value="small">Small business</option><option value="large">Large business</option></select></div>
            <div><label className="field-label" htmlFor="business-country">Country / region</label><select id="business-country" className="form-select" value={country} onChange={(event) => setCountry(event.target.value)}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="SG">Singapore</option><option value="AE">United Arab Emirates</option><option value="OTHER">Other / to be added</option></select></div>
          </div>
          <div className="upload-document-box"><span className="upload-document-icon"><Icon name="file" size={20} /></span><div><strong>Legal document</strong><small>{documentName || "Choose a document for this local UI preview"}</small></div><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Browse</button><input ref={fileRef} type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setDocumentName(event.target.files?.[0]?.name ?? "")} /></div>
          <p className="tiny-note">Selecting a file does not upload it. Country-specific requirements and secure storage must be implemented before launch.</p>
          <button className="primary-button wide-button" type="submit"><Icon name="document" size={17} /> Save application draft</button>
        </form>
        {draftSaved && <div className="inline-notice"><Icon name="check-circle" size={17} /><span>Draft prepared locally for {businessName || "your business"} ({businessType === "small" ? "small business" : "large business"}). No verification was requested.</span></div>}
        {notice && <p className="tiny-note">{notice}</p>}
      </section>

      <section className="panel">
        <div className="panel-heading compact"><div><div className="section-kicker">02 · MERCHANT PRIVILEGES</div><h2>Feature access</h2></div><Icon name="shield" size={22} className="panel-heading-icon" /></div>
        <div className="feature-access-row"><span className="feature-access-icon"><Icon name="credit-card" size={18} /></span><div><strong>Merchant checkout</strong><small>Available after approval and integration</small></div><span className="status-pill neutral">Locked</span></div>
        <div className="feature-access-row"><span className="feature-access-icon"><Icon name="check-circle" size={18} /></span><div><strong>Verified merchant badge</strong><small>Never shown before actual approval</small></div><span className="status-pill neutral">Locked</span></div>
      </section>

      <section className="panel autopay-panel">
        <div className="panel-heading compact"><div><div className="section-kicker">03 · RECURRING PAYMENTS</div><h2>Autopay mandates</h2></div><span className="feature-access-icon"><Icon name="refresh" size={18} /></span></div>
        <p className="body-copy">Autopay requires a separately approved merchant arrangement, transparent monthly pricing, and explicit mandate permissions.</p>
        <div className="autopay-meta"><span>Monthly fee</span><strong>To be configured by Subtle Pay</strong></div>
        <button type="button" className="secondary-button wide-button" onClick={() => setNotice("Autopay is unavailable in this prototype. The request and approval workflow will be connected later.")}>Request Autopay information <Icon name="arrow-right" size={16} /></button>
        {notice.includes("Autopay") && <div className="inline-notice"><Icon name="info" size={16} /><span>{notice}</span></div>}
      </section>
    </div>
  );
}
