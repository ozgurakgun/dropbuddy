'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateTenantForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/superadmin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name') || ''),
        slug: String(form.get('slug') || ''),
        adminName: String(form.get('adminName') || ''),
        adminEmail: String(form.get('adminEmail') || ''),
      }),
    })

    const data = (await response.json().catch(() => ({}))) as { message?: string }
    setPending(false)

    if (!response.ok) {
      setError(data.message || 'Could not create tenant.')
      return
    }

    setMessage(data.message || 'Tenant created.')
    event.currentTarget.reset()
    router.refresh()
  }

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <h2>Create restaurant + invite admin</h2>
      <label>
        Restaurant name
        <input name="name" required placeholder="Great Western Kitchen" />
      </label>
      <label>
        Slug
        <input name="slug" required placeholder="great-western" />
      </label>
      <label>
        Admin name
        <input name="adminName" placeholder="Alex Manager" />
      </label>
      <label>
        Admin email
        <input name="adminEmail" type="email" required placeholder="alex@restaurant.com" />
      </label>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create and send invite'}
      </button>
    </form>
  )
}
