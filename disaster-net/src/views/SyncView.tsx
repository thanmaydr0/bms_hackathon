import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { useSync } from '../hooks/useSync';
import { QRScanner } from '../components/QRScanner';

export default function SyncView() {
  const {
    connectionState, qrData, error: syncError,
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

  const reset = () => { disconnect(); setMode('idle'); };

  const renderContent = () => {
    // If there's an error, show it overlaid or inside the flow, then let user abort
    if (syncError) {
      return (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-center mt-8">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-[var(--cp-magenta)] font-cyber font-bold text-lg">CONNECTION FAILED</h2>
          <p className="text-[var(--cp-dim)] text-sm max-w-xs">{syncError}</p>
          <button 
            onClick={reset}
            className="mt-6 w-full py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-magenta)] border-2 border-[var(--cp-magenta)] hover:bg-[var(--cp-magenta)] hover:text-white transition-colors active:translate-y-[2px]"
          >
            DISMISS & RETRY
          </button>
        </motion.div>
      );
    }

    switch (connectionState) {
      case 'disconnected':
        if (mode === 'idle') {
          return (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Info cards */}
              {[
                { icon: '🔒', label: 'CRYPT_AUTH', desc: 'Secure WebRTC token exchange' },
                { icon: '📡', label: 'DARK_NET', desc: 'Local mesh routing (0 WAN)' },
                { icon: '⚡', label: 'HYPERLINK', desc: 'P2P instant packet transfer' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-cp-panel border-l-2 border-cp-cyan group hover:bg-cp-base transition-colors"
                >
                  <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                  <div>
                    <p className="font-cyber font-bold text-[10px] tracking-[0.2em] text-cp-cyan drop-shadow-[0_0_2px_rgba(0,240,255,0.8)]">{item.label}</p>
                    <p className="font-mono text-xs text-cp-dim">{item.desc}</p>
                  </div>
                </motion.div>
              ))}

              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => { setMode('host'); startAsOffer(); }}
                  className="w-full py-4 font-cyber font-black text-xs tracking-[0.3em] text-[var(--cp-void)] bg-[var(--cp-cyan)] clip-angled shadow-hard-cyan border-2 border-transparent hover:bg-[var(--cp-void)] hover:text-[var(--cp-cyan)] hover:border-[var(--cp-cyan)] transition-colors active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
                >
                  ▶ HOST_SESSION
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="w-full py-3.5 font-cyber font-bold text-xs tracking-[0.2em] text-[var(--cp-text)] border-2 border-[var(--cp-border)] clip-angled-br hover:border-[var(--cp-magenta)] hover:text-[var(--cp-magenta)] transition-colors active:translate-y-[2px]"
                >
                  ↗ JOIN_LINK (SCAN)
                </button>
              </div>
            </motion.div>
          );
        }
        if (mode === 'join') {
          return (
            <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-between mb-2">
                <p className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-magenta)] drop-shadow-[0_0_2px_rgba(255,0,60,0.8)] animate-pulse">
                  AWAITING_HOST_OPTIC
                </p>
                <span className="w-2 h-2 bg-[var(--cp-magenta)] animate-ping" />
              </div>
              <div className="border-2 border-[var(--cp-magenta)] p-2 w-full relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--cp-void)]" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--cp-void)]" />
                <QRScanner isActive={true} onScan={handleScan} />
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,0,60,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
              </div>
              <p className="text-center text-xs text-[var(--cp-dim)] max-w-xs mt-2">
                Scan the host's QR code to receive their connection offer.
              </p>
              <button 
                onClick={reset} 
                className="w-full mt-2 py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border-2 border-[var(--cp-border)] hover:text-[var(--cp-text)] hover:border-[var(--cp-text)] transition-colors active:translate-y-[2px]"
              >
                ABORT_SEQUENCE
              </button>
            </motion.div>
          );
        }
        break;

      case 'creating-offer':
      case 'creating-answer':
        return (
          <div key="loading" className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative w-20 h-20">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="absolute inset-0 border-4 border-cp-cyan/20 border-t-cp-cyan clip-angled" />
              <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute inset-3 border-4 border-cp-magenta/20 border-b-cp-magenta clip-angled-br" />
              <div className="absolute inset-0 flex items-center justify-center font-cyber text-[10px] text-[var(--cp-yellow)] font-bold animate-pulse">
                GEN
              </div>
            </div>
            <p className="font-cyber font-bold text-[10px] text-cp-text tracking-[0.4em]">COMPUTING_HASH...</p>
          </div>
        );

      case 'waiting-for-answer':
        if (mode === 'host' && qrData) {
          return (
            <div key="host-wait" className="flex flex-col items-center gap-6">
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-cyan)] animate-pulse">TX_OPTIC</p>
                  <span className="font-mono text-[9px] text-[var(--cp-dim)]">STEP_01</span>
                </div>
                {/* Use the new QRCodeDisplay */}
                <QRCodeDisplay
                  data={qrData}
                  title="HOST OFFER"
                  subtitle="Have the joining device scan this code."
                  complexity={qrData.length < 600 ? 'medium' : 'high'}
                />
              </div>

              <div className="w-full mt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-magenta)]">RX_OPTIC</p>
                  <span className="font-mono text-[9px] text-[var(--cp-dim)]">STEP_02</span>
                </div>
                <div className="border-2 border-[var(--cp-magenta)] p-2 relative">
                  <QRScanner isActive={true} onScan={handleScan} />
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,0,60,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
                </div>
              </div>
              
              <button 
                onClick={reset} 
                className="w-full mt-2 py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border-2 border-[var(--cp-border)] hover:text-[var(--cp-text)] hover:border-[var(--cp-text)] transition-colors active:translate-y-[2px]"
              >
                ABORT_SEQUENCE
              </button>
            </div>
          );
        }
        break;

      case 'connected':
        return (
          <motion.div key="connected" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex flex-col items-center justify-center py-16 gap-6 text-center border-2 border-[var(--cp-green)] bg-[var(--cp-green)]/5 p-6 shadow-neon-green"
          >
            <div className="w-16 h-16 bg-[var(--cp-green)] text-[var(--cp-void)] flex items-center justify-center font-black text-2xl clip-angled shadow-neon-green">
              OK
            </div>
            <div>
              <p className="font-cyber font-black text-lg tracking-[0.3em] text-[var(--cp-green)] mb-1 drop-shadow-md">LINK_ESTABLISHED</p>
              <p className="font-mono text-[var(--cp-text)] text-xs border-l-2 border-[var(--cp-green)] pl-2 text-left">
                [SYS] Handshake complete.<br/>
                [SYS] WebRTC Data Channel open.<br/>
                [SYS] Local mesh synchronized.<br/>
              </p>
            </div>
            <button 
              onClick={reset}
              className="mt-4 w-full py-4 font-cyber font-black text-sm tracking-widest text-[var(--cp-void)] bg-[var(--cp-green)] border-2 border-transparent hover:bg-[var(--cp-void)] hover:text-[var(--cp-green)] hover:border-[var(--cp-green)] transition-colors clip-angled active:translate-y-[2px]"
            >
              TERMINATE_LINK
            </button>
          </motion.div>
        );
    }

    if (qrData && mode === 'join') {
      return (
        <div key="join-qr" className="flex flex-col items-center gap-6 py-8">
          <div className="w-full flex justify-between items-center mb-2">
            <p className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-cyan)]">TX_OPTIC</p>
            <span className="w-2 h-2 bg-[var(--cp-cyan)] animate-pulse" />
          </div>
          
          <QRCodeDisplay
            data={qrData}
            title="JOIN ANSWER"
            subtitle="Show this code to the host device to complete the link."
            complexity={qrData.length < 600 ? 'medium' : 'high'}
          />

          <div className="w-full border-t border-[var(--cp-border)] border-dashed pt-4 text-center mt-4">
            <p className="font-cyber text-[12px] font-bold text-[var(--cp-magenta)] tracking-[0.2em] animate-pulse">
              WAITING_FOR_HOST_ACK...
            </p>
          </div>
          <button 
            onClick={reset} 
            className="w-full mt-2 py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border-2 border-[var(--cp-border)] hover:text-[var(--cp-text)] hover:border-[var(--cp-text)] transition-colors active:translate-y-[2px]"
          >
            ABORT_SEQUENCE
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-[var(--cp-void)]">
      {/* Header */}
      <div className="p-5 border-b-2 border-cp-border bg-cp-base shrink-0 relative">
        {/* Background circuit lines */}
        <div className="absolute inset-0 bg-cyber-dots bg-dots-sm opacity-20 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[var(--cp-cyan)] animate-pulse" />
            <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-text)]">P2P_PROTOCOL</span>
          </div>
          <h1 className="font-cyber font-black text-2xl text-[var(--cp-cyan)] drop-shadow-md">LOCAL MESH LINK</h1>
          <div className="mt-2 h-1 w-12 bg-[var(--cp-magenta)]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 relative">
        <div className="absolute inset-0 bg-cyber-grid bg-grid-sm opacity-10 pointer-events-none" />
        <AnimatePresence mode="wait">
          <div className="relative z-10 max-w-sm mx-auto">
            {renderContent()}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
