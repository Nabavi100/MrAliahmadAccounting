import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ================= DATA DIRECTORY & PERSISTENCE =================
const DATA_DIR = path.resolve(process.cwd(), 'server_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, 'telegram_config.json');
const USERS_FILE = path.join(DATA_DIR, 'telegram_users.json');
const LOGS_FILE = path.join(DATA_DIR, 'telegram_logs.json');
const PARTIES_FILE = path.join(DATA_DIR, 'parties_cache.json');
const OFFSET_FILE = path.join(DATA_DIR, 'telegram_offset.json');

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
  autoPolling?: boolean;
  botUsername?: string;
  botFirstName?: string;
  lastTestStatus?: 'connected' | 'error' | 'idle';
  lastTestedAt?: string;
  lastError?: string;
}

export interface TelegramUserRecord {
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

export interface TelegramLogRecord {
  id: string;
  timestamp: string;
  type: string;
  chatId: string;
  partyName?: string;
  message: string;
  status: 'success' | 'failed';
  errorDetails?: string;
}

function loadConfig(): TelegramConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading config file:', e);
  }
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8740100617:AAHDFzQ4DWVhbMk4UWIcQj11IuoaWGsz1-8',
    defaultChatId: '',
    autoPolling: true,
    botUsername: 'ehw_customer_bot',
    botFirstName: 'customer_bot',
    lastTestStatus: 'connected',
  };
}

function saveConfig(cfg: TelegramConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config file:', e);
  }
}

function loadUsers(): TelegramUserRecord[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading users file:', e);
  }
  return [];
}

function saveUsers(users: TelegramUserRecord[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving users file:', e);
  }
}

function loadLogs(): TelegramLogRecord[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading logs file:', e);
  }
  return [];
}

function addLog(log: Omit<TelegramLogRecord, 'id' | 'timestamp'>) {
  try {
    const logs = loadLogs();
    const entry: TelegramLogRecord = {
      ...log,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' - ' + new Date().toLocaleDateString('fa-IR'),
    };
    logs.unshift(entry);
    if (logs.length > 200) logs.pop();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    return entry;
  } catch (e) {
    console.error('Error writing log:', e);
  }
}

