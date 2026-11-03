# DropBuddy MVP2 — groundwork

## Goals

Move from a pure demo simulator toward an ops loop:

1. **Admin** configures the shop (location, drivers, food prep knowledge).
2. **In flight** order slips arrive from a document scanner.
3. **OCR + LLM** turn slips into DropBuddy’s internal order format.
4. **Dispatch** decides who delivers what/when, which orders to batch, and when the kitchen should start (given driver availability).
5. **Driver behaviour** is simulated for now; later replaced by phone-app telemetry.

Prep-time knowledge starts **incomplete** and is filled over time from incoming invoices plus admin Q&A.

## Bounded contexts (code layout)

| Area | Path | Responsibility |
|------|------|----------------|
| Domain | `src/domain/` | Shared types: shop config, orders, drivers, deliveries, prep catalog |
| Admin | `src/admin/` | Configure shop location, driver count, prep settings |
| Intake | `src/intake/` | Scanner → OCR → LLM → normalized order (stubbed first) |
| Dispatch | `src/dispatch/` | Assignment, batching, kitchen start times (stubbed first) |
| Sim | `src/sim/` | Simulated driver behaviour (current map demo evolves here) |

## DropBuddy order format (intake output)

Normalized shape expected by dispatch (v0):

- `externalId` — slip / POS id if present
- `customer` — name / phone if available
- `deliveryAddress` — free text + optional lat/lng (geocode later)
- `items[]` — `{ name, quantity, notes? }`
- `orderedAt` — when the slip was placed / scanned
- `requestedBy?` — customer promise time if on slip
- `rawSource` — pointer to scan image + OCR text for audit

## Phases

1. **Groundwork (this PR)** — types, admin UI shell, intake/dispatch interfaces + mocks, keep map sim wired to config.
2. **Scanner path** — upload/watch folder or USB scanner capture; store images locally / object storage.
3. **OCR + LLM** — extract structured orders; admin review queue for low confidence.
4. **Dispatch v1** — batching + kitchen start heuristics using prep catalog + driver availability.
5. **Driver apps** — replace sim with live status.

## Render note

MVP1 is a static site. Intake/OCR will need a **web service** (or separate worker) on Render later; groundwork keeps domain logic in TypeScript so it can move server-side without rewriting models.
