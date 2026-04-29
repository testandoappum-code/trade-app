import { useState, useEffect } from 'react'
import { History, Download, TrendingUp, TrendingDown, Activity, CheckCircle, Filter } from 'lucide-react'
import { getOperations } from '../lib/supabase'
import { MonthlyPnlChart } from './Charts'

export default function Historico({ accounts }) {
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ account: '', from: '', to: '' })

  useEffect(() => {
    loadHistory()
  }, [filters])

  async function loadHistory() {
    setLoading(true)
    try {
      const ops = await getOperations({
        account: filters.account || undefined,
        status: 'Fechada',
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

  const wins = operations.filter(o => o.result > 0)
  const losses = operations.filter(o => o.result <= 0)
  const totalProfit = wins.reduce((s, o) => s + (o.result || 0), 0)
  const totalLoss = losses.reduce((s, o) => s + (o.result || 0), 0)
  const netResult = totalProfit + totalLoss
  const winRate = operations.length > 0 ? ((wins.length / operations.length) * 100).toFixed(1) : '0.0'

  // Monthly PnL data
  const monthlyMap = {}
  operations.forEach(op => {
    if (!op.closed_at && !op.opened_at) return
    const date = new Date(op.closed_at || op.opened_at)
    const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    monthlyMap[key] = (monthlyMap[key] || 0) + (op.result || 0)
  })
  const monthlyData = Object.entries(monthlyMap)
    .map(([month, result]) => ({ month, result: Number(result.toFixed(2)) }))
    .slice(-12)

  function exportCSV() {
    const headers = ['ID', 'Conta', 'Ativo', 'Direção', 'Entrada', 'Saída', 'Lotes', 'Resultado', 'Data Abertura', 'Data Fechamento']
    const rows = operations.map(o => [
      o.id, o.account_number, o.asset, o.direction || '',
      o.entry_price || '', o.exit_price || '', o.lots || '',
      o.result || '', o.opened_at || '', o.closed_at || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-widest">HISTÓRICO</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{operations.length} operações fechadas</p>
        </div>
        <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 border border-border">
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="label-muted mb-1">Total Ops</p>
          <p className="font-mono font-bold text-2xl text-white">{operations.length}</p>
        </div>
        <div className="card border-success/20 bg-success/5">
          <p className="label-muted mb-1">Lucro Total</p>
          <p className="font-mono font-bold text-2xl text-success">
            +R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card border-danger/20 bg-danger/5">
          <p className="label-muted mb-1">Prejuízo Total</p>
          <p className="font-mono font-bold text-2xl text-danger">
            R$ {totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`card ${Number(winRate) >= 50 ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'}`}>
          <p className="label-muted mb-1">Taxa de Acerto</p>
          <p className={`font-mono font-bold text-2xl ${Number(winRate) >= 50 ? 'text-success' : 'text-warning'}`}>
            {winRate}%
          </p>
        </div>
      </div>

      {/* Net result highlight */}
      <div className={`p-4 rounded-xl border ${netResult >= 0 ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {netResult >= 0 ? <TrendingUp size={20} className="text-success" /> : <TrendingDown size={20} className="text-danger" />}
          <div>
            <p className="label-muted">Resultado Líquido Total</p>
            <p className={`font-mono font-bold text-xl ${netResult >= 0 ? 'text-success' : 'text-danger'}`}>
              {netResult >= 0 ? '+' : ''}R$ {netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="label-muted">Fator de Lucro</p>
          <p className="font-mono font-bold text-white text-lg">
            {totalLoss !== 0 ? Math.abs(totalProfit / totalLoss).toFixed(2) : '∞'}
          </p>
        </div>
      </div>

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div className="card-glow">
          <h3 className="font-display text-sm font-bold text-white tracking-wider mb-4">RESULTADO POR MÊS</h3>
          <MonthlyPnlChart data={monthlyData} />
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-accent" />
          <span className="text-sm font-medium text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field" />
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input-field" />
        </div>
      </div>

      {/* Operations table */}
      {loading ? (
        <div className="text-center py-12 text-muted font-mono text-sm">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          Carregando histórico...
        </div>
      ) : operations.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Conta', 'Ativo', 'Dir.', 'Entrada', 'Saída', 'Lotes', 'Resultado', 'Data'].map(h => (
                    <th key={h} className="text-left py-3 px-3 label-muted font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operations.map(op => {
                  const isWin = op.result > 0
                  return (
                    <tr key={op.id} className="border-b border-border/30 hover:bg-white/2 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-xs text-muted">{op.account_number?.slice(-6)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{op.asset}</td>
                      <td className="py-2.5 px-3">
                        {op.direction && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${op.direction === 'BUY' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                            {op.direction}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-white">
                        {op.entry_price ? `R$ ${Number(op.entry_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-white">
                        {op.exit_price ? `R$ ${Number(op.exit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted">{op.lots || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono font-bold text-sm ${isWin ? 'text-success' : 'text-danger'}`}>
                          {isWin ? '+' : ''}R$ {Number(op.result || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted">
                        {op.closed_at || op.opened_at || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted font-mono">
          <History size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma operação fechada encontrada</p>
        </div>
      )}
    </div>
  )
}
