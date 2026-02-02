import { Header } from "./components/Header";
import { GameCard } from "./components/GameCard";
import { ChartTabs } from "./components/ChartTabs";
import { LineraProvider, useLinera } from "./components/LineraProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { LotterySection } from "./components/LotterySection";
import { Leaderboard } from "./components/Leaderboard";
import { MobileInstallPrompt } from "./components/MobileInstallPrompt";
import { MobileOrientationHandler } from "./components/MobileOrientationHandler";
import { MobileSplashScreen } from "./components/MobileSplashScreen";
import { useMobile } from "./utils/useMobile";
import { useEffect, useState } from "react";
import { TrendingUp, Clock } from "lucide-react";
import axios from 'axios';
import { parseTimestamp, formatLocalTime } from "./utils/timeUtils";
import { registerServiceWorker, showInstallPrompt, handleAppInstalled } from "./utils/pwaUtils";

// Функція для маппінгу статусів
const mapStatus = (status: 'ACTIVE' | 'CLOSED' | 'RESOLVED'): 'Next' | 'LIVE' | 'EXPIRED' => {
  switch (status) {
    case 'ACTIVE': return 'Next';
    case 'CLOSED': return 'LIVE';
    case 'RESOLVED': return 'EXPIRED';
    default: return 'Next';
  }
};

