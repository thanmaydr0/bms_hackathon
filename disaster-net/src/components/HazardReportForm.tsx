import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { addHazard } from '../db/repository';
import { useIdentity } from '../hooks/useIdentity';
import type { HazardReport } from '../types';
import { cn } from '../lib/utils';
import { getCurrentPositionSafe } from '../lib/geolocation';

interface HazardReportFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCoords?: { lat: number; lng: number };
}

const CATEGORIES = [
  { id: 'collapsed_building', icon: '🏚', label: 'STRUC_FAIL' },
  { id: 'blocked_road',       icon: '🚧', label: 'PATH_BLOCK' },
  { id: 'fire',               icon: '🔥', label: 'THERMAL' },
  { id: 'flood',              icon: '🌊', label: 'LIQUID' },
  { id: 'medical',            icon: '🏥', label: 'BIO_MED' },
  { id: 'resource',           icon: '📦', label: 'SUPPLY' },
  { id: 'other',              icon: '⚠️', label: 'ANOMALY' },
] as const;

const SEVERITIES = [
  { id: 'low',      label: 'LVL:1', color: 'var(--cp-green)',  text: 'var(--cp-void)' },
  { id: 'medium',   label: 'LVL:2', color: 'var(--cp-cyan)',   text: 'var(--cp-void)' },
  { id: 'high',     label: 'LVL:3', color: 'var(--cp-yellow)', text: 'var(--cp-void)' },
  { id: 'critical', label: 'CRIT!', color: 'var(--cp-magenta)',text: 'var(--cp-text)' },
] as const;

