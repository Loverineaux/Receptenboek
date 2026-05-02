/**
 * Resize a user-uploaded photo down to a sensible size for Claude Vision.
 *
 * Modern phones take 12+ MP photos (4-10 MB JPEG, 6-14 MB after base64).
 * Anthropic's vision endpoint caps each image at ~5 MB after decoding;
 * anything bigger comes back with a fast 4xx that the user reads as
 * "recept kan niet worden geëxtraheerd". OCR-quality only needs ~1500-
 * 2000 px on the longest edge anyway, so we downscale before upload.
 *
 * Also re-encodes to JPEG since some phones produce HEIC/non-standard
 * formats that Anthropic doesn't accept.
 */
export async function shrinkImageForExtraction(
  file: File,
  maxDimension = 2000,
  jpegQuality = 0.85,
): Promise<{ data: string; media_type: 'image/jpeg' }> {
  if (typeof window === 'undefined') {
    throw new Error('shrinkImageForExtraction can only run in the browser');
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', jpegQuality),
    );
    if (!blob) throw new Error('Foto kon niet worden geconverteerd');
    const data = await blobToBase64(blob);
    return { data, media_type: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Foto kon niet worden geladen'));
    img.src = src;
  });
}

function scaleToFit(srcW: number, srcH: number, maxDim: number) {
  if (srcW <= maxDim && srcH <= maxDim) return { width: srcW, height: srcH };
  const ratio = srcW > srcH ? maxDim / srcW : maxDim / srcH;
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  // Process in chunks to avoid call-stack-size on big arrays
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[],
    );
  }
  return btoa(binary);
}
