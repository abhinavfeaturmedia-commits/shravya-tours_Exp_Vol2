/**
 * PDF Text Extraction Utility
 * Extracts readable, structured text from uploaded PDF files directly in the browser
 * using PDF.js with automatic CDN script loading.
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLoadingPromise: Promise<any> | null = null;

/**
 * Dynamically loads PDF.js library into the browser window if not already present.
 */
export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction is only supported in browser environments.');
  }

  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  if (pdfjsLoadingPromise) {
    return pdfjsLoadingPromise;
  }

  pdfjsLoadingPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector(`script[src="${PDFJS_CDN_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js script loaded but window.pdfjsLib is undefined.'));
        }
      });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF.js from CDN.')));
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js script loaded but window.pdfjsLib is not available.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN. Please check your internet connection.'));
    document.head.appendChild(script);
  });

  return pdfjsLoadingPromise;
}

export interface ExtractedPdfData {
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  fileName: string;
}

/**
 * Extracts plain text from a user-uploaded PDF file or ArrayBuffer.
 * Reconstructs lines based on geometric Y-positions to keep headers, bullet points, and tables legible.
 */
export async function extractTextFromPdf(file: File): Promise<ExtractedPdfData> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const pages: Array<{ pageNumber: number; text: string }> = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by approximate vertical line (y-coordinate)
    const items = textContent.items || [];
    if (items.length === 0) {
      pages.push({ pageNumber: i, text: '' });
      continue;
    }

    // Sort items top-to-bottom, then left-to-right
    // PDF coordinates: origin (0,0) is bottom-left, so higher Y means higher on page
    const sortedItems = [...items].sort((a: any, b: any) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      if (Math.abs(yA - yB) > 4) {
        return yB - yA; // top to bottom
      }
      const xA = a.transform ? a.transform[4] : 0;
      const xB = b.transform ? b.transform[4] : 0;
      return xA - xB; // left to right
    });

    const lines: string[] = [];
    let currentLineY: number | null = null;
    let currentLineTokens: string[] = [];

    sortedItems.forEach((item: any) => {
      const str = (item.str || '').trim();
      if (!str) return;

      const y = item.transform ? item.transform[5] : 0;
      if (currentLineY === null || Math.abs(currentLineY - y) <= 4) {
        currentLineTokens.push(str);
        if (currentLineY === null) currentLineY = y;
      } else {
        lines.push(currentLineTokens.join(' '));
        currentLineTokens = [str];
        currentLineY = y;
      }
    });

    if (currentLineTokens.length > 0) {
      lines.push(currentLineTokens.join(' '));
    }

    const pageText = lines.join('\n').trim();
    pages.push({ pageNumber: i, text: pageText });
  }

  // Combine all pages with boundary markers
  const fullText = pages
    .map(p => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
    .join('\n\n');

  return {
    text: fullText,
    pageCount,
    pages,
    fileName: file.name
  };
}

/**
 * Converts a File to Base64 data URL string for multimodal AI models (e.g. Gemini).
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
