# Subtle Pay frontend

React + TypeScript + Vite client for the Subtle Pay Monad testnet backend.

## Requirements

- Node.js 22 or newer
- The [Subtle Pay backend](https://github.com/XPO09-DEV/Subtle-Pay-backend) running locally on port 4000

## Run locally

1. Configure and start the backend first. Follow its README and create a private local `.env` from `.env.example`. Fill in fresh, valid secrets and Monad testnet settings. Never commit either `.env` file.
2. In this repository, install dependencies and start Vite:

   ```bash
   npm ci
   npm run dev
   ```

3. Open the local URL printed by Vite (default `http://localhost:5173`).

During development, Vite proxies the API endpoints to `http://127.0.0.1:4000`; leave `VITE_API_URL` empty for this local setup. The client stores the short-lived access token and rotating refresh token in browser local storage and refreshes the session when an authenticated API call returns 401.

## Production build

Set `VITE_API_URL` to the deployed backend's HTTPS origin before building. Configure the backend `CORS_ORIGINS` to include the exact frontend origin.

```bash
npm ci
npm run build
npm run preview
```

## Important prototype limits

Payments run on Monad testnet. Withdrawals are simulated records; they do not send money to a bank. Cross-chain bridge previews are simulations, not completed transfers. Do not use this prototype to store production funds or real user secrets.
