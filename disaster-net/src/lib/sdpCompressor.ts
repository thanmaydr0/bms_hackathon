// ---------------------------------------------------------------------------
// SDP Compressor — shrinks SDP payloads for QR-code transmission
// ---------------------------------------------------------------------------
// Standard SDP offers are 1500-2500 chars. QR codes become unreliable above
// ~900 chars. This module applies token substitution + Base64 to target < 800.
// ---------------------------------------------------------------------------

/** Ordered list of token replacements (longest/most specific first). */
const REPLACEMENTS: [string, string][] = [
  ['a=fingerprint:sha-256 ', 'F:'],
  ['a=extmap-allow-mixed',   'EX'],
  ['a=ice-options:trickle',  'IT'],
  ['a=candidate:',           'C:'],
  ['a=ice-ufrag:',           'U:'],
  ['a=ice-pwd:',             'P:'],
  ['a=setup:',               'S:'],
  ['a=mid:',                 'MI:'],
  ['a=sctp-port:',           'SP:'],
  ['a=max-message-size:',    'MM:'],
  ['a=group:BUNDLE',         'GB'],
  ['a=msid-semantic:',       'MS:'],
  ['m=application ',         'MA '],
  ['c=IN IP4 ',              'CI '],
  ['s=-',                    'SD'],
  ['t=0 0',                  'TZ'],
  ['\r\n',                   '|'],
];

/** Reverse map built once for decompression (applied in reverse order). */
const REVERSE_REPLACEMENTS: [string, string][] = REPLACEMENTS
  .map(([original, short]): [string, string] => [short, original])
  .reverse();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compress an SDP JSON string (from `JSON.stringify(localDescription)`)
 * into a short string suitable for QR-code encoding.
 *
 * Output format: `O:<base64>` (offer) or `A:<base64>` (answer).
 */
export function compressSDP(sdpJson: string): string {
  const parsed: RTCSessionDescriptionInit = JSON.parse(sdpJson);
  const typePrefix = parsed.type === 'offer' ? 'O:' : 'A:';
  let sdp = parsed.sdp ?? '';

  for (const [original, short] of REPLACEMENTS) {
    sdp = sdp.replaceAll(original, short);
  }

  return typePrefix + btoa(sdp);
}

/**
 * Decompress a string produced by `compressSDP` back into an
 * `RTCSessionDescriptionInit` object.
 */
export function decompressSDP(compressed: string): RTCSessionDescriptionInit {
  const typePrefix = compressed.slice(0, 2);
  const type: RTCSdpType = typePrefix === 'O:' ? 'offer' : 'answer';
  const encoded = compressed.slice(2);

  let sdp = atob(encoded);

  for (const [short, original] of REVERSE_REPLACEMENTS) {
    sdp = sdp.replaceAll(short, original);
  }

  return { type, sdp };
}

/**
 * Estimate how complex a QR code will be for a given string.
 * Useful for showing the user a visual indicator before scanning.
 */
export function estimateQRComplexity(
  str: string,
): 'low' | 'medium' | 'high' | 'too_large' {
  const len = str.length;
  if (len < 300) return 'low';
  if (len < 600) return 'medium';
  if (len < 900) return 'high';
  return 'too_large';
}
