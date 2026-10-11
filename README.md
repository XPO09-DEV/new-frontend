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

The dashboard uses the CoinStats Open API for cryptocurrency data, with the `blockchains=monad` filter for the Monad asset list. CoinStats' `/coins` endpoint supplies current prices and daily change; `/coins/{coinId}/charts` supplies history for the interactive chart (1D, 1W, 1M, 3M, 1Y and All). The widget shows three entries initially and allows expanding the currently returned list. If CoinStats does not return assets for the Monad filter on your plan, the UI shows an unavailable state rather than substituting fabricated data.

1. Copy `.env.example` to `.env.local`.
2. Add your CoinStats Open API key to `VITE_COINSTATS_API_KEY`.
3. Keep `VITE_COINSTATS_API_BASE_URL=https://openapiv1.coinstats.app` and `VITE_COINSTATS_API_KEY_HEADER=X-API-KEY`.

**API-key security:** the browser frontend exposes `VITE_*` variables in its built JavaScript. This is suitable only for local testing with a key whose usage and restrictions you understand. For a production deployment, move the CoinStats API calls behind a server-side proxy and store the key in the backend environment.

The asset list is independent of any connected wallet balance, so available Monad-listed assets can appear even when the user does not hold them. Real user balances are not inferred from market data: a wallet/balance integration must supply holdings before balances or total holdings value can be shown.
## Integration sequence

Connect wallet and account services first, then market and FX providers, payment quotes and expiry, secure authorization, QR decoding, confirmed transaction history and invoices, and merchant verification.
