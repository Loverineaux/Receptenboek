import { supabaseAdmin } from '@/lib/supabase/admin';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const IMAGE_TIMEOUT_MS = 15000;
const MIN_IMAGE_BYTES = 1024;

/**
 * Download an external recipe image and persist it in Supabase Storage.
 * Needed for sources with hotlink protection (Cloudflare, Jetpack, etc.)
 * that block Next.js' image optimizer or the browser from loading the URL
 * directly — e.g. eefkooktzo.nl returns 403 for non-allowed origins.
 *
 * Returns the public Supabase URL on success, or null when the download /
 * upload fails (the caller should then keep the original URL as fallback).
 */
export async function uploadExternalImage(
  imageUrl: string,
  sourcePage?: string,
): Promise<string | null> {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;
  if (imageUrl.includes('/storage/v1/object/public/')) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'User-Agent': CHROME_UA,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
    };
    if (sourcePage) {
      try {
        headers.Referer = new URL(sourcePage).origin + '/';
      } catch {}
    }

    const res = await fetch(imageUrl, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!res.ok) {
      console.log(`[ImageUpload] Fetch ${res.status} for ${imageUrl}`);
      return null;
    }

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!contentType.startsWith('image/')) {
      console.log(`[ImageUpload] Not an image (${contentType}) at ${imageUrl}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < MIN_IMAGE_BYTES) {
      console.log(`[ImageUpload] Image too small (${buffer.byteLength} bytes) at ${imageUrl}`);
      return null;
    }

    const ext = contentType.split('/')[1] || 'jpg';
    const path = `recipes/extracted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from('recipe-images')
      .upload(path, buffer, { contentType, upsert: true });
    if (upErr) {
      console.log('[ImageUpload] Storage upload failed:', upErr.message);
      return null;
    }

    const { data } = supabaseAdmin.storage.from('recipe-images').getPublicUrl(path);
    console.log(`[ImageUpload] Stored ${Math.round(buffer.byteLength / 1024)}KB → ${data.publicUrl}`);
    return data.publicUrl;
  } catch (err: any) {
    console.log('[ImageUpload] Error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
