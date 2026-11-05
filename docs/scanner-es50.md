# Epson ES-50 → DropBuddy intake

USB scanning is **not** started inside DropBuddy. On this Mac the installer provides:

- **Image Capture** device driver: `/Library/Image Capture/Devices/EPSON ES017E.app`
- **Epson Scan 2 Utility** (maintenance) under `/Applications/Epson Software/`
- There is typically **no** standalone “Epson Scan 2.app” — you scan from **Image Capture**

DropBuddy (desktop) only **watches** `~/DropBuddy/inbox` and imports new images.

## Confirm the scanner is connected

```bash
ioreg -p IOUSB -w0 | rg 'Epson ES-50'
```

It should appear (often behind a USB-C hub).

## Recommended inbox

```bash
npm run inbox:init
# -> ~/DropBuddy/inbox
```

## How to scan (MVP)

1. Run DropBuddy desktop: `npm run desktop:dev`
2. Open **Intake** → **Open Image Capture (scan)** (or Spotlight → Image Capture)
3. Select **Epson ES-50** in the left sidebar
4. Set the destination / “Where” folder to `~/DropBuddy/inbox`
5. Place the slip, click **Scan**
6. The file should appear in DropBuddy Intake automatically

If Image Capture shows “No devices”: unplug/replug the ES-50 (or the Anker hub), wait a few seconds, quit and reopen Image Capture.

## Browser fallback

Without the desktop app: scan into `~/DropBuddy/inbox`, then use **Add scanned files…** / drag-and-drop in Intake.

## OCR (desktop)

Requires Homebrew tools (already present on this machine):

```bash
brew install tesseract poppler
```

In DropBuddy desktop → Intake → **Run OCR** on queued inbox files (PDF via `pdftoppm`, then `tesseract`).

## Later

- Auto-set Image Capture destination to the inbox
- LLM structuring of OCR text (heuristic extractor is in place for now)
