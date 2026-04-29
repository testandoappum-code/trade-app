import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Webhook handler for Telegram messages from MT5 EA
 * Processes:
 *   1. "NOVA CONTA DETECTADA" → creates/updates trading_accounts
 *   2. "ORDEM ABERTA" → inserts into trading_operations with status 'Aberta'
 *   3. "ORDEM FECHADA" → updates trading_operations and account balance
 */
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    // Telegram sends updates via webhook
    const message = body?.message?.text || body?.text || ''

    if (!message) {
      return res.status(200).json({ ok: true, message: 'No text to process' })
    }

    console.log('[WEBHOOK] Received message:', message.substring(0, 100))

    // ── 1. NOVA CONTA DETECTADA ──────────────────────────────────────────────
    if (message.includes('NOVA CONTA DETECTADA')) {
      const accountNumber = extractValue(message, ['Número:', 'Account:', 'Conta:'])
      const name = extractValue(message, ['Nome:', 'Name:', 'Titular:'])
      const balance = parseFloat(extractValue(message, ['Saldo:', 'Balance:']) || '0')

      if (!accountNumber) {
        return res.status(400).json({ error: 'Account number not found in message' })
      }

      const { data, error } = await supabase
        .from('trading_accounts')
        .upsert({
          account_number: accountNumber,
          name: name || null,
          balance: balance,
          broker: 'MT5',
        }, { onConflict: 'account_number' })
        .select()

      if (error) throw error

      // Snapshot initial balance
      await supabase.from('account_balance').insert({
        account_number: accountNumber,
        balance: balance,
      })

      return res.status(200).json({ ok: true, action: 'account_created', data })
    }

    // ── 2. ORDEM ABERTA ──────────────────────────────────────────────────────
    if (message.includes('ORDEM ABERTA') || message.includes('ORDER OPENED')) {
      const accountNumber = extractValue(message, ['Conta:', 'Account:', 'Número:'])
      const asset = extractValue(message, ['Ativo:', 'Symbol:', 'Par:'])
      const direction = extractValue(message, ['Direção:', 'Direction:', 'Tipo:'])?.toUpperCase()
      const entryPrice = parseFloat(extractValue(message, ['Entrada:', 'Price:', 'Entry:']) || '0')
      const lots = parseFloat(extractValue(message, ['Lotes:', 'Lots:', 'Volume:']) || '0')

      if (!accountNumber || !asset) {
        return res.status(400).json({ error: 'Missing account or asset' })
      }

      const { data, error } = await supabase
        .from('trading_operations')
        .insert({
          account_number: accountNumber,
          asset: asset,
          direction: direction && ['BUY', 'SELL', 'COMPRA', 'VENDA'].includes(direction)
            ? (direction === 'COMPRA' ? 'BUY' : direction === 'VENDA' ? 'SELL' : direction)
            : direction,
          entry_price: entryPrice,
          lots: lots,
          status: 'Aberta',
          opened_at: new Date().toISOString().split('T')[0],
        })
        .select()

      if (error) throw error
      return res.status(200).json({ ok: true, action: 'order_opened', data })
    }

    // ── 3. ORDEM FECHADA ─────────────────────────────────────────────────────
    if (message.includes('ORDEM FECHADA') || message.includes('ORDER CLOSED')) {
      const accountNumber = extractValue(message, ['Conta:', 'Account:', 'Número:'])
      const asset = extractValue(message, ['Ativo:', 'Symbol:', 'Par:'])
      const exitPrice = parseFloat(extractValue(message, ['Saída:', 'Close:', 'Exit:']) || '0')
      const result = parseFloat(extractValue(message, ['Resultado:', 'Result:', 'PnL:', 'Lucro:', 'Profit:']) || '0')
      const newBalance = parseFloat(extractValue(message, ['Saldo:', 'Balance:', 'Novo Saldo:']) || '0')

      if (!accountNumber) {
        return res.status(400).json({ error: 'Missing account number' })
      }

      // Find the most recent open operation for this asset/account
      const { data: openOps } = await supabase
        .from('trading_operations')
        .select('id')
        .eq('account_number', accountNumber)
        .eq('status', 'Aberta')
        .order('created_at', { ascending: false })
        .limit(1)

      if (openOps && openOps.length > 0) {
        await supabase
          .from('trading_operations')
          .update({
            exit_price: exitPrice,
            result: result,
            status: 'Fechada',
            closed_at: new Date().toISOString().split('T')[0],
          })
          .eq('id', openOps[0].id)
      }

      // Update account balance
      if (newBalance > 0 && accountNumber) {
        await supabase
          .from('trading_accounts')
          .update({ balance: newBalance })
          .eq('account_number', accountNumber)

        // Snapshot new balance
        await supabase.from('account_balance').insert({
          account_number: accountNumber,
          balance: newBalance,
        })
      }

      // Update daily stop progress
      const today = new Date().toISOString().split('T')[0]
      const { data: stopData } = await supabase
        .from('trading_daily_stops')
        .select('*')
        .eq('account_number', accountNumber)
        .eq('stop_date', today)

      if (stopData && stopData.length > 0) {
        for (const stop of stopData) {
          const isLoss = result < 0
          const updates = isLoss
            ? { current_loss: (stop.current_loss || 0) + Math.abs(result) }
            : { current_profit: (stop.current_profit || 0) + result }

          // Check if stopped
          if (stop.stop_type === 'loss' && isLoss) {
            updates.is_stopped = updates.current_loss >= stop.stop_value
          } else if (stop.stop_type === 'profit' && !isLoss) {
            updates.is_stopped = updates.current_profit >= stop.stop_value
          }

          await supabase
            .from('trading_daily_stops')
            .update(updates)
            .eq('id', stop.id)
        }
      }

      return res.status(200).json({ ok: true, action: 'order_closed' })
    }

    // Unknown message format
    return res.status(200).json({ ok: true, message: 'Message not recognized', received: message.substring(0, 50) })

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Extracts a value following any of the given labels in a message string.
 * e.g. extractValue("Conta: 12345678\nSaldo: 100", ["Conta:"]) → "12345678"
 */
function extractValue(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*([^\\n\\r]+)`, 'i')
    const match = text.match(regex)
    if (match) return match[1].trim()
  }
  return null
}
