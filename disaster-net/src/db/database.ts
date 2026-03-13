import Dexie, { type Table } from 'dexie';
import type { HazardReport, SOSMessage, PeerIdentity, SyncSession } from '../types/index';

export class DisasterNetDB extends Dexie {
  hazards!: Table<HazardReport, number>;
  messages!: Table<SOSMessage, number>;
  peers!: Table<PeerIdentity, string>;
  syncSessions!: Table<SyncSession, number>;

  constructor() {
    super('DisasterNetDB');

    this.version(1).stores({
      hazards: '++id, timestamp, severity, category, synced',
      messages: '++id, timestamp, priority, senderId, synced',
      peers: 'id, lastSeen',
      syncSessions: '++id, timestamp, peerId',
    });
  }
}

export const db = new DisasterNetDB();
