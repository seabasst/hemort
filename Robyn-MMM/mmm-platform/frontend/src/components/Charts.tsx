'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import type { ChannelContribution, ResponseCurve, BudgetAllocation } from '@/types'

const COLORS = ['#0066FF', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface ChannelContributionChartProps {
  data: ChannelContribution[]
  currency: string
}

export function ChannelContributionChart({ data, currency }: ChannelContributionChartProps) {
  const chartData = data.map((item, index) => ({
    channel: item.channel.replace('spend_', '').replace('_', ' '),
    contribution: item.contribution,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis
          type="number"
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <YAxis
          type="category"
          dataKey="channel"
          tick={{ fontSize: 12, fill: '#666' }}
          width={80}
        />
        <Tooltip
          formatter={(value: number) =>
            `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          }
          labelStyle={{ color: '#111' }}
          contentStyle={{
            background: '#fff',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="contribution" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ResponseCurvesChartProps {
  data: ResponseCurve[]
  currency: string
}

export function ResponseCurvesChart({ data, currency }: ResponseCurvesChartProps) {
  // Transform data for line chart
  const chartData: Record<string, number>[] = []
  const maxLength = Math.max(...data.map((d) => d.spend_values.length))

  for (let i = 0; i < maxLength; i++) {
    const point: Record<string, number> = {}
    data.forEach((curve) => {
      if (i < curve.spend_values.length) {
        const channelName = curve.channel.replace('spend_', '').replace('_', ' ')
        point.spend = curve.spend_values[i]
        point[channelName] = curve.response_values[i]
      }
    })
    chartData.push(point)
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis
          dataKey="spend"
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#666' }}
          label={{ value: `Spend (${currency})`, position: 'bottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#666' }}
          label={{
            value: `Response (${currency})`,
            angle: -90,
            position: 'insideLeft',
          }}
        />
        <Tooltip
          formatter={(value: number) =>
            `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          }
          contentStyle={{
            background: '#fff',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Legend />
        {data.map((curve, index) => (
          <Line
            key={curve.channel}
            type="monotone"
            dataKey={curve.channel.replace('spend_', '').replace('_', ' ')}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BudgetAllocationChartProps {
  data: BudgetAllocation[]
  currency: string
}

export function BudgetAllocationChart({ data, currency }: BudgetAllocationChartProps) {
  const chartData = data.map((item, index) => ({
    channel: item.channel.replace('spend_', '').replace('_', ' '),
    current: item.current_spend,
    optimal: item.optimal_spend,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis
          dataKey="channel"
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <YAxis
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <Tooltip
          formatter={(value: number) =>
            `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          }
          contentStyle={{
            background: '#fff',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Legend />
        <Bar dataKey="current" name="Current" fill="#E5E5E5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="optimal" name="Optimal" fill="#0066FF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
