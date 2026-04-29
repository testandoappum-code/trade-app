import { useState } from 'react'
import {
  LayoutDashboard, BookOpen, Shield, Wallet, History,
  Activity, ChevronRight, Zap, Menu, X
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'diario', label: 'Diário', icon: BookOpen },
  { id: 'gerenciamento', label: 'Gerenciamento', icon: Shield },
  { id: 'contas', label: 'Contas', icon: Wallet },
  { id: 'historico', label: 'Histórico', icon: History },
]

export default function Layout({ activeTab, onTabChange, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden scanlines">
      {/* Background grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />

      {/* Sidebar — Desktop */}
      <aside
        className={`
          relative z-20 hidden md:flex flex-col
          ${collapsed ? 'w-16' : 'w-56'}
          bg-surface border-r border-border transition-all duration-300 flex-shrink-0
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-accent/20 glow-border flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-accent" />
          </div>
          {!collapsed && (
            <span className="font-display text-white font-bold text-lg tracking-widest">TRADE</span>
          )}
        </div>

        {/* Live indicator */}
        {!collapsed && (
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono text-muted">SISTEMA ATIVO</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => { onTabChange(id); setMobileOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">{label}</span>
                    {isActive && <ChevronRight size={14} />}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="m-3 p-2 rounded-lg border border-border hover:border-accent/50 text-muted hover:text-white transition-all"
        >
          <Menu size={16} />
        </button>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 glow-border flex items-center justify-center">
                  <Zap size={16} className="text-accent" />
                </div>
                <span className="font-display text-white font-bold text-lg tracking-widest">TRADE</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 px-2">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => { onTabChange(id); setMobileOpen(false) }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                      ${isActive
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-muted hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent" />
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono text-success">LIVE</span>
            </div>
            <span className="text-xs font-mono text-muted hidden sm:block">
              {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
