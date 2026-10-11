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

The dashboard now uses CoinGecko on-chain endpoints for the **Monad network only** to discover tokens, load token prices and draw OHLCV chart history. It discovers tokens from the Monad trending-pools feed, shows the first three by default, and lets users expand the list to all tokens returned by that feed. Chart timeframes are interactive. If live data fails, the widget shows an unavailable state rather than inventing prices or drawing sample history.

1. Copy `.env.example` to `.env.local`.
2. Add your CoinGecko API key to `VITE_COINGECKO_API_KEY`.
3. For a Demo key, keep `VITE_COINGECKO_API_BASE_URL=https://api.coingecko.com/api/v3` and `VITE_COINGECKO_API_KEY_HEADER=x-cg-demo-api-key`.
4. For a Pro key, use `VITE_COINGECKO_API_BASE_URL=https://pro-api.coingecko.com/api/v3` and `VITE_COINGECKO_API_KEY_HEADER=x-cg-pro-api-key`, according to your plan.

**API-key security:** Vite exposes `VITE_*` variables in browser code. This setup is convenient for local testing but does not keep the key secret in a public deployment. For production, move requests behind a server-side proxy and keep the provider key there.

The list is independent of the connected wallet balance, so supported tokens remain visible even without a holding. Actual user balances are not yet available: a wallet/balance integration must supply holdings before the UI can report how many tokens the user owns. The widget deliberately shows balance-unavailable indicators until then.

The current blue-gradient wallet card and silver Subtle Pay branding are retained. The opening animation lasts approximately 1.25 seconds.

## Integration sequence

Connect wallet and account services first, then market and FX providers, payment quotes and expiry, secure authorization, QR decoding, confirmed transaction history and invoices, and merchant verification.
