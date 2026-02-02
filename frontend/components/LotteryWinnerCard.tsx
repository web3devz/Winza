import { Ticket, Sparkles } from "lucide-react";
import { Winner } from "./LineraProvider";

interface LotteryWinnerCardProps {
    winner: Winner | null;
}

export function LotteryWinnerCard({ winner }: LotteryWinnerCardProps) {
    if (!winner) {
        return (
            <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col h-[180px] relative transition-colors duration-300">
                <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between z-10">
                    <span>Latest Winner</span>
                    <span>Prize</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 relative">
                    <div className="text-center text-gray-400 dark:text-gray-500 space-y-2 animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto"></div>
                        <div className="text-sm font-medium">Waiting for results...</div>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col h-[180px] relative transition-colors duration-300">
            <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex justify-between z-10">
                <span>Latest Winner</span>
                <span>Prize</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 relative">
                <div
                    key={winner.ticketId}
                    className="w-full bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
                >
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center justify-center shadow-sm">
                        <Ticket className="w-6 h-6" />
                    </div>

                    <div className="flex-1 text-left">
                        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Winning Ticket</div>
                        <div className="font-mono font-black text-xl text-gray-900 dark:text-white tracking-tight">
                            #{winner.ticketId}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg font-bold text-sm">
                            <Sparkles className="w-3 h-3" />
                            <span>+{winner.amount}</span>
                        </div>
                    </div>
                </div>

                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>
            </div>
        </div>
    );
}
