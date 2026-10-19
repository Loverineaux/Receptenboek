'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playBeep, primeAudio, requestNotificationPermission, vibrateDone } from '@/lib/cooking/alerts';

interface TimerState {
  /** Epoch ms when the timer ends; null when paused/finished. */
  endAt: number | null;
  /** Remaining ms while paused (0 = finished). */
  leftMs: number;
}

/**
 * Per-step countdown timers. Time is derived from an end timestamp, so it stays
 * correct when the tab/app is backgrounded. Running timers survive step changes;
 * stopped ones reset to the step duration.
 */
export function useCookTimers(currentStep: number, onDone: (stepIndex: number) => void) {
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState('');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const askedPermission = useRef(false);

  const anyRunning = Object.values(timers).some((t) => t.endAt !== null);

  // Tick (UI refresh only; the truth is endAt)
  useEffect(() => {
    if (!anyRunning) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [anyRunning]);

  // Detect finished timers
  useEffect(() => {
    const finished = Object.entries(timers).filter(([, t]) => t.endAt !== null && t.endAt <= now);
    if (finished.length === 0) return;
    setTimers((prev) => {
      const next = { ...prev };
      for (const [k] of finished) next[Number(k)] = { endAt: null, leftMs: 0 };
      return next;
    });
    for (const [k] of finished) {
      playBeep();
      vibrateDone();
      onDoneRef.current(Number(k));
    }
  }, [now, timers]);

  // Leaving a step resets its stopped timer to the full duration
  useEffect(() => {
    setTimers((prev) => {
      const entries = Object.entries(prev).filter(([, t]) => t.endAt !== null);
      return entries.length === Object.keys(prev).length
        ? prev
        : Object.fromEntries(entries.map(([k, t]) => [Number(k), t]));
    });
  }, [currentStep]);

  const remainingSeconds = useCallback(
    (step: number, totalSeconds: number) => {
      const t = timers[step];
      if (!t) return totalSeconds;
      if (t.endAt !== null) return Math.ceil(Math.max(0, t.endAt - now) / 1000);
      return Math.ceil(t.leftMs / 1000);
    },
    [timers, now]
  );

  const isRunning = useCallback((step: number) => timers[step]?.endAt != null, [timers]);

  const toggle = useCallback((step: number, totalSeconds: number) => {
    primeAudio();
    if (!askedPermission.current) {
      askedPermission.current = true;
      requestNotificationPermission();
    }
    const t0 = Date.now();
    setNow(t0);
    setTimers((prev) => {
      const t = prev[step];
      if (!t || (t.endAt === null && t.leftMs <= 0)) {
        setAnnouncement('Timer gestart');
        return { ...prev, [step]: { endAt: t0 + totalSeconds * 1000, leftMs: totalSeconds * 1000 } };
      }
      if (t.endAt !== null) {
        setAnnouncement('Timer gepauzeerd');
        return { ...prev, [step]: { endAt: null, leftMs: Math.max(0, t.endAt - t0) } };
      }
      setAnnouncement('Timer hervat');
      return { ...prev, [step]: { endAt: t0 + t.leftMs, leftMs: t.leftMs } };
    });
  }, []);

  const runningSteps = Object.entries(timers)
    .filter(([, t]) => t.endAt !== null)
    .map(([k]) => Number(k));

  return { remainingSeconds, isRunning, toggle, runningSteps, announcement, announce: setAnnouncement };
}
