import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { NavTab } from './Sidebar';
import { Party, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
// Cardex drill-downs are only needed after the user picks a search result,
// so they are code-split to keep the palette itself instantly available.
const PartyCardexModal = React.lazy(() =>
  import('./PartyCardexModal').then(m => ({ default: m.PartyCardexModal }))
);
const ProductCardexModal = React.lazy(() =>
  import('./ProductCardexModal').then(m => ({ default: m.ProductCardexModal }))
);
import {
  Search,
  LayoutDashboard,
  BookOpen,
  FolderTree,
  ShoppingCart,
  Receipt,
  Wallet,
  Users,
  Warehouse,
  Package,
  Coins,
  TrendingUp,
  Landmark,
  PieChart,
  ScrollText,
  Send,
  Plus,
  ArrowLeftRight,
  RefreshCcw,
  Banknote,
  HandCoins,
  ShieldCheck,
  CloudUpload,
  Keyboard,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
  Clock,
  Boxes,
  FileSpreadsheet,
  Truck,
} from 'lucide-react';

/* ------------------------------------------------------------------------- */
/* Persian-aware text normalisation & fuzzy matching                          */
/* ------------------------------------------------------------------------- */

const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Normalises Persian/Arabic text so that searches match regardless of
 * keyboard layout, Arabic vs Persian letter shapes, ZWNJ or digit style.
 */
export const normalizeSearchText = (input: string): string => {
  if (!input) return '';
  return input
    .toString()
    .replace(/[۰-۹٠-٩]/g, ch => DIGIT_MAP[ch] ?? ch)
    .replace(/[يیۍ]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ةه]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ؤو]/g, 'و')
    .replace(/[\u064B-\u0652\u200c\u200f\u200e\u0640]/g, '') // diacritics, ZWNJ, tatweel
    .replace(/[^\p{L}\p{N}\s./-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

/**
 * Scores how well `query` matches `target`. Higher is better, -1 means no match.
 * Numbers are matched too, so invoice numbers and phone numbers are searchable.
 */
const scoreMatch = (query: string, target: string): number => {
  if (!query) return 0;
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(target);
  if (!q || !t) return -1;
  if (t === q) return 120;
  if (t.startsWith(q)) return 100 - Math.min(t.length - q.length, 30);
  const wordStart = new RegExp(`(^|[\\s./-])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (wordStart.test(t)) return 80;
  const idx = t.indexOf(q);
  if (idx >= 0) return 60 - Math.min(idx, 25);
  // Fallback: every character of the query appears in order (typo tolerant)
  let ti = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    ti = found + 1;
  }
  return 25;
};

/* ------------------------------------------------------------------------- */
/* Search domain model                                                        */
/* ------------------------------------------------------------------------- */

type ResultKind = 'action' | 'page' | 'party' | 'product' | 'invoice';

interface PaletteResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  meta?: string;
  keywords?: string;
  icon: React.ReactNode;
  /** Higher priority groups appear first when the query is empty. */
  groupLabel: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab, subFilter?: string) => void;
  onOpenNewInvoice: (type: 'buy' | 'sell' | 'return_buy' | 'return_sell') => void;
  onOpenPaymentModal: (
    type: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange'
  ) => void;
  onOpenTransferModal: () => void;
  onOpenAccessModal: (tab?: 'roles' | 'reset' | 'backup' | 'company' | 'telegram') => void;
  onViewInvoice: (id: string) => void;
  onShowShortcuts: () => void;
}

const RECENT_KEY = 'hesabdar_cmd_recent_v1';

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewInvoice,
  onOpenPaymentModal,
  onOpenTransferModal,
  onOpenAccessModal,
  onViewInvoice,
  onShowShortcuts,
}) => {
  const { parties, products, invoices, stocks, companySettings } = useAccounting();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rememberRecent = useCallback((id: string) => {
    setRecentIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — recents are a nicety only */
      }
      return next;
    });
  }, []);

  /* ----------------------------- Actions ----------------------------- */
  const actions: PaletteResult[] = useMemo(
    () => [
      {
        id: 'act-new-sale',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'صدور فاکتور فروش جدید',
        subtitle: 'ثبت فروش نقدی یا قرضی به مشتری',
        keywords: 'new sale invoice faktora forosh فروش فاکتور جدید',
        icon: <Plus className="w-4 h-4" />,
        run: () => onOpenNewInvoice('sell'),
      },
      {
        id: 'act-new-purchase',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'صدور فاکتور خرید جدید',
        subtitle: 'ثبت خرید از تأمین‌کننده',
        keywords: 'new purchase invoice kharid خرید فاکتور جدید',
        icon: <ShoppingCart className="w-4 h-4" />,
        run: () => onOpenNewInvoice('buy'),
      },
      {
        id: 'act-new-receipt',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'ثبت رسید دریافت وجه',
        subtitle: 'دریافت پول از مشتری / طرف حساب',
        keywords: 'receipt daryaft resid رسید دریافت وجه',
        icon: <HandCoins className="w-4 h-4" />,
        run: () => onOpenPaymentModal('receive_payment'),
      },
      {
        id: 'act-new-payment',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'ثبت سند پرداخت وجه',
        subtitle: 'پرداخت پول به تأمین‌کننده / طرف حساب',
        keywords: 'payment pardakht sanad پرداخت سند',
        icon: <Banknote className="w-4 h-4" />,
        run: () => onOpenPaymentModal('make_payment'),
      },
      {
        id: 'act-cash-transfer',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'انتقال وجه بین صندوق‌ها',
        subtitle: 'انتقال بین صندوق افغانی، دالری یا بانک',
        keywords: 'transfer intiqal sandogh انتقال وجه صندوق',
        icon: <ArrowLeftRight className="w-4 h-4" />,
        run: () => onOpenPaymentModal('cash_transfer'),
      },
      {
        id: 'act-currency-exchange',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'تبدیل و تسعیر ارز',
        subtitle: 'خرید و فروش اسعار (دلار، افغانی، یورو …)',
        keywords: 'exchange sarafi currency tabdil saraf صرافی تبدیل ارز اسعار',
        icon: <RefreshCcw className="w-4 h-4" />,
        run: () => onOpenPaymentModal('currency_exchange'),
      },
      {
        id: 'act-stock-transfer',
        kind: 'action',
        groupLabel: 'عملیات سریع',
        title: 'انتقال کالا بین گدام‌ها',
        subtitle: 'جابجایی موجودی از یک گدام به گدام دیگر',
        keywords: 'stock transfer gudam intiqal kala کالا انتقال گدام انبار جابجایی',
        icon: <Truck className="w-4 h-4" />,
        run: () => onOpenTransferModal(),
      },
      {
        id: 'act-users',
        kind: 'action',
        groupLabel: 'مدیریت و تنظیمات',
        title: 'کاربران، نقش‌ها و سطوح دسترسی',
        subtitle: 'مدیریت کاربران سیستم و مجوزها',
        keywords: 'users roles access karbar دسترسی کاربر نقش مدیریت',
        icon: <ShieldCheck className="w-4 h-4" />,
        run: () => onOpenAccessModal('roles'),
      },
      {
        id: 'act-backup',
        kind: 'action',
        groupLabel: 'مدیریت و تنظیمات',
        title: 'پشتیبان‌گیری و بازیابی اطلاعات',
        subtitle: 'بکاپ ابری گوگل درایو و فایل پشتیبان',
        keywords: 'backup restore google drive pashtibani بکاپ پشتیبان گوگل درایو بازیابی',
        icon: <CloudUpload className="w-4 h-4" />,
        run: () => onOpenAccessModal('backup'),
      },
      {
        id: 'act-company',
        kind: 'action',
        groupLabel: 'مدیریت و تنظیمات',
        title: 'تنظیمات شرکت، لوگو و مهر',
        subtitle: 'مشخصات شرکت، مهر، امضا و پاورقی فاکتور',
        keywords: 'company settings logo mohr emza شرکت تنظیمات لوگو مهر امضا',
        icon: <Landmark className="w-4 h-4" />,
        run: () => onOpenAccessModal('company'),
      },
      {
        id: 'act-telegram',
        kind: 'action',
        groupLabel: 'مدیریت و تنظیمات',
        title: 'مدیریت تلگرام و ربات مشتریان',
        subtitle: 'اتصال ربات، ارسال فاکتور و استعلام حساب',
        keywords: 'telegram bot robot تلگرام ربات',
        icon: <Send className="w-4 h-4" />,
        run: () => onOpenAccessModal('telegram'),
      },
      {
        id: 'act-shortcuts',
        kind: 'action',
        groupLabel: 'مدیریت و تنظیمات',
        title: 'راهنمای میان‌بُرهای کیبورد',
        subtitle: 'فهرست کامل کلیدهای میان‌بُر برنامه',
        keywords: 'shortcuts keyboard keys hottkey میانبر کیبورد کلید راهنما',
        icon: <Keyboard className="w-4 h-4" />,
        run: onShowShortcuts,
      },
    ],
    [onOpenNewInvoice, onOpenPaymentModal, onOpenAccessModal, onOpenTransferModal, onShowShortcuts]
  );

  /* ------------------------------ Pages ------------------------------ */
  const pages: PaletteResult[] = useMemo(() => {
    const go = (tab: NavTab, filter = 'all') => () => onNavigate(tab, filter);
    return [
      { id: 'pg-dashboard', kind: 'page', groupLabel: 'صفحات', title: 'داشبورد مدیریتی', subtitle: 'نمای کلی مالی، سود و زیان و هشدارها', keywords: 'dashboard asosi داشبورد خانه اصلی', icon: <LayoutDashboard className="w-4 h-4" />, run: go('dashboard') },
      { id: 'pg-journal', kind: 'page', groupLabel: 'صفحات', title: 'روزنامچه جامع رویدادها', subtitle: 'تمام تراکنش‌ها و گردش گدام در یک نگاه', keywords: 'journal roznamcha روزنامچه رویداد', icon: <BookOpen className="w-4 h-4" />, run: go('journal') },
      { id: 'pg-trade', kind: 'page', groupLabel: 'صفحات', title: 'مرکز عملیات تجارتی', subtitle: 'خرید، فروش، برگشت از خرید و برگشت از فروش', keywords: 'trade hub invoices forosh kharid معاملات فاکتورها خرید فروش', icon: <ShoppingCart className="w-4 h-4" />, run: go('trade_hub') },
      { id: 'pg-receipts', kind: 'page', groupLabel: 'صفحات', title: 'لیست دریافتی‌ها', subtitle: 'رسیدهای دریافت وجه', keywords: 'receipts daryaftiha دریافت رسید لیست', icon: <HandCoins className="w-4 h-4" />, run: go('receipts_list') },
      { id: 'pg-payments', kind: 'page', groupLabel: 'صفحات', title: 'لیست پرداختی‌ها', subtitle: 'اسناد پرداخت وجه', keywords: 'payments pardakhtiha پرداخت لیست اسناد', icon: <Banknote className="w-4 h-4" />, run: go('payments_list') },
      { id: 'pg-parties', kind: 'page', groupLabel: 'صفحات', title: 'طرف حساب‌ها، مشتریان و تأمین‌کنندگان', subtitle: 'طلبات، بدهیات و کارت حساب اشخاص', keywords: 'customers parties moshtari taref hesab مشتریان طرف حساب طلبات بدهیات', icon: <Users className="w-4 h-4" />, run: go('customers') },
      { id: 'pg-products', kind: 'page', groupLabel: 'صفحات', title: 'کالاها، اجناس و لیست قیمت', subtitle: 'تعریف کالا، نرخ خرید و فروش', keywords: 'products kala ajsan لیست قیمت کالا اجناس', icon: <Package className="w-4 h-4" />, run: go('products') },
      { id: 'pg-warehouses', kind: 'page', groupLabel: 'صفحات', title: 'گدام‌ها و انبارها', subtitle: 'موجودی به تفکیک گدام', keywords: 'warehouses gudam anbar گدام انبار موجودی', icon: <Warehouse className="w-4 h-4" />, run: go('warehouses') },
      { id: 'pg-consignment', kind: 'page', groupLabel: 'صفحات', title: 'گدام امانی', subtitle: 'کالاهای امانی و گردش آن', keywords: 'consignment amani امانی گدام', icon: <Boxes className="w-4 h-4" />, run: go('consignment') },
      { id: 'pg-cash', kind: 'page', groupLabel: 'صفحات', title: 'صندوق‌ها و اسعار', subtitle: 'گردش صندوق افغانی، دالری و بانک', keywords: 'cash sandogh bank صندوق بانک حساب نقدی', icon: <Wallet className="w-4 h-4" />, run: go('cash') },
      { id: 'pg-expenses', kind: 'page', groupLabel: 'صفحات', title: 'هزینه‌ها و مصارف', subtitle: 'ثبت و مدیریت اسناد هزینه', keywords: 'expenses hazina masaref هزینه مصارف', icon: <Receipt className="w-4 h-4" />, run: go('expenses') },
      { id: 'pg-incomes', kind: 'page', groupLabel: 'صفحات', title: 'عواید و درآمدها', subtitle: 'ثبت و مدیریت اسناد عاید', keywords: 'incomes awaeid daramad عواید درآمد', icon: <TrendingUp className="w-4 h-4" />, run: go('incomes') },
      { id: 'pg-currencies', kind: 'page', groupLabel: 'صفحات', title: 'تعریف اسعار و نرخ ارز', subtitle: 'مدیریت ارزها و نرخ برابری', keywords: 'currency asar exchange rate نرخ ارز اسعار', icon: <Coins className="w-4 h-4" />, run: go('currencies') },
      { id: 'pg-assets', kind: 'page', groupLabel: 'صفحات', title: 'تجهیزات و دارایی‌های ثابت', subtitle: 'اموال، استهلاک و دارایی‌ها', keywords: 'fixed assets darayi equipment دارایی تجهیزات استهلاک اموال', icon: <FileSpreadsheet className="w-4 h-4" />, run: go('fixed_assets') },
      { id: 'pg-shareholders', kind: 'page', groupLabel: 'صفحات', title: 'سهامداران و شرکا', subtitle: 'سرمایه، سهام و آوردها', keywords: 'shareholders saham sarmaya سهامدار شریک سرمایه', icon: <PieChart className="w-4 h-4" />, run: go('shareholders') },
      { id: 'pg-definitions', kind: 'page', groupLabel: 'صفحات', title: 'تعاریف اولیه سیستم', subtitle: 'گروه مشتریان، دسته‌بندی هزینه و عاید', keywords: 'definitions tarefat تعاریف اولیه گروه', icon: <FolderTree className="w-4 h-4" />, run: go('definitions') },
      { id: 'pg-transactions', kind: 'page', groupLabel: 'صفحات', title: 'دفتر معین و تراکنش‌های مالی', subtitle: 'گردش حساب‌های دفتر کل', keywords: 'ledger transactions daftar moin دفتر معین تراکنش حساب', icon: <ScrollText className="w-4 h-4" />, run: go('transactions') },
      { id: 'pg-reports', kind: 'page', groupLabel: 'صفحات', title: 'گزارش‌ها، سود و زیان و ترازنامه', subtitle: 'گزارش جامع تجارتی و مالی', keywords: 'reports gozaresh profit loss balance sheet گزارش سود زیان ترازنامه بیلان', icon: <TrendingUp className="w-4 h-4" />, run: go('reports') },
      { id: 'pg-audit', kind: 'page', groupLabel: 'صفحات', title: 'دفتر ممیزی و امنیت سیستم', subtitle: 'سابقه فعالیت کاربران', keywords: 'audit log security ممیزی امنیت لاگ', icon: <ShieldCheck className="w-4 h-4" />, run: go('audit_log') },
      { id: 'pg-telegram', kind: 'page', groupLabel: 'صفحات', title: 'مدیریت تلگرام', subtitle: 'کاربران ربات و ارسال اسناد', keywords: 'telegram manager تلگرام مدیریت', icon: <Send className="w-4 h-4" />, run: go('telegram_manager') },
    ];
  }, [onNavigate]);

  /* ------------------------- Live entity search ------------------------- */
  const entityResults: PaletteResult[] = useMemo(() => {
    const q = normalizeSearchText(query);
    if (q.length < 1) return [];
    const list: PaletteResult[] = [];

    // Parties (customers / suppliers)
    parties.forEach(p => {
      const fields = [p.name, p.phone, p.code, p.company, p.groupName, p.address].filter(Boolean) as string[];
      const best = Math.max(...fields.map(f => scoreMatch(query, f)));
      if (best < 0) return;
      const typeLabel = p.type === 'customer' ? 'مشتری' : p.type === 'supplier' ? 'تأمین‌کننده' : 'مشتری و تأمین‌کننده';
      list.push({
        id: `party-${p.id}`,
        kind: 'party',
        groupLabel: 'طرف حساب‌ها',
        title: p.name,
        subtitle: [typeLabel, p.phone && `☎ ${p.phone}`, p.groupName].filter(Boolean).join(' • '),
        meta: `مانده: ${formatCurrency(Math.abs(p.balanceAFN || 0), 'AFN')}${p.balanceUSD ? ` | ${formatCurrency(Math.abs(p.balanceUSD), 'USD')}` : ''}`,
        keywords: fields.join(' '),
        icon: <Users className="w-4 h-4" />,
        run: () => setSelectedParty(p),
      });
    });

    // Products
    products.forEach(pr => {
      const fields = [pr.name, pr.code, pr.category, pr.numericCode as string].filter(Boolean) as string[];
      const best = Math.max(...fields.map(f => scoreMatch(query, f)));
      if (best < 0) return;
      const tons = stocks
        .filter(s => s.productId === pr.id)
        .reduce((sum, s) => sum + (s.quantityTons || 0), 0);
      list.push({
        id: `product-${pr.id}`,
        kind: 'product',
        groupLabel: 'کالاها',
        title: pr.name,
        subtitle: [pr.code && `کد: ${pr.code}`, pr.category].filter(Boolean).join(' • '),
        meta: `موجودی: ${tons.toFixed(2)} تُن`,
        keywords: fields.join(' '),
        icon: <Package className="w-4 h-4" />,
        run: () => setSelectedProduct(pr),
      });
    });

    // Invoices — matched by number, party name or amount
    invoices.slice(0, 600).forEach(inv => {
      const fields = [inv.invoiceNumber, inv.partyName, inv.partyPhone, inv.date].filter(Boolean) as string[];
      const best = Math.max(...fields.map(f => scoreMatch(query, f)));
      if (best < 0) return;
      const typeLabel =
        inv.type === 'sell' ? 'فروش' : inv.type === 'buy' ? 'خرید' : inv.type === 'return_sell' ? 'برگشت از فروش' : 'برگشت از خرید';
      list.push({
        id: `invoice-${inv.id}`,
        kind: 'invoice',
        groupLabel: 'فاکتورها',
        title: `${typeLabel} شماره ${inv.invoiceNumber}`,
        subtitle: `${inv.partyName} • ${inv.date}`,
        meta: formatCurrency(inv.totalAmount || 0, inv.currency),
        keywords: fields.join(' '),
        icon: <ScrollText className="w-4 h-4" />,
        run: () => onViewInvoice(inv.id),
      });
    });

    return list;
  }, [query, parties, products, invoices, stocks, onViewInvoice]);

  /* ---------------------------- Result list ---------------------------- */
  const results: PaletteResult[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const recents = recentIds
        .map(id => [...actions, ...pages].find(r => r.id === id))
        .filter(Boolean) as PaletteResult[];
      const recentBlock = recents.length
        ? recents.map(r => ({ ...r, groupLabel: 'اخیراً استفاده شده' }))
        : [];
      return [...recentBlock, ...actions, ...pages];
    }

    const q = trimmed;
    const ranked = actions
      .concat(pages)
      .map(r => ({ r, score: Math.max(scoreMatch(q, r.title), scoreMatch(q, r.keywords || '') - 5) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.r);

    // Keyword hits rank slightly below exact page/action hits.
    const entities = entityResults
      .map(r => ({
        r,
        score: Math.max(
          scoreMatch(q, r.title) + 10,
          scoreMatch(q, r.subtitle || '') + 2,
          scoreMatch(q, r.keywords || '')
        ),
      }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.r);

    return [...ranked, ...entities].slice(0, 60);
  }, [query, actions, pages, entityResults, recentIds]);

  /* --------------------------- Interactions --------------------------- */
  const runResult = useCallback(
    (result: PaletteResult) => {
      rememberRecent(result.id);
      onClose();
      // Let the palette unmount before triggering navigation-heavy work.
      window.setTimeout(() => result.run(), 0);
    },
    [onClose, rememberRecent]
  );

  // Reset state whenever the palette opens. Note: we deliberately keep the
  // cardex drill-downs alive while the palette itself is closed, so a party /
  // product selected from search results stays open on its own.
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    setSelectedParty(null);
    setSelectedProduct(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Keyboard navigation inside the palette.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (results.length ? (i - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        const target = results[activeIndex];
        if (target) {
          e.preventDefault();
          runResult(target);
        }
      } else if (e.key === 'Home') {
        setActiveIndex(0);
      } else if (e.key === 'End') {
        setActiveIndex(Math.max(results.length - 1, 0));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, results, activeIndex, onClose, runResult]);

  // Keep the highlighted row in view. Guarded because some embedded webviews
  // (and non-browser runtimes) do not implement scrollIntoView.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (node && typeof node.scrollIntoView === 'function') {
      try {
        node.scrollIntoView({ block: 'nearest' });
      } catch {
        /* scrolling is a progressive enhancement only */
      }
    }
  }, [activeIndex, results.length]);

  // Guard: the highlight must never point past the end of a shorter list.
  useEffect(() => {
    setActiveIndex(i => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  if (!isOpen && !selectedParty && !selectedProduct) return null;

  const kindStyles: Record<ResultKind, string> = {
    action: 'bg-blue-50 text-blue-600 border-blue-100',
    page: 'bg-slate-50 text-slate-600 border-slate-200',
    party: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    product: 'bg-amber-50 text-amber-600 border-amber-100',
    invoice: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  let lastGroup = '';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9990] flex items-start justify-center p-0 sm:p-4 sm:pt-16 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          dir="rtl"
          onMouseDown={e => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="جستجوی سراسری و اجرای سریع دستورات"
            className="w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col sm:max-h-[78vh] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-10">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="جستجوی صفحه، مشتری، کالا، فاکتور یا اجرای دستور…"
                className="flex-1 bg-transparent outline-none text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                autoComplete="off"
                spellCheck={false}
                aria-label="جستجوی سراسری"
              />
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                aria-label="بستن جستجو"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar py-2">
              {results.length === 0 && (
                <div className="px-6 py-14 text-center space-y-2">
                  <Search className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">نتیجه‌ای یافت نشد</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    جستجو در نام مشتریان، کالاها، شماره فاکتورها، صفحات و دستورات انجام می‌شود.
                    <br />
                    برای مشاهده همه صفحات، متن جستجو را پاک کنید.
                  </p>
                </div>
              )}

              {results.map((result, index) => {
                const showHeader = result.groupLabel !== lastGroup;
                lastGroup = result.groupLabel;
                const isActive = index === activeIndex;

                return (
                  <React.Fragment key={`${result.id}-${index}`}>
                    {showHeader && (
                      <div className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        {result.groupLabel === 'اخیراً استفاده شده' && <Clock className="w-3 h-3" />}
                        {result.groupLabel}
                      </div>
                    )}
                    <button
                      type="button"
                      data-index={index}
                      onClick={() => runResult(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-right px-3 py-2.5 mx-1 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                        isActive ? 'bg-blue-50/90 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                      }`}
                      style={{ width: 'calc(100% - 0.5rem)' }}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${kindStyles[result.kind]}`}
                      >
                        {result.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold text-slate-800 truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="block text-[11px] text-slate-500 truncate mt-0.5">{result.subtitle}</span>
                        )}
                      </span>
                      {result.meta && (
                        <span className="hidden sm:block text-[11px] font-bold text-slate-500 shrink-0 tabular-nums">
                          {result.meta}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="w-4 h-4 text-blue-500 shrink-0 hidden sm:block" aria-hidden />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Footer hints */}
            <div className="hidden sm:flex items-center justify-between gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500 font-bold shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs font-mono">
                    <ArrowUp className="w-3 h-3 inline" />
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs font-mono">
                    <ArrowDown className="w-3 h-3 inline" />
                  </kbd>
                  حرکت
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs font-mono">Enter</kbd>
                  انتخاب
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs font-mono">Esc</kbd>
                  بستن
                </span>
              </div>
              <span className="truncate">
                {companySettings?.name || 'سیستم حسابداری'} • جستجوی سراسری
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cardex drill-downs opened straight from search results */}
      <React.Suspense fallback={null}>
        {selectedParty && (
          <PartyCardexModal
            party={selectedParty}
            isOpen={true}
            onClose={() => setSelectedParty(null)}
            onViewInvoice={id => {
              setSelectedParty(null);
              onViewInvoice(id);
            }}
          />
        )}
        {selectedProduct && (
          <ProductCardexModal
            product={selectedProduct}
            isOpen={true}
            onClose={() => setSelectedProduct(null)}
            onViewInvoice={id => {
              setSelectedProduct(null);
              onViewInvoice(id);
            }}
          />
        )}
      </React.Suspense>
    </>
  );
};

export default CommandPalette;
