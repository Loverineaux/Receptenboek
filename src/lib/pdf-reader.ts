/**
 * Client-side PDF text + image extraction using pdfjs-dist v4.
 */

export interface PdfPage {
  pageNum: number;
  text: string;
  image?: string; // base64 data URL of extracted recipe image
}

/**
 * Extract text and the largest image from each page of a PDF.
 */
export async function extractPdfText(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfPage[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);

    // Extract text
    const textContent = await page.getTextContent();
    let lastY: number | null = null;
    let text = "";
    for (const item of textContent.items) {
      const ti = item as any;
      if (lastY !== null && Math.abs(ti.transform[5] - lastY) > 5) {
        text += "\n";
      }
      text += ti.str;
      lastY = ti.transform[5];
    }

    const trimmed = text.trim();
    if (trimmed.length > 30) {
      // Extract the largest actual image from the page
      let image: string | undefined;
      try {
        image = await extractLargestImage(page);
      } catch {
        // Image extraction is best-effort
      }

      pages.push({ pageNum: i, text: trimmed, image });
    }
  }

  return pages;
}

/**
 * Extract the largest embedded image from a PDF page.
 * This gets the actual image data, not a screenshot of the page.
 */
async function extractLargestImage(page: any): Promise<string | undefined> {
  const ops = await page.getOperatorList();
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const OPS = pdfjsLib.OPS;

  // Collect image object names from the operator list
  const imageNames: string[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === OPS.paintImageXObject || ops.fnArray[i] === OPS.paintXObject) {
      const name = ops.argsArray[i]?.[0];
      if (name) imageNames.push(name);
    }
  }

  if (imageNames.length === 0) return undefined;

  // Get the actual image objects and find the largest one
  let largestImage: { width: number; height: number; data: Uint8ClampedArray } | null = null;
  let largestArea = 0;

  for (const name of imageNames) {
    try {
      const img = await page.objs.get(name);
      if (!img || !img.width || !img.height) continue;

      const area = img.width * img.height;
      // Skip tiny images (icons, bullets, etc.) - at least 100x100
      if (area < 10000) continue;

      if (area > largestArea) {
        largestArea = area;
        largestImage = img;
      }
    } catch {
      continue;
    }
  }

  if (!largestImage) return undefined;

  // Convert image data to canvas then to JPEG
  const canvas = document.createElement("canvas");
  canvas.width = largestImage.width;
  canvas.height = largestImage.height;
  const ctx = canvas.getContext("2d")!;

  // The image data from pdfjs can be in different formats
  const imgData = new ImageData(
    new Uint8ClampedArray(largestImage.data),
    largestImage.width,
    largestImage.height
  );
  ctx.putImageData(imgData, 0, 0);

  // Scale down if very large (max 800px wide)
  let dataUrl: string;
  if (largestImage.width > 800) {
    const scale = 800 / largestImage.width;
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = 800;
    smallCanvas.height = Math.round(largestImage.height * scale);
    const smallCtx = smallCanvas.getContext("2d")!;
    smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
    dataUrl = smallCanvas.toDataURL("image/jpeg", 0.75);
    smallCanvas.width = 0;
    smallCanvas.height = 0;
  } else {
    dataUrl = canvas.toDataURL("image/jpeg", 0.75);
  }

  // Clean up
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}
