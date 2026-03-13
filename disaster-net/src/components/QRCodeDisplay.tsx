import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  data: string;
  title: string;
  subtitle: string;
  complexity: 'low' | 'medium' | 'high' | 'too_large';
  onNext?: () => void;
  nextLabel?: string;
}

const COMPLEXITY_LABELS: Record<QRCodeDisplayProps['complexity'], { icon: string; text: string; color: string }> = {
  low:       { icon: '✅', text: 'Easy to scan',                          color: 'text-[var(--cp-green)]' },
  medium:    { icon: '✅', text: 'Should scan fine',                       color: 'text-[var(--cp-green)]' },
  high:      { icon: '⚠️', text: 'Move phone close — dense QR code',      color: 'text-[var(--cp-yellow)]' },
  too_large: { icon: '❌', text: 'QR code too large — connection may fail', color: 'text-[var(--cp-magenta)]' },
};

export function QRCodeDisplay({
  data,
  title,
  subtitle,
  complexity,
  onNext,
  nextLabel = 'Next',
}: QRCodeDisplayProps) {
  const badge = COMPLEXITY_LABELS[complexity];

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg border border-[var(--cp-cyan)]/30 bg-[var(--cp-panel)] p-6 animate-[qr-glow_3s_ease-in-out_infinite]"
      style={{
        boxShadow: '0 0 12px rgba(0,240,255,0.15), 0 0 24px rgba(0,240,255,0.08)',
      }}
    >
      {/* ---------- title ---------- */}
      <h2 className="text-center font-[var(--font-cyber)] text-lg font-bold tracking-wide text-[var(--cp-cyan)]">
        {title}
      </h2>

      {/* ---------- QR code ---------- */}
      <div className="rounded-lg bg-white p-3 animate-[qr-pulse_3s_ease-in-out_infinite]">
        <QRCodeSVG
          value={data}
          size={280}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* ---------- subtitle ---------- */}
      <p className="max-w-xs text-center text-sm text-[var(--cp-dim)]">
        {subtitle}
      </p>

      {/* ---------- complexity badge ---------- */}
      <span className={`text-sm font-medium ${badge.color}`}>
        {badge.icon} {badge.text}
      </span>

      {/* ---------- next button ---------- */}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="mt-1 w-full max-w-xs rounded border border-[var(--cp-cyan)] bg-[var(--cp-cyan)]/10 px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-[var(--cp-cyan)] transition-all hover:bg-[var(--cp-cyan)]/25 hover:shadow-[var(--shadow-neon-cyan)] active:scale-95"
        >
          {nextLabel}
        </button>
      )}

      {/* ---------- inline keyframes ---------- */}
      <style>{`
        @keyframes qr-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(0,240,255,0.2); }
          50%      { box-shadow: 0 0 20px rgba(0,240,255,0.45); }
        }
        @keyframes qr-glow {
          0%, 100% { border-color: rgba(0,240,255,0.3); }
          50%      { border-color: rgba(0,240,255,0.6); }
        }
      `}</style>
    </div>
  );
}
