'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Download, RefreshCw, AlertCircle, X, ZoomIn,
  TrendingUp, TrendingDown, ArrowRight, DollarSign, Target,
  AlertTriangle, CheckCircle, Info
} from 'lucide-react'
import { Header } from '@/components/Header'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import type { ReportSummary, BudgetAllocation, PlotInfo, ChannelContribution, ResponseCurve } from '@/types'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, BarChart, Bar, Cell
} from 'recharts'
import { Sliders } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  response_curves: 'Response Curves',
  model_selection: 'Model Selection',
  decomposition: 'Decomposition',
  channel_analysis: 'Channel Analysis',
  model_fit: 'Model Fit',
  adstock: 'Adstock Effects',
  budget_allocation: 'Budget Allocation',
  other: 'Model One-Pagers',
}

const CHANNEL_COLORS: Record<string, string> = {
  meta_S: '#1877F2',      // Meta blue
  google_S: '#EA4335',    // Google red
  tiktok_S: '#000000',    // TikTok black
  email_S: '#7C3AED',     // Purple for email
  facebook_S: '#1877F2',
  instagram_S: '#E4405F',
  youtube_S: '#FF0000',
  linkedin_S: '#0A66C2',
  twitter_S: '#1DA1F2',
  default: '#6B7280'
}

function getChannelColor(channel: string): string {
  return CHANNEL_COLORS[channel] || CHANNEL_COLORS.default
}

// Calculate expected response from spend using response curve data
function interpolateResponse(curve: ResponseCurve, spend: number): number {
  const { spend_values, response_values } = curve
  if (spend <= 0) return 0
  if (spend >= spend_values[spend_values.length - 1]) {
    return response_values[response_values.length - 1]
  }

  // Find the two points to interpolate between
  for (let i = 0; i < spend_values.length - 1; i++) {
    if (spend >= spend_values[i] && spend <= spend_values[i + 1]) {
      const ratio = (spend - spend_values[i]) / (spend_values[i + 1] - spend_values[i])
      return response_values[i] + ratio * (response_values[i + 1] - response_values[i])
    }
  }
  return response_values[0]
}

function groupPlotsByCategory(plots: PlotInfo[]): Record<string, PlotInfo[]> {
  return plots.reduce((acc, plot) => {
    const category = plot.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(plot)
    return acc
  }, {} as Record<string, PlotInfo[]>)
}

function formatCurrency(value: number, currency: string): string {
  if (value >= 1000000) {
    return `${currency} ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${currency} ${(value / 1000).toFixed(0)}K`
  }
  return `${currency} ${value.toFixed(0)}`
}

function formatChannelName(name: string): string {
  return name.replace('_S', '').replace('spend_', '').replace('_', ' ')
}

interface Recommendation {
  type: 'increase' | 'decrease' | 'maintain'
  channel: string
  currentSpend: number
  suggestedSpend: number
  reason: string
  impact: string
  priority: 'high' | 'medium' | 'low'
}

