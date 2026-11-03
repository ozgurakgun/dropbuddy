import type { DropBuddyOrder } from '../domain/types'

/**
 * Scanner → OCR → LLM → DropBuddy order.
 * Groundwork: interfaces + mock only. Wire real OCR/LLM in a later phase.
 */

export type ScanCapture = {
  id: string
  capturedAt: number
  /** Local path, object-storage key, or data URL for prototypes. */
  imageRef: string
  mimeType: string
}

export type OcrResult = {
  scanId: string
  text: string
  confidence: number
}

export type IntakeResult = {
  order: DropBuddyOrder
  needsAdminReview: boolean
  warnings: string[]
}

export interface DocumentScanner {
  /** Poll or push new slip images. */
  listPending(): Promise<ScanCapture[]>
  acknowledge(scanId: string): Promise<void>
}

export interface OcrEngine {
  extractText(scan: ScanCapture): Promise<OcrResult>
}

export interface OrderExtractor {
  /** LLM (or rules) maps OCR text into DropBuddyOrder fields. */
  extract(ocr: OcrResult): Promise<IntakeResult>
}

export async function runIntakePipeline(
  scanner: DocumentScanner,
  ocr: OcrEngine,
  extractor: OrderExtractor,
): Promise<IntakeResult[]> {
  const pending = await scanner.listPending()
  const results: IntakeResult[] = []
  for (const scan of pending) {
    const ocrResult = await ocr.extractText(scan)
    const intake = await extractor.extract(ocrResult)
    results.push(intake)
    await scanner.acknowledge(scan.id)
  }
  return results
}
