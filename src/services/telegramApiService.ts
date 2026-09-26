import { Party, Invoice, FinancialTransaction, CompanySettings } from '../types';
import { formatNumber, getPersianDate, getCurrencyLabel, formatTelegramItemLine } from '../utils/formatters';

export interface TelegramStatusResponse {
  isConfigured: boolean;
  botUsername: string;
  botFirstName: string;
  defaultChatId: string;
  isPolling: boolean;
  pendingCount: number;
  connectedCount: number;
  lastTestStatus: 'connected' | 'error' | 'idle';
  lastTestedAt?: string;
  lastError?: string;
}

export interface TelegramUser {
  id: string;
  telegramUserId: string;
  telegramChatId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  username?: string;
  connectionCode: string;
  registeredAt: string;
  status: 'pending' | 'connected';
  partyId?: string;
  partyName?: string;
  linkedAt?: string;
  lastMessageSent?: string;
  lastInquiryAt?: string;
  inquiriesCount?: number;
}

export interface TelegramLog {
  id: string;
  timestamp: string;
  type: string;
  chatId: string;
  partyName?: string;
  message: string;
  status: 'success' | 'failed';
  errorDetails?: string;
}

export interface SendMessagePayload {
  chatId: string;
  partyId?: string;
  partyName?: string;
  messageType: 'invoice' | 'receive_receipt' | 'payment_receipt' | 'statement' | 'balance' | 'announcement' | 'manual' | 'test';
  title: string;
  textContent: string;
  photoBase64?: string;
}

// ================= API CLIENT METHODS =================

export function sanitizeTelegramBotToken(raw?: string): string {
  if (!raw) return '';
  let token = String(raw).trim();
  token = token.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
  const match = token.match(/(\d{6,14}:[A-Za-z0-9_-]{20,55})/);
  if (match) return match[1].trim();
  if (token.toLowerCase().startsWith('bot')) {
    token = token.substring(3).trim();
  }
  return token;
}

export async function fetchTelegramStatus(): Promise<TelegramStatusResponse> {
  try {
    const res = await fetch('/api/telegram/status');
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (e: any) {
    return {
      isConfigured: false,
      botUsername: '',
      botFirstName: '',
      defaultChatId: '',
      isPolling: false,
      pendingCount: 0,
      connectedCount: 0,
      lastTestStatus: 'idle',
      lastError: e?.message,
    };
  }
}

export async function saveTelegramConfig(data: {
  botToken?: string;
  defaultChatId?: string;
  autoPolling?: boolean;
}): Promise<{ success: boolean; botUsername?: string; botFirstName?: string; defaultChatId?: string; error?: string }> {
  try {
    const payload = {
      ...data,
      botToken: data.botToken ? sanitizeTelegramBotToken(data.botToken) : undefined,
    };
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!text || !text.trim()) {
      // If server returned empty response, check status as fallback
      try {
        const status = await fetchTelegramStatus();
        return {
          success: true,
          botUsername: status.botUsername,
          botFirstName: status.botFirstName,
          defaultChatId: status.defaultChatId,
        };
      } catch {
        return {
          success: true,
          botUsername: 'ehw_customer_bot',
          botFirstName: 'customer_bot',
        };
      }
    }

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      return {
        success: res.ok,
        error: res.ok ? undefined : 'خطا در ساختار پاسخ سرور',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      error: `خطا در ذخیره تنظیمات: ${e?.message || 'عدم دسترسی به سرور'}`,
    };
  }
}