function generateRecommendations(contributions: ChannelContribution[]): Recommendation[] {
  if (!contributions || contributions.length === 0) return []

  const totalSpend = contributions.reduce((sum, c) => sum + (c.spend || 0), 0)
  const avgROI = contributions.reduce((sum, c) => sum + c.roi, 0) / contributions.length

  return contributions.map(channel => {
    const currentSpend = channel.spend || 0
    const spendShare = (currentSpend / totalSpend) * 100
    const effectShare = channel.effect_share || channel.percentage

    // Calculate efficiency: effect share vs spend share
    const efficiency = effectShare / spendShare

    let type: 'increase' | 'decrease' | 'maintain'
    let reason: string
    let impact: string
    let priority: 'high' | 'medium' | 'low'
    let suggestedChange = 0

    if (channel.roi < 1) {
      // Losing money
      type = 'decrease'
      suggestedChange = -0.5 // Cut by 50%
      reason = `ROI of ${channel.roi.toFixed(2)}x means you're losing money`
      impact = `Save ${formatCurrency(currentSpend * 0.5, '')} per period`
      priority = 'high'
    } else if (channel.roi > avgROI * 1.5 && spendShare < 20) {
      // High ROI but low spend - room to grow
      type = 'increase'
      suggestedChange = 0.5 // Increase by 50%
      reason = `High ROI (${channel.roi.toFixed(2)}x) with low budget share (${spendShare.toFixed(0)}%)`
      impact = `Potential ${formatCurrency(currentSpend * 0.5 * channel.roi, '')} additional revenue`
      priority = 'high'
    } else if (efficiency < 0.7) {
      // Inefficient - spending more than it's contributing
      type = 'decrease'
      suggestedChange = -0.25
      reason = `Spending ${spendShare.toFixed(0)}% but only driving ${effectShare.toFixed(0)}% of effect`
      impact = `Reallocate ${formatCurrency(currentSpend * 0.25, '')} to better channels`
      priority = 'medium'
    } else if (efficiency > 1.3 && channel.roi > avgROI) {
      // Efficient and above average ROI
      type = 'increase'
      suggestedChange = 0.25
      reason = `Efficient channel: ${effectShare.toFixed(0)}% effect from ${spendShare.toFixed(0)}% spend`
      impact = `Capture more market share with proven ROI`
      priority = 'medium'
    } else {
      type = 'maintain'
      suggestedChange = 0
      reason = `Balanced performance at ${channel.roi.toFixed(2)}x ROI`
      impact = 'Current allocation is near optimal'
      priority = 'low'
    }

    return {
      type,
      channel: channel.channel,
      currentSpend,
      suggestedSpend: currentSpend * (1 + suggestedChange),
      reason,
      impact,
      priority
    }
  }).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

export default function ModelRunPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = parseInt(params.id as string)
  const runId = parseInt(params.runId as string)

  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [optimizedBudget, setOptimizedBudget] = useState<BudgetAllocation[] | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [selectedPlot, setSelectedPlot] = useState<PlotInfo | null>(null)

  // Budget simulator state
  const [simulatedBudgets, setSimulatedBudgets] = useState<Record<string, number>>({})
  const [totalSimulatedBudget, setTotalSimulatedBudget] = useState(0)
  const [showSimulatorInfo, setShowSimulatorInfo] = useState(false)

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getReportSummary(clientId, runId)
      setReport(data)
    } catch (err) {
      console.error('Failed to load report:', err)
      router.push(`/clients/${clientId}`)
    } finally {
      setLoading(false)
    }
  }, [clientId, runId, router])

  useEffect(() => {
    const token = api.getToken()
    if (!token) {
      router.push('/login')
      return
    }
    loadReport()
  }, [router, loadReport])

  useEffect(() => {
    if (!report || (report.run.status !== 'running' && report.run.status !== 'queued')) {
      return
    }
    const interval = setInterval(loadReport, 5000)
    return () => clearInterval(interval)
  }, [report, loadReport])

  const recommendations = useMemo(() => {
    if (!report?.channel_contributions) return []
    return generateRecommendations(report.channel_contributions)
  }, [report?.channel_contributions])

  // Initialize simulated budgets from current spend
  useEffect(() => {
    if (report?.channel_contributions && Object.keys(simulatedBudgets).length === 0) {
      const initial: Record<string, number> = {}
      let total = 0
      report.channel_contributions.forEach(c => {
        initial[c.channel] = c.spend || 0
        total += c.spend || 0
      })
      setSimulatedBudgets(initial)
      setTotalSimulatedBudget(total)
    }
  }, [report?.channel_contributions, simulatedBudgets])

  // Calculate simulated revenue based on response curves
  const simulatedResults = useMemo(() => {
    if (!report?.response_curves || !report?.channel_contributions) return null

    let currentTotalRevenue = 0
    let simulatedTotalRevenue = 0
    const channelResults: Array<{
      channel: string
      currentSpend: number
      simulatedSpend: number
      currentRevenue: number
      simulatedRevenue: number
      change: number
    }> = []

    report.channel_contributions.forEach(contribution => {
      const curve = report.response_curves?.find(c => c.channel === contribution.channel)
      if (!curve) return

      const currentSpend = contribution.spend || 0
      const simulatedSpend = simulatedBudgets[contribution.channel] || currentSpend

      const currentRevenue = interpolateResponse(curve, currentSpend)
      const simulatedRevenue = interpolateResponse(curve, simulatedSpend)

      currentTotalRevenue += currentRevenue
      simulatedTotalRevenue += simulatedRevenue

      channelResults.push({
        channel: contribution.channel,
        currentSpend,
        simulatedSpend,
        currentRevenue,
        simulatedRevenue,
        change: simulatedRevenue - currentRevenue
      })
    })

    return {
      channels: channelResults,
      currentTotal: currentTotalRevenue,
      simulatedTotal: simulatedTotalRevenue,
      totalChange: simulatedTotalRevenue - currentTotalRevenue,
      percentChange: currentTotalRevenue > 0
        ? ((simulatedTotalRevenue - currentTotalRevenue) / currentTotalRevenue) * 100
        : 0
    }
  }, [report?.response_curves, report?.channel_contributions, simulatedBudgets])

  const handleSliderChange = (channel: string, value: number) => {
    setSimulatedBudgets(prev => {
      const newBudgets = { ...prev, [channel]: value }
      const newTotal = Object.values(newBudgets).reduce((sum, v) => sum + v, 0)
      setTotalSimulatedBudget(newTotal)
      return newBudgets
    })
  }

  const handleTotalBudgetChange = (newTotal: number) => {
    if (totalSimulatedBudget === 0) return
    const ratio = newTotal / totalSimulatedBudget
    const newBudgets: Record<string, number> = {}
    Object.entries(simulatedBudgets).forEach(([channel, spend]) => {
      newBudgets[channel] = Math.round(spend * ratio)
    })
    setSimulatedBudgets(newBudgets)
    setTotalSimulatedBudget(newTotal)
  }

  const resetSimulator = () => {
    if (!report?.channel_contributions) return
    const initial: Record<string, number> = {}
    let total = 0
    report.channel_contributions.forEach(c => {
      initial[c.channel] = c.spend || 0
      total += c.spend || 0
    })
    setSimulatedBudgets(initial)
    setTotalSimulatedBudget(total)
  }

  const handleOptimize = async () => {
    if (!budgetInput) return
    setOptimizing(true)
    try {
      const result = await api.optimizeBudget(clientId, runId, parseFloat(budgetInput))
      setOptimizedBudget(result)
    } catch (err) {
      console.error('Optimization failed:', err)
    } finally {
      setOptimizing(false)
    }
  }

  const handleDownloadPdf = () => {
    window.open(api.getReportPdfUrl(clientId, runId), '_blank')
  }

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-48 mb-8" />
            <div className="h-96 bg-secondary rounded" />
          </div>
        </main>
      </div>
    )
  }

  const isComplete = report.run.status === 'complete'
  const isRunning = report.run.status === 'running' || report.run.status === 'queued'
  const hasContributions = report.channel_contributions && report.channel_contributions.length > 0

  // Calculate totals
  const contributions = report.channel_contributions || []
  const totalSpend = contributions.reduce((sum, c) => sum + (c.spend || 0), 0)
  const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0)
  const overallROI = totalSpend > 0 ? totalContribution / totalSpend : 0

  // Find best and worst channels
  const sortedByROI = hasContributions
    ? [...contributions].sort((a, b) => b.roi - a.roi)
    : []
  const bestChannel = sortedByROI[0]
  const worstChannel = sortedByROI[sortedByROI.length - 1]

  return (
    <div className="min-h-screen bg-secondary">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-2 text-muted hover:text-dark mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {report.client.name}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-display">Marketing Mix Model Report</h1>
            <p className="text-muted mt-1">
              {report.client.name} • Run #{report.run.id}
              {report.run.completed_at && (
                <> • {format(new Date(report.run.completed_at), 'MMM d, yyyy')}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={report.run.status} />
            {isComplete && (
              <button onClick={handleDownloadPdf} className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Running state */}
        {isRunning && (
          <div className="card flex items-center gap-4 mb-8">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            <div>
              <p className="text-title">Model is running...</p>
              <p className="text-caption text-muted">
                This page will automatically update when complete.
              </p>
            </div>
          </div>
        )}

        {/* Failed state */}
        {report.run.status === 'failed' && (
          <div className="card bg-red-50 border-red-200 mb-8">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-error flex-shrink-0" />
              <div>
                <p className="text-title text-error">Model run failed</p>
                <p className="text-caption text-muted">
                  {report.run.error_message || 'Check configuration and try again.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {isComplete && (
          <div className="space-y-6">

            {/* Executive Summary */}
            {hasContributions && (
              <div className="card bg-gradient-to-br from-blue-50 to-white border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-headline mb-3">Executive Summary</h2>
                    <div className="space-y-2 text-body">
                      <p>
                        Your marketing generated <strong>{formatCurrency(totalContribution, report.client.currency)}</strong> in
                        attributable revenue from <strong>{formatCurrency(totalSpend, report.client.currency)}</strong> in spend,
                        achieving an overall <strong>{overallROI.toFixed(2)}x ROI</strong>.
                      </p>
                      {bestChannel && worstChannel && bestChannel.channel !== worstChannel.channel && (
                        <p>
                          <strong>{formatChannelName(bestChannel.channel)}</strong> is your top performer
                          at <strong>{bestChannel.roi.toFixed(2)}x ROI</strong>
                          {worstChannel.roi < 1 && (
                            <>, while <strong>{formatChannelName(worstChannel.channel)}</strong> is
                            underperforming at <strong>{worstChannel.roi.toFixed(2)}x ROI</strong> (below breakeven)</>
                          )}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Actions */}
            {recommendations.length > 0 && (
              <div className="card">
                <h2 className="text-headline mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Recommended Actions
                </h2>
                <div className="space-y-3">
                  {recommendations.filter(r => r.priority !== 'low').slice(0, 4).map((rec, i) => (
                    <div
                      key={rec.channel}
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.type === 'decrease'
                          ? 'bg-red-50 border-red-500'
                          : rec.type === 'increase'
                            ? 'bg-green-50 border-green-500'
                            : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {rec.type === 'decrease' ? (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          ) : rec.type === 'increase' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowRight className="w-5 h-5 text-gray-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {rec.type === 'decrease' ? 'Reduce' : rec.type === 'increase' ? 'Increase' : 'Maintain'}{' '}
                              {formatChannelName(rec.channel)} budget
                            </p>
                            <p className="text-sm text-muted">{rec.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            rec.type === 'decrease' ? 'text-red-600' :
                            rec.type === 'increase' ? 'text-green-600' : ''
                          }`}>
                            {formatCurrency(rec.currentSpend, report.client.currency)} → {formatCurrency(rec.suggestedSpend, report.client.currency)}
                          </p>
                          <p className="text-sm text-muted">{rec.impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channel Performance */}
            {hasContributions && (
              <div className="card">
                <h2 className="text-headline mb-2">Channel Performance</h2>
                <p className="text-caption text-muted mb-6">
                  How each channel contributes to revenue vs. what you spend
                </p>

                {/* Visual comparison */}
                <div className="space-y-4 mb-6">
                  {contributions.map((channel) => {
                    const spendShare = totalSpend > 0 ? ((channel.spend || 0) / totalSpend) * 100 : 0
                    const effectShare = channel.effect_share || channel.percentage
                    const isEfficient = effectShare > spendShare

                    return (
                      <div key={channel.channel} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{formatChannelName(channel.channel)}</span>
                          <span className={`text-sm font-medium ${
                            channel.roi >= 2 ? 'text-green-600' :
                            channel.roi >= 1 ? 'text-blue-600' :
                            'text-red-600'
                          }`}>
                            {channel.roi.toFixed(2)}x ROI
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                            {/* Spend bar */}
                            <div
                              className="absolute inset-y-0 left-0 bg-gray-300 flex items-center justify-end pr-2"
                              style={{ width: `${Math.min(spendShare, 100)}%` }}
                            >
                              <span className="text-xs font-medium text-gray-600">
                                {spendShare > 10 ? `${spendShare.toFixed(0)}% spend` : ''}
                              </span>
                            </div>
                            {/* Effect bar */}
                            <div
                              className={`absolute inset-y-0 left-0 flex items-center justify-end pr-2 ${
                                isEfficient ? 'bg-green-400' : 'bg-red-400'
                              }`}
                              style={{
                                width: `${Math.min(effectShare, 100)}%`,
                                opacity: 0.7
                              }}
                            >
                              <span className="text-xs font-medium text-white">
                                {effectShare > 10 ? `${effectShare.toFixed(0)}% effect` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="w-24 text-right text-sm">
                            {formatCurrency(channel.spend || 0, report.client.currency)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-6 text-sm text-muted border-t pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                    <span>Budget Share</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-400 rounded opacity-70" />
                    <span>Revenue Effect (efficient)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-400 rounded opacity-70" />
                    <span>Revenue Effect (inefficient)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Response Curves - Diminishing Returns */}
            {report.response_curves && report.response_curves.length > 0 && (
              <div className="card">
                <h2 className="text-headline mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Response Curves (Diminishing Returns)
                </h2>
                <p className="text-caption text-muted mb-6">
                  See how each channel responds to spend increases. Flatter curves = more saturation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {report.response_curves.map((curve) => {
                    // Prepare chart data
                    const chartData = curve.spend_values.map((spend, i) => ({
                      spend: spend,
                      response: curve.response_values[i]
                    }))

                    // Calculate saturation percentage
                    const currentIdx = curve.spend_values.findIndex(s => s >= curve.current_spend)
                    const currentResponse = currentIdx >= 0 ? curve.response_values[currentIdx] : 0
                    const maxResponse = Math.max(...curve.response_values)
                    const saturationPct = maxResponse > 0 ? (currentResponse / maxResponse) * 100 : 0

                    // Determine if room to grow
                    const hasRoomToGrow = saturationPct < 60

                    return (
                      <div key={curve.channel} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getChannelColor(curve.channel) }}
                            />
                            <span className="font-medium">{formatChannelName(curve.channel)}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${
                              hasRoomToGrow ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {saturationPct.toFixed(0)}% saturated
                            </span>
                          </div>
                        </div>

                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="spend"
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                tick={{ fontSize: 11 }}
                                label={{ value: 'Spend', position: 'bottom', offset: 0, fontSize: 11 }}
                              />
                              <YAxis
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                tick={{ fontSize: 11 }}
                                width={45}
                              />
                              <Tooltip
                                formatter={(value: number) => [formatCurrency(value, report.client.currency), 'Response']}
                                labelFormatter={(label: number) => `Spend: ${formatCurrency(label, report.client.currency)}`}
                              />
                              <Line
                                type="monotone"
                                dataKey="response"
                                stroke={getChannelColor(curve.channel)}
                                strokeWidth={2}
                                dot={false}
                              />
                              <ReferenceLine
                                x={curve.current_spend}
                                stroke="#ef4444"
                                strokeDasharray="5 5"
                                label={{ value: 'Current', position: 'top', fontSize: 10, fill: '#ef4444' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="mt-3 text-sm text-muted">
                          {hasRoomToGrow ? (
                            <span className="text-green-600">
                              ✓ Room to scale — increasing spend will drive meaningful returns
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              ⚠ Approaching saturation — additional spend has diminishing impact
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm">
                    <strong>How to read:</strong> Each curve shows how revenue response changes as you increase spend.
                    Steeper curves (like Email) mean high marginal returns. Flatter curves indicate saturation —
                    additional spend produces diminishing returns. The red dashed line shows your current spend level.
                  </p>
                </div>
              </div>
            )}

            {/* Budget Simulator */}
            {report.response_curves && report.response_curves.length > 0 && simulatedResults && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sliders className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-headline flex items-center gap-2">
                        Budget Simulator
                        <button
                          onClick={() => setShowSimulatorInfo(!showSimulatorInfo)}
                          className="text-muted hover:text-primary"
                          title="How does this work?"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </h2>
                      <p className="text-caption text-muted">
                        Adjust channel budgets to see projected revenue impact
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetSimulator}
                    className="text-sm text-muted hover:text-dark underline"
                  >
                    Reset to current
                  </button>
                </div>

                {/* Info Dropdown */}
                {showSimulatorInfo && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">How the Budget Simulator Works</h3>
                      <button
                        onClick={() => setShowSimulatorInfo(false)}
                        className="text-muted hover:text-dark"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-muted">
                      <p>
                        <strong className="text-dark">Response Curves:</strong> Your MMM model learned how each
                        channel responds to spend changes. These "response curves" capture diminishing returns —
                        the more you spend, the less incremental revenue each additional dollar generates.
                      </p>
                      <p>
                        <strong className="text-dark">Projections:</strong> When you adjust a slider, we use
                        the response curve to calculate expected revenue at that spend level. This accounts
                        for saturation effects that simple ROI multipliers miss.
                      </p>
                      <p>
                        <strong className="text-dark">Limitations:</strong> Projections assume similar market
                        conditions to your training data. Large budget changes (2x+) have more uncertainty.
                        External factors (seasonality, competition, creative quality) also affect real results.
                      </p>
                      <p>
                        <strong className="text-dark">Best Practice:</strong> Use this for directional guidance.
                        Test significant changes with incrementality experiments before full rollout.
                      </p>
                    </div>
                  </div>
                )}

                {/* Total Budget Input */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">Total Budget</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">{report.client.currency}</span>
                      <input
                        type="number"
                        value={Math.round(totalSimulatedBudget)}
                        onChange={(e) => handleTotalBudgetChange(parseInt(e.target.value) || 0)}
                        className="w-32 px-3 py-2 border border-border rounded-lg text-right font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    Change total budget to scale all channels proportionally
                  </p>
                </div>

                {/* Channel Sliders */}
                <div className="space-y-6 mb-6">
                  {contributions.map((channel) => {
                    const currentSpend = channel.spend || 0
                    const simulated = simulatedBudgets[channel.channel] || currentSpend
                    const maxSpend = currentSpend * 3
                    const changePercent = currentSpend > 0
                      ? ((simulated - currentSpend) / currentSpend) * 100
                      : 0

                    const result = simulatedResults.channels.find(c => c.channel === channel.channel)
                    const revenueChange = result ? result.change : 0

                    return (
                      <div key={channel.channel}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getChannelColor(channel.channel) }}
                            />
                            <span className="font-medium">{formatChannelName(channel.channel)}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-medium ${
                              changePercent > 0 ? 'text-green-600' :
                              changePercent < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(0)}%
                            </span>
                            <input
                              type="number"
                              value={Math.round(simulated)}
                              onChange={(e) => handleSliderChange(channel.channel, parseInt(e.target.value) || 0)}
                              className="w-28 px-2 py-1 border border-border rounded text-right text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={maxSpend}
                            value={simulated}
                            onChange={(e) => handleSliderChange(channel.channel, parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <span className={`w-24 text-right text-sm ${
                            revenueChange > 0 ? 'text-green-600' :
                            revenueChange < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {revenueChange > 0 ? '+' : ''}{formatCurrency(revenueChange, '')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted mt-1">
                          <span>Current: {formatCurrency(currentSpend, report.client.currency)}</span>
                          <span>ROI: {channel.roi.toFixed(2)}x</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Results Summary */}
                <div className={`p-4 rounded-lg border-2 ${
                  simulatedResults.totalChange > 0
                    ? 'bg-green-50 border-green-200'
                    : simulatedResults.totalChange < 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted">Current Revenue</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(simulatedResults.currentTotal, report.client.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Projected Revenue</p>
                      <p className={`text-lg font-bold ${
                        simulatedResults.totalChange > 0 ? 'text-green-600' :
                        simulatedResults.totalChange < 0 ? 'text-red-600' : ''
                      }`}>
                        {formatCurrency(simulatedResults.simulatedTotal, report.client.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Impact</p>
                      <p className={`text-lg font-bold ${
                        simulatedResults.totalChange > 0 ? 'text-green-600' :
                        simulatedResults.totalChange < 0 ? 'text-red-600' : ''
                      }`}>
                        {simulatedResults.totalChange > 0 ? '+' : ''}
                        {simulatedResults.percentChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {simulatedResults.totalChange !== 0 && (
                    <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                      <p className="text-sm text-center">
                        {simulatedResults.totalChange > 0 ? (
                          <>
                            <strong className="text-green-700">
                              +{formatCurrency(simulatedResults.totalChange, report.client.currency)}
                            </strong>
                            {' '}projected additional revenue with this allocation
                          </>
                        ) : (
                          <>
                            <strong className="text-red-700">
                              {formatCurrency(simulatedResults.totalChange, report.client.currency)}
                            </strong>
                            {' '}projected revenue decrease with this allocation
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm">
                    <strong>Note:</strong> Projections are based on your MMM response curves and assume
                    similar market conditions. Actual results may vary. Use this as a directional guide,
                    not a guarantee.
                  </p>
                </div>
              </div>
            )}

            {/* Attribution Comparison: MMM vs Platform */}
            {hasContributions && (
              <div className="card">
                <h2 className="text-headline mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Attribution Reality Check
                </h2>
                <p className="text-caption text-muted mb-6">
                  Platforms typically over-report their contribution. MMM provides an unbiased view.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 font-medium">Channel</th>
                        <th className="text-right py-3 font-medium">Your Spend</th>
                        <th className="text-right py-3 font-medium">MMM Attribution</th>
                        <th className="text-right py-3 font-medium">Carryover</th>
                        <th className="text-right py-3 font-medium">True ROI</th>
                        <th className="text-right py-3 font-medium">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributions.map((channel) => (
                        <tr key={channel.channel} className="border-b border-border">
                          <td className="py-3 font-medium">
                            {formatChannelName(channel.channel)}
                          </td>
                          <td className="text-right py-3">
                            {formatCurrency(channel.spend || 0, report.client.currency)}
                          </td>
                          <td className="text-right py-3">
                            <div>
                              {formatCurrency(channel.contribution, report.client.currency)}
                              {channel.ci_low != null && channel.ci_up != null && (
                                <div className="text-xs text-muted">
                                  ±{((channel.ci_up - channel.ci_low) / 2 * channel.contribution / 100).toFixed(0)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3">
                            {channel.carryover_pct ? (
                              <span className={`${channel.carryover_pct > 50 ? 'text-purple-600' : 'text-gray-600'}`}>
                                {channel.carryover_pct.toFixed(0)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td className="text-right py-3">
                            <span className={`font-medium ${
                              channel.roi >= 2 ? 'text-green-600' :
                              channel.roi >= 1 ? 'text-blue-600' :
                              'text-red-600'
                            }`}>
                              {channel.roi.toFixed(2)}x
                            </span>
                          </td>
                          <td className="text-right py-3">
                            {channel.roi >= 2 ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" /> Great
                              </span>
                            ) : channel.roi >= 1 ? (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <Info className="w-4 h-4" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-4 h-4" /> Cut
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-medium">
                        <td className="py-3">Total</td>
                        <td className="text-right py-3">{formatCurrency(totalSpend, report.client.currency)}</td>
                        <td className="text-right py-3">{formatCurrency(totalContribution, report.client.currency)}</td>
                        <td></td>
                        <td className="text-right py-3">{overallROI.toFixed(2)}x</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm mb-2">
                    <strong>Why this matters:</strong> Platform dashboards (Meta, Google, TikTok) often claim
                    2-3x more conversions than actually occurred due to overlapping attribution windows and
                    view-through counting. MMM uses statistical modeling to isolate each channel's true incremental impact.
                  </p>
                  <p className="text-sm">
                    <strong>Carryover:</strong> Shows what percentage of a channel's effect comes from past spend.
                    High carryover (50%+) means the channel has lasting impact - cutting spend today still drives revenue next week.
                  </p>
                </div>
              </div>
            )}

            {/* Model Quality Metrics */}
            {report.metrics && (
              <div className="card">
                <h2 className="text-headline mb-4">Model Quality</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className={`text-3xl font-bold ${
                      report.metrics.r_squared > 0.8 ? 'text-green-600' :
                      report.metrics.r_squared > 0.6 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {(report.metrics.r_squared * 100).toFixed(1)}%
                    </p>
                    <p className="text-caption text-muted mt-1">R² (Variance Explained)</p>
                    <p className="text-xs text-muted mt-2">
                      {report.metrics.r_squared > 0.8 ? 'Excellent fit' :
                       report.metrics.r_squared > 0.6 ? 'Good fit' : 'Poor fit'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className={`text-3xl font-bold ${
                      report.metrics.nrmse < 0.3 ? 'text-green-600' :
                      report.metrics.nrmse < 0.5 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {report.metrics.nrmse.toFixed(2)}
                    </p>
                    <p className="text-caption text-muted mt-1">NRMSE (Error)</p>
                    <p className="text-xs text-muted mt-2">
                      {report.metrics.nrmse < 0.3 ? 'Low error' :
                       report.metrics.nrmse < 0.5 ? 'Moderate error' : 'High error'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-600">
                      {(report.metrics.mape * 100).toFixed(1)}%
                    </p>
                    <p className="text-caption text-muted mt-1">MAPE</p>
                    <p className="text-xs text-muted mt-2">Mean Absolute % Error</p>
                  </div>
                </div>
              </div>
            )}

            {/* Robyn Plots */}
            {report.plots_available && report.plots_available.length > 0 && (
              <div className="card">
                <h2 className="text-headline mb-2">Detailed Model Outputs</h2>
                <p className="text-caption text-muted mb-6">
                  Click any plot to view full size
                </p>

                {Object.entries(groupPlotsByCategory(report.plots_available)).map(
                  ([category, plots]) => (
                    <div key={category} className="mb-8 last:mb-0">
                      <h3 className="text-title mb-4">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {plots.map((plot) => (
                          <button
                            key={plot.name}
                            onClick={() => setSelectedPlot(plot)}
                            className="group relative bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                          >
                            <div className="aspect-[4/3] relative">
                              <img
                                src={api.getPlotUrl(clientId, runId, plot.name)}
                                alt={plot.name}
                                className="w-full h-full object-contain bg-white"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                              </div>
                            </div>
                            <p className="text-caption text-muted p-2 truncate">
                              {plot.name.replace(/_/g, ' ')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Plot Modal */}
        {selectedPlot && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPlot(null)}
          >
            <div
              className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
                <h3 className="text-title">
                  {selectedPlot.name.replace(/_/g, ' ')}
                </h3>
                <button
                  onClick={() => setSelectedPlot(null)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <img
                  src={api.getPlotUrl(clientId, runId, selectedPlot.name)}
                  alt={selectedPlot.name}
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
