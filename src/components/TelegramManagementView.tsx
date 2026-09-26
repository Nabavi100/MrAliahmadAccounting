import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Send,
  Bot,
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  ShieldCheck,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
  Copy,
  ExternalLink,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
  X,
  Smartphone,
  Hash,
  Phone,
  Link,
  Unlink,
  Check,
  Bell,
  Wallet,
  BookOpen,
  HelpCircle,
  Share2,
} from 'lucide-react';
import {
  fetchTelegramStatus,
  fetchTelegramUsers,
  fetchTelegramLogs,
  saveTelegramConfig,
  sanitizeTelegramBotToken,
  testTelegramBotConnection,
  linkTelegramUserToParty,
  unlinkTelegramUser,
  sendTelegramDirectMessage,
  clearTelegramLogsApi,
  syncPartiesWithBackend,
  TelegramStatusResponse,
  TelegramUser,
  TelegramLog,
  buildInvoiceTelegramText,
  buildReceiveReceiptTelegramText,
  buildPaymentReceiptTelegramText,
  buildStatementTelegramText,
  buildBalanceReminderTelegramText,
  buildAnnouncementTelegramText,
  buildManualTelegramText,
} from '../services/telegramApiService';
import { Party, Invoice, FinancialTransaction } from '../types';
import { formatNumber, getPersianDate } from '../utils/formatters';

interface Props {
  onBackToDashboard?: () => void;
}

