import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) return;

    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error(err);
      }
    };

    const tick = () => {
      if (!videoRef.current || !canvasRef.current || !isActive) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });
          
          if (code) {
            onScan(code.data);
            return; // Stop scanning once we found one
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, onScan]);

  if (!isActive) return null;

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-lg aspect-square bg-slate-100">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-red-600 bg-red-50">
          {error}
        </div>
      )}
      <video 
        ref={videoRef} 
        className="object-cover w-full h-full"
        playsInline 
        autoPlay 
        muted 
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 border-4 border-black/10 pointer-events-none rounded-lg" />
      {/* Target overlay */}
      <div className="absolute inset-x-8 inset-y-8 border-2 border-black/40 border-dashed rounded pointer-events-none" />
    </div>
  );
};