function loadPartiesCache(): any[] {
  try {
    if (fs.existsSync(PARTIES_FILE)) {
      const data = fs.readFileSync(PARTIES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading parties cache:', e);
  }
  return [];
}

function savePartiesCache(parties: any[]) {
  try {
    fs.writeFileSync(PARTIES_FILE, JSON.stringify(parties, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving parties cache:', e);
  }
}

function generateConnectionCode(): string {
  // Pattern: AC-XXXXXX (e.g. AC-7F42K9)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AC-${randomPart}`;
}

function normalizeDigits(raw: string): string {
  if (!raw) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let s = String(raw).trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  return s;
}

function normalizePhone(raw: string): string {
  if (!raw) return '';
  let s = normalizeDigits(raw);
  s = s.replace(/\D/g, '');
  if (s.startsWith('0093')) s = s.substring(4);
  else if (s.startsWith('93') && s.length >= 11) s = s.substring(2);
  if (s.startsWith('0') && s.length >= 10) s = s.substring(1);
  return s;
}

function phonesMatch(p1: string, p2: string): boolean {
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length >= 7 && n2.length >= 7) {
    const minLen = Math.min(n1.length, n2.length, 9);
    return n1.slice(-minLen) === n2.slice(-minLen);
  }
  return false;
}

function findTelegramUserByQuery(users: TelegramUserRecord[], query: string): TelegramUserRecord | undefined {
  if (!query) return undefined;
  const rawNormalized = normalizeDigits(query).trim();
  const upper = rawNormalized.toUpperCase();
  const cleanCode = upper.replace(/^AC-/, '').replace(/[^A-Z0-9]/g, '');
  const normPhone = normalizePhone(rawNormalized);
  const cleanUsername = rawNormalized.replace(/^@/, '').toLowerCase();

  // 1. First priority: Exact or prefix match on connection code
  const byCode = users.find(u => {
    if (!u.connectionCode) return false;
    const uCode = u.connectionCode.toUpperCase();
    const uClean = uCode.replace(/^AC-/, '').replace(/[^A-Z0-9]/g, '');
    return uCode === upper || (cleanCode.length >= 4 && (uClean === cleanCode || uClean === upper || uCode === `AC-${cleanCode}`));
  });
  if (byCode) return byCode;

  // 2. Second priority: Phone number match (matches Afghan format +93..., 07..., 7...)
  if (normPhone && normPhone.length >= 7) {
    const byPhone = users.find(u => u.phoneNumber && phonesMatch(u.phoneNumber, rawNormalized));
    if (byPhone) return byPhone;
  }

  // 3. Third priority: Telegram Chat ID or Telegram User ID
  if (/^\d{5,15}$/.test(rawNormalized)) {
    const byChatId = users.find(u => u.telegramChatId === rawNormalized || u.telegramUserId === rawNormalized);
    if (byChatId) return byChatId;
  }

  // 4. Fourth priority: Telegram Username
  if (cleanUsername && cleanUsername.length >= 3) {
    const byUsername = users.find(u => {
      if (!u.username) return false;
      const uUser = u.username.replace(/^@/, '').toLowerCase();
      return uUser === cleanUsername;
    });
    if (byUsername) return byUsername;
  }

  // 5. Fifth priority: Name match
  const byName = users.find(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    return fullName && (fullName === rawNormalized.toLowerCase() || fullName.includes(rawNormalized.toLowerCase()));
  });
  if (byName) return byName;

  return undefined;
}

export function sanitizeBotToken(raw: string): string {
  if (!raw) return '';
  let token = String(raw).trim();
  // Strip outer quotes and spaces
  token = token.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
  // If user pasted whole message from BotFather e.g. "Use this token to access the HTTP API: 123456:ABC..."
  const match = token.match(/(\d{6,14}:[A-Za-z0-9_-]{20,55})/);
  if (match) {
    return match[1].trim();
  }
  // Strip leading "bot" if pasted like "bot123456:..."
  if (token.toLowerCase().startsWith('bot')) {
    token = token.substring(3).trim();
  }
  return token;
}

function explainTelegramError(status: number, desc?: string): string {
  const d = (desc || '').toLowerCase();
  if (status === 401 || d.includes('unauthorized')) {
    return 'توکن نامعتبر است (خطای ۴۰۱). لطفاً توکن دریافتی از BotFather@ را دقیقاً و کامل کپی نمایید.';
  }
  if (status === 404 || d.includes('not found')) {
    return 'ربات تلگرام یافت نشد (خطای ۴۰۴). بررسی کنید که توکن به درستی وارد شده و پیشوند اضافی نداشته باشد.';
  }
  if (d.includes('blocked') || d.includes('terminated')) {
    return 'این ربات توسط تلگرام مسدود یا غیرفعال گردیده است.';
  }
  return desc || 'توکن وارد شده توسط سرورهای رسمی تلگرام تایید نشد.';
}

// ================= TELEGRAM SEND HELPERS =================
async function telegramApiCall(token: string, method: string, body: any): Promise<any> {
  const cleanToken = sanitizeBotToken(token);
  const url = `https://api.telegram.org/bot${cleanToken}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

// ================= SERVER-SIDE POLLING ENGINE =================
let isPolling = false;
let pollingAbortController: AbortController | null = null;

async function startPolling() {
  const config = loadConfig();
  if (!config.botToken || config.autoPolling === false || isPolling) {
    return;
  }

  isPolling = true;
  pollingAbortController = new AbortController();

  let offset = 0;
  try {
    if (fs.existsSync(OFFSET_FILE)) {
      const data = JSON.parse(fs.readFileSync(OFFSET_FILE, 'utf-8'));
      offset = data.offset || 0;
    }
  } catch {}

  console.log('🤖 Telegram Bot background polling started...');

  (async () => {
    while (isPolling) {
      const currentConfig = loadConfig();
      if (!currentConfig.botToken || currentConfig.autoPolling === false) {
        isPolling = false;
        break;
      }

      try {
        const url = `https://api.telegram.org/bot${currentConfig.botToken.trim()}/getUpdates?offset=${offset}&timeout=15`;
        const res = await fetch(url, {
          signal: pollingAbortController?.signal,
        });

        if (!res.ok) {
          await new Promise(r => setTimeout(r, 4000));
          continue;
        }

        const data: any = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            try {
              fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }), 'utf-8');
            } catch {}

            await handleTelegramUpdate(update, currentConfig.botToken);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        await new Promise(r => setTimeout(r, 3500));
      }
    }
    console.log('🛑 Telegram Bot background polling stopped.');
  })();
}

