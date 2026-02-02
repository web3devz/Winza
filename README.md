# Winza - Real-Time On-Chain Prediction & Lottery Platform

Winza is a real-time, on-chain prediction and lottery gaming platform built for speed, transparency, and continuous market interaction. It allows users to participate in live crypto price prediction rounds and lottery games where outcomes are generated and resolved instantly using smart contracts.

## Overview

Unlike traditional betting platforms that rely on delayed settlement and opaque systems, Winza operates entirely on-chain. Prediction rounds run at fixed intervals, enabling users to place single or multiple bets on live asset movements such as BTC and ETH. Each round is automatically closed, resolved, and recorded, ensuring fair outcomes and verifiable results.

Winza also integrates a real-time lottery system where tickets can be purchased on-chain and winners are generated instantly without manual intervention. All games are governed by smart contracts, making every action auditable and trust-minimized.

## Key Highlights

🎮 **Real-Time Gaming**
- Live prediction rounds at fixed intervals
- Instant settlement with on-chain verification
- Dual-sided betting (UP/DOWN) on crypto assets

🎰 **Lottery System**
- On-chain ticket purchases
- Instant winner generation
- Transparent, deterministic outcomes

📊 **Player Experience**
- Live leaderboard with player statistics
- AI-powered insights from market data
- Mobile-friendly, PWA-enabled interface
- Wallet-based onboarding with MetaMask integration

⛓️ **Blockchain-First Architecture**
- Modular smart contract design
- Cross-application communication
- High-frequency, low-latency interactions
- Linera-powered application chains

## Project Structure

```
Winza/
├── frontend/                 # React + Vite UI application
│   ├── src/                 # TypeScript/React components
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── styles/              # Global and mobile styles
│   └── package.json         # Frontend dependencies
│
├── smartcontract/            # Linera smart contracts
│   ├── native/              # Fungible token application
│   ├── leaderboard/         # Player statistics tracking
│   ├── rounds/              # Prediction round logic
│   ├── lottery/             # Lottery system (optional)
│   ├── lottery-app/         # Alternative lottery implementation
│   └── deploy.sh            # Automated deployment script
│
├── orchestrator/            # Backend orchestration scripts
│   ├── lottery-orchestrator.js
│   ├── leaderboard-pb-sync.js
│   ├── rounds-init.js
│   └── config.js
│
└── deploy/                  # Deployment configuration
    ├── nginx-site-template.conf
    └── setup_production.sh
```

## Getting Started

### Prerequisites
- Node.js 18+
- Rust toolchain (for smart contracts)
- Linera CLI (for blockchain operations)
- MetaMask or compatible wallet

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start playing.

### Smart Contract Deployment

```bash
cd smartcontract
cargo build --release
./deploy.sh
```

This will automatically deploy all applications in the correct order and output Application IDs.

## How It Works

### Prediction Round Flow

1. **User Places Bet**
   - Connects wallet and selects prediction (UP/DOWN)
   - Transfers tokens to Winzareal contract
   - Bet is recorded on-chain for the current round

2. **Round Closes**
   - Time-boxed round expires
   - No more bets accepted

3. **Round Resolution**
   - System fetches verified price data
   - Determines winning direction
   - Calculates payouts based on pool distribution

4. **Winners Paid**
   - Winning bets receive share of losing-side pool
   - Leaderboard updates automatically
   - Results stored permanently on-chain

### Lottery System

1. **Purchase Ticket** → On-chain transaction records ticket
2. **Instant Draw** → Smart contract generates winner
3. **Verify Result** → All participants can verify outcome
4. **Claim Prize** → Winner claims prize through contract

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context API
- **API**: GraphQL + WebSocket (Linera)
- **Data Caching**: PocketBase
- **PWA**: Service Workers for offline support

### Smart Contracts
- **Platform**: Linera (application chains)
- **Language**: Rust
- **Consensus**: Byzantine Fault Tolerant (BFT)
- **Token Standard**: Native fungible tokens
- **Contract Communication**: Cross-application messaging

### Infrastructure
- **Hosting**: Docker + Nginx
- **Database**: PocketBase (caching), On-chain storage
- **Market Data**: Binance API for price candles
- **Orchestration**: Node.js scripts for data sync

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  User Interface | Predictions | Lottery | Leaderboard       │
└──────────────────────────┬──────────────────────────────────┘
                           │ GraphQL + WebSocket
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐
    │   Native   │  │   Rounds    │  │  Lottery   │
    │   (Token)  │  │  (Betting)  │  │  (Tickets) │
    └────────────┘  └─────┬───────┘  └────────────┘
                          │
                    ┌─────▼─────┐
                    │ Leaderboard│
                    │(Statistics)│
                    └────────────┘
```

## Key Features in Detail

### Real-Time Updates
- WebSocket subscriptions for instant notifications
- Live price feeds from Binance
- Leaderboard updates after each round resolution

### Modular Smart Contracts
- Independent apps for different concerns
- Cross-app communication via Linera messaging
- Easy to audit and upgrade individual components

### Mobile-First Design
- Fully responsive interface
- Touch-optimized controls
- PWA with offline capabilities
- Optimized for low-latency interactions

### Transparent Outcomes
- All transactions recorded on-chain
- Verifiable random winner selection
- Complete audit trail available
- No hidden fees or centralized decision-making

## Security & Trust

- ✅ All bets locked in escrow during rounds
- ✅ Smart contract-enforced payout rules
- ✅ Immutable on-chain outcome records
- ✅ Cryptographically verified winners
- ✅ No single point of failure

## Platform Economics

- **Small Platform Fee**: Modest percentage sustains operations
- **Prize Distribution**: Losing-side bets fund winning-side payouts
- **Leaderboard Rewards**: Active players compete for recognition
- **Transparent Accounting**: All economics verifiable on-chain

## Documentation

- **[Frontend Documentation](frontend/README.md)** - UI, components, and frontend architecture
- **[Smart Contract Documentation](smartcontract/README.md)** - On-chain applications and deployment
- **Individual App Documentation** - See respective directories in `smartcontract/`

## Contributing

This is the Winza core platform. Contributions are welcome for:
- UI/UX improvements
- Smart contract optimizations
- Market data integrations
- Performance enhancements
- Bug fixes

## Future Roadmap

- 🗺️ Additional asset pairs (forex, commodities, indices)
- 🔀 Multi-sided predictions beyond UP/DOWN
- 🌍 Cross-chain prediction markets
- 🏛️ Governance token and DAO participation
- 📈 Dynamic round intervals based on volatility
- 🤖 Advanced AI trading signals

## Support

For issues, questions, or feedback:
1. Check existing documentation
2. Review code examples in components/
3. Check orchestrator scripts for backend logic

## License

See individual component licenses in respective directories.

---

**Winza: Where Markets Move Live, Bets Settle Instantly, and Winners Are Decided Transparently.**
