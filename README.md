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

The frontend is currently independent of the backend. Wallet balances, recipient lookup, secure authorization, QR decoding, transaction history, invoice records and merchant verification remain unavailable until their respective services are connected.

Payments cannot be submitted from the current frontend. No live balances, exchange rates or completed transactions are fabricated.

## Monad market widget

The dashboard obtains market data through the Subtle Pay backend at `/market/monad/assets` and `/market/monad/charts/:coinId`. The backend calls CoinStats with the fixed `blockchains=monad` filter, and only permits chart requests for coin IDs returned by that Monad-filtered lookup. The API key is stored on the backend and never sent to the browser.

1. Copy `.env.example` to `.env.local`.
2. Keep `VITE_API_BASE_URL=http://127.0.0.1:4000` for local development.
3. Configure `COINSTATS_API_KEY` in the backend's ignored `.env` file; use the same setting in your backend hosting environment for deployment.
4. Start/restart the backend and then start the frontend.

The widget shows three listed coins at first and provides **See more** for the additional results returned by CoinStats. Chart ranges are 1D, 1W, 1M, 3M, 1Y and All. If CoinStats returns an error or doesn't list assets for Monad, the widget shows an unavailable state instead of fabricated data.

Token balances are separate from price listings. The wallet currently does not provide on-chain holdings to this market widget, so balances remain unavailable until wallet integration supplies them.
## Integration sequence

Connect wallet and account services first, then market and FX providers, payment quotes and expiry, secure authorization, QR decoding, confirmed transaction history and invoices, and merchant verification.
