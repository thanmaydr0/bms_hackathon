import Dexie, { type Table } from 'dexie';
import type { HazardReport, SOSMessage, PeerIdentity, SyncSession } from '../../types';

export class DisasterDatabase extends Dexie {
  hazards!: Table<HazardReport, number>;
  messages!: Table<SOSMessage, number>;
  peers!: Table<PeerIdentity, string>;
  syncSessions!: Table<SyncSession, number>;

  constructor() {
    super('DisasterNetDB');
    
    this.version(2).stores({
      hazards: '++id, timestamp, category, severity, synced',
      messages: '++id, timestamp, priority, senderId, synced',
      peers: 'id, lastSeen',
      syncSessions: '++id, timestamp, peerId'
    });
  }
}

export const db = new DisasterDatabase();
