import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Activity, Target, RefreshCw, ChevronRight } from 'lucide-react'
import { getAccounts, getOperations, getBalanceHistory } from '../lib/supabase'
import { CapitalCurveChart, AssetDistributionChart } from './Charts'

function MetricCard({ label, value, sub, icon: Icon, color = 'accent', trend }) {
  const colorMap = {
    accent: 'text-accent border-accent/20 bg-accent/5',
    success: 'text-success border-success/20 bg-success/5',
    danger: 'text-danger border-danger/20 bg-danger/5',
    warning: 'text-warning border-warning/20 bg-warning/5',
  }

  return (
    <div className={`card border ${colorMap[color]} relative overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label-muted mb-2">{label}</p>
          <p className={`metric-value ${colorMap[color].split(' ')[0]}`}>{value}</p>
          {sub && <p className="text-xs text-muted mt-1 font-mono">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-mono ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}% vs ontem
        </div>
      )}
    </div>
  )
}

function OperationRow({ op }) {
  const isWin = op.result > 0
  const isOpen = op.status === 'Aberta'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-white/2 transition-colors px-2 rounded">
      <div className={`w-1.5 h-8 rounded-full ${isOpen ? 'bg-warning' : isWin ? 'bg-success' : 'bg-danger'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-white">{op.asset}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${op.direction === 'BUY' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
            {op.direction || '—'}
          </span>
        </div>
        <p className="text-xs text-muted font-mono">{op.account_number} · {new Date(op.created_at).toLocaleDateString('pt-BR')}</p>
      </div>
      <div className="text-right">
        {isOpen ? (
          <span className="badge-warning">ABERTA</span>
        ) : (
          <span className={`font-mono font-bold text-sm ${isWin ? 'text-success' : 'text-danger'}`}>
            {isWin ? '+' : ''}R$ {Number(op.result || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard({ accounts }) {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [operations, setOperations] = useState([])
  const [balanceHistory, setBalanceHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const currentAccount = accounts.find(a => a.account_number === selectedAccount)

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].account_number)
    }
  }, [accounts])

  const loadData = useCallback(async () => {
    if (!selectedAccount) return
    setLoading(true)
    try {
      const [ops, hist] = await Promise.all([
        getOperations({ account: selectedAccount, limit: 100 }),
        getBalanceHistory(selectedAccount, 30)
      ])
      setOperations(ops || [])
      setBalanceHistory(hist || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  // Compute metrics
  const today = new Date().toISOString().split('T')[0]
  const closedOps = operations.filter(o => o.status === 'Fechada')
  const todayOps = closedOps.filter(o => o.closed_at === today || o.opened_at === today)
  const dayProfit = todayOps.reduce((s, o) => s + (o.result || 0), 0)
  const totalProfit = closedOps.reduce((s, o) => s + (o.result || 0), 0)
  const wins = closedOps.filter(o => o.result > 0).length
  const winRate = closedOps.length > 0 ? ((wins / closedOps.length) * 100).toFixed(1) : '0.0'

  // Capital curve data
  const curveData = balanceHistory.map(b => ({
    date: new Date(b.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    balance: b.balance
  }))

  // Asset distribution
  const assetMap = {}
  operations.forEach(o => {
    if (o.asset) assetMap[o.asset] = (assetMap[o.asset] || 0) + 1
  })
  const assetData = Object.entries(assetMap)
    .map(([asset, count]) => ({ asset, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const recentOps = operations.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-widest">DASHBOARD</h1>
          <p className="text-xs text-muted font-mono mt-0.5">
            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            className="select-field w-48"
          >
            {accounts.length === 0 && <option value="">Nenhuma conta</option>}
            {accounts.map(a => (
              <option key={a.account_number} value={a.account_number}>
                {a.nickname || a.name || a.account_number}
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:border-accent/50 text-muted hover:text-white transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Saldo Atual"
          value={`R$ ${Number(currentAccount?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Activity}
          color="accent"
        />
        <MetricCard
          label="Lucro do Dia"
          value={`${dayProfit >= 0 ? '+' : ''}R$ ${Number(dayProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={dayProfit >= 0 ? TrendingUp : TrendingDown}
          color={dayProfit >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${wins}/${closedOps.length} operações`}
          icon={Target}
          color={Number(winRate) >= 50 ? 'success' : 'warning'}
        />
        <MetricCard
          label="Total Ops"
          value={operations.length}
          sub={`${operations.filter(o => o.status === 'Aberta').length} abertas`}
          icon={Activity}
          color="accent"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-white tracking-wider">CURVA DE CAPITAL</h3>
            <span className="label-muted">30 dias</span>
          </div>
          {curveData.length > 0 ? (
            <CapitalCurveChart data={curveData} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm font-mono">
              Sem dados de saldo
            </div>
          )}
        </div>

        <div className="card-glow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-white tracking-wider">DISTRIBUIÇÃO POR ATIVO</h3>
            <span className="label-muted">{operations.length} ops</span>
          </div>
          {assetData.length > 0 ? (
            <AssetDistributionChart data={assetData} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted text-sm font-mono">
              Sem operações
            </div>
          )}
        </div>
      </div>

      {/* Recent operations */}
      <div className="card-glow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-white tracking-wider">ÚLTIMAS OPERAÇÕES</h3>
          <div className="flex items-center gap-1 text-accent text-xs font-mono cursor-pointer hover:text-white transition-colors">
            Ver todas <ChevronRight size={12} />
          </div>
        </div>
        {recentOps.length > 0 ? (
          <div>
            {recentOps.map(op => (
              <OperationRow key={op.id} op={op} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted font-mono text-sm">
            Nenhuma operação encontrada
          </div>
        )}
      </div>
    </div>
  )
}
