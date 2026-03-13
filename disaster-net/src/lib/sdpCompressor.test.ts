import { describe, it, expect } from 'vitest';
import { compressSDP, decompressSDP, estimateQRComplexity } from './sdpCompressor';

// ---------------------------------------------------------------------------
// Realistic LAN-only SDP offer (no STUN, single candidate)
// ---------------------------------------------------------------------------
const SAMPLE_SDP_OFFER: RTCSessionDescriptionInit = {
  type: 'offer',
  sdp: [
    'v=0',
    'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=extmap-allow-mixed',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    'a=candidate:1 1 UDP 2122252543 192.168.1.42 54321 typ host',
    'a=ice-ufrag:abcd',
    'a=ice-pwd:efghijklmnopqrstuvwx',
    'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
    'a=setup:actpass',
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n'),
};

const SAMPLE_SDP_ANSWER: RTCSessionDescriptionInit = {
  type: 'answer',
  sdp: [
    'v=0',
    'o=- 7811731400430051337 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=extmap-allow-mixed',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    'a=candidate:1 1 UDP 2122252543 192.168.1.99 54322 typ host',
    'a=ice-ufrag:wxyz',
    'a=ice-pwd:1234567890abcdefghij',
    'a=fingerprint:sha-256 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00',
    'a=setup:active',
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sdpCompressor', () => {
  describe('compressSDP + decompressSDP round-trip', () => {
    it('should round-trip an offer correctly', () => {
      const json = JSON.stringify(SAMPLE_SDP_OFFER);
      const compressed = compressSDP(json);
      const decompressed = decompressSDP(compressed);

      expect(decompressed.type).toBe('offer');
      expect(decompressed.sdp).toBe(SAMPLE_SDP_OFFER.sdp);
    });

    it('should round-trip an answer correctly', () => {
      const json = JSON.stringify(SAMPLE_SDP_ANSWER);
      const compressed = compressSDP(json);
      const decompressed = decompressSDP(compressed);

      expect(decompressed.type).toBe('answer');
      expect(decompressed.sdp).toBe(SAMPLE_SDP_ANSWER.sdp);
    });

    it('should prefix offer with O: and answer with A:', () => {
      const offerCompressed = compressSDP(JSON.stringify(SAMPLE_SDP_OFFER));
      const answerCompressed = compressSDP(JSON.stringify(SAMPLE_SDP_ANSWER));

      expect(offerCompressed.startsWith('O:')).toBe(true);
      expect(answerCompressed.startsWith('A:')).toBe(true);
    });
  });

  describe('compression effectiveness', () => {
    it('should produce output shorter than the raw SDP JSON', () => {
      const json = JSON.stringify(SAMPLE_SDP_OFFER);
      const compressed = compressSDP(json);

      console.log(`Original: ${json.length} chars → Compressed: ${compressed.length} chars`);
      expect(compressed.length).toBeLessThan(json.length);
    });
  });

  describe('estimateQRComplexity', () => {
    it('returns "low" for strings under 300 chars', () => {
      expect(estimateQRComplexity('x'.repeat(299))).toBe('low');
    });

    it('returns "medium" for strings under 600 chars', () => {
      expect(estimateQRComplexity('x'.repeat(500))).toBe('medium');
    });

    it('returns "high" for strings under 900 chars', () => {
      expect(estimateQRComplexity('x'.repeat(800))).toBe('high');
    });

    it('returns "too_large" for strings 900 chars or above', () => {
      expect(estimateQRComplexity('x'.repeat(900))).toBe('too_large');
    });

    it('gives a reasonable estimate for a compressed LAN offer', () => {
      const compressed = compressSDP(JSON.stringify(SAMPLE_SDP_OFFER));
      const complexity = estimateQRComplexity(compressed);

      console.log(`Compressed length: ${compressed.length}, complexity: ${complexity}`);
      expect(['low', 'medium', 'high']).toContain(complexity);
    });
  });
});
