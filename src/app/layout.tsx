import type { Metadata } from 'next'
import { SessionProvider } from '@/components/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'DropBuddy',
  description: 'Multi-tenant restaurant delivery dispatch',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
