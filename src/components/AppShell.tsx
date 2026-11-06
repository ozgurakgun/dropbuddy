import Link from 'next/link'
import type { ReactNode } from 'react'

type NavItem = { href: string; label: string }

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string
  nav: NavItem[]
  children: ReactNode
}) {
  return (
    <div className="shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">DropBuddy</p>
          <h1>{title}</h1>
        </div>
        <nav className="shell-nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/api/auth/signout">Sign out</Link>
        </nav>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  )
}
