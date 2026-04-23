/**
 * Lightweight client-side telemetry: posts timing markers to /api/telemetry
 * which logs them to Vercel runtime logs so we can diagnose where the cold
 * page-load time actually goes. Browser-only; no-ops on the server.
 *
 * Temporary diagnostic tool — remove once we've pinpointed and fixed the
 * slow phase.
 */

const SESSION_ID =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('__telemetry_session') ||
      (() => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
        window.sessionStorage.setItem('__telemetry_session', id);
        return id;
      })()
    : 'server';

export function recordTiming(
  phase: string,
  ms: number,
  extra?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      session: SESSION_ID,
      phase,
      ms: Math.round(ms),
      extra,
      pathname: window.location.pathname,
      ua: navigator.userAgent.slice(0, 80),
    });
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/**
 * Record browser navigation timing (TCP, TLS, HTML, DOM parse, etc.) once
 * the navigation is observable.
 */
export function recordNavigationTiming(): void {
  if (typeof window === 'undefined' || !window.performance) return;
  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!nav) return;
  recordTiming('nav.total', nav.loadEventEnd - nav.startTime, {
    ttfb: Math.round(nav.responseStart - nav.startTime),
    domContentLoaded: Math.round(
      nav.domContentLoadedEventEnd - nav.startTime,
    ),
    domInteractive: Math.round(nav.domInteractive - nav.startTime),
    type: nav.type,
  });
}
