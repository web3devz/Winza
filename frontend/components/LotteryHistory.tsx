import { LotteryRound, Winner } from "./LineraProvider";
import { Trophy, Clock, Ticket, Activity, TrendingUp } from "lucide-react";
import { formatLocalTime } from "../utils/timeUtils";
import { useMemo } from "react";

interface LotteryHistoryProps {
    rounds: LotteryRound[];
    latest?: Winner[];
}

export function LotteryHistory({ rounds, latest }: LotteryHistoryProps) {
    const stats = useMemo(() => {
        const allWinners: { winner: Winner; roundId: string; time: number }[] = [];
        const uniquePlayers = new Set<string>();

        // Process Latest Winners
        if (latest) {
            latest.forEach(w => {
                // Use createdAt from the winner object, fallback to Date.now() if missing
                // Use w.roundId if available, otherwise 'Live'
                allWinners.push({ winner: w, roundId: w.roundId || 'Live', time: w.createdAt || Date.now() });
                uniquePlayers.add(w.owner);
            });
        }

        // Process History Rounds
        rounds.forEach(r => {
            r.winners.forEach(w => {
                // For historical rounds, use winner creation time or fallback to round end time
                allWinners.push({ winner: w, roundId: r.id, time: w.createdAt || r.endTime });
                uniquePlayers.add(w.owner);
            });
        });

        // Sort Feed (Newest First)
        const seen = new Set();
        const feed = allWinners
            .filter(item => {
                // Deduplicate based on Round ID + Ticket ID to allow same ticket number in different rounds
                const key = `${item.roundId}-${item.winner.ticketId}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.time - a.time)
            .slice(0, 100);

        // Calculate Metrics
        const totalVolume = rounds.reduce((acc, r) => acc + parseFloat(r.prizePool), 0);
        const totalWinners = feed.length;
        const avgWin = totalWinners > 0 ? totalVolume / allWinners.length : 0;

        // Chart Data (Last 12 Rounds)
        let chartData = [...rounds]
            .sort((a, b) => Number(a.id) - Number(b.id)) // Oldest to Newest
            .slice(-12) // Last 12
            .map(r => ({
                id: r.id,
                val: parseFloat(r.prizePool)
            }));

        // Fill with empty slots if less than 12 to keep chart stable
        if (chartData.length < 12) {
            const missing = 12 - chartData.length;
            const placeholders = Array(missing).fill(0).map(() => ({ id: `?`, val: 0 }));
            chartData = [...placeholders, ...chartData];
        }

        // Dynamic Scaling: Min 10, otherwise max value
        const maxVal = Math.max(...chartData.map(d => d.val));
        const maxChartVal = Math.max(maxVal, 10);

        // Generate Wavy SVG Path
        const points = chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 100;
            const y = 100 - (d.val / maxChartVal) * 80; // Keep some padding at top
            return [x, y];
        });

        // Helper for Bezier control points
        const line = (pointA: number[], pointB: number[]) => {
            const lengthX = pointB[0] - pointA[0];
            const lengthY = pointB[1] - pointA[1];
            return {
                length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
                angle: Math.atan2(lengthY, lengthX)
            };
        };

        const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
            const p = previous || current;
            const n = next || current;
            const smoothing = 0.2;
            const o = line(p, n);
            const angle = o.angle + (reverse ? Math.PI : 0);
            const length = o.length * smoothing;
            const x = current[0] + Math.cos(angle) * length;
            const y = current[1] + Math.sin(angle) * length;
            return [x, y];
        };

        // Simple smoothing function for Bezier curves
        const svgPath = points.length > 1 ? points.reduce((acc, point, i, a) => {
            if (i === 0) return `M ${point[0]},${point[1]}`;
            const cps = controlPoint(a[i - 1], a[i - 2], point);
            const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
            return `${acc} C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`;
        }, "") : "";

        const fillPath = `${svgPath} L 100,100 L 0,100 Z`;

        return {
            feed,
            totalVolume,
            uniqueCount: uniquePlayers.size,
            avgWin,
            chartData,
            maxChartVal,
            svgPath,
            fillPath
        };
    }, [rounds, latest]);

    return (
        <div className="space-y-8">
            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Key Metrics Card */}
                <div className="bg-black dark:bg-zinc-950 text-white rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-20 -mr-16 -mt-16 pointer-events-none"></div>

                    <div>
                        <div className="flex items-center gap-3 mb-6 opacity-75">
                            <Activity className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-bold tracking-widest uppercase">Platform Analytics</span>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div>
                                <div className="text-4xl font-black tracking-tight mb-1">
                                    {stats.totalVolume.toFixed(0)} <span className="text-red-500">LNRA</span>
                                </div>
                                <div className="text-sm text-gray-400 font-medium">Total Prize Volume Distributed</div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-2xl font-bold text-white">{stats.uniqueCount}</div>
                                    <div className="text-xs text-gray-500 uppercase font-bold mt-1">Unique Players</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">~{stats.avgWin.toFixed(1)}</div>
                                    <div className="text-xs text-gray-500 uppercase font-bold mt-1">Avg. Win Size</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-medium text-gray-400">
                        <span>Updated Realtime</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Live
                        </div>
                    </div>
                </div>

                {/* Trend Chart Card */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm flex flex-col min-h-[300px] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-red-600" />
                                Prize Pool Trend
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Volume history of the last 12 rounds</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last Round</div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">
                                {stats.chartData[stats.chartData.length - 1]?.val || 0} LNRA
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full relative h-40 flex gap-4">
                        {/* Y-Axis Labels */}
                        <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 py-2 text-right min-w-[40px]">
                            <div>{Math.round(stats.maxChartVal)}</div>
                            <div>{Math.round(stats.maxChartVal * 0.75)}</div>
                            <div>{Math.round(stats.maxChartVal * 0.5)}</div>
                            <div>{Math.round(stats.maxChartVal * 0.25)}</div>
                            <div>0</div>
                        </div>

                        {/* Chart Area */}
                        <div className="flex-1 relative">
                            {/* Grid Lines (Solid now, not dashed) */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div className="w-full h-px bg-gray-100 dark:bg-zinc-800"></div>
                                <div className="w-full h-px bg-gray-100 dark:bg-zinc-800"></div>
                                <div className="w-full h-px bg-gray-100 dark:bg-zinc-800"></div>
                                <div className="w-full h-px bg-gray-100 dark:bg-zinc-800"></div>
                                <div className="w-full h-px bg-gray-100 dark:bg-zinc-800"></div>
                            </div>

                            {/* Wavy Chart SVG */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={stats.fillPath} fill="url(#chartGradient)" />
                                <path d={stats.svgPath} fill="none" stroke="#DC2626" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            </svg>

                            {/* HTML Data Points & Tooltips (Overlay) */}
                            <div className="absolute inset-0">
                                {stats.chartData.map((d, i) => {
                                    const x = (i / (stats.chartData.length - 1)) * 100;
                                    const y = 100 - (d.val / stats.maxChartVal) * 80; // Match SVG calculation

                                    return (
                                        <div
                                            key={i}
                                            className="absolute w-4 h-full group flex items-end justify-center hover:z-20"
                                            style={{
                                                left: `${x}%`,
                                                top: 0,
                                                transform: 'translateX(-50%)' // Center on the point
                                            }}
                                        >
                                            {/* Hover Trigger Area (Full Height) */}
                                            <div className="w-full h-full absolute inset-0 cursor-crosshair"></div>

                                            {/* The Point Dot */}
                                            <div
                                                className="w-2 h-2 bg-white dark:bg-zinc-900 border-[3px] border-red-600 rounded-full absolute transition-all duration-300 opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 z-10"
                                                style={{ top: `${y}%`, transform: 'translateY(-50%)' }}
                                            ></div>

                                            {/* Tooltip */}
                                            {d.id !== '?' && (
                                                <div
                                                    className="absolute bg-black dark:bg-zinc-950 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg border border-zinc-800"
                                                    style={{ top: `${y}%`, transform: 'translateY(-150%)' }}
                                                >
                                                    {d.val} LNRA
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-black dark:bg-zinc-950 rotate-45 border-r border-b border-zinc-800"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Width Live Feed */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Clock className="w-5 h-5 text-red-600" />
                        Live Winners Feed
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wide border border-red-100 dark:border-red-900/30">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Realtime Stream
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {stats.feed.length === 0 ? (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
                                <Trophy className="w-16 h-16 opacity-10" />
                                <p className="font-medium">Waiting for the first winner...</p>
                            </div>
                        ) : (
                            stats.feed.map((item, idx) => (
                                <div key={`${item.winner.ticketId}-${idx}`} className="group bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 hover:border-red-600 dark:hover:border-red-600 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-gray-500 flex items-center justify-center font-black text-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                        <Ticket className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-black text-gray-900 dark:text-white text-lg">{item.winner.amount} LNRA</span>
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                {formatLocalTime(item.time)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            <span className="font-mono text-gray-400 dark:text-gray-500">
                                                {item.winner.owner.slice(0, 6)}...{item.winner.owner.slice(-4)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                                            <span className="flex items-center gap-1">
                                                <Ticket className="w-3 h-3" /> #{item.winner.ticketId}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                                            <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                                                R#{item.roundId}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {stats.feed.length > 0 && (
                    <div className="px-8 py-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                        Showing last {stats.feed.length} winners
                    </div>
                )}
            </div>
        </div>
    );
}
