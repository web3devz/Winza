import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as linera from '@linera/client';
import { Signer as MetamaskSigner } from '@linera/metamask';
import { WebSocketClient } from '../utils/WebSocketClient';
import { parseTimestamp } from '../utils/timeUtils';
import PocketBase from 'pocketbase'

const PB_URL: string = ((import.meta.env as any).VITE_POCKETBASE_URL as string) || 'http://127.0.0.1:8091'
const pb: PocketBase = (() => {
  const g = globalThis as any
  if (g.__pb_client) return g.__pb_client as PocketBase
  const c = new PocketBase(PB_URL)
  try { c.autoCancellation(false) } catch {}
  g.__pb_client = c
  return c
})()

// Types for rounds data
interface Round {
  id: number;
  status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
  resolutionPrice: string | null;
  closingPrice: string | null;
  upBets: number;
  downBets: number;
  result: 'UP' | 'DOWN' | null;
  prizePool: string;
  upBetsPool: string;
  downBetsPool: string;
  // Time fields
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  // Calculated fields
  upPayout?: number;
  downPayout?: number;
}

export type LotteryStatus = "ACTIVE" | "CLOSED" | "DRAWING" | "COMPLETE";

export interface Winner {
  roundId: string;
  ticketId: string;
  owner: string;
  amount: string;
  createdAt: number;
}

export interface LotteryRound {
  id: string;
  status: LotteryStatus;
  prizePool: string;
  ticketPrice: string;
  endTime: number; // timestamp
  winners: Winner[]; // All generated winners
  ticketsSold: number;
}

 

interface LineraContextType {
  client?: linera.Client;
  wallet?: linera.Wallet;
  chainId?: string;
  application?: linera.Application; // Deprecated - use btcApplication or ethApplication
  btcApplication?: linera.Application;
  ethApplication?: linera.Application;
  lotteryApplication?: linera.Application;
  accountOwner?: string;
  balance?: string;
  loading: boolean;
  status: 'Not Connected' | 'Connecting' | 'Loading' | 'Creating Wallet' | 'Creating Client' | 'Creating Chain' | 'Ready';
  error?: Error;
  refreshBalance?: () => Promise<void>;
  subscriptionStatus?: string;
  pendingBundles?: number;
  claimEnabled?: boolean;
  hasClaimed?: boolean;
  // New fields for multi-chain support
  activeTab?: 'btc' | 'eth';
  btcRounds?: Round[];
  ethRounds?: Round[];
  setActiveTab?: (tab: 'btc' | 'eth') => void;
  refreshRounds?: () => Promise<void>;
  // Lottery Data
  lotteryRounds?: LotteryRound[];
  lotteryWinners?: Winner[];
  refreshLottery?: () => Promise<void>;
  // WebSocket statuses
  btcWebSocketStatus?: string;
  ethWebSocketStatus?: string;
  btcNotifications?: string[];
  ethNotifications?: string[];
  connectWallet?: () => Promise<void>;
  purchaseTickets?: (amountTokens: string) => Promise<void>;
  claimChainBalance?: () => Promise<void>;
  markBundlesClaimed?: () => void;
}

const LineraContext = createContext<LineraContextType>({
  loading: false,
  status: 'Not Connected'
});

