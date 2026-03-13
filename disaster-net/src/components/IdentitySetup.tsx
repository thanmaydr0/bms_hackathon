import React, { useState } from 'react';

interface IdentitySetupProps {
  currentName: string;
  onSave: (name: string) => Promise<void>;
  onDismiss: () => void;
}

export function IdentitySetup({ currentName, onSave, onDismiss }: IdentitySetupProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract the default generated part if it starts with Survivor_
  // If we decided to pre-fill, we'd do it here. For now, empty is cleaner.
  
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col border-t-4"
        style={{ 
          backgroundColor: 'var(--color-surface)', 
          borderColor: 'var(--color-accent)' 
        }}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2">Welcome to DisasterNet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Set your name so others can find you on the local network.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="display-name" className="block text-sm font-medium mb-1">
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                autoComplete="off"
                maxLength={30}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe (Medic)"
                className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all font-medium"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Your auto-generated name is: <span className="font-mono">{currentName}</span>
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-colors border"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex-1 py-3 px-4 rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                }}
              >
                Save Name
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
