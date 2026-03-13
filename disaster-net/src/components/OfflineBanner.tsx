import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, initialized } = useNetworkStatus();

  // Don't render anything until we've passed the initialization delay
  // This prevents the banner from flashing on first load if the device
  // is offline at startup (or briefly appears offline during hydration)
  const showBanner = initialized && !isOnline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="overflow-hidden relative z-40 shrink-0"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-[var(--cp-yellow)] text-black">
            <span className="text-sm">📡</span>
            <span className="font-cyber font-bold text-[10px] tracking-[0.2em]">
              OFFLINE MODE — All data saved locally
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
