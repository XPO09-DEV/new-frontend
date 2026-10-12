# Subtle Pay Frontend

Mobile-first React + TypeScript + Vite application.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Backend connection

The frontend connects to the wallet-assets API through a configurable backend URL. Do not place an Ankr API key in a Vite variable or commit one to this repository.

1. Copy `.env.example` to your untracked `.env.local`.
2. Set `VITE_SUBTLEPAY_API_BASE_URL` to the backend origin if the API isn't reverse-proxied under the frontend's own origin.
3. Set `VITE_SUBTLEPAY_WALLET_ASSETS_PATH` to the backend's wallet-assets route. It defaults to `/api/wallet/assets`.
4. Keep `ANKR_API_KEY` in the backend's environment only and restart the frontend dev server after changing its environment.

### Wallet-assets endpoint contract

The frontend issues:

```http
GET /api/wallet/assets?address=0x... 
```

A forced refresh also adds `refresh=true`. The request includes same-origin credentials so the backend can apply its own authentication/authorization rules.

The response should be either an array of assets or an object containing `assets: [...]`. Preferred fields are `id`, `blockchain`, `chainLabel`, `tokenName`, `tokenSymbol`, `balance`, `balanceUsd`, `priceUsd`, `tokenDecimals`, `contractAddress`, `thumbnail`, `tokenType`, and optionally `balanceRawInteger`. The frontend also accepts the matching Ankr balance-item shape and normalizes it. The list is deduplicated and cached in the browser for 60 seconds; explicit refresh bypasses that cache.

The backend should verify the caller's authorization, validate the wallet address, apply rate limits, keep provider secrets server-side, and return only the data allowed for that request. A public wallet address is not proof of ownership or identity.

## Multichain search and charts

The token-list search opens a dedicated full-screen discovery panel inside the current view. It supports indexed assets across the chains configured in `TokenAssetsWidget.tsx`, shows network and available contract metadata, and keeps market search separate from a wallet's actual holdings. Search coverage depends on the market indexer's listings; it cannot enumerate every contract on every chain.

Market prices are cached and refreshed at controlled intervals. Historical chart requests use longer cache windows for longer timeframes, abort when the selected asset/timeframe changes, and provide a retry action when history is temporarily unavailable. An indexed token without a supported market-history ID may display its balance without a chart.

## Wallet and transaction safety

The wallet card only displays assets returned for the connected wallet address. Sending is restricted to supported direct EVM transfers on the selected asset's network; the frontend does not pretend a cross-chain bridge exists. The injected wallet remains responsible for account access and transaction approval, and Subtle Pay never handles private keys. Address format or indexed activity alone does not verify a recipient's identity or guarantee that a payment will succeed.

The optional resume-consent prompt stores the last page and selected asset on the user's device only after consent. It is not analytics.

## Provider credentials

Any `VITE_*` variable is visible in browser code. Use local/demo keys only for local testing. Paid/private CoinGecko or CoinStats credentials should also be proxied through the backend in production, rather than shipped in the browser bundle.
