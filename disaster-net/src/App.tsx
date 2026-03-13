import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardView from './views/DashboardView';
import MapView from './views/MapView';
import SyncView from './views/SyncView';
import BottomNav from './components/BottomNav';
import { useIdentity } from './hooks/useIdentity';
import { IdentitySetup } from './components/IdentitySetup';

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const { identity, updateName, isLoading: identityLoading } = useIdentity();
  const [hasDismissedSetup, setHasDismissedSetup] = useState(false);

  const showIdentitySetup = 
    !identityLoading && 
    identity && 
    identity.name.startsWith('Survivor_') && 
    !hasDismissedSetup;

  return (
    <div
      className="flex flex-col h-dvh w-full max-w-md mx-auto relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ── Fixed top header ── */}
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0 z-30 border-b"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <span className="font-bold text-lg tracking-tight">
          Disaster<span style={{ color: 'var(--color-accent)' }}>Net</span>
        </span>

        {/* Online / Offline status dot */}
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{
              backgroundColor: isOnline
                ? 'var(--color-safe)'
                : 'var(--color-accent)',
            }}
            title={isOnline ? 'Online' : 'Offline'}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── Scrollable main content ── */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/sync" element={<SyncView />} />
        </Routes>
      </main>

      {/* ── Fixed bottom nav ── */}
      <BottomNav />

      {/* ── Identity Setup Overlay ── */}
      {showIdentitySetup && identity && (
        <IdentitySetup 
          currentName={identity.name} 
          onSave={updateName} 
          onDismiss={() => setHasDismissedSetup(true)} 
        />
      )}
    </div>
  );
}