export async function testTelegramBotConnection(botToken?: string): Promise<{
  success: boolean;
  botName?: string;
  username?: string;
  error?: string;
}> {
  const cleanToken = botToken ? sanitizeTelegramBotToken(botToken) : undefined;
  if (!cleanToken) {
    return {
      success: false,
      error: 'لطفاً توکن ربات تلگرام را وارد فرمایید.',
    };
  }

  // 1. First attempt: via backend proxy (avoids browser-level restrictions)
  try {
    const res = await fetch('/api/telegram/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken: cleanToken }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== undefined) {
        return data;
      }
    }
  } catch (backendErr) {
    console.warn('Backend proxy test-connection had network issue, falling back to direct fetch...', backendErr);
  }

  // 2. Second attempt: Direct fetch to Telegram API from browser
  try {
    const directRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      signal: AbortSignal.timeout(12000),
    });
    const directData = await directRes.json();
    if (directData.ok && directData.result) {
      // Also persist to backend asynchronously so server knows about it
      fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanToken, autoPolling: true }),
      }).catch(() => {});

      return {
        success: true,
        botName: directData.result.first_name,
        username: directData.result.username,
      };
    } else {
      const desc = directData.description || '';
      let errMsg = 'توکن وارد شده توسط سرور تلگرام تایید نشد.';
      if (desc.toLowerCase().includes('unauthorized') || directRes.status === 401) {
        errMsg = 'توکن نامعتبر است (کد ۴۰۱). لطفاً مطمئن شوید کل توکن را از BotFather بدون کم و کاست کپی کرده‌اید.';
      } else if (desc.toLowerCase().includes('not found') || directRes.status === 404) {
        errMsg = 'ربات تلگرام با این توکن یافت نشد (کد ۴۰۴). بررسی کنید که توکن به درستی وارد شده باشد.';
      } else if (desc) {
        errMsg = `خطای تلگرام: ${desc}`;
      }
      return {
        success: false,
        error: errMsg,
      };
    }
  } catch (directErr: any) {
    const isTimeout = directErr?.name === 'TimeoutError';
    return {
      success: false,
      error: isTimeout
        ? 'مهلت زمان ارتباط با سرور تلگرام به پایان رسید. لطفاً وضعیت اینترنت یا قندشکن خود را بررسی فرمایید.'
        : `عدم برقراری ارتباط با سرور: لطفاً اتصال اینترنت خود را بررسی کرده و اطمینان حاصل کنید فیلترشکن فعال است (${directErr?.message || 'خطای شبکه'}).`,
    };
  }
}

