import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Trading Accounts ─────────────────────────────────────────────────────────

export async function getAccounts() {
  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateAccountNickname(accountNumber, nickname) {
  const { data, error } = await supabase
    .from('trading_accounts')
    .update({ nickname })
    .eq('account_number', accountNumber)
    .select()
  if (error) throw error
  return data
}

export async function upsertAccount(account) {
  const { data, error } = await supabase
    .from('trading_accounts')
    .upsert(account, { onConflict: 'account_number' })
    .select()
  if (error) throw error
  return data
}

// ─── Trading Operations ───────────────────────────────────────────────────────

export async function getOperations(filters = {}) {
  let query = supabase
    .from('trading_operations')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.account) query = query.eq('account_number', filters.account)
  if (filters.asset) query = query.ilike('asset', `%${filters.asset}%`)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('opened_at', filters.from)
  if (filters.to) query = query.lte('opened_at', filters.to)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function insertOperation(operation) {
  const { data, error } = await supabase
    .from('trading_operations')
    .insert(operation)
    .select()
  if (error) throw error
  return data
}

export async function updateOperation(id, updates) {
  const { data, error } = await supabase
    .from('trading_operations')
    .update(updates)
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

export async function getOperationsByAccount(accountNumber, limit = 100) {
  const { data, error } = await supabase
    .from('trading_operations')
    .select('*')
    .eq('account_number', accountNumber)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── Account Balance History ──────────────────────────────────────────────────

export async function getBalanceHistory(accountNumber, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('account_balance')
    .select('*')
    .eq('account_number', accountNumber)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function insertBalanceSnapshot(accountNumber, balance) {
  const { data, error } = await supabase
    .from('account_balance')
    .insert({ account_number: accountNumber, balance })
    .select()
  if (error) throw error
  return data
}

// ─── Trading Goals ─────────────────────────────────────────────────────────────

export async function getGoals(accountNumber) {
  const { data, error } = await supabase
    .from('trading_goals')
    .select('*')
    .eq('account_number', accountNumber)
    .eq('is_active', true)
  if (error) throw error
  return data
}

export async function upsertGoal(goal) {
  const { data, error } = await supabase
    .from('trading_goals')
    .upsert(goal)
    .select()
  if (error) throw error
  return data
}

export async function updateGoalProgress(id, currentAmount) {
  const { data, error } = await supabase
    .from('trading_goals')
    .update({ current_amount: currentAmount })
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

// ─── Daily Stops ──────────────────────────────────────────────────────────────

export async function getDailyStop(accountNumber, date) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('trading_daily_stops')
    .select('*')
    .eq('account_number', accountNumber)
    .eq('stop_date', targetDate)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertDailyStop(stop) {
  const { data, error } = await supabase
    .from('trading_daily_stops')
    .upsert(stop)
    .select()
  if (error) throw error
  return data
}
