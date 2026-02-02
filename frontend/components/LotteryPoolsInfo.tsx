export function LotteryPoolsInfo() {
    const pools = [
        {
            id: 4,
            title: "Pool 4",
            tickets: "3%",
            prize: "25%",
            description: "Grand Jackpot",
            subtext: "Top tier winners share 25% of the total prize pool.",
            style: "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg ring-1 ring-red-500 dark:ring-red-900 transform hover:-translate-y-2",
            textStyle: "text-red-100",
            valueStyle: "text-white",
            labelStyle: "text-red-200"
        },
        {
            id: 3,
            title: "Pool 3",
            tickets: "5%",
            prize: "30%",
            description: "Major Prize",
            subtext: "Third tier winners share 30% of the total prize pool.",
            style: "bg-gray-900 dark:bg-zinc-800 text-white shadow-md ring-1 ring-gray-800 dark:ring-zinc-700 transform hover:-translate-y-1",
            textStyle: "text-gray-400",
            valueStyle: "text-white",
            labelStyle: "text-gray-500"
        },
        {
            id: 2,
            title: "Pool 2",
            tickets: "7%",
            prize: "25%",
            description: "Standard Prize",
            subtext: "Second tier winners share 25% of the total prize pool.",
            style: "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-zinc-800",
            textStyle: "text-gray-500 dark:text-gray-400",
            valueStyle: "text-gray-900 dark:text-white",
            labelStyle: "text-gray-400 dark:text-gray-500"
        },
        {
            id: 1,
            title: "Pool 1",
            tickets: "15%",
            prize: "20%",
            description: "Community Pool",
            subtext: "First tier winners share 20% of the total prize pool.",
            style: "bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-800",
            textStyle: "text-gray-500 dark:text-gray-400",
            valueStyle: "text-gray-900 dark:text-white",
            labelStyle: "text-gray-400 dark:text-gray-500"
        }
    ];

    return (
        <div className="py-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Prize Distribution</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    The prize pool is distributed across 4 distinct pools. Higher pools have fewer tickets but bigger rewards!
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pools.map((pool) => (
                    <div
                        key={pool.id}
                        className={`relative p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 ${pool.style}`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold">{pool.title}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${pool.id === 4 ? 'bg-white/20 text-white' : pool.id === 3 ? 'bg-white/10 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}>
                                    {pool.description}
                                </span>
                            </div>

                            <p className={`text-sm mb-6 ${pool.textStyle} leading-relaxed`}>
                                {pool.subtext}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 dark:border-white/5">
                            <div>
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${pool.labelStyle}`}>Tickets</div>
                                <div className={`text-2xl font-bold ${pool.valueStyle}`}>{pool.tickets}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${pool.labelStyle}`}>Prize</div>
                                <div className={`text-2xl font-bold ${pool.valueStyle}`}>{pool.prize}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
