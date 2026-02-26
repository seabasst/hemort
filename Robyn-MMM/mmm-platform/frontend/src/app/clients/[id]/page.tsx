'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Upload,
  Database,
  Play,
  ChevronRight,
  FileText,
  Settings,
  Trash2,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import type { Client, Dataset, ModelRun, ModelConfig } from '@/types'
import { format } from 'date-fns'

export default function ClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = parseInt(params.id as string)

  const [client, setClient] = useState<Client | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [modelRuns, setModelRuns] = useState<ModelRun[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'data' | 'runs'>('data')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [clientData, datasetsData, runsData] = await Promise.all([
        api.getClient(clientId),
        api.getDatasets(clientId),
        api.getModelRuns(clientId),
      ])
      setClient(clientData)
      setDatasets(datasetsData)
      setModelRuns(runsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [clientId, router])

  useEffect(() => {
    const token = api.getToken()
    if (!token) {
      router.push('/login')
      return
    }
    loadData()
  }, [router, loadData])

  // Poll for running jobs
  useEffect(() => {
    const hasRunningJobs = modelRuns.some(
      (run) => run.status === 'running' || run.status === 'queued'
    )
    if (!hasRunningJobs) return

    const interval = setInterval(async () => {
      const runsData = await api.getModelRuns(clientId)
      setModelRuns(runsData)
    }, 5000)

    return () => clearInterval(interval)
  }, [modelRuns, clientId])

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted hover:text-dark mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to clients
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-display">{client.name}</h1>
            <p className="text-muted mt-1">
              {client.industry || 'E-commerce'} • {client.currency}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Data
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              disabled={datasets.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run Model
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('data')}
              className={`pb-3 text-body font-medium border-b-2 transition-colors ${
                activeTab === 'data'
                  ? 'border-primary text-dark'
                  : 'border-transparent text-muted hover:text-dark'
              }`}
            >
              Data ({datasets.length})
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`pb-3 text-body font-medium border-b-2 transition-colors ${
                activeTab === 'runs'
                  ? 'border-primary text-dark'
                  : 'border-transparent text-muted hover:text-dark'
              }`}
            >
              Model Runs ({modelRuns.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'data' && (
          <DataTab
            datasets={datasets}
            clientId={clientId}
            onDelete={(id) => setDatasets(datasets.filter((d) => d.id !== id))}
          />
        )}
        {activeTab === 'runs' && (
          <RunsTab runs={modelRuns} clientId={clientId} />
        )}
      </main>

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          clientId={clientId}
          onClose={() => setShowUploadModal(false)}
          onUploaded={(dataset) => {
            setDatasets([dataset, ...datasets])
            setShowUploadModal(false)
          }}
        />
      )}

      {showRunModal && (
        <RunModelModal
          clientId={clientId}
          datasets={datasets}
          onClose={() => setShowRunModal(false)}
          onCreated={(run) => {
            setModelRuns([run, ...modelRuns])
            setShowRunModal(false)
            setActiveTab('runs')
          }}
        />
      )}
    </div>
  )
}

