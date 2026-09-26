import { Invoice, Party, Currency, CompanySettings } from '../types';
import {
  formatNumber,
  getPersianDate,
  getCurrencyLabel,
  formatTelegramItemLine,
  formatPlainTextItemLine,
} from '../utils/formatters';

export interface TelegramSettings {
  botToken: string;
  defaultChatId: string;
  autoSendOnSave: boolean;
  autoListenerEnabled: boolean; // شنود خودکار و پاسخگویی به مشتریان در پس‌زمینه
  sendPhoto: boolean;
  sendText: boolean;
  sendDocument: boolean;
  botUsername?: string;
  botFirstName?: string;
  lastTestStatus?: 'connected' | 'error' | 'idle';
  lastTestedAt?: string;
  lastError?: string;
}

export interface TelegramSubscriber {
  chatId: string;
  partyId: string;
  partyName: string;
  phone: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  linkedAt: string;
  lastInquiryAt?: string;
  inquiriesCount: number;
}

export interface TelegramLogEntry {
  id: string;
  timestamp: string;
  chatId: string;
  senderName: string;
  partyName?: string;
  type: 'start' | 'auth_success' | 'auth_failed' | 'inquiry' | 'manual_send' | 'error';
  message: string;
}

const SETTINGS_STORAGE_KEY = 'accounting_telegram_settings_v1';
const SUBSCRIBERS_STORAGE_KEY = 'accounting_telegram_subscribers_v1';
const LOGS_STORAGE_KEY = 'accounting_telegram_logs_v1';
const OFFSET_STORAGE_KEY = 'accounting_telegram_last_offset';

export const getTelegramSettings = (): TelegramSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        autoListenerEnabled: true,
        sendPhoto: true,
        sendText: true,
        sendDocument: true,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to parse telegram settings', e);
  }
  return {
    botToken: '8740100617:AAHDFzQ4DWVhbMk4UWIcQj11IuoaWGsz1-8',
    defaultChatId: '',
    autoSendOnSave: false,
    autoListenerEnabled: true,
    sendPhoto: true,
    sendText: true,
    sendDocument: true,
    botUsername: 'ehw_customer_bot',
    botFirstName: 'customer_bot',
    lastTestStatus: 'connected',
  };
};

export const saveTelegramSettings = (settings: TelegramSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save telegram settings', e);
  }
};

