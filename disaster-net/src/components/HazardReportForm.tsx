import React, { useState, useEffect } from 'react';
import { addHazard } from '../db/repository';
import { useIdentity } from '../hooks/useIdentity';
import type { HazardReport } from '../types';

interface HazardReportFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'collapsed_building', icon: '🏚️', label: 'Collapsed' },
  { id: 'blocked_road', icon: '🚧', label: 'Blocked' },
  { id: 'fire', icon: '🔥', label: 'Fire' },
  { id: 'flood', icon: '🌊', label: 'Flood' },
  { id: 'medical', icon: '🏥', label: 'Medical' },
  { id: 'resource', icon: '📦', label: 'Resource' },
  { id: 'other', icon: '⚠️', label: 'Other' },
] as const;

const SEVERITIES = [
  { id: 'low', label: 'LOW', colorClass: 'bg-[var(--color-safe)] text-white' },
  { id: 'medium', label: 'MEDIUM', colorClass: 'bg-amber-500 text-white' },
  { id: 'high', label: 'HIGH', colorClass: 'bg-orange-500 text-white' },
  { id: 'critical', label: 'CRITICAL', colorClass: 'bg-[var(--color-accent)] text-white animate-pulse' },
] as const;

export function HazardReportForm({ onClose, onSuccess }: HazardReportFormProps) {
  const { identity } = useIdentity();
  
  const [category, setCategory] = useState<HazardReport['category'] | null>(null);
  const [severity, setSeverity] = useState<HazardReport['severity'] | null>(null);
  const [description, setDescription] = useState('');
  
  const [isLocating, setIsLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bottom sheet animation state
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Trigger slide up animation
    requestAnimationFrame(() => setIsOpen(true));

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation failed in hazard form', err);
          setLocationError(true);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError(true);
      setIsLocating(false);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for slide down transition
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !severity || !description.trim() || !identity) return;

    setIsSubmitting(true);
    try {
      const hazard: HazardReport = {
        category,
        severity,
        description: description.trim(),
        latitude: coords?.lat || 0, // Fallbacks applied if no coords
        longitude: coords?.lng || 0,
        reportedBy: identity.id,
        timestamp: Date.now(),
        synced: false
      };

      await addHazard(hazard);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to save hazard', err);
      // Could show local error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = category && severity && description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={handleClose} 
      />

      {/* Bottom Sheet */}
      <div 
        className={`relative w-full max-w-md mx-auto h-[85vh] flex flex-col rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out`}
        style={{ 
          backgroundColor: 'var(--color-bg)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle & Header */}
        <div className="flex-shrink-0 pt-4 pb-2 px-6 flex flex-col items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-t-3xl">
          <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full mb-4" />
          <div className="w-full flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Report Hazard</h2>
            <button 
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Category */}
          <div>
            <label className="block text-sm font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
              1. Type of Hazard
            </label>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as HazardReport['category'])}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-[var(--color-surface-2)] border-[var(--color-info)] shadow-md' 
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-2xl mb-1">{cat.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
              2. Severity Level
            </label>
            <div className="flex gap-2">
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev.id;
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSeverity(sev.id as HazardReport['severity'])}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                      isSelected 
                        ? `${sev.colorClass} border-transparent shadow-lg scale-105` 
                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
                    }`}
                  >
                    {sev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
              3. Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the hazard in detail..."
              className="w-full h-28 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl p-4 resize-none outline-none focus:ring-2 focus:ring-[var(--color-info)]"
            />
          </div>

          {/* Location Status */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] mb-4">
            <div className="flex items-center gap-3">
              {isLocating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--color-info)] border-t-transparent" />
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">Acquiring GPS location...</span>
                </>
              ) : coords ? (
                <>
                  <span className="text-[var(--color-info)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium font-mono text-[var(--color-text-muted)]">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                </>
              ) : locationError ? (
                <>
                  <span className="text-[var(--color-accent-2)]">⚠️</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">
                    Location unavailable — report will be saved without coordinates.
                  </span>
                </>
              ) : null}
            </div>
          </div>

        </form>
        
        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-8 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full py-4 rounded-xl font-bold bg-[var(--color-accent)] text-white text-lg disabled:opacity-50 transition-transform active:scale-95"
          >
            {isSubmitting ? 'SAVING...' : 'REPORT HAZARD'}
          </button>
        </div>
      </div>
    </div>
  );
}
