/**
 * PeerConnection wraps WebRTC RTCPeerConnection for QR-code based signaling.
 * Because we have no internet, we cannot use a WebSocket signaling server.
 * Instead, Alice creates an offer -> shows QR.
 * Bob scans QR -> creates answer -> shows QR.
 * Alice scans Bob's QR -> connection established.
 */

export class PeerConnection {
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  
  onData?: (data: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;

  constructor() {
    // No STUN/TURN servers because we are offline/LAN only
    this.connection = new RTCPeerConnection({
      iceServers: [] 
    });

    this.connection.oniceconnectionstatechange = () => {
      console.log('ICE State:', this.connection.iceConnectionState);
      if (this.connection.iceConnectionState === 'disconnected' ||
          this.connection.iceConnectionState === 'failed') {
        this.onDisconnect?.();
      }
    };

    // Listen for data channels from the other peer
    this.connection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  // ALICE: Create offer
  async createOffer(): Promise<string> {
    this.dataChannel = this.connection.createDataChannel('disaster-sync', {
      negotiated: false
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    
    // Wait for ICE gathering to complete so we have a standalone token
    await this.waitForIceGathering();
    
    // Compress offer to string for QR
    return btoa(JSON.stringify(this.connection.localDescription));
  }

  // BOB: Receive offer, create answer
  async receiveOfferAndCreateAnswer(offerBase64: string): Promise<string> {
    const offer = JSON.parse(atob(offerBase64));
    await this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    
    await this.waitForIceGathering();

    return btoa(JSON.stringify(this.connection.localDescription));
  }

  // ALICE: Receive answer
  async receiveAnswer(answerBase64: string): Promise<void> {
    const answer = JSON.parse(atob(answerBase64));
    await this.connection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  sendData(data: unknown) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.error('Data channel not open');
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log('Data channel open');
      this.onConnect?.();
    };
    this.dataChannel.onmessage = (event) => {
      if (this.onData) {
        try {
          this.onData(JSON.parse(event.data));
        } catch (e) {
          console.error("Failed to parse incoming peer data", e);
        }
      }
    };
    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.onDisconnect?.();
    };
  }

  private async waitForIceGathering(): Promise<void> {
    if (this.connection.iceGatheringState === 'complete') return;
    
    return new Promise((resolve) => {
      const checkState = () => {
        if (this.connection.iceGatheringState === 'complete') {
          this.connection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      this.connection.addEventListener('icegatheringstatechange', checkState);
      
      // Fallback timeout since offline LAN sometimes doesn't fire 'complete' quickly
      setTimeout(() => {
        this.connection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 2000);
    });
  }
}
