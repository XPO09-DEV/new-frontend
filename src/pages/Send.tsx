import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { DEMO_RECIPIENTS, FIAT_CURRENCIES, TOKENS, formatFiat, type DemoRecipient, type InvoiceDraft, type TokenSymbol } from "../data/demo";

export default function Send({
  onBack,
  onPreviewInvoice,
}: {
  onBack: () => void;
  onPreviewInvoice: (draft: InvoiceDraft) => void;
}) {
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<DemoRecipient | null>(null);
  const [amount, setAmount] = useState("500");
  const [currency, setCurrency] = useState("INR");
  const [token, setToken] = useState<TokenSymbol>("ETH");
  const [quoteSeconds, setQuoteSeconds] = useState<number | null>(null);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [mpin, setMpin] = useState("");
  const [qrNotice, setQrNotice] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quoteSeconds === null || quoteSeconds <= 0) return;
    const timer = window.setTimeout(() => setQuoteSeconds((current) => current === null ? null : Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [quoteSeconds]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return DEMO_RECIPIENTS;
    return DEMO_RECIPIENTS.filter((item) =>
      item.name.toLowerCase().includes(normalized) ||
      item.handle.toLowerCase().includes(normalized) ||
      item.address.toLowerCase().includes(normalized)
    );
  }, [query]);

  const numericAmount = Number(amount);
  const fiat = FIAT_CURRENCIES.find((item) => item.code === currency) ?? FIAT_CURRENCIES[0];
  const selectedToken = TOKENS[token];
  const usdValue = Math.max(0, numericAmount || 0) * fiat.demoUsdPerUnit;
  const tokenAmount = usdValue / selectedToken.priceUsd;
  const estimatedFee = Math.max(0, numericAmount || 0) * 0.005;
  const isQuoteValid = quoteSeconds !== null && quoteSeconds > 0;
  const canCreateQuote = Boolean(recipient) && Number.isFinite(numericAmount) && numericAmount > 0;

  const createQuote = () => {
    if (!canCreateQuote) return;
    setQuoteSeconds(50);
    setAuthorizationOpen(false);
    setMpin("");
  };

  const openInvoicePreview = () => {
    if (!recipient) return;
    onPreviewInvoice({
      recipientName: recipient.name,
      recipientHandle: recipient.handle,
      recipientAddress: recipient.address,
      amount: formatFiat(numericAmount, currency),
      currency,
      token,
      tokenAmount: tokenAmount.toLocaleString("en-US", { maximumFractionDigits: 8 }),
      exchangeRate: `1 ${token} ≈ ${formatFiat(selectedToken.priceUsd / fiat.demoUsdPerUnit, currency)}`,
      fee: formatFiat(estimatedFee, currency),
      senderAddress: "Your wallet · demo address",
      createdAtLabel: new Date().toLocaleString("en-IN"),
    });
  };

  return (
    <div className="page-stack inner-page">
      <button className="back-link" type="button" onClick={onBack}><Icon name="arrow-left" size={17} /> Back to wallet</button>
      <div className="page-intro">
        <div><div className="section-kicker">PAYMENT FLOW</div><h1>Send money</h1><p>Choose a recipient, confirm the amount, then review.</p></div>
        <span className="page-icon-bubble"><Icon name="send" size={20} /></span>
      </div>

      <div className="preview-banner warning-banner"><Icon name="info" size={17} /><span><strong>Prototype only.</strong> Quotes, rates and recipients are sample data. No payment will be sent.</span></div>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">01</span><div><h2>Find recipient</h2><p>Search by name, wallet handle, or address.</p></div></div>
        <label className="field-label" htmlFor="recipient-search">Recipient</label>
        <div className="input-with-icon"><Icon name="search" size={18} /><input id="recipient-search" value={query} onChange={(event) => { setQuery(event.target.value); setRecipient(null); }} placeholder="Name, ani@monad, or wallet address" autoComplete="off" /></div>

        {!recipient && <div className="recipient-options"><span className="muted-label">{query ? "Matching demo contacts" : "Suggested demo contacts"}</span>
          {matches.map((item) => <button key={item.id} type="button" className="recipient-option" onClick={() => { setRecipient(item); setQuery(item.handle); }}>
            <span className="avatar-initials">{item.initials}</span><span className="recipient-copy"><strong>{item.name}</strong><small>{item.handle} · {item.address}</small></span><Icon name="arrow-right" size={16} />
          </button>)}
          {matches.length === 0 && <p className="empty-state">No matching demo contact. Live recipient lookup will be connected later.</p>}
        </div>}

        {recipient && <div className="selected-recipient"><span className="avatar-initials">{recipient.initials}</span><span className="recipient-copy"><strong>{recipient.name}</strong><small>{recipient.handle} · {recipient.address}</small><small className="demo-inline">Demo contact selected</small></span><button type="button" className="quiet-button" onClick={() => { setRecipient(null); setQuery(""); }} aria-label="Change recipient"><Icon name="refresh" size={16} /></button></div>}

        <div className="qr-tools">
          <button type="button" className="secondary-button" onClick={() => setQrNotice("Camera scanning is a UI preview only; a secure QR decoder will be connected later.")}><Icon name="scan" size={17} /> Scan QR</button>
          <button type="button" className="secondary-button" onClick={() => uploadRef.current?.click()}><Icon name="upload" size={17} /> Upload QR image</button>
          <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { if (event.target.files?.[0]) setQrNotice(`${event.target.files[0].name} selected. QR decoding is not connected, so no recipient has been inferred.`); }} />
        </div>
        {qrNotice && <div className="inline-notice"><Icon name="info" size={16} /><span>{qrNotice}</span><button type="button" onClick={() => setQrNotice("")} aria-label="Dismiss notice"><Icon name="close" size={15} /></button></div>}
      </section>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">02</span><div><h2>Amount & conversion</h2><p>Set the amount the recipient should receive.</p></div></div>
        <div className="amount-input-card"><div><span className="muted-label">Recipient gets · demo amount</span><div className="amount-field-row"><input aria-label="Recipient amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setQuoteSeconds(null); }} /><select aria-label="Payment denomination" value={currency} onChange={(event) => { setCurrency(event.target.value); setQuoteSeconds(null); }}>{FIAT_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></div></div><div className="amount-caption">Estimated receiver amount in {currency}</div></div>
        <label className="field-label" htmlFor="token-select">Pay using token</label>
        <select id="token-select" className="form-select full-select" value={token} onChange={(event) => { setToken(event.target.value as TokenSymbol); setQuoteSeconds(null); }}>{Object.values(TOKENS).map((item) => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol}) · sample price ${item.priceUsd.toLocaleString("en-US")}</option>)}</select>
        <div className="conversion-breakdown">
          <div><span>You send · estimated</span><strong>{tokenAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} {token}</strong></div>
          <div><span>Sample conversion</span><strong>1 {token} ≈ {formatFiat(selectedToken.priceUsd / fiat.demoUsdPerUnit, currency)}</strong></div>
          <div><span>Estimated fee · sample</span><strong>{formatFiat(estimatedFee, currency)}</strong></div>
        </div>
        <button className="primary-button wide-button" type="button" disabled={!canCreateQuote} onClick={createQuote}><Icon name="clock" size={17} /> Create 50-second demo quote</button>
        {quoteSeconds !== null && <div className={isQuoteValid ? "quote-status" : "quote-status expired"}><span className={isQuoteValid ? "quote-indicator" : "quote-indicator expired"} /><div><strong>{isQuoteValid ? `Demo quote preview · expires in 00:${String(quoteSeconds).padStart(2, "0")}` : "Demo quote expired"}</strong><small>{isQuoteValid ? "Countdown is illustrative only. No backend quote is locked." : "Refresh to preview a new quote. Rates may change after integration."}</small></div>{!isQuoteValid && <button type="button" className="quiet-button" onClick={createQuote}>Refresh</button>}</div>}
      </section>

      <section className="panel send-panel">
        <div className="step-heading"><span className="step-number">03</span><div><h2>Authorization preview</h2><p>Review the handoff before any future transaction.</p></div></div>
        <div className="authorization-note"><Icon name="shield" size={20} /><div><strong>Secure authorization comes later</strong><p>MPIN, biometrics, quote locking and transaction submission require backend and device-auth integration. This prototype cannot authorize or send funds.</p></div></div>
        <button className="secondary-button wide-button" type="button" disabled={!isQuoteValid || !recipient} onClick={() => setAuthorizationOpen((open) => !open)}>{authorizationOpen ? "Hide preview step" : "Review payment details"} <Icon name="arrow-right" size={16} /></button>
        {authorizationOpen && <div className="authorization-preview"><label className="field-label" htmlFor="mpin-preview">MPIN UI preview</label><input id="mpin-preview" className="text-input pin-input" value={mpin} onChange={(event) => setMpin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" placeholder="Enter any 4–6 digits for UI preview" /><p className="tiny-note">This field does not verify credentials. Do not enter a real MPIN.</p><button className="primary-button wide-button" type="button" disabled={mpin.length < 4} onClick={openInvoicePreview}>Preview invoice · no payment submitted <Icon name="arrow-right" size={17} /></button></div>}
      </section>
    </div>
  );
}
