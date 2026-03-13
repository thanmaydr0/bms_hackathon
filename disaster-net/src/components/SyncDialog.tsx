import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSync } from '../hooks/useSync';
import { QRScanner } from './QRScanner';

export const SyncDialog: React.FC = () => {
  const {
    connectionState,
    qrData,
    startAsOffer,
    scanOfferAndCreateAnswer,
    scanAnswerAndConnect,
    disconnect
  } = useSync();

  const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');

  // Helper to handle the incoming scanned QR data
  const handleScan = (data: string) => {
    if (mode === 'join' && connectionState === 'disconnected') {
      scanOfferAndCreateAnswer(data);
    } else if (mode === 'host' && connectionState === 'waiting-for-answer') {
      scanAnswerAndConnect(data);
    }
  };

  const renderContent = () => {
    switch (connectionState) {
      case 'disconnected':
        if (mode === 'idle') {
          return (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { setMode('host'); startAsOffer(); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-colors"
              >
                Start Sync (Host)
              </button>
              <button 
                onClick={() => setMode('join')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl shadow-sm transition-colors"
              >
                Join Sync (Scan)
              </button>
            </div>
          );
        }
        if (mode === 'join') {
          return (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-slate-600">Scan the host's QR code</p>
              <QRScanner isActive={true} onScan={handleScan} />
              <button onClick={() => setMode('idle')} className="text-slate-500 underline mt-4">Cancel</button>
            </div>
          );
        }
        break;

      case 'creating-offer':
      case 'creating-answer':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Generating cryptographic token...</p>
          </div>
        );

      case 'waiting-for-answer':
        // Host is waiting for joiner
        if (mode === 'host') {
          return (
            <div className="flex flex-col items-center gap-6">
              <h3 className="font-semibold text-lg">1. Show this to the other device</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm inline-block">
                {qrData && <QRCodeSVG value={qrData} size={256} />}
              </div>
              <h3 className="font-semibold text-lg mt-4">2. Scan their response</h3>
              <QRScanner isActive={true} onScan={handleScan} />
            </div>
          );
        }
        break;

      case 'connected':
        return (
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Sync Complete</h2>
            <p className="text-slate-600 text-center">Data has been successfully synchronized between devices.</p>
            <button 
              onClick={() => { disconnect(); setMode('idle'); }}
              className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        );
    }

    // Joiner showing answer back to host (after switch, connectionState is narrowed to non-connected states)
    if (qrData && mode === 'join') {
      return (
        <div className="flex flex-col items-center gap-6 p-4">
          <h3 className="font-semibold text-lg text-center">Show this QR to the Host</h3>
          <div className="p-4 bg-white rounded-xl shadow-sm inline-block">
            <QRCodeSVG value={qrData} size={256} />
          </div>
          <p className="text-sm text-amber-600 animate-pulse text-center">
            Waiting for Host to scan...
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Peer-to-Peer Sync</h2>
          {connectionState !== 'connected' && (
             <button 
               onClick={() => { disconnect(); setMode('idle'); }}
               className="text-slate-400 hover:text-slate-600 p-2 -mr-2"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          )}
        </div>
        
        <div className="p-6 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
