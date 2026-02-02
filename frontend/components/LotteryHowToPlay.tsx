import { Sparkles } from "lucide-react";

export function LotteryHowToPlay() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">How to Play & Win</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-all hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-gray-900 mb-4 border border-gray-100">1</div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Buy Tickets</h3>
                    <p className="text-gray-500 leading-relaxed">
                        Purchase tickets before the timer ends. Each ticket gives you a chance to win.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-red-50 rounded-xl p-6 border border-red-100 hover:border-red-200 transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-red-100 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-red-600 mb-4 border border-red-100 relative z-10">2</div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2 relative z-10">Watch Live</h3>
                    <p className="text-gray-600 leading-relaxed relative z-10">
                        Don't leave! Winners are picked <strong>live</strong> on-screen immediately after the round closes.
                    </p>
                </div>

                {/* Step 3 */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-100 hover:border-green-200 transition-all hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg font-bold text-green-600 mb-4 border border-green-100">3</div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Instant Win</h3>
                    <p className="text-gray-600 leading-relaxed">
                        If you win, prizes are sent directly to your wallet instantly. No claiming required.
                    </p>
                </div>
            </div>
        </div>
    );
}
