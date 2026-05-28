'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/dashboard',    label: 'Dashboard',     icon: '📊' },
  { href: '/admin/slots',        label: 'Time Slots',    icon: '📅' },
  { href: '/admin/pricing',      label: 'Pricing',       icon: '💰' },
  { href: '/admin/reservations', label: 'Reservations',  icon: '📋' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-brand-dark border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <p className="text-white font-black tracking-widest text-sm">ANTIGRAVITY</p>
        <p className="text-gray-600 text-[10px] tracking-[0.3em] mt-0.5">ADMIN</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-brand-blue text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}>
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
