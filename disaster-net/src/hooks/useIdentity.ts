import { useState, useEffect, useCallback } from 'react';
import { getOrCreateIdentity, updateIdentityName } from '../db/repository';
import type { PeerIdentity } from '../types';

export function useIdentity() {
  const [identity, setIdentity] = useState<PeerIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadIdentity = useCallback(async () => {
    setIsLoading(true);
    try {
      const id = await getOrCreateIdentity();
      setIdentity(id);
    } catch (err) {
      console.error('Failed to load identity', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const updateName = async (newName: string) => {
    await updateIdentityName(newName);
    await loadIdentity(); // refresh state
  };

  return { identity, updateName, isLoading };
}
