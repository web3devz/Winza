# Winza Smart Contracts & On-Chain Architecture

## Project Overview

Winza is a real-time, on-chain prediction and lottery gaming platform built for speed, transparency, and continuous market interaction. The smart contracts implement a modular architecture that enables fair, instant settlement of prediction games and lottery draws entirely on-chain.

Unlike traditional betting platforms that rely on delayed settlement and opaque systems, Winza operates entirely on-chain with verifiable, auditable outcomes. This ensures every action is trust-minimized and every result is cryptographically proven.

## Design Philosophy

To support high-frequency interaction, Winza is designed with a **modular on-chain architecture**. Separate Linera applications manage:
- **Token Management**: Fungible token handling for betting collateral
- **Bet Orchestration**: Prediction round logic and player interactions
- **Settlement & Resolution**: Automatic round closure and winner determination
- **Leaderboard Tracking**: Real-time player statistics
- **Lottery Operations**: Ticket management and winner generation

This modular design allows the system to scale while remaining responsive and enabling seamless cross-application communication.

## Linera Applications

### 1. Native App
A pure fungible token application that:
- Manages the platform's native token used for betting
- Handles escrow and token transfers between players and the platform
- Ensures secure token locking during active rounds

### 2. Leaderboard App
Tracks player statistics across all games:
- Wins and losses per player
- Total amounts won/lost
- Net winnings and ranking
- Updates automatically from on-chain round resolutions

### 3. Rounds App
Core prediction game engine:
- Manages time-boxed prediction rounds (e.g., 1-minute rounds for crypto price predictions)
- Accepts bets from players on UP/DOWN price directions
- Supports multiple bets per player per round
- Stores round state and outcome data
- Resolves rounds automatically using on-chain price feeds

### 4. Lottery App
Real-time lottery system:
- Manages ticket purchases on-chain
- Generates winners instantly without manual intervention
- Instantly distributes prizes through smart contract logic
- All outcomes verifiable and audit-friendly

### 5. Winzareal App
Entry point and coordinator:
- Provides unified interface for user interactions
- Orchestrates calls across Native, Rounds, and Lottery apps
- Manages `transferWithPrediction` flow for seamless betting

## Key Features

### Prediction Games
- **Real-Time Rounds**: Automated round management with fixed intervals
- **Dual-Side Betting**: Users can bet on both UP and DOWN in the same round
- **Instant Resolution**: Rounds close automatically and resolve with verifiable on-chain data
- **Fair Payouts**: Winners receive payouts based on pool size and risk; losing bets contribute to the pool
- **Auditable Results**: All outcomes stored on-chain for verification

### Lottery System
- **On-Chain Tickets**: Tickets are purchased as on-chain transactions
- **Instant Winners**: Smart contract-generated winners with no manual delays
- **Transparent Distribution**: All prize distributions recorded and verifiable
- **Trust-Minimized**: No middlemen; outcomes are deterministic and cryptographically secure

### Cross-Application Communication

#### Betting Flow
1. **User** calls `transferWithPrediction` on **Winzareal**
2. **Winzareal** calls **Native** to transfer tokens to escrow
3. Upon success, **Winzareal** calls **Rounds** to record the prediction bet
4. Bet is confirmed and included in the active round

#### Resolution Flow
1. **Admin/Oracle** calls `ResolveRound` on **Rounds**
2. **Rounds** determines the winning direction using verified price data
3. **Rounds** calculates payouts and calls **Winzareal** to distribute rewards
4. **Winzareal** calls **Native** to transfer winnings back to winners
5. **Rounds** updates **Leaderboard** with stats for all participants

## Deployment

The project includes an automated deployment script `deploy.sh` that handles the order of deployment and linking:

```bash
./deploy.sh
```

### Deployment Order

1. **Deploy Native App** → Save `NATIVE_ID`
2. **Deploy Leaderboard App** → Save `LEADERBOARD_ID`
3. **Deploy Rounds App** (linked to Native and Leaderboard) → Save `ROUNDS_ID`
4. **Deploy Lottery App** (optional, linked to Native) → Save `LOTTERY_ID`
5. **Deploy Winzareal App** (linked to Native and Rounds) → Save `WINZAREAL_ID`
6. **Link Rounds** back to Winzareal via `set_Winza_app_id` mutation

