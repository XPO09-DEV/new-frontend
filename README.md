# Subtle Pay Frontend

Mobile-first React + TypeScript + Vite application.

## Run locally

Requirements: Node.js 22 or newer.

```powershell
npm ci
npm run dev
```

The backend should also be running on `http://127.0.0.1:4000`. The frontend calls the server-side wallet API at `GET /api/wallet/assets?address=0x...`; an explicit refresh adds `refresh=true` and bypasses both the frontend and backend's balance cache.

## Provider security

Ankr and CoinStats credentials belong in the backend's untracked `.env` file or hosting secret manager under `ANKR_API_KEY` and `COINSTATS_API_KEY`. Never put them in frontend `VITE_*` variables: those values are visible in the browser bundle.

Copy `.env.example` to `.env.local` for local frontend configuration. Set `VITE_SUBTLEPAY_API_BASE_URL=http://localhost:4000` for local development (when Vite is opened at `http://localhost:5173`); in production, use the deployed API origin or leave blank when frontend and backend are reverse-proxied under the same origin. API secrets must never be committed.

## Wallet and payment safety

This hackathon integration uses the backend's account system: registration creates an account ID and a custodial wallet whose private key is encrypted and retained server-side. The authenticated account wallet is used for the payment and receiving screens; payments are signed by the backend, not by an injected browser wallet. The integration branch is locked to native MON on Monad Testnet (chain ID 10143). The Send form accepts a USD/INR reference value and shows an estimate; the backend converts that value to testnet MON using its configured rate service. Testnet assets have no cash value. Fund each account wallet with testnet MON before trying to send, and never use real assets or production credentials in this build. This is a hackathon prototype and has not been independently security-audited.

## Search, prices and charts

Asset search is intended to use the configured Subtle Pay backend's market endpoints for CoinStats-backed indexed listings. The results indicate the chain and known contract; the list cannot discover every possible contract on all blockchains. Cached chart data is retained for longer periods and stale/provider failures are shown instead of inventing market values.

## Privacy

The optional resume-consent feature stores the last page and selected asset on this device after consent. Login history and admin exports are server-side features; any region sharing should be explicit and disclosed.
