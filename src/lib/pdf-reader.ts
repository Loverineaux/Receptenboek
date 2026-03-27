/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Runs in the browser where pdfjs-dist works correctly.
 */

let pdfjsLib: any = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

export interface PdfPage {
  pageNum: number;
  text: string;
}

/**
 * Extract text from each page of a PDF file.
 * @param file The PDF File object from an <input type="file">
 * @param onProgress Optional callback with (currentPage, totalPages)
 */
export async function extractPdfText(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfPage[]> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Reconstruct text with line breaks based on Y position changes
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
      pages.push({ pageNum: i, text: trimmed });
    }
  }

  return pages;
}
