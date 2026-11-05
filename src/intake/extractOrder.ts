import type { DropBuddyOrder, OrderItem } from '../domain/types'
import type { IntakeResult, OrderExtractor, OcrResult } from './pipeline'

/**
 * Rule-based extractor for kitchen delivery slips (Just Eat / similar).
 * LLM extraction comes next; this is good enough to validate OCR on real scans.
 */
export class HeuristicOrderExtractor implements OrderExtractor {
  async extract(ocr: OcrResult): Promise<IntakeResult> {
    const text = ocr.text
    const warnings: string[] = []
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const externalId = matchFirst(text, /#\s*(\d{3}\s+\d{3}\s+\d{3})/) ?? matchFirst(text, /#\s*(\d{6,})/)
    const customerName = extractAfterLabel(lines, /Customer details/i, 1)
    const phone =
      matchFirst(text, /\b(07\d{2}\s?\d{2,3}\s?\d{3,4})\b/) ??
      matchFirst(text, /\b(\+?44\s?\d{4}\s?\d{6})\b/)
    const postcode = matchFirst(text, /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i)
    const address = extractAddress(lines, customerName)
    const due = matchFirst(text, /Due:\s*([^\n]+)/i)
    const items = extractItems(lines)

    if (!externalId) warnings.push('Could not find order number')
    if (!customerName) warnings.push('Could not find customer name')
    if (items.length === 0) warnings.push('Could not parse line items')
    if (ocr.confidence < 0.5) warnings.push('Low OCR confidence')

    const now = Date.now()
    const order: DropBuddyOrder = {
      id: `ORD-${externalId?.replace(/\s+/g, '') ?? ocr.scanId}`,
      externalId: externalId ?? undefined,
      customerName: customerName ?? undefined,
      customerPhone: phone ?? undefined,
      deliveryAddressText: address || postcode || 'Address pending review',
      items:
        items.length > 0
          ? items
          : [{ name: 'Unparsed items — see OCR text', quantity: 1 }],
      orderedAt: now,
      requestedBy: due ? now : undefined,
      status: 'intake',
      rawSource: { scanImageId: ocr.scanId, ocrText: text },
    }

    return {
      order,
      needsAdminReview: true,
      warnings: [
        ...warnings,
        due ? `Due (from slip): ${due}` : 'No due time parsed',
        'Heuristic extractor — LLM structuring next',
      ],
    }
  }
}

function matchFirst(text: string, re: RegExp): string | null {
  const m = text.match(re)
  return m?.[1]?.trim() ?? null
}

function extractAfterLabel(lines: string[], label: RegExp, offset: number): string | null {
  const idx = lines.findIndex((l) => label.test(l))
  if (idx < 0) return null
  return lines[idx + offset]?.replace(/^[:\-\s]+/, '') || null
}

function extractAddress(lines: string[], customerName: string | null): string {
  const idx = lines.findIndex((l) => /Customer details/i.test(l))
  if (idx < 0) return ''
  const chunk: string[] = []
  for (let i = idx + 1; i < Math.min(lines.length, idx + 8); i += 1) {
    const line = lines[i]
    if (/To contact|Verification|Previous orders|ORDER HAS BEEN PAID/i.test(line)) break
    if (customerName && line === customerName) continue
    if (/^Customer/i.test(line)) continue
    chunk.push(line)
  }
  return chunk.join(', ')
}

function extractItems(lines: string[]): OrderItem[] {
  const items: OrderItem[] = []
  const itemRe = /^(\d+)\s*(?:x|×|#)?\s*#?\s*(.+?)\s+(\d+[.,]\d{2})\s*$/i
  const softRe = /^(\d+)\s*[x×]\s*(.+)$/i
  for (const line of lines) {
    if (/Subtotal|Order total|Total Due|Service charge|Delivery|Bag charge|Paid by/i.test(line)) {
      continue
    }
    let m = line.match(itemRe)
    if (m) {
      items.push({ name: cleanItemName(m[2]), quantity: Number(m[1]) || 1 })
      continue
    }
    m = line.match(softRe)
    if (m && m[2].length > 3) {
      items.push({ name: cleanItemName(m[2]), quantity: Number(m[1]) || 1 })
    }
  }
  // Fallback: lines like "1 #7 Galaxy ..."
  if (items.length === 0) {
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+#\d+\s+(.+?)(?:\s+\d+[.,]\d{2})?$/)
      if (m) items.push({ name: cleanItemName(m[2]), quantity: Number(m[1]) || 1 })
    }
  }
  return items
}

function cleanItemName(name: string): string {
  return name
    .replace(/\s{2,}/g, ' ')
    .replace(/[|:]+$/g, '')
    .trim()
}
