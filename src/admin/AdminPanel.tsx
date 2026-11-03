import type { PrepCatalog, ShopConfig } from '../domain/types'
import { answerPrepQuestion, upsertPrepItem } from '../domain/prepCatalog'

type Props = {
  config: ShopConfig
  onConfigChange: (next: ShopConfig) => void
  catalog: PrepCatalog
  onCatalogChange: (next: PrepCatalog) => void
}

export function AdminPanel({ config, onConfigChange, catalog, onCatalogChange }: Props) {
  const set = <K extends keyof ShopConfig>(key: K, value: ShopConfig[K]) => {
    onConfigChange({ ...config, [key]: value })
  }

  return (
    <section className="admin-panel">
      <h2>Admin — shop configuration</h2>
      <p className="muted">
        Location, drivers, and prep knowledge. Prep times start incomplete and grow from invoices +
        answers below.
      </p>

      <div className="admin-grid">
        <label>
          Shop name
          <input value={config.shopName} onChange={(e) => set('shopName', e.target.value)} />
        </label>
        <label>
          Address label
          <input value={config.addressLabel} onChange={(e) => set('addressLabel', e.target.value)} />
        </label>
        <label>
          Latitude
          <input
            type="number"
            step="0.0001"
            value={config.location[0]}
            onChange={(e) => set('location', [Number(e.target.value), config.location[1]])}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.0001"
            value={config.location[1]}
            onChange={(e) => set('location', [config.location[0], Number(e.target.value)])}
          />
        </label>
        <label>
          Drivers
          <input
            type="number"
            min={1}
            max={20}
            value={config.driverCount}
            onChange={(e) => set('driverCount', Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
        </label>
        <label>
          Service radius (miles)
          <input
            type="number"
            min={1}
            max={100}
            value={config.serviceRadiusMiles}
            onChange={(e) => set('serviceRadiusMiles', Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label>
          Sim: order every (sec)
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={config.orderFrequencySeconds}
            onChange={(e) => set('orderFrequencySeconds', Math.max(0.5, Number(e.target.value) || 0.5))}
          />
        </label>
        <label>
          Sim: driver speed (×)
          <input
            type="number"
            min={0.25}
            max={8}
            step={0.25}
            value={config.driverSpeed}
            onChange={(e) => set('driverSpeed', Math.max(0.25, Number(e.target.value) || 1))}
          />
        </label>
      </div>

      <h3>Food prep catalog</h3>
      {catalog.items.length === 0 ? (
        <p className="muted">No items yet. Add a known item or answer open questions as slips arrive.</p>
      ) : (
        <ul className="prep-list">
          {catalog.items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong> —{' '}
              {item.prepMinutes == null ? 'unknown' : `${item.prepMinutes} min`} ({item.source})
            </li>
          ))}
        </ul>
      )}

      <AddPrepItemForm
        onAdd={(name, minutes) => onCatalogChange(upsertPrepItem(catalog, name, minutes, 'admin'))}
      />

      <h3>Open questions for admin</h3>
      {catalog.openQuestions.length === 0 ? (
        <p className="muted">No open questions.</p>
      ) : (
        <ul className="prep-list">
          {catalog.openQuestions.map((q) => (
            <li key={q.id}>
              <span>{q.prompt}</span>
              <AnswerRow
                onAnswer={(minutes) => onCatalogChange(answerPrepQuestion(catalog, q.id, minutes))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AddPrepItemForm({ onAdd }: { onAdd: (name: string, minutes: number | null) => void }) {
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const name = String(fd.get('name') || '').trim()
        const raw = String(fd.get('minutes') || '').trim()
        if (!name) return
        onAdd(name, raw === '' ? null : Number(raw))
        e.currentTarget.reset()
      }}
    >
      <input name="name" placeholder="Item name" required />
      <input name="minutes" type="number" min={0} step={1} placeholder="Prep minutes (blank = unknown)" />
      <button type="submit">Add / update</button>
    </form>
  )
}

function AnswerRow({ onAnswer }: { onAnswer: (minutes: number) => void }) {
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const minutes = Number(fd.get('minutes'))
        if (!Number.isFinite(minutes) || minutes < 0) return
        onAnswer(minutes)
      }}
    >
      <input name="minutes" type="number" min={0} step={1} placeholder="minutes" required />
      <button type="submit">Save</button>
    </form>
  )
}
