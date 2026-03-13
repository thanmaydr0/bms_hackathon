import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { ActivitySquare, Map, RadioTower } from 'lucide-react';

const navItems = [
  { id: '/', label: 'SYS_LOG', icon: ActivitySquare },
  { id: '/map', label: 'GEO_MAP', icon: Map },
  { id: '/sync', label: 'P2P_LINK', icon: RadioTower },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="relative z-40 shrink-0 bg-cp-panel border-t-2 border-cp-border clip-angled-tl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cp-magenta via-cp-cyan to-cp-yellow opacity-50" />
      
      {/* Background scanline effect specific to nav */}
      <div className="absolute inset-0 bg-repeating-linear-gradient-[0deg,transparent,transparent_2px,rgba(0,240,255,0.05)_2px,rgba(0,240,255,0.05)_4px] pointer-events-none" />

      <div className="flex items-center justify-around px-2 py-2 relative pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.id;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.id}
              className="relative flex-1 flex flex-col items-center justify-center py-2 tap-highlight-transparent"
            >
              <div className="relative flex flex-col items-center z-10">
                {/* Icon Container with angular hover/active state */}
                <motion.div
                  animate={{ 
                    y: isActive ? -4 : 0,
                    scale: isActive ? 1.1 : 1
                  }}
                  transition={{ type: 'tween', duration: 0.15 }}
                  className={cn(
                    'p-2 mb-1 transition-colors duration-200 relative',
                    isActive ? 'text-cp-cyan' : 'text-cp-dim hover:text-cp-text'
                  )}
                >
                  {/* Aggressive active background box */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-bg"
                      className="absolute inset-0 bg-cp-cyan/10 border border-cp-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)_inset] clip-angled"
                      transition={{ type: 'tween', duration: 0.2 }}
                    />
                  )}
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                  
                  {/* Glitch icon effect when active */}
                  {isActive && (
                    <Icon size={24} strokeWidth={2.5} className="absolute inset-0 m-auto text-cp-magenta opacity-50 translate-x-[2px] animate-pulse z-0 pointer-events-none" />
                  )}
                </motion.div>

                <span
                  className={cn(
                    'font-cyber text-[9px] font-bold tracking-widest transition-colors duration-200',
                    isActive ? 'text-cp-cyan drop-shadow-[0_0_4px_rgba(0,240,255,0.8)]' : 'text-cp-dim'
                  )}
                >
                  {item.label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