function stopPolling() {
  isPolling = false;
  if (pollingAbortController) {
    try {
      pollingAbortController.abort();
    } catch {}
    pollingAbortController = null;
  }
}

// ================= HANDLE INCOMING TELEGRAM UPDATES =================
async function handleTelegramUpdate(update: any, botToken: string) {
  const msg = update.message;
  if (!msg) return;

  const chatId = String(msg.chat?.id || '');
  if (!chatId) return;

  const senderId = String(msg.from?.id || '');
  const firstName = msg.from?.first_name || '';
  const lastName = msg.from?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'کاربر تلگرام';
  const username = msg.from?.username ? `@${msg.from.username}` : undefined;

  const users = loadUsers();
  let existingUser = users.find(u => u.telegramChatId === chatId);

  // If user is new to the bot, register immediately with a connection code
  if (!existingUser) {
    const connectionCode = generateConnectionCode();
    existingUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      telegramUserId: senderId,
      telegramChatId: chatId,
      phoneNumber: '',
      firstName,
      lastName,
      username,
      connectionCode,
      registeredAt: new Date().toISOString(),
      status: 'pending',
      inquiriesCount: 0,
    };
    users.unshift(existingUser);
    saveUsers(users);

    addLog({
      chatId,
      partyName: fullName,
      type: 'auth_pending',
      status: 'success',
      message: `کاربر تلگرام (${fullName}) ربات را استارت کرد. کد اتصال یکتا: ${connectionCode}`,
    });
  } else {
    // Keep profile fresh
    let changed = false;
    if (firstName && existingUser.firstName !== firstName) { existingUser.firstName = firstName; changed = true; }
    if (lastName && existingUser.lastName !== lastName) { existingUser.lastName = lastName; changed = true; }
    if (username && existingUser.username !== username) { existingUser.username = username; changed = true; }
    if (!existingUser.connectionCode) { existingUser.connectionCode = generateConnectionCode(); changed = true; }
    if (changed) saveUsers(users);
  }

  // 1. CONTACT SHARING (Official Telegram Contact Sharing Request)
  if (msg.contact) {
    const contactUserId = msg.contact.user_id ? String(msg.contact.user_id) : '';
    const rawPhone = msg.contact.phone_number || '';

    // Verify ownership: contact user_id must match sender id
    const isOwnContact = !contactUserId || !senderId || contactUserId === senderId;
    if (!isOwnContact) {
      addLog({
        chatId,
        partyName: fullName,
        type: 'auth_failed',
        status: 'failed',
        message: `خطای امنیتی: شماره ارسال‌شده متعلق به اکانت تلگرام فرستنده نبود.`,
        errorDetails: `Contact User ID (${contactUserId}) != Sender ID (${senderId})`,
      });

      await telegramApiCall(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `⚠️ <b>خطای امنیتی:</b> شماره ارسال‌شده متعلق به همین اکانت تلگرام نیست.\nلطفاً فقط شماره همین اکانت خود را از طریق دکمه اختصاصی ارسال فرمایید.`,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [[{ text: '📱 اشتراک‌گذاری شماره تماس', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    }

    // Check if phone matches any party in cache
    const parties = loadPartiesCache();
    const matchedParty = parties.find(p => p.phone && phonesMatch(p.phone, rawPhone));

    let connectionCode = existingUser?.connectionCode || generateConnectionCode();

    existingUser.phoneNumber = rawPhone;
    existingUser.firstName = firstName || existingUser.firstName;
    existingUser.lastName = lastName || existingUser.lastName;
    existingUser.username = username || existingUser.username;
    if (!existingUser.connectionCode) existingUser.connectionCode = connectionCode;

    if (matchedParty) {
      existingUser.status = 'connected';
      existingUser.partyId = matchedParty.id;
      existingUser.partyName = matchedParty.name;
      existingUser.linkedAt = new Date().toISOString();
    }

    saveUsers(users);

    addLog({
      chatId,
      partyName: matchedParty ? matchedParty.name : fullName,
      type: matchedParty ? 'connected' : 'auth_pending',
      status: 'success',
      message: matchedParty
        ? `شماره تماس ${rawPhone} دریافت و فوراً با پرونده «${matchedParty.name}» متصل شد.`
        : `شماره تماس ${rawPhone} دریافت شد. کد اتصال: ${connectionCode}`,
    });

    const replyText = matchedParty
      ? `
✅ <b>تبریک! شماره شما با موفقیت شناسایی و حسابتان متصل گردید.</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>طرف حساب متصل:</b> ${matchedParty.name}
📞 <b>شماره ثبت‌شده:</b> <code>${rawPhone}</code>
🔑 <b>کد اتصال شما:</b> <code>${connectionCode}</code>
━━━━━━━━━━━━━━━━━━━━
از این پس فاکتورها، رسیدها و صورت‌حساب اختصاصی شما مستقیماً در همین ربات برای شخص شما ارسال خواهد شد.
`.trim()
      : `
📱 <b>شماره تماس شما با موفقیت در سیستم ثبت گردید!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>نام:</b> ${fullName}
📞 <b>شماره ثبت‌شده:</b> <code>${rawPhone}</code>
🔑 <b>کد اتصال یکتای شما:</b> <code>${connectionCode}</code>
━━━━━━━━━━━━━━━━━━━━
⏳ <b>وضعیت حساب: در انتظار تأیید مدیریت</b>

لطفاً این کد اتصال را به مدیریت یا حسابدار شرکت اعلام فرمایید تا دسترسی به حساب مالی شما متصل و فعال شود.
`.trim();

    await telegramApiCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text: replyText,
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: matchedParty
          ? [
              [{ text: '📋 دریافت خلاصه وضعیت حساب' }],
              [{ text: '☎️ تماس با دفتر شرکت' }],
            ]
          : [
              [{ text: '🔄 استعلام وضعیت اتصال' }, { text: '☎️ تماس با دفتر شرکت' }],
            ],
        resize_keyboard: true,
      },
    });
    return;
  }

  // 2. TEXT MESSAGES & COMMANDS
  const text = (msg.text || '').trim();

  // If user clicked "☎️ تماس با دفتر شرکت"
  if (text.includes('تماس با دفتر') || text.includes('تماس با شرکت')) {
    await telegramApiCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text: `🏢 <b>شرکت تجارتی برادران نبوی</b>\n━━━━━━━━━━━━━━━━━━━━\n📞 تلفن دفتر مرکزی: <code>0799000000</code>\n⏰ ساعات پاسخگویی: ۸:۰۰ صبح الی ۵:۰۰ عصر`,
      parse_mode: 'HTML',
    });
    return;
  }

  // If user clicked "🔄 استعلام وضعیت اتصال"
  if (text.includes('استعلام وضعیت اتصال') || text === '/status') {
    if (existingUser && existingUser.status === 'connected') {
      await telegramApiCall(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `✅ <b>حساب شما متصل و فعال است!</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 طرف حساب: <b>${existingUser.partyName || 'مشتری'}</b>\n🔑 کد اتصال: <code>${existingUser.connectionCode}</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [{ text: '📋 دریافت خلاصه وضعیت حساب' }],
            [{ text: '☎️ تماس با دفتر شرکت' }],
          ],
          resize_keyboard: true,
        },
      });
    } else {
      const code = existingUser?.connectionCode || 'نامشخص';
      await telegramApiCall(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `⏳ <b>در انتظار تأیید حساب</b>\n━━━━━━━━━━━━━━━━━━━━\nکد اتصال شما: <code>${code}</code>\nلطفاً این کد را جهت تایید به حسابدار یا مدیریت شرکت اعلام فرمایید.`,
        parse_mode: 'HTML',
      });
    }
    return;
  }

  // If connected user asks for balance statement
  if (existingUser && existingUser.status === 'connected' && (text.includes('وضعیت حساب') || text === '/balance')) {
    const parties = loadPartiesCache();
    const party = parties.find(p => p.id === existingUser?.partyId);
    const partyName = party?.name || existingUser.partyName || 'مشتری گرامی';
    const balAFN = party?.balanceAFN || 0;
    const balUSD = party?.balanceUSD || 0;

    const afnStatus = balAFN < -0.01 ? `🔴 ${Math.abs(balAFN).toLocaleString('fa-IR')} افغانی (بدهکار به ما)` : balAFN > 0.01 ? `🟢 ${balAFN.toLocaleString('fa-IR')} افغانی (طلبکار از ما)` : `⚪ ۰ افغانی (تسویه)`;
    const usdStatus = balUSD < -0.01 ? `🔴 ${Math.abs(balUSD).toLocaleString('fa-IR')} $ (بدهکار به ما)` : balUSD > 0.01 ? `🟢 ${balUSD.toLocaleString('fa-IR')} $ (طلبکار از ما)` : `⚪ ۰ $ (تسویه)`;

    await telegramApiCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text: `
🏢 <b>شرکت تجارتی برادران نبوی</b>
📋 <b>صورت وضعیت اختصاصی حساب</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>طرف حساب:</b> ${partyName}
📅 <b>تاریخ استعلام:</b> ${new Date().toLocaleDateString('fa-IR')} • ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
━━━━━━━━━━━━━━━━━━━━
💰 <b>مانده حساب افغانی:</b>
   ${afnStatus}

💵 <b>مانده حساب دلاری:</b>
   ${usdStatus}
━━━━━━━━━━━━━━━━━━━━
🔒 <i>این اطلاعات محرمانه بوده و فقط برای شخص شما ارسال گردیده است.</i>
`.trim(),
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [{ text: '📋 دریافت خلاصه وضعیت حساب' }],
          [{ text: '☎️ تماس با دفتر شرکت' }],
        ],
        resize_keyboard: true,
      },
    });

    addLog({
      chatId,
      partyName,
      type: 'inquiry',
      status: 'success',
      message: `استعلام مانده حساب توسط مشتری «${partyName}»`,
    });
    return;
  }

  // Default /start or first message: Send Contact Request Button with Connection Code
  const myCode = existingUser?.connectionCode || generateConnectionCode();
  await telegramApiCall(botToken, 'sendMessage', {
    chat_id: chatId,
    text: `
🌸 <b>سلام و عرض احترام، ${fullName} عزیز</b>
به ربات رسمی حسابداری <b>«شرکت تجارتی برادران نبوی»</b> خوش آمدید!
━━━━━━━━━━━━━━━━━━━━
🔑 <b>کد اتصال یکتای شما:</b> <code>${myCode}</code>
🆔 <b>شناسه تلگرام:</b> <code>${chatId}</code>
━━━━━━━━━━━━━━━━━━━━
🔒 <b>جهت فعال‌سازی و دریافت اختصاصی صورت‌حساب و فاکتورها:</b>

۱️⃣ <b>اتصال خودکار:</b> دکمه زیر («📱 اشتراک‌گذاری شماره تماس») را لمس فرمایید تا در صورت ثبت شماره در سیستم شرکت، حسابتان فوراً وصل شود.
۲️⃣ <b>اتصال دستی توسط شرکت:</b> کد اتصال (<code>${myCode}</code>) یا شماره موبایل خود را به حسابدار شرکت اعلام فرمایید تا تأیید گردد.
`.trim(),
    parse_mode: 'HTML',
    reply_markup: {
      keyboard: [
        [
          {
            text: '📱 اشتراک‌گذاری شماره تماس',
            request_contact: true,
          },
        ],
        [
          { text: '🔄 استعلام وضعیت اتصال' },
          { text: '☎️ تماس با دفتر شرکت' },
        ],
      ],
      resize_keyboard: true,
    },
  });
}

// ================= API ENDPOINTS =================

// 1. GET /api/telegram/status
app.get('/api/telegram/status', (req: Request, res: Response) => {
  const config = loadConfig();
  const users = loadUsers();
  const pending = users.filter(u => u.status === 'pending');
  const connected = users.filter(u => u.status === 'connected');

  res.json({
    isConfigured: !!config.botToken,
    botUsername: config.botUsername || '',
    botFirstName: config.botFirstName || '',
    defaultChatId: config.defaultChatId || '',
    isPolling,
    pendingCount: pending.length,
    connectedCount: connected.length,
    lastTestStatus: config.lastTestStatus || 'idle',
    lastTestedAt: config.lastTestedAt,
    lastError: config.lastError,
  });
});

// 2. POST /api/telegram/config (Save Bot Token securely on server)
app.post('/api/telegram/config', async (req: Request, res: Response) => {
  try {
    const { botToken, defaultChatId, autoPolling } = req.body;
    const config = loadConfig();

    let tokenChanged = false;
    if (botToken !== undefined) {
      const sanitized = sanitizeBotToken(botToken);
      if (sanitized && sanitized !== config.botToken) {
        config.botToken = sanitized;
        tokenChanged = true;
      }
    }
    if (defaultChatId !== undefined) {
      config.defaultChatId = normalizeDigits(defaultChatId || '').trim();
    }
    if (autoPolling !== undefined) {
      config.autoPolling = !!autoPolling;
    }

    // Verify token with Telegram only if token changed or we have no bot info yet
    if (config.botToken && (tokenChanged || !config.botUsername || config.lastTestStatus !== 'connected')) {
      try {
        const testRes = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`, {
          signal: AbortSignal.timeout(6000),
        });
        const testData: any = await testRes.json();
        if (testData.ok && testData.result) {
          config.botUsername = testData.result.username;
          config.botFirstName = testData.result.first_name;
          config.lastTestStatus = 'connected';
          config.lastTestedAt = new Date().toISOString();
          config.lastError = undefined;
        } else {
          config.lastTestStatus = 'error';
          config.lastError = explainTelegramError(testRes.status, testData.description);
        }
      } catch (err: any) {
        if (!config.botUsername) {
          config.lastTestStatus = 'error';
          config.lastError = err?.name === 'TimeoutError' ? 'مهلت زمان اتصال به تلگرام به پایان رسید.' : (err?.message || 'خطا در ارتباط با سرور تلگرام');
        }
      }
    } else if (config.botToken && !config.lastTestStatus) {
      config.lastTestStatus = 'connected';
    }

    saveConfig(config);

    // Restart or stop polling accordingly
    if (config.botToken && config.autoPolling !== false) {
      if (tokenChanged) {
        stopPolling();
      }
      startPolling();
    } else {
      stopPolling();
    }

    res.json({
      success: true,
      botUsername: config.botUsername || '',
      botFirstName: config.botFirstName || '',
      defaultChatId: config.defaultChatId || '',
      error: config.lastError,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// 3. POST /api/telegram/test-connection
app.post('/api/telegram/test-connection', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.body;
    const tokenToTest = sanitizeBotToken(botToken || loadConfig().botToken || '');

    if (!tokenToTest) {
      return res.status(400).json({ success: false, error: 'لطفاً توکن ربات تلگرام را وارد فرمایید.' });
    }

    const testRes = await fetch(`https://api.telegram.org/bot${tokenToTest}/getMe`, {
      signal: AbortSignal.timeout(12000),
    });
    const testData: any = await testRes.json();

    if (testData.ok && testData.result) {
      const config = loadConfig();
      config.botToken = tokenToTest;
      config.botUsername = testData.result.username;
      config.botFirstName = testData.result.first_name;
      config.lastTestStatus = 'connected';
      config.lastTestedAt = new Date().toISOString();
      config.lastError = undefined;
      saveConfig(config);

      res.json({
        success: true,
        botName: testData.result.first_name,
        username: testData.result.username,
      });
    } else {
      res.json({
        success: false,
        error: explainTelegramError(testRes.status, testData.description),
      });
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError';
    res.json({
      success: false,
      error: isTimeout ? 'مهلت زمان اتصال به سرور تلگرام به پایان رسید (Timeout).' : `خطا در ارتباط با سرور تلگرام: ${err?.message || 'خطای شبکه'}`,
    });
  }
});

// 4. GET /api/telegram/users
app.get('/api/telegram/users', (req: Request, res: Response) => {
  const users = loadUsers();
  const pending = users.filter(u => u.status === 'pending');
  const connected = users.filter(u => u.status === 'connected');
  res.json({ pending, connected, total: users.length });
});

// 5. POST /api/telegram/link-user (Manager links Telegram User to Accounting Party)
app.post('/api/telegram/link-user', async (req: Request, res: Response) => {
  try {
    const { chatId, connectionCode, phone, identifier, partyId, partyName } = req.body;

    if (!partyId || !partyName) {
      return res.status(400).json({ success: false, error: 'شناسه و نام طرف حساب الزامی است.' });
    }

    const query = String(identifier || connectionCode || phone || chatId || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'لطفاً کد اتصال، شماره موبایل یا شناسه کاربر تلگرام را وارد فرمایید.' });
    }

    const users = loadUsers();
    // 1. Smart multi-attribute search across codes, phones, IDs, usernames
    let target = findTelegramUserByQuery(users, query);

    // 2. Direct chatId fallback
    if (!target && chatId) {
      target = users.find(u => u.telegramChatId === String(chatId) || u.telegramUserId === String(chatId));
    }

    // 3. Fallback: If not found, but query looks like a valid phone number (e.g. 078... or +9378...)
    if (!target) {
      const normPhone = normalizePhone(query);
      if (normPhone && normPhone.length >= 7) {
        // Pre-create or pre-link this customer so as soon as they /start or send contact, they're active
        const newCode = generateConnectionCode();
        target = {
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          telegramUserId: '',
          telegramChatId: '',
          phoneNumber: query,
          firstName: partyName,
          lastName: '',
          connectionCode: newCode,
          registeredAt: new Date().toISOString(),
          status: 'connected',
          partyId,
          partyName,
          linkedAt: new Date().toISOString(),
          inquiriesCount: 0,
        };
        users.unshift(target);
        saveUsers(users);

        addLog({
          chatId: 'pre-link',
          partyName,
          type: 'connected',
          status: 'success',
          message: `طرف حساب «${partyName}» با شماره موبایل ${query} متصل شد. کد اتصال: ${newCode}`,
        });

        return res.json({
          success: true,
          user: target,
          message: `شماره ${query} به پرونده «${partyName}» متصل گردید. به محض ورود مشتری به ربات، حساب فعال می‌شود.`,
        });
      }

      return res.status(404).json({
        success: false,
        error: `کاربر تلگرام با مشخصات «${query}» یافت نشد. لطفاً بررسی کنید مشتری ربات را استارت زده یا شماره/کد را صحیح وارد فرمایید.`,
      });
    }

    target.status = 'connected';
    target.partyId = partyId;
    target.partyName = partyName;
    target.linkedAt = new Date().toISOString();
    // If target has no phone yet, but query was a phone, record it
    if (!target.phoneNumber && normalizePhone(query).length >= 7) {
      target.phoneNumber = query;
    }
    saveUsers(users);

    const config = loadConfig();
    if (config.botToken && target.telegramChatId) {
      // Notify the customer in Telegram immediately
      await telegramApiCall(config.botToken, 'sendMessage', {
        chat_id: target.telegramChatId,
        text: `
✅ <b>تبریک! حساب کاربری شما با موفقیت متصل و تأیید شد.</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>طرف حساب متصل‌شده:</b> ${partyName}
🔢 <b>کد اتصال:</b> <code>${target.connectionCode}</code>
📅 <b>تاریخ اتصال:</b> ${new Date().toLocaleDateString('fa-IR')}
━━━━━━━━━━━━━━━━━━━━
از این پس صورت‌حساب، فاکتورها، رسیدهای دریافتی و مانده حساب شما به صورت اختصاصی در همین ربات برای شما ارسال خواهد شد.
`.trim(),
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [{ text: '📋 دریافت خلاصه وضعیت حساب' }],
            [{ text: '☎️ تماس با دفتر شرکت' }],
          ],
          resize_keyboard: true,
        },
      });
    }

    addLog({
      chatId: target.telegramChatId || 'direct',
      partyName,
      type: 'connected',
      status: 'success',
      message: `اتصال کاربر تلگرام به طرف حساب «${partyName}» (کد ${target.connectionCode} / تلفن: ${target.phoneNumber || 'بدون شماره'}) با موفقیت برقرار شد.`,
    });

    res.json({ success: true, user: target });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// 6. POST /api/telegram/unlink-user
