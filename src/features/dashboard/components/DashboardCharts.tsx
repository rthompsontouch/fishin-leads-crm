import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardStatsPeriod } from '../../../lib/dashboardPeriods'

const COL = {
  emerald: '#10b981',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  slate: '#64748b',
}

type Props = {
  period: DashboardStatsPeriod
  loading: boolean
  conversionsThis: number
  conversionsPrev: number
  newLeadsThis: number
  newLeadsPrev: number
  quotesWon: number
  quotesLost: number
  servicesThis: number
  servicesPrev: number
}

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div
        className="text-sm font-semibold"
        style={{ color: 'var(--crm-content-header-text)' }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          className="text-xs mt-0.5 mb-3"
          style={{ color: 'var(--crm-content-header-text)', opacity: 0.72 }}
        >
          {subtitle}
        </div>
      ) : (
        <div className="mb-2 h-2" />
      )}
      <div className="h-[220px] w-full min-w-0">{children}</div>
    </div>
  )
}

export default function DashboardCharts({
  period,
  loading,
  conversionsThis,
  conversionsPrev,
  newLeadsThis,
  newLeadsPrev,
  quotesWon,
  quotesLost,
  servicesThis,
  servicesPrev,
}: Props) {
  const compare = period !== 'all'
  const periodLabel = compare ? 'This period vs last' : 'All time (no prior period)'

  const conversionData = compare
    ? [
        { name: 'This period', value: conversionsThis, fill: COL.emerald },
        { name: 'Last period', value: conversionsPrev, fill: COL.teal },
      ]
    : [{ name: 'All time', value: conversionsThis, fill: COL.emerald }]

  const leadsData = compare
    ? [
        { name: 'This period', value: newLeadsThis, fill: COL.sky },
        { name: 'Last period', value: newLeadsPrev, fill: COL.indigo },
      ]
    : [{ name: 'All time', value: newLeadsThis, fill: COL.sky }]

  const servicesData = compare
    ? [
        { name: 'This period', value: servicesThis, fill: COL.violet },
        { name: 'Last period', value: servicesPrev, fill: COL.amber },
      ]
    : [{ name: 'All time', value: servicesThis, fill: COL.violet }]

  const totalBids = quotesWon + quotesLost
  const bidsData =
    totalBids > 0
      ? [
          { name: 'Won', value: quotesWon, fill: COL.emerald },
          { name: 'Lost', value: quotesLost, fill: COL.rose },
        ]
      : [{ name: 'No data yet', value: 1, fill: COL.slate }]

  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    fontSize: 12,
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 h-[280px] animate-pulse"
            style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartFrame
        title="Leads → customers"
        subtitle={`Conversions (by converted date). ${periodLabel}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={conversionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#334155' }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count">
              {conversionData.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="New leads"
        subtitle={`By lead created date. ${periodLabel}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leadsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#334155' }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Leads">
              {leadsData.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Quotes won / lost"
        subtitle={
          period === 'all'
            ? 'Final status (all quotes).'
            : 'By won / lost timestamp in the selected period.'
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bidsData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
            >
              {bidsData.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Services logged"
        subtitle={`Service history entries (by created date). ${periodLabel}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={servicesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#334155' }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Services">
              {servicesData.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
