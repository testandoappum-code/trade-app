# TRADE — Terminal Operacional MT5

Dashboard futurista dark para acompanhar operações do MetaTrader 5 em tempo real via Telegram.

## Stack

- **Frontend**: React + Vite + TailwindCSS + Recharts + Lucide
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Integração**: MT5 EA → Telegram Bot → Webhook Vercel → Supabase

---

## 1. Configurar Supabase (NOVO PROJETO)

1. Acesse [supabase.com](https://supabase.com) e crie um **novo projeto** separado
2. No **SQL Editor**, execute o seguinte script:

```sql
CREATE TABLE trading_accounts (
  id SERIAL PRIMARY KEY,
  account_number TEXT UNIQUE NOT NULL,
  name TEXT,
  nickname TEXT,
  balance DECIMAL(10,2) DEFAULT 0,
  broker TEXT DEFAULT 'MT5',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trading_operations (
  id SERIAL PRIMARY KEY,
  account_number TEXT REFERENCES trading_accounts(account_number),
  asset TEXT NOT NULL,
  direction TEXT,
  entry_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  lots DECIMAL(10,2),
  result DECIMAL(10,2),
  status TEXT DEFAULT 'Aberta',
  opened_at DATE DEFAULT CURRENT_DATE,
  closed_at DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE account_balance (
  id SERIAL PRIMARY KEY,
  account_number TEXT REFERENCES trading_accounts(account_number),
  balance DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trading_goals (
  id SERIAL PRIMARY KEY,
  account_number TEXT REFERENCES trading_accounts(account_number),
  goal_type TEXT DEFAULT 'daily',
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trading_daily_stops (
  id SERIAL PRIMARY KEY,
  account_number TEXT REFERENCES trading_accounts(account_number),
  stop_type TEXT DEFAULT 'loss',
  stop_value DECIMAL(10,2) NOT NULL,
  current_loss DECIMAL(10,2) DEFAULT 0,
  current_profit DECIMAL(10,2) DEFAULT 0,
  is_stopped BOOLEAN DEFAULT false,
  stop_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE trading_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE trading_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance DISABLE ROW LEVEL SECURITY;
ALTER TABLE trading_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE trading_daily_stops DISABLE ROW LEVEL SECURITY;
```

3. Copie as chaves em **Project Settings > API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_KEY`

---

## 2. Criar Bot no Telegram

1. Abra o [@BotFather](https://t.me/BotFather) no Telegram
2. Digite `/newbot` e siga as instruções
3. Copie o **token** do bot
4. Inicie uma conversa com o bot
5. Acesse `https://api.telegram.org/bot<TOKEN>/getUpdates` para pegar seu **chat_id**

---

## 3. Deploy no Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# No diretório do projeto
vercel

# Configurar variáveis de ambiente no Vercel Dashboard:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...
```

Após o deploy, sua URL será algo como: `https://trade-app.vercel.app`

O webhook estará disponível em: `https://trade-app.vercel.app/api/webhook`

---

## 4. Configurar o Webhook no Telegram

Registre o webhook no Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://trade-app.vercel.app/api/webhook"}'
```

---

## 5. Instalar o EA no MT5

1. Copie `TradeWebhook.mq5` para a pasta `MQL5/Experts/` do MT5
2. No MetaEditor, compile o arquivo (F7)
3. No MT5: **Ferramentas > Opções > Expert Advisors**
   - Marque **"Allow WebRequest for listed URL"**
   - Adicione: `https://api.telegram.org`
4. Arraste o EA para qualquer gráfico
5. Configure:
   - `TelegramBotToken`: token do seu bot
   - `TelegramChatId`: seu chat_id

---

## 6. Desenvolvimento Local

```bash
# Clonar e instalar
npm install

# Criar .env local
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar dev server
npm run dev
```

---

## Formato das Mensagens do EA

### Nova Conta
```
NOVA CONTA DETECTADA
Número: 12345678
Nome: João Silva
Saldo: 10000.00
Moeda: BRL
Corretora: XP Investimentos
```

### Ordem Aberta
```
ORDEM ABERTA
Conta: 12345678
Ativo: WINQ24
Direção: BUY
Entrada: 130250.00
Lotes: 1.00
Ticket: 987654321
```

### Ordem Fechada
```
ORDEM FECHADA
Conta: 12345678
Ativo: WINQ24
Saída: 130500.00
Resultado: 250.00
Lotes: 1.00
Saldo: 10250.00
Deal: 987654322
```

---

## Estrutura do Projeto

```
trade-app/
├── src/
│   ├── components/
│   │   ├── Layout.jsx       # Sidebar + navegação
│   │   ├── Dashboard.jsx    # Métricas e gráficos
│   │   ├── Diario.jsx       # Lista de operações
│   │   ├── Gerenciamento.jsx # Metas e stops
│   │   ├── Contas.jsx       # Contas MT5
│   │   ├── Historico.jsx    # Histórico fechado
│   │   └── Charts.jsx       # Componentes Recharts
│   ├── lib/
│   │   └── supabase.js      # Cliente e helpers
│   ├── pages/api/
│   │   └── webhook.js       # Handler do webhook
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── TradeWebhook.mq5         # EA para MT5
├── vercel.json
├── .env.example
└── README.md
```
