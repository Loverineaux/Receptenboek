'use client';

import { useEffect, useState } from 'react';

/** Keeps the screen awake; re-acquires after the tab becomes visible again. Returns whether a lock is held. */
export function useWakeLock(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let lock: any = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        if (lock && !lock.released) return;
        const l = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          l.release().catch(() => {});
          return;
        }
        lock = l;
        setActive(true);
        l.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch?.(() => {});
    };
  }, []);

  return active;
}
