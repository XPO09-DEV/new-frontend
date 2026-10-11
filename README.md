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

## Monad market widget — temporary demo mode

For local viewing only, the dashboard calls the CoinStats Open API directly from the browser and requests assets filtered to the Monad blockchain. Chart ranges are 1D, 1W, 1M, 3M, 1Y and All.

1. Create a local `.env` file from `.env.example`.
2. Put your CoinStats key in `VITE_COINSTATS_API_KEY`.
3. Restart Vite after changing the environment file.

**Security warning:** Vite variables prefixed with `VITE_` are bundled into client-side code. Anyone using the app can inspect the key in browser requests. This is strictly for temporary local testing; do not deploy this configuration publicly. For production, proxy CoinStats requests through a server and store the key only on that server.

Wallet balances are not provided by CoinStats and remain unavailable until wallet integration supplies them.
## Integration sequence

Connect wallet and account services first, then market and FX providers, payment quotes and expiry, secure authorization, QR decoding, confirmed transaction history and invoices, and merchant verification.
