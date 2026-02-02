import { LightningAnimation } from "./LightningAnimation";
import { useState, useCallback } from "react";
import { formatLocalTime } from "../utils/timeUtils";
import { useLinera } from "./LineraProvider";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";

type GameStatus = "LIVE" | "Next" | "Later" | "EXPIRED";

interface Game {
  status: GameStatus;
  id: string;
  payout?: string;
  lastPrice?: string;
  lockedPrice?: string;
  prizePool?: string;
  entryPrice?: string | null;
  payoutMultiplier?: string;
  entryStarts?: string | null;
  result?: 'UP' | 'DOWN' | null;
  // Часові поля
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
}

interface GameCardProps {
  game: Game;
  currentPrice?: string;
  gameType: 'BTC' | 'ETH';
}

export function GameCard({ game, currentPrice, gameType }: GameCardProps) {
  const { btcApplication, ethApplication, accountOwner, refreshBalance, markBundlesClaimed } = useLinera();
  const [lightningActive, setLightningActive] = useState(false);

  // Flip state
  const [isFlipped, setIsFlipped] = useState(false);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN'>('UP');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Функція для форматування часу з урахуванням локального часового поясу
  const formatTime = (dateString: string | null | undefined) => {
    return formatLocalTime(dateString);
  };

  

  const handleButtonClick = (direction: 'up' | 'down') => {
    // console.log(`Button clicked: ${direction}, lightning active: ${lightningActive}`);
    setLightningActive(true);

    // Set prediction and flip card
    setPrediction(direction.toUpperCase() as 'UP' | 'DOWN');
    setIsFlipped(true);

    // Reset form state
    setAmount('');
    setStatus(null);

    // console.log(`Clicked ${direction} for game ${game.id}`);
  };

  const handleBackClick = () => {
    setIsFlipped(false);
    // Reset status after a delay to keep it clean
    setTimeout(() => setStatus(null), 300);
  };

  const handleLightningComplete = useCallback(() => {
    // console.log('Lightning animation completed, setting active to false');
    setLightningActive(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    

    const application = gameType === 'BTC' ? btcApplication : ethApplication;

    if (!application || !accountOwner || !amount) {
      setStatus({ type: 'error', message: 'Missing required data' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'info', message: 'Submitting...' });

    try {
      const chainId = gameType === 'BTC'
        ? import.meta.env.VITE_BTC_CHAIN_ID
        : import.meta.env.VITE_ETH_CHAIN_ID;

      const targetOwner = gameType === 'BTC'
        ? import.meta.env.VITE_BTC_TARGET_OWNER
        : import.meta.env.VITE_ETH_TARGET_OWNER;

      const mutation = `
        mutation {
          transferWithPrediction(
            owner: "${accountOwner}",
            amount: "${amount}",
            targetAccount: {
              chainId: "${chainId}",
              owner: "${targetOwner}"
            },
            prediction: "${prediction}"
          )
        }
      `;

      const result = await application.query(JSON.stringify({ query: mutation }));
      
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      
      if (parsedResult.errors) {
        throw new Error(parsedResult.errors[0].message);
      }

      setStatus({ type: 'success', message: 'Success!' });
      

      if (refreshBalance) {
        await refreshBalance();
      }

      if (markBundlesClaimed) {
        markBundlesClaimed();
      }

      // Flip back after success
      setTimeout(() => {
        setIsFlipped(false);
        setAmount('');
        setStatus(null);
      }, 1500);

    } catch (error: any) {
      console.error('Mutation error:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLive = game.status === "LIVE";
  const isNext = game.status === "Next";
  const isLater = game.status === "Later";
  const isExpired = game.status === "EXPIRED";

  return (
    <div className="group perspective-1000 h-full w-full">
      <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

        {/* FRONT FACE */}
        <div className="relative w-full h-full backface-hidden bg-white dark:bg-zinc-950 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-zinc-800 hover:shadow-xl transition-all duration-300 card-mobile">
          <LightningAnimation
            isActive={lightningActive}
            onComplete={handleLightningComplete}
          />
          {/* Header */}
          <div className={`px-3 sm:px-4 py-2 sm:py-3 ${isLive ? "bg-red-600" :
            isNext ? "bg-red-500" :
              isExpired ? "bg-gray-500 dark:bg-zinc-700" :
                "bg-gray-100 dark:bg-zinc-800"
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLive && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
                <span className={`font-medium ${isLater ? "text-gray-600 dark:text-gray-300 text-sm" : "text-white text-sm"}`}>
                  {game.status}
                </span>
              </div>
              <span className={`text-xs font-mono ${isLater ? "text-gray-500 dark:text-gray-400" : "text-white opacity-90"}`}>
                {game.id}
              </span>
            </div>

            {/* Відображення часу для всіх статусів крім Later - скорочено для мобільних */}
            {!isLater && (
              <div className="flex items-center justify-center mt-1">
                <span className="text-white text-xs opacity-75 text-center">
                  {isExpired && game.resolvedAt ? `Resolved: ${formatTime(game.resolvedAt)}` :
                    isLive && game.closedAt ? `Closed: ${formatTime(game.closedAt)}` :
                      isNext && game.createdAt ? `Created: ${formatTime(game.createdAt)}` :
                        game.createdAt ? `Created: ${formatTime(game.createdAt)}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isLater ? (
              // Later card - simplified
              <div className="text-center py-4 sm:py-6">
                <div className="text-gray-400 dark:text-gray-500 text-base font-medium mb-3">UP</div>
                <div className="mb-3">
                  <div className="text-gray-500 dark:text-gray-400 text-xs">Entry starts</div>
                  <div className="text-gray-900 dark:text-white text-sm font-medium">{game.entryStarts || 'TBD'}</div>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-base font-medium">DOWN</div>
              </div>
            ) : (
              <>
                {/* UP Section */}
                <div className="text-center mb-3">
                  <div className={`text-lg font-bold mb-1 ${isExpired ?
                    (game.result === 'UP' ? "text-green-500" : "text-gray-400 dark:text-gray-600") :
                    "text-green-500"
                    }`}>UP</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">1.00x Payout</div>
                </div>

                {/* Action Buttons or Price Info */}
                {isNext ? (
                  <div className="space-y-3 mb-3">
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Prize Pool:</span>
                        <span className="text-gray-900 dark:text-white font-bold text-sm">{game.prizePool}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleButtonClick('up')}
                        className="flex-1 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-bold py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25 text-sm touch-target active:scale-95"
                      >
                        Enter UP
                      </button>
                      <button
                        onClick={() => handleButtonClick('down')}
                        className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 text-sm touch-target active:scale-95"
                      >
                        Enter DOWN
                      </button>
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="space-y-2 mb-3">
                    {game.lastPrice && (
                      <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg px-2 sm:px-3 py-2 border border-gray-200 dark:border-zinc-800">
                        <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">RESOLVED PRICE</div>
                        <div className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{game.lastPrice}</div>
                      </div>
                    )}

                    {game.lockedPrice && (
                      <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Locked Price:</span>
                        <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{game.lockedPrice}</span>
                      </div>
                    )}

                    {game.prizePool && (
                      <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Prize Pool:</span>
                        <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{game.prizePool}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mb-3">
                    {(game.lastPrice || currentPrice) && (
                      <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg px-2 sm:px-3 py-2 border border-gray-200 dark:border-zinc-800">
                        <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">LIVE LAST PRICE</div>
                        <div className="text-red-600 dark:text-red-500 text-xs sm:text-sm">{currentPrice || game.lastPrice}</div>
                      </div>
                    )}

                    {game.lockedPrice && (
                      <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Locked Price:</span>
                        <span className="text-gray-900 dark:text-white text-xs sm:text-sm">{game.lockedPrice}</span>
                      </div>
                    )}

                    {game.prizePool && (
                      <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Prize Pool:</span>
                        <span className="text-gray-900 dark:text-white text-xs sm:text-sm">{game.prizePool}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* DOWN Section */}
                <div className="text-center mt-3">
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">1.00x Payout</div>
                  <div className={`text-lg font-bold ${isExpired ?
                    (game.result === 'DOWN' ? "text-red-500" : "text-gray-400 dark:text-gray-600") :
                    "text-red-500"
                    }`}>DOWN</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* BACK FACE (Input Form) */}
        <div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-zinc-950 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col">
          {/* Header */}
          <div className={`px-3 sm:px-4 py-3 flex items-center justify-between ${prediction === 'UP' ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30'
            }`}>
            <button
              onClick={handleBackClick}
              className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
            >
              <ArrowLeft className={`w-5 h-5 ${prediction === 'UP' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} />
            </button>
            <button
              onClick={() => setPrediction(prediction === 'UP' ? 'DOWN' : 'UP')}
              className={`font-bold transition-all hover:scale-105 active:scale-95 ${prediction === 'UP' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
            >
              {prediction === 'UP' ? 'Enter UP' : 'Enter DOWN'}
            </button>
            <div className="w-7" /> {/* Spacer for centering */}
          </div>

          {/* Form Content */}
          <div className="p-4 flex-1 flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (LNRA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium">
                    LNRA
                  </div>
                </div>
              </div>

              {status && (
                <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                  status.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  }`}>
                  {status.type === 'success' ? <Check className="w-4 h-4 mt-0.5" /> :
                    status.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5" /> :
                      <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                  <span>{status.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !amount}
                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${prediction === 'UP'
                  ? 'bg-green-500 hover:bg-green-600 shadow-green-500/25'
                  : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                  }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Bet'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
