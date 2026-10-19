/**
 * Hosts die server-side ophalen door de Next.js image-optimizer blokkeren of
 * rate-limiten (Wikimedia geeft 429 als de server veel thumbnails tegelijk
 * ophaalt). Voor deze URLs laten we de browser de afbeelding direct laden
 * via `<Image unoptimized />`.
 */
const BYPASS_OPTIMIZER_HOSTS = ['upload.wikimedia.org', 'commons.wikimedia.org'];

export function bypassImageOptimizer(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const host = new URL(src).hostname;
    return BYPASS_OPTIMIZER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
