export interface HazardReport {
  id?: number;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'collapsed_building'
    | 'blocked_road'
    | 'fire'
    | 'flood'
    | 'medical'
    | 'resource'
    | 'other';
  description: string;
  reportedBy: string;  // local user ID (generated UUID, stored in IndexedDB)
  timestamp: number;   // Unix ms
  synced: boolean;     // has this been shared via WebRTC?
}

export interface SOSMessage {
  id?: number;
  text: string;
  senderName: string;
  senderId: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  priority: 'info' | 'warning' | 'sos';
  synced: boolean;
}

export interface PeerIdentity {
  id: string;         // UUID
  name: string;       // user-chosen display name
  publicKey?: string; // reserved for future crypto
  lastSeen: number;
}

export interface SyncSession {
  id?: number;
  peerId: string;
  peerName: string;
  timestamp: number;
  itemsSent: number;
  itemsReceived: number;
}
