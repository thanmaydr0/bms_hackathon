import { useState, useCallback, useEffect } from 'react';
import {
  initializeAsOfferer,
  initializeAsAnswerer,
  finalizeConnection,
  closeConnection,
  sendSyncPayload,
  type WebRTCStatus,
  type SyncPayload
} from '../lib/webrtcManager';
import { compressSDP, decompressSDP } from '../lib/sdpCompressor';

// Map the detailed WebRTCManager status to the simplified UI ConnectionState
type ConnectionState = 
  | 'disconnected' 
  | 'creating-offer' 
  | 'waiting-for-answer' 
  | 'creating-answer' 
  | 'connected';

function mapStatusToState(status: WebRTCStatus): ConnectionState {
  switch (status) {
    case 'idle':
    case 'failed':
    case 'closed':
      return 'disconnected';
    case 'generating_offer':
      return 'creating-offer';
    case 'awaiting_answer':
      return 'waiting-for-answer';
    case 'generating_answer':
    case 'connecting':
      return 'creating-answer';
    case 'connected':
      return 'connected';
  }
}

export function useSync() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync session logic: send data when connected, handle incoming data
  useEffect(() => {
    if (connectionState === 'connected') {
      const syncInitialData = async () => {
        try {
          // In a real app with the new types, this would fetch from the repository.ts hooks
          const payload: SyncPayload = {
            type: 'SYNC_DATA',
            senderId: 'local-node',
            senderName: 'Local Node',
            hazards: [],
            messages: [],
            timestamp: Date.now()
          };
          
          await sendSyncPayload(payload);
          console.log('[useSync] Sent initial sync payload');
        } catch (err) {
          console.error('[useSync] Failed to send initial sync:', err);
        }
      };

      syncInitialData();
    }
  }, [connectionState]);

  const handleStatusChange = useCallback((status: WebRTCStatus) => {
    console.log('[useSync] WebRTC Status:', status);
    setConnectionState(mapStatusToState(status));
    if (status === 'closed' || status === 'failed') {
      setQrData(null);
    }
  }, []);

  const handleDataReceived = useCallback(async (payload: SyncPayload) => {
    console.log('[useSync] Received SyncPayload:', payload);
    // Execute LWW (Last-Write-Wins) Resolution in a real implementation
  }, []);

  const handleError = useCallback((errMsg: string) => {
    console.error('[useSync] WebRTC Error:', errMsg);
    setError(errMsg);
    setConnectionState('disconnected');
    setQrData(null);
  }, []);

  const callbacks = {
    onStatusChange: handleStatusChange,
    onDataReceived: handleDataReceived,
    onError: handleError
  };

  // Peer A: Starts the process
  const startAsOffer = useCallback(async () => {
    setError(null);
    setConnectionState('creating-offer');
    try {
      const offerJson = await initializeAsOfferer(callbacks);
      const compressed = compressSDP(offerJson);
      setQrData(compressed); // Show this QR code to Peer B
    } catch (err) {
      console.error(err);
    }
  }, [callbacks]);

  // Peer B: Scans Peer A's offer and generates an answer
  const scanOfferAndCreateAnswer = useCallback(async (scannedOffer: string) => {
    setError(null);
    setConnectionState('creating-answer');
    try {
      // Decompress the scanned QR string back to SDP JSON
      const offerJson = JSON.stringify(decompressSDP(scannedOffer));
      const answerJson = await initializeAsAnswerer(offerJson, callbacks);
      
      const compressed = compressSDP(answerJson);
      setQrData(compressed); // Show this to Peer A
    } catch (err) {
      console.error(err);
      setError('Failed to process offer QR code');
      closeConnection();
    }
  }, [callbacks]);

  // Peer A: Scans Peer B's answer
  const scanAnswerAndConnect = useCallback(async (scannedAnswer: string) => {
    try {
      const answerJson = JSON.stringify(decompressSDP(scannedAnswer));
      await finalizeConnection(answerJson);
      // Connection should now establish and fire onStatusChange('connected')
    } catch (err) {
      console.error(err);
      setError('Failed to process answer QR code');
      closeConnection();
    }
  }, []);

  const disconnect = useCallback(() => {
    closeConnection();
    setConnectionState('disconnected');
    setQrData(null);
    setError(null);
  }, []);

  return {
    connectionState,
    qrData,
    error,
    startAsOffer,
    scanOfferAndCreateAnswer,
    scanAnswerAndConnect,
    disconnect
  };
}
