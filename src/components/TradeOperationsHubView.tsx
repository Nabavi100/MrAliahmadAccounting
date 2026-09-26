import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { InvoiceType, Invoice, PaymentStatus, Currency } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { SalesInvoiceCreateView } from './SalesInvoiceCreateView';
import { PurchaseInvoiceCreateView } from './PurchaseInvoiceCreateView';
import {
  ShoppingCart,
  Building2,
  RotateCcw,
  RotateCw,
  Plus,
  Search,
  Printer,
  Eye,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Warehouse as WarehouseIcon,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Edit2,
  Package,
} from 'lucide-react';
import { EditInvoiceModal } from './EditInvoiceModal';

interface TradeOperationsHubViewProps {
  initialType?: 'sell' | 'buy' | 'return_sell' | 'return_buy';
  initialViewMode?: 'list' | 'create';
  onViewInvoice: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment', partyId?: string) => void;
}

export const TradeOperationsHubView: React.FC<TradeOperationsHubViewProps> = ({
  initialType = 'sell',
  initialViewMode = 'list',
  onViewInvoice,
  onOpenPaymentModal,
}) => {
  const { invoices, deleteInvoice, openPrintModal } = useAccounting();

  // Active category: 'sell' (فروش), 'buy' (خرید), 'return_sell' (برگشت از فروش), 'return_buy' (برگشت از خرید)
  const [activeCategory, setActiveCategory] = useState<'sell' | 'buy' | 'return_sell' | 'return_buy'>(initialType);

  // Sub-view: 'list' (فهرست فاکتورها) or 'create' (ثبت فاکتور جدید)
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialViewMode);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Sync state when props change (e.g. from sidebar or quick navigation)
  React.useEffect(() => {
    setActiveCategory(initialType);
  }, [initialType]);

  React.useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Filter and search states for the list view
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');

  // Filter invoices for the active category
  const categoryInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === activeCategory);
  }, [invoices, activeCategory]);

  const filteredInvoices = useMemo(() => {
    return categoryInvoices.filter(inv => {
      if (currencyFilter !== 'all' && inv.currency !== currencyFilter) return false;
      if (statusFilter !== 'all' && inv.paymentStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchParty = (inv.partyName || '').toLowerCase().includes(q);
        const matchNote = (inv.notes || '').toLowerCase().includes(q);
        const matchItem = inv.items?.some(it => it.productName.toLowerCase().includes(q));
        if (!matchNum && !matchParty && !matchNote && !matchItem) return false;
      }

      return true;
    });
  }, [categoryInvoices, currencyFilter, statusFilter, searchQuery]);

  // Aggregate metrics for active category
  const metrics = useMemo(() => {
    let totalAFN = 0;
    let totalUSD = 0;
    let totalPaidAFN = 0;
    let totalPaidUSD = 0;
    let totalDueAFN = 0;
    let totalDueUSD = 0;

    categoryInvoices.forEach(inv => {
      const invTotal = inv.totalAmount ?? 0;
      const invPaid = inv.paidAmount ?? 0;
      const invDue = inv.balanceAmount ?? 0;

      if (inv.currency === 'AFN') {
        totalAFN += invTotal;
        totalPaidAFN += invPaid;
        totalDueAFN += invDue;
      } else {
        totalUSD += invTotal;
        totalPaidUSD += invPaid;
        totalDueUSD += invDue;
      }
    });

    return { totalAFN, totalUSD, totalPaidAFN, totalPaidUSD, totalDueAFN, totalDueUSD };
  }, [categoryInvoices]);

  // Category counts
  const counts = useMemo(() => {
    return {
      sell: invoices.filter(i => i.type === 'sell').length,
      buy: invoices.filter(i => i.type === 'buy').length,
      return_sell: invoices.filter(i => i.type === 'return_sell').length,
      return_buy: invoices.filter(i => i.type === 'return_buy').length,
    };
  }, [invoices]);

  // Category info helpers
  const getCategoryInfo = () => {
    switch (activeCategory) {
      case 'sell':
        return {
          title: 'فروش (فاکتورهای فروش)',
          subtitle: 'مدیریت و صدور فاکتورهای فروش کالا به مشتریان همراه با کسر از موجودی انبار',
          createBtnLabel: 'صدور فاکتور فروش جدید',
          color: 'blue',
          accentBg: 'bg-blue-600',
          hoverBg: 'hover:bg-blue-700',
          borderActive: 'border-blue-600',
          textActive: 'text-blue-600',
          partyLabel: 'خریدار / مشتری',
        };
      case 'buy':
        return {
          title: 'خرید (فاکتورهای خرید)',
          subtitle: 'مدیریت و ثبت فاکتورهای خرید کالا از کارخانجات و تأمین‌کنندگان همراه با ورود به انبار',
          createBtnLabel: 'ثبت فاکتور خرید جدید',
          color: 'emerald',
          accentBg: 'bg-emerald-600',
          hoverBg: 'hover:bg-emerald-700',
          borderActive: 'border-emerald-600',
          textActive: 'text-emerald-600',
          partyLabel: 'فروشنده / کارخانه',
        };
      case 'return_sell':
        return {
          title: 'فاکتور برگشت از فروش (مرجوعی مشتری)',
          subtitle: 'مدیریت و صدور فاکتورهای مرجوعی مشتریان همراه با برگشت کالا به انبار و بستانکار شدن مشتری',
          createBtnLabel: 'صدور فاکتور برگشت از فروش',
          color: 'amber',
          accentBg: 'bg-amber-600',
          hoverBg: 'hover:bg-amber-700',
          borderActive: 'border-amber-600',
          textActive: 'text-amber-600',
          partyLabel: 'مشتری مرجوع‌کننده',
        };
      case 'return_buy':
        return {
          title: 'فاکتور برگشت از خرید (مرجوعی به تأمین‌کننده)',
          subtitle: 'مدیریت و ثبت فاکتورهای مرجوعی به فروشندگان همراه با کسر از موجودی انبار و بدهکار شدن تأمین‌کننده',
          createBtnLabel: 'ثبت فاکتور برگشت از خرید',
          color: 'purple',
          accentBg: 'bg-purple-600',
          hoverBg: 'hover:bg-purple-700',
          borderActive: 'border-purple-600',
          textActive: 'text-purple-600',
          partyLabel: 'تأمین‌کننده مرجوع‌شونده',
        };
    }
  };

  const categoryInfo = getCategoryInfo();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto font-sans" dir="rtl">
      {/* ========================================================================= */}
      {/* TOP HEADER & PRIMARY 4 NAVIGATION CARDS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-600 block uppercase tracking-wider">
                مدیریت بازرگانی و مالی • بخش خرید و فروش
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                عملیات خرید، فروش و برگشت‌های تجارتی
              </h2>
            </div>
          </div>

          {/* Quick workflow shortcuts for all 4 trade document types */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* ۱. فروش */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                id="trade-tab-create-sell"
                onClick={() => {
                  setActiveCategory('sell');
                  setViewMode('create');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'sell' && viewMode === 'create'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>صدور فاکتور فروش</span>
              </button>
              <button
                type="button"
                id="trade-tab-list-sell"
                onClick={() => {
                  setActiveCategory('sell');
                  setViewMode('list');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === 'sell' && viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <span>لیست ({counts.sell})</span>
              </button>
            </div>

            {/* ۲. برگشت از فروش */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                id="trade-tab-create-return-sell"
                onClick={() => {
                  setActiveCategory('return_sell');
                  setViewMode('create');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'return_sell' && viewMode === 'create'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>برگشت از فروش</span>
              </button>
              <button
                type="button"
                id="trade-tab-list-return-sell"
                onClick={() => {
                  setActiveCategory('return_sell');
                  setViewMode('list');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === 'return_sell' && viewMode === 'list'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <span>لیست ({counts.return_sell})</span>
              </button>
            </div>

            {/* ۳. خرید */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                id="trade-tab-create-buy"
                onClick={() => {
                  setActiveCategory('buy');
                  setViewMode('create');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'buy' && viewMode === 'create'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت فاکتور خرید</span>
              </button>
              <button
                type="button"
                id="trade-tab-list-buy"
                onClick={() => {
                  setActiveCategory('buy');
                  setViewMode('list');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === 'buy' && viewMode === 'list'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <span>لیست ({counts.buy})</span>
              </button>
            </div>

            {/* ۴. برگشت از خرید */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                id="trade-tab-create-return-buy"
                onClick={() => {
                  setActiveCategory('return_buy');
                  setViewMode('create');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'return_buy' && viewMode === 'create'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>برگشت از خرید</span>
              </button>
              <button
                type="button"
                id="trade-tab-list-return-buy"
                onClick={() => {
                  setActiveCategory('return_buy');
                  setViewMode('list');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === 'return_buy' && viewMode === 'list'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <span>لیست ({counts.return_buy})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 PRIMARY NAVIGATION BUTTONS / CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. خرید (فاکتور خرید) */}
          <div
            id="trade-btn-nav-buy"
            onClick={() => {
              setActiveCategory('buy');
              if (counts.buy === 0) setViewMode('create');
            }}
            className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
              activeCategory === 'buy'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-400/30'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeCategory === 'buy'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`text-xs font-black block ${
                    activeCategory === 'buy' ? 'text-emerald-800' : 'text-slate-800'
                  }`}
                >
                  خرید (فاکتور خرید)
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {counts.buy} فاکتور ثبت‌شده
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory('buy');
                setViewMode('create');
              }}
              title="ثبت فاکتور خرید جدید"
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
            >
              + جدید
            </button>
          </div>

          {/* 2. فروش (فاکتور فروش) */}
          <div
            id="trade-btn-nav-sell"
            onClick={() => {
              setActiveCategory('sell');
              if (counts.sell === 0) setViewMode('create');
            }}
            className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
              activeCategory === 'sell'
                ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400/30'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeCategory === 'sell'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`text-xs font-black block ${
                    activeCategory === 'sell' ? 'text-blue-800' : 'text-slate-800'
                  }`}
                >
                  فروش (فاکتور فروش)
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {counts.sell} فاکتور ثبت‌شده
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory('sell');
                setViewMode('create');
              }}
              title="صدور فاکتور فروش جدید"
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
            >
              + جدید
            </button>
          </div>

          {/* 3. فاکتور برگشت از خرید */}
          <div
            id="trade-btn-nav-return-buy"
            onClick={() => {
              setActiveCategory('return_buy');
              if (counts.return_buy === 0) setViewMode('create');
            }}
            className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
              activeCategory === 'return_buy'
                ? 'bg-purple-50/80 border-purple-500 shadow-xs ring-1 ring-purple-400/30'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeCategory === 'return_buy'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`text-xs font-black block ${
                    activeCategory === 'return_buy' ? 'text-purple-800' : 'text-slate-800'
                  }`}
                >
                  فاکتور برگشت از خرید
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {counts.return_buy} مرجوعی تأمین‌کننده
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory('return_buy');
                setViewMode('create');
              }}
              title="ثبت برگشت از خرید جدید"
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
            >
              + جدید
            </button>
          </div>

          {/* 4. فاکتور برگشت از فروش */}
          <div
            id="trade-btn-nav-return-sell"
            onClick={() => {
              setActiveCategory('return_sell');
              if (counts.return_sell === 0) setViewMode('create');
            }}
            className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
              activeCategory === 'return_sell'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-1 ring-amber-400/30'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeCategory === 'return_sell'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`text-xs font-black block ${
                    activeCategory === 'return_sell' ? 'text-amber-800' : 'text-slate-800'
                  }`}
                >
                  فاکتور برگشت از فروش
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  {counts.return_sell} مرجوعی مشتری
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory('return_sell');
                setViewMode('create');
              }}
              title="صدور برگشت از فروش جدید"
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
            >
              + جدید
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RENDER VIEW: LIST OR FORM */}
      {/* ========================================================================= */}
      {viewMode === 'create' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-2 sm:p-4 shadow-xs">
          {activeCategory === 'sell' || activeCategory === 'return_sell' ? (
            <SalesInvoiceCreateView
              invoiceType={activeCategory}
              onBackToList={() => setViewMode('list')}
              onViewInvoice={id => {
                setViewMode('list');
                onViewInvoice(id);
              }}
            />
          ) : (
            <PurchaseInvoiceCreateView
              invoiceType={activeCategory}
              onBackToList={() => setViewMode('list')}
              onViewInvoice={id => {
                setViewMode('list');
                onViewInvoice(id);
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Financial Cards for Active Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">
                  مجموع فاکتورهای {categoryInfo.title}
                </span>
                <div className="mt-1 space-y-0.5">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatNumber(metrics.totalAFN)} ؋
                  </div>
                  <div className="text-xs font-bold text-blue-600 font-mono">
                    ${formatNumber(metrics.totalUSD)}
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">تسویه نقدی / وصولی</span>
                <div className="mt-1 space-y-0.5">
                  <div className="text-xl font-black text-emerald-600 font-mono">
                    {formatNumber(metrics.totalPaidAFN)} ؋
                  </div>
                  <div className="text-xs font-bold text-emerald-600 font-mono">
                    ${formatNumber(metrics.totalPaidUSD)}
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">باقیمانده / نسیه حسابی</span>
                <div className="mt-1 space-y-0.5">
                  <div className="text-xl font-black text-rose-600 font-mono">
                    {formatNumber(metrics.totalDueAFN)} ؋
                  </div>
                  <div className="text-xs font-bold text-rose-600 font-mono">
                    ${formatNumber(metrics.totalDueUSD)}
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Filters & Actions Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`جستجو در شماره فاکتور، نام ${categoryInfo.partyLabel} یا اقلام کالا...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-500 transition"
                  />
                </div>

                <select
                  value={currencyFilter}
                  onChange={e => setCurrencyFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="all">همه اسعار</option>
                  <option value="AFN">افغانی (AFN)</option>
                  <option value="USD">دالر (USD)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="all">همه وضعیت‌های تسویه</option>
                  <option value="paid">کاملاً تسویه شده</option>
                  <option value="partial">پرداخت جزئی</option>
                  <option value="unpaid">نسیه / پرداخت‌نشده</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('create')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ {categoryInfo.createBtnLabel}</span>
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3.5 px-4">ردیف</th>
                    <th className="py-3.5 px-4">شماره فاکتور</th>
                    <th className="py-3.5 px-4">تاریخ صدور</th>
                    <th className="py-3.5 px-4">{categoryInfo.partyLabel}</th>
                    <th className="py-3.5 px-4">اقلام فاکتور</th>
                    <th className="py-3.5 px-4">مبلغ کل فاکتور</th>
                    <th className="py-3.5 px-4">پرداخت نقدی</th>
                    <th className="py-3.5 px-4">باقیمانده (قرض)</th>
                    <th className="py-3.5 px-4">وضعیت تسویه</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-14 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3.5">
                          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center shadow-xs">
                            <FileText className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800">
                              هیچ فاکتوری در بخش {categoryInfo.title} ثبت نشده است
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              جهت ثبت و صدور فاکتور جدید با مشخصات ۵ قلم کالا، ۳ نوع تادیه (نقدی، نسیه، نیمه‌نسیه) و چاپ رسمی، روی دکمه زیر کلیک نمایید.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewMode('create')}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{categoryInfo.createBtnLabel}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const totalTons = inv.items?.reduce((s, it) => s + (it.tonsCount || 0), 0) || 0;
                      const totalBags = inv.items?.reduce((s, it) => s + (it.bagsCount || 0), 0) || 0;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {inv.invoiceNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            <div>{inv.date}</div>
                            {inv.issueTime && <div className="text-[10px] text-slate-400">{inv.issueTime}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">{inv.partyName}</span>
                          </td>
                          <td className="py-3 px-4 min-w-[200px] max-w-sm">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {inv.items && inv.items.length > 0 ? (
                                  inv.items.map((it, itemIdx) => (
                                    <span
                                      key={itemIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200/70 text-slate-800 text-[11px] transition-colors"
                                      title={`${it.productName}: ${formatNumber(it.quantity)} ${it.unit === 'ton' ? 'تن' : 'کیسه'}${it.unitPrice ? ` • فی: ${formatNumber(it.unitPrice)}` : ''}`}
                                    >
                                      <Package className="w-3 h-3 text-blue-600 shrink-0" />
                                      <strong className="font-bold text-slate-900">{it.productName}</strong>
                                      <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1 rounded border border-blue-200/60">
                                        {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                                      </span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px]">بدون اقلام کالا</span>
                                )}
                              </div>
                              {(totalTons > 0 || totalBags > 0) && (
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 font-bold">
                                  <span className="text-slate-400">جمع:</span>
                                  <span>
                                    {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''}
                                    {totalTons > 0 && totalBags > 0 ? ' • ' : ''}
                                    {totalBags > 0 ? `${formatNumber(totalBags)} کیسه` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            {formatCurrency(inv.paidAmount || 0, inv.currency)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-600">
                            {(inv.balanceAmount || 0) > 0 ? (
                              formatCurrency(inv.balanceAmount, inv.currency)
                            ) : (
                              <span className="text-slate-400 font-normal text-[11px]">تسویه شد</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                inv.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : inv.paymentStatus === 'partial'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {inv.paymentStatus === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {inv.paymentStatus === 'partial' && <Clock className="w-3 h-3" />}
                              {inv.paymentStatus === 'unpaid' && <AlertCircle className="w-3 h-3" />}
                              <span>
                                {inv.paymentStatus === 'paid'
                                  ? 'تسویه کامل'
                                  : inv.paymentStatus === 'partial'
                                  ? 'پرداخت جزئی'
                                  : 'نسیه / پرداخت‌نشده'}
                              </span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewInvoice(inv.id)}
                                className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="مشاهده جزئیات فاکتور"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingInvoice(inv)}
                                className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition cursor-pointer"
                                title="ویرایش مجدد فاکتور"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openPrintModal('invoice', inv)}
                                className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="چاپ فاکتور رسمی"
                              >
                                <Printer className="w-4 h-4 text-slate-600" />
                              </button>
                              {onOpenPaymentModal && (inv.balanceAmount || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPaymentModal(
                                      activeCategory === 'sell' || activeCategory === 'return_buy'
                                        ? 'receive_payment'
                                        : 'make_payment',
                                      inv.partyId
                                    )
                                  }
                                  className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                                  title="ثبت دریافت/پرداخت وجه"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`آیا از حذف فاکتور ${inv.invoiceNumber} اطمینان دارید؟`)) {
                                    deleteInvoice(inv.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                title="حذف فاکتور"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredInvoices.length > 0 && (
                  <tfoot className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-left font-black">
                        جمع کل مبالغ نمایش‌داده‌شده:
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-sm text-slate-900">
                        {currencyFilter === 'AFN' && `${formatNumber(metrics.totalAFN)} ؋`}
                        {currencyFilter === 'USD' && `$${formatNumber(metrics.totalUSD)}`}
                        {currencyFilter === 'all' && (
                          <div className="space-y-0.5">
                            <div>{formatNumber(metrics.totalAFN)} ؋</div>
                            <div className="text-xs text-blue-700 font-bold">${formatNumber(metrics.totalUSD)}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {currencyFilter === 'AFN' && `${formatNumber(metrics.totalPaidAFN)} ؋`}
                        {currencyFilter === 'USD' && `$${formatNumber(metrics.totalPaidUSD)}`}
                        {currencyFilter === 'all' && (
                          <div className="space-y-0.5">
                            <div>{formatNumber(metrics.totalPaidAFN)} ؋</div>
                            <div className="text-xs text-emerald-700">${formatNumber(metrics.totalPaidUSD)}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {currencyFilter === 'AFN' && `${formatNumber(metrics.totalDueAFN)} ؋`}
                        {currencyFilter === 'USD' && `$${formatNumber(metrics.totalDueUSD)}`}
                        {currencyFilter === 'all' && (
                          <div className="space-y-0.5">
                            <div>{formatNumber(metrics.totalDueAFN)} ؋</div>
                            <div className="text-xs text-amber-700">${formatNumber(metrics.totalDueUSD)}</div>
                          </div>
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Re-edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          isOpen={!!editingInvoice}
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
      )}
    </div>
  );
};