export const useLinera = () => useContext(LineraContext);

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LineraContextType>({
    loading: false,
    status: 'Not Connected',
    subscriptionStatus: '',
    activeTab: 'btc',
    btcRounds: [],
    ethRounds: [],
    btcWebSocketStatus: '🔴 Disconnected',
    ethWebSocketStatus: '🔴 Disconnected',
    btcNotifications: [],
    ethNotifications: [],
    lotteryRounds: [],
    lotteryWinners: [],
    pendingBundles: 0,
    claimEnabled: false,
    hasClaimed: false
  });

  const subscriptionRef = useRef<any>(null); // Для зберігання subscription
  const btcWebSocketRef = useRef<WebSocketClient | null>(null);
  const ethWebSocketRef = useRef<WebSocketClient | null>(null);
  const webSocketSetupRef = useRef(false); // Для відстеження чи налаштовані WebSocket'и
  const refreshTimerRef = useRef<number | null>(null);
  const lastLotteryFetchRef = useRef<number>(0);
  const lotteryPollTimerRef = useRef<number | null>(null);
 

 

  useEffect(() => {
    try {
      let clicked = localStorage.getItem('claim_has_clicked');
      if (!clicked) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const prefix = `${encodeURIComponent('claim_has_clicked')}=`;
        for (const c of cookies) {
          if (c.startsWith(prefix)) { clicked = decodeURIComponent(c.substring(prefix.length)); break; }
        }
      }
      if (clicked === '1') {
        setState(prev => ({ ...prev, hasClaimed: true }));
      }
    } catch {}
  }, []);

 

 

  const getPendingKey = (cid: string) => `linera_pending_bundles_${cid}`;
  const getClaimedKey = (cid: string) => `linera_claimed_bundles_${cid}`;
  const readHeights = (key: string): Set<number> => {
    try {
      let raw = localStorage.getItem(key);
      if (!raw) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const prefix = `${encodeURIComponent(key)}=`;
        for (const c of cookies) {
          if (c.startsWith(prefix)) { raw = decodeURIComponent(c.substring(prefix.length)); break; }
        }
      }
      if (!raw) return new Set<number>();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set<number>();
      return new Set<number>(arr.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)));
    } catch { return new Set<number>(); }
  };
  const writeHeights = (key: string, s: Set<number>) => {
    const val = JSON.stringify(Array.from(s.values()));
    try { localStorage.setItem(key, val); } catch {}
    try {
      const expires = new Date(Date.now() + 3650*24*60*60*1000).toUTCString();
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(val)}; expires=${expires}; path=/; SameSite=Lax`;
    } catch {}
  };
 
  const refreshClaimUiFromStorage = () => {
    const cid = (state.chainId || '').toLowerCase();
    if (!cid) return;
    const pending = readHeights(getPendingKey(cid));
    const claimed = readHeights(getClaimedKey(cid));
    const filtered = new Set<number>();
    pending.forEach(h => { if (!claimed.has(h)) filtered.add(h); });
    if (filtered.size !== pending.size) writeHeights(getPendingKey(cid), filtered);
    setState(prev => ({
      ...prev,
      pendingBundles: filtered.size,
      claimEnabled: filtered.size > 0
    }));
  };

  const markBundlesClaimed = () => {
    const cid = (state.chainId || '').toLowerCase();
    if (!cid) return;
    const pKey = getPendingKey(cid);
    const cKey = getClaimedKey(cid);
    const pending = readHeights(pKey);
    const claimed = readHeights(cKey);
    const merged = new Set<number>(claimed);
    pending.forEach(h => merged.add(h));
    writeHeights(cKey, merged);
    writeHeights(pKey, new Set<number>());
    setState(prev => ({
      ...prev,
      hasClaimed: true,
      claimEnabled: false,
      pendingBundles: 0
    }));
    try { localStorage.setItem('claim_has_clicked', '1'); } catch {}
  };

  const claimChainBalance = async () => {
    if (!state.application) return;
    try {
      const mutation = `mutation { chainBalance }`;
      await state.application.query(JSON.stringify({ query: mutation }));
      markBundlesClaimed();
    } catch {}
  };
  useEffect(() => {
    refreshClaimUiFromStorage()
  }, [state.chainId]);
 

  const toMs = (v: any): number | null => {
    try { return parseTimestamp(v) } catch { return null }
  };

 

  const scheduleRefreshRounds = () => {
    if (refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshRounds?.();
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }, 1000);
  };

  // Функція для запиту балансу
  const queryBalance = async (application: linera.Application, owner: string): Promise<string> => {
    try {
      const query = `
        query {
          accounts {
            entry(key: "${owner}") {
              value
            }
          }
        }
      `;

      const result = await application.query(JSON.stringify({ query }));
      // console.log('Balance query result:', result);

      // Парсимо результат
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      const balance = parsedResult?.data?.accounts?.entry?.value || "0";
      return balance;
    } catch (error) {
      console.error('Balance query error:', error);
      return "0";
    }
  };

  // Функція для оновлення балансу (винесена з useEffect)
  const refreshBalance = async () => {
    // console.log('refreshBalance called');
    if (state.application && state.accountOwner) {
      // console.log('Querying new balance for:', state.accountOwner);
      const newBalance = await queryBalance(state.application, state.accountOwner);
      // console.log('New balance received:', newBalance);
      // console.log('Current balance:', state.balance);
      setState(prev => {
        // console.log('Updating state with new balance:', newBalance);
        return { ...prev, balance: newBalance };
      });
    } else {
      // console.log('Cannot refresh balance - missing application or accountOwner');
    }
  };

  // Функція для розрахунку payout коефіцієнтів
  const calculatePayouts = (round: Round): { upPayout: number; downPayout: number } => {
    const totalPool = parseFloat(round.prizePool);
    const upPool = parseFloat(round.upBetsPool);
    const downPool = parseFloat(round.downBetsPool);

    if (totalPool === 0) return { upPayout: 1, downPayout: 1 };

    const upPayout = upPool > 0 ? totalPool / upPool : 1;
    const downPayout = downPool > 0 ? totalPool / downPool : 1;

    return { upPayout, downPayout };
  };

  const queryRounds = async (chain: 'btc' | 'eth'): Promise<Round[]> => {
    try {
      const res = await pb.collection('rounds').getList(1, 200, {
        sort: '-round_id',
        filter: `chain ~ \"${chain}\"`,
        requestKey: `rounds-${chain}`
      })
      const list = res?.items || []
      const roundsDesc = list.map((row: any) => ({
        id: Number(row.round_id ?? 0),
        status: (Array.isArray(row.status) ? (row.status[0] ?? 'ACTIVE') : row.status),
        resolutionPrice: row.resolution_price != null ? String(row.resolution_price) : null,
        resolvedAt: row.resolved_at ?? null,
        closedAt: row.closed_at ?? null,
        createdAt: row.created_at ?? new Date().toISOString(),
        closingPrice: row.closing_price != null ? String(row.closing_price) : null,
        upBets: Number(row.up_bets ?? 0),
        downBets: Number(row.down_bets ?? 0),
        result: row.result ? row.result : null,
        prizePool: String(row.prize_pool ?? '0'),
        upBetsPool: String(row.up_bets_pool ?? '0'),
        downBetsPool: String(row.down_bets_pool ?? '0'),
      })) as Round[]
      const rounds = roundsDesc.slice().sort((a, b) => a.id - b.id)
      return rounds.map((round: Round) => {
        const { upPayout, downPayout } = calculatePayouts(round)
        return { ...round, upPayout, downPayout }
      })
    } catch (e) {
      return []
    }
  }

  // Функція для оновлення rounds data
  const refreshRounds = async () => {
    try {
      const btcRounds = await queryRounds('btc')
      const ethRounds = await queryRounds('eth')
      setState(prev => ({
        ...prev,
        btcRounds,
        ethRounds
      }));
    } catch (error) {}
  };

 

 


  // Lottery Fetching Logic
  const refreshLottery = async () => {
    const now = Date.now();
    if (now - lastLotteryFetchRef.current < 500) {
      return; // Throttled: max 1 request per second
    }
    lastLotteryFetchRef.current = now;

    const resRounds = await pb.collection('lottery_rounds').getList(1, 30, { sort: '-round_id', requestKey: 'lottery_rounds' })
    const dbRounds = (resRounds?.items || []) as any[]

    const resWinners = await pb.collection('lottery_winners').getList(1, 50, { sort: '-round_id', requestKey: 'lottery_winners' })
    const latestWinners = (resWinners?.items || []) as any[]

    const winnersByRound = new Map<number, Winner[]>();
    const seenTickets = new Set<string>();

    (latestWinners || []).forEach((w: any) => {
      const roundId = Number(w.round_id);
      const ticketId = String(w.ticket_number);
      const uniqueKey = `${roundId}-${ticketId}`;
      const createdRaw = w.created_at ?? w.created;
      const createdAt = createdRaw ? (toMs(createdRaw) ?? Date.now()) : Date.now();

      if (seenTickets.has(uniqueKey)) return;
      seenTickets.add(uniqueKey);

      const list = winnersByRound.get(roundId) || [];
      list.push({
        roundId: String(roundId),
        ticketId: ticketId,
        owner: String(w.source_chain_id || 'unknown'),
        amount: String(w.prize_amount),
        createdAt: createdAt
      });
      winnersByRound.set(roundId, list);
    });

    const mappedWinners: Winner[] = [];
    const seenGlobalTickets = new Set<string>();

    (latestWinners || []).forEach((w: any) => {
      const ticketId = String(w.ticket_number);
      const roundId = Number(w.round_id);
      const uniqueKey = `${roundId}-${ticketId}`;
      const createdRaw = w.created_at ?? w.created;
      const createdAt = createdRaw ? (toMs(createdRaw) ?? Date.now()) : Date.now();

      if (seenGlobalTickets.has(uniqueKey)) return;
      if (mappedWinners.length >= 50) return;

      seenGlobalTickets.add(uniqueKey);

      const winnerObj = {
        roundId: String(roundId),
        ticketId: ticketId,
        owner: String(w.source_chain_id || 'unknown'),
        amount: String(w.prize_amount),
        createdAt: createdAt
      };

      mappedWinners.push(winnerObj);
    });

    // Sync with GraphQL if available
    let combined = (dbRounds || []).map((r: any) => {
      const createdMs = r.created_at ? (toMs(r.created_at) ?? Date.now()) : Date.now();
      const endMs = createdMs + 5 * 60 * 1000;
      const statusUpper = String(r.status).toUpperCase() as LotteryStatus;
      let winners: Winner[] = winnersByRound.get(Number(r.round_id)) || [];

      // Sort winners deterministically to prevent UI duplication during reveal animation
      winners.sort((a, b) => Number(b.ticketId) - Number(a.ticketId));

      return {
        id: String(r.round_id),
        status: statusUpper,
        prizePool: String(r.prize_pool),
        ticketPrice: String(r.ticket_price),
        endTime: endMs,
        ticketsSold: Number((r as any).total_tickets_sold ?? 0),
        winners,
      } as LotteryRound
    });

    const hasActiveLike = combined.some(r => r.status === 'ACTIVE' || r.status === 'CLOSED' || r.status === 'DRAWING')
    if (state.lotteryApplication && (!dbRounds || dbRounds.length === 0 || !hasActiveLike)) {
      try {
        const q = {
          query: `query { allRounds { id status ticketPrice totalTicketsSold prizePool createdAt closedAt } }`
        };
        const res = await state.lotteryApplication.query(JSON.stringify(q));
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        const list = parsed?.data?.allRounds || [];

        const gqlMapped: LotteryRound[] = list.map((r: any) => {
          const createdMs = r.createdAt ? (toMs(r.createdAt) ?? Date.now()) : Date.now();
          const endMs = createdMs + 5 * 60 * 1000;
          return {
            id: String(r.id),
            status: ((): LotteryStatus => {
              const su = String(r.status).toUpperCase() as LotteryStatus;
              if (su === 'ACTIVE' && endMs <= Date.now()) return 'CLOSED';
              return su;
            })(),
            prizePool: String(r.prizePool),
            ticketPrice: String(r.ticketPrice),
            endTime: endMs,
            ticketsSold: Number(r.totalTicketsSold ?? 0),
            winners: [],
          };
        });

        // Find active candidate from GraphQL
        const activeCandidate = gqlMapped
          .filter(r => r.status === 'ACTIVE' || r.status === 'CLOSED' || r.status === 'DRAWING')
          .sort((a, b) => Number(b.id) - Number(a.id))[0];

        if (activeCandidate) {
          const idx = combined.findIndex(rr => rr.id === activeCandidate.id);
          if (idx >= 0) {
            combined[idx] = {
              ...combined[idx],
              ...activeCandidate,
              winners: combined[idx].winners.length > 0 ? combined[idx].winners : activeCandidate.winners
            };
          } else {
            combined.unshift(activeCandidate);
          }
        }
      } catch (e) {
      }
    }

    combined.sort((a, b) => Number(b.id) - Number(a.id));

  setState(prev => ({
      ...prev,
      lotteryRounds: combined,
      lotteryWinners: mappedWinners
    }));

 
  };



  // Функція для зміни активної вкладки
  const setActiveTab = (tab: 'btc' | 'eth') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const connectWallet = async () => {
    try {
      setState(prev => ({ ...prev, status: 'Connecting', loading: true }));
      try {
        await linera.initialize();
      } catch (wasmError) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await linera.initialize();
      }
      const faucetUrl = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
      const nativeApplicationId = import.meta.env.VITE_NATIVE_APPLICATION_ID || '';
      const WinzaApplicationId = import.meta.env.VITE_Winza_APPLICATION_ID || '';
      const lotteryApplicationId = import.meta.env.VITE_LOTTERY_APPLICATION_ID || '';
      let signer: any = new MetamaskSigner();
      const faucet = new linera.Faucet(faucetUrl);
      const owner = await Promise.resolve(signer.address());
      setState(prev => ({ ...prev, status: 'Creating Wallet' }));
      const wallet = await faucet.createWallet();
      const chainId = await faucet.claimChain(wallet, owner);
      setState(prev => ({ ...prev, status: 'Creating Client' }));
      const clientInstance = await new linera.Client(wallet, signer, true);
      const nativeApp = await clientInstance.application(nativeApplicationId);
      const btcApplication = await clientInstance.application(WinzaApplicationId);
      const ethApplication = await clientInstance.application(WinzaApplicationId);
      const lotteryApplication = lotteryApplicationId ? await clientInstance.application(lotteryApplicationId) : undefined;
      const initialBalance = await queryBalance(nativeApp, owner);
      if (parseFloat(initialBalance) === 0) {
        try {
          const mutation = `
            mutation {
              mint(
                owner: "${owner}",
                amount: "5"
              )
            }
          `;
          await nativeApp.query(JSON.stringify({ query: mutation }));
          markBundlesClaimed();
          const balanceAfterMint = await queryBalance(nativeApp, owner);
          setState(prev => ({
            ...prev,
            client: clientInstance,
            wallet,
            chainId,
            application: nativeApp,
            btcApplication,
            ethApplication,
            lotteryApplication,
            accountOwner: owner,
            balance: balanceAfterMint,
            loading: false,
            status: 'Ready',
          }));
        } catch {
          setState(prev => ({
            ...prev,
            client: clientInstance,
            wallet,
            chainId,
            application: nativeApp,
            btcApplication,
            ethApplication,
            lotteryApplication,
            accountOwner: owner,
            balance: initialBalance,
            loading: false,
            status: 'Ready',
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          client: clientInstance,
          wallet,
          chainId,
          application: nativeApp,
          btcApplication,
          ethApplication,
          lotteryApplication,
          accountOwner: owner,
          balance: initialBalance,
          loading: false,
          status: 'Ready',
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        status: 'Not Connected',
        error: err as Error,
      }));
    }
  };

  const purchaseTickets = async (amountTokens: string) => {
    if (!state.lotteryApplication || !state.accountOwner) return;
    const chainId = import.meta.env.VITE_LOTTERY_CHAIN_ID || '';
    const targetOwner = import.meta.env.VITE_LOTTERY_TARGET_OWNER || '';
    const mutation = `mutation { transfer(owner: "${state.accountOwner}", amount: "${amountTokens}", targetAccount: { chainId: "${chainId}", owner: "${targetOwner}" }, purchaseTickets: true) }`;
    await state.lotteryApplication.query(JSON.stringify({ query: mutation }));
    markBundlesClaimed();
  };

  // Окремий useEffect для налаштування subscription
  useEffect(() => {
    if (!state.application || !state.accountOwner || state.loading) {
      return; // Чекаємо поки application буде готовий
    }

    // Функція для налаштування subscription
    const setupSubscription = async () => {
      try {
        setState(prev => ({
          ...prev,
          subscriptionStatus: '🔄 Setting up subscription...'
        }));

        // console.log('Setting up subscription...');
        // console.log('Client object:', state.client);
        // console.log('Client methods:', state.client ? Object.getOwnPropertyNames(Object.getPrototypeOf(state.client)) : 'No client');

        // ✅ CORRECT: Use client.onNotification() for reactivity
        if (state.client && state.accountOwner) {
          // console.log('Setting up notification callback through client...');

          // Set up notification callback using client.onNotification()
          const unsubscribe = state.client.onNotification((notification: any) => {
            // console.log('Received notification:', notification);

            // Check if this is a new block notification (indicates state change)
            if (notification.reason?.NewBlock) {
              const newBlockHeight = Number(notification.reason.NewBlock.height);
              const storageKey = `linera_last_block_${state.chainId}`;
              const lastHeight = Number(localStorage.getItem(storageKey) || '0');

              if (newBlockHeight < lastHeight) {
                // console.log(`Ignoring old block notification: ${newBlockHeight} < ${lastHeight}`);
                return;
              }

              // Update stored height
              localStorage.setItem(storageKey, String(newBlockHeight));
              // console.log(`Processing new block: ${newBlockHeight}, refreshing balance...`);

              // Refresh balance when new block is detected
              if (state.application && state.accountOwner) {
                queryBalance(state.application, state.accountOwner).then(newBalance => {
                  // console.log('Balance updated after new block:', newBalance);

                  // ✅ ВАЖЛИВО: Оновлюємо стан з новим балансом
                  setState(prev => ({
                    ...prev,
                    balance: newBalance
                  }));
                });
              }
            }

            if (notification.reason?.NewIncomingBundle) {
              try {
                const cid = (state.chainId || '').toLowerCase();
                const h = Number(notification.reason.NewIncomingBundle.height);
                if (cid && Number.isFinite(h)) {
                  const pKey = getPendingKey(cid);
                  const cKey = getClaimedKey(cid);
                  const pending = readHeights(pKey);
                  const claimed = readHeights(cKey);
                  if (!claimed.has(h) && !pending.has(h)) {
                    pending.add(h);
                    writeHeights(pKey, pending);
                  }
                  setState(prev => ({
                    ...prev,
                    pendingBundles: pending.size,
                    claimEnabled: pending.size > 0
                  }));
                }
              } catch {}
            }
          });

          // Store the unsubscribe function
          subscriptionRef.current = { unsubscribe };

          setState(prev => ({
            ...prev,
            subscriptionStatus: '✅ Notification callback active'
          }));

          // console.log('Notification callback set up successfully');

          // Initial load of rounds data
          refreshRounds();
        } else {
          // console.log('Client or accountOwner not available for notifications');
          setState(prev => ({
            ...prev,
            subscriptionStatus: '⚠️ Notifications not available - missing client or accountOwner'
          }));
        }

      } catch (err) {
        setState(prev => ({
          ...prev,
          subscriptionStatus: `❌ Notification setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        }));
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (subscriptionRef.current?.unsubscribe) {
        try {
          subscriptionRef.current.unsubscribe();
          setState(prev => ({
            ...prev,
            subscriptionStatus: '🔴 Notifications disabled'
          }));
          // console.log('Main notification callback removed');
        } catch (err) {
        }
      }
    };
  }, [state.client, state.accountOwner, state.loading]); // Dependencies: client, accountOwner and loading

  // Separate effect for Rounds Subscription (independent of wallet status)
  useEffect(() => {
    let isUnmounted = false
    let subscribed = false

    const setupSubscription = async () => {
      if (isUnmounted) return
      try {
        await pb.collection('rounds').subscribe('*', () => { scheduleRefreshRounds() })
        subscribed = true
      } catch {}
    }

    setupSubscription()
    
    return () => {
      isUnmounted = true
      try { if (subscribed) pb.collection('rounds').unsubscribe('*') } catch {}
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, []); // Run once on mount, independent of wallet status

  useEffect(() => {
    if (state.loading || state.status !== 'Ready') {
      return;
    }
    // Only keeping wallet-specific logic here if any (currently none related to rounds)
  }, [state.status, state.loading])

  // Lottery Subscriptions
  useEffect(() => {
    refreshLottery();
    const setup = async () => {
      try { await pb.collection('lottery_rounds').subscribe('*', () => { refreshLottery() }) } catch {}
      try { await pb.collection('lottery_winners').subscribe('*', () => { refreshLottery() }) } catch {}
    }
    setup()

    if (lotteryPollTimerRef.current === null) {
      lotteryPollTimerRef.current = window.setInterval(() => { try { refreshLottery() } catch {} }, 5000)
    }

    return () => {
      try { pb.collection('lottery_rounds').unsubscribe('*') } catch {}
      try { pb.collection('lottery_winners').unsubscribe('*') } catch {}
      if (lotteryPollTimerRef.current !== null) { clearInterval(lotteryPollTimerRef.current); lotteryPollTimerRef.current = null }
    };
  }, []);

  // Окремий useEffect для cleanup при unmount компонента
  useEffect(() => {
    return () => {
      webSocketSetupRef.current = false;

      if (btcWebSocketRef.current) {
        btcWebSocketRef.current.disconnect();
        btcWebSocketRef.current = null;
      }

      if (ethWebSocketRef.current) {
        ethWebSocketRef.current.disconnect();
        ethWebSocketRef.current = null;
      }
    };
  }, []); // Порожній масив залежностей - запускається тільки при unmount

  useEffect(() => {
    refreshRounds();
  }, [])

  return <LineraContext.Provider value={{
    ...state,
    refreshBalance,
    refreshRounds,
    refreshLottery,
    setActiveTab,
    connectWallet,
    purchaseTickets,
    claimChainBalance,
    markBundlesClaimed
  }}>{children}</LineraContext.Provider>;
};