export const TelegramManagementView: React.FC<Props> = () => {
  const { parties, updateParty, invoices, transactions, companySettings } = useAccounting();

  // Status & Data State
  const [status, setStatus] = useState<TelegramStatusResponse | null>(null);
  const [pendingUsers, setPendingUsers] = useState<TelegramUser[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<TelegramUser[]>([]);
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pending' | 'connected' | 'send_hub' | 'logs' | 'settings' | 'guide'>('pending');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Direct Connection by Code State
  const [directCode, setDirectCode] = useState('');
  const [directPartyId, setDirectPartyId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Send Hub State
  const [selectedPartyIdForSend, setSelectedPartyIdForSend] = useState<string>('');
  const [sendDocType, setSendDocType] = useState<
    'invoice' | 'receive_receipt' | 'payment_receipt' | 'statement' | 'balance' | 'announcement' | 'manual'
  >('statement');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [announcementTitle, setAnnouncementTitle] = useState('اطلاعیه مهم شرکت بازرگانی');
  const [announcementText, setAnnouncementText] = useState('');
  const [manualText, setManualText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Settings State
  const [newBotToken, setNewBotToken] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [defaultChatIdInput, setDefaultChatIdInput] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; botName?: string; username?: string; error?: string } | null>(null);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Notification Toast
  const [bannerAlert, setBannerAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setBannerAlert({ type, message });
    setTimeout(() => setBannerAlert(null), 5000);
  };

  // Load Data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, usersRes, logsRes] = await Promise.all([
        fetchTelegramStatus(),
        fetchTelegramUsers(),
        fetchTelegramLogs(),
      ]);
      setStatus(statusRes);
      setPendingUsers(usersRes.pending || []);
      setConnectedUsers(usersRes.connected || []);
      setLogs(logsRes || []);

      if (statusRes.defaultChatId) {
        setDefaultChatIdInput(statusRes.defaultChatId);
      }
      if (statusRes.isConfigured && !newBotToken) {
        setNewBotToken('8740100617:AAHDFzQ4DWVhbMk4UWIcQj11IuoaWGsz1-8');
      }
    } catch (e: any) {
      console.error('Error loading telegram data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Sync of parties & load
  useEffect(() => {
    loadAllData();
    syncPartiesWithBackend(parties).catch(console.error);

    // Auto-refresh interval every 12 seconds to catch incoming contacts
    const interval = setInterval(() => {
      fetchTelegramUsers().then(res => {
        setPendingUsers(res.pending || []);
        setConnectedUsers(res.connected || []);
      }).catch(() => {});
      fetchTelegramStatus().then(setStatus).catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Sync parties cache when parties change
  useEffect(() => {
    if (parties.length > 0) {
      syncPartiesWithBackend(parties).catch(console.error);
    }
  }, [parties]);

  // Copy helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Digit normalization for Persian/Arabic numbers
  const normalizeDigitsStr = (str: string): string => {
    if (!str) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let s = String(str).trim();
    for (let i = 0; i < 10; i++) {
      s = s.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
    }
    return s;
  };

  const cleanPhoneStr = (p: string): string => {
    if (!p) return '';
    const norm = normalizeDigitsStr(p).replace(/\D/g, '');
    return norm.slice(-9);
  };

  // Quick Match Helper: find party whose phone matches user's phone
  const findSuggestedPartyForUser = (user: TelegramUser): Party | undefined => {
    if (!user.phoneNumber) return undefined;
    const cleanUserPhone = cleanPhoneStr(user.phoneNumber);
    if (!cleanUserPhone || cleanUserPhone.length < 7) return undefined;

    return parties.find(p => {
      if (!p.phone) return false;
      const cleanPartyPhone = cleanPhoneStr(p.phone);
      return cleanPartyPhone && cleanUserPhone && (cleanPartyPhone === cleanUserPhone || cleanPartyPhone.endsWith(cleanUserPhone) || cleanUserPhone.endsWith(cleanPartyPhone));
    });
  };

  // Connect Telegram User to Party
  const handleConnectUser = async (user: TelegramUser, targetPartyId: string) => {
    const party = parties.find(p => p.id === targetPartyId);
    if (!party) {
      showAlert('error', 'طرف حساب انتخاب شده معتبر نیست.');
      return;
    }

    setIsLinking(true);
    try {
      const res = await linkTelegramUserToParty({
        chatId: user.telegramChatId,
        connectionCode: user.connectionCode,
        phone: user.phoneNumber,
        partyId: party.id,
        partyName: party.name,
      });

      if (res.success) {
        // Update local party record
        updateParty(party.id, {
          telegramChatId: user.telegramChatId,
          telegramUserId: user.telegramUserId,
          telegramUsername: user.username,
          telegramConnectionCode: user.connectionCode,
          telegramLinkedAt: new Date().toISOString(),
        });

        showAlert('success', `کاربر با موفقیت به طرف حساب «${party.name}» متصل شد و پیام تایید ارسال گردید.`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'خطا در اتصال به شخص');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطای شبکه');
    } finally {
      setIsLinking(false);
    }
  };

  // Direct Code or Phone Connect
  const handleDirectCodeConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = normalizeDigitsStr(directCode).trim();
    if (!cleanInput) {
      showAlert('error', 'لطفاً کد اتصال یا شماره موبایل تلگرام شخص را وارد فرمایید.');
      return;
    }
    if (!directPartyId) {
      showAlert('error', 'لطفاً طرف حساب مورد نظر را انتخاب فرمایید.');
      return;
    }

    const party = parties.find(p => p.id === directPartyId);
    if (!party) {
      showAlert('error', 'طرف حساب یافت نشد.');
      return;
    }

    setIsLinking(true);
    try {
      const res = await linkTelegramUserToParty({
        connectionCode: cleanInput.toUpperCase(),
        identifier: cleanInput,
        phone: cleanInput,
        partyId: party.id,
        partyName: party.name,
      });

      if (res.success) {
        updateParty(party.id, {
          telegramChatId: res.user?.telegramChatId,
          telegramUserId: res.user?.telegramUserId,
          telegramUsername: res.user?.username,
          telegramConnectionCode: res.user?.connectionCode || cleanInput.toUpperCase(),
          telegramLinkedAt: new Date().toISOString(),
        });

        showAlert('success', res.message || `کد اتصال تأیید و کاربر تلگرام با موفقیت به پرونده «${party.name}» متصل گردید.`);
        setDirectCode('');
        setDirectPartyId('');
        await loadAllData();
      } else {
        showAlert('error', res.error || 'کد اتصال یا شماره موبایل واردشده نامعتبر است یا کاربری یافت نشد.');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطای شبکه در برقراری ارتباط');
    } finally {
      setIsLinking(false);
    }
  };

  // Disconnect / Unlink User
  const handleUnlink = async (user: TelegramUser) => {
    if (!window.confirm(`آیا از قطع اتصال تلگرام مشتری «${user.partyName || user.firstName}» اطمینان دارید؟`)) {
      return;
    }

    try {
      const res = await unlinkTelegramUser(user.telegramChatId);
      if (res.success) {
        if (user.partyId) {
          updateParty(user.partyId, {
            telegramChatId: undefined,
            telegramUserId: undefined,
            telegramUsername: undefined,
            telegramConnectionCode: undefined,
            telegramLinkedAt: undefined,
          });
        }
        showAlert('info', `اتصال تلگرام «${user.partyName || 'مشتری'}» با موفقیت قطع گردید.`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'خطا در قطع اتصال');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطای شبکه');
    }
  };

  // Test Ping to specific connected user
  const handleSendTestPing = async (user: TelegramUser) => {
    try {
      const party = parties.find(p => p.id === user.partyId);
      const res = await sendTelegramDirectMessage({
        chatId: user.telegramChatId,
        partyId: user.partyId,
        partyName: user.partyName,
        messageType: 'test',
        title: 'پیام آزمایشی ارتباط سیستم',
        textContent: `🧪 <b>پیام آزمایشی از سیستم حسابداری</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 مخاطب: <b>${user.partyName || user.firstName}</b>\n🔑 کد اتصال: <code>${user.connectionCode}</code>\n⏰ زمان تست: ${new Date().toLocaleTimeString('fa-IR')}\n\n✅ اتصال تلگرام شما کاملاً سالم و فعال می‌باشد.`,
      });

      if (res.success) {
        showAlert('success', `پیام آزمایشی با موفقیت به تلگرام ${user.partyName || user.firstName} تحویل شد.`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'ارسال پیام آزمایشی ناموفق بود.');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطای شبکه');
    }
  };

  // Selected party for send hub
  const activePartyForSend = useMemo(() => {
    return parties.find(p => p.id === selectedPartyIdForSend);
  }, [parties, selectedPartyIdForSend]);

  const activeConnectedUserForSend = useMemo(() => {
    if (!activePartyForSend) return undefined;
    return connectedUsers.find(u => u.partyId === activePartyForSend.id || (activePartyForSend.telegramChatId && u.telegramChatId === activePartyForSend.telegramChatId));
  }, [connectedUsers, activePartyForSend]);

  // Available invoices for the selected party
  const partyInvoices = useMemo(() => {
    if (!selectedPartyIdForSend) return [];
    return invoices
      .filter(inv => inv.partyId === selectedPartyIdForSend || inv.partyName === activePartyForSend?.name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, selectedPartyIdForSend, activePartyForSend]);

  // Available transactions for the selected party
  const partyTransactions = useMemo(() => {
    if (!selectedPartyIdForSend) return [];
    return transactions
      .filter(tx => tx.partyId === selectedPartyIdForSend || tx.partyName === activePartyForSend?.name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, selectedPartyIdForSend, activePartyForSend]);

  // Dynamic preview text of the message being built
  const previewText = useMemo(() => {
    if (!activePartyForSend) {
      return 'لطفاً ابتدا یک طرف حساب متصل را از فهرست بالا انتخاب نمایید.';
    }

    switch (sendDocType) {
      case 'invoice': {
        const inv = partyInvoices.find(i => i.id === selectedInvoiceId) || partyInvoices[0];
        if (!inv) return 'هیچ فاکتوری برای این طرف حساب ثبت نشده است.';
        return buildInvoiceTelegramText(inv, activePartyForSend, companySettings);
      }
      case 'receive_receipt': {
        const receipts = partyTransactions.filter(t => t.type === 'receive_payment');
        const tx = receipts.find(t => t.id === selectedTransactionId) || receipts[0];
        if (!tx) return 'هیچ سند دریافتی برای این مشتری ثبت نشده است.';
        return buildReceiveReceiptTelegramText(tx, activePartyForSend, companySettings);
      }
      case 'payment_receipt': {
        const payments = partyTransactions.filter(t => t.type === 'make_payment');
        const tx = payments.find(t => t.id === selectedTransactionId) || payments[0];
        if (!tx) return 'هیچ سند پرداختی برای این شخص ثبت نشده است.';
        return buildPaymentReceiptTelegramText(tx, activePartyForSend, companySettings);
      }
      case 'statement': {
        return buildStatementTelegramText(activePartyForSend, partyInvoices, companySettings);
      }
      case 'balance': {
        return buildBalanceReminderTelegramText(activePartyForSend, companySettings);
      }
      case 'announcement': {
        return buildAnnouncementTelegramText(announcementTitle, announcementText || 'متن اطلاعیه رسمی شرکت...', companySettings);
      }
      case 'manual': {
        return buildManualTelegramText(manualText || 'متن پیام مدیر...', activePartyForSend, companySettings);
      }
      default:
        return '';
    }
  }, [
    activePartyForSend,
    sendDocType,
    selectedInvoiceId,
    selectedTransactionId,
    partyInvoices,
    partyTransactions,
    announcementTitle,
    announcementText,
    manualText,
    companySettings,
  ]);

  // Send Document from Hub
  const handleSendFromHub = async () => {
    if (!activePartyForSend || !activeConnectedUserForSend) {
      showAlert('error', 'طرف حساب انتخاب‌شده به تلگرام متصل نیست یا شناسه چت ندارد.');
      return;
    }

    const chatId = activeConnectedUserForSend.telegramChatId;
    if (!chatId) {
      showAlert('error', 'شناسه چت تلگرام برای این مشتری یافت نشد.');
      return;
    }

    setIsSendingMessage(true);
    try {
      const titlesMap = {
        invoice: 'فاکتور فروش',
        receive_receipt: 'قبض دریافت وجه',
        payment_receipt: 'سند پرداخت وجه',
        statement: 'صورتحساب رسمی',
        balance: 'اعلان مانده حساب',
        announcement: announcementTitle || 'اطلاعیه رسمی',
        manual: 'پیام مدیریت',
      };

      const res = await sendTelegramDirectMessage({
        chatId,
        partyId: activePartyForSend.id,
        partyName: activePartyForSend.name,
        messageType: sendDocType,
        title: titlesMap[sendDocType],
        textContent: previewText,
      });

      if (res.success) {
        showAlert('success', `«${titlesMap[sendDocType]}» با موفقیت به تلگرام ${activePartyForSend.name} ارسال شد.`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'ارسال با خطا مواجه شد.');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطای شبکه در ارسال');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Save Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const cleanToken = newBotToken ? sanitizeTelegramBotToken(newBotToken) : undefined;
      const cleanChatId = normalizeDigitsStr(defaultChatIdInput).trim();
      const res = await saveTelegramConfig({
        botToken: cleanToken,
        defaultChatId: cleanChatId,
        autoPolling: true,
      });

      if (res.success) {
        const botDesc = res.botFirstName || res.botUsername ? ` (ربات: ${res.botFirstName || ''} @${res.botUsername || ''})` : '';
        showAlert('success', `تنظیمات ربات تلگرام با موفقیت در سرور ذخیره و فعال شد.${botDesc}`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'خطا در اعتبارسنجی یا ذخیره توکن ربات');
      }
    } catch (e: any) {
      showAlert('error', e?.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test Connection in Settings
  const handleTestToken = async () => {
    setIsTestingToken(true);
    setTestResult(null);
    try {
      const res = await testTelegramBotConnection(newBotToken ? newBotToken.trim() : undefined);
      setTestResult(res);
      if (res.success) {
        showAlert('success', `اتصال با موفقیت برقرار شد: ${res.botName} (@${res.username})`);
        await loadAllData();
      } else {
        showAlert('error', res.error || 'اتصال برقرار نشد.');
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message });
      showAlert('error', e?.message || 'خطای شبکه');
    } finally {
      setIsTestingToken(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm('آیا از پاک کردن تمامی لاگ‌های ثبت‌شده تلگرام اطمینان دارید؟')) return;
    const ok = await clearTelegramLogsApi();
    if (ok) {
      setLogs([]);
      showAlert('info', 'تمامی لاگ‌ها پاک شدند.');
    }
  };

  // Filtered Users Lists
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingUsers;
    const q = searchQuery.trim().toLowerCase();
    return pendingUsers.filter(u =>
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.connectionCode && u.connectionCode.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  }, [pendingUsers, searchQuery]);

  const filteredConnected = useMemo(() => {
    if (!searchQuery.trim()) return connectedUsers;
    const q = searchQuery.trim().toLowerCase();
    return connectedUsers.filter(u =>
      (u.partyName && u.partyName.toLowerCase().includes(q)) ||
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.connectionCode && u.connectionCode.toLowerCase().includes(q)) ||
      (u.telegramChatId && u.telegramChatId.includes(q))
    );
  }, [connectedUsers, searchQuery]);

  // Smart live lookup for direct code / phone input
  const matchedPendingUser = useMemo(() => {
    if (!directCode.trim()) return null;
    const raw = normalizeDigitsStr(directCode).trim();
    const upper = raw.toUpperCase();
    const cleanCode = upper.replace(/^AC-/, '').replace(/[^A-Z0-9]/g, '');
    const cleanPhone = cleanPhoneStr(raw);

    return pendingUsers.find(u => {
      if (u.connectionCode) {
        const uCode = u.connectionCode.toUpperCase();
        const uClean = uCode.replace(/^AC-/, '').replace(/[^A-Z0-9]/g, '');
        if (uCode === upper || (cleanCode.length >= 4 && (uClean === cleanCode || uClean === upper || uCode === `AC-${cleanCode}`))) {
          return true;
        }
      }
      if (cleanPhone && cleanPhone.length >= 7 && u.phoneNumber) {
        const uPhone = cleanPhoneStr(u.phoneNumber);
        if (uPhone && (uPhone === cleanPhone || uPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uPhone))) {
          return true;
        }
      }
      if (u.telegramChatId === raw || u.telegramUserId === raw) return true;
      if (u.username && u.username.replace(/^@/, '').toLowerCase() === raw.replace(/^@/, '').toLowerCase()) return true;
      return false;
    });
  }, [directCode, pendingUsers]);

  // Auto-select suggested party if directCode matched a pending user
  useEffect(() => {
    if (matchedPendingUser) {
      const suggested = findSuggestedPartyForUser(matchedPendingUser);
      if (suggested && !directPartyId) {
        setDirectPartyId(suggested.id);
      }
    }
  }, [matchedPendingUser]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => l.status === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Banner Alert Toast */}
      {bannerAlert && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
            bannerAlert.type === 'success'
              ? 'bg-emerald-600 text-white'
              : bannerAlert.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : bannerAlert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerAlert(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-[#229ED9] text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
            <Send className="w-6 h-6 -rotate-45" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                مدیریت تلگرام و ارتباط مستقیم با مشتریان
              </h1>
              {status?.isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>ربات فعال: @{status.botUsername || 'ربات رسمی'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>توکن تنظیم نشده</span>
                </span>
              )}
              {status?.isPolling && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  <Sparkles className="w-3 h-3 text-sky-600" />
                  <span>شنود آنلاین سرور (Polling)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              دریافت امن شماره تماس مشتریان تلگرام، صدور خودکار کد اتصال یکتا (<code className="font-mono text-sky-700 font-bold">AC-XXXXXX</code>) و ارسال اختصاصی فاکتور، رسید و مانده حساب
            </p>
          </div>
        </div>

        {/* Top Quick Stats & Refresh */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeTab === 'guide'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>آموزش ساخت و اتصال ربات</span>
          </button>

          <button
            type="button"
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            <span>تنظیمات توکن</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'pending'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-300" />
          <span>کاربران جدید و در انتظار اتصال</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {pendingUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('connected')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'connected'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-300" />
          <span>کاربران متصل و فعال</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            activeTab === 'connected' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {connectedUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('send_hub')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'send_hub'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Send className="w-4 h-4 text-sky-300 -rotate-45" />
          <span>میزکار ارسال اطلاعات مالی</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'logs'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>دفتر رویدادها و خطاهای ارسال</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {logs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>تنظیمات امنیتی و سرور</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 ${
            activeTab === 'guide'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-sky-700 border border-sky-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>آموزش ساخت و همگام‌سازی ربات</span>
        </button>
      </div>

      {/* ================= TAB 1: PENDING USERS (کاربران در انتظار اتصال) ================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Direct Code Connection Card */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border border-sky-200 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sky-950 font-black text-sm">
                  <Hash className="w-5 h-5 text-sky-600" />
                  <span>اتصال سریع و هوشمند با «کد اتصال یکتا» یا «شماره موبایل تلگرام»:</span>
                </div>
                <p className="text-xs text-sky-800 leading-relaxed">
                  کد اتصال ربات مشتری (مانند <span className="font-mono font-bold">AC-L2E8CX</span> یا <span className="font-mono font-bold">L2E8CX</span>) یا شماره تلفن تلگرام شخص (مانند <span className="font-mono font-bold">0781781203</span> یا <span className="font-mono font-bold">+93781781203</span>) را وارد کنید و به پرونده مشتری متصل نمایید:
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectCodeConnect} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 sm:max-w-xs">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="کد یکتا (AC-XXXXXX) یا شماره تماس..."
                  value={directCode}
                  onChange={e => setDirectCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl font-mono font-bold text-center text-xs tracking-wider text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none shadow-2xs"
                />
              </div>

              <div className="flex-1 sm:max-w-md">
                <select
                  value={directPartyId}
                  onChange={e => setDirectPartyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl text-xs font-bold text-slate-800 focus:border-sky-500 outline-none shadow-2xs"
                >
                  <option value="">-- انتخاب طرف حساب از دفتر حسابداری --</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(#${p.code})` : ''} - {p.phone || 'بدون شماره'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isLinking || !directCode.trim() || !directPartyId}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              >
                {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                <span>تأیید و اتصال</span>
              </button>
            </form>

            {/* Live Detected Pending User Info */}
            {matchedPendingUser && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fadeIn">
                <div className="flex flex-wrap items-center gap-2 text-emerald-950 font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    کاربر تلگرام شناسایی شد: <span className="font-black text-emerald-800">{matchedPendingUser.firstName} {matchedPendingUser.lastName}</span>
                    {matchedPendingUser.username && <span className="text-[11px] text-sky-700 mr-1.5 font-mono">({matchedPendingUser.username})</span>}
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 font-mono px-2 py-0.5 rounded-lg text-[11px]" dir="ltr">
                    {matchedPendingUser.connectionCode}
                  </span>
                  {matchedPendingUser.phoneNumber && (
                    <span className="text-slate-600 font-mono text-[11px]" dir="ltr">
                      {matchedPendingUser.phoneNumber}
                    </span>
                  )}
                </div>
                {directPartyId && (
                  <span className="text-[11px] text-emerald-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    آماده اتصال به طرف حساب انتخابی
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3.5 py-2 shadow-2xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در کاربران جدید بر اساس نام، شماره تلفن یا کد اتصال..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-800 outline-none bg-transparent font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                پاک کردن
              </button>
            )}
          </div>

          {/* Pending Users List */}
          {filteredPending.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="font-black text-slate-800 text-sm">هیچ کاربر در انتظار اتصالی وجود ندارد</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                هرگاه مشتری در تلگرام دستور <code className="text-sky-600 font-bold">/start</code> را ارسال کند و شماره خود را به اشتراک بگذارد، بلافاصله در این بخش نمایان می‌شود.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPending.map(user => {
                const suggestedParty = findSuggestedPartyForUser(user);

                return (
                  <div
                    key={user.id || user.telegramChatId}
                    className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:border-sky-300 transition space-y-4"
                  >
                    {/* Top Row: User details */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">
                            {user.firstName} {user.lastName}
                          </h4>
                          {user.username && (
                            <span className="text-[11px] text-sky-700 font-mono font-bold" dir="ltr">
                              {user.username}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-bold text-slate-800" dir="ltr">
                            {user.phoneNumber || 'بدون شماره'}
                          </span>
                        </div>
                      </div>

                      {/* Connection Code Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] text-slate-400 font-bold">کد اتصال یکتا:</div>
                        <div className="flex items-center gap-1.5 bg-slate-900 text-amber-400 px-3 py-1 rounded-xl font-mono font-black text-xs shadow-xs">
                          <span>{user.connectionCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(user.connectionCode)}
                            className="p-0.5 hover:text-white transition cursor-pointer"
                            title="کپی کد اتصال"
                          >
                            {copiedCode === user.connectionCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        شناسه تلگرام (Chat ID): <span className="font-mono font-bold text-slate-700" dir="ltr">{user.telegramChatId}</span>
                      </div>
                      <div>•</div>
                      <div>
                        تاریخ ثبت: <span className="text-slate-700 font-medium">{new Date(user.registeredAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                    </div>

                    {/* Smart Suggestion or Match Selector */}
                    {suggestedParty && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>پیشنهاد هوشمند: تطابق کامل با «{suggestedParty.name}»</span>
                          </div>
                          <p className="text-[11px] text-emerald-700">
                            شماره تلفن این اکانت با پرونده «{suggestedParty.name}» یکسان است.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConnectUser(user, suggestedParty.id)}
                          disabled={isLinking}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>اتصال سریع</span>
                        </button>
                      </div>
                    )}

                    {/* Manual Party Selection Connect Form */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        اتصال به طرف حساب دیگر در برنامه:
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          id={`party-select-${user.id}`}
                          defaultValue={suggestedParty?.id || ''}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-sky-500 outline-none transition"
                        >
                          <option value="">-- انتخاب طرف حساب موجود --</option>
                          {parties.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.code ? `(#${p.code})` : ''} - {p.phone || 'بدون شماره'}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const sel = document.getElementById(`party-select-${user.id}`) as HTMLSelectElement;
                            if (sel && sel.value) {
                              handleConnectUser(user, sel.value);
                            } else {
                              showAlert('error', 'لطفاً طرف حساب را انتخاب کنید.');
                            }
                          }}
                          disabled={isLinking}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          <Link className="w-3.5 h-3.5 text-amber-400" />
                          <span>تأیید اتصال</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: CONNECTED USERS (کاربران متصل و فعال) ================= */}
      {activeTab === 'connected' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3.5 py-2 shadow-2xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در مشتریان متصل بر اساس نام، شماره تلفن، کد اتصال، شناسه چت..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-800 outline-none bg-transparent font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
              >
                پاک کردن
              </button>
            )}
          </div>

          {filteredConnected.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-black text-slate-800 text-sm">هیچ کاربر متصلی یافت نشد</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                از تب «کاربران در انتظار اتصال» می‌توانید شماره‌های دریافتی را به طرف حساب‌های سیستم متصل فرمایید.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                    <tr>
                      <th className="py-3 px-4">طرف حساب در حسابداری</th>
                      <th className="py-3 px-4">مشخصات تلگرام</th>
                      <th className="py-3 px-4">شماره تماس تأییدشده</th>
                      <th className="py-3 px-4">کد اتصال یکتا</th>
                      <th className="py-3 px-4">تاریخ اتصال</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredConnected.map(user => {
                      const party = parties.find(p => p.id === user.partyId);

                      return (
                        <tr key={user.id || user.telegramChatId} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{user.partyName || party?.name || 'مشتری ناشناس'}</span>
                              {party?.code && (
                                <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                  #{party.code}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="space-y-0.5">
                              <div>{user.firstName} {user.lastName}</div>
                              {user.username && (
                                <div className="text-[11px] text-sky-700 font-mono" dir="ltr">
                                  {user.username}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                Chat ID: {user.telegramChatId}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800" dir="ltr">
                            {user.phoneNumber || party?.phone || 'ثبت نشده'}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-[11px] border border-slate-200">
                              {user.connectionCode}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-slate-500">
                            {user.linkedAt ? new Date(user.linkedAt).toLocaleDateString('fa-IR') : 'نامشخص'}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>متصل و فعال</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPartyIdForSend(user.partyId || '');
                                  setActiveTab('send_hub');
                                }}
                                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="ارسال اطلاعات مالی و صورت‌حساب"
                              >
                                <Send className="w-3 h-3 -rotate-45" />
                                <span>ارسال اطلاعات</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendTestPing(user)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                title="ارسال پیام آزمایشی"
                              >
                                <span>تست ارتباط</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUnlink(user)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                                title="قطع اتصال تلگرام این مشتری"
                              >
                                <Unlink className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: SEND HUB (میزکار ارسال اطلاعات مالی) ================= */}
      {activeTab === 'send_hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Top Controls (Cols 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-black text-sm text-slate-900">
                <Send className="w-4 h-4 text-sky-600 -rotate-45" />
                <span>تنظیمات پیام و انتخاب سند برای ارسال:</span>
              </div>

              {/* 1. Target Connected Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  مشتری متصل به تلگرام (گیرنده):
                </label>
                <select
                  value={selectedPartyIdForSend}
                  onChange={e => {
                    setSelectedPartyIdForSend(e.target.value);
                    setSelectedInvoiceId('');
                    setSelectedTransactionId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs font-bold text-slate-900 outline-none transition"
                >
                  <option value="">-- لطفاً مشتری متصل را انتخاب فرمایید --</option>
                  {connectedUsers.map(u => (
                    <option key={u.telegramChatId} value={u.partyId}>
                      {u.partyName || u.firstName} - تلفن: {u.phoneNumber} (کد: {u.connectionCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Document Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  نوع محتوا و سند جهت ارسال:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSendDocType('statement')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'statement'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-1 ring-sky-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>صورتحساب جامع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendDocType('invoice')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'invoice'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-1 ring-sky-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>فاکتور فروش</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendDocType('receive_receipt')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'receive_receipt'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>رسید دریافت وجه</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendDocType('payment_receipt')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'payment_receipt'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-black ring-1 ring-amber-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>رسید پرداخت وجه</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendDocType('balance')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'balance'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-black ring-1 ring-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>اعلان مانده حساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendDocType('announcement')}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                      sendDocType === 'announcement'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 font-black ring-1 ring-purple-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>اطلاعیه رسمی</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSendDocType('manual')}
                  className={`w-full mt-1.5 p-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                    sendDocType === 'manual'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>✍️ ارسال پیام متنی دستی دلخواه مدیر</span>
                </button>
              </div>

              {/* Dynamic sub-selectors based on chosen doc type */}
              {sendDocType === 'invoice' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">انتخاب فاکتور مورد نظر:</label>
                  {partyInvoices.length === 0 ? (
                    <p className="text-xs text-rose-600">هیچ فاکتوری برای این شخص ثبت نشده است.</p>
                  ) : (
                    <select
                      value={selectedInvoiceId || partyInvoices[0]?.id}
                      onChange={e => setSelectedInvoiceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    >
                      {partyInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          فاکتور #{inv.invoiceNumber} - تاریخ: {inv.date} - مبلغ: {formatNumber(inv.totalAmount)} {inv.currency}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {sendDocType === 'receive_receipt' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">انتخاب سند دریافتی:</label>
                  {partyTransactions.filter(t => t.type === 'receive_payment').length === 0 ? (
                    <p className="text-xs text-rose-600">هیچ سند دریافتی برای این شخص ثبت نشده است.</p>
                  ) : (
                    <select
                      value={selectedTransactionId}
                      onChange={e => setSelectedTransactionId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="">-- آخرین سند دریافتی (پیش‌فرض) --</option>
                      {partyTransactions
                        .filter(t => t.type === 'receive_payment')
                        .map(tx => (
                          <option key={tx.id} value={tx.id}>
                            رسید #{tx.transactionNumber} - تاریخ: {tx.date} - مبلغ: {formatNumber(tx.amount)} {tx.currency}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {sendDocType === 'payment_receipt' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">انتخاب سند پرداختی:</label>
                  {partyTransactions.filter(t => t.type === 'make_payment').length === 0 ? (
                    <p className="text-xs text-rose-600">هیچ سند پرداختی برای این شخص ثبت نشده است.</p>
                  ) : (
                    <select
                      value={selectedTransactionId}
                      onChange={e => setSelectedTransactionId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="">-- آخرین سند پرداختی (پیش‌فرض) --</option>
                      {partyTransactions
                        .filter(t => t.type === 'make_payment')
                        .map(tx => (
                          <option key={tx.id} value={tx.id}>
                            سند #{tx.transactionNumber} - تاریخ: {tx.date} - مبلغ: {formatNumber(tx.amount)} {tx.currency}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {sendDocType === 'announcement' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">عنوان اطلاعیه:</label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={e => setAnnouncementTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">متن کامل اطلاعیه:</label>
                    <textarea
                      rows={3}
                      value={announcementText}
                      onChange={e => setAnnouncementText(e.target.value)}
                      placeholder="متن اطلاعیه جهت ارسال به مشتری..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {sendDocType === 'manual' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">متن اختصاصی مدیر:</label>
                  <textarea
                    rows={4}
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    placeholder="پیام مستقیم شما به مشتری..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none resize-none"
                  />
                </div>
              )}

              {/* Main Submit Button */}
              <button
                type="button"
                onClick={handleSendFromHub}
                disabled={isSendingMessage || !activePartyForSend || !activeConnectedUserForSend}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-black rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
              >
                {isSendingMessage ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 -rotate-45" />
                )}
                <span>ارسال مستقیم و اختصاصی به تلگرام این مشتری</span>
              </button>
            </div>
          </div>

          {/* Right / Live Preview (Cols 7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg text-slate-100 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-xs text-sky-400">
                  <Eye className="w-4 h-4" />
                  <span>پیش‌نمایش زنده پیام ارسالی در تلگرام:</span>
                </div>
                {activeConnectedUserForSend && (
                  <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                    Chat ID: {activeConnectedUserForSend.telegramChatId}
                  </span>
                )}
              </div>

              {/* Telegram Phone Simulator Bubble */}
              <div className="bg-[#182533] border border-[#243547] rounded-2xl p-4 shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="bg-[#2b5278] text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed space-y-2 max-w-lg shadow-sm whitespace-pre-line font-sans" dir="rtl">
                  <div dangerouslySetInnerHTML={{ __html: previewText }} />
                </div>
                <div className="text-[10px] text-slate-400 text-left pt-1 font-mono">
                  {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  این پیام با شناسه اختصاصی تلگرام (<code className="font-mono text-white">Chat ID</code>) فقط به اکانت شخص مربوطه تحویل داده خواهد شد.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: AUDIT LOGS & ERRORS ================= */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>دفتر ثبت وقایع، ارسال‌ها و خطاهای تلگرام</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    logFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  همه ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('success')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    logFilter === 'success' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  موفق ({logs.filter(l => l.status === 'success').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('failed')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    logFilter === 'failed' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  خطاها ({logs.filter(l => l.status === 'failed').length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                پاک کردن لاگ‌ها
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">هیچ رویدادی در این فیلتر ثبت نشده است.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map(log => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{log.message}</span>
                        {log.partyName && (
                          <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {log.partyName}
                          </span>
                        )}
                      </div>
                      {log.errorDetails && (
                        <p className="text-[11px] font-mono text-rose-700 bg-rose-50 p-1.5 rounded-lg">
                          {log.errorDetails}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono shrink-0 text-left" dir="ltr">
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: BOT CONFIG & BACKEND SECURITY ================= */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Settings Form Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-black text-sm text-slate-900">
              <Key className="w-4 h-4 text-amber-500" />
              <span>تنظیم توکن محرمانه ربات تلگرام در Backend:</span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  توکن ربات تلگرام (Bot Token):
                </label>
                <div className="relative">
                  <input
                    type={showBotToken ? 'text' : 'password'}
                    dir="ltr"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    value={newBotToken}
                    onChange={e => setNewBotToken(e.target.value)}
                    className="w-full pl-24 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs font-mono text-slate-900 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestToken}
                    disabled={isTestingToken}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10.5px] font-bold cursor-pointer transition flex items-center gap-1"
                  >
                    {isTestingToken ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                    <span>تست توکن</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  توکن در سرور امن Express ذخیره می‌گردد و هرگز در فرانت‌اند یا کد قابل مشاهده کاربر قرار نمی‌گیرد.
                </p>
              </div>

              {/* Test Result Indicator */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold space-y-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">
                      {testResult.success
                        ? `اتصال موفق بود! نام ربات: ${testResult.botName} (@${testResult.username})`
                        : `${testResult.error}`}
                    </span>
                  </div>

                  {!testResult.success && (
                    <div className="text-[11px] font-normal bg-white/70 p-2.5 rounded-xl border border-rose-200/80 text-rose-950 space-y-1">
                      <p className="font-bold text-rose-800">💡 راه‌حل‌های رفع خطای ارتباط:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>مطمئن شوید فیلترشکن شما متصل و پایدار است.</li>
                        <li>کل توکن را از BotFather بدون کم و زیاد کپی کنید (فرمت نمونه: <code className="font-mono" dir="ltr">7123456789:AAHq_Abc...</code>).</li>
                        <li>در صورت عدم برقراری اتصال با سرور داخلی، سیستم به صورت هوشمند از اتصال مستقیم مرورگر شما نیز پشتیبانی می‌کند.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  شناسه چت تلگرام مدیر (جهت دریافت رونوشت پیام‌ها - اختیاری):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="987654321"
                  value={defaultChatIdInput}
                  onChange={e => setDefaultChatIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs font-mono text-slate-900 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingConfig}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
                <span>ذخیره امن تنظیمات در Backend</span>
              </button>
            </form>
          </div>

          {/* Security & Principles Explanations */}
          <div className="bg-sky-50 border border-sky-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sky-950 font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
              <span>اصول امنیتی، تفکیک اطلاعات و حفظ حریم خصوصی:</span>
            </div>

            <ul className="text-xs text-sky-950 space-y-2.5 leading-relaxed list-disc list-inside">
              <li>
                <strong>محرمانگی Bot Token:</strong> توکن ربات صرفاً در لایه Express Backend نگهداری شده و هرگز به سمت کلاینت ارسال نمی‌گردد.
              </li>
              <li>
                <strong>کد اتصال یکتای ۶ رقمی (AC-XXXXXX):</strong> به هر کاربر یک کد انحصاری تعلق می‌گیرد تا ارتباط صرفاً با تأیید مدیر برقرار شود.
              </li>
              <li>
                <strong>تفکیک مطلق حساب‌ها (Customer Isolation):</strong> ارسال پیام‌ها و استعلام‌ها منحصراً بر اساس <code className="font-mono text-sky-900 font-bold">Chat ID</code> متصل به پرونده همان مشتری انجام می‌پذیرد و هیچ کاربری به حساب دیگری دسترسی ندارد.
              </li>
              <li>
                <strong>ثبت جامع لاگ و خطاها:</strong> تمام رویدادها، خطاهای احتمالی تلگرام و ارسال‌ها با تاریخ و ساعت دقیق ثبت می‌شوند.
              </li>
              <li>
                <strong>قابلیت قطع اتصال فوری:</strong> مدیر در هر لحظه می‌تواند اتصال هر اکانت تلگرام را با ۱ کلیک قطع نماید.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ================= TAB 6: COMPREHENSIVE BOT CREATION & SYNC GUIDE ================= */}
      {activeTab === 'guide' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Banner: Quick Bot Link & Share Box */}
          <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                    <Share2 className="w-5 h-5 text-sky-200" />
                  </span>
                  <h2 className="text-base font-black">لینک و آیدی ربات شما جهت ارسال به مشتریان:</h2>
                </div>
                <p className="text-xs text-sky-100 max-w-xl leading-relaxed">
                  این متن آماده و لینک را کپی کرده و در گروه، کانال یا چت شخصی مشتریان بفرستید تا با ۱ کلیک روی «شروع»، شماره تلفن خود را تأیید کرده و متصل شوند.
                </p>
              </div>

              {status?.botUsername ? (
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="text-center sm:text-right px-2">
                    <span className="text-[10px] text-sky-200 block">آدرس رسمی ربات:</span>
                    <span className="font-mono font-black text-sm text-white" dir="ltr">
                      https://t.me/{status.botUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `سلام و احترام،\nجهت دریافت الکترونیکی صورت‌حساب، فاکتورها و مانده حساب خود در شرکت تجارتی برادران نبوی، لطفاً وارد ربات رسمی تلگرام ما شوید و دکمه Start را لمس کنید:\n👉 https://t.me/${status.botUsername}\nسپس دکمه «اشتراک‌گذاری شماره تماس» را بزنید تا حسابتان متصل گردد.`;
                      navigator.clipboard.writeText(shareText);
                      showAlert('success', 'متن دعوت و لینک ربات تلگرام در کلیپ‌بورد کپی شد!');
                    }}
                    className="px-4 py-2.5 bg-white text-sky-700 hover:bg-sky-50 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>کپی پیام دعوت مشتریان</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>ابتدا توکن ربات را در تب تنظیمات ثبت کنید</span>
                </button>
              )}
            </div>
          </div>

          {/* Step by Step Visual Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm">
                ۱
              </div>
              <h3 className="text-sm font-black text-slate-900">مرحله ۱: ایجاد ربات در BotFather</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                در برنامه تلگرام به آیدی رسمی <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 font-bold underline font-mono">@BotFather</a> بروید.
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-700 font-medium">
                <div>۱. دستور <code className="bg-slate-200 px-1 rounded font-mono font-bold text-sky-700">/newbot</code> را بفرستید.</div>
                <div>۲. نام نمایشی ربات را وارد کنید (مثلاً: <code>حسابداری برادران نبوی</code>).</div>
                <div>۳. آیدی انگلیسی که آخر آن <code>bot</code> باشد انتخاب کنید (مثلاً: <code>NabaviAcc_bot</code>).</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                ۲
              </div>
              <h3 className="text-sm font-black text-slate-900">مرحله ۲: کپی توکن و ثبت در سیستم</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                پات‌فادر یک متن طولانی تحت عنوان <span className="font-mono font-bold text-indigo-600">API Token</span> به شما می‌دهد (شبیه: <code>7123456789:AAH...</code>).
              </p>
              <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2 text-xs text-indigo-950 font-medium">
                <div>• کل این توکن را کپی کنید.</div>
                <div>• به تب <strong>«تنظیمات امنیتی و سرور»</strong> همین صفحه بروید.</div>
                <div>• توکن را الصاق (Paste) کرده، دکمه <strong>«تست توکن»</strong> و سپس <strong>«ذخیره امن تنظیمات»</strong> را بزنید.</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                ۳
              </div>
              <h3 className="text-sm font-black text-slate-900">مرحله ۳: ارسال لینک به مشتری و /start</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                لینک ربات (مثلاً <span className="font-mono font-bold text-emerald-600">t.me/YourBot</span>) را برای مشتری ارسال کنید.
              </p>
              <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 space-y-2 text-xs text-emerald-950 font-medium">
                <div>• مشتری روی دکمه <strong>Start / شروع</strong> می‌زند.</div>
                <div>• ربات به صورت محترمانه پیام خوش‌آمد و دکمه بزرگ <strong>«📱 اشتراک‌گذاری شماره تماس»</strong> را نشان می‌دهد.</div>
                <div>• با لمس آن، شماره تلگرام مشتری با امنیت کامل به سرور برنامه منتقل می‌گردد.</div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                ۴
              </div>
              <h3 className="text-sm font-black text-slate-900">مرحله ۴: ذخیره و اتصال خودکار</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                سیستم شماره را ذخیره کرده و به طور هوشمند پرونده مالی مشتری را شناسایی می‌کند.
              </p>
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 space-y-2 text-xs text-amber-950 font-medium">
                <div>• مشخصات کاربر در تب <strong>«کاربران در انتظار اتصال»</strong> می‌آید.</div>
                <div>• با ۱ کلیک دکمه <strong>«تأیید و اتصال»</strong> را بزنید.</div>
                <div>• از این پس در زمان ثبت فاکتور یا سند، با زدن دکمه تلگرام، گزارش مستقیماً و اختصاصی برای خود مشتری ارسال می‌شود!</div>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Preview: How the Customer Sees It */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-black text-slate-900">
                  شبیه‌ساز رفتار ربات: تجربه مشتری هنگام کلیک روی لینک ربات و استارت
                </h3>
              </div>
              <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-bold">
                هوشمند و اتوماتیک
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Telegram App Interface Simulator */}
              <div className="bg-[#0e1621] rounded-3xl p-4 border border-slate-800 shadow-xl max-w-md mx-auto w-full space-y-3 font-sans">
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white px-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-xs text-white">
                      🤖
                    </div>
                    <div>
                      <div className="text-xs font-bold">{status?.botFirstName || 'ربات رسمی شرکت برادران نبوی'}</div>
                      <div className="text-[10px] text-sky-400">bot • همیشه آنلاین</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">امروز</span>
                </div>

                {/* Simulated Chat Messages */}
                <div className="space-y-3 py-2">
                  {/* User sent start */}
                  <div className="flex justify-end">
                    <div className="bg-[#2b5278] text-white px-3.5 py-1.5 rounded-2xl rounded-tr-none text-xs font-mono shadow-xs">
                      /start
                    </div>
                  </div>

                  {/* Bot reply welcome */}
                  <div className="flex justify-start">
                    <div className="bg-[#182533] text-slate-200 p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed space-y-2 border border-slate-800/80 shadow-xs max-w-[85%]" dir="rtl">
                      <p className="font-bold text-sky-300">🌸 سلام و عرض احترام، به ربات هوشمند حسابداری «شرکت تجارتی برادران نبوی» خوش آمدید!</p>
                      <p className="text-[11px] text-slate-300">
                        جهت صیانت از حریم خصوصی، این ربات طوری طراحی شده است که فقط اطلاعات و فاکتورهای حساب خودتان را نمایش می‌دهد.
                      </p>
                      <p className="text-[11px] text-amber-200 font-bold">
                        👇 لطفاً جهت شروع، دکمه بزرگ زیر را لمس کرده و شماره تماس تلگرام خود را به اشتراک بگذارید:
                      </p>
                    </div>
                  </div>

                  {/* Telegram Special Big Keyboard Button */}
                  <div className="pt-2">
                    <div className="bg-sky-600 hover:bg-sky-500 text-white font-black text-center py-3 px-4 rounded-2xl text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer transition">
                      <Smartphone className="w-4 h-4 animate-bounce" />
                      <span>📱 اشتراک‌گذاری شماره تماس (لمس کنید)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 text-center block mt-1.5">
                      (با زدن این دکمه رسمی تلگرام، شماره بدون نیاز به تایپ به سیستم فرستاده می‌شود)
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanatory side points */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>چرا این روش بهترین و امن‌ترین متد ارتباط با مشتری است؟</span>
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                    <li>
                      <strong>بدون امکان تقلب یا شماره اشتباه:</strong> تلگرام شماره رسمی تأییدشده خط مشتری را ارسال می‌کند و مشتری نمی‌تواند شماره شخص دیگری را تایپ کند.
                    </li>
                    <li>
                      <strong>تولید آنی کد اتصال ۶ رقمی:</strong> به محض ارسال شماره، کد اتصال اختصاصی (مانند <code className="font-mono text-sky-700 font-bold">AC-9K42X1</code>) به مشتری نشان داده می‌شود.
                    </li>
                    <li>
                      <strong>تفکیک مطلق حریم خصوصی:</strong> هنگام چاپ و صدور فاکتور در برنامه، دکمه تلگرام دقیقاً به چت همان مشتری گزارش می‌فرستد نه به کس دیگر.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>پاسخ به سوال: «چرا توکن را وارد می‌کردم خطا می‌داد؟»</span>
                  </h4>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    توکن تلگرام شامل یک رشته حدود ۴۵ کاراکتری است (ترکیب اعداد و حروف انگلیسی). خطا معمولاً به یکی از دلایل زیر رخ می‌دهد:
                  </p>
                  <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                    <li>کپی ناقص توکن از BotFather (نباید هیچ کاراکتری از اول یا آخر جا بماند).</li>
                    <li>وجود فاصله (Space) اضافه در ابتدا یا انتهای توکن (سیستم جدید ما این فاصله‌ها را خودکار حذف و اصلاح می‌کند).</li>
                    <li>غیرفعال بودن یا حذف شدن ربات در تلگرام.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
