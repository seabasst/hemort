'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Building2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import type { Client } from '@/types'
import { format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const token = api.getToken()
    if (!token) {
      router.push('/login')
      return
    }

    loadClients()
  }, [router])

  const loadClients = async () => {
    try {
      const data = await api.getClients()
      setClients(data)
    } catch (err) {
      console.error('Failed to load clients:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-48 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-secondary rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display">Clients</h1>
            <p className="text-muted mt-1">
              {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="card text-center py-12">
            <Building2 className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-title mb-2">No clients yet</h3>
            <p className="text-muted mb-6">
              Add your first client to start building MMM models
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Add Client
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="card flex items-center justify-between hover:shadow-elevated transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-muted" />
                  </div>
                  <div>
                    <h3 className="text-title">{client.name}</h3>
                    <p className="text-caption text-muted">
                      {client.industry || 'E-commerce'} • {client.currency}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {client.latest_run_status && (
                    <div className="text-right">
                      <StatusBadge status={client.latest_run_status} />
                      {client.latest_run_date && (
                        <p className="text-small text-muted mt-1">
                          {format(new Date(client.latest_run_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(client) => {
            setClients([client, ...clients])
            setShowCreateModal(false)
            router.push(`/clients/${client.id}`)
          }}
        />
      )}
    </div>
  )
}

function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (client: Client) => void
}) {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [currency, setCurrency] = useState('SEK')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const client = await api.createClient({
        name,
        industry: industry || undefined,
        currency,
      })
      onCreated(client)
    } catch (err: any) {
      setError(err.message || 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-headline mb-6">Add New Client</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Client Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Acme Inc"
              required
            />
          </div>

          <div>
            <label htmlFor="industry" className="label">
              Industry
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input"
              placeholder="E-commerce"
            />
          </div>

          <div>
            <label htmlFor="currency" className="label">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input"
            >
              <option value="SEK">SEK (Swedish Krona)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="NOK">NOK (Norwegian Krone)</option>
              <option value="DKK">DKK (Danish Krone)</option>
            </select>
          </div>

          {error && <div className="text-error text-caption">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
