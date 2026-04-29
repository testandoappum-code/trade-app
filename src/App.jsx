import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Diario from './components/Diario'
import Gerenciamento from './components/Gerenciamento'
import Contas from './components/Contas'
import Historico from './components/Historico'
import { getAccounts } from './lib/supabase'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [accounts, setAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  useEffect(() => {
    loadAccounts()
    const interval = setInterval(loadAccounts, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadAccounts() {
    try {
      const data = await getAccounts()
      setAccounts(data || [])
    } catch (e) {
      console.error('Failed to load accounts:', e)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const tabProps = { accounts, onRefresh: loadAccounts }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {loadingAccounts ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-muted font-mono text-sm">Conectando ao banco de dados...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <Dashboard {...tabProps} />}
          {activeTab === 'diario' && <Diario {...tabProps} />}
          {activeTab === 'gerenciamento' && <Gerenciamento {...tabProps} />}
          {activeTab === 'contas' && <Contas {...tabProps} />}
          {activeTab === 'historico' && <Historico {...tabProps} />}
        </>
      )}
    </Layout>
  )
}
