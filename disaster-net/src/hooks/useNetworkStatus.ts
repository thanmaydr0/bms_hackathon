import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasEverOffline, setWasEverOffline] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Delay initialization to avoid flash on first load
    const initTimer = setTimeout(() => setInitialized(true), 1500);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setWasEverOffline(true);
    };

    // Check initial state
    if (!navigator.onLine) setWasEverOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasEverOffline, initialized };
}
