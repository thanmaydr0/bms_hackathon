import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface IdentitySetupProps {
  currentName: string;
  onSave: (name: string) => Promise<void>;
  onDismiss: () => void;
}

export function IdentitySetup({ currentName, onSave, onDismiss }: IdentitySetupProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onSave(trimmed);
      onDismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cp-void/90 backdrop-blur-sm crt-overlay"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15 }}
        className="w-full max-w-sm bg-cp-base border-2 border-cp-cyan clip-angled relative p-6 shadow-neon-cyan"
      >
        {/* Striped warning background */}
        <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(45deg,var(--cp-cyan),var(--cp-cyan)_10px,transparent_10px,transparent_20px)]" />

        <div className="mt-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-cp-yellow animate-glitch" />
            <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-cp-yellow">SYS_INIT_SEQ</span>
          </div>
          <h2 className="font-cyber font-black text-2xl text-cp-text uppercase drop-shadow-[2px_2px_0px_rgba(0,240,255,0.5)]">
            Identify Node
          </h2>
        </div>

        <p className="font-mono text-xs text-cp-text mb-6 border-l-2 border-cp-magenta pl-3 py-1 bg-cp-magenta/10">
          WARNING: Unidentified nodes face network hostility. Set a public alias immediately.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="display-name" className="block font-mono text-[10px] font-bold tracking-[0.2em] text-cp-cyan mb-2">
              &gt; INPUT_ALIAS
            </label>
            <div className="relative">
              <input
                id="display-name"
                type="text"
                autoComplete="off"
                maxLength={30}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ghost_Protocol"
                className="w-full px-4 py-3 bg-cp-void border-2 border-cp-border text-cp-text font-mono rounded-none outline-none placeholder-cp-border focus:border-cp-cyan transition-none clip-angled"
              />
              <div className="absolute top-1/2 right-3 -translate-y-1/2 w-2 h-4 bg-cp-cyan animate-pulse" />
            </div>
            
            <p className="font-mono text-[10px] text-cp-dim mt-2 tracking-widest uppercase">
              ASSIGNED_MAC: <span className="text-cp-magenta">{currentName}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-3 font-cyber font-bold text-xs tracking-widest text-cp-text border-2 border-cp-border hover:border-cp-text hover:bg-cp-text hover:text-cp-void transition-colors clip-angled"
            >
              SKIP
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 px-4 font-cyber font-black text-sm tracking-widest text-cp-void bg-cp-cyan border-2 border-cp-cyan disabled:opacity-40 disabled:bg-cp-border disabled:border-cp-border transition-none clip-angled active:translate-y-[2px]"
            >
              {isSubmitting ? '...' : 'LINK_NODE'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
