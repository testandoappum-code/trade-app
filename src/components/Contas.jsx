import { useState } from 'react'
import { Wallet, Edit2, Check, X, TrendingUp, TrendingDown, Copy } from 'lucide-react'
import { updateAccountNickname } from '../lib/supabase'

function AccountCard({ account, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(account.nickname || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateAccountNickname(account.account_number, nickname)
      onUpdate()
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function copyNumber() {
    navigator.clipboard.writeText(account.account_number)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const balance = Number(account.balance || 0)
  const isPositive = balance >= 0

  return (
    <div className="card-glow hover:border-accent/30 transition-all duration-300 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Wallet size={20} className="text-accent" />
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                  autoFocus
                  className="input-field text-sm h-8 w-40"
                  placeholder="Apelido da conta"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-1.5 rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setEditing(false); setNickname(account.nickname || '') }}
                  className="p-1.5 rounded bg-white/10 text-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {account.nickname || account.name || `Conta ${account.account_number.slice(-4)}`}
                </span>
                <button
                  onClick={() => setEditing(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-muted hover:text-white transition-all"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted font-mono">{account.account_number}</span>
              <button
                onClick={copyNumber}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all"
              >
                {copied ? (
                  <Check size={10} className="text-success" />
                ) : (
                  <Copy size={10} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-mono font-bold text-xl ${isPositive ? 'text-white' : 'text-danger'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted font-mono">{account.broker || 'MT5'}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
        <div>
          <p className="label-muted mb-1">Corretora</p>
          <p className="text-sm font-mono text-white">{account.broker || 'MT5'}</p>
        </div>
        <div>
          <p className="label-muted mb-1">Nome</p>
          <p className="text-sm font-mono text-white truncate">{account.name || '—'}</p>
        </div>
        <div>
          <p className="label-muted mb-1">Cadastro</p>
          <p className="text-sm font-mono text-white">
            {account.created_at ? new Date(account.created_at).toLocaleDateString('pt-BR') : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Contas({ accounts, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-widest">CONTAS MT5</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} registrada{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted font-mono bg-surface border border-border rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Contas criadas automaticamente via webhook
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-accent opacity-50" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Nenhuma conta cadastrada</h3>
          <p className="text-muted font-mono text-sm max-w-md mx-auto">
            As contas são criadas automaticamente quando o EA do MT5 envia a mensagem "NOVA CONTA DETECTADA" pelo webhook do Telegram.
          </p>
          <div className="mt-6 p-4 bg-surface border border-border/50 rounded-xl text-left max-w-md mx-auto">
            <p className="label-muted mb-2">FORMATO ESPERADO</p>
            <pre className="text-xs font-mono text-accent/80 whitespace-pre-wrap">
{`NOVA CONTA DETECTADA
Número: 12345678
Nome: João Silva
Saldo: 10000.00`}
            </pre>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map(account => (
            <AccountCard
              key={account.account_number}
              account={account}
              onUpdate={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
