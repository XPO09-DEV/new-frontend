# Subtle Pay Frontend

Mobile-first React + TypeScript + Vite application.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Temporary frontend-only Ankr mode

For local development, wallet balance discovery currently calls Ankr directly from the browser. **The API key is therefore exposed in the frontend bundle and browser network requests.** Use only a rotated/testing key for this temporary mode and restrict its allowed origins/usage where Ankr supports those controls. Never use this setup for a public production deployment.

1. Create a local `.env.local` file in the project root (the file is ignored by Git).
2. Add `VITE_ANKR_API_KEY=your_rotated_ankr_key` to that local file.
3. Restart Vite after changing the file.

Do not paste the real key into source files, `.env.example`, or a Git commit. The tracked example contains placeholders only. Before public release, move Ankr requests into your backend and keep the key in the server environment.

The direct client integration calls Ankr's multichain account-balance method with pagination and separately checks the native Monad balance. Successful wallet responses are cached in memory for 60 seconds; the explicit refresh action bypasses that cache. Provider coverage and availability determine which balances can be returned.

## Multichain search and charts

The token-list search opens a dedicated full-screen discovery panel inside the current view. It supports indexed assets across the chains configured in `TokenAssetsWidget.tsx`, shows network and available contract metadata, and keeps market search separate from actual wallet holdings. Search coverage depends on the market indexer's listings; it cannot enumerate every contract on every chain.

Market prices are cached and refreshed at controlled intervals. Historical chart requests use longer cache windows for longer timeframes, abort when the selected asset/timeframe changes, and provide a retry action when history is temporarily unavailable. An indexed token without a supported market-history ID may display its balance without a chart.

## Wallet and transaction safety

The wallet card only displays assets returned for the connected wallet address. Sending is restricted to supported direct EVM transfers on the selected asset's network; the frontend does not pretend a cross-chain bridge exists. The injected wallet remains responsible for account access and transaction approval, and Subtle Pay never handles private keys. Address format or indexed activity alone does not verify a recipient's identity or guarantee that a payment will succeed.

The optional resume-consent prompt stores the last page and selected asset on the user's device only after consent. It is not analytics.

## Other provider credentials

Any `VITE_*` variable is visible in browser code. CoinGecko and CoinStats keys provided through Vite variables are also browser-visible; proxy private/paid credentials through the backend before public deployment.