app.post('/api/telegram/unlink-user', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ success: false, error: 'شناسه چت الزامی است.' });

    const users = loadUsers();
    const target = users.find(u => u.telegramChatId === chatId);

    if (!target) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد.' });
    }

    const previousParty = target.partyName;
    target.status = 'pending';
    target.partyId = undefined;
    target.partyName = undefined;
    target.linkedAt = undefined;
    saveUsers(users);

    const config = loadConfig();
    if (config.botToken) {
      await telegramApiCall(config.botToken, 'sendMessage', {
        chat_id: target.telegramChatId,
        text: `ℹ️ <b>اتصال حساب شما توسط مدیریت قطع گردید.</b>\nدر صورت نیاز جهت اتصال مجدد با دفتر شرکت تماس بگیرید.`,
        parse_mode: 'HTML',
      });
    }

    addLog({
      chatId,
      partyName: previousParty,
      type: 'unlinked',
      status: 'success',
      message: `قطع اتصال کاربر تلگرام از طرف حساب «${previousParty}» توسط مدیریت انجام شد.`,
    });

    res.json({ success: true, user: target });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// 7. POST /api/telegram/send-message (Send Invoice, Receipt, Statement, Balance, Manual)
app.post('/api/telegram/send-message', async (req: Request, res: Response) => {
  try {
    const { chatId, partyId, partyName, messageType, title, textContent, photoBase64 } = req.body;

    if (!chatId || !textContent) {
      return res.status(400).json({ success: false, error: 'شناسه چت و متن پیام الزامی است.' });
    }

    const config = loadConfig();
    if (!config.botToken) {
      return res.status(400).json({ success: false, error: 'توکن ربات تلگرام در سیستم ثبت نشده است.' });
    }

    // Security check: verify this chatId belongs to the requested partyId (if partyId is provided)
    const users = loadUsers();
    const userRecord = users.find(u => u.telegramChatId === chatId);
    if (partyId && userRecord && userRecord.partyId && userRecord.partyId !== partyId) {
      return res.status(403).json({
        success: false,
        error: 'خطای امنیتی تفکیک حساب: شناسه چت ارسالی متعلق به مشتری دیگری است.',
      });
    }

    let sendResult: any;

    if (photoBase64) {
      // Send photo with caption
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([buffer]), 'document.png');
      if (textContent.length <= 1024) {
        formData.append('caption', textContent);
        formData.append('parse_mode', 'HTML');
      }

      const photoRes = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      sendResult = await photoRes.json();

      // If text didn't fit in caption, send as message
      if (textContent.length > 1024 && sendResult.ok) {
        await telegramApiCall(config.botToken, 'sendMessage', {
          chat_id: chatId,
          text: textContent,
          parse_mode: 'HTML',
        });
      }
    } else {
      sendResult = await telegramApiCall(config.botToken, 'sendMessage', {
        chat_id: chatId,
        text: textContent,
        parse_mode: 'HTML',
      });
    }

    if (sendResult.ok) {
      if (userRecord) {
        userRecord.lastMessageSent = new Date().toISOString();
        saveUsers(users);
      }

      addLog({
        chatId,
        partyName: partyName || userRecord?.partyName,
        type: messageType || 'manual',
        status: 'success',
        message: `${title || 'ارسال موفق'}: پیام با موفقیت به تلگرام تحویل داده شد.`,
      });

      res.json({ success: true, messageId: sendResult.result?.message_id });
    } else {
      addLog({
        chatId,
        partyName: partyName || userRecord?.partyName,
        type: messageType || 'error',
        status: 'failed',
        message: `خطای تلگرام در ارسال پیام: ${sendResult.description || 'ناموفق'}`,
        errorDetails: JSON.stringify(sendResult),
      });

      res.status(400).json({
        success: false,
        error: sendResult.description || 'خطا در ارسال تلگرام',
      });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// 8. GET /api/telegram/logs
app.get('/api/telegram/logs', (req: Request, res: Response) => {
  const logs = loadLogs();
  res.json({ logs });
});

// 9. POST /api/telegram/clear-logs
app.post('/api/telegram/clear-logs', (req: Request, res: Response) => {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// 10. POST /api/telegram/sync-parties (Sync parties from client to backend cache)
app.post('/api/telegram/sync-parties', (req: Request, res: Response) => {
  try {
    const { parties } = req.body;
    if (Array.isArray(parties)) {
      savePartiesCache(parties);
    }
    res.json({ success: true, count: parties?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// ================= VITE / STATIC INTEGRATION =================
async function initServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Accounting Full-Stack Server running on port ${PORT}`);
    startPolling();
  });
}

initServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
