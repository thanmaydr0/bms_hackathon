import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { useSync } from '../hooks/useSync';
import { QRScanner } from '../components/QRScanner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import type { SyncSession } from '../types';

export default function SyncView() {
  const {
    wizardState, qrData, error, syncStats,
    startAsOfferer, startAsAnswerer,
    scanOfferAndCreateAnswer, proceedToScanAnswer, scanAnswerAndConnect,
    cancelSync,
  } = useSync();

  const [showTextFallback, setShowTextFallback] = useState(false);

  // Load latest sync session history from DB
  const recentSyncs = useLiveQuery(
    () => db.syncSessions.orderBy('timestamp').reverse().limit(3).toArray(),
    []
  );

  const renderContent = () => {
    switch (wizardState) {
      // -------------------------------------------------------------
      // IDLE
      // -------------------------------------------------------------
      case 'idle':
        return (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center px-4">
              <span className="text-3xl mb-2">📡</span>
              <p className="font-mono text-xs text-[var(--cp-dim)]">
                Stand next to another DisasterNet user. One person taps 'Share', the other taps 'Receive'. You'll scan each other's screens to connect.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={startAsOfferer}
                className="w-full py-5 font-cyber font-black text-sm tracking-[0.3em] text-[var(--cp-void)] bg-[var(--cp-cyan)] clip-angled shadow-hard-cyan border-2 border-transparent hover:bg-[var(--cp-void)] hover:text-[var(--cp-cyan)] hover:border-[var(--cp-cyan)] transition-colors active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
              >
                ▶ SHARE MY DATA
              </button>
              <button
                onClick={startAsAnswerer}
                className="w-full py-4 font-cyber font-bold text-sm tracking-[0.2em] text-[var(--cp-text)] border-2 border-[var(--cp-border)] clip-angled-br hover:border-[var(--cp-magenta)] hover:text-[var(--cp-magenta)] transition-colors active:translate-y-[2px]"
              >
                📥 RECEIVE DATA
              </button>
            </div>

            <div className="mt-8 border-t border-[var(--cp-border)] border-dashed pt-4">
              <h3 className="font-cyber font-bold text-[10px] tracking-widest text-[var(--cp-dim)] mb-3">RECENT SYNCS</h3>
              {(!recentSyncs || recentSyncs.length === 0) ? (
                <p className="font-mono text-xs text-[var(--cp-dim)] text-center italic">No syncs yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentSyncs.map((s: SyncSession) => (
                    <div key={s.id} className="flex justify-between items-center bg-[var(--cp-base)] border border-[var(--cp-border)] p-3 rounded text-xs px-4">
                      <span className="font-mono text-[var(--cp-cyan)]">{s.peerName}</span>
                      <span className="font-mono text-[var(--cp-dim)]">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );

      // -------------------------------------------------------------
      // LOADING STATES
      // -------------------------------------------------------------
      case 'generating_offer':
        return (
          <div key="generating_offer" className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-12 h-12 border-4 border-[var(--cp-cyan)]/20 border-t-[var(--cp-cyan)] rounded-full animate-spin shadow-neon-cyan" />
            <p className="font-cyber font-bold text-[10px] tracking-[0.4em] text-[var(--cp-cyan)] animate-pulse">
              GENERATING SECURE KEY...
            </p>
          </div>
        );

      case 'connecting':
      case 'syncing':
        return (
          <div key="connecting" className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative w-24 h-24">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} className="absolute inset-0 border-4 border-dashed border-[var(--cp-magenta)] rounded-full" />
              <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="absolute inset-3 border-4 border-[var(--cp-cyan)] border-l-transparent rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🔗</div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="font-cyber font-bold text-xs tracking-widest text-[var(--cp-cyan)]">
                {wizardState === 'connecting' ? 'ESTABLISHING SECURE CHANNEL...' : 'EXCHANGING DATA...'}
              </p>
              {wizardState === 'syncing' && (
                <p className="font-mono text-xs text-[var(--cp-dim)]">
                  Sending your data. <span className="text-[var(--cp-green)]">✓ Sent {syncStats.sent} items</span>
                  <br/>Waiting for their data...
                </p>
              )}
            </div>
          </div>
        );

      // -------------------------------------------------------------
      // QR CODE DISPLAYS
      // -------------------------------------------------------------
      case 'show_offer_qr':
        return (
          <motion.div key="offer_qr" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6">
            {qrData && (
              <QRCodeDisplay
                data={qrData}
                title="Step 1: Your Link Key"
                subtitle="The receiving device must scan this code to pair"
                complexity={qrData.length < 600 ? 'medium' : 'high'}
                nextLabel="They've scanned it →"
                onNext={proceedToScanAnswer}
              />
            )}
            {/* Text fallback toggle */}
            <button
              onClick={() => setShowTextFallback(!showTextFallback)}
              className="font-mono text-[10px] text-[var(--cp-dim)] hover:text-[var(--cp-yellow)] transition-colors underline underline-offset-2 text-center"
            >
              📋 {showTextFallback ? 'Hide text' : 'Share as text instead'}
            </button>
            {showTextFallback && qrData && (
              <div className="border border-[var(--cp-yellow)]/40 bg-[var(--cp-base)] p-3 space-y-2">
                <p className="font-mono text-[10px] text-[var(--cp-dim)]">Copy this text and send it to your partner:</p>
                <textarea
                  readOnly
                  value={qrData}
                  rows={4}
                  className="w-full bg-[var(--cp-void)] border border-[var(--cp-border)] text-[var(--cp-text)] p-2 resize-none font-mono text-[10px] focus:outline-none"
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(qrData); }}
                  className="w-full py-2 font-cyber text-[10px] tracking-widest text-[var(--cp-yellow)] border border-[var(--cp-yellow)]/50 hover:bg-[var(--cp-yellow)] hover:text-black transition-colors"
                >
                  📋 COPY TO CLIPBOARD
                </button>
              </div>
            )}
            <button onClick={cancelSync} className="w-full py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border border-[var(--cp-border)] hover:bg-[var(--cp-base)] transition-colors">
              ABORT SETUP
            </button>
          </motion.div>
        );

      case 'show_answer_qr':
        return (
          <motion.div key="answer_qr" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6">
            {qrData && (
              <QRCodeDisplay
                data={qrData}
                title="Step 2: Complete the Link"
                subtitle="Show this code to the sharing device to finalize"
                complexity={qrData.length < 600 ? 'medium' : 'high'}
              />
            )}
            <div className="text-center p-3 border border-dashed border-[var(--cp-border)] rounded bg-white/5">
              <span className="w-2 h-2 inline-block bg-[var(--cp-cyan)] animate-ping mr-2 rounded-full"/>
              <span className="font-mono text-xs text-[var(--cp-cyan)]">Waiting for host to scan & connect...</span>
            </div>
            {/* Text fallback for answer QR */}
            <button
              onClick={() => setShowTextFallback(!showTextFallback)}
              className="font-mono text-[10px] text-[var(--cp-dim)] hover:text-[var(--cp-yellow)] transition-colors underline underline-offset-2 text-center"
            >
              📋 {showTextFallback ? 'Hide text' : 'Share as text instead'}
            </button>
            {showTextFallback && qrData && (
              <div className="border border-[var(--cp-yellow)]/40 bg-[var(--cp-base)] p-3 space-y-2">
                <p className="font-mono text-[10px] text-[var(--cp-dim)]">Copy this text and send it to your partner:</p>
                <textarea
                  readOnly
                  value={qrData}
                  rows={4}
                  className="w-full bg-[var(--cp-void)] border border-[var(--cp-border)] text-[var(--cp-text)] p-2 resize-none font-mono text-[10px] focus:outline-none"
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(qrData); }}
                  className="w-full py-2 font-cyber text-[10px] tracking-widest text-[var(--cp-yellow)] border border-[var(--cp-yellow)]/50 hover:bg-[var(--cp-yellow)] hover:text-black transition-colors"
                >
                  📋 COPY TO CLIPBOARD
                </button>
              </div>
            )}
            <button onClick={cancelSync} className="w-full py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border border-[var(--cp-border)] hover:bg-[var(--cp-base)] transition-colors">
              ABORT SETUP
            </button>
          </motion.div>
        );

      // -------------------------------------------------------------
      // SCANNERS
      // -------------------------------------------------------------
      case 'scanning_answer':
        return (
          <motion.div key="scan_answer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="text-center mb-2">
              <h2 className="font-cyber font-bold text-lg text-[var(--cp-magenta)] mb-1">Step 2: Scan their Answer</h2>
              <p className="font-mono text-xs text-[var(--cp-dim)]">Scan the pairing code on the receiving device.</p>
            </div>
            <QRScanner isActive={true} onScan={scanAnswerAndConnect} onCancel={cancelSync} hint="Align their answer QR code inside the brackets" />
          </motion.div>
        );

      case 'scanning_offer':
        return (
          <motion.div key="scan_offer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="text-center mb-2">
              <h2 className="font-cyber font-bold text-lg text-[var(--cp-cyan)] mb-1">Step 1: Scan the Host</h2>
              <p className="font-mono text-xs text-[var(--cp-dim)]">Scan the sharing device's setup code.</p>
            </div>
            <QRScanner isActive={true} onScan={scanOfferAndCreateAnswer} onCancel={cancelSync} hint="Align the host's QR code inside the brackets" />
          </motion.div>
        );

      // -------------------------------------------------------------
      // COMPLETE / ERROR
      // -------------------------------------------------------------
      case 'complete':
        return (
          <motion.div key="complete" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 gap-8 text-center bg-[var(--cp-green)]/5 border-2 border-[var(--cp-green)] p-6 shadow-neon-green">
            <div className="w-20 h-20 bg-[var(--cp-green)] text-[var(--cp-void)] flex items-center justify-center font-black text-4xl clip-angled shadow-neon-green">
              ✅
            </div>
            
            <div className="space-y-4 w-full">
              <p className="font-cyber font-black text-xl tracking-widest text-[var(--cp-green)] drop-shadow-md">SYNC COMPLETE!</p>
              
              <div className="bg-[var(--cp-base)] p-4 rounded text-left font-mono text-xs border border-[var(--cp-green)]/30 space-y-2">
                <p className="text-[var(--cp-text)]">Network merged with: <strong className="text-[var(--cp-cyan)]">{syncStats.peerName}</strong></p>
                <div className="h-px bg-[var(--cp-border)] my-2" />
                <p className="text-[var(--cp-dim)]">Sent: <span className="text-[var(--cp-text)]">{syncStats.sent} reports</span></p>
                <p className="text-[var(--cp-dim)]">Received: <span className="text-[var(--cp-text)]">{syncStats.received} reports</span></p>
                <div className="h-px bg-[var(--cp-border)] my-2" />
                <p className="text-[var(--cp-green)] font-bold">Total: {syncStats.sent + syncStats.received} data points synchronized</p>
              </div>
            </div>

            <button onClick={cancelSync} className="w-full py-4 font-cyber font-black text-sm tracking-widest text-[var(--cp-void)] bg-[var(--cp-green)] hover:bg-white transition-colors clip-angled">
              DONE
            </button>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 gap-6 text-center border-2 border-[var(--cp-magenta)] bg-[var(--cp-magenta)]/5 p-6 shadow-neon-magenta">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-[var(--cp-magenta)] font-cyber font-bold text-xl uppercase">Link Failure</h2>
            <p className="text-[var(--cp-text)] font-mono text-sm max-w-[280px] bg-black/40 p-4 rounded border border-[var(--cp-magenta)]/30">{error}</p>
            <div className="flex gap-4 w-full mt-4">
              <button onClick={cancelSync} className="flex-1 py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-dim)] border border-[var(--cp-border)] hover:bg-[var(--cp-base)] transition-colors">
                ABORT
              </button>
              <button onClick={startAsOfferer} className="flex-1 py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-void)] bg-[var(--cp-magenta)] clip-angled transition-colors shadow-neon-magenta">
                RETRY
              </button>
            </div>
          </motion.div>
        );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--cp-void)]">
      {/* Header */}
      <div className="p-5 border-b-2 border-[var(--cp-border)] bg-[var(--cp-base)] shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-dots bg-dots-sm opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[var(--cp-cyan)] animate-pulse" />
              <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-text)]">P2P_PROTOCOL</span>
            </div>
            <h1 className="font-cyber font-black text-2xl text-[var(--cp-cyan)] drop-shadow-md">LOCAL MESH LINK</h1>
            <div className="mt-2 h-1 w-12 bg-[var(--cp-magenta)]" />
          </div>
          
          {/* Subtle badge indicating offline/mesh mode */}
          <div className="border border-[var(--cp-cyan)]/30 bg-[var(--cp-cyan)]/10 px-2 py-1 rounded">
            <span className="font-mono text-[9px] text-[var(--cp-cyan)] tracking-widest block text-center">MODE</span>
            <span className="font-mono text-[10px] text-white font-bold tracking-widest">OFFLINE</span>
          </div>
        </div>
      </div>

      {/* Content wrapper with grid backdrop */}
      <div className="flex-1 overflow-y-auto p-5 relative">
        <div className="absolute inset-0 bg-cyber-grid bg-grid-sm opacity-[0.05] pointer-events-none" />
        
        <AnimatePresence mode="wait">
          <div className="relative z-10 max-w-sm mx-auto w-full">
            {renderContent()}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