function AppContent() {
  const { activeTab, setActiveTab, btcRounds, ethRounds } = useLinera();
  const mobile = useMobile();
  const [tokenPrices, setTokenPrices] = useState({
    BTC: "67,234.56",
    ETH: "3,456.78",
    LNRA: "0.0234"
  });
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [showSplash, setShowSplash] = useState(mobile.isMobile);
  const [appReady, setAppReady] = useState(false);
  const [gameMode, setGameMode] = useState<'prediction' | 'lottery' | 'leaderboard'>('prediction');

  // Отримуємо активні rounds в залежності від вибраної вкладки
  const activeRounds = activeTab === 'btc' ? btcRounds : ethRounds;

  // Функція для розрахунку зворотного відліку для активного раунду
  const calculateTimeLeft = () => {
    const nextRound = activeRounds?.find(round => round.status === 'ACTIVE');
    if (!nextRound || !nextRound.createdAt) return '00:00';

    // Використовуємо утилітну функцію для парсингу часу
    const createdTime = parseTimestamp(nextRound.createdAt);

    // Додаємо 5 хвилин до часу створення
    const endTime = createdTime + (5 * 60 * 1000);
    const now = Date.now();
    const difference = endTime - now;

    // Якщо час вийшов, повертаємо 00:00
    if (difference <= 0) return '00:00';

    // Рахуємо хвилини та секунди що залишилися
    const minutes = Math.floor(difference / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Оновлення таймера кожну секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Початкове встановлення
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [activeRounds]);

  const selectedToken = activeTab === 'btc' ? 'BTC' : 'ETH';

  // Функція для отримання реальних цін з Binance
  const fetchTokenPrices = async () => {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT'];
      const promises = symbols.map(symbol =>
        axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
      );

      const responses = await Promise.all(promises);
      const btcPrice = parseFloat(responses[0].data.price);
      const ethPrice = parseFloat(responses[1].data.price);

      setTokenPrices({
        BTC: btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ETH: ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        LNRA: "0.0234" // Залишаємо статичну ціну для LNRA без знака долара
      });
    } catch (error) {
      console.error('Помилка при отриманні цін:', error);
    }
  };

  // Оновлюємо ціни при завантаженні та кожну секунду
  useEffect(() => {
    fetchTokenPrices();
    const interval = setInterval(fetchTokenPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  // Ініціалізуємо PWA функціональність та керуємо splash screen
  useEffect(() => {
    if (mobile.isMobile) {
      registerServiceWorker();
      showInstallPrompt();
      handleAppInstalled();
    }

    // Симулюємо завантаження додатку
    const initTimer = setTimeout(() => {
      setAppReady(true);
    }, 2000);

    return () => clearTimeout(initTimer);
  }, [mobile.isMobile]);

  // Обробник завершення splash screen
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Конвертуємо rounds data в формат для відображення
  const convertRoundToGame = (round: any) => {
    const status = mapStatus(round.status);
    const upPayout = round.upPayout ? `${round.upPayout.toFixed(2)}x` : '1.00x';
    const downPayout = round.downPayout ? `${round.downPayout.toFixed(2)}x` : '1.00x';

    return {
      status,
      id: `#${round.id}`,
      payout: status === 'EXPIRED' ?
        (round.result === 'UP' ? `${upPayout} UP Payout` : `${downPayout} DOWN Payout`) :
        `UP: ${upPayout} | DOWN: ${downPayout}`,
      lastPrice: round.resolutionPrice ? `${parseFloat(round.resolutionPrice).toFixed(4)}` : 'TBD',
      lockedPrice: round.closingPrice ? `${parseFloat(round.closingPrice).toFixed(4)}` : 'TBD',
      prizePool: `${parseFloat(round.prizePool).toFixed(0)} LNRA`,
      entryPrice: round.closingPrice && round.resolutionPrice ?
        `${(parseFloat(round.resolutionPrice) - parseFloat(round.closingPrice)).toFixed(4)}` : 'TBD',
      payoutMultiplier: round.result === 'UP' ? upPayout : downPayout,
      result: round.result, // Додаємо result для підсвічування
      // Часові поля
      resolvedAt: round.resolvedAt,
      closedAt: round.closedAt,
      createdAt: round.createdAt,
      entryStarts: status === 'Next' ?
        formatLocalTime(Date.now() + 5 * 60 * 1000) : null
    };
  };

  const previousGames = activeRounds?.filter(round => round.status === 'RESOLVED')
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 3) // Беремо максимум 3 останні expired блоки
    .reverse()
    .map(convertRoundToGame) || [];
  const liveGames = activeRounds?.filter(round => round.status === 'CLOSED').map(convertRoundToGame) || [];
  const nextGames = activeRounds?.filter(round => round.status === 'ACTIVE').map(convertRoundToGame) || [];

  const liveGame = liveGames[0] || null;
  const nextGame = nextGames[0] || null;

  // Створюємо дві додаткові карточки "Later"
  const laterGame1 = {
    status: 'Later' as const,
    id: '#Later-1',
    payout: 'UP: 1.00x | DOWN: 1.00x',
    lastPrice: 'TBD',
    lockedPrice: 'TBD',
    prizePool: '0 LNRA',
    entryPrice: 'TBD',
    payoutMultiplier: '1.00x',
    result: null, // Додаємо result поле
    // Часові поля
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date().toISOString(),
    entryStarts: null
  };

  const laterGame2 = {
    status: 'Later' as const,
    id: '#Later-2',
    payout: 'UP: 1.00x | DOWN: 1.00x',
    lastPrice: 'TBD',
    lockedPrice: 'TBD',
    prizePool: '0 LNRA',
    entryPrice: 'TBD',
    payoutMultiplier: '1.00x',
    result: null, // Додаємо result поле
    // Часові поля
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date().toISOString(),
    entryStarts: null
  };

  // Об'єднуємо всі ігри в один масив: Previous -> Live -> Next -> Later1 -> Later2
  const allGames = [
    ...previousGames,
    ...(liveGame ? [liveGame] : []),
    ...(nextGame ? [nextGame] : []),
    laterGame1,
    laterGame2
  ];

  useEffect(() => {
    let cardsContainer: HTMLElement | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (cardsContainer && cardsContainer.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        const scrollAmount = e.deltaY > 0 ? 300 : -300;
        cardsContainer.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    const setupContainer = () => {
      cardsContainer = document.getElementById('cards-container');
      if (cardsContainer) {
        document.addEventListener('wheel', handleWheel, { passive: false });
      }
    };

    // Встановлюємо обробник після рендеру
    setTimeout(setupContainer, 100);

    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, [gameMode]);

  return (
    <>
      {/* Mobile Splash Screen */}
      <MobileSplashScreen
        isVisible={showSplash && !appReady}
        onComplete={handleSplashComplete}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-black transition-colors duration-300">
        <Header gameMode={gameMode} setGameMode={setGameMode} />

        {gameMode === 'prediction' ? (
          <>
            {/* Token Selection Buttons */}
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Token buttons and timer in mobile layout */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                  <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1">
                    <button
                      onClick={() => setActiveTab?.('btc')}
                      className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3 rounded-xl border-2 transition-all duration-200 flex-shrink-0 touch-target ${activeTab === 'btc'
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 shadow-lg shadow-red-500/20"
                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      <div className="text-left">
                        <div className="font-semibold text-sm sm:text-base">${tokenPrices.BTC}</div>
                        <div className="text-xs sm:text-sm opacity-75">BTC/USD</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab?.('eth')}
                      className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3 rounded-xl border-2 transition-all duration-200 flex-shrink-0 touch-target ${activeTab === 'eth'
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 shadow-lg shadow-red-500/20"
                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      <div className="text-left">
                        <div className="font-semibold text-sm sm:text-base">${tokenPrices.ETH}</div>
                        <div className="text-xs sm:text-sm opacity-75">ETH/USD</div>
                      </div>
                    </button>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 bg-white dark:bg-zinc-900 rounded-full border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-800 dark:text-white text-base sm:text-base font-medium">{timeLeft}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">5m</span>
                  </div>
                </div>
              </div>
            </div>

            <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 main-content">
              {/* Game Cards Horizontal Scroll */}
              <div className="mb-6 sm:mb-8">
                <div
                  id="cards-container"
                  className="flex gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-gray-100 dark:scrollbar-track-zinc-900 snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 cards-container"
                  style={{
                    scrollBehavior: 'smooth',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none'
                  } as React.CSSProperties}
                >
                  {allGames.map((game, index) => (
                    <div key={index} className="flex-shrink-0 w-64 sm:w-72 lg:w-80 snap-center">
                      <GameCard
                        game={game}
                        currentPrice={tokenPrices[selectedToken] || undefined}
                        gameType={selectedToken as 'BTC' | 'ETH'}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <ChartTabs selectedToken={selectedToken} />
            </main>
          </>
        ) : gameMode === 'lottery' ? (
          <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 main-content">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 px-1">Lottery Rounds</h2>
              <LotterySection />
            </div>
          </main>
        ) : (
          <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 main-content">
            <Leaderboard />
          </main>
        )}

        {/* Mobile Install Prompt */}
        <MobileInstallPrompt />

        {/* Mobile Orientation Handler */}
        <MobileOrientationHandler />
      </div>
    </>
  );
}

export default function App() {
  return (
    <LineraProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AppContent />
      </ThemeProvider>
    </LineraProvider>
  );
}
