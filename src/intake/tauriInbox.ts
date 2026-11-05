import type { ScanCapture } from './pipeline'

export type InboxFileInfo = {
  name: string
  path: string
  modifiedMs: number
  size: number
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function ensureInboxPath(): Promise<string | null> {
  if (!isTauriRuntime()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('ensure_inbox')
}

export async function listInboxFiles(): Promise<InboxFileInfo[]> {
  if (!isTauriRuntime()) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<InboxFileInfo[]>('list_inbox_files')
}

export async function readInboxFileAsDataUrl(path: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('read_inbox_file', { path })
}

export async function inboxFileToScanCapture(file: InboxFileInfo): Promise<ScanCapture & { previewUrl?: string; fileName: string }> {
  const dataUrl = await readInboxFileAsDataUrl(file.path)
  const mime = dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg'
  return {
    id: `scan-file-${file.modifiedMs}-${file.name}`,
    capturedAt: file.modifiedMs || Date.now(),
    imageRef: file.path,
    mimeType: mime,
    previewUrl: mime.startsWith('image/') ? dataUrl : undefined,
    fileName: file.name,
  }
}

export async function listenInboxFiles(
  onFile: (file: InboxFileInfo) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined
  const { listen } = await import('@tauri-apps/api/event')
  const un = await listen<InboxFileInfo>('inbox://file', (event) => onFile(event.payload))
  return () => {
    un()
  }
}

export async function openScannerApp(): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Scanner launch is only available in the DropBuddy desktop app')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('open_scanner_app')
}

export async function openInboxFolder(): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Open inbox is only available in the DropBuddy desktop app')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('open_inbox_folder')
}
