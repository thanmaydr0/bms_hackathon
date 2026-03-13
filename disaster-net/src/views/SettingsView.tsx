import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useIdentity } from '../hooks/useIdentity';
import { useToast } from '../hooks/useToast';
import { db } from '../lib/db/db';
import { getAllHazards, getAllMessages } from '../db/repository';

// ─── Section wrapper ───
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[var(--cp-border)] bg-[var(--cp-panel)] overflow-hidden">
      <div className="px-4 py-2 bg-[var(--cp-base)] border-b border-[var(--cp-border)] flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[var(--cp-cyan)]" />
        <h2 className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-cyan)]">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-mono text-xs text-[var(--cp-dim)] shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

export default function SettingsView() {
  const { identity, updateName } = useIdentity();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [swReady, setSwReady] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0 });
  const [tileCount, setTileCount] = useState<number | null>(null);
  const [hazardCount, setHazardCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sync name from identity
  useEffect(() => {
    if (identity?.name) setDisplayName(identity.name);
  }, [identity?.name]);

  // Online/offline listener
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Load system info on mount
  useEffect(() => {
    // Service Worker
    setSwReady(!!navigator.serviceWorker?.controller);

    // Storage estimate
    navigator.storage?.estimate?.().then(est => {
      setStorageInfo({ used: est.usage ?? 0, quota: est.quota ?? 0 });
    });

    // Tile cache count
    caches.open('osm-tiles').then(async cache => {
      const keys = await cache.keys();
      setTileCount(keys.length);
    }).catch(() => setTileCount(0));

    // Data counts
    loadDataCounts();
  }, []);

  const loadDataCounts = async () => {
    const [h, m] = await Promise.all([getAllHazards(), getAllMessages()]);
    setHazardCount(h.length);
    setMessageCount(m.length);
  };

  const handleNameBlur = useCallback(async () => {
    const trimmed = displayName.trim();
    if (trimmed && trimmed !== identity?.name) {
      await updateName(trimmed);
      showToast('Display name updated', 'success');
    }
  }, [displayName, identity?.name, updateName, showToast]);

  const handleClearTiles = async () => {
    if (!confirm('This will remove offline map tiles. Are you sure?')) return;
    const cache = await caches.open('osm-tiles');
    const keys = await cache.keys();
    await Promise.all(keys.map(k => cache.delete(k)));
    setTileCount(0);
    showToast('Map tile cache cleared', 'info');
  };

  const handleExport = async () => {
    const [hazards, messages] = await Promise.all([getAllHazards(), getAllMessages()]);
    const data = { exportedAt: new Date().toISOString(), hazards, messages };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disasternet-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${hazards.length + messages.length} records`, 'success');
  };

  const handleClearData = async () => {
    if (deleteConfirm !== 'DELETE') return;
    await db.hazards.clear();
    await db.messages.clear();
    setDeleteConfirm('');
    setHazardCount(0);
    setMessageCount(0);
    showToast('All local data cleared', 'warning');
  };

  const fmtMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-[var(--cp-void)]">
      {/* Header */}
      <div className="p-5 border-b-2 border-[var(--cp-border)] bg-[var(--cp-base)] shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-dots bg-dots-sm opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[var(--cp-yellow)]" />
            <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-[var(--cp-text)]">SYS_CONFIG</span>
          </div>
          <h1 className="font-cyber font-black text-2xl text-[var(--cp-yellow)] drop-shadow-md">SETTINGS</h1>
          <div className="mt-2 h-1 w-12 bg-[var(--cp-magenta)]" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        <div className="absolute inset-0 bg-cyber-grid bg-grid-sm opacity-[0.05] pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto space-y-4">

          {/* ── YOUR IDENTITY ── */}
          <Section title="YOUR IDENTITY">
            <div>
              <label className="font-mono text-[10px] text-[var(--cp-dim)] block mb-1">DISPLAY NAME</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full px-3 py-2 bg-[var(--cp-base)] border border-[var(--cp-border)] font-mono text-sm text-[var(--cp-text)] focus:border-[var(--cp-cyan)] focus:outline-none focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                placeholder="Enter your name..."
              />
            </div>
            <Row label="Your ID">
              <span className="font-mono text-xs text-[var(--cp-cyan)] bg-[var(--cp-base)] px-2 py-0.5 border border-[var(--cp-border)]">
                {identity?.id ? identity.id.slice(0, 8) : '--------'}
              </span>
            </Row>
            <p className="font-mono text-[10px] text-[var(--cp-dim)] italic">
              This name is visible to people you sync with
            </p>
          </Section>

          {/* ── APP STATUS ── */}
          <Section title="APP STATUS">
            <Row label="Service Worker">
              <span className={`font-mono text-xs font-bold ${swReady ? 'text-[var(--cp-green)]' : 'text-[var(--cp-yellow)]'}`}>
                {swReady ? 'Offline Ready ✅' : 'Not cached ⚠️'}
              </span>
            </Row>
            <Row label="Storage Used">
              <span className="font-mono text-xs text-[var(--cp-text)]">
                {fmtMB(storageInfo.used)} MB / {fmtMB(storageInfo.quota)} MB
              </span>
            </Row>
            <Row label="Network">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--cp-green)] animate-pulse' : 'bg-[var(--cp-magenta)]'}`} />
                <span className={`font-mono text-xs font-bold ${isOnline ? 'text-[var(--cp-green)]' : 'text-[var(--cp-magenta)]'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </Row>
          </Section>

          {/* ── MAP TILES ── */}
          <Section title="MAP TILES">
            <Row label="Cached Tiles">
              <span className="font-mono text-xs text-[var(--cp-text)]">
                {tileCount !== null ? `${tileCount} tiles cached` : 'Checking...'}
              </span>
            </Row>
            <button
              onClick={handleClearTiles}
              className="w-full py-2.5 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-magenta)] border border-[var(--cp-magenta)]/50 hover:bg-[var(--cp-magenta)]/10 transition-colors"
            >
              CLEAR MAP CACHE
            </button>
          </Section>

          {/* ── DATA MANAGEMENT ── */}
          <Section title="DATA MANAGEMENT">
            <Row label="Reports stored">
              <span className="font-mono text-xs text-[var(--cp-text)]">
                {hazardCount} hazards, {messageCount} messages
              </span>
            </Row>

            <button
              onClick={handleExport}
              className="w-full py-2.5 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-cyan)] border border-[var(--cp-cyan)]/50 hover:bg-[var(--cp-cyan)]/10 transition-colors"
            >
              📦 EXPORT DATA AS JSON
            </button>

            <div className="border-t border-dashed border-[var(--cp-border)] pt-4 mt-2 space-y-3">
              <p className="font-mono text-[10px] text-[var(--cp-magenta)]">Type DELETE to confirm data wipe:</p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full px-3 py-2 bg-black border border-[var(--cp-magenta)]/30 font-mono text-sm text-[var(--cp-magenta)] focus:border-[var(--cp-magenta)] focus:outline-none transition-all placeholder:text-[var(--cp-dim)]"
              />
              <button
                onClick={handleClearData}
                disabled={deleteConfirm !== 'DELETE'}
                className={`w-full py-2.5 font-cyber text-[10px] font-bold tracking-[0.2em] transition-colors
                  ${deleteConfirm === 'DELETE'
                    ? 'text-white bg-[var(--cp-magenta)] hover:bg-[var(--cp-magenta)]/80 shadow-neon-magenta'
                    : 'text-[var(--cp-dim)] bg-[var(--cp-base)] border border-[var(--cp-border)] cursor-not-allowed'
                  }`}
              >
                ⚠ CLEAR ALL LOCAL DATA
              </button>
            </div>
          </Section>

          {/* ── ABOUT ── */}
          <Section title="ABOUT">
            <Row label="Version">
              <span className="font-mono text-xs text-[var(--cp-yellow)] font-bold">1.0.0</span>
            </Row>
            <div className="space-y-3 border-t border-dashed border-[var(--cp-border)] pt-3">
              <p className="font-mono text-[11px] text-[var(--cp-dim)] leading-relaxed">
                DisasterNet works entirely offline. Your data never leaves your device unless you
                explicitly sync with another user via QR code.
              </p>
              <p className="font-mono text-[11px] text-[var(--cp-dim)] leading-relaxed">
                Built for disaster scenarios where internet infrastructure has failed.
              </p>
            </div>
          </Section>

          {/* Bottom spacer for scroll */}
          <div className="h-4" />
        </div>
      </div>
    </motion.div>
  );
}
