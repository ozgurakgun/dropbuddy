import { useEffect, useMemo, useRef, useState } from 'react'
import type { DropBuddyOrder } from '../domain/types'
import { MockDocumentScanner, StubOcrEngine, StubOrderExtractor } from './mock'
import { runIntakePipeline, type IntakeResult, type ScanCapture } from './pipeline'
import {
  ensureInboxPath,
  inboxFileToScanCapture,
  isTauriRuntime,
  listInboxFiles,
  listenInboxFiles,
  openInboxFolder,
  openScannerApp,
  type InboxFileInfo,
} from './tauriInbox'

type Props = {
  onOrdersIngested: (orders: DropBuddyOrder[]) => void
}

type QueuedScan = ScanCapture & { previewUrl?: string; fileName: string }

/**
 * Epson ES-50 → Epson Scan 2 → ~/DropBuddy/inbox.
 * In the macOS (Tauri) app, new files are auto-queued. In the browser, use file picker / drop.
 */
export function IntakePanel({ onOrdersIngested }: Props) {
  const scanner = useMemo(() => new MockDocumentScanner(), [])
  const ocr = useMemo(() => new StubOcrEngine(), [])
  const extractor = useMemo(() => new StubOrderExtractor(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const seenPaths = useRef(new Set<string>())
  const desktop = useMemo(() => isTauriRuntime(), [])
  const [inboxPath, setInboxPath] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueuedScan[]>([])
  const [log, setLog] = useState<IntakeResult[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('')

  const enqueueCapture = (capture: QueuedScan) => {
    const key = capture.imageRef
    if (seenPaths.current.has(key)) return
    seenPaths.current.add(key)
    scanner.enqueue(capture)
    setQueue((prev) => [...prev, capture])
  }

  useEffect(() => {
    if (!desktop) return

    let cancelled = false
    let unlisten: (() => void) | undefined

    const importInboxFile = async (file: InboxFileInfo) => {
      try {
        const capture = await inboxFileToScanCapture(file)
        if (cancelled) return
        enqueueCapture(capture)
      } catch (err) {
        if (!cancelled) setStatus(err instanceof Error ? err.message : String(err))
      }
    }

    void (async () => {
      try {
        const path = await ensureInboxPath()
        if (cancelled) return
        setInboxPath(path)
        setStatus(path ? `Watching ${path}` : 'Inbox unavailable')
        const existing = await listInboxFiles()
        for (const file of existing) {
          await importInboxFile(file)
        }
        unlisten = await listenInboxFiles((file) => {
          void importInboxFile(file)
        })
      } catch (err) {
        if (!cancelled) setStatus(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      cancelled = true
      unlisten?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only desktop inbox bootstrap
  }, [desktop])

  const enqueueFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
    for (const file of list) {
      const id = `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      enqueueCapture({
        id,
        capturedAt: Date.now(),
        imageRef: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        previewUrl,
      })
    }
  }

  const enqueueSynthetic = () => {
    const id = `scan-${Date.now()}`
    enqueueCapture({
      id,
      capturedAt: Date.now(),
      imageRef: `sample-receipts/${id}.jpg`,
      mimeType: 'image/jpeg',
      fileName: `${id}.jpg`,
    })
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

  const refreshInbox = async () => {
    const files = await listInboxFiles()
    for (const file of files) {
      try {
        const capture = await inboxFileToScanCapture(file)
        enqueueCapture(capture)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err))
      }
    }
  }

  return (
    <section className="intake-panel">
      <h2>Intake — Epson ES-50 slips</h2>
      <p className="muted">
        {desktop ? (
          <>
            DropBuddy watches <code>{inboxPath ?? '~/DropBuddy/inbox'}</code> — it does not drive the USB
            scanner. Use <strong>Image Capture</strong> (Epson ES-50 ICA driver) to scan into that folder.
          </>
        ) : (
          <>
            Browser mode: scan into <code>~/DropBuddy/inbox</code>, then add files here. For auto-import, run the
            macOS app (<code>npm run desktop:dev</code>). See <code>docs/scanner-es50.md</code>.
          </>
        )}
      </p>
      {status && <p className="muted">{status}</p>}

      {desktop && (
        <div className="inline-form">
          <button
            type="button"
            onClick={() => {
              void openScannerApp()
                .then((msg) => setStatus(msg))
                .catch((err: unknown) => setStatus(err instanceof Error ? err.message : String(err)))
            }}
          >
            Open Image Capture (scan)
          </button>
          <button
            type="button"
            onClick={() => {
              void openInboxFolder()
                .then((path) => setStatus(`Inbox: ${path}`))
                .catch((err: unknown) => setStatus(err instanceof Error ? err.message : String(err)))
            }}
          >
            Open inbox folder
          </button>
          <button type="button" onClick={() => void refreshInbox()}>
            Refresh inbox
          </button>
        </div>
      )}

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
