import { useState, useEffect } from "react";
import { ArrowLeft, Check, AlertCircle, Ticket, Trophy, Clock } from "lucide-react";
import { LightningAnimation } from "./LightningAnimation";

export type LotteryStatus = "ACTIVE" | "CLOSED" | "COMPLETE";

export interface LotteryRound {
    id: string;
    status: LotteryStatus;
    prizePool: string;
    ticketPrice: string;
    endTime: number; // timestamp
    winner?: {
        ticketId: string;
        owner: string;
        amount: string;
    };
    ticketsSold: number;
}

interface LotteryCardProps {
    round: LotteryRound;
    onBuyTicket: (amount: string) => void;
}

export function LotteryCard({ round, onBuyTicket }: LotteryCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [amount, setAmount] = useState('1'); // Default 1 ticket
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [lightningActive, setLightningActive] = useState(false);

    // Timer logic
    useEffect(() => {
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
    }, [round.endTime]);

    const handleBuyClick = () => {
        setLightningActive(true);
        setIsFlipped(true);
        setAmount('1');
        setStatus(null);
    };

    const handleBackClick = () => {
        setIsFlipped(false);
        setTimeout(() => setStatus(null), 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'info', message: 'Purchasing ticket...' });

        // Simulate network delay
        setTimeout(() => {
            onBuyTicket(amount);
            setStatus({ type: 'success', message: 'Ticket Purchased!' });
            setIsSubmitting(false);

            setTimeout(() => {
                setIsFlipped(false);
                setAmount('1');
                setStatus(null);
            }, 1500);
        }, 1000);
    };

    const isActive = round.status === "ACTIVE";
    const isClosed = round.status === "CLOSED";
    const isComplete = round.status === "COMPLETE";

    return (
        <div className="group perspective-1000 h-full w-full">
            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                {/* FRONT FACE */}
                <div className="relative w-full h-full backface-hidden bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow">
                    <LightningAnimation
                        isActive={lightningActive}
                        onComplete={() => setLightningActive(false)}
                    />

                    {/* Header */}
                    <div className={`px-4 py-3 ${isActive ? "bg-purple-600" :
                            isClosed ? "bg-amber-500" :
                                "bg-gray-500"
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isActive && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                                <span className="font-medium text-white text-sm uppercase tracking-wider">
                                    {isActive ? "Live Draw" : isClosed ? "Drawing..." : "Finished"}
                                </span>
                            </div>
                            <span className="text-xs font-mono text-white opacity-90">
                                #{round.id}
                            </span>
                        </div>

                        {/* Timer for Active/Closed */}
                        {!isComplete && (
                            <div className="flex items-center justify-center mt-1 gap-1">
                                <Clock className="w-3 h-3 text-white/80" />
                                <span className="text-white text-xs opacity-90 font-mono">
                                    {isClosed ? "Calculating..." : `Ends in ${timeLeft}`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col items-center justify-center min-h-[200px]">

                        {/* Prize Pool Display */}
                        <div className="text-center mb-6 w-full">
                            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Prize Pool</div>
                            <div className={`text-2xl font-bold ${isActive ? "text-purple-600" :
                                    isClosed ? "text-amber-600" :
                                        "text-gray-700"
                                }`}>
                                {round.prizePool} LNRA
                            </div>
                        </div>

                        {isActive && (
                            <div className="w-full space-y-4">
                                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 flex justify-between items-center">
                                    <span className="text-purple-700 text-sm font-medium">Ticket Price</span>
                                    <span className="text-purple-900 font-bold">{round.ticketPrice} LNRA</span>
                                </div>

                                <button
                                    onClick={handleBuyClick}
                                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                                >
                                    <Ticket className="w-4 h-4" />
                                    Buy Ticket
                                </button>
                            </div>
                        )}

                        {isClosed && (
                            <div className="w-full text-center space-y-3 animate-pulse">
                                <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                                    <Trophy className="w-8 h-8 text-amber-600" />
                                </div>
                                <div className="text-amber-800 font-medium">
                                    Selecting Winner...
                                </div>
                            </div>
                        )}

                        {isComplete && round.winner && (
                            <div className="w-full space-y-3">
                                <div className="text-center mb-2">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
                                        <Trophy className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <div className="text-gray-900 font-bold">Winner Announced!</div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Ticket ID</span>
                                        <span className="font-mono text-gray-900">#{round.winner.ticketId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Winner</span>
                                        <span className="font-mono text-gray-900" title={round.winner.owner}>
                                            {round.winner.owner.slice(0, 6)}...{round.winner.owner.slice(-4)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-500">Won</span>
                                        <span className="font-bold text-green-600">{round.winner.amount} LNRA</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* BACK FACE (Purchase Form) */}
                <div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180 bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 flex flex-col">
                    <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                        <button
                            onClick={handleBackClick}
                            className="p-1 rounded-full hover:bg-white/50 transition-colors text-purple-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-purple-800">Buy Tickets</span>
                        <div className="w-7" />
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-center">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Tickets
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="1"
                                        max="100"
                                        required
                                        autoFocus
                                        className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                        x {round.ticketPrice}
                                    </div>
                                </div>
                                <div className="mt-2 text-right text-sm text-gray-500">
                                    Total: <span className="font-bold text-purple-600">
                                        {(parseInt(amount || '0') * parseFloat(round.ticketPrice)).toFixed(2)} LNRA
                                    </span>
                                </div>
                            </div>

                            {status && (
                                <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' :
                                        status.type === 'error' ? 'bg-red-50 text-red-700' :
                                            'bg-blue-50 text-blue-700'
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
                                className="w-full py-3.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm Purchase'}
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}
