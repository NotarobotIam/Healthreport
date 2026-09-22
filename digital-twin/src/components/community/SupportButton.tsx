import { useState } from 'react';
import { toggleSupport } from '../../data/remote/communityApi';

interface SupportButtonProps {
  kind: 'threads' | 'replies';
  id: string;
  supported: boolean;
  count: number;
  disabled?: boolean;
}

/** "I relate" — the low-effort way to say "me too" without adding a reply. */
export function SupportButton({ kind, id, supported: initial, count: initialCount, disabled }: SupportButtonProps) {
  const [supported, setSupported] = useState(initial);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setBusy(true);
    try {
      const res = await toggleSupport(kind, id);
      setSupported(res.supported);
      setCount(res.supportCount);
    } catch {
      // A failed reaction isn't worth interrupting the reader; the count just doesn't change.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled || busy}
      aria-pressed={supported}
      title={disabled ? "You can't react to your own post" : 'I relate to this'}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        supported ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-muted hover:bg-hud-panel2'
      }`}
    >
      {supported ? '♥' : '♡'} I relate{count > 0 ? ` · ${count}` : ''}
    </button>
  );
}
