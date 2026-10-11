import { useState } from "react";
import Icon from "../components/Icon";
import type { InvoiceDraft } from "../data/demo";

export default function PaymentPreview({
  draft,
  onBack,
}: {
  draft: InvoiceDraft;
  onBack: () => void;
}) {
  const [downloadNotice, setDownloadNotice] = useState("");

  const downloadPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const context = canvas.getContext("2d");
    if (!context) {
      setDownloadNotice("This browser could not prepare the PNG preview.");
      return;
    }

    context.fillStyle = "#f5f7fb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(64, 64, 1072, 1372);
    context.fillStyle = "#17243e";
    context.font = "600 28px -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("SUBTLE PAY", 112, 140);
    context.fillStyle = "#9b6a1c";
    context.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("DRAFT PREVIEW · NOT SUBMITTED", 112, 202);
    context.fillStyle = "#18243b";
    context.font = "600 42px -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("Payment details", 112, 282);
    context.fillStyle = "#718096";
    context.font = "22px -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("Illustrative invoice layout only — no payment was made.", 112, 328);

    const rows: [string, string][] = [
      ["Recipient", draft.recipientName],
      ["Recipient handle", draft.recipientHandle],
      ["Recipient address", draft.recipientAddress],
      ["Amount denominated in", draft.currency],
      ["Recipient amount", draft.amount],
      ["Token used", draft.token],
      ["Token quantity (sample)", draft.tokenAmount],
      ["Sample conversion", draft.exchangeRate],
      ["Sample fee estimate", draft.fee],
      ["Sender", draft.senderAddress],
      ["Created for preview", draft.createdAtLabel],
      ["Transaction ID", "Not generated"],
      ["Status", "NOT SUBMITTED"],
    ];
    let y = 410;
    for (const [label, value] of rows) {
      context.fillStyle = "#718096";
      context.font = "20px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(label, 112, y);
      context.fillStyle = "#18243b";
      context.font = "600 21px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(value.slice(0, 52), 490, y);
      context.strokeStyle = "#e6eaf1";
      context.beginPath();
      context.moveTo(112, y + 22);
      context.lineTo(1088, y + 22);
      context.stroke();
      y += 68;
    }
    context.fillStyle = "#9b6a1c";
    context.font = "600 19px -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("Preview only. Do not use this file as proof of payment.", 112, 1330);

    canvas.toBlob((blob) => {
      if (!blob) {
        setDownloadNotice("PNG generation was unsuccessful in this browser.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "subtle-pay-draft-preview.png";
      link.click();
      URL.revokeObjectURL(url);
      setDownloadNotice("Draft preview PNG downloaded. It is not a payment receipt.");
    }, "image/png");
  };

  return (
    <div className="page-stack inner-page page-payment-preview">
      <button className="back-link no-print" type="button" onClick={onBack}><Icon name="arrow-left" size={17} /> Back</button>
      <div className="page-intro no-print">
        <div><div className="section-kicker">PAYMENT REVIEW</div><h1>Invoice preview</h1><p>Review the layout that a future confirmed transaction invoice can use.</p></div>
        <span className="page-icon-bubble"><Icon name="receipt" size={20} /></span>
      </div>
      <div className="preview-banner warning-banner no-print"><Icon name="alert" size={17} /><span><strong>Not a receipt.</strong> No transaction was submitted, confirmed or recorded. This draft uses sample values.</span></div>

      <section className="invoice-paper">
        <div className="invoice-brand-row"><span className="invoice-brand-mark">S</span><span className="invoice-brand-wordmark">Subtle Pay</span><span className="invoice-preview-stamp">DRAFT PREVIEW</span></div>
        <div className="invoice-title-block"><span className="section-kicker">PAYMENT DETAILS</span><h2>Transfer summary</h2><p>Prepared for review · {draft.createdAtLabel}</p></div>
        <div className="invoice-status-block"><span className="status-pill warning">Not submitted</span><strong>{draft.amount}</strong><span className="small-muted">Recipient amount · {draft.currency}</span></div>
        <div className="invoice-data-list">
          <div><span>Recipient</span><strong>{draft.recipientName}</strong></div>
          <div><span>Recipient handle</span><strong>{draft.recipientHandle}</strong></div>
          <div><span>Receiving address</span><strong>{draft.recipientAddress}</strong></div>
          <div><span>Sender</span><strong>{draft.senderAddress}</strong></div>
          <div><span>Token selected</span><strong>{draft.token}</strong></div>
          <div><span>Token quantity · sample</span><strong>{draft.tokenAmount} {draft.token}</strong></div>
          <div><span>Exchange rate · sample</span><strong>{draft.exchangeRate}</strong></div>
          <div><span>Fee estimate · sample</span><strong>{draft.fee}</strong></div>
          <div><span>Transaction identifier</span><strong>Not generated</strong></div>
          <div><span>Blockchain status</span><strong>Not submitted</strong></div>
        </div>
        <div className="invoice-disclaimer"><Icon name="info" size={17} /><p>This is a visual invoice preview only. A genuine invoice will use the transaction record and rate captured by the connected payment services.</p></div>
      </section>

      <div className="button-row no-print">
        <button type="button" className="primary-button" onClick={downloadPng}><Icon name="download" size={16} /> Download PNG</button>
        <button type="button" className="secondary-button" onClick={() => window.print()}><Icon name="file" size={16} /> Print / Save PDF</button>
      </div>
      {downloadNotice && <div className="inline-notice no-print"><Icon name="info" size={16} /><span>{downloadNotice}</span></div>}
    </div>
  );
}
