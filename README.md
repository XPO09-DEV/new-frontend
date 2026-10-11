# Subtle Pay — Frontend Prototype

A mobile-first React + TypeScript + Vite prototype for the Subtle Pay wallet experience.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Prototype status

This repository is intentionally frontend-only. It does not connect to a wallet, backend API, exchange-rate provider, blockchain, authentication provider, camera QR decoder, or merchant verification service.

All balances, exchange values, token prices, contacts, QR patterns, and transaction activity are illustrative sample data. The Send flow only creates a local draft preview; it cannot submit a payment. The invoice preview is not proof of payment.

The opening card animation lasts approximately 1.25 seconds. The current blue-gradient card surface and silver Subtle Pay branding are retained.

## Integration sequence

Connect account and wallet services, live FX/market data, quote creation and expiry, authorization, QR decoding, confirmed transaction history, downloadable transaction invoices, and merchant verification only after the backend contracts and supported networks are defined.
