import { isTauriRuntime } from './tauriInbox'
import type { OcrEngine, OcrResult, ScanCapture } from './pipeline'

/** Desktop: Homebrew tesseract (+ pdftoppm for PDFs) via Tauri. */
export class TauriTesseractOcrEngine implements OcrEngine {
  async extractText(scan: ScanCapture): Promise<OcrResult> {
    if (!isTauriRuntime()) {
      return {
        scanId: scan.id,
        text: '',
        confidence: 0,
      }
    }
    if (!scan.imageRef.startsWith('/') && !scan.imageRef.includes('DropBuddy/inbox')) {
      // Synthetic / browser-picked files without an absolute inbox path.
      return {
        scanId: scan.id,
        text: `[OCR skipped — no inbox path for ${scan.imageRef}]`,
        confidence: 0,
      }
    }
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{ text: string; confidence: number }>('ocr_inbox_file', {
      path: scan.imageRef,
    })
    return {
      scanId: scan.id,
      text: result.text,
      confidence: result.confidence,
    }
  }
}

export function createOcrEngine(): OcrEngine {
  if (isTauriRuntime()) return new TauriTesseractOcrEngine()
  return {
    async extractText(scan) {
      return {
        scanId: scan.id,
        text: '[OCR requires DropBuddy desktop app with tesseract + poppler]',
        confidence: 0,
      }
    },
  }
}
