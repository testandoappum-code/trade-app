//+------------------------------------------------------------------+
//|                                              TradeWebhook.mq5    |
//|                                     TRADE App — Telegram Webhook |
//+------------------------------------------------------------------+
#property copyright "TRADE App"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

// ── Inputs ────────────────────────────────────────────────────────────────────
input string TelegramBotToken = "SEU_BOT_TOKEN_AQUI";   // Token do Bot Telegram
input string TelegramChatId   = "SEU_CHAT_ID_AQUI";     // Chat ID do Telegram
input string WebhookUrl       = "";                      // URL do Webhook (opcional)
input bool   SendOnNewAccount = true;                    // Enviar info da conta ao iniciar
input bool   SendOnOrder      = true;                    // Enviar ordens abertas/fechadas
input int    BalanceCheckSec  = 60;                      // Intervalo de snapshot de saldo (s)

// ── Globals ───────────────────────────────────────────────────────────────────
string   g_AccountNumber;
double   g_LastBalance;
datetime g_LastBalanceSnapshot;
ulong    g_KnownTickets[];

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
{
   g_AccountNumber      = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   g_LastBalance        = AccountInfoDouble(ACCOUNT_BALANCE);
   g_LastBalanceSnapshot = 0;

   if (SendOnNewAccount)
      SendAccountInfo();

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // Periodic balance snapshot
   if (TimeCurrent() - g_LastBalanceSnapshot >= BalanceCheckSec)
   {
      g_LastBalanceSnapshot = TimeCurrent();
      double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      if (MathAbs(currentBalance - g_LastBalance) > 0.01)
      {
         g_LastBalance = currentBalance;
      }
   }
}

//+------------------------------------------------------------------+
//| Trade event handler                                              |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest&     request,
                        const MqlTradeResult&      result)
{
   if (!SendOnOrder) return;

   // Order opened
   if (trans.type == TRADE_TRANSACTION_ORDER_ADD && trans.order_state == ORDER_STATE_PLACED)
   {
      SendOrderOpened(trans);
   }

   // Deal executed (order filled = closed position)
   if (trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if (dealTicket > 0)
      {
         HistoryDealSelect(dealTicket);
         ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if (dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT)
         {
            SendOrderClosed(dealTicket);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send account info message                                        |
//+------------------------------------------------------------------+
void SendAccountInfo()
{
   string accountName    = AccountInfoString(ACCOUNT_NAME);
   string accountNumber  = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   double balance        = AccountInfoDouble(ACCOUNT_BALANCE);
   string currency       = AccountInfoString(ACCOUNT_CURRENCY);
   string broker         = AccountInfoString(ACCOUNT_COMPANY);

   string msg = "🔔 NOVA CONTA DETECTADA\n";
   msg += "Número: " + accountNumber + "\n";
   msg += "Nome: " + accountName + "\n";
   msg += "Saldo: " + DoubleToString(balance, 2) + "\n";
   msg += "Moeda: " + currency + "\n";
   msg += "Corretora: " + broker;

   SendTelegramMessage(msg);
}

//+------------------------------------------------------------------+
//| Send order opened message                                        |
//+------------------------------------------------------------------+
void SendOrderOpened(const MqlTradeTransaction& trans)
{
   ulong orderTicket = trans.order;
   if (!OrderSelect(orderTicket)) return;

   string symbol    = OrderGetString(ORDER_SYMBOL);
   double price     = OrderGetDouble(ORDER_PRICE_OPEN);
   double lots      = OrderGetDouble(ORDER_VOLUME_CURRENT);
   ENUM_ORDER_TYPE orderType = (ENUM_ORDER_TYPE)OrderGetInteger(ORDER_TYPE);
   string direction = (orderType == ORDER_TYPE_BUY || orderType == ORDER_TYPE_BUY_LIMIT || 
                       orderType == ORDER_TYPE_BUY_STOP) ? "BUY" : "SELL";

   string msg = "📈 ORDEM ABERTA\n";
   msg += "Conta: " + g_AccountNumber + "\n";
   msg += "Ativo: " + symbol + "\n";
   msg += "Direção: " + direction + "\n";
   msg += "Entrada: " + DoubleToString(price, _Digits) + "\n";
   msg += "Lotes: " + DoubleToString(lots, 2) + "\n";
   msg += "Ticket: " + IntegerToString(orderTicket);

   SendTelegramMessage(msg);
}

//+------------------------------------------------------------------+
//| Send order closed message                                        |
//+------------------------------------------------------------------+
void SendOrderClosed(ulong dealTicket)
{
   double closePrice  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double swap        = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   double commission  = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double netProfit   = profit + swap + commission;
   string symbol      = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double lots        = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double newBalance  = AccountInfoDouble(ACCOUNT_BALANCE);

   string sign = netProfit >= 0 ? "✅" : "❌";

   string msg = sign + " ORDEM FECHADA\n";
   msg += "Conta: " + g_AccountNumber + "\n";
   msg += "Ativo: " + symbol + "\n";
   msg += "Saída: " + DoubleToString(closePrice, _Digits) + "\n";
   msg += "Resultado: " + DoubleToString(netProfit, 2) + "\n";
   msg += "Lotes: " + DoubleToString(lots, 2) + "\n";
   msg += "Saldo: " + DoubleToString(newBalance, 2) + "\n";
   msg += "Deal: " + IntegerToString(dealTicket);

   SendTelegramMessage(msg);

   g_LastBalance = newBalance;
}

//+------------------------------------------------------------------+
//| Send message via Telegram Bot API                                |
//+------------------------------------------------------------------+
void SendTelegramMessage(string text)
{
   string url = "https://api.telegram.org/bot" + TelegramBotToken + "/sendMessage";

   // Escape special chars for JSON
   StringReplace(text, "\"", "\\\"");
   StringReplace(text, "\n", "\\n");

   string payload = "{\"chat_id\":\"" + TelegramChatId + "\",\"text\":\"" + text + "\",\"parse_mode\":\"HTML\"}";

   char   postData[];
   char   result[];
   string resultHeaders;

   StringToCharArray(payload, postData, 0, StringLen(payload));

   string headers = "Content-Type: application/json\r\n";

   int res = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);

   if (res == -1)
   {
      int lastError = GetLastError();
      Print("[TRADE EA] WebRequest error: ", lastError, ". Add https://api.telegram.org to allowed URLs in Tools > Options > Expert Advisors.");
   }
   else
   {
      string response = CharArrayToString(result);
      if (StringFind(response, "\"ok\":true") >= 0)
         Print("[TRADE EA] Message sent: ", text);
      else
         Print("[TRADE EA] Telegram error: ", response);
   }
}
