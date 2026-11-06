'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type TenantOption = { id: string; name: string }

export function InviteUserForm({
  action,
  tenants,
  defaultRole = 'driver',
  title = 'Create account',
}: {
  action: '/api/restaurant/users' | '/api/superadmin/users'
  tenants?: TenantOption[]
  defaultRole?: 'restaurant_admin' | 'driver'
  title?: string
}) {
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
    const body: Record<string, string> = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      role: String(form.get('role') || defaultRole),
    }
    if (tenants) {
      body.tenantId = String(form.get('tenantId') || '')
    }

    const response = await fetch(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = (await response.json().catch(() => ({}))) as { message?: string }
    setPending(false)

    if (!response.ok) {
      setError(data.message || 'Could not create account.')
      return
    }

    setMessage(data.message || 'Invite sent.')
    event.currentTarget.reset()
    router.refresh()
  }

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {tenants ? (
        <label>
          Restaurant
          <select name="tenantId" required defaultValue="">
            <option value="" disabled>
              Select restaurant
            </option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Name
        <input name="name" placeholder="Alex Driver" />
      </label>
      <label>
        Email
        <input name="email" type="email" required placeholder="alex@example.com" />
      </label>
      <label>
        Role
        <select name="role" defaultValue={defaultRole}>
          <option value="driver">Driver</option>
          <option value="restaurant_admin">Restaurant admin</option>
        </select>
      </label>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Sending invite…' : 'Create and email invite'}
      </button>
    </form>
  )
}