function DataTab({
  datasets,
  clientId,
  onDelete,
}: {
  datasets: Dataset[]
  clientId: number
  onDelete: (id: number) => void
}) {
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this dataset?')) return
    try {
      await api.deleteDataset(clientId, id)
      onDelete(id)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (datasets.length === 0) {
    return (
      <div className="card text-center py-12">
        <Database className="w-12 h-12 text-muted mx-auto mb-4" />
        <h3 className="text-title mb-2">No data uploaded</h3>
        <p className="text-muted">Upload a CSV or connect to BigQuery to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <div key={dataset.id} className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted" />
              </div>
              <div>
                <h3 className="text-title">{dataset.name}</h3>
                <p className="text-caption text-muted">
                  {dataset.row_count} rows •{' '}
                  {dataset.date_range_start &&
                    dataset.date_range_end &&
                    `${format(new Date(dataset.date_range_start), 'MMM d, yyyy')} - ${format(new Date(dataset.date_range_end), 'MMM d, yyyy')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`status-badge ${
                  dataset.validation_status === 'valid'
                    ? 'status-complete'
                    : dataset.validation_status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'status-failed'
                }`}
              >
                {dataset.validation_status}
              </span>
              <button
                onClick={() => handleDelete(dataset.id)}
                className="p-2 text-muted hover:text-error transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {dataset.validation_messages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <ul className="text-caption text-muted space-y-1">
                {dataset.validation_messages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RunsTab({
  runs,
  clientId,
}: {
  runs: ModelRun[]
  clientId: number
}) {
  if (runs.length === 0) {
    return (
      <div className="card text-center py-12">
        <Play className="w-12 h-12 text-muted mx-auto mb-4" />
        <h3 className="text-title mb-2">No model runs yet</h3>
        <p className="text-muted">Run your first MMM model to see results</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <Link
          key={run.id}
          href={`/clients/${clientId}/runs/${run.id}`}
          className="card flex items-center justify-between hover:shadow-elevated transition-shadow"
        >
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-title">Run #{run.id}</h3>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-caption text-muted mt-1">
              {format(new Date(run.created_at), 'MMM d, yyyy h:mm a')}
              {run.status === 'running' && (
                <span className="ml-2">• {Math.round(run.progress)}% complete</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {run.status === 'complete' && run.metrics && (
              <div className="text-right">
                <p className="text-caption text-muted">R²</p>
                <p className="text-title">
                  {(run.metrics.r_squared * 100).toFixed(1)}%
                </p>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-muted" />
          </div>
        </Link>
      ))}
    </div>
  )
}

function UploadModal({
  clientId,
  onClose,
  onUploaded,
}: {
  clientId: number
  onClose: () => void
  onUploaded: (dataset: Dataset) => void
}) {
  const [activeTab, setActiveTab] = useState<'csv' | 'bigquery'>('csv')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // BigQuery state
  const [projectId, setProjectId] = useState('kiri-media-reporting')
  const [bqDataset, setBqDataset] = useState('')
  const [datasets, setDatasets] = useState<string[]>([])
  const [tables, setTables] = useState<{ table_id: string }[]>([])
  const [revenueTable, setRevenueTable] = useState('')
  const [revenueDateCol, setRevenueDateCol] = useState('')
  const [revenueCol, setRevenueCol] = useState('')
  const [revenueSchema, setRevenueSchema] = useState<{ name: string; type: string }[]>([])
  const [spendTables, setSpendTables] = useState<Array<{
    table: string
    date_col: string
    spend_col: string
    alias: string
    schema?: { name: string; type: string }[]
  }>>([])
  const [loadingBQ, setLoadingBQ] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploading(true)

    try {
      const dataset = await api.uploadCSV(clientId, file)
      onUploaded(dataset)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const loadDatasets = async () => {
    if (!projectId) return
    setLoadingBQ(true)
    setError('')
    try {
      const result = await api.listBigQueryDatasets(projectId)
      setDatasets(result.datasets)
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets')
    } finally {
      setLoadingBQ(false)
    }
  }

  const loadTables = async (dataset: string) => {
    if (!dataset) return
    setLoadingBQ(true)
    try {
      const result = await api.listBigQueryTables(projectId, dataset)
      setTables(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load tables')
    } finally {
      setLoadingBQ(false)
    }
  }

  const loadSchema = async (table: string, isRevenue: boolean, spendIndex?: number) => {
    if (!table) return
    try {
      const schema = await api.getBigQuerySchema(projectId, bqDataset, table)
      if (isRevenue) {
        setRevenueSchema(schema)
        // Auto-detect columns
        const dateCol = schema.find(c => c.name.toLowerCase().includes('date'))
        const revCol = schema.find(c => ['gross', 'revenue', 'net_total', 'sales'].some(r => c.name.toLowerCase().includes(r)))
        if (dateCol) setRevenueDateCol(dateCol.name)
        if (revCol) setRevenueCol(revCol.name)
      } else if (spendIndex !== undefined) {
        setSpendTables(prev => {
          const updated = [...prev]
          updated[spendIndex] = { ...updated[spendIndex], schema }
          // Auto-detect columns
          const dateCol = schema.find(c => c.name.toLowerCase() === 'date')
          const spendCol = schema.find(c => ['cost', 'spend'].some(s => c.name.toLowerCase().includes(s)))
          if (dateCol) updated[spendIndex].date_col = dateCol.name
          if (spendCol) updated[spendIndex].spend_col = spendCol.name
          return updated
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schema')
    }
  }

  const addSpendTable = () => {
    setSpendTables([...spendTables, { table: '', date_col: '', spend_col: '', alias: '' }])
  }

  const removeSpendTable = (index: number) => {
    setSpendTables(spendTables.filter((_, i) => i !== index))
  }

  const handleBigQueryImport = async () => {
    setError('')
    setUploading(true)
    try {
      const dataset = await api.fetchMMMFromBigQuery(clientId, {
        project_id: projectId,
        dataset: bqDataset,
        revenue_table: revenueTable,
        revenue_date_col: revenueDateCol,
        revenue_col: revenueCol,
        spend_tables: spendTables.map(st => ({
          table: st.table,
          date_col: st.date_col,
          spend_col: st.spend_col,
          alias: st.alias,
        })),
        aggregation: 'weekly',
      })
      onUploaded(dataset)
    } catch (err: any) {
      setError(err.message || 'BigQuery import failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-headline mb-4">Import Data</h2>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-2 px-1 font-medium border-b-2 transition-colors ${
              activeTab === 'csv' ? 'border-primary text-dark' : 'border-transparent text-muted'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            CSV Upload
          </button>
          <button
            onClick={() => setActiveTab('bigquery')}
            className={`pb-2 px-1 font-medium border-b-2 transition-colors ${
              activeTab === 'bigquery' ? 'border-primary text-dark' : 'border-transparent text-muted'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            BigQuery
          </button>
        </div>

        {activeTab === 'csv' && (
          <>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-body mb-4">
                Upload a CSV file with weekly marketing data
              </p>
              <label className="btn-primary cursor-pointer inline-block">
                {uploading ? 'Uploading...' : 'Select File'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <p className="text-caption text-muted">
                <strong>Expected format:</strong> Weekly data with columns for date, revenue,
                and spend per channel (e.g., meta_S, google_S, tiktok_S)
              </p>
            </div>
          </>
        )}

        {activeTab === 'bigquery' && (
          <div className="space-y-4">
            {/* Project & Dataset Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="input flex-1"
                    placeholder="your-project-id"
                  />
                  <button
                    onClick={loadDatasets}
                    disabled={loadingBQ}
                    className="btn-secondary"
                  >
                    {loadingBQ ? '...' : 'Load'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Dataset</label>
                <select
                  value={bqDataset}
                  onChange={(e) => {
                    setBqDataset(e.target.value)
                    loadTables(e.target.value)
                  }}
                  className="input"
                  disabled={datasets.length === 0}
                >
                  <option value="">Select dataset</option>
                  {datasets.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Revenue Table Config */}
            {tables.length > 0 && (
              <div className="p-4 bg-secondary rounded-lg space-y-3">
                <h3 className="font-medium">Revenue Source</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Table</label>
                    <select
                      value={revenueTable}
                      onChange={(e) => {
                        setRevenueTable(e.target.value)
                        loadSchema(e.target.value, true)
                      }}
                      className="input text-sm"
                    >
                      <option value="">Select table</option>
                      {tables.map(t => (
                        <option key={t.table_id} value={t.table_id}>{t.table_id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Date Column</label>
                    <select
                      value={revenueDateCol}
                      onChange={(e) => setRevenueDateCol(e.target.value)}
                      className="input text-sm"
                      disabled={revenueSchema.length === 0}
                    >
                      <option value="">Select column</option>
                      {revenueSchema.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Revenue Column</label>
                    <select
                      value={revenueCol}
                      onChange={(e) => setRevenueCol(e.target.value)}
                      className="input text-sm"
                      disabled={revenueSchema.length === 0}
                    >
                      <option value="">Select column</option>
                      {revenueSchema.filter(c => ['FLOAT', 'FLOAT64', 'INTEGER', 'INT64', 'NUMERIC'].includes(c.type)).map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Spend Tables Config */}
            {revenueTable && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Spend Sources</h3>
                  <button onClick={addSpendTable} className="text-primary text-sm hover:underline">
                    + Add Channel
                  </button>
                </div>
                {spendTables.map((st, index) => (
                  <div key={index} className="p-4 bg-secondary rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={st.alias}
                        onChange={(e) => {
                          const updated = [...spendTables]
                          updated[index].alias = e.target.value
                          setSpendTables(updated)
                        }}
                        className="input w-32 text-sm"
                        placeholder="Channel name"
                      />
                      <button
                        onClick={() => removeSpendTable(index)}
                        className="text-muted hover:text-error text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Table</label>
                        <select
                          value={st.table}
                          onChange={(e) => {
                            const updated = [...spendTables]
                            updated[index].table = e.target.value
                            setSpendTables(updated)
                            loadSchema(e.target.value, false, index)
                          }}
                          className="input text-sm"
                        >
                          <option value="">Select table</option>
                          {tables.map(t => (
                            <option key={t.table_id} value={t.table_id}>{t.table_id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Date Column</label>
                        <select
                          value={st.date_col}
                          onChange={(e) => {
                            const updated = [...spendTables]
                            updated[index].date_col = e.target.value
                            setSpendTables(updated)
                          }}
                          className="input text-sm"
                          disabled={!st.schema}
                        >
                          <option value="">Select column</option>
                          {st.schema?.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Spend Column</label>
                        <select
                          value={st.spend_col}
                          onChange={(e) => {
                            const updated = [...spendTables]
                            updated[index].spend_col = e.target.value
                            setSpendTables(updated)
                          }}
                          className="input text-sm"
                          disabled={!st.schema}
                        >
                          <option value="">Select column</option>
                          {st.schema?.filter(c => ['FLOAT', 'FLOAT64', 'INTEGER', 'INT64', 'NUMERIC'].includes(c.type)).map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {spendTables.length === 0 && (
                  <p className="text-muted text-sm text-center py-4">
                    Click "+ Add Channel" to configure spend sources
                  </p>
                )}
              </div>
            )}

            {/* Import Button */}
            {revenueTable && spendTables.length > 0 && spendTables.every(st => st.table && st.date_col && st.spend_col && st.alias) && (
              <button
                onClick={handleBigQueryImport}
                disabled={uploading}
                className="btn-primary w-full"
              >
                {uploading ? 'Importing...' : 'Import MMM Data from BigQuery'}
              </button>
            )}
          </div>
        )}

        {error && <div className="text-error text-caption mt-4">{error}</div>}

        <button onClick={onClose} className="btn-secondary w-full mt-6">
          Cancel
        </button>
      </div>
    </div>
  )
}

function RunModelModal({
  clientId,
  datasets,
  onClose,
  onCreated,
}: {
  clientId: number
  datasets: Dataset[]
  onClose: () => void
  onCreated: (run: ModelRun) => void
}) {
  const [selectedDataset, setSelectedDataset] = useState(datasets[0]?.id || 0)
  const [dateColumn, setDateColumn] = useState('date')
  const [revenueColumn, setRevenueColumn] = useState('revenue')
  const [spendColumns, setSpendColumns] = useState<string[]>([])
  const [controlColumns, setControlColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentDataset = datasets.find((d) => d.id === selectedDataset)

  useEffect(() => {
    if (currentDataset) {
      // Auto-detect columns
      const dateCol = currentDataset.columns.find((c) =>
        ['date', 'week', 'week_start'].includes(c.toLowerCase())
      )
      if (dateCol) setDateColumn(dateCol)

      const revCol = currentDataset.columns.find((c) =>
        ['revenue', 'sales', 'conversions'].includes(c.toLowerCase())
      )
      if (revCol) setRevenueColumn(revCol)

      const spendCols = currentDataset.columns.filter((c) =>
        c.toLowerCase().includes('spend') || c.endsWith('_S')
      )
      setSpendColumns(spendCols)

      // Auto-detect control columns (promotions, holidays, stock, launches, etc.)
      const controlCols = currentDataset.columns.filter((c) => {
        const lower = c.toLowerCase()
        return (
          lower.includes('promo') ||
          lower.includes('flag') ||
          lower.includes('sale') ||
          lower.includes('event') ||
          lower.includes('holiday') ||
          lower.includes('stock') ||
          lower.includes('launch') ||
          lower.includes('competitor') ||
          lower.includes('price') ||
          lower.includes('weather') ||
          lower.includes('covid') ||
          lower.includes('lockdown')
        )
      })
      setControlColumns(controlCols)
    }
  }, [currentDataset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const config: ModelConfig = {
        date_column: dateColumn,
        revenue_column: revenueColumn,
        spend_columns: spendColumns,
        control_columns: controlColumns.length > 0 ? controlColumns : undefined,
      }
      const run = await api.createModelRun(clientId, selectedDataset, config)
      onCreated(run)
    } catch (err: any) {
      setError(err.message || 'Failed to start model run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-headline mb-6">Configure Model Run</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(parseInt(e.target.value))}
              className="input"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date Column</label>
            <select
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value)}
              className="input"
            >
              {currentDataset?.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Revenue Column</label>
            <select
              value={revenueColumn}
              onChange={(e) => setRevenueColumn(e.target.value)}
              className="input"
            >
              {currentDataset?.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Spend Columns</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentDataset?.columns.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={spendColumns.includes(c)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSpendColumns([...spendColumns, c])
                      } else {
                        setSpendColumns(spendColumns.filter((s) => s !== c))
                      }
                    }}
                    className="rounded border-border"
                  />
                  <span className="text-body">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Control Variables (Optional)</label>
            <p className="text-caption text-muted mb-2">
              Mark columns for promotions, holidays, or events to separate their effect from marketing
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3 bg-gray-50">
              {currentDataset?.columns.filter(c =>
                !spendColumns.includes(c) &&
                c !== dateColumn &&
                c !== revenueColumn
              ).map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={controlColumns.includes(c)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setControlColumns([...controlColumns, c])
                      } else {
                        setControlColumns(controlColumns.filter((s) => s !== c))
                      }
                    }}
                    className="rounded border-border"
                  />
                  <span className="text-body">{c}</span>
                </label>
              ))}
              {currentDataset?.columns.filter(c =>
                !spendColumns.includes(c) &&
                c !== dateColumn &&
                c !== revenueColumn
              ).length === 0 && (
                <p className="text-muted text-sm">No additional columns available</p>
              )}
            </div>
          </div>

          {error && <div className="text-error text-caption">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || spendColumns.length === 0}
              className="btn-primary flex-1"
            >
              {loading ? 'Starting...' : 'Start Model Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
