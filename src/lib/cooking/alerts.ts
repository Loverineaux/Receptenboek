/** Browser-only helpers for cook mode: timer alerts and speech. All calls fail soft. */

let audioCtx: AudioContext | null = null;

/** Call from a user gesture (timer start) so the beep is allowed later. */
export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {}
}

export function playBeep(): void {
  try {
    primeAudio();
    const ctx = audioCtx;
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    [0, 0.32, 0.64].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.25);
    });
  } catch {}
}

export function vibrateDone(): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate([250, 120, 250, 120, 250]);
  } catch {}
}

export function requestNotificationPermission(): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {}
}

export function notifyTimerDone(title: string, body: string): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: 'cook-timer' });
    }
  } catch {}
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, onEnd: () => void): void {
  if (!canSpeak()) return onEnd();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL';
    u.onend = onEnd;
    u.onerror = onEnd;
    window.speechSynthesis.speak(u);
  } catch {
    onEnd();
  }
}

export function stopSpeaking(): void {
  try {
    if (canSpeak()) window.speechSynthesis.cancel();
  } catch {}
}