export function HazardReportForm({ onClose, onSuccess, initialCoords }: HazardReportFormProps) {
  const { identity } = useIdentity();

  const [category, setCategory] = useState<HazardReport['category'] | null>(null);
  const [severity, setSeverity] = useState<HazardReport['severity'] | null>(null);
  const [description, setDescription] = useState('');
  const [isLocating, setIsLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
    
    if (initialCoords) {
      setCoords(initialCoords);
      setIsLocating(false);
    } else {
      getCurrentPositionSafe().then((pos) => {
        if (pos) {
          setCoords({ lat: pos.latitude, lng: pos.longitude });
        } else {
          setLocationError(true);
        }
        setIsLocating(false);
      });
    }
  }, [initialCoords]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!category || !severity || !description.trim() || !identity) return;
    setIsSubmitting(true);

    try {
      const hazard: HazardReport = {
        category, severity,
        description: description.trim(),
        latitude: coords?.lat || 0,
        longitude: coords?.lng || 0,
        reportedBy: identity.id,
        timestamp: Date.now(),
        synced: false,
      };
      await addHazard(hazard);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to save hazard', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = category && severity && description.trim().length > 0;
  const activeSeverity = SEVERITIES.find(s => s.id === severity);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-cp-void/80 backdrop-blur-md pointer-events-auto"
        onClick={handleClose}
      />

      <div className="w-full h-full max-w-md mx-auto flex flex-col justify-end pointer-events-auto relative">
        {/* Cyber Panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isOpen ? 0 : '100%' }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          className="relative w-full h-[90%] flex flex-col bg-cp-base border-t-2 border-cp-border clip-angled-tl"
          style={{ borderColor: activeSeverity?.color ?? 'var(--cp-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="relative flex-shrink-0 px-5 pt-5 pb-3 bg-cp-panel border-b-2 border-cp-border shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-cp-magenta animate-pulse" />
                <span className="font-cyber font-bold text-[10px] tracking-[0.3em] text-cp-text uppercase">INJECT_ANOMALY</span>
              </div>
              <h2 className="font-cyber font-black text-xl text-cp-cyan">HAZARD NODE</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center border-2 border-cp-border text-cp-dim font-cyber text-2xl hover:text-cp-magenta hover:border-cp-magenta transition-none active:translate-y-[2px]"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 pb-24 flex flex-col gap-6 hide-scrollbar relative z-10">

          {/* Background watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-cyber font-black text-[10rem] text-cp-panel/40 pointer-events-none -z-10 select-none">
            !
          </div>

          {/* Category */}
          <div className="relative z-10">
            <label className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-cp-dim mb-3">
              <span className="text-cp-cyan">01</span> // TYPE
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as HazardReport['category'])}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 border-2 transition-none active:translate-y-[2px]',
                      isSelected
                        ? 'bg-cp-cyan/10 border-cp-cyan shadow-hard-cyan text-cp-cyan scale-105 z-10'
                        : 'bg-cp-base border-cp-border text-cp-dim hover:border-cp-text hover:text-cp-text'
                    )}
                  >
                    <span className="text-xl mb-1 grayscale">{cat.icon}</span>
                    <span className="font-mono font-bold text-[8px] text-center leading-tight tracking-wider uppercase">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div className="relative z-10">
            <label className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-cp-dim mb-3">
              <span className="text-cp-cyan">02</span> // THREAT_LVL
            </label>
            <div className="flex gap-2">
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev.id;
                const isCrit = sev.id === 'critical';
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSeverity(sev.id as HazardReport['severity'])}
                    className={cn(
                      'flex-1 py-3 font-cyber text-[12px] font-black tracking-widest border-2 transition-none clip-angled active:translate-y-[2px]',
                      isSelected
                        ? `border-transparent`
                        : 'bg-cp-base text-cp-dim border-cp-border hover:text-cp-text'
                    )}
                    style={isSelected ? { 
                      backgroundColor: sev.color, 
                      color: sev.text,
                      boxShadow: `4px 4px 0px ${sev.color}80` 
                    } : {}}
                  >
                    {isCrit && isSelected ? <span className="animate-pulse">{sev.label}</span> : sev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="relative z-10">
            <label className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-cp-dim mb-3">
              <span className="text-cp-cyan">03</span> // LOG_DATA
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ENTER ANOMALY DETAILS..."
              className="w-full h-28 bg-cp-void border-2 border-cp-border text-cp-text p-3 resize-none outline-none font-mono text-sm placeholder-cp-border focus:border-cp-cyan transition-none clip-angled"
            />
          </div>

          {/* Location status */}
          <div className="p-3 border-2 border-cp-border bg-cp-panel clip-angled relative z-10">
            <div className="flex items-center gap-3">
              {isLocating ? (
                <>
                  <div className="w-3 h-3 border-2 border-cp-yellow border-t-transparent animate-spin" />
                  <span className="font-mono text-[10px] font-bold text-cp-yellow tracking-widest">AQUIRING_GPS...</span>
                </>
              ) : coords ? (
                <>
                  <div className="w-2 h-2 bg-cp-cyan" />
                  <span className="font-mono text-[10px] font-bold text-cp-cyan tracking-widest">
                    LOC:{coords.lat.toFixed(4)},{coords.lng.toFixed(4)}
                  </span>
                </>
              ) : locationError ? (
                <>
                  <div className="w-2 h-2 bg-cp-magenta animate-pulse" />
                  <span className="font-mono text-[10px] font-bold text-cp-magenta tracking-widest">GPS_ERR_NO_FIX</span>
                </>
              ) : null}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 bg-cp-panel border-t-2 border-cp-border relative z-20">
          <button
            onClick={() => handleSubmit()}
            disabled={!isFormValid || isSubmitting}
            className="w-full py-4 font-cyber font-black text-xl tracking-[0.2em] uppercase transition-none border-2 border-transparent clip-angled active:translate-y-[2px] disabled:opacity-30 disabled:pointer-events-none"
            style={{
              backgroundColor: isFormValid ? (activeSeverity?.color ?? 'var(--cp-magenta)') : 'var(--cp-border)',
              color: isFormValid ? (activeSeverity?.text ?? 'var(--cp-void)') : 'var(--cp-dim)',
              boxShadow: isFormValid ? `4px 4px 0px ${activeSeverity?.color}40` : 'none'
            }}
          >
            {isSubmitting ? (
              <span className="animate-pulse">INJECTING...</span>
            ) : (
              'EXECUTE_LOG'
            )}
          </button>
        </div>
      </motion.div>
      </div>
    </div>,
    document.body
  );
}
