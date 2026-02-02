# Winza Frontend

## Overview

Winza is a real-time, on-chain prediction and lottery gaming platform built for speed, transparency, and continuous market interaction. The frontend provides a clean, mobile-friendly interface enabling users to participate in live crypto price prediction rounds and lottery games where outcomes are generated and resolved in real time using smart contracts.

Unlike traditional betting platforms that rely on delayed settlement and opaque systems, Winza operates entirely on-chain. This frontend connects directly to Linera smart contracts via GraphQL endpoints and WebSocket subscriptions, ensuring live updates and instant feedback for every user action.

## Key Features

### Prediction Games
- **Real-Time Betting**: Users place single or multiple bets on live asset movements (BTC, ETH, etc.) within time-boxed rounds
- **Dual-Side Betting**: Supports betting on both UP and DOWN directions in the same round; winning-side bets are paid out, losing-side bets are lost
- **Instant Settlement**: Rounds are automatically closed, resolved, and recorded with fair outcomes verified on-chain

### Lottery System
- **On-Chain Tickets**: Purchase lottery tickets directly through smart contracts
- **Instant Winners**: Winners are generated instantly without manual intervention
- **Transparent Results**: All outcomes are auditable and trust-minimized

### User Experience
- **Leaderboard**: Aggregates player statistics (wins, losses, total won/lost, net winnings) with live updates from on-chain events
- **AI Assistant**: A built-in chat overlay that analyzes live market context and recent round history to suggest predictions. It fetches 1m candles from Binance and combines them with latest rounds data to provide data-driven guidance
- **Mobile Optimization**: Responsive design with mobile-friendly interface, PWA support, and optimized interactions for on-the-go gaming
- **Wallet Integration**: Fast wallet-based onboarding with MetaMask support

## Technology Stack

- **Frontend**: React + Vite for fast builds and hot module reloading
- **Blockchain**: Linera HTTP GraphQL endpoints with WebSocket subscriptions for real-time updates
- **Caching**: PocketBase for fast leaderboard data rendering and offline support
- **Styling**: Tailwind CSS for responsive, modern UI design
- **Market Data**: Binance API integration for live price candles

## Architecture

The frontend communicates with multiple on-chain applications:
- **Native App**: Manages token transfers and escrow
- **Rounds App**: Handles prediction round logic and bet placement
- **Lottery App**: Manages ticket purchases and winner resolution
- **Leaderboard App**: Tracks player statistics

Orchestrator scripts keep data synchronized between chain applications and the UI, ensuring users always see current state without delay.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to start playing.
