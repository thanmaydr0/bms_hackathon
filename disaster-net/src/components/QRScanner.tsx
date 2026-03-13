import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
  hint?: string;
  isActive?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  onCancel, 
  hint = 'Align QR code within the frame',
  isActive = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission' | 'notfound' | 'other' | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  
  const requestRef = useRef<number>(undefined);
  
  const stopMediaTracks = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setErrorType(null);
    setIsReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
        scanFrame();
      }
    } catch (err) {
      console.error('[QRScanner] Camera access error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera access denied.');
        setErrorType('permission');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No camera found on this device.');
        setErrorType('notfound');
      } else {
        setError(err instanceof Error ? err.message : 'Unknown camera error occurred.');
        setErrorType('other');
      }
    }
  }, []);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          stopMediaTracks();
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          onScan(code.data);
          return;
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(scanFrame);
  }, [isActive, onScan, stopMediaTracks]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopMediaTracks();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      stopMediaTracks();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, startCamera, stopMediaTracks]);

  const handleManualSubmit = () => {
    const trimmed = manualText.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto gap-4">
      {/* Viewfinder Container */}
      <div className="relative w-full aspect-square bg-[var(--cp-base)] overflow-hidden rounded-md border border-[var(--cp-border)]">
        
        {/* Error Overlay */}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-black/80 z-20 backdrop-blur-sm gap-3">
            <div className="text-4xl">📷</div>
            <p className="font-mono text-sm text-[var(--cp-magenta)] font-bold">{error}</p>
            
            {/* Platform-specific instructions */}
            {errorType === 'permission' && (
              <div className="text-left w-full bg-[var(--cp-base)] border border-[var(--cp-border)] p-3 space-y-2 mt-1">
                <p className="font-mono text-[10px] text-[var(--cp-dim)]">
                  <span className="text-[var(--cp-cyan)] font-bold">Android:</span> Settings → Apps → Browser → Permissions → Camera
                </p>
                <p className="font-mono text-[10px] text-[var(--cp-dim)]">
                  <span className="text-[var(--cp-cyan)] font-bold">iPhone:</span> Settings → Safari → Camera → Allow
                </p>
              </div>
            )}
            
            {errorType === 'notfound' && (
              <p className="font-mono text-[10px] text-[var(--cp-dim)]">
                Try the manual text exchange option below instead.
              </p>
            )}
            
            <div className="flex gap-2 w-full mt-2">
              <button 
                onClick={startCamera}
                className="flex-1 px-3 py-2 font-cyber text-[10px] tracking-widest text-white bg-[var(--cp-cyan)]/20 border border-[var(--cp-cyan)] hover:bg-[var(--cp-cyan)] hover:text-black transition-colors"
              >
                RETRY
              </button>
              <button 
                onClick={() => setShowManualInput(true)}
                className="flex-1 px-3 py-2 font-cyber text-[10px] tracking-widest text-[var(--cp-yellow)] bg-[var(--cp-yellow)]/10 border border-[var(--cp-yellow)] hover:bg-[var(--cp-yellow)] hover:text-black transition-colors"
              >
                📋 USE TEXT
              </button>
            </div>
          </div>
        ) : null}

        {/* Video feed */}
        <video 
          ref={videoRef}
          className={`object-cover w-full h-full transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          autoPlay 
          muted 
        />
        
        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-3/4 aspect-square shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
            <div className="absolute left-0 right-0 h-0.5 bg-[var(--cp-magenta)] opacity-60 animate-[scanline_2s_linear_infinite]" />
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--cp-cyan)] animate-[neon-pulse_2s_infinite]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--cp-cyan)] animate-[neon-pulse_2s_infinite]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--cp-cyan)] animate-[neon-pulse_2s_infinite]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--cp-cyan)] animate-[neon-pulse_2s_infinite]" />
          </div>
        </div>
        
        {/* Loading State */}
        {!isReady && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--cp-cyan)] border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-[var(--cp-cyan)] animate-pulse">INIT_OPTIC_SENSOR...</span>
          </div>
        )}
      </div>

      {/* Hint & Cancel Row */}
      <div className="w-full flex justify-between items-center">
        <p className="font-mono text-xs text-[var(--cp-dim)]">{hint}</p>
        <button 
          onClick={onCancel}
          className="text-[10px] font-cyber tracking-widest text-[var(--cp-magenta)] hover:text-white transition-colors"
        >
          [CANCEL]
        </button>
      </div>

      {/* Manual text input fallback */}
      {(showManualInput || errorType === 'notfound') && (
        <div className="w-full border border-[var(--cp-yellow)]/50 bg-[var(--cp-base)] p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <span className="font-cyber text-[10px] tracking-widest text-[var(--cp-yellow)] font-bold">MANUAL TEXT EXCHANGE</span>
          </div>
          <p className="font-mono text-[10px] text-[var(--cp-dim)]">
            Ask your partner to tap "Share as text" on their screen, then paste that text here:
          </p>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Paste the SDP data string here..."
            rows={4}
            className="w-full bg-[var(--cp-void)] border border-[var(--cp-border)] text-[var(--cp-text)] p-2 resize-none outline-none font-mono text-xs focus:border-[var(--cp-cyan)] transition-colors placeholder:text-[var(--cp-dim)]"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualText.trim()}
            className="w-full py-2 font-cyber text-[10px] font-bold tracking-widest text-[var(--cp-void)] bg-[var(--cp-yellow)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cp-cyan)] transition-colors"
          >
            SUBMIT MANUALLY
          </button>
        </div>
      )}

      {/* Toggle for manual input when camera works but user prefers text */}
      {!showManualInput && !errorType && (
        <button 
          onClick={() => setShowManualInput(true)}
          className="font-mono text-[10px] text-[var(--cp-dim)] hover:text-[var(--cp-yellow)] transition-colors underline underline-offset-2"
        >
          📋 Can't scan? Enter text manually
        </button>
      )}

      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
