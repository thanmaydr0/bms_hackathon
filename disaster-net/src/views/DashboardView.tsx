import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveFeed, type FeedItem } from '../hooks/useLiveFeed';
import { useIdentity } from '../hooks/useIdentity';
import { addMessage } from '../db/repository';
import { useToast } from '../hooks/useToast';
import type { SOSMessage } from '../types';
import { HazardReportForm } from '../components/HazardReportForm';
import { cn } from '../lib/utils';
import { getCurrentPositionSafe } from '../lib/geolocation';

function getRelativeTime(timestamp: number) {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return 'NOW';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}M`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H`;
  return `${Math.floor(h / 24)}D`;
}

const hazardConfig: Record<string, { icon: string; color: string }> = {
  collapsed_building: { icon: '🏚', color: '#ff003c' },
  blocked_road:       { icon: '🚧', color: '#fcee0a' },
  fire:               { icon: '🔥', color: '#ff2a6d' },
  flood:              { icon: '🌊', color: '#00f0ff' },
  medical:            { icon: '🏥', color: '#00ff9f' },
  resource:           { icon: '📦', color: '#fcee0a' },
  other:              { icon: '⚠️', color: '#ff003c' },
};

type Priority = 'info' | 'warning' | 'sos';

const priorityConfig = {
  info:    { label: 'INFO',    color: 'var(--cp-cyan)',    shadow: 'shadow-hard-cyan' },
  warning: { label: 'WARNING', color: 'var(--cp-yellow)',  shadow: 'shadow-hard-yellow' },
  sos:     { label: 'SOS',     color: 'var(--cp-magenta)', shadow: 'shadow-hard-magenta' },
};

