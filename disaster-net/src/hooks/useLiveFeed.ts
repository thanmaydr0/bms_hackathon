import { useState, useEffect } from 'react';
import { getAllMessages, getAllHazards } from '../db/repository';
import type { SOSMessage, HazardReport } from '../types';

export type FeedItem = 
  | ({ type: 'message' } & SOSMessage)
  | ({ type: 'hazard' } & HazardReport);

export function useLiveFeed(intervalMs = 3000) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchFeed() {
      try {
        const [messages, hazards] = await Promise.all([
          getAllMessages(),
          getAllHazards()
        ]);

        if (!mounted) return;

        const merged: FeedItem[] = [
          ...messages.map(m => ({ ...m, type: 'message' as const })),
          ...hazards.map(h => ({ ...h, type: 'hazard' as const }))
        ];

        // Sort descending by timestamp
        merged.sort((a, b) => b.timestamp - a.timestamp);
        
        setFeed(merged);
      } catch (error) {
        console.error('Failed to fetch live feed:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    // Initial fetch
    fetchFeed();

    // Polling interval
    const timer = setInterval(fetchFeed, intervalMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { feed, isLoading };
}
