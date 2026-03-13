import { useState, useCallback, useEffect } from 'react';
import { useToast } from './useToast';
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
import { 
  getOrCreateIdentity, 
  getAllHazards, 
  getAllMessages, 
  bulkUpsertHazards, 
  bulkUpsertMessages, 
  recordSyncSession 
} from '../db/repository';

export type WizardState = 
  | 'idle' 
  | 'generating_offer' 
  | 'show_offer_qr' 
  | 'scanning_answer' 
  | 'scanning_offer' 
  | 'show_answer_qr' 
  | 'connecting' 
  | 'syncing' 
  | 'complete' 
  | 'error';

export function useSync() {
  const [wizardState, setWizardState] = useState<WizardState>('idle');
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState({ sent: 0, received: 0, peerName: '' });
  
  const { showToast } = useToast();

  const resetToIdle = useCallback(() => {
    closeConnection();
    setWizardState('idle');
    setQrData(null);
    setError(null);
    setSyncStats({ sent: 0, received: 0, peerName: '' });
  }, []);

  const handleError = useCallback((errMsg: string) => {
    console.error('[useSync] WebRTC Error:', errMsg);
    setError(errMsg);
    setWizardState('error');
    setQrData(null);
    showToast(errMsg, 'error');
  }, [showToast]);

  const handleStatusChange = useCallback((status: WebRTCStatus) => {
    console.log('[useSync] WebRTC Status:', status);
    
    switch (status) {
      case 'idle':
      case 'closed':
        // If we were already complete or error, stay there.
        setWizardState(prev => (prev === 'complete' || prev === 'error' ? prev : 'idle'));
        break;
      case 'generating_offer':
        setWizardState('generating_offer');
        break;
      case 'awaiting_answer':
        setWizardState('show_offer_qr');
        break;
      case 'generating_answer':
        setWizardState('generating_answer' as any); // loading state handled in view
        break;
      case 'connecting':
        setWizardState('connecting');
        break;
      case 'connected':
        setWizardState('syncing');
        break;
      case 'failed':
        handleError('WebRTC Connection Failed');
        break;
    }
  }, [handleError]);

  const handleDataReceived = useCallback(async (payload: SyncPayload) => {
    console.log('[useSync] Received SyncPayload:', payload);
    try {
      await bulkUpsertHazards(payload.hazards);
      await bulkUpsertMessages(payload.messages);
      
      const totalReceived = payload.hazards.length + payload.messages.length;
      
      await recordSyncSession({
        peerId: payload.senderId,
        peerName: payload.senderName,
        timestamp: payload.timestamp,
        itemsSent: syncStats.sent,
        itemsReceived: totalReceived
      });

      setSyncStats(prev => ({ ...prev, received: totalReceived, peerName: payload.senderName }));
      setWizardState('complete');
      closeConnection();
      
      showToast(`Successfully merged packet from ${payload.senderName}`, 'success');
    } catch (err) {
      handleError('Failed to save incoming data: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [handleError, showToast, syncStats.sent]);

  // When connection opens (state becomes 'syncing'), immediately send our data
  useEffect(() => {
    if (wizardState === 'syncing') {
      let timeoutId: number;

      const executeSync = async () => {
        try {
          const [identity, hazards, messages] = await Promise.all([
            getOrCreateIdentity(),
            getAllHazards(),
            getAllMessages()
          ]);

          const payload: SyncPayload = {
            type: 'SYNC_DATA',
            senderId: identity.id,
            senderName: identity.name,
            hazards,
            messages,
            timestamp: Date.now()
          };

          await sendSyncPayload(payload);
          
          const totalSent = hazards.length + messages.length;
          setSyncStats(prev => ({ ...prev, sent: totalSent }));
          
          showToast(`Transmitted ${totalSent} records. Waiting for peer...`, 'info');

          // Set a 30 second timeout for receiving data back
          timeoutId = window.setTimeout(() => {
            handleError('Sync timed out waiting for peer data');
          }, 30_000);

        } catch (err) {
          handleError('Failed to send data: ' + (err instanceof Error ? err.message : String(err)));
        }
      };

      executeSync();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [wizardState, handleError, showToast]);

  const callbacks = {
    onStatusChange: handleStatusChange,
    onDataReceived: handleDataReceived,
    onError: handleError
  };

  // --- Offerer Flow START ---
  const startAsOfferer = useCallback(async () => {
    resetToIdle();
    setWizardState('generating_offer');
    try {
      const offerJson = await initializeAsOfferer(callbacks);
      const compressed = compressSDP(offerJson);
      setQrData(compressed);
      setWizardState('show_offer_qr');
    } catch (err) {
      handleError('Failed to generate offer: ' + err);
    }
  }, [callbacks, handleError, resetToIdle]);

  // Offerer Step 3
  const scanAnswerAndConnect = useCallback(async (scannedAnswer: string) => {
    try {
      setWizardState('connecting');
      const answerJson = JSON.stringify(decompressSDP(scannedAnswer));
      await finalizeConnection(answerJson);
    } catch (err) {
      handleError('Invalid Answer QR. ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [handleError]);

  // --- Answerer Flow START ---
  const startAsAnswerer = useCallback(() => {
    resetToIdle();
    setWizardState('scanning_offer');
  }, [resetToIdle]);

  // Answerer Step 2
  const scanOfferAndCreateAnswer = useCallback(async (scannedOffer: string) => {
    try {
      setWizardState('generating_offer'); // loading spinner state
      const offerJson = JSON.stringify(decompressSDP(scannedOffer));
      const answerJson = await initializeAsAnswerer(offerJson, callbacks);
      
      const compressed = compressSDP(answerJson);
      setQrData(compressed);
      setWizardState('show_answer_qr');
    } catch (err) {
      handleError('Invalid Offer QR. ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [callbacks, handleError]);

  // Navigation helpers for wizard
  const proceedToScanAnswer = useCallback(() => {
    setWizardState('scanning_answer');
  }, []);

  return {
    wizardState,
    qrData,
    error,
    syncStats,
    startAsOfferer,
    startAsAnswerer,
    scanOfferAndCreateAnswer,
    proceedToScanAnswer,
    scanAnswerAndConnect,
    cancelSync: resetToIdle,
  };
}
