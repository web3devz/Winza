import { useState, useEffect } from "react";
import { Ticket, Clock, Sparkles, Check, AlertCircle } from "lucide-react";
import { LotteryRound, Winner } from "./LineraProvider";
import { LightningAnimation } from "./LightningAnimation";
import { useWinnerReveal } from "../hooks/useWinnerReveal";
import { LotteryWinnerCard } from "./LotteryWinnerCard";

interface LotteryHeroProps {
    round?: LotteryRound;
    allWinners: Winner[]; // Use global winners list for better sync
    onBuyTicket: (amount: string) => void;
}

export function LotteryHero({ round, allWinners, onBuyTicket }: LotteryHeroProps) {
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [amount, setAmount] = useState('10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [lightningActive, setLightningActive] = useState(false);

    // Filter winners for this specific round from the global list
    // This ensures we are using the exact same data source as the history component
    const roundWinners = round ? allWinners.filter(w => w.roundId === round.id) : [];

    // Use the new hook to manage winner display
    const currentWinner = useWinnerReveal(roundWinners, round?.id || '');

    // Timer logic
    useEffect(() => {
        if (!round) return;
        const updateTimer = () => {
            const now = Date.now();
            const diff = round.endTime - now;

            if (diff <= 0) {
                setTimeLeft('00:00');
                return;
            }

            const minutes = Math.floor(diff / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [round?.endTime, round?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'info', message: 'Purchasing ticket...' });
        setLightningActive(true);

        // Simulate network delay
        setTimeout(() => {
            onBuyTicket(amount);
            setStatus({ type: 'success', message: 'Tickets Purchased Successfully!' });
            setIsSubmitting(false);
            setLightningActive(false);

            setTimeout(() => {
                setAmount('1');
                setStatus(null);
            }, 3000);
        }, 1500);
    };

    // Trust the backend status. If it says ACTIVE, it is active, even if our local timer thinks it's over.
    const isActive = round?.status === "ACTIVE";
    const isDrawing = round?.status === "DRAWING" || round?.status === "CLOSED";
    const isComplete = round?.status === "COMPLETE";

    if (!round) {
        return (
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-xl animate-pulse">
                <div className="relative p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                        <div className="flex-1 space-y-6 w-full">
                            <div className="h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                            <div className="h-16 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded-xl"></div>
                            <div className="h-6 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="flex gap-4">
                                <div className="h-16 w-32 bg-gray-200 dark:bg-zinc-800 rounded-xl"></div>
                                <div className="h-16 w-32 bg-gray-200 dark:bg-zinc-800 rounded-xl"></div>
                            </div>
                        </div>
                        <div className="w-full md:w-96 h-[300px] bg-gray-100 dark:bg-zinc-900 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-xl transition-colors duration-300">
            <LightningAnimation
                isActive={lightningActive}
                onComplete={() => setLightningActive(false)}
            />

            {/* Background Elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="relative p-6 sm:p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">

                    {/* Left Side: Info & Timer */}
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold uppercase tracking-wide">
                                {isActive ? (
                                    <>
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        Live Round #{round.id}
                                    </>
                                ) : isDrawing ? (
                                    <>
                                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                                        Live Draw in Progress
                                    </>
                                ) : isComplete ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Round Complete
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        Round Closed
                                    </>
                                )}
                            </div>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight">
                                Win <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500">{round.prizePool} LNRA</span>
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                {isActive ? (
                                    <>Next draw in: <span className="font-mono font-bold text-gray-900 dark:text-white">{timeLeft}</span></>
                                ) : isDrawing ? (
                                    <span className="text-red-600 dark:text-red-500 font-bold animate-pulse">Revealing Winners...</span>
                                ) : isComplete ? (
                                    "All prizes distributed"
                                ) : (
                                    "Preparing Draw..."
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-gray-50 dark:bg-zinc-900 px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Ticket Price</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{round.ticketPrice} LNRA</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-zinc-900 px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Tickets Sold</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{round.ticketsSold ?? 0}</div>
                            </div>
                        </div>

                        {/* How it works - Block Design */}
                        <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                How to Play & Win
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Step 1 */}
                                <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 border border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white mb-3 border border-gray-100 dark:border-zinc-700">1</div>
                                    <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Buy Tickets</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Purchase tickets before the timer ends.
                                    </p>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/20 hover:border-red-200 dark:hover:border-red-900/30 transition-colors relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 mb-3 border border-red-100 dark:border-red-900/30 relative z-10">2</div>
                                    <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1 relative z-10">Watch Live</h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed relative z-10">
                                        Don't leave! Winners are picked <strong>live</strong> on-screen.
                                    </p>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/20 hover:border-green-200 dark:hover:border-green-900/30 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400 mb-3 border border-green-100 dark:border-green-900/20">3</div>
                                    <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Instant Win</h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                        Prizes are sent to your wallet immediately.
                                    </p>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Right Side: Action Card or Live Draw */}
                    <div className="w-full md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 p-6 relative z-10 min-h-[300px] flex flex-col justify-center">
                        {isActive ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Purchase</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter token amount to spend</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (LNRA)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="1"
                                            step="1"
                                            className="flex-1 text-center py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg font-bold text-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Total Tokens:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{amount} LNRA</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Ticket className="w-5 h-5" />
                                            Buy Tickets
                                        </>
                                    )}
                                </button>

                                {status && (
                                    <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                        status.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                                            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                        }`}>
                                        {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {status.message}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {isDrawing ? "Drawing Winners!" : isComplete ? "Round Complete" : "Round Closed"}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {isDrawing ? "Watch the winners appear live below" : isComplete ? "All winners have been paid" : "Check the results below"}
                                    </p>
                                </div>

                                {/* Live Winner Feed - Single Item Display */}
                                <LotteryWinnerCard winner={currentWinner} />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
