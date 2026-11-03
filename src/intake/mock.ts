import type { DropBuddyOrder } from '../domain/types'
import type { DocumentScanner, IntakeResult, OcrEngine, OrderExtractor, ScanCapture } from './pipeline'

/** In-memory queue so we can later drop sample receipt images into a folder/API. */
export class MockDocumentScanner implements DocumentScanner {
  private queue: ScanCapture[] = []

  enqueue(capture: ScanCapture) {
    this.queue.push(capture)
  }

  async listPending(): Promise<ScanCapture[]> {
    return [...this.queue]
  }

  async acknowledge(scanId: string): Promise<void> {
    this.queue = this.queue.filter((s) => s.id !== scanId)
  }
}

export class StubOcrEngine implements OcrEngine {
  async extractText(scan: ScanCapture) {
    return {
      scanId: scan.id,
      text: `[stub OCR for ${scan.imageRef}]`,
      confidence: 0,
    }
  }
}

export class StubOrderExtractor implements OrderExtractor {
  async extract(ocr: { scanId: string; text: string }): Promise<IntakeResult> {
    const now = Date.now()
    const order: DropBuddyOrder = {
      id: `ORD-INTAKE-${ocr.scanId}`,
      deliveryAddressText: 'Address pending OCR/LLM',
      items: [{ name: 'Unknown item', quantity: 1 }],
      orderedAt: now,
      status: 'intake',
      rawSource: { scanImageId: ocr.scanId, ocrText: ocr.text },
    }
    return {
      order,
      needsAdminReview: true,
      warnings: ['Stub extractor — wire OCR+LLM and sample receipts next'],
    }
  }
}
