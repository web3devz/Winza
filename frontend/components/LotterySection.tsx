import { useState, useEffect, useRef } from "react";
import { useLinera, LotteryRound } from "./LineraProvider";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";
import { LotteryPoolsInfo } from "./LotteryPoolsInfo";

export function LotterySection() {
    const { purchaseTickets, lotteryRounds, lotteryWinners } = useLinera();

    const handleBuyTicket = async (amountTokens: string) => {
        if (!purchaseTickets) return;
        await purchaseTickets(amountTokens);
    };

    const rounds = lotteryRounds || [];
    const activeRound = rounds.find(r => r.status === "ACTIVE" || r.status === "CLOSED" || r.status === "DRAWING");

    // Logic to delay transition from a completed round to a new active round
    // We store the ID instead of the object to ensure we always render the latest data (e.g. if winners come in late)
    const [delayedRoundId, setDelayedRoundId] = useState<string | null>(null);
    const prevActiveRoundRef = useRef<LotteryRound | undefined>(undefined);

    // Clear delayed round after 15 seconds
    useEffect(() => {
        if (delayedRoundId) {
            const timer = setTimeout(() => {
                setDelayedRoundId(null);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [delayedRoundId]);

    // Detect round transition
    useEffect(() => {
        const prev = prevActiveRoundRef.current;
        // If we had a previous round, and the active round ID changed
        if (prev && prev.id !== activeRound?.id) {
            // Find the latest version of the previous round in the full list to get updated winners/status
            const prevRoundLatest = rounds.find(r => r.id === prev.id);

            // If the previous round is now COMPLETE, show it for a bit longer
            if (prevRoundLatest && prevRoundLatest.status === 'COMPLETE') {
                setDelayedRoundId(prev.id);
            }
        }
        prevActiveRoundRef.current = activeRound;
    }, [activeRound?.id]); // Only trigger when activeRound ID changes

    const delayedRound = delayedRoundId ? rounds.find(r => r.id === delayedRoundId) : null;
    const displayRound = delayedRound || activeRound;

    const historyRounds = rounds.filter(r => r.status === "COMPLETE");

    return (
        <div className="space-y-8">
            {/* Hero Section - Always rendered to prevent layout shift */}
            <LotteryHero
                round={displayRound}
                allWinners={lotteryWinners || []} // Pass global winners list
                onBuyTicket={handleBuyTicket}
            />

            {/* History Section */}
            <LotteryHistory rounds={historyRounds} latest={lotteryWinners || []} />

            {/* Prize Distribution Info */}
            <LotteryPoolsInfo />
        </div>
    );
}
