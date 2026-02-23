'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { api } from '@/lib/api'

export function Header() {
  const pathname = usePathname()

  const handleLogout = () => {
    api.clearToken()
    window.location.href = '/login'
  }

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold text-lg tracking-tight">
              KIRI MEDIA
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className={`text-body ${
                  pathname === '/dashboard'
                    ? 'text-dark font-medium'
                    : 'text-muted hover:text-dark'
                }`}
              >
                Clients
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 text-muted hover:text-dark transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-muted hover:text-dark transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
