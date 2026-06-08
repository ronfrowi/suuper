'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCRC } from '@/lib/utils'

export interface PriceSeriesEntry {
  scraped_at: string
  price: number
  original_price: number | null
  available: boolean
}

export interface PriceSeries {
  supermarketSlug: string
  supermarketName: string
  data: PriceSeriesEntry[]
}

// One stable color per supermarket slug
const SLUG_COLORS: Record<string, string> = {
  'walmart-cr':   '#0071CE',
  'mas-x-menos':  '#F97316',
  'pricesmart':   '#EF4444',
  'automercado':  '#8B5CF6',
  'fresh-market': '#16A34A',
  'mega-super':   '#EAB308',
  'pali':         '#06B6D4',
}

function colorFor(slug: string): string {
  return SLUG_COLORS[slug] ?? '#6B7280'
}

interface ChartPoint {
  date: string
  [supermarketName: string]: number | string | null
}

export default function PriceHistoryChart({ series }: { series: PriceSeries[] }) {
  if (series.length === 0) return null

  // Merge all dates into a unified timeline, one column per supermarket
  const dateMap = new Map<string, ChartPoint>()

  for (const s of series) {
    for (const entry of s.data) {
      const date = new Date(entry.scraped_at).toLocaleDateString('es-CR', {
        month: 'short',
        day: 'numeric',
      })
      if (!dateMap.has(date)) dateMap.set(date, { date })
      dateMap.get(date)![s.supermarketName] = entry.price
    }
  }

  // Sort chronologically (the keys are already in insertion order from the DB query)
  const chartData = Array.from(dateMap.values())

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          width={52}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatCRC(value), name]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        {series.map(s => (
          <Line
            key={s.supermarketSlug}
            type="monotone"
            dataKey={s.supermarketName}
            stroke={colorFor(s.supermarketSlug)}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
