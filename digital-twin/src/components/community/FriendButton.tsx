import { useEffect, useState } from 'react';
import { acceptFriend, declineFriend, removeFriend, sendFriendRequest } from '../../data/remote/friendsApi';
import type { FriendStatus } from '../../types';

interface FriendButtonProps {
  handle: string;
  status: FriendStatus;
  onChange?: (status: FriendStatus) => void;
}

const base = 'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60';
const primary = `${base} bg-[#007bff] text-white hover:bg-[#0056b3]`;
const quiet = `${base} border border-hud-borderLight bg-hud-panel text-hud-text hover:bg-hud-panel2`;

/** One button for every stage of a friendship: add, requested, respond, friends. */
export function FriendButton({ handle, status: initial, onChange }: FriendButtonProps) {
  const [status, setStatus] = useState<FriendStatus>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setStatus(initial), [initial]);

  const run = async (action: () => Promise<FriendStatus | void>, next: FriendStatus) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      const resolved = result ?? next;
      setStatus(resolved);
      onChange?.(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {status === 'none' && (
        <button type="button" disabled={busy} className={primary} onClick={() => run(async () => (await sendFriendRequest(handle)).status, 'requested')}>
          ＋ Add friend
        </button>
      )}
      {status === 'requested' && (
        <>
          <span className="text-xs font-medium text-hud-muted">Request sent</span>
          <button type="button" disabled={busy} className={quiet} onClick={() => run(async () => { await removeFriend(handle); }, 'none')}>
            Cancel
          </button>
        </>
      )}
      {status === 'incoming' && (
        <>
          <button type="button" disabled={busy} className={primary} onClick={() => run(async () => { await acceptFriend(handle); }, 'friends')}>
            Accept
          </button>
          <button type="button" disabled={busy} className={quiet} onClick={() => run(async () => { await declineFriend(handle); }, 'none')}>
            Not now
          </button>
        </>
      )}
      {status === 'friends' && (
        <>
          <span className="rounded-full bg-hud-green/10 px-2.5 py-1 text-xs font-semibold text-hud-green">✓ Friends</span>
          <button type="button" disabled={busy} className="text-xs text-hud-muted hover:underline" onClick={() => run(async () => { await removeFriend(handle); }, 'none')}>
            Remove
          </button>
        </>
      )}
      {error && (
        <span role="alert" className="text-xs text-hud-red">
          {error}
        </span>
      )}
    </span>
  );
}
