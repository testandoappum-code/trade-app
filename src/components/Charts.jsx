import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// Custom tooltip style
const CustomTooltip = ({ active, payload, label, prefix = 'R$' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted font-mono mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-mono font-bold" style={{ color: entry.color }}>
            {prefix} {Number(entry.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function CapitalCurveChart({ data }) {
  const isPositive = data.length > 1 && data[data.length - 1]?.balance >= data[0]?.balance

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="capitalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          fill="url(#capitalGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AssetDistributionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="asset"
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip prefix="" />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyPnlChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#2a2a2a' }}
          tickLine={false}
          tickFormatter={v => `R$${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="result" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.result >= 0 ? '#10b981' : '#ef4444'}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
