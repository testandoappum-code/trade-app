import { useState, useEffect } from 'react'
import { Shield, Target, AlertTriangle, TrendingUp, Save, CheckCircle, XCircle } from 'lucide-react'
import { getGoals, upsertGoal, getDailyStop, upsertDailyStop, getOperations } from '../lib/supabase'

function ProgressBar({ value, max, color = 'accent' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorMap = {
    accent: 'bg-accent',
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-warning',
  }
  return (
    <div className="w-full bg-surface rounded-full h-3 overflow-hidden border border-border">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${colorMap[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StopIndicator({ label, current, limit, type }) {
  const pct = limit > 0 ? Math.min((Math.abs(current) / limit) * 100, 100) : 0
  const isWarning = pct >= 70
  const isStopped = pct >= 100

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isStopped ? 'border-danger/50 bg-danger/5' :
      isWarning ? 'border-warning/50 bg-warning/5' :
      'border-border bg-surface'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isStopped ? <XCircle size={16} className="text-danger" /> :
           isWarning ? <AlertTriangle size={16} className="text-warning" /> :
           <CheckCircle size={16} className="text-success" />}
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className={`font-mono text-sm font-bold ${isStopped ? 'text-danger' : isWarning ? 'text-warning' : 'text-white'}`}>
          {pct.toFixed(0)}%
        </div>
      </div>

      <ProgressBar
        value={Math.abs(current)}
        max={limit}
        color={isStopped ? 'danger' : isWarning ? 'warning' : 'success'}
      />

      <div className="flex justify-between mt-2 text-xs font-mono text-muted">
        <span>R$ {Number(Math.abs(current)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        <span>Limite: R$ {Number(limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>

      {isStopped && (
        <div className="mt-2 text-xs text-danger font-mono font-bold animate-pulse">
          ⚠ STOP ATINGIDO — ENCERRE AS OPERAÇÕES
        </div>
      )}
    </div>
  )
}

export default function Gerenciamento({ accounts }) {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [goals, setGoals] = useState([])
  const [dailyStop, setDailyStop] = useState(null)
  const [todayOps, setTodayOps] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [goalAmount, setGoalAmount] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [stopProfit, setStopProfit] = useState('')

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].account_number)
    }
  }, [accounts])

  useEffect(() => {
    if (selectedAccount) loadData()
  }, [selectedAccount])

  async function loadData() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [goalsData, stopData, ops] = await Promise.all([
        getGoals(selectedAccount),
        getDailyStop(selectedAccount, today),
        getOperations({ account: selectedAccount, from: today, to: today }),
      ])

      setGoals(goalsData || [])
      setDailyStop(stopData)
      setTodayOps(ops || [])

      // Pre-fill form with existing values
      const dailyGoal = goalsData?.find(g => g.goal_type === 'daily')
      if (dailyGoal) setGoalAmount(dailyGoal.target_amount)
      if (stopData) {
        if (stopData.stop_type === 'loss') setStopLoss(stopData.stop_value)
        if (stopData.stop_type === 'profit') setStopProfit(stopData.stop_value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSave() {
    if (!selectedAccount) return
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const dayProfit = todayOps.filter(o => o.status === 'Fechada').reduce((s, o) => s + (o.result || 0), 0)
      const dayLoss = Math.abs(Math.min(dayProfit, 0))

      const saves = []

      if (goalAmount) {
        saves.push(upsertGoal({
          account_number: selectedAccount,
          goal_type: 'daily',
          target_amount: Number(goalAmount),
          current_amount: Math.max(dayProfit, 0),
          is_active: true,
        }))
      }

      if (stopLoss) {
        saves.push(upsertDailyStop({
          account_number: selectedAccount,
          stop_type: 'loss',
          stop_value: Number(stopLoss),
          current_loss: dayLoss,
          current_profit: Math.max(dayProfit, 0),
          is_stopped: dayLoss >= Number(stopLoss),
          stop_date: today,
        }))
      }

      if (stopProfit) {
        saves.push(upsertDailyStop({
          account_number: selectedAccount,
          stop_type: 'profit',
          stop_value: Number(stopProfit),
          current_loss: dayLoss,
          current_profit: Math.max(dayProfit, 0),
          is_stopped: Math.max(dayProfit, 0) >= Number(stopProfit),
          stop_date: today,
        }))
      }

      await Promise.all(saves)
      await loadData()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const closedToday = todayOps.filter(o => o.status === 'Fechada')
  const dayResult = closedToday.reduce((s, o) => s + (o.result || 0), 0)
  const dayLoss = Math.abs(Math.min(dayResult, 0))
  const dayProfit = Math.max(dayResult, 0)
  const dailyGoal = goals.find(g => g.goal_type === 'daily')
  const goalProgress = dailyGoal ? Math.min((dayProfit / dailyGoal.target_amount) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-widest">GERENCIAMENTO</h1>
          <p className="text-xs text-muted font-mono mt-0.5">Metas e stops do dia</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: configuration */}
        <div className="space-y-4">
          <div className="card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-accent" />
              <h3 className="font-display text-sm font-bold text-white tracking-wider">META DO DIA</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-muted block mb-1">Objetivo (R$)</label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  placeholder="Ex: 500.00"
                  className="input-field"
                />
              </div>
            </div>

            {dailyGoal && (
              <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
                <div className="flex justify-between text-xs font-mono text-muted mb-2">
                  <span>Progresso: R$ {dayProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>Meta: R$ {Number(dailyGoal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <ProgressBar value={dayProfit} max={dailyGoal.target_amount} color={goalProgress >= 100 ? 'success' : 'accent'} />
                <p className={`text-xs font-mono mt-2 font-bold ${goalProgress >= 100 ? 'text-success' : 'text-white/60'}`}>
                  {goalProgress >= 100 ? '🎯 META ATINGIDA!' : `${goalProgress.toFixed(0)}% da meta`}
                </p>
              </div>
            )}
          </div>

          <div className="card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-danger" />
              <h3 className="font-display text-sm font-bold text-white tracking-wider">STOPS</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-muted block mb-1">Stop Loss do Dia (R$)</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={e => setStopLoss(e.target.value)}
                  placeholder="Ex: 300.00"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-muted block mb-1">Stop Gain do Dia (R$)</label>
                <input
                  type="number"
                  value={stopProfit}
                  onChange={e => setStopProfit(e.target.value)}
                  placeholder="Ex: 1000.00"
                  className="input-field"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !selectedAccount}
              className={`
                mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all
                ${saved ? 'bg-success/20 text-success border border-success/30' :
                  'btn-primary'}
              `}
            >
              {saving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : saved ? (
                <><CheckCircle size={16} /> Salvo!</>
              ) : (
                <><Save size={16} /> Salvar Configurações</>
              )}
            </button>
          </div>
        </div>

        {/* Right: real-time monitoring */}
        <div className="space-y-4">
          <div className="card-glow">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-warning" />
              <h3 className="font-display text-sm font-bold text-white tracking-wider">MONITORAMENTO EM TEMPO REAL</h3>
            </div>

            <div className="space-y-3">
              {stopLoss ? (
                <StopIndicator
                  label="Stop Loss"
                  current={dayLoss}
                  limit={Number(stopLoss)}
                  type="loss"
                />
              ) : (
                <div className="p-4 rounded-xl border border-border bg-surface text-center text-muted text-sm font-mono">
                  Configure o stop loss →
                </div>
              )}

              {stopProfit ? (
                <StopIndicator
                  label="Stop Gain"
                  current={dayProfit}
                  limit={Number(stopProfit)}
                  type="profit"
                />
              ) : (
                <div className="p-4 rounded-xl border border-border bg-surface text-center text-muted text-sm font-mono">
                  Configure o stop gain →
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xs font-bold text-white tracking-wider mb-3">RESUMO DO DIA</h3>
            <div className="space-y-2">
              {[
                { label: 'Operações fechadas', value: closedToday.length },
                { label: 'Ganhos', value: `+R$ ${dayProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-success' },
                { label: 'Perdas', value: `-R$ ${dayLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-danger' },
                { label: 'Resultado líquido', value: `${dayResult >= 0 ? '+' : ''}R$ ${dayResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: dayResult >= 0 ? 'text-success' : 'text-danger' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted font-mono">{label}</span>
                  <span className={`text-xs font-mono font-bold ${color || 'text-white'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
