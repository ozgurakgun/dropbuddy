import { useMemo, useRef, useState } from 'react'
import type { DropBuddyOrder } from '../domain/types'
import { MockDocumentScanner, StubOcrEngine, StubOrderExtractor } from './mock'
import { runIntakePipeline, type IntakeResult, type ScanCapture } from './pipeline'

type Props = {
  onOrdersIngested: (orders: DropBuddyOrder[]) => void
}

type QueuedScan = ScanCapture & { previewUrl?: string; fileName: string }

/**
 * Epson ES-50 (and similar) save into ~/DropBuddy/inbox via Epson Scan 2.
 * This panel imports those files into the stub OCR+LLM pipeline.
 */
export function IntakePanel({ onOrdersIngested }: Props) {
  const scanner = useMemo(() => new MockDocumentScanner(), [])
  const ocr = useMemo(() => new StubOcrEngine(), [])
  const extractor = useMemo(() => new StubOrderExtractor(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedScan[]>([])
  const [log, setLog] = useState<IntakeResult[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const refreshQueue = async () => {
    const pending = await scanner.listPending()
    setQueue((prev) => {
      const byId = new Map(prev.map((q) => [q.id, q]))
      return pending.map((p) => {
        const existing = byId.get(p.id)
        return {
          ...p,
          fileName: existing?.fileName ?? p.imageRef.split('/').pop() ?? p.id,
          previewUrl: existing?.previewUrl,
        }
      })
    })
  }

  const enqueueFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
    for (const file of list) {
      const id = `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      const capture: ScanCapture = {
        id,
        capturedAt: Date.now(),
        imageRef: file.name,
        mimeType: file.type || 'application/octet-stream',
      }
      scanner.enqueue(capture)
      setQueue((prev) => [...prev, { ...capture, fileName: file.name, previewUrl }])
    }
    await refreshQueue()
  }

  const enqueueSynthetic = () => {
    const id = `scan-${Date.now()}`
    scanner.enqueue({
      id,
      capturedAt: Date.now(),
      imageRef: `sample-receipts/${id}.jpg`,
      mimeType: 'image/jpeg',
    })
    setQueue((prev) => [
      ...prev,
      {
        id,
        capturedAt: Date.now(),
        imageRef: `sample-receipts/${id}.jpg`,
        mimeType: 'image/jpeg',
        fileName: `${id}.jpg`,
      },
    ])
  }

  const processQueue = async () => {
    setBusy(true)
    try {
      const results = await runIntakePipeline(scanner, ocr, extractor)
      setLog((prev) => [...results, ...prev].slice(0, 20))
      onOrdersIngested(results.map((r) => ({ ...r.order, status: 'pending' })))
      setQueue([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intake-panel">
      <h2>Intake — Epson ES-50 slips</h2>
      <p className="muted">
        Scan with <strong>Epson Scan 2</strong> into <code>~/DropBuddy/inbox</code>, then add those files here.
        OCR+LLM is still stubbed; images are queued for the real pipeline next. See{' '}
        <code>docs/scanner-es50.md</code>.
      </p>

      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files?.length) void enqueueFiles(e.dataTransfer.files)
        }}
      >
        <p>Drop scanned receipt images here</p>
        <div className="inline-form">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Add scanned files…
          </button>
          <button type="button" onClick={enqueueSynthetic}>
            Enqueue synthetic slip
          </button>
          <button type="button" onClick={processQueue} disabled={busy || queue.length === 0}>
            {busy ? 'Processing…' : `Run OCR+LLM stub (${queue.length})`}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void enqueueFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {queue.length > 0 && (
        <>
          <h3>Queued scans</h3>
          <ul className="scan-queue">
            {queue.map((item) => (
              <li key={item.id}>
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.fileName} className="scan-thumb" />
                ) : (
                  <span className="scan-thumb placeholder">PDF</span>
                )}
                <span>
                  <strong>{item.fileName}</strong>
                  <br />
                  <span className="muted">{new Date(item.capturedAt).toLocaleTimeString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Processed</h3>
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
