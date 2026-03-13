import { db } from './database';
import type { HazardReport, SOSMessage, PeerIdentity, SyncSession } from '../types/index';

// ---------------------------------------------------------------------------
// User Identity
// ---------------------------------------------------------------------------

export async function getOrCreateIdentity(): Promise<PeerIdentity> {
  const existing = await db.peers.get('self');
  if (existing) return existing;

  const uuid = crypto.randomUUID();
  const identity: PeerIdentity = {
    id: 'self',
    name: `Survivor_${uuid.slice(0, 6)}`,
    lastSeen: Date.now(),
  };
  await db.peers.put(identity);
  return identity;
}

export async function updateIdentityName(name: string): Promise<void> {
  await db.peers.update('self', { name });
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

export async function addHazard(
  hazard: Omit<HazardReport, 'id' | 'synced' | 'timestamp'>
): Promise<number> {
  return db.hazards.add({
    ...hazard,
    synced: false,
    timestamp: Date.now(),
  });
}

export async function getAllHazards(): Promise<HazardReport[]> {
  return db.hazards.orderBy('timestamp').reverse().toArray();
}

export async function markHazardSynced(id: number): Promise<void> {
  await db.hazards.update(id, { synced: true });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function addMessage(
  msg: Omit<SOSMessage, 'id' | 'synced' | 'timestamp'>
): Promise<number> {
  return db.messages.add({
    ...msg,
    synced: false,
    timestamp: Date.now(),
  });
}

export async function getAllMessages(): Promise<SOSMessage[]> {
  return db.messages.orderBy('timestamp').reverse().toArray();
}

export async function markMessageSynced(id: number): Promise<void> {
  await db.messages.update(id, { synced: true });
}

// ---------------------------------------------------------------------------
// Bulk Sync (WebRTC layer)
// ---------------------------------------------------------------------------

export async function bulkUpsertHazards(hazards: HazardReport[]): Promise<void> {
  await db.hazards.bulkPut(hazards);
}

export async function bulkUpsertMessages(messages: SOSMessage[]): Promise<void> {
  await db.messages.bulkPut(messages);
}

// ---------------------------------------------------------------------------
// Sync Sessions
// ---------------------------------------------------------------------------

export async function recordSyncSession(
  session: Omit<SyncSession, 'id'>
): Promise<void> {
  await db.syncSessions.add(session);
}
