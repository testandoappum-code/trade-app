import { useState, useEffect } from 'react'
import { Search, Filter, Download, TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react'
import { getOperations } from '../lib/supabase'

function SummaryCard({ label, value, color = 'white', icon: Icon }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={14} className={`text-${color === 'white' ? 'muted' : color}`} />}
        <p className="label-muted">{label}</p>
      </div>
      <p className={`font-mono font-bold text-lg text-${color}`}>{value}</p>
    </div>
  )
}

function OperationCard({ op }) {
  const isWin = op.result > 0
  const isOpen = op.status === 'Aberta'

  return (
    <div className="card hover:border-accent/20 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 ${
            isOpen ? 'bg-warning/15 text-warning' :
            isWin ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          }`}>
            {op.asset?.slice(0, 3) || '???'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-white">{op.asset}</span>
              {op.direction && (
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  op.direction === 'BUY' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                }`}>
                  {op.direction}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                isOpen ? 'bg-warning/15 text-warning' : 'bg-white/10 text-white/60'
              }`}>
                {op.status}
              </span>
            </div>
            <p className="text-xs text-muted font-mono mt-0.5">
              {op.account_number} · {new Date(op.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          {isOpen ? (
            <div>
              <p className="text-xs text-muted font-mono">Entrada</p>
              <p className="font-mono font-bold text-white">R$ {Number(op.entry_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          ) : (
            <div>
              <p className={`font-mono font-bold text-lg ${isWin ? 'text-success' : 'text-danger'}`}>
                {isWin ? '+' : ''}R$ {Number(op.result || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted font-mono">{op.lots} lotes</p>
            </div>
          )}
        </div>
      </div>

      {!isOpen && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-3">
          <div>
            <p className="label-muted">Entrada</p>
            <p className="font-mono text-sm text-white">
              {op.entry_price ? `R$ ${Number(op.entry_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div>
            <p className="label-muted">Saída</p>
            <p className="font-mono text-sm text-white">
              {op.exit_price ? `R$ ${Number(op.exit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div>
            <p className="label-muted">Lotes</p>
            <p className="font-mono text-sm text-white">{op.lots || '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Diario({ accounts }) {
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    account: '',
    asset: '',
    status: '',
    from: '',
    to: '',
  })

  useEffect(() => {
    loadOps()
  }, [filters])

  async function loadOps() {
    setLoading(true)
    try {
      const ops = await getOperations({
        account: filters.account || undefined,
        asset: filters.asset || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      setOperations(ops || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const closed = operations.filter(o => o.status === 'Fechada')
  const wins = closed.filter(o => o.result > 0)
  const losses = closed.filter(o => o.result <= 0)
  const totalProfit = wins.reduce((s, o) => s + (o.result || 0), 0)
  const totalLoss = losses.reduce((s, o) => s + (o.result || 0), 0)
  const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) : '0.0'

  function exportCSV() {
    const headers = ['ID', 'Conta', 'Ativo', 'Direção', 'Entrada', 'Saída', 'Lotes', 'Resultado', 'Status', 'Aberta em']
    const rows = operations.map(o => [
      o.id, o.account_number, o.asset, o.direction || '',
      o.entry_price || '', o.exit_price || '', o.lots || '',
      o.result || '', o.status, o.opened_at || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diario-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-widest">DIÁRIO</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{operations.length} operações</p>
        </div>
        <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 border border-border">
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total Ops" value={operations.length} icon={Activity} />
        <SummaryCard label="Lucro Total" value={`+R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="success" icon={TrendingUp} />
        <SummaryCard label="Prejuízo Total" value={`R$ ${totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="danger" icon={TrendingDown} />
        <SummaryCard label="Win Rate" value={`${winRate}%`} color={Number(winRate) >= 50 ? 'success' : 'warning'} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-accent" />
          <span className="text-sm font-medium text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={filters.account}
            onChange={e => setFilters(f => ({ ...f, account: e.target.value }))}
            className="select-field"
          >
            <option value="">Todas as contas</option>
            {accounts.map(a => (
              <option key={a.account_number} value={a.account_number}>
                {a.nickname || a.name || a.account_number}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Ativo..."
              value={filters.asset}
              onChange={e => setFilters(f => ({ ...f, asset: e.target.value }))}
              className="input-field pl-8"
            />
          </div>

          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="select-field"
          >
            <option value="">Todos status</option>
            <option value="Aberta">Abertas</option>
            <option value="Fechada">Fechadas</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className="input-field"
            placeholder="De"
          />

          <input
            type="date"
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className="input-field"
            placeholder="Até"
          />
        </div>
      </div>

      {/* Operations list */}
      {loading ? (
        <div className="text-center py-12 text-muted font-mono text-sm">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          Carregando...
        </div>
      ) : operations.length > 0 ? (
        <div className="space-y-3">
          {operations.map(op => (
            <OperationCard key={op.id} op={op} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted font-mono">
          <Activity size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma operação encontrada</p>
          <p className="text-xs mt-1">Ajuste os filtros ou conecte o EA ao Telegram</p>
        </div>
      )}
    </div>
  )
}
