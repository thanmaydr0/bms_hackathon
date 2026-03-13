import { useState, useCallback, useEffect, useRef } from 'react';
import { PeerConnection } from '../lib/webrtc/PeerConnection';
import { db, type DisasterReport } from '../lib/db/db';

type ConnectionState = 'disconnected' | 'creating-offer' | 'waiting-for-answer' | 'creating-answer' | 'connected';

export function useSync() {
  // useRef ensures we have one continuous instance and mutating properties (like onConnect) doesn't violate React immutability rules
  const peerRef = useRef<PeerConnection | null>(null);
  if (!peerRef.current) {
    peerRef.current = new PeerConnection();
  }
  const peer = peerRef.current;
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [qrData, setQrData] = useState<string | null>(null);

  // When connection logic completes, we sync the current database items over the WebRTC data channel
  useEffect(() => {
    peer.onConnect = async () => {
      setConnectionState('connected');
      
      // Perform initial sync of Last-Write-Wins (LWW) conflict strategy
      const allReports = await db.reports.toArray();
      peer.sendData({
        type: 'sync-db',
        payload: allReports
      });
    };

    peer.onDisconnect = () => {
      setConnectionState('disconnected');
      setQrData(null);
    };

    // Receiver of sync data
    peer.onData = async (message: unknown) => {
      // Type-casting the unknown network message 
      const msg = message as { type: string, payload: unknown };

      if (msg.type === 'sync-db' && Array.isArray(msg.payload)) {
        const incomingReports: DisasterReport[] = msg.payload;
        
        // Execute LWW (Last-Write-Wins) Resolution
        await db.transaction('rw', db.reports, async () => {
          for (const incoming of incomingReports) {
            const existing = await db.reports.get(incoming.id);
            if (!existing || incoming.timestamp > existing.timestamp) {
              await db.reports.put(incoming);
            }
          }
        });
        
        console.log('Sync complete');
      }
    };
  }, [peer]);

  // Peer A: Starts the process
  const startAsOffer = useCallback(async () => {
    setConnectionState('creating-offer');
    const offerData = await peer.createOffer();
    setQrData(offerData); // Show this QR code to Peer B
    setConnectionState('waiting-for-answer');
  }, [peer]);

  // Peer B: Scans Peer A's offer and generates an answer
  const scanOfferAndCreateAnswer = useCallback(async (scannedOffer: string) => {
    setConnectionState('creating-answer');
    const answerData = await peer.receiveOfferAndCreateAnswer(scannedOffer);
    setQrData(answerData); // Show this to Peer A
  }, [peer]);

  // Peer A: Scans Peer B's answer
  const scanAnswerAndConnect = useCallback(async (scannedAnswer: string) => {
    await peer.receiveAnswer(scannedAnswer);
    // Connection should now establish and fire onConnect...
  }, [peer]);

  return {
    connectionState,
    qrData,
    startAsOffer,
    scanOfferAndCreateAnswer,
    scanAnswerAndConnect,
    disconnect: () => {
      peer.connection.close();
      setConnectionState('disconnected');
      setQrData(null);
    }
  };
}
