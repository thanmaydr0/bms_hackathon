import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useSync } from '../hooks/useSync';
import { QRScanner } from './QRScanner';

export const SyncDialog: React.FC = () => {
  const {
    connectionState, qrData,
    startAsOffer, scanOfferAndCreateAnswer,
    scanAnswerAndConnect, disconnect,
  } = useSync();

  const [mode, setMode] = useState<'idle' | 'host' | 'join'>('idle');

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
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <p className="font-ops text-sm text-dn-muted text-center mb-2">
                Exchange data with a nearby device over a direct P2P connection.
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { setMode('host'); startAsOffer(); }}
                className="w-full py-4 font-ops font-bold text-sm tracking-[0.15em] text-white bg-dn-blue rounded-sm transition-all hover:shadow-glow-blue"
                style={{ boxShadow: '0 4px 16px rgba(29,111,165,0.4)' }}
              >
                ▶ HOST SYNC SESSION
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setMode('join')}
                className="w-full py-3.5 font-ops font-semibold text-sm tracking-[0.1em] text-dn-text border border-dn-border-2 rounded-sm hover:border-dn-gold hover:text-dn-gold transition-all"
              >
                ↗ JOIN SESSION (SCAN)
              </motion.button>
            </motion.div>
          );
        }
        if (mode === 'join') {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="font-mono text-[10px] tracking-[0.2em] text-dn-muted">SCAN HOST QR CODE</p>
              <div className="border border-dn-gold/30 p-2 rounded-sm">
                <QRScanner isActive={true} onScan={handleScan} />
              </div>
              <button
                onClick={() => setMode('idle')}
                className="font-mono text-[10px] text-dn-dim hover:text-dn-muted tracking-wider transition-colors mt-2"
              >
                ← CANCEL
              </button>
            </motion.div>
          );
        }
        break;

      case 'creating-offer':
      case 'creating-answer':
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative w-16 h-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute inset-0 border-2 border-dn-gold/20 border-t-dn-gold rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="absolute inset-2 border border-dn-blue/30 border-b-dn-blue rounded-full"
              />
            </div>
            <p className="font-mono text-[10px] text-dn-muted tracking-[0.2em]">GENERATING TOKEN...</p>
          </div>
        );

      case 'waiting-for-answer':
        if (mode === 'host') {
          return (
            <div className="flex flex-col items-center gap-5">
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] text-dn-muted text-center mb-3">STEP 1 — SHOW TO OTHER DEVICE</p>
                <div className="p-3 bg-white rounded-sm inline-block shadow-panel">
                  {qrData && <QRCodeSVG value={qrData} size={220} />}
                </div>
              </div>
              <div className="w-full">
                <p className="font-mono text-[9px] tracking-[0.2em] text-dn-muted text-center mb-3">STEP 2 — SCAN THEIR RESPONSE</p>
                <div className="border border-dn-gold/20 p-2 rounded-sm">
                  <QRScanner isActive={true} onScan={handleScan} />
                </div>
              </div>
            </div>
          );
        }
        break;

      case 'connected':
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(5,150,105,0.5)', '0 0 0 20px rgba(5,150,105,0)', '0 0 0 0 rgba(5,150,105,0)'] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-16 h-16 bg-dn-surface-2 border border-dn-green rounded-sm flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-dn-green-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <div className="text-center">
              <p className="font-mono text-[9px] tracking-[0.3em] text-dn-green-2 mb-1">SYNC COMPLETE</p>
              <p className="font-ops text-dn-muted text-sm">Data synchronized successfully.</p>
            </div>
            <button
              onClick={() => { disconnect(); setMode('idle'); }}
              className="mt-2 w-full py-3 font-ops font-semibold text-sm text-dn-muted border border-dn-border rounded-sm hover:border-dn-border-2 hover:text-dn-text transition-all"
            >
              Close
            </button>
          </motion.div>
        );
    }

    if (qrData && mode === 'join') {
      return (
        <div className="flex flex-col items-center gap-5 py-4">
          <p className="font-mono text-[9px] tracking-[0.2em] text-dn-muted">SHOW TO HOST DEVICE</p>
          <div className="p-3 bg-white rounded-sm shadow-panel">
            <QRCodeSVG value={qrData} size={220} />
          </div>
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="font-mono text-[10px] text-dn-amber tracking-[0.2em]"
          >
            AWAITING HOST SCAN...
          </motion.p>
        </div>
      );
    }

    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-dn-surface border border-dn-border w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] rounded-sm"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.1)' }}
        >
          {/* Gold top accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-dn-gold/60 to-transparent" />

          <div className="px-5 py-4 border-b border-dn-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-dn-blue-2 animate-pulse" />
                <span className="font-mono text-[9px] tracking-[0.25em] text-dn-muted">MESH NETWORK</span>
              </div>
              <h2 className="font-ops font-bold text-lg text-dn-text">Peer Sync</h2>
            </div>
            {connectionState !== 'connected' && (
              <button
                onClick={() => { disconnect(); setMode('idle'); }}
                className="w-8 h-8 flex items-center justify-center border border-dn-border text-dn-muted hover:text-dn-text hover:border-dn-border-2 transition-colors rounded-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="p-5 overflow-y-auto">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
