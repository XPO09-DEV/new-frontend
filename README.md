# Subtle Pay Frontend

Mobile-first React + TypeScript + Vite application.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Integration status

The frontend is currently independent of the backend. Wallet balances, market prices, fiat exchange rates, recipient lookup, secure authorization, QR decoding, transaction history, invoice records and merchant verification will remain unavailable until their respective services are connected.

Payments cannot be submitted from the current frontend. No live balances, rates or completed transactions are fabricated.

The current blue-gradient wallet card and silver Subtle Pay branding are retained. The opening animation lasts approximately 1.25 seconds.

## Integration sequence

Connect wallet and account services first, then market and FX providers, payment quotes and expiry, secure authorization, QR decoding, confirmed transaction history and invoices, and merchant verification.
