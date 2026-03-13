import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import DashboardView from './views/DashboardView';
import MapView from './views/MapView';
import SyncView from './views/SyncView';
import SettingsView from './views/SettingsView';
import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/ToastProvider';
import { useIdentity } from './hooks/useIdentity';
import { IdentitySetup } from './components/IdentitySetup';
import { OfflineBanner } from './components/OfflineBanner';

const INITIAL_ID = `NODE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

// Glitch Header Logo component
function GlitchLogo() {
  return (
    <div className="flex items-center gap-1 font-cyber font-black text-xl italic tracking-widest relative cursor-default filter drop-shadow-[0_0_8px_rgba(255,0,60,0.8)]">
      <span className="text-cp-magenta text-glitch" data-text="DISASTER">DISASTER</span>
      <span className="text-cp-cyan">_</span>
      <span className="text-cp-yellow">NET</span>
    </div>
  );
}

function MainLayout() {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();

  const { identity, updateName, isLoading } = useIdentity();
  const [showIdentitySetup, setShowIdentitySetup] = useState(false);

  useEffect(() => {
    if (!isLoading && identity && (!identity.name || identity.name === identity.id)) {
      if (!localStorage.getItem('identity_setup_skipped')) {
        setShowIdentitySetup(true);
      }
    }
  }, [identity, isLoading]);

  const handleSaveIdentity = async (name: string) => {
    await updateName(name);
    setShowIdentitySetup(false);
  };

  const handleDismissSetup = () => {
    localStorage.setItem('identity_setup_skipped', '1');
    setShowIdentitySetup(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="h-screen w-full flex flex-col bg-cp-base relative overflow-hidden">
      {/* Heavy Cyber Grid Background */}
      <div className="absolute inset-0 z-0 bg-cyber-grid bg-grid-sm opacity-30 pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-cp-base via-transparent to-cp-base pointer-events-none" />
      
      {/* ── HEADER ── */}
      <header className="relative z-40 bg-cp-panel border-b-2 border-cp-border shadow-hard-cyan shrink-0 clip-angled-br">
        {/* Top Neon Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cp-magenta via-cp-cyan to-cp-yellow" />
        
        <div className="px-4 py-3 flex items-center justify-between">
          <GlitchLogo />

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 border rounded-sm" 
                 style={{ 
                   borderColor: isOnline ? 'var(--cp-cyan)' : 'var(--cp-magenta)',
                   backgroundColor: isOnline ? 'rgba(0,240,255,0.1)' : 'rgba(255,0,60,0.1)',
                   boxShadow: isOnline ? '0 0 10px rgba(0,240,255,0.4) inset' : '0 0 10px rgba(255,0,60,0.4) inset'
                 }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: isOnline ? 2 : 0.5 }}
                className="w-2 h-2"
                style={{ backgroundColor: isOnline ? 'var(--cp-cyan)' : 'var(--cp-magenta)' }}
              />
              <span className="font-mono text-[10px] font-bold tracking-widest"
                    style={{ color: isOnline ? 'var(--cp-cyan)' : 'var(--cp-magenta)' }}>
                {isOnline ? 'SYS.ON' : 'ERR.OFF'}
              </span>
            </div>

            {/* Time / Sync Data */}
            <div className="text-right flex flex-col items-end">
              <span className="font-mono text-xs font-bold text-cp-yellow tracking-widest drop-shadow-[0_0_5px_rgba(252,238,10,0.8)]">
                {timeStr}
              </span>
              <span className="font-mono text-[8px] text-cp-cyan tracking-[0.2em] uppercase">
                NODE_ID: {identity?.id.slice(-4) || '----'}
              </span>
            </div>

            {/* Settings gear */}
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 flex items-center justify-center text-[var(--cp-dim)] hover:text-[var(--cp-yellow)] border border-[var(--cp-border)] hover:border-[var(--cp-yellow)] transition-colors bg-[var(--cp-base)]"
              aria-label="Settings"
            >
              <span className="text-base">⚙</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      <OfflineBanner />

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 relative z-10 overflow-hidden hide-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -20 }}
            transition={{ type: 'tween', duration: 0.15 }}
            className="h-full w-full"
          >
            <Routes location={location}>
              <Route path="/" element={<DashboardView />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/sync" element={<SyncView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── BOTTOM NAV ── */}
      <BottomNav />

      {/* Identity Setup Modal */}
      <AnimatePresence>
        {showIdentitySetup && (
          <IdentitySetup
            currentName={identity?.name || INITIAL_ID}
            onSave={handleSaveIdentity}
            onDismiss={handleDismissSetup}
          />
        )}
      </AnimatePresence>
      
      {/* Global CRT overlay */}
      <div className="crt-overlay" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
}
