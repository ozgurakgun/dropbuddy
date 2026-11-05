# Epson ES-50 → DropBuddy intake

USB scanners are not driven from a normal browser page. For MVP we accept a **standalone macOS app** (see `docs/macos-app.md`) that watches an inbox folder.

Until that app lands: use **Epson Scan 2** to save slips into the DropBuddy inbox, then import them in the **Intake** tab (file picker / drag-and-drop).

## Recommended inbox

```text
~/DropBuddy/inbox
```

Create it once:

```bash
mkdir -p ~/DropBuddy/inbox
open ~/DropBuddy/inbox
```

## Epson Scan 2 settings (ES-50)

1. Install **Epson Scan 2** from the Epson software package for ES-50.
2. Confirm the scanner appears in Epson Scan 2 / macOS **Image Capture**.
3. Set destination folder to `~/DropBuddy/inbox`.
4. Prefer **JPEG** or **PNG** for receipts (PDF works later once OCR handles multi-page).
5. Use a naming pattern that includes a timestamp if available (easier to audit).

Suggested scan mode for kitchen slips: colour or greyscale, ~200–300 dpi, single-sided.

## DropBuddy flow

### Desktop app (preferred)

```bash
npm run desktop:dev
```

1. Scan a slip with the ES-50 into `~/DropBuddy/inbox`.
2. DropBuddy **Intake** auto-queues the new file (watcher).
3. **Run OCR+LLM stub** — stubbed for now; real OCR/LLM next.

### Browser fallback

1. Scan into `~/DropBuddy/inbox`.
2. Open DropBuddy → **Intake**.
3. **Add scanned files…** / drag-and-drop.
4. **Run OCR+LLM stub**.

## Later

- **macOS app** folder watcher that auto-enqueues new files (no file picker).
- Upload to object storage + server-side OCR when we add a Render web service.
- Optional: scan trigger from the app via Image Capture / ICA (still may use Epson Scan 2 under the hood).
