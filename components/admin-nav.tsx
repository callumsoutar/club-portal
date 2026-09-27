'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNav() {
  const pathname = usePathname()
  const messages = pathname === '/admin' || pathname.startsWith('/admin/messages')
  const settings = pathname.startsWith('/admin/settings')

  return (
    <nav className="desktop-nav" aria-label="Admin">
      <Link className={messages ? 'active' : undefined} href="/admin">Messages</Link>
      <Link className={settings ? 'active' : undefined} href="/admin/settings">Settings</Link>
      <Link href="/tv">TV slideshow</Link>
      <Link href="/">Public site</Link>
    </nav>
  )
}
