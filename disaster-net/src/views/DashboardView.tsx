import { useState } from 'react';
import { useLiveFeed, type FeedItem } from '../hooks/useLiveFeed';
import { useIdentity } from '../hooks/useIdentity';
import { addMessage } from '../db/repository';
import type { SOSMessage } from '../types';
import { HazardReportForm } from '../components/HazardReportForm';

// Helper for relative time (e.g. "2 min ago")
function getRelativeTime(timestamp: number) {
  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} h ago`;
  return `${Math.floor(diffInHours / 24)} d ago`;
}

// Emoji mapping for hazard categories
const hazardEmojis: Record<string, string> = {
  collapsed_building: '🏚️',
  blocked_road: '🚧',
  fire: '🔥',
  flood: '🌊',
  medical: '🏥',
  resource: '📦',
  other: '⚠️',
};

type Priority = 'info' | 'warning' | 'sos';

export default function DashboardView() {
  const { feed, isLoading: feedLoading } = useLiveFeed(3000);
  const { identity } = useIdentity();
  
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHazardFormOpen, setIsHazardFormOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBroadcast = async () => {
    if (!text.trim() || !identity) return;
    setIsSubmitting(true);

    try {
      // 1. Try to get geolocation with 5s timeout
      let coords: { lat: number; lng: number } | undefined;
      
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 10000,
            });
          });
          coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        } catch (err) {
          console.warn('Geolocation failed or timed out:', err);
        }
      }

      // 2. Build and save the message
      const msg: SOSMessage = {
        text: text.trim(),
        priority, // 'info' | 'warning' | 'sos'
        senderId: identity.id,
        senderName: identity.name,
        timestamp: Date.now(),
        synced: false,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };

      await addMessage(msg);
      
      // 3. Reset form
      setText('');
      setPriority('info');
      showToast('Message saved locally');
      
    } catch (error) {
      console.error('Broadcast failed', error);
      showToast('Error saving message');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI styling based on priority
  const isSOS = priority === 'sos';
  const panelGlow = isSOS ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-[var(--color-accent)]' : 'border-[var(--color-border)]';

  return (
    <div className="flex flex-col h-full relative">
      
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-[var(--color-border)] animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* ── SECTION 1: SOS Broadcast Panel ── */}
      <section 
        className={`shrink-0 p-4 border-b bg-[var(--color-surface)] transition-all duration-300 ${panelGlow}`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your situation..."
          className="w-full h-24 bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-[var(--color-info)] mb-3"
        />

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPriority('info')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
              priority === 'info' 
                ? 'bg-[var(--color-info)] text-white' 
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            INFO
          </button>
          <button
            onClick={() => setPriority('warning')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
              priority === 'warning' 
                ? 'bg-[var(--color-accent-2)] text-[var(--color-bg)]' 
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            WARNING
          </button>
          <button
            onClick={() => setPriority('sos')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
              priority === 'sos' 
                ? 'bg-[var(--color-accent)] text-white animate-pulse' 
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            SOS
          </button>
        </div>

        <button
          onClick={handleBroadcast}
          disabled={!text.trim() || isSubmitting}
          className="w-full py-4 rounded-xl font-bold bg-[var(--color-accent)] text-white text-lg disabled:opacity-50 transition-transform active:scale-95"
        >
          BROADCAST
        </button>
      </section>

      {/* ── SECTION 2: Live Feed ── */}
      <section className="flex-1 overflow-y-auto p-4 bg-[var(--color-bg)]">
        {feedLoading && feed.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-info)]"></div>
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center p-8 text-[var(--color-text-muted)]">
            <p className="mb-2">No reports yet.</p>
            <p className="text-sm">Be the first to share your status.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.map((item) => <FeedCard key={`${item.type}-${item.id}`} item={item} />)}
          </div>
        )}
      </section>

      {/* ── Floating Action Button (FAB) ── */}
      <button
        onClick={() => setIsHazardFormOpen(true)}
        className="absolute bottom-6 right-4 w-14 h-14 bg-[var(--color-accent)] text-white rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center text-3xl transition-transform active:scale-90 z-40 hover:-translate-y-1"
        aria-label="Report Hazard"
      >
        +
      </button>

      {/* ── Hazard Report Bottom Sheet ── */}
      {isHazardFormOpen && (
        <HazardReportForm 
          onClose={() => setIsHazardFormOpen(false)}
          onSuccess={() => showToast('Hazard reported and saved locally')}
        />
      )}
    </div>
  );
}

// Sub-component for rendering feed items
function FeedCard({ item }: { item: FeedItem }) {
  const timeStr = getRelativeTime(item.timestamp);
  
  if (item.type === 'message') {
    const isSos = item.priority === 'sos';
    const isWarn = item.priority === 'warning';
    
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isSos ? 'bg-[var(--color-accent)] text-white' :
              isWarn ? 'bg-[var(--color-accent-2)] text-[var(--color-bg)]' :
              'bg-[var(--color-info)] text-white'
            }`}>
              {isSos ? 'SOS' : isWarn ? 'WARNING' : 'INFO'}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
              {item.senderName || item.senderId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {item.synced && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-[var(--color-safe)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            <span className="text-xs text-[var(--color-text-muted)]">{timeStr}</span>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words">{item.text}</p>
      </div>
    );
  }

  // Hazard Report Card
  const icon = hazardEmojis[item.category] || '⚠️';
  const isCritical = item.severity === 'critical';

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: isCritical ? 'var(--color-accent)' : 'var(--color-accent-2)' }}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isCritical ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
          }`}>
            {item.severity} Hazard
          </span>
        </div>
        <div className="flex items-center gap-1">
            {item.synced && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-[var(--color-safe)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            <span className="text-xs text-[var(--color-text-muted)]">{timeStr}</span>
          </div>
      </div>
      <p className="text-sm text-[var(--color-text)] line-clamp-2 mt-1">{item.description}</p>
    </div>
  );
}
