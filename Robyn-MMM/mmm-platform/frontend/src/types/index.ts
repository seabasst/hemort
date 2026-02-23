export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface Client {
  id: number
  name: string
  industry: string | null
  currency: string
  channels: string[]
  bigquery_config: BigQueryConfig | null
  created_at: string
  updated_at: string | null
  latest_run_status: string | null
  latest_run_date: string | null
}

export interface BigQueryConfig {
  project_id: string
  dataset: string
  table: string
}

export interface Dataset {
  id: number
  client_id: number
  name: string
  source_type: string
  row_count: number
  columns: string[]
  date_range_start: string | null
  date_range_end: string | null
  validation_status: string
  validation_messages: string[]
  created_at: string
}

export interface DataPreview {
  columns: string[]
  row_count: number
  date_range_start: string | null
  date_range_end: string | null
  sample_rows: Record<string, any>[]
  validation_status: string
  validation_messages: string[]
}

export interface ModelConfig {
  date_column: string
  revenue_column: string
  spend_columns: string[]
  control_columns?: string[]
  adstock?: {
    theta: { min: number; max: number }
  }
  saturation?: {
    alpha: { min: number; max: number }
    gamma: { min: number; max: number }
  }
  iterations?: number
  trials?: number
}

export interface ModelRun {
  id: number
  client_id: number
  dataset_id: number
  status: 'queued' | 'running' | 'complete' | 'failed'
  progress: number
  error_message: string | null
  config: ModelConfig
  metrics: ModelMetrics | null
  channel_contributions: ChannelContribution[] | null
  response_curves: ResponseCurve[] | null
  optimal_budget: BudgetAllocation[] | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ModelMetrics {
  r_squared: number
  nrmse: number
  mape: number
}

export interface ChannelContribution {
  channel: string
  contribution: number
  percentage: number
  roi: number
  spend?: number
  effect_share?: number
  spend_share?: number
  carryover_pct?: number
  ci_low?: number | null
  ci_up?: number | null
}

export interface ResponseCurve {
  channel: string
  spend_values: number[]
  response_values: number[]
  current_spend: number
  optimal_spend: number
}

export interface BudgetAllocation {
  channel: string
  current_spend: number
  optimal_spend: number
  change_percentage: number
  expected_revenue_change: number
}

export interface PlotInfo {
  name: string
  filename: string
  category: string
}

export interface ReportSummary {
  client: {
    id: number
    name: string
    industry: string | null
    currency: string
  }
  run: {
    id: number
    status: string
    created_at: string | null
    completed_at: string | null
    error_message: string | null
  }
  metrics: ModelMetrics | null
  channel_contributions: ChannelContribution[] | null
  response_curves: ResponseCurve[] | null
  optimal_budget: BudgetAllocation[] | null
  plots_available: PlotInfo[]
}
