'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { api } from '@/lib/api'
import type { User } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (!token) {
      router.push('/login')
      return
    }

    api.getMe().then(setUser).catch(console.error).finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-48 mb-8" />
            <div className="h-64 bg-secondary rounded" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-display mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Account Section */}
          <div className="card">
            <h2 className="text-headline mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <p className="text-body">{user?.email}</p>
              </div>
              <div>
                <label className="label">Name</label>
                <p className="text-body">{user?.full_name || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* API Access */}
          <div className="card">
            <h2 className="text-headline mb-4">API Access</h2>
            <p className="text-body text-muted mb-4">
              Use the API to programmatically manage clients and run models.
            </p>
            <div className="bg-secondary p-4 rounded-lg font-mono text-small">
              <p>Base URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</p>
              <p className="mt-2">Authorization: Bearer {'<your-token>'}</p>
            </div>
          </div>

          {/* Data Connections */}
          <div className="card">
            <h2 className="text-headline mb-4">BigQuery Connection</h2>
            <p className="text-body text-muted mb-4">
              Configure BigQuery credentials to automatically fetch client data.
            </p>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-caption text-muted">
                To connect BigQuery, set the <code>GOOGLE_APPLICATION_CREDENTIALS</code>{' '}
                environment variable in your backend container pointing to your service
                account JSON key file.
              </p>
            </div>
          </div>

          {/* About */}
          <div className="card">
            <h2 className="text-headline mb-4">About</h2>
            <div className="space-y-2 text-body text-muted">
              <p>Kiri Media MMM Platform v1.0.0</p>
              <p>Powered by Meta's Robyn</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