### Manual Deployment (Reference)

```bash
# 1. Deploy Native
linera_cli publish-bytecode-for-app-chain native/

# 2. Deploy Leaderboard
linera_cli publish-bytecode-for-app-chain leaderboard/

# 3. Deploy Rounds (with parameters)
linera_cli create-application-for-app-chain \
  --application rounds/ \
  --parameters "{\"native_app_id\": \"<NATIVE_ID>\", \"leaderboard_app_id\": \"<LEADERBOARD_ID>\"}"

# 4. Deploy Winzareal (with parameters)
linera_cli create-application-for-app-chain \
  --application Winzareal/ \
  --parameters "{\"native_app_id\": \"<NATIVE_ID>\", \"rounds_app_id\": \"<ROUNDS_ID>\"}"

# 5. Link Rounds to Winzareal
linera_cli mutation rounds --target <ROUNDS_ID> \
  --call "set_Winza_app_id(\"{\\\"id\\\": \\\"<WINZAREAL_ID>\\\"}\")"
```

## Security Considerations

- **Token Safety**: All tokens are locked in escrow during active rounds
- **Immutable Outcomes**: Round results are recorded on-chain and cannot be modified
- **Fair Resolution**: Price data comes from verified oracles or on-chain feeds
- **Access Control**: Only authorized roles (admin, oracle) can trigger round resolution
- **Audit Trail**: All bets, resolutions, and payouts are permanently recorded

## Platform Economics

- **Small Platform Fee**: A modest percentage from each round sustains the ecosystem
- **Reward System**: Active players are rewarded through leaderboard rankings
- **Prize Pool**: Losing-side bets contribute to winning-side payouts
- **Transparent Accounting**: All fee structures and payouts visible on-chain

## Future Enhancements

- Support for additional asset pairs (forex, commodities, indexes)
- Dynamic round intervals based on market volatility
- Multi-sided betting (not just UP/DOWN)
- Cross-chain prediction markets
- Governance token and DAO participation

## Technical Stack

- **Framework**: Linera (application chains with WebAssembly)
- **Language**: Rust
- **Consensus**: Byzantine Fault Tolerant (BFT) consensus via Linera
- **Storage**: Persistent on-chain state with guaranteed finality
- **Scalability**: Modular app design enabling parallel processing

## Getting Started

```bash
cd smartcontract
cargo build --release
./deploy.sh
For detailed deployment instructions, see individual app READMEs in their respective directories.
- **Leaderboard**: Automatically tracks user performance across all games.
- **Cross-Chain**: Supports betting from different chains.

## Deployment

The project includes an automated deployment script `deploy.sh` that handles the order of deployment and linking.

### Quick Start

```bash
./deploy.sh
```

This script will:
1. Deploy `native` app.
2. Deploy `leaderboard` app.
3. Deploy `rounds` app (linked to native and leaderboard).
4. Deploy `Winzareal` app (linked to native and rounds).
5. Perform the final handshake to link `rounds` back to `Winzareal`.
6. Output all Application IDs to `app_ids.txt`.

### Manual Deployment Steps (Reference)

If you need to deploy manually, here is the order:

1.  **Deploy Native**
    *   Save `NATIVE_ID`.
2.  **Deploy Leaderboard**
    *   Save `LEADERBOARD_ID`.
3.  **Deploy Rounds**
    *   Parameters: `{"native_app_id": "...", "leaderboard_app_id": "..."}`
    *   Save `ROUNDS_ID`.
4.  **Deploy Winzareal**
    *   Parameters: `{"native_app_id": "...", "rounds_app_id": "..."}`
    *   Required IDs: `native_app_id`, `rounds_app_id`
    *   Save `WinzaREAL_ID`.
5.  **Link Rounds**
    *   Call `set_Winza_app_id` mutation on `rounds` with `WinzaREAL_ID`.

## How Cross-Application Calls Work

### 1. Placing a Bet
