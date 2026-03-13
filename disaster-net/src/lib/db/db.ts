import Dexie, { type Table } from 'dexie';

// Define our offline peer-to-peer data models

export interface DisasterReport {
  id: string; // UUID for global uniqueness
  type: 'medical' | 'fire' | 'supplies' | 'structure' | 'other';
  description: string;
  latitude: number;
  longitude: number;
  timestamp: number; // For Last-Write-Wins and conflict resolution
  authorId: string; // Device or User ID
  status: 'active' | 'resolved' | 'in-progress';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface PeerDevice {
  id: string; // Device ID
  lastSeen: number;
  name?: string;
}

export class DisasterDatabase extends Dexie {
  reports!: Table<DisasterReport, string>;
  peers!: Table<PeerDevice, string>;

  constructor() {
    super('DisasterNetDB');
    
    // Schema definition
    // Indexed fields for querying
    this.version(1).stores({
      reports: 'id, type, timestamp, authorId, status, urgency',
      peers: 'id, lastSeen'
    });
  }
}

// Export singleton instance
export const db = new DisasterDatabase();
