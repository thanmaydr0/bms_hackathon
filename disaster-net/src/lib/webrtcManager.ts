import type { HazardReport, SOSMessage } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebRTCStatus =
  | 'idle'
  | 'generating_offer'
  | 'awaiting_answer'
  | 'generating_answer'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'closed';

export interface SyncPayload {
  type: 'SYNC_DATA';
  senderId: string;
  senderName: string;
  hazards: HazardReport[];
  messages: SOSMessage[];
  timestamp: number;
}

export interface WebRTCCallbacks {
  onStatusChange: (status: WebRTCStatus) => void;
  onDataReceived: (payload: SyncPayload) => void;
  onError: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Module-level singleton state (NOT exported directly)
// ---------------------------------------------------------------------------

const ICE_GATHER_TIMEOUT_MS = 10_000;

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentStatus: WebRTCStatus = 'idle';
let activeCallbacks: WebRTCCallbacks | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function setStatus(status: WebRTCStatus): void {
  currentStatus = status;
  activeCallbacks?.onStatusChange(status);
}

function isSyncPayload(data: unknown): data is SyncPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'SYNC_DATA'
  );
}

function attachChannelHandlers(channel: RTCDataChannel): void {
  channel.onopen = () => setStatus('connected');

  channel.onmessage = (event: MessageEvent) => {
    try {
      const parsed: unknown = JSON.parse(event.data as string);
      if (isSyncPayload(parsed)) {
        activeCallbacks?.onDataReceived(parsed);
      } else {
        console.warn('[webrtcManager] Received non-SYNC_DATA message, ignoring.');
      }
    } catch (err) {
      console.error('[webrtcManager] Failed to parse incoming message', err);
      activeCallbacks?.onError('Failed to parse incoming data');
    }
  };

  channel.onerror = (event) => {
    const msg =
      event instanceof RTCErrorEvent
        ? event.error?.message ?? 'Data channel error'
        : 'Data channel error';
    activeCallbacks?.onError(msg);
  };

  channel.onclose = () => setStatus('closed');
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        clearTimeout(timer);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', onStateChange);

    const timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange);
      resolve(); // resolve anyway so QR code can still be generated
    }, ICE_GATHER_TIMEOUT_MS);
  });
}

function createPeerConnection(): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: [] });

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    if (state === 'connected' || state === 'completed') {
      setStatus('connected');
    } else if (state === 'failed') {
      setStatus('failed');
      activeCallbacks?.onError('ICE connection failed');
    } else if (state === 'disconnected') {
      setStatus('closed');
    }
  };

  return pc;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Called by the **offerer** (Alice).
 * Creates a peer connection + data channel, generates an SDP offer with
 * gathered ICE candidates, and returns it as a JSON string (for QR encoding).
 */
export async function initializeAsOfferer(
  callbacks: WebRTCCallbacks,
): Promise<string> {
  try {
    closeConnection(); // clean up any previous session
    activeCallbacks = callbacks;

    const pc = createPeerConnection();
    peerConnection = pc;

    // Create the data channel (offerer owns it)
    const channel = pc.createDataChannel('disaster-sync', { ordered: true });
    dataChannel = channel;
    attachChannelHandlers(channel);

    setStatus('generating_offer');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait until ICE candidates are gathered
    await waitForIceGathering(pc);

    setStatus('awaiting_answer');

    return JSON.stringify(pc.localDescription);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    callbacks.onError(message);
    closeConnection();
    throw err;
  }
}

/**
 * Called by the **answerer** (Bob).
 * Receives the offerer's SDP offer, creates an answer, and returns it as a
 * JSON string (for QR encoding).
 */
export async function initializeAsAnswerer(
  offerString: string,
  callbacks: WebRTCCallbacks,
): Promise<string> {
  try {
    closeConnection();
    activeCallbacks = callbacks;

    const pc = createPeerConnection();
    peerConnection = pc;

    // The answerer receives the data channel from the offerer
    pc.ondatachannel = (event: RTCDataChannelEvent) => {
      dataChannel = event.channel;
      attachChannelHandlers(event.channel);
    };

    setStatus('generating_answer');

    const parsedOffer: RTCSessionDescriptionInit = JSON.parse(offerString);
    await pc.setRemoteDescription(parsedOffer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await waitForIceGathering(pc);

    setStatus('connecting');

    return JSON.stringify(pc.localDescription);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    callbacks.onError(message);
    closeConnection();
    throw err;
  }
}

/**
 * Called by the **offerer** after scanning the answerer's QR code.
 * Completes the handshake by setting the remote description (answer).
 */
export async function finalizeConnection(answerString: string): Promise<void> {
  try {
    if (!peerConnection) {
      throw new Error('No peer connection exists. Call initializeAsOfferer first.');
    }

    const parsedAnswer: RTCSessionDescriptionInit = JSON.parse(answerString);
    await peerConnection.setRemoteDescription(parsedAnswer);

    setStatus('connecting');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    activeCallbacks?.onError(message);
    closeConnection();
    throw err;
  }
}

/**
 * Sends a `SyncPayload` to the connected peer.
 * Throws if the data channel is not open.
 */
export async function sendSyncPayload(payload: SyncPayload): Promise<void> {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    throw new Error('Data channel is not open');
  }
  dataChannel.send(JSON.stringify(payload));
}

/**
 * Tears down the connection and resets all module-level state.
 */
export function closeConnection(): void {
  try {
    dataChannel?.close();
  } catch {
    /* already closed */
  }
  try {
    peerConnection?.close();
  } catch {
    /* already closed */
  }

  dataChannel = null;
  peerConnection = null;
  activeCallbacks = null;
  currentStatus = 'idle';
}

/**
 * Returns the current connection status.
 */
export function getCurrentStatus(): WebRTCStatus {
  return currentStatus;
}
