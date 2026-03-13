import { useState, useCallback, useEffect, useRef } from 'react';
import { PeerConnection } from '../lib/webrtc/PeerConnection';
import { db, type DisasterReport } from '../lib/db/db';

type ConnectionState = 'disconnected' | 'creating-offer' | 'waiting-for-answer' | 'creating-answer' | 'connected';

export function useSync() {
  const peerRef = useRef<PeerConnection | null>(null);
  if (peerRef.current === null) {
    peerRef.current = new PeerConnection();
  }
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [qrData, setQrData] = useState<string | null>(null);

  // When connection logic completes, we sync the current database items over the WebRTC data channel
  useEffect(() => {
    const peer = peerRef.current!;
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
  }, []);

  // Peer A: Starts the process
  const startAsOffer = useCallback(async () => {
    setConnectionState('creating-offer');
    const peer = peerRef.current!;
    const offerData = await peer.createOffer();
    setQrData(offerData); // Show this QR code to Peer B
    setConnectionState('waiting-for-answer');
  }, []);

  // Peer B: Scans Peer A's offer and generates an answer
  const scanOfferAndCreateAnswer = useCallback(async (scannedOffer: string) => {
    setConnectionState('creating-answer');
    const peer = peerRef.current!;
    const answerData = await peer.receiveOfferAndCreateAnswer(scannedOffer);
    setQrData(answerData); // Show this to Peer A
  }, []);

  // Peer A: Scans Peer B's answer
  const scanAnswerAndConnect = useCallback(async (scannedAnswer: string) => {
    const peer = peerRef.current!;
    await peer.receiveAnswer(scannedAnswer);
    // Connection should now establish and fire onConnect...
  }, []);

  return {
    connectionState,
    qrData,
    startAsOffer,
    scanOfferAndCreateAnswer,
    scanAnswerAndConnect,
    disconnect: () => {
      const peer = peerRef.current!;
      peer.connection.close();
      setConnectionState('disconnected');
      setQrData(null);
    }
  };
}
