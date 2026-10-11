import { useState } from "react";
import { CURRENCIES } from "../utils/currencies";

type Props = {
  value: string;
  onChange: (code: string) => void;
  className?: string;
};

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>;
}

function ChevronDownIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m18 6-12 12M6 6l12 12" /></svg>;
}

export default function CurrencyPicker({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const list = Object.entries(CURRENCIES).filter(([code, currency]) =>
    (code + " " + currency.name).toLowerCase().includes(q.toLowerCase().trim())
  );

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQ("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 font-medium ${className}`}
      >
        {value} <ChevronDownIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose currency"
            className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choose currency</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close currency picker">
                <CloseIcon />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
              <span className="text-gray-400"><SearchIcon /></span>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search (e.g. euro or EUR)"
                className="w-full bg-transparent outline-none"
                aria-label="Search currencies"
              />
            </div>

            <div className="overflow-y-auto">
              {list.map(([code, currency]) => (
                <button
                  type="button"
                  key={code}
                  onClick={() => pick(code)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left ${
                    code === value ? "bg-soft text-brand" : "hover:bg-gray-50"
                  }`}
                >
                  <span>{currency.name}</span>
                  <span className="text-sm text-gray-500">{code}</span>
                </button>
              ))}
              {list.length === 0 && <p className="p-4 text-center text-gray-400">No match</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