// ================= SUBSCRIBERS STORAGE =================
export const getTelegramSubscribers = (): Record<string, TelegramSubscriber> => {
  try {
    const raw = localStorage.getItem(SUBSCRIBERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveTelegramSubscriber = (sub: TelegramSubscriber): void => {
  try {
    const subs = getTelegramSubscribers();
    subs[sub.chatId] = sub;
    localStorage.setItem(SUBSCRIBERS_STORAGE_KEY, JSON.stringify(subs));
  } catch (e) {
    console.error('Failed to save subscriber', e);
  }
};

export const removeTelegramSubscriber = (chatId: string): void => {
  try {
    const subs = getTelegramSubscribers();
    delete subs[chatId];
    localStorage.setItem(SUBSCRIBERS_STORAGE_KEY, JSON.stringify(subs));
  } catch (e) {
    console.error('Failed to remove subscriber', e);
  }
};

export const getSubscribersList = (): TelegramSubscriber[] => {
  const subs = getTelegramSubscribers();
  return Object.values(subs).sort(
    (a, b) => new Date(b.lastInquiryAt || b.linkedAt).getTime() - new Date(a.lastInquiryAt || a.linkedAt).getTime()
  );
};

// ================= LOGS STORAGE =================
export const getTelegramLogs = (): TelegramLogEntry[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addTelegramLog = (entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>): TelegramLogEntry => {
  try {
    const logs = getTelegramLogs();
    const newEntry: TelegramLogEntry = {
      ...entry,
      id: 'tg-log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    logs.unshift(newEntry);
    if (logs.length > 80) logs.pop();
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    return newEntry;
  } catch {
    return {
      ...entry,
      id: 'tg-log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('fa-IR'),
    };
  }
};

export const clearTelegramLogs = (): void => {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch {}
};

// ================= PHONE NORMALIZATION & STRICT MATCHING =================
/**
 * Normalizes phone numbers:
 * - Converts Persian & Arabic numerals to Latin digits
 * - Strips spaces, dashes, symbols, international code (+93, 0093, 0)
 * - Returns core digits
 */
export const normalizePhoneNumber = (raw: string): string => {
  if (!raw) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let s = String(raw).trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  s = s.replace(/\D/g, ''); // keep only numbers

  // Strip international prefixes for Afghanistan
  if (s.startsWith('0093')) s = s.substring(4);
  else if (s.startsWith('93') && s.length >= 11) s = s.substring(2);

  // If starts with 0 (e.g. 0799...) and length is 10, strip leading 0 -> 799...
  if (s.startsWith('0') && s.length >= 10) s = s.substring(1);

  return s;
};

/**
 * Checks whether two phone numbers belong to the same customer.
 * Uses suffix-9 matching to handle variations like 0799..., +93799..., 799...
 */
export const phoneNumbersMatch = (phone1: string, phone2: string): boolean => {
  const n1 = normalizePhoneNumber(phone1);
  const n2 = normalizePhoneNumber(phone2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Last 9 digits comparison (Afghan mobile subscriber number is 9 digits)
  if (n1.length >= 9 && n2.length >= 9) {
    return n1.slice(-9) === n2.slice(-9);
  }
  return false;
};

/**
 * Finds a customer in parties list by matching phone number.
 */
export const findPartyByPhone = (phoneInput: string, parties: Party[]): Party | undefined => {
  if (!phoneInput || !parties || parties.length === 0) return undefined;
  return parties.find(p => {
    if (!p.phone) return false;
    return phoneNumbersMatch(p.phone, phoneInput);
  });
};

export const sanitizeTelegramBotToken = (raw: string): string => {
  if (!raw) return '';
  let token = String(raw).trim();
  token = token.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
  const match = token.match(/(\d{6,14}:[A-Za-z0-9_-]{20,55})/);
  if (match) return match[1].trim();
  if (token.toLowerCase().startsWith('bot')) {
    token = token.substring(3).trim();
  }
  return token;
};

// ================= TEST CONNECTION =================
export const testTelegramBotConnection = async (
  botToken: string
): Promise<{ success: boolean; botName?: string; username?: string; error?: string }> => {
  const token = sanitizeTelegramBotToken(botToken);
  if (!token) {
    return { success: false, error: 'لطفاً توکن ربات تلگرام را وارد کنید.' };
  }

  // 1. Prefer backend proxy to bypass browser CORS and ISP firewall blocks
  try {
    const serverRes = await fetch('/api/telegram/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken: token }),
    });
    const data = await serverRes.json();
    return data;
  } catch (backendErr) {
    console.warn('Backend proxy test connection failed, attempting direct fetch...', backendErr);
  }

  // 2. Direct fetch fallback
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    if (data.ok && data.result) {
      return {
        success: true,
        botName: data.result.first_name,
        username: data.result.username,
      };
    } else {
      return {
        success: false,
        error: data.description || 'توکن نامعتبر است یا ربات یافت نشد.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `خطا در برقراری ارتباط با تلگرام: ${err?.message || 'عدم دسترسی به اینترنت'}`,
    };
  }
};

// ================= BUILD CUSTOMER STATEMENT (جمله حساب اختصاصی مشتری) =================
export const buildCustomerAccountStatement = (
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings
): string => {
  const partyName = party.name || 'مشتری محترم';
  const partyPhone = party.phone || 'ثبت نشده';
  const partyCode = party.code ? `#${party.code}` : '';
  const date = getPersianDate();
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';

  // Calculate Balances
  const balAFN = party.balanceAFN || 0;
  const balUSD = party.balanceUSD || 0;

  let textAFN = '';
  if (balAFN < -0.01) {
    textAFN = `🔴 <b>${formatNumber(Math.abs(balAFN))} افغانی</b> (بدهکار به شرکت / قرضدار)`;
  } else if (balAFN > 0.01) {
    textAFN = `🟢 <b>${formatNumber(balAFN)} افغانی</b> (طلبکار از شرکت / مازاد)`;
  } else {
    textAFN = `⚪ <b>۰ افغانی</b> (بی‌حساب / تسویه کامل)`;
  }

  let textUSD = '';
  if (balUSD < -0.01) {
    textUSD = `🔴 <b>${formatNumber(Math.abs(balUSD))} دلار ($)</b> (بدهکار به شرکت)`;
  } else if (balUSD > 0.01) {
    textUSD = `🟢 <b>${formatNumber(balUSD)} دلار ($)</b> (طلبکار از شرکت)`;
  } else {
    textUSD = `⚪ <b>۰ دلار ($)</b> (بی‌حساب / تسویه کامل)`;
  }

  // Get recent 3 invoices for this customer
  const partyInvoices = (invoices || [])
    .filter(inv => inv.partyId === party.id || inv.partyName === party.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3);

  let recentInvoicesText = '';
  if (partyInvoices.length > 0) {
    recentInvoicesText = partyInvoices
      .map(inv => {
        const total = inv.totalAmount || 0;
        const paid = inv.paidAmount || 0;
        const rem = Math.max(0, total - paid);
        const curr = inv.currency || 'AFN';
        const typeLabel = inv.type === 'sell' ? 'فروش' : inv.type === 'return_sell' ? 'برگشت فروش' : 'فاکتور';
        return `• 🧾 <b>${typeLabel} #${inv.invoiceNumber}</b> (${inv.date}):
   مبلغ: <b>${formatNumber(total)} ${curr}</b> | پرداخت: ${formatNumber(paid)} | مانده: <b>${formatNumber(rem)} ${curr}</b>`;
      })
      .join('\n');
  } else {
    recentInvoicesText = '• <i>هیچ فاکتور اخیری ثبت نشده است.</i>';
  }

  return `
🏢 <b>${companyName}</b>
📋 <b>صورت وضعیت و جمله حساب اختصاصی</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>نام مشتری:</b> ${partyName} ${partyCode}
📞 <b>شماره تماس ثبت‌شده:</b> <code>${partyPhone}</code>
📅 <b>تاریخ و ساعت استعلام:</b> ${date} • ${time}
━━━━━━━━━━━━━━━━━━━━
💰 <b>وضعیت کلی مانده حساب شما:</b>

👉 <b>مانده حساب افغانی:</b>
   ${textAFN}

👉 <b>مانده حساب دلاری:</b>
   ${textUSD}
━━━━━━━━━━━━━━━━━━━━
📦 <b>خلاصه آخرین معاملات و فاکتورها:</b>
${recentInvoicesText}
━━━━━━━━━━━━━━━━━━━━
🔒 <i>این صورت‌حساب اختصاصاً به شماره شما متصل است و هیچ مشتری دیگری به حساب شما دسترسی ندارد.</i>
${companyPhone ? `☎️ تماس با واحد مالی: <code>${companyPhone}</code>` : ''}
`.trim();
};

/**
 * Builds downloadable text file (.txt) for the customer's account statement
 */
export const buildCustomerTextFileStatement = (
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings
): string => {
  const separator = '='.repeat(54);
  const subSeparator = '-'.repeat(54);
  const companyName = companySettings.name || 'شرکت تجارتی برادران نبوی';
  const companyPhone = companySettings.phone || '';

  const balAFN = party.balanceAFN || 0;
  const balUSD = party.balanceUSD || 0;

  const partyInvoices = (invoices || [])
    .filter(inv => inv.partyId === party.id || inv.partyName === party.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const invoiceLines = partyInvoices
    .map((inv, idx) => {
      const total = inv.totalAmount || 0;
      const paid = inv.paidAmount || 0;
      const rem = Math.max(0, total - paid);
      return `${idx + 1}. فاکتور #${inv.invoiceNumber} | تاریخ: ${inv.date} | مبلغ کل: ${formatNumber(total)} ${inv.currency} | پرداختی: ${formatNumber(paid)} | مانده: ${formatNumber(rem)}`;
    })
    .join('\n');

  return `
${separator}
               ${companyName}
          صورت وضعیت رسمی حساب اختصاصی مشتری
${separator}
نام طرف حساب: ${party.name} ${party.code ? `(کد: ${party.code})` : ''}
شماره تلفن معتبر: ${party.phone}
تاریخ گزارش: ${getPersianDate()}
ساعت صدور: ${new Date().toLocaleTimeString('fa-IR')}
${subSeparator}
خلاصه وضعیت مانده حساب:
مانده حساب به افغانی:  ${formatNumber(balAFN)} AFN (${balAFN < 0 ? 'بدهکار به ما' : balAFN > 0 ? 'طلبکار از ما' : 'تسویه کامل'})
مانده حساب به دلار:    ${formatNumber(balUSD)} USD (${balUSD < 0 ? 'بدهکار به ما' : balUSD > 0 ? 'طلبکار از ما' : 'تسویه کامل'})
${subSeparator}
فهرست فاکتورهای ثبت شده:
${invoiceLines || 'هیچ فاکتوری در این سیستم ثبت نشده است.'}
${subSeparator}
${companyPhone ? `شماره‌های تماس دفتر شرکت: ${companyPhone}\n` : ''}
امنیت: این فایل مستقیماً از سیستم حسابداری برای شخص شما ارسال گردیده است.
${separator}
`.trim();
};

// ================= TELEGRAM SENDING ACTIONS =================

/**
 * Standard Customer Reply Keyboard (One-tap actions)
 */
export const getCustomerReplyKeyboard = () => {
  return {
    keyboard: [
      [{ text: '🔄 بروزرسانی و دریافت مجدد حساب' }, { text: '🧾 جزئیات آخرین فاکتور' }],
      [{ text: '📄 دانلود فایل متنی صورتحساب (.txt)' }, { text: '☎️ تماس با شرکت' }],
    ],
    resize_keyboard: true,
  };
};

/**
 * Sends Customer Statement to their specific Chat ID
 */
export const sendCustomerAccountStatement = async (
  chatId: string,
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings,
  settings: TelegramSettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const text = buildCustomerAccountStatement(party, invoices, companySettings);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: getCustomerReplyKeyboard(),
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.error('Failed to send statement to customer', e);
    return false;
  }
};

/**
 * Sends Details of the Most Recent Invoice for THIS customer
 */
export const sendCustomerLastInvoice = async (
  chatId: string,
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings,
  settings: TelegramSettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const partyInvoices = (invoices || [])
    .filter(inv => inv.partyId === party.id || inv.partyName === party.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (partyInvoices.length === 0) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `مشتری گرامی جناب <b>${party.name}</b>، در حال حاضر هیچ فاکتوری به نام شما در سیستم ثبت نشده است.`,
        parse_mode: 'HTML',
        reply_markup: getCustomerReplyKeyboard(),
      }),
    });
    return true;
  }

  const lastInv = partyInvoices[0];
  const itemsText = (lastInv.items || [])
    .map((it, i) => formatTelegramItemLine(it, i, lastInv.currency))
    .join('\n');

  const lastInvCurrency = getCurrencyLabel(lastInv.currency);
  const text = `
🧾 <b>جزئیات آخرین فاکتور شما (#${lastInv.invoiceNumber})</b>
━━━━━━━━━━━━━━━━━━━━
👤 مشتری: ${party.name}
📅 تاریخ: ${lastInv.date} ${lastInv.issueTime ? `• ساعت: ${lastInv.issueTime}` : ''}
💳 نوع: ${lastInv.dealTypeLabel || lastInv.dealType || 'فروش'}

📦 <b>اقلام کالا:</b>
${itemsText || '  اقلام استاندارد'}

💰 مبلغ کل: <b>${formatNumber(lastInv.totalAmount)} ${lastInvCurrency}</b>
💵 پرداختی نقدی: <b>${formatNumber(lastInv.paidAmount || 0)} ${lastInvCurrency}</b>
🔴 الباقی این فاکتور: <b>${formatNumber(Math.max(0, (lastInv.totalAmount || 0) - (lastInv.paidAmount || 0)))} ${lastInvCurrency}</b>
━━━━━━━━━━━━━━━━━━━━
✨ <i>جهت دریافت مانده کل حساب، دکمه «🔄 بروزرسانی و دریافت مجدد حساب» را لمس کنید.</i>
`.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: getCustomerReplyKeyboard(),
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

/**
 * Sends statement as a .txt Document
 */
export const sendCustomerTextFile = async (
  chatId: string,
  party: Party,
  invoices: Invoice[],
  companySettings: CompanySettings,
  settings: TelegramSettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const content = buildCustomerTextFileStatement(party, invoices, companySettings);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', blob, `صورتحساب_${party.name.replace(/\s+/g, '_')}_${getPersianDate().replace(/\//g, '-')}.txt`);
  formData.append('caption', `📄 صورتحساب متنی اختصاصی برای ${party.name}`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

/**
 * Sends Authentication Request with Telegram's Native Contact Button
 * Asks the customer for the verified phone number of THIS Telegram account.
 */
export const sendAuthenticationRequest = async (
  chatId: string,
  settings: TelegramSettings,
  companySettings: CompanySettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const companyName = companySettings.name || 'شرکت بازرگانی';

  const text = `
🌸 <b>سلام و عرض احترام، به ربات هوشمند استعلام حساب «${companyName}» خوش آمدید!</b>
━━━━━━━━━━━━━━━━━━━━
🔒 <b>احراز هویت امن و دریافت صورت‌حساب اختصاصی:</b>
این سامانه مستقیماً به سیستم حسابداری شرکت متصل است. جهت صیانت کامل از حریم خصوصی و امنیت اطلاعات مالی، این ربات طوری برنامه‌ریزی شده است که <b>فقط و فقط شماره حساب و صورت‌حساب شخص خودتان</b> را نمایش می‌دهد.

👇 <b>مرحله اول: لطفاً شماره تلفن همین اکانت تلگرام را با لمس دکمه زیر ارسال فرمایید:</b>
<i>(جهت تایید، دکمه بزرگ زیر را لمس نموده و اشتراک‌گذاری شماره تلفن خود را تایید کنید)</i>
`.trim();

  const keyboard = {
    keyboard: [
      [
        {
          text: '📱 اشتراک‌گذاری شماره تلفن همین اکانت تلگرام (تایید هویت)',
          request_contact: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

/**
 * Sends warning when the shared contact card does NOT belong to the sender's Telegram account
 * (i.e. user forwarded someone else's contact instead of sharing their own Telegram phone)
 */
export const sendContactNotOwnAccount = async (
  chatId: string,
  settings: TelegramSettings,
  companySettings: CompanySettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const text = `
⚠️ <b>خطای امنیتی: شماره ارسال‌شده متعلق به این اکانت تلگرام نیست!</b>
━━━━━━━━━━━━━━━━━━━━
🔒 طبق استانداردهای امنیتی سیستم حسابداری، جهت احراز هویت الزامی است که <b>دقیقاً شماره تلفن همین اکانت تلگرام</b> به اشتراک گذاشته شود و ارسال کارت تماس اشخاص دیگر مجاز نمی‌باشد.

👇 لطفاً مجدداً دکمه زیر را لمس نموده و اشتراک‌گذاری شماره همین تلگرام خود را تایید نمایید:
`.trim();

  const keyboard = {
    keyboard: [
      [
        {
          text: '📱 اشتراک‌گذاری شماره تلفن همین اکانت تلگرام (تایید هویت)',
          request_contact: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

/**
 * Sends Rejection Message if Phone Number is not found in company records
 */
export const sendAuthenticationRejected = async (
  chatId: string,
  phoneInput: string,
  settings: TelegramSettings,
  companySettings: CompanySettings
): Promise<boolean> => {
  const token = settings.botToken?.trim();
  if (!token || !chatId) return false;

  const companyPhone = companySettings.phone || '';
  const companyAddress = companySettings.address || '';
  const text = `
⛔ <b>عدم تأیید: شماره حساب یا مشتری در سیستم یافت نشد!</b>
━━━━━━━━━━━━━━━━━━━━
📞 شماره ارسال‌شده: <code>${phoneInput}</code>

🔒 <b>امنیت و محرمانگی حساب‌ها:</b>
این سامانه صرفاً صورت‌حساب اشخاصی را نمایش می‌دهد که شماره تماس‌شان از قبل در سیستم حسابداری شرکت ثبت و تعریف شده باشد. شماره این تلگرام در لیست مشتریان یافت نگردید.

📞 در صورتی که از مشتریان شرکت هستید، لطفاً با دفتر یا مدیریت شرکت تماس حاصل فرمایید تا شماره تماس شما در پرونده حساب‌تان ثبت شود:
${companyPhone ? `☎️ شماره دفتر: <code>${companyPhone}</code>` : ''}
${companyAddress ? `📍 آدرس دفتر: ${companyAddress}` : ''}
━━━━━━━━━━━━━━━━━━━━
پس از ثبت شماره توسط حسابدار شرکت، با ارسال مجدد شماره از طریق دکمه زیر، حساب از قبل تعریف‌شده خود را فوراً دریافت خواهید کرد:
`.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 ارسال شماره تلفن همین اکانت تلگرام (تلاش مجدد)',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
        },
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
};

// ================= BACKGROUND POLLING LISTENER ENGINE =================
// Singleton worker running in browser while user has application open

let listenerActive = false;
let pollingAbortController: AbortController | null = null;
let currentOffset = 0;

export interface ListenerDependencies {
  getParties: () => Party[];
  getInvoices: () => Invoice[];
  getCompanySettings: () => CompanySettings;
  onPartyLinked: (partyId: string, chatId: string, username?: string) => void;
  onNewLog?: (log: TelegramLogEntry) => void;
}

export const isTelegramListenerRunning = (): boolean => listenerActive;

export const startTelegramBotListener = (deps: ListenerDependencies): void => {
  const settings = getTelegramSettings();
  if (!settings.botToken || !settings.autoListenerEnabled) {
    return;
  }

  if (listenerActive) {
    return; // already running
  }

  listenerActive = true;
  pollingAbortController = new AbortController();

  // Restore last offset from localStorage to prevent duplicate replies
  try {
    const savedOffset = localStorage.getItem(OFFSET_STORAGE_KEY);
    if (savedOffset) {
      currentOffset = parseInt(savedOffset, 10) || 0;
    }
  } catch {}

  const runLoop = async () => {
    while (listenerActive) {
      const currentSettings = getTelegramSettings();
      if (!currentSettings.botToken || !currentSettings.autoListenerEnabled) {
        listenerActive = false;
        break;
      }

      try {
        const url = `https://api.telegram.org/bot${currentSettings.botToken.trim()}/getUpdates?offset=${currentOffset}&timeout=12`;
        const res = await fetch(url, {
          signal: pollingAbortController?.signal,
        });

        if (!res.ok) {
          // If 409 conflict or other, back off for 5 seconds
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            currentOffset = update.update_id + 1;
            try {
              localStorage.setItem(OFFSET_STORAGE_KEY, String(currentOffset));
            } catch {}

            await processSingleTelegramUpdate(update, deps, currentSettings);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          break;
        }
        // Network lag or brief offline, wait 3 seconds and retry
        await new Promise(r => setTimeout(r, 3500));
      }
    }
  };

  runLoop();
};

export const stopTelegramBotListener = (): void => {
  listenerActive = false;
  if (pollingAbortController) {
    try {
      pollingAbortController.abort();
    } catch {}
    pollingAbortController = null;
  }
};

/**
 * Process a single incoming Telegram update (Message, Contact, Command, Button)
 */
async function processSingleTelegramUpdate(
  update: any,
  deps: ListenerDependencies,
  settings: TelegramSettings
) {
  const msg = update.message;
  if (!msg) return;

  const chatId = String(msg.chat?.id || '');
  if (!chatId) return;

  const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'کاربر تلگرام';
  const username = msg.from?.username ? `@${msg.from.username}` : undefined;
  const parties = deps.getParties() || [];
  const invoices = deps.getInvoices() || [];
  const companySettings = deps.getCompanySettings();

  // Check if this chat_id is already bound to a party
  const subscribers = getTelegramSubscribers();
  let existingSub = subscribers[chatId];
  let matchedParty = existingSub
    ? parties.find(p => p.id === existingSub.partyId)
    : parties.find(p => p.telegramChatId === chatId);

  // If party had chatId recorded directly in party profile
  if (!existingSub && matchedParty) {
    existingSub = {
      chatId,
      partyId: matchedParty.id,
      partyName: matchedParty.name,
      phone: matchedParty.phone,
      telegramUsername: username,
      telegramFirstName: senderName,
      linkedAt: matchedParty.telegramLinkedAt || new Date().toISOString(),
      lastInquiryAt: new Date().toISOString(),
      inquiriesCount: 1,
    };
    saveTelegramSubscriber(existingSub);
  }

  // 1. Handling CONTACT SHARING (Native "📱 اشتراک‌گذاری شماره تلفن همین اکانت تلگرام")
  if (msg.contact) {
    const contactUserId = msg.contact.user_id;
    const senderUserId = msg.from?.id;

    // Verify ownership: Contact must belong to THIS Telegram account ("و همان شماره همان تلگرام برای ربات شییر شود")
    const isOwnTelegramContact = !contactUserId || !senderUserId || contactUserId === senderUserId;
    if (!isOwnTelegramContact) {
      const log = addTelegramLog({
        chatId,
        senderName,
        type: 'auth_failed',
        message: `خطای امنیتی: شماره ارسال‌شده متعلق به این اکانت تلگرام نبود (کارت تماس فرد دیگر به اشتراک گذاشته شده بود).`,
      });
      deps.onNewLog?.(log);

      await sendContactNotOwnAccount(chatId, settings, companySettings);
      return;
    }

    const rawPhone = msg.contact.phone_number || '';
    const partyFound = findPartyByPhone(rawPhone, parties);

    if (partyFound) {
      // SUCCESSFUL AUTHENTICATION
      const newSub: TelegramSubscriber = {
        chatId,
        partyId: partyFound.id,
        partyName: partyFound.name,
        phone: partyFound.phone || rawPhone,
        telegramUsername: username,
        telegramFirstName: senderName,
        linkedAt: new Date().toISOString(),
        lastInquiryAt: new Date().toISOString(),
        inquiriesCount: 1,
      };
      saveTelegramSubscriber(newSub);
      deps.onPartyLinked(partyFound.id, chatId, username);

      const log = addTelegramLog({
        chatId,
        senderName,
        partyName: partyFound.name,
        type: 'auth_success',
        message: `احراز هویت موفق: شماره ${rawPhone} با موفقیت به مشتری «${partyFound.name}» وصل شد.`,
      });
      deps.onNewLog?.(log);

      // Confirm to customer with pre-defined account details and number
      await fetch(`https://api.telegram.org/bot${settings.botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `
✅ <b>شماره تماس و هویت شما با موفقیت تأیید گردید!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>نام مشتری:</b> ${partyFound.name}
🔢 <b>شماره / کد حساب در سیستم:</b> <code>${partyFound.code || partyFound.id.slice(0, 6)}</code>
📞 <b>شماره تلفن تأییدشده:</b> <code>${partyFound.phone || rawPhone}</code>
━━━━━━━━━━━━━━━━━━━━
📋 <b>صورت‌حساب و مانده حساب از قبل تعریف‌شده شما در سیستم به شرح زیر آماده و ارسال گردید:</b>
`.trim(),
          parse_mode: 'HTML',
          reply_markup: getCustomerReplyKeyboard(),
        }),
      });

      // Immediately send their official pre-defined account statement
      await sendCustomerAccountStatement(chatId, partyFound, invoices, companySettings, settings);
    } else {
      // REJECTED AUTHENTICATION: Phone not defined in system
      const log = addTelegramLog({
        chatId,
        senderName,
        type: 'auth_failed',
        message: `رد احراز هویت: شماره ${rawPhone} در لیست مشتریان از قبل تعریف‌شده شرکت ثبت نیست.`,
      });
      deps.onNewLog?.(log);

      await sendAuthenticationRejected(chatId, rawPhone, settings, companySettings);
    }
    return;
  }

  // 2. Handling TEXT MESSAGES / COMMANDS
  const text = (msg.text || '').trim();

  // If customer clicked "☎️ تماس با شرکت"
  if (text === '☎️ تماس با شرکت' || text.includes('تماس با شرکت')) {
    const compPhone = companySettings.phone || 'ثبت نشده';
    const compAddr = companySettings.address || '';
    await fetch(`https://api.telegram.org/bot${settings.botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `
🏢 <b>اطلاعات تماس «${companySettings.name || 'شرکت تجارتی'}»</b>
━━━━━━━━━━━━━━━━━━━━
☎️ شماره‌های تماس: <code>${compPhone}</code>
${compAddr ? `📍 آدرس: ${compAddr}` : ''}
⏰ ساعات کاری: همه‌روزه از ۸:۰۰ صبح الی ۵:۰۰ عصر
━━━━━━━━━━━━━━━━━━━━
✨ جهت بازگشت به حساب خود، دکمه «🔄 بروزرسانی و دریافت مجدد حساب» را بزنید.
`.trim(),
        parse_mode: 'HTML',
        reply_markup: getCustomerReplyKeyboard(),
      }),
    });
    return;
  }

  // If customer clicked "🧾 جزئیات آخرین فاکتور"
  if (text === '🧾 جزئیات آخرین فاکتور' || text.includes('آخرین فاکتور')) {
    if (matchedParty) {
      await sendCustomerLastInvoice(chatId, matchedParty, invoices, companySettings, settings);
      const log = addTelegramLog({
        chatId,
        senderName,
        partyName: matchedParty.name,
        type: 'inquiry',
        message: `مشاهده آخرین فاکتور توسط مشتری «${matchedParty.name}»`,
      });
      deps.onNewLog?.(log);
    } else {
      await sendAuthenticationRequest(chatId, settings, companySettings);
    }
    return;
  }

  // If customer clicked "📄 دانلود فایل متنی صورتحساب (.txt)"
  if (text.includes('فایل متنی') || text.includes('.txt')) {
    if (matchedParty) {
      await sendCustomerTextFile(chatId, matchedParty, invoices, companySettings, settings);
      const log = addTelegramLog({
        chatId,
        senderName,
        partyName: matchedParty.name,
        type: 'inquiry',
        message: `دانلود فایل متنی صورتحساب توسط «${matchedParty.name}»`,
      });
      deps.onNewLog?.(log);
    } else {
      await sendAuthenticationRequest(chatId, settings, companySettings);
    }
    return;
  }

  // If customer is already authenticated and clicked "🔄 بروزرسانی و دریافت مجدد حساب" or sent /start or /balance
  if (matchedParty) {
    // Send THEIR statement and ONLY THEIR statement
    await sendCustomerAccountStatement(chatId, matchedParty, invoices, companySettings, settings);

    if (existingSub) {
      existingSub.lastInquiryAt = new Date().toISOString();
      existingSub.inquiriesCount = (existingSub.inquiriesCount || 0) + 1;
      saveTelegramSubscriber(existingSub);
    }

    const log = addTelegramLog({
      chatId,
      senderName,
      partyName: matchedParty.name,
      type: 'inquiry',
      message: `استعلام حساب توسط «${matchedParty.name}» (مانده AFN: ${matchedParty.balanceAFN})`,
    });
    deps.onNewLog?.(log);
    return;
  }

  // NOT YET AUTHENTICATED:
  // Did user send a phone number in text (e.g. 0799123456 or +93799...)?
  const potentialPhone = normalizePhoneNumber(text);
  if (potentialPhone && potentialPhone.length >= 7) {
    const partyFound = findPartyByPhone(text, parties);
    if (partyFound) {
      // SUCCESSFUL AUTHENTICATION VIA TEXT PHONE
      const newSub: TelegramSubscriber = {
        chatId,
        partyId: partyFound.id,
        partyName: partyFound.name,
        phone: partyFound.phone || text,
        telegramUsername: username,
        telegramFirstName: senderName,
        linkedAt: new Date().toISOString(),
        lastInquiryAt: new Date().toISOString(),
        inquiriesCount: 1,
      };
      saveTelegramSubscriber(newSub);
      deps.onPartyLinked(partyFound.id, chatId, username);

      const log = addTelegramLog({
        chatId,
        senderName,
        partyName: partyFound.name,
        type: 'auth_success',
        message: `احراز هویت موفق با پیام متنی: شماره ${text} به «${partyFound.name}» وصل شد.`,
      });
      deps.onNewLog?.(log);

      await fetch(`https://api.telegram.org/bot${settings.botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `
✅ <b>شماره تماس و هویت شما با موفقیت تأیید گردید!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>نام مشتری:</b> ${partyFound.name}
🔢 <b>شماره / کد حساب در سیستم:</b> <code>${partyFound.code || partyFound.id.slice(0, 6)}</code>
📞 <b>شماره تلفن تأییدشده:</b> <code>${partyFound.phone || text}</code>
━━━━━━━━━━━━━━━━━━━━
📋 <b>صورت‌حساب و مانده حساب از قبل تعریف‌شده شما در سیستم به شرح زیر آماده و ارسال گردید:</b>
`.trim(),
          parse_mode: 'HTML',
          reply_markup: getCustomerReplyKeyboard(),
        }),
      });

      await sendCustomerAccountStatement(chatId, partyFound, invoices, companySettings, settings);
      return;
    } else {
      const log = addTelegramLog({
        chatId,
        senderName,
        type: 'auth_failed',
        message: `تلاش ناموفق برای شماره ${text} (در سیستم وجود ندارد)`,
      });
      deps.onNewLog?.(log);
      await sendAuthenticationRejected(chatId, text, settings, companySettings);
      return;
    }
  }

  // User just typed /start or generic message without authentication yet:
  const log = addTelegramLog({
    chatId,
    senderName,
    type: 'start',
    message: `شروع کار با ربات توسط کاربر ناشناس (${senderName}) - درخواست شماره ارسال شد`,
  });
  deps.onNewLog?.(log);

  await sendAuthenticationRequest(chatId, settings, companySettings);
}

// ================= ORIGINAL INVOICE SENDER (For manual send or auto-send on invoice save) =================
export interface InvoiceTelegramPayload {
  invoice: Invoice;
  party?: Party | null;
  customerPhone?: string;
  companyName: string;
  companyPhone?: string;
  remainingBalanceThisInvoice: number;
  customerOverallBalanceAFN: number;
  customerOverallBalanceUSD: number;
  imageBlob?: Blob | null;
  targetChatId?: string;
}

export const buildTelegramInvoiceMessage = (payload: InvoiceTelegramPayload): string => {
  const {
    invoice: inv,
    party,
    customerPhone,
    companyName,
    companyPhone,
    remainingBalanceThisInvoice,
    customerOverallBalanceAFN,
    customerOverallBalanceUSD,
  } = payload;

  const partyName = inv.partyName || party?.name || 'مشتری محترم';
  const phone = customerPhone || inv.partyPhone || party?.phone || 'ثبت نشده';
  const date = inv.date || getPersianDate();
  const time = inv.issueTime || 'ثبت شده';
  const currency = inv.currency || 'AFN';

  const isPaidInFull = remainingBalanceThisInvoice <= 0.01;
  const statusBadge = isPaidInFull ? '🟢 تسویه کامل' : '🔴 بدهکار (قرضدار)';

  let overallBalanceText = '';
  if (currency === 'USD') {
    const bal = customerOverallBalanceUSD;
    overallBalanceText =
      bal < 0
        ? `${formatNumber(Math.abs(bal))} $ (بدهکار به ما)`
        : bal > 0
        ? `${formatNumber(bal)} $ (طلبکار از ما)`
        : '۰ $ (بی‌حساب / تسویه)';
  } else {
    const bal = customerOverallBalanceAFN;
    overallBalanceText =
      bal < 0
        ? `${formatNumber(Math.abs(bal))} افغانی (بدهکار به ما)`
        : bal > 0
        ? `${formatNumber(bal)} افغانی (طلبکار از ما)`
        : '۰ افغانی (بی‌حساب / تسویه)';
  }

  const itemsSummary = (inv.items || [])
    .map((it, idx) => formatTelegramItemLine(it, idx, currency))
    .join('\n');

  const currLabel = getCurrencyLabel(currency);

  return `
🏢 <b>${companyName}</b>
🧾 <b>فاکتور رسمی فروش کالا #${inv.invoiceNumber}</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>نام مشتری:</b> ${partyName}
📞 <b>شماره تماس:</b> <code>${phone}</code>
📅 <b>تاریخ و ساعت:</b> ${date} • ${time}
💳 <b>نحوه معامله:</b> ${inv.dealTypeLabel || inv.dealType || 'قرضی'} (${statusBadge})

📦 <b>اقلام فاکتور:</b>
${itemsSummary || '  اقلام ثبت شده در سیستم'}

💰 <b>مبلغ کل فاکتور:</b> <b>${formatNumber(inv.totalAmount)} ${currLabel}</b>
💵 <b>مبلغ پرداخت‌شده:</b> <b>${formatNumber(inv.paidAmount || 0)} ${currLabel}</b>
🔴 <b>الباقی مانده این فاکتور:</b> <b>${formatNumber(remainingBalanceThisInvoice)} ${currLabel}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>الباقی کل حساب مشتری:</b>
👉 <b>${overallBalanceText}</b>
${companyPhone ? `\n☎️ <b>تماس با شرکت:</b> <code>${companyPhone}</code>` : ''}
━━━━━━━━━━━━━━━━━━━━
✨ <i>صادر شده از سیستم مالی یکپارچه تجارتی</i>
`.trim();
};

export const buildInvoiceTextFileContent = (payload: InvoiceTelegramPayload): string => {
  const {
    invoice: inv,
    party,
    customerPhone,
    companyName,
    companyPhone,
    remainingBalanceThisInvoice,
    customerOverallBalanceAFN,
    customerOverallBalanceUSD,
  } = payload;

  const partyName = inv.partyName || party?.name || 'مشتری محترم';
  const phone = customerPhone || inv.partyPhone || party?.phone || 'ثبت نشده';
  const date = inv.date || getPersianDate();
  const time = inv.issueTime || '';
  const currency = inv.currency || 'AFN';

  const separator = '='.repeat(52);
  const subSeparator = '-'.repeat(52);

  const itemsLines = (inv.items || [])
    .map((it, i) => formatPlainTextItemLine(it, i, currency))
    .join('\n');

  return `
${separator}
            ${companyName}
        فاکتور رسمی فروش و صورت وضعیت حساب مشتری
${separator}
شماره فاکتور: #${inv.invoiceNumber}
تاریخ و ساعت: ${date}  ${time}
نام طرف حساب: ${partyName}
شماره تماس مشتری: ${phone}
نوع پرداخت و تسویه: ${inv.dealTypeLabel || inv.dealType || 'قرضی / نقدی'}
${subSeparator}
اقلام و خدمات فاکتور:
${itemsLines}
${subSeparator}
مبلغ کل فاکتور:               ${formatNumber(inv.totalAmount)} ${currency}
مبلغ تخفیف فاکتور:            ${formatNumber(inv.discount || 0)} ${currency}
کرایه حمل و مصارف:           ${formatNumber(inv.shippingCost || 0)} ${currency}
مبلغ پرداخت‌شده (نقدی):        ${formatNumber(inv.paidAmount || 0)} ${currency}
الباقی مانده این فاکتور:       ${formatNumber(remainingBalanceThisInvoice)} ${currency}
${subSeparator}
وضعیت الباقی کلی حساب مشتری:
مانده حساب به افغانی:         ${formatNumber(customerOverallBalanceAFN)} AFN
مانده حساب به دلار:           ${formatNumber(customerOverallBalanceUSD)} USD
${subSeparator}
شرایط عمومی معامله:
- لطفاً در مورد سلامت و صحت اجناس اطمینان حاصل فرمایید.
- فاکتور بدون مهر و امضا فاقد اعتبار قانونی می‌باشد.
${companyPhone ? `تلفن‌های تماس شرکت: ${companyPhone}\n` : ''}
تاریخ صدور فایل: ${getPersianDate()}
${separator}
`.trim();
};

export const sendInvoiceToTelegramBot = async (
  payload: InvoiceTelegramPayload,
  settings: TelegramSettings
): Promise<{ success: boolean; message: string; details?: any }> => {
  const token = settings.botToken?.trim();
  // Target chat id: prioritize payload.targetChatId, then party.telegramChatId, then defaultChatId
  const targetChatId = (payload.targetChatId || payload.party?.telegramChatId || settings.defaultChatId || '').trim();

  if (!token) {
    return {
      success: false,
      message: 'توکن ربات تلگرام تنظیم نشده است. لطفاً ابتدا در تنظیمات تلگرام توکن را وارد کنید.',
    };
  }

  if (!targetChatId) {
    return {
      success: false,
      message: 'شناسه چت تلگرام مشتری (Chat ID) مشخص نشده است. مشتری ابتدا باید در ربات دکمه استارت را بزند تا متصل گردد.',
    };
  }

  const messageText = buildTelegramInvoiceMessage(payload);
  const textFileContent = buildInvoiceTextFileContent(payload);

  try {
    let photoSent = false;
    let textSent = false;
    let docSent = false;

    // 1. Send Photo if available
    if (payload.imageBlob && settings.sendPhoto) {
      try {
        const formData = new FormData();
        formData.append('chat_id', targetChatId);
        formData.append('photo', payload.imageBlob, `invoice_${payload.invoice.invoiceNumber}.png`);
        if (messageText.length <= 1020) {
          formData.append('caption', messageText);
          formData.append('parse_mode', 'HTML');
          textSent = true;
        }

        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const photoData = await photoRes.json();
        if (photoData.ok) {
          photoSent = true;
        }
      } catch (photoErr) {
        console.warn('Error uploading photo to telegram:', photoErr);
      }
    }

    // 2. Send Text
    if (!textSent && settings.sendText) {
      try {
        const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: messageText,
            parse_mode: 'HTML',
          }),
        });

        const msgData = await msgRes.json();
        if (msgData.ok) {
          textSent = true;
        }
      } catch (msgErr: any) {
        if (!photoSent) throw msgErr;
      }
    }

    // 3. Send Text File
    if (settings.sendDocument) {
      try {
        const textBlob = new Blob([textFileContent], { type: 'text/plain;charset=utf-8' });
        const docFormData = new FormData();
        docFormData.append('chat_id', targetChatId);
        docFormData.append(
          'document',
          textBlob,
          `صورتحساب_فاکتور_${payload.invoice.invoiceNumber}_${payload.invoice.partyName || 'مشتری'}.txt`
        );
        docFormData.append(
          'caption',
          `📄 فایل متنی مشخصات فاکتور #${payload.invoice.invoiceNumber}`
        );

        const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: 'POST',
          body: docFormData,
        });
        const docData = await docRes.json();
        if (docData.ok) {
          docSent = true;
        }
      } catch (docErr) {
        console.warn('Error sending text document to telegram:', docErr);
      }
    }

    if (photoSent || textSent || docSent) {
      const parts: string[] = [];
      if (photoSent) parts.push('تصویر فاکتور');
      if (textSent) parts.push('پیام متنی حساب');
      if (docSent) parts.push('فایل متنی سند');

      return {
        success: true,
        message: `با موفقیت به تلگرام ارسال شد (${parts.join(' + ')})`,
      };
    } else {
      return {
        success: false,
        message: 'ارسال انجام نشد. لطفاً درستی توکن و شناسه چت را بررسی کنید.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در ارسال به تلگرام: ${err?.message || 'خطای ناشناخته'}`,
    };
  }
};
