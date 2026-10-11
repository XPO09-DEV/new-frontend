import { useState, type ChangeEvent } from "react";
import { CURRENCIES, DEFAULT_CURRENCY_KEY, readDefaultCurrency } from "../data/currencies";
import "./CurrencyPreference.css";

export default function CurrencyPreference() {
  const [currency, setCurrency] = useState(readDefaultCurrency);
  const [saved, setSaved] = useState(false);

  function saveDefault() {
    try {
      window.localStorage.setItem(DEFAULT_CURRENCY_KEY, currency);
      window.dispatchEvent(new CustomEvent("subtlepay:default-currency", { detail: currency }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <section className="currency-pref-card" aria-labelledby="currency-pref-heading">
      <div className="currency-pref-heading-row">
        <span className="currency-pref-symbol" aria-hidden="true">{CURRENCIES.find((item) => item.code === currency)?.symbol ?? "$"}</span>
        <div>
          <h2 id="currency-pref-heading">Default display currency</h2>
          <p>Your token prices and portfolio totals will use this currency whenever you open the wallet.</p>
        </div>
      </div>
      <label className="currency-pref-label" htmlFor="currency-pref-select">Currency</label>
      <select id="currency-pref-select" className="currency-pref-select" value={currency} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setCurrency(event.target.value); setSaved(false); }}>
        {CURRENCIES.map((option) => (
          <option key={option.code} value={option.code}>{option.symbol}  {option.code.toUpperCase()} — {option.name}</option>
        ))}
      </select>
      <button type="button" className="currency-pref-save" onClick={saveDefault}>Save default currency</button>
      <p className={saved ? "currency-pref-feedback saved" : "currency-pref-feedback"} role="status">
        {saved ? `Default currency saved as ${currency.toUpperCase()}.` : "This preference is saved on this device."}
      </p>
    </section>
  );
}
