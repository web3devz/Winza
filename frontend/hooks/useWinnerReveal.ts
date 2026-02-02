import { useState, useEffect, useRef } from 'react';
import { Winner } from '../components/LineraProvider';

export function useWinnerReveal(winners: Winner[], roundId: string) {
    const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
    const [queue, setQueue] = useState<Winner[]>([]);
    const seenRef = useRef<Set<string>>(new Set());
    const lastRoundIdRef = useRef<string>(roundId);

    // Refs for timing control
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastRevealTimeRef = useRef<number>(Date.now());

    // Reset state when round changes
    useEffect(() => {
        if (lastRoundIdRef.current !== roundId) {
            seenRef.current.clear();
            setQueue([]);
            setCurrentWinner(null);
            lastRoundIdRef.current = roundId;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [roundId]);

    // Handle incoming winners
    useEffect(() => {
        if (!winners || winners.length === 0) return;

        // Identify new winners we haven't seen yet
        const newWinners = winners.filter(w => !seenRef.current.has(w.ticketId));

        if (newWinners.length === 0) return;

        // Mark as seen
        newWinners.forEach(w => seenRef.current.add(w.ticketId));

        // If this is the FIRST load for this round (or we have no current winner),
        // just show the latest one immediately and don't queue the backlog.
        if (!currentWinner && queue.length === 0) {
            const latest = winners[0];
            setCurrentWinner(latest);
            lastRevealTimeRef.current = Date.now();
            return;
        }

        // Sort new winners by time (Oldest -> Newest)
        const sortedNew = [...newWinners].sort((a, b) => a.createdAt - b.createdAt);
        setQueue(prev => [...prev, ...sortedNew]);

    }, [winners, roundId]);

    // Process the queue with smart timing and dynamic speed
    useEffect(() => {
        if (queue.length === 0) return;

        // Dynamic speed: If we have a backlog, speed up the display
        // Queue > 5: 500ms (Very fast catch-up)
        // Queue > 2: 1500ms (Moderate catch-up)
        // Normal: 3000ms
        let targetDisplayTime = 3000;
        if (queue.length > 5) targetDisplayTime = 500;
        else if (queue.length > 2) targetDisplayTime = 1500;

        const processNext = () => {
            // Update the timestamp BEFORE state updates to ensure the next effect run sees the correct time
            lastRevealTimeRef.current = Date.now();

            setQueue(prev => {
                if (prev.length === 0) {
                    return prev;
                }

                const [next, ...rest] = prev;
                setCurrentWinner(next);
                return rest;
            });
        };

        // If a timer is already running, clear it to allow re-calculation with potentially faster speed
        if (timerRef.current) clearTimeout(timerRef.current);

        const timeSinceLastReveal = Date.now() - lastRevealTimeRef.current;
        const delay = Math.max(0, targetDisplayTime - timeSinceLastReveal);

        timerRef.current = setTimeout(processNext, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [queue.length]); // Trigger whenever queue changes (additions or removals)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return currentWinner;
}
