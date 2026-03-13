import { useState, useEffect, useMemo } from 'react';
import { liveQuery } from 'dexie';
import { getAllMessages, getAllHazards } from '../db/repository';
import type { SOSMessage, HazardReport } from '../types';

export type FeedItem = 
  | ({ type: 'message' } & SOSMessage)
  | ({ type: 'hazard' } & HazardReport);

export function useLiveFeed() {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [messages, setMessages] = useState<SOSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(async () => ({
      hazards: await getAllHazards(),
      messages: await getAllMessages(),
    })).subscribe({
      next: (data) => {
        setHazards(data.hazards);
        setMessages(data.messages);
        setIsLoading(false);
      },
      error: (err) => {
        console.error('[useLiveFeed] liveQuery error:', err);
        setIsLoading(false);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  // Merge and sort descending by timestamp
  const feed: FeedItem[] = useMemo(() => {
    const merged: FeedItem[] = [
      ...messages.map(m => ({ ...m, type: 'message' as const })),
      ...hazards.map(h => ({ ...h, type: 'hazard' as const })),
    ];
    merged.sort((a, b) => b.timestamp - a.timestamp);
    return merged;
  }, [hazards, messages]);

  return { feed, isLoading };
}
