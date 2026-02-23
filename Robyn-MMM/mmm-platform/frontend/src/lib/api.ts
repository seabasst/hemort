import type {
  Client,
  Dataset,
  DataPreview,
  ModelRun,
  ModelConfig,
  ReportSummary,
  BudgetAllocation,
  User,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
    return this.token
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      this.clearToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Request failed')
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Invalid credentials')
    }

    const data = await response.json()
    this.setToken(data.access_token)
    return data
  }

  async register(email: string, password: string, fullName?: string): Promise<User> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    })
  }

  async getMe(): Promise<User> {
    return this.request('/api/auth/me')
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return this.request('/api/clients/')
  }

  async getClient(id: number): Promise<Client> {
    return this.request(`/api/clients/${id}`)
  }

  async createClient(data: {
    name: string
    industry?: string
    currency?: string
    channels?: string[]
  }): Promise<Client> {
    return this.request('/api/clients/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    return this.request(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteClient(id: number): Promise<void> {
    return this.request(`/api/clients/${id}`, { method: 'DELETE' })
  }

  // Data
  async uploadCSV(clientId: number, file: File): Promise<Dataset> {
    const formData = new FormData()
    formData.append('file', file)

    const token = this.getToken()
    const response = await fetch(`${API_URL}/api/data/${clientId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Upload failed')
    }

    return response.json()
  }

  async fetchFromBigQuery(
    clientId: number,
    config: { project_id: string; dataset: string; table: string }
  ): Promise<Dataset> {
    return this.request(`/api/data/${clientId}/bigquery`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // BigQuery exploration
  async listBigQueryDatasets(projectId: string): Promise<{ datasets: string[] }> {
    return this.request(`/api/data/bigquery/datasets?project_id=${encodeURIComponent(projectId)}`)
  }

  async listBigQueryTables(projectId: string, dataset: string): Promise<{ table_id: string }[]> {
    return this.request(
      `/api/data/bigquery/tables?project_id=${encodeURIComponent(projectId)}&dataset=${encodeURIComponent(dataset)}`
    )
  }

  async getBigQuerySchema(
    projectId: string,
    dataset: string,
    table: string
  ): Promise<{ name: string; type: string }[]> {
    return this.request(
      `/api/data/bigquery/schema?project_id=${encodeURIComponent(projectId)}&dataset=${encodeURIComponent(dataset)}&table=${encodeURIComponent(table)}`
    )
  }

  async fetchMMMFromBigQuery(
    clientId: number,
    config: {
      project_id: string
      dataset: string
      revenue_table: string
      revenue_date_col: string
      revenue_col: string
      spend_tables: Array<{
        table: string
        date_col: string
        spend_col: string
        alias: string
      }>
      aggregation: string
    }
  ): Promise<Dataset> {
    return this.request(`/api/data/${clientId}/bigquery/mmm`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async getDatasets(clientId: number): Promise<Dataset[]> {
    return this.request(`/api/data/${clientId}/datasets`)
  }

  async previewDataset(clientId: number, datasetId: number): Promise<DataPreview> {
    return this.request(`/api/data/${clientId}/datasets/${datasetId}/preview`)
  }

  async deleteDataset(clientId: number, datasetId: number): Promise<void> {
    return this.request(`/api/data/${clientId}/datasets/${datasetId}`, {
      method: 'DELETE',
    })
  }

  // Model Runs
  async createModelRun(
    clientId: number,
    datasetId: number,
    config: ModelConfig
  ): Promise<ModelRun> {
    return this.request(`/api/models/${clientId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, config }),
    })
  }

  async getModelRuns(clientId: number): Promise<ModelRun[]> {
    return this.request(`/api/models/${clientId}/runs`)
  }

  async getModelRun(clientId: number, runId: number): Promise<ModelRun> {
    return this.request(`/api/models/${clientId}/runs/${runId}`)
  }

  getPlotUrl(clientId: number, runId: number, plotName: string): string {
    const token = this.getToken()
    return `${API_URL}/api/models/${clientId}/runs/${runId}/plots/${plotName}?token=${token}`
  }

  async optimizeBudget(
    clientId: number,
    runId: number,
    totalBudget: number,
    constraints?: Record<string, { min?: number; max?: number }>
  ): Promise<BudgetAllocation[]> {
    return this.request(`/api/models/${clientId}/runs/${runId}/optimize`, {
      method: 'POST',
      body: JSON.stringify({ total_budget: totalBudget, constraints }),
    })
  }

  // Reports
  async getReportSummary(clientId: number, runId: number): Promise<ReportSummary> {
    return this.request(`/api/reports/${clientId}/runs/${runId}/summary`)
  }

  getReportPdfUrl(clientId: number, runId: number): string {
    const token = this.getToken()
    return `${API_URL}/api/reports/${clientId}/runs/${runId}/pdf?token=${token}`
  }
}

export const api = new ApiClient()
