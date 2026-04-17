# pUSD Wrapper App

This fork is now a single-purpose app that wraps `USDC.e` into `pUSD` on Polygon.

## What the App Does

- Connect wallet (RainbowKit)
- Read `USDC.e` and `pUSD` balances
- Approve the Polymarket collateral onramp when needed
- Execute `wrap(_asset, _to, _amount)` on the onramp contract
- Show transaction status and a Polygonscan link

## Stack

- Next.js + TypeScript
- RainbowKit + wagmi
- viem for Polygon reads/writes

## Required Environment Variables

Create `.env`:

```bash
NEXT_PUBLIC_POLYGON_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