export default function DashboardView() {
  const { feed, isLoading: feedLoading } = useLiveFeed();
  const { identity } = useIdentity();

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHazardFormOpen, setIsHazardFormOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(50);
  const broadcastRef = useRef<HTMLButtonElement>(null);

  const { showToast } = useToast();

  const handleBroadcast = async () => {
    if (!text.trim() || !identity) return;
    setIsSubmitting(true);

    try {
      let coords: { lat: number; lng: number } | undefined;
      const position = await getCurrentPositionSafe();
      if (position) {
        coords = { lat: position.latitude, lng: position.longitude };
      } else {
        showToast('Location unavailable — saving without GPS', 'warning');
      }

      const msg: SOSMessage = {
        text: text.trim(), priority,
        senderId: identity.id, senderName: identity.name,
        timestamp: Date.now(), synced: false,
        latitude: coords?.lat, longitude: coords?.lng,
      };

      await addMessage(msg);
      setText('');
      setPriority('info');
      showToast('Message cached onto local node', 'success');
    } catch {
      showToast('Node memory limit exceeded. Packet rejected.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cfg = priorityConfig[priority];

  return (
    <div className="flex flex-col h-full relative">

      {/* ── SOS BROADCAST PANEL ── */}
      <section
        className={cn(
          "shrink-0 p-4 border-b-2 bg-cp-panel relative",
          priority === 'sos' ? 'border-cp-magenta' : priority === 'warning' ? 'border-cp-yellow' : 'border-cp-border'
        )}
        style={{ transition: 'border-color 0.1s steps(2)' }}
      >
        {/* Aggressive angled cuts */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-cp-base transform rotate-45 translate-x-4 -translate-y-4 border-l-2 border-b-2" 
             style={{ borderColor: cfg.color }} />
        
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3 mt-1">
          <div className={cn(
            'w-2 h-2',
            priority === 'sos' ? 'bg-cp-magenta animate-glitch' : 'bg-cp-cyan'
          )} />
          <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-cp-dim uppercase">
            BROADCAST NODE
          </span>
        </div>

        {/* Textarea */}
        <div className="relative group">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ENTER EMERGENCY PROTOCOL DATA..."
            rows={3}
            className="w-full bg-cp-void border-2 border-cp-border text-cp-text p-3 resize-none outline-none font-mono text-sm placeholder-cp-border focus:border-cp-cyan transition-none clip-angled focus:shadow-neon-cyan"
          />
          {/* Cyber accents on textarea */}
          <div className="absolute bottom-1 right-2 flex items-center gap-2">
            {text.length > 0 && (
              <span className="font-cyber font-bold text-[10px] text-cp-dim">
                LEN:{text.length}
              </span>
            )}
            <div className="w-4 h-1 bg-cp-cyan/50 animate-pulse group-focus-within:bg-cp-cyan" />
          </div>
        </div>

        {/* Priority selector */}
        <div className="flex gap-2 mt-4 mb-5">
          {(Object.entries(priorityConfig) as [Priority, typeof cfg][]).map(([key, c]) => {
            const isActive = priority === key;
            return (
              <button
                key={key}
                onClick={() => setPriority(key)}
                className={cn(
                  'flex-1 py-2 font-cyber text-[10px] font-bold tracking-[0.2em] uppercase transition-none border-2 clip-angled-br active:translate-y-[2px] active:translate-x-[2px] active:shadow-none',
                  isActive
                    ? `text-cp-void border-transparent bg-current ${c.shadow}`
                    : 'bg-cp-base text-cp-dim border-cp-border hover:border-cp-text hover:text-cp-text'
                )}
                style={isActive ? { backgroundColor: c.color } : {}}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* BROADCAST button */}
        <div className="relative mt-2">
          {/* Chromatic aberration back layers */}
          {!isSubmitting && text.trim() && (
            <>
              <div className="absolute inset-0 bg-cp-magenta translate-x-[2px] translate-y-[-2px] clip-angled opacity-70 pointer-events-none mix-blend-screen" />
              <div className="absolute inset-0 bg-cp-cyan translate-x-[-2px] translate-y-[2px] clip-angled opacity-70 pointer-events-none mix-blend-screen" />
            </>
          )}
          
          <button
            ref={broadcastRef}
            onClick={handleBroadcast}
            disabled={!text.trim() || isSubmitting}
            className={cn(
              "relative w-full py-4 font-cyber font-black text-sm tracking-[0.3em] text-cp-void clip-angled border-2 border-transparent uppercase transition-all duration-75",
              !text.trim() ? "bg-cp-border text-cp-dim" : "active:translate-y-[2px]"
            )}
            style={text.trim() ? { backgroundColor: cfg.color } : {}}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 bg-cp-void animate-ping" />
                  UPLOADING...
                </>
              ) : (
                <>
                  <span className="animate-pulse">▶</span> 
                  TRANSMIT_{priorityConfig[priority].label}
                </>
              )}
            </span>
            
            {/* Scanline overlay over active button */}
            {text.trim() && !isSubmitting && (
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
            )}
          </button>
        </div>
      </section>

      {/* ── LIVE FEED ── */}
      <section className="flex-1 overflow-y-auto bg-cp-void relative border-t-2 border-cp-border">
        {/* Subtle grid background for the feed */}
        <div className="absolute inset-0 bg-cyber-grid bg-grid-sm opacity-20 pointer-events-none" />
        
        {/* Feed header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-cp-panel border-b-2 border-cp-border shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cp-green animate-pulse" />
            <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-cp-text">NET_FEED</span>
          </div>
          {!feedLoading && feed.length > 0 && (
            <span className="font-mono text-[9px] text-cp-cyan bg-cp-cyan/10 px-2 py-0.5 border border-cp-cyan">
              {feed.length} NODES
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col gap-4 relative z-10 pb-24">
          {feedLoading && feed.length === 0 ? (
            <FeedSkeleton />
          ) : feed.length === 0 ? (
            <EmptyFeed />
          ) : (
            feed.slice(0, displayCount).map((item, i) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, x: -20, rotateY: 15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.05, duration: 0.2, type: 'tween' }}
              >
                <FeedCard item={item} />
              </motion.div>
            ))
          )}
          {feed.length > displayCount && (
            <button
              onClick={() => setDisplayCount(prev => prev + 50)}
              className="w-full py-3 font-cyber text-[10px] font-bold tracking-[0.2em] text-[var(--cp-cyan)] border border-[var(--cp-border)] hover:border-[var(--cp-cyan)] hover:bg-[var(--cp-cyan)]/10 transition-colors mt-2"
            >
              LOAD MORE ({feed.length - displayCount} remaining)
            </button>
          )}
        </div>
      </section>

      {/* ── CYBER FAB ── */}
      <button
        onClick={() => setIsHazardFormOpen(true)}
        className="absolute bottom-6 right-4 z-40 w-14 h-14 flex items-center justify-center bg-cp-magenta border-2 border-cp-magenta text-cp-void shadow-hard-magenta font-cyber text-3xl font-black clip-angled-tl hover:bg-cp-void hover:text-cp-magenta transition-colors active:translate-y-[4px] active:translate-x-[4px] active:shadow-none"
      >
        <span className={isHazardFormOpen ? "rotate-45" : ""}>+</span>
      </button>

      {/* ── Hazard Report Sheet ── */}
      <AnimatePresence>
        {isHazardFormOpen && (
          <HazardReportForm
            onClose={() => setIsHazardFormOpen(false)}
            onSuccess={() => showToast('Hazard data injected into mesh', 'success')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Feed Card ─────────────────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const timeStr = getRelativeTime(item.timestamp);
  const isMessage = item.type === 'message';
  
  // Cyberpunk specific coloring
  let accentColor = 'var(--cp-cyan)';
  let shadowClass = 'hover:shadow-hard-cyan';
  let badgeLabel = 'INFO';
  let badgeColor = 'text-cp-cyan border-cp-cyan bg-cp-cyan/10';

  if (isMessage) {
    if (item.priority === 'sos') {
      accentColor = 'var(--cp-magenta)';
      shadowClass = 'hover:shadow-hard-magenta';
      badgeLabel = 'SOS';
      badgeColor = 'text-cp-magenta border-cp-magenta bg-cp-magenta/10 animate-pulse';
    } else if (item.priority === 'warning') {
      accentColor = 'var(--cp-yellow)';
      shadowClass = 'hover:shadow-hard-yellow';
      badgeLabel = 'WARN';
      badgeColor = 'text-cp-yellow border-cp-yellow bg-cp-yellow/10';
    }
  } else {
    // Harzard card logic
    const isCrit = item.severity === 'critical';
    if (isCrit) {
      accentColor = 'var(--cp-magenta)';
      shadowClass = 'hover:shadow-hard-magenta';
    } else if (item.severity === 'high') {
      accentColor = 'var(--cp-yellow)';
      shadowClass = 'hover:shadow-hard-yellow';
    }
  }

  return (
    <div
      className={cn(
        "bg-cp-panel border-2 border-cp-border relative p-3 transition-shadow duration-150 transform hover:-translate-y-1 hover:-translate-x-1",
        shadowClass
      )}
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
    >
      {/* Decorative tech corners */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cp-dim" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cp-dim" />

      {isMessage ? (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-1 py-px border font-cyber font-bold text-[9px] tracking-widest', badgeColor)}>
                {badgeLabel}
              </span>
              <span className="font-mono text-[10px] text-cp-text font-bold uppercase truncate max-w-[120px]">
                {item.senderName || item.senderId.slice(0, 8)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="font-mono text-[9px] text-cp-cyan font-bold">{timeStr}</span>
              {item.synced && (
                <span className="font-mono text-[8px] text-cp-green tracking-widest border border-cp-green/30 bg-cp-green/10 px-1 mt-0.5">SYNC</span>
              )}
            </div>
          </div>
          <p className="font-mono flex-1 text-sm text-cp-text whitespace-pre-wrap break-words leading-relaxed pl-1 border-l border-cp-border/50">
            {item.text}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {/* @ts-ignore - hazardConfig indexing */}
              <span className="text-xl leading-none drop-shadow-md">{hazardConfig[item.category]?.icon || '⚠️'}</span>
              <div className="flex flex-col">
                <span className={cn(
                  'font-cyber text-[10px] font-bold tracking-[0.2em] uppercase',
                  item.severity === 'critical' ? 'text-cp-magenta' : item.severity === 'high' ? 'text-cp-yellow' : 'text-cp-cyan'
                )}>
                  LVL:{item.severity}
                </span>
                <span className="font-mono text-[8px] text-cp-dim uppercase tracking-widest">
                  {item.category.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="font-mono text-[9px] text-cp-cyan font-bold">{timeStr}</span>
            </div>
          </div>
          <p className="font-mono text-xs text-cp-text line-clamp-2 pl-1 border-l border-cp-border/50">
            {item.description}
          </p>
        </>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 border-2 border-cp-border bg-cp-panel relative overflow-hidden p-3">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] animate-scanline" />
          <div className="w-16 h-4 bg-cp-border mb-3" />
          <div className="w-full h-2 bg-cp-base mb-2" />
          <div className="w-3/4 h-2 bg-cp-base" />
        </div>
      ))}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center h-full border border-dashed border-cp-border/50 mt-4 mx-4">
      <div className="font-cyber font-black text-4xl text-cp-magenta opacity-30 mb-2 animate-pulse">
        Ø
      </div>
      <p className="font-cyber text-[10px] font-bold text-cp-dim tracking-[0.3em] uppercase mb-1">DATA STREAM EMPTY</p>
      <p className="font-mono text-xs text-cp-border">Awaiting local node injection.</p>
    </div>
  );
}
