import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { formatNumber, formatCurrency, extractSolarMonthIndex, getPersianDate } from '../utils/formatters';
import {
  TrendingUp,
  Package,
  Warehouse as WarehouseIcon,
  Search,
  Plus,
  ArrowRightLeft,
  Coins,
  MapPin,
  ChevronLeft,
  ChevronDown,
  Compass,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Layers,
  Banknote,
  Receipt,
  CheckCircle2,
  X,
  User,
  BarChart3,
  Wallet,
  DollarSign,
  Eye,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { NavTab } from './Sidebar';
import { Party } from '../types';
import { PartyCardexModal } from './PartyCardexModal';

interface DashboardViewProps {
  setActiveTab: (tab: NavTab) => void;
  setSubFilter?: (sub: string) => void;
  onOpenNewInvoice: (type?: 'buy' | 'sell') => void;
  onOpenPaymentModal: (type?: 'receive_payment' | 'make_payment', partyId?: string) => void;
  onOpenTransferModal: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onSelectCashAccount?: (accountId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  setSubFilter,
  onOpenNewInvoice,
  onOpenPaymentModal,
  onOpenTransferModal,
  onViewInvoice,
  onSelectCashAccount,
}) => {
  const {
    parties,
    invoices,
    warehouses,
    products,
    cashAccounts,
    cashRegister,
    expenses,
    incomes,
    companySettings,
    baseCurrency,
    convertToBase,
  } = useAccounting();

  const [isIncomeExpenseModalOpen, setIsIncomeExpenseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartyForCardex, setSelectedPartyForCardex] = useState<Party | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' or 'F' to focus on search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || e.key.toLowerCase() === 'f') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter parties based on search query (case-insensitive, name, code, phone, company)
  const cleanTerm = searchQuery.trim().toLowerCase();
  const searchResults = cleanTerm
    ? parties.filter(
        p =>
          p.name.toLowerCase().includes(cleanTerm) ||
          (p.code && p.code.toLowerCase().includes(cleanTerm)) ||
          (p.phone && p.phone.includes(cleanTerm)) ||
          (p.company && p.company.toLowerCase().includes(cleanTerm))
      ).slice(0, 8)
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex(prev => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        const chosen = searchResults[selectedIndex] || searchResults[0];
        setSelectedPartyForCardex(chosen);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  const handleQuickOpenAccount = (partyToOpen?: Party) => {
    const target = partyToOpen || searchResults[selectedIndex] || searchResults[0];
    if (target) {
      setSelectedPartyForCardex(target);
      setSearchQuery('');
    }
  };

  // Debtors & Creditors (Accurate calculation directly from actual parties, zero when clean/reset)
  const totalCustomerDebtAFN = parties
    .filter(p => p.balanceAFN < 0)
    .reduce((sum, p) => sum + Math.abs(p.balanceAFN), 0);

  const totalCustomerDebtUSD = parties
    .filter(p => p.balanceUSD < 0)
    .reduce((sum, p) => sum + Math.abs(p.balanceUSD), 0);

  const totalSupplierPayableAFN = parties
    .filter(p => p.balanceAFN > 0)
    .reduce((sum, p) => sum + p.balanceAFN, 0);

  const totalSupplierPayableUSD = parties
    .filter(p => p.balanceUSD > 0)
    .reduce((sum, p) => sum + p.balanceUSD, 0);

  // Sales and Gross profit (Calculated accurately from real invoices)
  const currentMonthSalesAFN = invoices
    .filter(inv => inv.type === 'sell' && inv.currency === 'AFN')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const currentMonthGrossProfitBase = invoices
    .filter(inv => inv.type === 'sell')
    .reduce((sum, inv) => {
      const invProfit = (inv.items || []).reduce((itemSum, item) => {
        const margin = (item.unitPrice - (item.buyPrice || item.unitPrice * 0.9)) * item.quantity;
        return itemSum + convertToBase(margin, inv.currency);
      }, 0);
      return sum + invProfit;
    }, 0);

  // ---------------- Recharts Comparative Bar Chart Data ----------------
  const [chartCurrency, setChartCurrency] = useState<'BASE' | 'USD' | 'AFN'>('BASE');
  const [chartPeriod, setChartPeriod] = useState<'6m' | '12m'>('12m');

  const monthlyChartData = useMemo(() => {
    const monthNames = [
      'حمل',
      'ثور',
      'جوزا',
      'سرطان',
      'اسد',
      'سنبله',
      'میزان',
      'عقرب',
      'قوس',
      'جدی',
      'دلو',
      'حوت',
    ];

    const stats = monthNames.map((name, index) => ({
      month: name,
      monthIndex: index + 1,
      salesBase: 0,
      purchasesBase: 0,
      salesUSD: 0,
      purchasesUSD: 0,
      salesAFN: 0,
      purchasesAFN: 0,
      salesCount: 0,
      purchasesCount: 0,
    }));

    const rateToAFN = cashRegister.usdToAfnRate > 0 ? cashRegister.usdToAfnRate : 65;

    invoices.forEach(inv => {
      if (!inv.date) return;
      const mIndex = extractSolarMonthIndex(inv.date);
      if (mIndex >= 0 && mIndex < 12) {
        const amt = inv.totalAmount || 0;
        const invCurr = inv.currency || 'USD';
        const baseAmt = convertToBase(amt, invCurr);

        // Convert to USD and AFN so every currency view reflects all invoices
        const usdAmt =
          (baseCurrency.code || 'USD').toUpperCase() === 'USD'
            ? baseAmt
            : baseCurrency.code === 'AFN'
            ? baseAmt / rateToAFN
            : convertToBase(amt, invCurr);
        const afnAmt =
          (baseCurrency.code || 'USD').toUpperCase() === 'AFN'
            ? baseAmt
            : usdAmt * rateToAFN;

        if (inv.type === 'sell') {
          stats[mIndex].salesBase += baseAmt;
          stats[mIndex].salesUSD += usdAmt;
          stats[mIndex].salesAFN += afnAmt;
          stats[mIndex].salesCount += 1;
        } else if (inv.type === 'return_sell') {
          stats[mIndex].salesBase = Math.max(0, stats[mIndex].salesBase - baseAmt);
          stats[mIndex].salesUSD = Math.max(0, stats[mIndex].salesUSD - usdAmt);
          stats[mIndex].salesAFN = Math.max(0, stats[mIndex].salesAFN - afnAmt);
        } else if (inv.type === 'buy') {
          stats[mIndex].purchasesBase += baseAmt;
          stats[mIndex].purchasesUSD += usdAmt;
          stats[mIndex].purchasesAFN += afnAmt;
          stats[mIndex].purchasesCount += 1;
        } else if (inv.type === 'return_buy') {
          stats[mIndex].purchasesBase = Math.max(0, stats[mIndex].purchasesBase - baseAmt);
          stats[mIndex].purchasesUSD = Math.max(0, stats[mIndex].purchasesUSD - usdAmt);
          stats[mIndex].purchasesAFN = Math.max(0, stats[mIndex].purchasesAFN - afnAmt);
        }
      }
    });

    const currMonthIndex = extractSolarMonthIndex(getPersianDate());
    const activeMonth = currMonthIndex >= 0 ? currMonthIndex : 5;
    const startIdx = activeMonth < 6 ? 0 : activeMonth - 5;
    const dataset = chartPeriod === '6m' ? stats.slice(startIdx, startIdx + 6) : stats;

    return dataset.map(item => {
      let s = item.salesBase;
      let p = item.purchasesBase;
      if (chartCurrency === 'USD') {
        s = item.salesUSD;
        p = item.purchasesUSD;
      } else if (chartCurrency === 'AFN') {
        s = item.salesAFN;
        p = item.purchasesAFN;
      }
      return {
        month: item.month,
        sales: Math.round(s),
        purchases: Math.round(p),
        salesCount: item.salesCount,
        purchasesCount: item.purchasesCount,
      };
    });
  }, [invoices, convertToBase, baseCurrency, cashRegister.usdToAfnRate, chartCurrency, chartPeriod]);

  // Cash Registers Summary
  const totalCashUSD = useMemo(
    () =>
      cashAccounts
        .filter(acc => acc.currency === 'USD')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0),
    [cashAccounts]
  );

  const totalCashAFN = useMemo(
    () =>
      cashAccounts
        .filter(acc => acc.currency === 'AFN')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0),
    [cashAccounts]
  );

  const usdValueInBase = convertToBase(totalCashUSD, 'USD');
  const afnValueInBase = convertToBase(totalCashAFN, 'AFN');
  const totalCashBase = usdValueInBase + afnValueInBase;
  const usdPercent = totalCashBase > 0 ? Math.round((usdValueInBase / totalCashBase) * 100) : 50;
  const afnPercent = totalCashBase > 0 ? 100 - usdPercent : 50;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto font-sans select-none" dir="rtl">
      {/* ---------------- 1. WELCOME GREETING SECTION ---------------- */}
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          خوش آمدید، جناب مدیر کل سیستم
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          خلاصه وضعیت مالی، گدام‌ها و فروش {companySettings.name || 'شرکت تجارتی برادران نبوی'} تا این لحظه
        </p>
      </div>

      {/* ---------------- 2. QUICK ACTIONS & SEARCH CARD ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs space-y-4">
        {/* Top Header Row of the Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Right: Title & Shortcut hint */}
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#2563EB]" />
            <span className="font-bold text-xs md:text-sm text-slate-800">
              کارتایل سریع و میانبرها
            </span>
            <span className="text-[10px] text-slate-400 mr-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 hidden sm:inline-block">
              فوکوس روی کادر جستجو با فشردن کلید / یا F
            </span>
          </div>

          {/* Left: 3 Action Buttons (Exact order from screenshot: Green, Red, Blue in RTL) */}
          <div className="flex items-center gap-2">
            {/* 1. Green Button: فاکتور فروش جدید */}
            <button
              type="button"
              id="dashboard-btn-new-sale"
              onClick={() => onOpenNewInvoice('sell')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فاکتور فروش جدید</span>
            </button>

            {/* 2. Red Button: فاکتور خرید جدید */}
            <button
              type="button"
              id="dashboard-btn-new-purchase"
              onClick={() => onOpenNewInvoice('buy')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
            >
              <span>فاکتور خرید جدید</span>
            </button>

            {/* 3. Blue Button: دریافت و پرداخت جدید */}
            <button
              type="button"
              id="dashboard-btn-new-payment"
              onClick={() => onOpenPaymentModal('receive_payment')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>دریافت و پرداخت جدید</span>
            </button>

            {/* 4. Purple Button: ثبت عاید و هزینه (ورود مستقیم به صفحه گزینه‌های ثبت) */}
            <button
              type="button"
              id="dashboard-btn-income-expense"
              onClick={() => setIsIncomeExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer active:scale-95 group"
              title="ثبت عاید جدید یا هزینه جدید با کلیک مستقیم به صفحه گزینه‌های ثبت"
            >
              <Wallet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>ثبت عاید و هزینه</span>
            </button>

            {/* 5. Blue Button: روزنامچه جامع رویدادها و تراکنش‌ها */}
            <button
              type="button"
              id="dashboard-btn-journal-quick"
              onClick={() => {
                setActiveTab('journal');
                setSubFilter('all');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer active:scale-95 group"
              title="مشاهده روزنامچه جامع رویدادها و تراکنش‌ها"
            >
              <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>روزنامچه جامع</span>
            </button>
          </div>
        </div>

        {/* Bottom: Search Input Box */}
        <div className="relative">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                id="dashboard-search-input"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="نام مشتری، صراف یا کد حساب را بنویسید (مثال: حاجی موسی، احمد رضایی)..."
                className="w-full bg-[#F8FAFC] hover:bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 px-4 py-3 pl-10 rounded-xl border border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition cursor-pointer"
                  title="پاک کردن"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>

            {/* Direct Enter to Account Button */}
            <button
              type="button"
              id="dashboard-btn-open-account"
              onClick={() => handleQuickOpenAccount()}
              disabled={searchResults.length === 0}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer ${
                searchResults.length > 0
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
              title="ورود مستقیم و سریع به حساب و کاردکس مشتری بدون خروج از صفحه"
            >
              <User className="w-4 h-4" />
              <span>ورود مستقیم به حساب مشتری</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Search Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-2 space-y-1 divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>نتایج جستجوی حساب مشتریان ({searchResults.length} مورد)</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                  کلید Enter یا کلیک جهت ورود مستقیم به حساب
                </span>
              </div>
              {searchResults.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {searchResults.map((party, idx) => {
                    const isSelected = idx === selectedIndex;
                    const balanceAfn = party.balanceAFN || 0;
                    const balanceUsd = party.balanceUSD || 0;

                    return (
                      <div
                        key={party.id}
                        onClick={() => handleQuickOpenAccount(party)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                          isSelected ? 'bg-blue-50/90 border border-blue-200 shadow-2xs' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                            {party.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{party.name}</span>
                              {party.code && (
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  کد: {party.code}
                                </span>
                              )}
                              {party.groupName && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {party.groupName}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              {party.phone && <span>تلفن: {party.phone}</span>}
                              {party.company && <span>شرکت: {party.company}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left font-mono text-xs flex flex-col items-end">
                            <span className={balanceAfn < 0 ? 'text-rose-600 font-bold' : balanceAfn > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                              {formatNumber(Math.abs(balanceAfn))} AFN {balanceAfn < 0 ? '(بدهکار)' : balanceAfn > 0 ? '(طلبکار)' : '(تسویه)'}
                            </span>
                            <span className={balanceUsd < 0 ? 'text-rose-600 font-bold' : balanceUsd > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                              ${formatNumber(Math.abs(balanceUsd))} {balanceUsd < 0 ? '(بدهکار)' : balanceUsd > 0 ? '(طلبکار)' : '(تسویه)'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickOpenAccount(party);
                            }}
                            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[11px] font-bold shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                            title="ورود به حساب مشتری"
                          >
                            <span>ورود به حساب</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  مشتری یا حسابی با مشخصات «{searchQuery}» یافت نشد.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 3. FOUR TOP METRIC CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 (Rightmost): فروش کل ماه جاری */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">فروش کل ماه جاری</span>
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xs font-bold text-slate-500">AFN</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatNumber(currentMonthSalesAFN)}
              </span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {invoices.filter(i => i.type === 'sell').length} فاکتور فروش ثبت‌شده
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 (Second from right): تنوع کالا در سیستم (کلیک جهت هدایت به بخش کالاها) */}
        <div
          onClick={() => setActiveTab('products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
          title="مشاهده و مدیریت لیست کالاها و اجناس"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition">تنوع کالا در سیستم</span>
            <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {products.length}
              </span>
              <span className="text-xs font-bold text-slate-500 font-sans mr-1">قلم</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                {products.length === 0 ? 'هیچ کالایی ثبت نشده' : 'مشاهده لیست اقلام'}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-[-2px] transition">
                <span>لیست اجناس</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial Health / Net Summary */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
          title="مشاهده گزارش سود و زیان (P&L)"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-700 transition">
              سود ناخالص دوره ({baseCurrency.code})
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xs font-bold text-slate-500">{baseCurrency.symbol || baseCurrency.code}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatNumber(currentMonthGrossProfitBase)}
              </span>
            </div>
            <p className="text-[11px] text-indigo-600 mt-2 font-medium">
              محاسبه به ارز مبنا: {baseCurrency.name}
            </p>
          </div>
        </div>

        {/* Card 4 (Leftmost): تعداد گدام‌های فعال (کلیک جهت هدایت به گدام‌ها) */}
        <div
          onClick={() => setActiveTab('warehouses')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
          title="مشاهده وضعیت گدام‌ها و موجودی کالا"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 group-hover:text-amber-700 transition">تعداد گدام‌های فعال</span>
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
              <WarehouseIcon className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {warehouses.length}
              </span>
              <span className="text-xs font-bold text-slate-500 font-sans mr-1">گدام</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                {warehouses.length === 0 ? 'هیچ گدامی تعریف نشده' : 'نظارت بر فیزیک کالاها'}
              </span>
              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5 group-hover:translate-x-[-2px] transition">
                <span>بخش گدام‌ها</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 3.5. RECHARTS COMPARATIVE BAR CHART & CASH BALANCE STATUS ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Main Chart: نمودار میله‌ای مقایسه‌ای فروش و خرید ماهانه (8 Cols) */}
        <div className="lg:col-span-8 min-w-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>نمودار مقایسه‌ای فروش و خرید ماهانه</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    تحلیل Recharts
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  مقایسه حجم مالی فروشات و خرید اجناس به تفکیک ماه‌های سال
                </p>
              </div>
            </div>

            {/* Chart Filters & Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Currency Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setChartCurrency('BASE')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    chartCurrency === 'BASE'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  ارز مبنا ({baseCurrency.code})
                </button>
                <button
                  type="button"
                  onClick={() => setChartCurrency('USD')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    chartCurrency === 'USD'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  دلار ($)
                </button>
                <button
                  type="button"
                  onClick={() => setChartCurrency('AFN')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    chartCurrency === 'AFN'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  افغانی (؋)
                </button>
              </div>

              {/* Period Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setChartPeriod('12m')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    chartPeriod === '12m' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  کل سال (۱۲ ماه)
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod('6m')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    chartPeriod === '6m' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  ۶ ماه اخیر
                </button>
              </div>
            </div>
          </div>

          {/* Responsive Recharts Bar Chart Container */}
          <div className="w-full h-72 min-h-[288px] min-w-0 pt-2 select-none relative" dir="ltr">
            {/* If no transactions exist in the dataset, display a helpful guide overlay */}
            {!monthlyChartData.some(d => d.sales > 0 || d.purchases > 0) && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] rounded-xl p-4 text-center"
                dir="rtl"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 shadow-2xs">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  هنوز فاکتور فروش یا خریدی برای این بازه زمانی ثبت نشده است
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-3.5 leading-relaxed">
                  به محض صدور فاکتور جدید در بخش فروش یا خرید، ستون‌های آماری ماهانه به‌صورت خودکار در این بخش رسم می‌شوند.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_sale')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت فاکتور فروش جدید</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_purchase')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت فاکتور خرید</span>
                  </button>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <BarChart
                data={monthlyChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  tickFormatter={val => formatNumber(val)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      const currLabel =
                        chartCurrency === 'USD'
                          ? '$'
                          : chartCurrency === 'AFN'
                          ? 'AFN'
                          : baseCurrency.code;
                      return (
                        <div
                          className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700 shadow-xl text-xs space-y-2 font-sans select-none min-w-[200px]"
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                            <span className="font-bold text-slate-200">ماه {label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {data?.salesCount || 0} فروش | {data?.purchasesCount || 0} خرید
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {payload.map((entry: any, idx: number) => (
                              <div
                                key={`tooltip-${idx}`}
                                className="flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                                </div>
                                <span
                                  className="font-mono font-black text-left"
                                  style={{ color: entry.color }}
                                >
                                  {formatNumber(entry.value)} {currLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 700 }}
                  formatter={value => (
                    <span className="text-slate-700 font-sans text-xs">{value}</span>
                  )}
                />
                <Bar
                  dataKey="sales"
                  name="مجموع فروشات"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={34}
                />
                <Bar
                  dataKey="purchases"
                  name="مجموع خریدها"
                  fill="#2563EB"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span>مجموع فروشات دوره:</span>
                <span className="font-mono font-black">
                  {formatNumber(monthlyChartData.reduce((acc, d) => acc + d.sales, 0))}
                </span>
              </span>
              <span className="flex items-center gap-1 text-blue-700 font-bold">
                <span>مجموع خرید دوره:</span>
                <span className="font-mono font-black">
                  {formatNumber(monthlyChartData.reduce((acc, d) => acc + d.purchases, 0))}
                </span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              مبنای تبدیل: ۱ دلار = {cashRegister.usdToAfnRate} افغانی
            </span>
          </div>
        </div>

        {/* Right / Companion Panel: وضعیت موجودی نقد اصلی (دلار و افغانی) (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-start justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>وضعیت موجودی نقد اصلی</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                موجودی زنده صندوق‌های دلاری و افغانی شرکت
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('cash')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition cursor-pointer"
            >
              <span>مدیریت صندوق</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cash Balance Status Cards: USD & AFN */}
          <div className="space-y-3">
            {/* Card 1: نقدینگی دلار ($) */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                    $
                  </div>
                  <span className="text-xs font-bold text-slate-700">موجودی کل دلاری (USD)</span>
                </div>
                <span className="text-[10px] bg-emerald-600/10 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {cashAccounts.filter(a => a.currency === 'USD').length} صندوق
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-mono font-black text-xl text-emerald-900 dir-ltr text-right">
                  $ {formatNumber(totalCashUSD)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium font-mono">
                  معادل: {formatNumber(Math.round(totalCashUSD * (cashRegister.usdToAfnRate || 65)))} AFN
                </span>
              </div>
            </div>

            {/* Card 2: نقدینگی افغانی (؋) */}
            <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-blue-100/30 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ؋
                  </div>
                  <span className="text-xs font-bold text-slate-700">موجودی کل افغانی (AFN)</span>
                </div>
                <span className="text-[10px] bg-blue-600/10 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {cashAccounts.filter(a => a.currency === 'AFN').length} صندوق
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-mono font-black text-xl text-blue-900 dir-ltr text-right">
                  AFN {formatNumber(totalCashAFN)}
                </span>
                <span className="text-[10px] text-blue-700 font-medium font-mono">
                  معادل: $ {formatNumber(Math.round(totalCashAFN / (cashRegister.usdToAfnRate || 65)))}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Liquidity Split Progress Bar */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-700">دلاری: {usdPercent}٪</span>
              <span className="text-slate-500 text-[10px]">نسبت ترکیب نقدینگی کل</span>
              <span className="text-blue-700">افغانی: {afnPercent}٪</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${usdPercent}%` }}
                title={`دلاری: ${usdPercent}%`}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${afnPercent}%` }}
                title={`افغانی: ${afnPercent}%`}
              />
            </div>
          </div>

          {/* Quick Cash Registers List */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400">تفکیک صندوق‌های اصلی:</div>
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {cashAccounts.map(account => (
                <div
                  key={account.id}
                  onClick={() => {
                    if (onSelectCashAccount) {
                      onSelectCashAccount(account.id);
                    } else {
                      setActiveTab('cash');
                    }
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-xs cursor-pointer transition"
                  title="مشاهده گردش و تراکنش‌های این صندوق"
                >
                  <span className="text-slate-700 font-medium truncate max-w-[140px]">
                    {account.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-left">
                    <span
                      className={`font-bold ${
                        account.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700'
                      }`}
                    >
                      {formatNumber(account.balance)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {account.currency === 'USD' ? '$' : 'AFN'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 4. TWO WIDE DEBTORS & CREDITORS CARDS ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card Right: مجموع طلبکاری‌ها (طلب‌های ما) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                مجموع طلبکاری‌ها (طلب‌های ما)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                کل مبالغی که باید از طرف‌حساب‌ها و مشتریان دریافت کنیم
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block mb-1">طلب بر اساس ارز (USD):</span>
              <span className="font-mono font-black text-base md:text-lg text-slate-900 dir-ltr text-right block">
                $ {formatNumber(totalCustomerDebtUSD)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">طلب بر اساس ارز (AFN):</span>
              <span className="font-mono font-black text-base md:text-lg text-slate-900 dir-ltr text-right block">
                AFN {formatNumber(totalCustomerDebtAFN)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Left: مجموع بدهکاری‌ها (بدهی‌های ما) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                مجموع بدهکاری‌ها (بدهی‌های ما)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                کل تعهدات مالی و مبالغی که باید به تامین‌کنندگان پرداخت کنیم
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block mb-1">بدهی بر اساس ارز (USD):</span>
              <span className="font-mono font-black text-base md:text-lg text-slate-900 dir-ltr text-right block">
                $ {formatNumber(totalSupplierPayableUSD)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">بدهی بر اساس ارز (AFN):</span>
              <span className="font-mono font-black text-base md:text-lg text-slate-900 dir-ltr text-right block">
                AFN {formatNumber(totalSupplierPayableAFN)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 5. صندوق‌ها و حساب‌های فعال (کلیک مستقیم به ریز تراکنش‌ها) ---------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-bold text-xs md:text-sm text-slate-800">
              صندوق‌ها و حساب‌های فعال ({cashAccounts.length} صندوق)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            کلیک روی هر صندوق جهت ورود مستقیم به ریز تراکنش‌ها
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashAccounts.map(account => {
            const isUSD = account.currency === 'USD';
            return (
              <div
                key={account.id}
                onClick={() => {
                  if (onSelectCashAccount) {
                    onSelectCashAccount(account.id);
                  } else {
                    setActiveTab('cash');
                  }
                }}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 p-5 shadow-2xs hover:shadow-md transition-all text-center flex flex-col justify-between cursor-pointer group"
                title={`کلیک کنید تا مستقیماً به دفتر ریزتراکنش‌های ${account.name} بروید`}
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors flex items-center justify-center shadow-2xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1 group-hover:text-[#2563EB] transition">
                    {account.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 block mb-1">موجودی فعلی:</span>
                  <span className="font-mono font-black text-lg text-slate-900 block dir-ltr">
                    {isUSD ? `$ ${formatNumber(account.balance)}` : `AFN ${formatNumber(account.balance)}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (onSelectCashAccount) {
                      onSelectCashAccount(account.id);
                    } else {
                      setActiveTab('cash');
                    }
                  }}
                  className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563EB] group-hover:text-blue-800 transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>مشاهده ریز تراکنش‌ها</span>
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:translate-x-[-2px] transition" />
                </button>
              </div>
            );
          })}
          {cashAccounts.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400">
              <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">هیچ صندوق فعالی ثبت نشده است</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 6. وضعیت گدام‌ها (انبارها) ---------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="font-bold text-xs md:text-sm text-slate-800">
              وضعیت گدام‌ها (انبارها)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className="text-xs text-[#2563EB] hover:text-blue-800 font-bold cursor-pointer flex items-center gap-0.5"
          >
            <span>مشاهده همه گدام‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => {
            const isConsignment = w.type === 'consignment_in' || w.type === 'consignment_out' || w.id === 'wh-2';
            return (
              <div
                key={w.id}
                onClick={() => setActiveTab(isConsignment ? 'consignment' : 'warehouses')}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 p-5 shadow-2xs hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer group"
                title={`مشاهده کالاهای موجود در ${w.name}`}
              >
                <div className="absolute top-4 right-4">
                  <span className="bg-[#2563EB] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                    کد {w.code || w.id}
                  </span>
                </div>

                <div className="flex justify-center my-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center justify-center shadow-2xs">
                    <WarehouseIcon className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-amber-700 transition">
                    {w.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>نقطه آدرس: {w.location || 'هرات'}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setActiveTab(isConsignment ? 'consignment' : 'warehouses');
                  }}
                  className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563EB] hover:text-blue-800 transition text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>مشاهده موجودی کالاها</span>
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:translate-x-[-2px] transition" />
                </button>
              </div>
            );
          })}
          {warehouses.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
              <WarehouseIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">هیچ گدامی در سیستم تعریف نشده است</p>
              <button
                type="button"
                onClick={() => setActiveTab('warehouses')}
                className="mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-amber-600 transition"
              >
                ایجاد گدام جدید
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 8. DETAILED CUSTOMER / PARTY CARDEX & STATEMENT MODAL */}
      <PartyCardexModal
        party={selectedPartyForCardex}
        isOpen={!!selectedPartyForCardex}
        onClose={() => setSelectedPartyForCardex(null)}
        onViewInvoice={onViewInvoice}
        onOpenPaymentModal={onOpenPaymentModal}
      />

      {/* 9. MODAL: صفحه و گزینه‌های ثبت عاید و هزینه (هدایت مستقیم) */}
      {isIncomeExpenseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans overflow-y-auto"
          dir="rtl"
          onClick={() => setIsIncomeExpenseModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 max-w-2xl w-full space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span>صفحه و گزینه‌های ثبت عاید و هزینه</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                      هدایت مستقیم
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    لطفاً مشخص نمایید قصد ثبت عاید (درآمد متفرقه) یا ثبت مصرف (هزینه جاری) را دارید:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIncomeExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Two Action Option Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: ثبت عاید و درآمد جدید (Incomes) */}
              <div className="rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/40 p-4 flex flex-col justify-between space-y-4 hover:border-emerald-400 hover:bg-emerald-50/70 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      درآمدهای متفرقه
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      ثبت عاید و درآمد جدید
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                      فروش بوجی و کیسه خالی، کمیسیون، کرایه موقت انبار، پورتاژ و خدمات بارگیری، سود تسعیر اسعار و سایر عواید نقدی.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    id="modal-btn-direct-new-income"
                    onClick={() => {
                      setIsIncomeExpenseModalOpen(false);
                      setSubFilter?.('create');
                      setActiveTab('incomes');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-2xs transition cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ورود مستقیم به فرم ثبت عاید</span>
                  </button>

                  <button
                    type="button"
                    id="modal-btn-view-incomes-list"
                    onClick={() => {
                      setIsIncomeExpenseModalOpen(false);
                      setSubFilter?.('all');
                      setActiveTab('incomes');
                    }}
                    className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/80 transition cursor-pointer"
                  >
                    <span>مشاهده دفتر و لیست عواید</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option 2: ثبت مصرف و هزینه جدید (Expenses) */}
              <div className="rounded-2xl border-2 border-rose-200/80 bg-rose-50/40 p-4 flex flex-col justify-between space-y-4 hover:border-rose-400 hover:bg-rose-50/70 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                      مصارف جاری و اداری
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      ثبت مصرف و هزینه جدید
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                      کرایه دفتر و گدام، معاشات و حقوق پرسونل، قبوض برق و انترنت، بارگیری و ترانسپورت، ملزومات و مصارف روزمره.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    id="modal-btn-direct-new-expense"
                    onClick={() => {
                      setIsIncomeExpenseModalOpen(false);
                      setSubFilter?.('create');
                      setActiveTab('expenses');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-2xs transition cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ورود مستقیم به فرم ثبت هزینه</span>
                  </button>

                  <button
                    type="button"
                    id="modal-btn-view-expenses-list"
                    onClick={() => {
                      setIsIncomeExpenseModalOpen(false);
                      setSubFilter?.('all');
                      setActiveTab('expenses');
                    }}
                    className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200/80 transition cursor-pointer"
                  >
                    <span>مشاهده دفتر و لیست هزینه‌ها</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Status Bar & Close */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>عواید ثبت‌شده:</span>
                  <strong className="font-mono text-slate-800">{incomes.length} مورد</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>هزینه‌های ثبت‌شده:</span>
                  <strong className="font-mono text-slate-800">{expenses.length} مورد</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsIncomeExpenseModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                انصراف و بازگشت به داشبورد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
