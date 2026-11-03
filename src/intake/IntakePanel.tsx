import { useMemo, useState } from 'react'
import type { DropBuddyOrder } from '../domain/types'
import { MockDocumentScanner, StubOcrEngine, StubOrderExtractor } from './mock'
import { runIntakePipeline, type IntakeResult } from './pipeline'

type Props = {
  onOrdersIngested: (orders: DropBuddyOrder[]) => void
}

/**
 * Groundwork UI for scanner intake. Later: real scanner watcher + OCR/LLM.
 * For now: enqueue a fake slip and run the stub pipeline.
 */
export function IntakePanel({ onOrdersIngested }: Props) {
  const scanner = useMemo(() => new MockDocumentScanner(), [])
  const ocr = useMemo(() => new StubOcrEngine(), [])
  const extractor = useMemo(() => new StubOrderExtractor(), [])
  const [log, setLog] = useState<IntakeResult[]>([])
  const [busy, setBusy] = useState(false)

  const enqueueSample = () => {
    const id = `scan-${Date.now()}`
    scanner.enqueue({
      id,
      capturedAt: Date.now(),
      imageRef: `sample-receipts/${id}.jpg`,
      mimeType: 'image/jpeg',
    })
  }

  const processQueue = async () => {
    setBusy(true)
    try {
      const results = await runIntakePipeline(scanner, ocr, extractor)
      setLog((prev) => [...results, ...prev].slice(0, 20))
      onOrdersIngested(results.map((r) => ({ ...r.order, status: 'pending' })))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intake-panel">
      <h2>Intake — scanner slips</h2>
      <p className="muted">
        Order slips will come from a document scanner, then OCR + LLM into DropBuddy’s order format.
        This panel exercises the stub pipeline until sample receipts are wired in.
      </p>
      <div className="inline-form">
        <button type="button" onClick={enqueueSample}>
          Enqueue sample slip
        </button>
        <button type="button" onClick={processQueue} disabled={busy}>
          {busy ? 'Processing…' : 'Run OCR+LLM stub'}
        </button>
      </div>
      <ul className="prep-list">
        {log.map((r) => (
          <li key={r.order.id}>
            <strong>{r.order.id}</strong> — {r.order.items.map((i) => i.name).join(', ')}
            {r.needsAdminReview ? ' (needs review)' : ''}
            {r.warnings.length > 0 ? ` — ${r.warnings.join('; ')}` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}