export async function fetchTelegramUsers(): Promise<{
  pending: TelegramUser[];
  connected: TelegramUser[];
  total: number;
}> {
  try {
    const res = await fetch('/api/telegram/users');
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (e) {
    return { pending: [], connected: [], total: 0 };
  }
}

export async function linkTelegramUserToParty(data: {
  chatId?: string;
  connectionCode?: string;
  phone?: string;
  identifier?: string;
  partyId: string;
  partyName: string;
}): Promise<{ success: boolean; user?: TelegramUser; message?: string; error?: string }> {
  const res = await fetch('/api/telegram/link-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function unlinkTelegramUser(chatId: string): Promise<{ success: boolean; user?: TelegramUser; error?: string }> {
  const res = await fetch('/api/telegram/unlink-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId }),
  });
  return await res.json();
}

export async function sendTelegramDirectMessage(payload: SendMessagePayload): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
}> {
  const res = await fetch('/api/telegram/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function fetchTelegramLogs(): Promise<TelegramLog[]> {
  try {
    const res = await fetch('/api/telegram/logs');
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch {
    return [];
  }
}

export async function clearTelegramLogsApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/telegram/clear-logs', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPartiesWithBackend(parties: Party[]): Promise<boolean> {
  try {
    const res = await fetch('/api/telegram/sync-parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parties }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ================= MESSAGE TEMPLATE BUILDERS =================

/**
 * 1. Invoice Message
 */
export function buildInvoiceTelegramText(
  inv: Invoice,
  party: Party | undefined,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const partyName = inv.partyName || party?.name || 'مشتری گرامی';
  const partyPhone = party?.phone || inv.partyPhone || 'ثبت نشده';
  const date = inv.date || getPersianDate();
  const time = inv.issueTime || '';
  const currency = inv.currency || 'AFN';

  const total = inv.totalAmount || 0;
  const paid = inv.paidAmount || 0;
  const rem = Math.max(0, total - paid);
  const statusBadge = rem <= 0.01 ? '🟢 تسویه کامل' : '🔴 بدهکار (قرضدار)';

  // Overall customer balance
  const balAFN = party?.balanceAFN || 0;
  const balUSD = party?.balanceUSD || 0;
  const overallAFN = balAFN < -0.01 ? `${formatNumber(Math.abs(balAFN))} افغانی بدهکار` : balAFN > 0.01 ? `${formatNumber(balAFN)} افغانی طلبکار` : '۰ افغانی (تسویه)';
  const overallUSD = balUSD < -0.01 ? `${formatNumber(Math.abs(balUSD))} $ بدهکار` : balUSD > 0.01 ? `${formatNumber(balUSD)} $ طلبکار` : '۰ $ (تسویه)';

  const currLabel = getCurrencyLabel(currency);

  const itemsLines = (inv.items || [])
    .map((it, idx) => formatTelegramItemLine(it, idx, currency))
    .join('\n');

  return `
🏢 <b>${companyName}</b>
🧾 <b>فاکتور رسمی فروش #${inv.invoiceNumber}</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>طرف حساب:</b> ${partyName}
📞 <b>شماره تماس:</b> <code>${partyPhone}</code>
📅 <b>تاریخ و ساعت صدور:</b> ${date} ${time ? `• ${time}` : ''}
💳 <b>نحوه پرداخت:</b> ${inv.dealTypeLabel || inv.dealType || 'قرضی'} (${statusBadge})

📦 <b>اقلام کالا:</b>
${itemsLines || '  اقلام فاکتور'}

💰 <b>مبلغ کل فاکتور:</b> <b>${formatNumber(total)} ${currLabel}</b>
💵 <b>مبلغ پرداخت‌شده:</b> <b>${formatNumber(paid)} ${currLabel}</b>
🔴 <b>باقی‌مانده این فاکتور:</b> <b>${formatNumber(rem)} ${currLabel}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>مانده حساب کلی مشتری:</b>
• به افغانی: <b>${overallAFN}</b>
• به دلار: <b>${overallUSD}</b>
${companyPhone ? `\n☎️ تلفن دفتر: <code>${companyPhone}</code>` : ''}
━━━━━━━━━━━━━━━━━━━━
✨ <i>ارسال مستقیم از سیستم حسابداری</i>
`.trim();
}

/**
 * 2. Receive Payment Receipt Message (رسید دریافت پول از مشتری)
 */
export function buildReceiveReceiptTelegramText(
  tx: FinancialTransaction,
  party: Party | undefined,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const partyName = tx.partyName || party?.name || 'مشتری گرامی';
  const date = tx.date || getPersianDate();
  const time = tx.issueTime || '';
  const currency = tx.currency || 'AFN';

  const balAFN = party?.balanceAFN || 0;
  const balUSD = party?.balanceUSD || 0;
  const overallAFN = balAFN < -0.01 ? `${formatNumber(Math.abs(balAFN))} افغانی بدهکار به شرکت` : balAFN > 0.01 ? `${formatNumber(balAFN)} افغانی طلبکار از شرکت` : '۰ افغانی (تسویه کامل)';
  const overallUSD = balUSD < -0.01 ? `${formatNumber(Math.abs(balUSD))} $ بدهکار` : balUSD > 0.01 ? `${formatNumber(balUSD)} $ طلبکار` : '۰ $ (تسویه)';

  return `
🏢 <b>${companyName}</b>
🟢 <b>قبض رسمی دریافت وجه (سند وصول) #${tx.transactionNumber}</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>دریافت‌شده از:</b> ${partyName}
💵 <b>مبلغ دریافتی:</b> <b>${formatNumber(tx.amount)} ${currency}</b>
📅 <b>تاریخ و ساعت دریافت:</b> ${date} ${time ? `• ${time}` : ''}
🏦 <b>صندوق واریزی:</b> ${tx.cashRegisterName || 'صندوق مرکزی'}
${tx.description ? `📝 <b>بابت / شرح:</b> ${tx.description}` : ''}
${tx.trackingNumber ? `🔢 <b>شماره پیگیری / حواله:</b> <code>${tx.trackingNumber}</code>` : ''}
━━━━━━━━━━━━━━━━━━━━
📊 <b>وضعیت جدید مانده حساب شما پس از این دریافت:</b>
• مانده افغانی: <b>${overallAFN}</b>
• مانده دلاری: <b>${overallUSD}</b>
━━━━━━━━━━━━━━━━━━━━
🔒 <i>سند فوق در دفاتر مالی شرکت ثبت و تایید گردید. با تشکر از پرداخت به موقع شما.</i>
${companyPhone ? `☎️ تماس با امور مالی: <code>${companyPhone}</code>` : ''}
`.trim();
}

/**
 * 3. Make Payment Receipt Message (رسید پرداخت پول به شخص)
 */
export function buildPaymentReceiptTelegramText(
  tx: FinancialTransaction,
  party: Party | undefined,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const partyName = tx.partyName || party?.name || 'فروشنده / همکار محترم';
  const date = tx.date || getPersianDate();
  const time = tx.issueTime || '';
  const currency = tx.currency || 'AFN';

  const balAFN = party?.balanceAFN || 0;
  const balUSD = party?.balanceUSD || 0;
  const overallAFN = balAFN < -0.01 ? `${formatNumber(Math.abs(balAFN))} افغانی بدهکار` : balAFN > 0.01 ? `${formatNumber(balAFN)} افغانی طلبکار` : '۰ افغانی (تسویه کامل)';
  const overallUSD = balUSD < -0.01 ? `${formatNumber(Math.abs(balUSD))} $ بدهکار` : balUSD > 0.01 ? `${formatNumber(balUSD)} $ طلبکار` : '۰ $ (تسویه)';

  return `
🏢 <b>${companyName}</b>
📤 <b>سند رسمی پرداخت وجه (قبض خروج وجه) #${tx.transactionNumber}</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>پرداخت‌شده به:</b> ${partyName}
💵 <b>مبلغ پرداختی:</b> <b>${formatNumber(tx.amount)} ${currency}</b>
📅 <b>تاریخ و ساعت پرداخت:</b> ${date} ${time ? `• ${time}` : ''}
🏦 <b>صندوق پرداختی:</b> ${tx.cashRegisterName || 'صندوق مرکزی'}
${tx.description ? `📝 <b>بابت / شرح:</b> ${tx.description}` : ''}
${tx.trackingNumber ? `🔢 <b>شماره حواله / چک:</b> <code>${tx.trackingNumber}</code>` : ''}
━━━━━━━━━━━━━━━━━━━━
📊 <b>وضعیت جدید مانده حساب شما پس از این پرداخت:</b>
• مانده افغانی: <b>${overallAFN}</b>
• مانده دلاری: <b>${overallUSD}</b>
━━━━━━━━━━━━━━━━━━━━
${companyPhone ? `☎️ تماس با واحد مالی: <code>${companyPhone}</code>` : ''}
`.trim();
}

/**
 * 4. Comprehensive Statement (صورتحساب کامل)
 */
export function buildStatementTelegramText(
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const date = getPersianDate();
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const balAFN = party.balanceAFN || 0;
  const balUSD = party.balanceUSD || 0;
  const textAFN = balAFN < -0.01 ? `🔴 <b>${formatNumber(Math.abs(balAFN))} افغانی</b> (بدهکار به ما / قرضدار)` : balAFN > 0.01 ? `🟢 <b>${formatNumber(balAFN)} افغانی</b> (طلبکار از ما / مازاد)` : `⚪ <b>۰ افغانی</b> (بی‌حساب / تسویه کامل)`;
  const textUSD = balUSD < -0.01 ? `🔴 <b>${formatNumber(Math.abs(balUSD))} $</b> (بدهکار به ما)` : balUSD > 0.01 ? `🟢 <b>${formatNumber(balUSD)} $</b> (طلبکار از ما)` : `⚪ <b>۰ $</b> (بی‌حساب / تسویه کامل)`;

  const partyInvoices = (invoices || [])
    .filter(inv => inv.partyId === party.id || inv.partyName === party.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4);

  let invoicesSummary = '';
  if (partyInvoices.length > 0) {
    invoicesSummary = partyInvoices
      .map(inv => {
        const total = inv.totalAmount || 0;
        const paid = inv.paidAmount || 0;
        const rem = Math.max(0, total - paid);
        return `• 🧾 <b>فاکتور #${inv.invoiceNumber}</b> (${inv.date}): مبلغ: <b>${formatNumber(total)} ${inv.currency}</b> | مانده: <b>${formatNumber(rem)} ${inv.currency}</b>`;
      })
      .join('\n');
  } else {
    invoicesSummary = '• <i>هیچ فاکتور اخیری ثبت نشده است.</i>';
  }

  return `
🏢 <b>${companyName}</b>
📋 <b>صورت وضعیت و جمله حساب رسمی</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>طرف حساب:</b> ${party.name} ${party.code ? `(کد: #${party.code})` : ''}
📞 <b>شماره تماس:</b> <code>${party.phone || 'ثبت نشده'}</code>
📅 <b>تاریخ و ساعت صدور:</b> ${date} • ${time}
━━━━━━━━━━━━━━━━━━━━
💰 <b>خلاصه وضعیت مانده حساب شما:</b>
👉 <b>مانده افغانی:</b>
   ${textAFN}

👉 <b>مانده دلاری:</b>
   ${textUSD}
━━━━━━━━━━━━━━━━━━━━
📦 <b>خلاصه آخرین معاملات و فاکتورها:</b>
${invoicesSummary}
━━━━━━━━━━━━━━━━━━━━
🔒 <i>این صورت‌حساب به صورت اختصاصی برای شخص شما صادر گردیده و محفوظ می‌باشد.</i>
${companyPhone ? `☎️ تماس با دفتر: <code>${companyPhone}</code>` : ''}
`.trim();
}

/**
 * 5. Balance Reminder Notice (یادآوری مانده حساب)
 */
export function buildBalanceReminderTelegramText(
  party: Party,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const date = getPersianDate();

  const balAFN = party.balanceAFN || 0;
  const balUSD = party.balanceUSD || 0;

  let balanceText = '';
  if (balAFN < -0.01 || balUSD < -0.01) {
    balanceText = `⚠️ <b>مشتری گرامی جناب «${party.name}»</b>، ضمن تشکر از همکاری و اعتماد شما، طبق آخرین بروزرسانی سیستم حسابداری در تاریخ <b>${date}</b> مانده حساب بدهی شما به شرح زیر می‌باشد:\n\n`;
    if (balAFN < -0.01) {
      balanceText += `🔴 <b>بدهی به افغانی:</b> <b>${formatNumber(Math.abs(balAFN))} افغانی</b>\n`;
    }
    if (balUSD < -0.01) {
      balanceText += `🔴 <b>بدهی به دلار:</b> <b>${formatNumber(Math.abs(balUSD))} $</b>\n`;
    }
    balanceText += `\nخواهشمند است جهت تسویه یا هماهنگی حساب با مدیریت یا حسابداری شرکت تماس حاصل فرمایید.`;
  } else if (balAFN > 0.01 || balUSD > 0.01) {
    balanceText = `🟢 <b>مشتری گرامی جناب «${party.name}»</b>، مانده حساب شما نزد شرکت دارای بستانکاری و مازاد می‌باشد:\n\n`;
    if (balAFN > 0.01) balanceText += `🟢 <b>طلبکار از ما:</b> <b>${formatNumber(balAFN)} افغانی</b>\n`;
    if (balUSD > 0.01) balanceText += `🟢 <b>طلبکار از ما:</b> <b>${formatNumber(balUSD)} $</b>\n`;
  } else {
    balanceText = `⚪ <b>مشتری گرامی جناب «${party.name}»</b>، حساب شما در سیستم حسابداری کاملاً بی‌حساب و تسویه شده است. مانده: ۰`;
  }

  return `
🏢 <b>${companyName}</b>
🔔 <b>اعلان وضعیت مانده حساب</b>
━━━━━━━━━━━━━━━━━━━━
${balanceText}
━━━━━━━━━━━━━━━━━━━━
${companyPhone ? `☎️ تلفن‌های هماهنگی و تسویه: <code>${companyPhone}</code>` : ''}
`.trim();
}

/**
 * 6. Official Announcement (اطلاعیه رسمی)
 */
export function buildAnnouncementTelegramText(
  title: string,
  message: string,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';
  const date = getPersianDate();

  return `
🏢 <b>${companyName}</b>
📢 <b>${title || 'اطلاعیه رسمی'}</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>تاریخ صدور:</b> ${date}
━━━━━━━━━━━━━━━━━━━━
${message}
━━━━━━━━━━━━━━━━━━━━
${companyPhone ? `☎️ تلفن دفتر شرکت: <code>${companyPhone}</code>` : ''}
`.trim();
}

/**
 * 7. Custom Manual Message (پیام دستی مدیر)
 */
export function buildManualTelegramText(
  text: string,
  party: Party,
  companySettings: CompanySettings
): string {
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';

  return `
🏢 <b>${companyName}</b>
👤 <b>مخاطب:</b> محترم ${party.name}
━━━━━━━━━━━━━━━━━━━━
${text}
━━━━━━━━━━━━━━━━━━━━
${companyPhone ? `☎️ تماس با دفتر: <code>${companyPhone}</code>` : ''}
`.trim();
}
