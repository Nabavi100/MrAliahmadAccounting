import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, FinancialTransaction } from '../types';
import { formatNumber, formatCurrency, getPersianDate, cleanCardexDescription } from '../utils/formatters';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Printer,
  Trash2,
  Calendar,
  Wallet,
  TrendingUp,
  User,
  Filter,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileSpreadsheet,
  Edit2,
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';

interface ReceiptsListViewProps {
  onNewReceipt: () => void;
  onCashTransfer?: () => void;
  onViewInvoice?: (id: string) => void;
}

export const ReceiptsListView: React.FC<ReceiptsListViewProps> = ({
  onNewReceipt,
  onCashTransfer,
}) => {
  const { transactions, parties, deleteTransaction, openPrintModal, cashAccounts, companySettings } = useAccounting();

  // Standard Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [selectedCashAccount, setSelectedCashAccount] = useState<string>('all');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);

  // Quick date presets handler
  const handleDatePreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    setDatePreset(preset);
    const today = getPersianDate();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      // approximate 7 days window
      const parts = today.split('/');
      if (parts.length === 3) {
        const d = Math.max(1, parseInt(parts[2], 10) - 7);
        const start = `${parts[0]}/${parts[1]}/${String(d).padStart(2, '0')}`;
        setStartDate(start);
        setEndDate(today);
      }
    } else if (preset === '30days') {
      const parts = today.split('/');
      if (parts.length === 3) {
        const m = Math.max(1, parseInt(parts[1], 10) - 1);
        const start = `${parts[0]}/${String(m).padStart(2, '0')}/01`;
        setStartDate(start);
        setEndDate(today);
      }
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCurrencyFilter('all');
    setSelectedCashAccount('all');
    setSelectedPartyId('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    currencyFilter !== 'all' ||
    selectedCashAccount !== 'all' ||
    selectedPartyId !== 'all' ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount
  );

  // Filter only receipts
  const receipts = useMemo(() => {
    return transactions.filter(t => t.type === 'receive_payment');
  }, [transactions]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(t => {
      // Currency filter
      if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;

      // Cash Account filter
      if (selectedCashAccount !== 'all' && t.cashRegister !== selectedCashAccount) return false;

      // Party filter
      if (selectedPartyId !== 'all' && t.partyId !== selectedPartyId) return false;

      // Date range filter
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Amount range filter
      const minVal = parseFloat(minAmount);
      if (!isNaN(minVal) && t.amount < minVal) return false;
      const maxVal = parseFloat(maxAmount);
      if (!isNaN(maxVal) && t.amount > maxVal) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = (t.transactionNumber || '').toLowerCase().includes(q);
        const matchParty = (t.partyName || '').toLowerCase().includes(q);
        const matchPhone = (t.partyPhone || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchNum && !matchParty && !matchPhone && !matchDesc) return false;
      }

      return true;
    });
  }, [receipts, currencyFilter, selectedCashAccount, selectedPartyId, startDate, endDate, minAmount, maxAmount, searchQuery]);

  // Aggregate metrics based on filtered results
  const metrics = useMemo(() => {
    let totalAFN = 0;
    let totalUSD = 0;

    filteredReceipts.forEach(t => {
      if (t.currency === 'AFN') {
        totalAFN += t.amount;
      } else {
        totalUSD += t.amount;
      }
    });

    return {
      totalAFN,
      totalUSD,
      count: filteredReceipts.length,
      allCount: receipts.length,
    };
  }, [filteredReceipts, receipts.length]);

  const handleDelete = (id: string, num: string) => {
    if (window.confirm(`آیا از حذف رسید دریافت شماره ${num} اطمینان دارید؟ موجودی صندوق و مانده حساب مشتری به حالت قبل برمی‌گردد.`)) {
      deleteTransaction(id);
    }
  };

  const handlePrint = (tx: FinancialTransaction) => {
    openPrintModal({
      type: 'transaction',
      transaction: tx,
    });
  };

  const handlePrintReport = () => {
    openPrintModal({
      type: 'report',
      title: 'گزارش رسمی و جامع اسناد دریافت صندوق (رسیدات)',
      subtitle: `فیلتر شده بر اساس معیارهای جستجو • تعداد اسناد: ${filteredReceipts.length} عدد • تاریخ تهیه: ${getPersianDate()}`,
      customContent: (
        <div className="space-y-4 text-slate-800">
          <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
            <div>
              <span className="text-slate-500 block">تعداد اسناد دریافت:</span>
              <strong className="text-sm font-black text-slate-900">{metrics.count} سند</strong>
            </div>
            <div>
              <span className="text-slate-500 block">مجموع دریافتی افغانی:</span>
              <strong className="text-sm font-black text-emerald-800 font-mono">{formatNumber(metrics.totalAFN)} ؋</strong>
            </div>
            <div>
              <span className="text-slate-500 block">مجموع دریافتی دالری:</span>
              <strong className="text-sm font-black text-emerald-800 font-mono">${formatNumber(metrics.totalUSD)}</strong>
            </div>
          </div>

          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px]">
                <th className="p-2 border border-slate-700 text-center w-10">ردیف</th>
                <th className="p-2 border border-slate-700 text-center">شماره رسید</th>
                <th className="p-2 border border-slate-700 text-center">تاریخ</th>
                <th className="p-2 border border-slate-700">طرف حساب (مشتری)</th>
                <th className="p-2 border border-slate-700">شرح رسید</th>
                <th className="p-2 border border-slate-700 text-center">صندوق واریزی</th>
                <th className="p-2 border border-slate-700 text-center">مبلغ دریافتی</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((tx, idx) => {
                const targetCash = cashAccounts.find(a => a.id === tx.cashRegister);
                return (
                  <tr key={tx.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-800">{tx.transactionNumber}</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">{tx.date}</td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-900">{tx.partyName}</td>
                    <td className="p-2 border border-slate-200 text-slate-600">{tx.description}</td>
                    <td className="p-2 border border-slate-200 text-center">{targetCash?.name || 'صندوق نقدی'}</td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-black text-emerald-700">
                      {formatNumber(tx.amount)} {tx.currency === 'AFN' ? '؋' : '$'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">لیست دریافت‌ها (رسیدات صندوق)</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              مشاهده تمامی مبالغ نقدی دریافتی از خریداران و مشتریان، واریزی‌های صرافی و تسویه بدهی‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="چاپ گزارش لیست فیلتر شده رسیدات"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">چاپ گزارش لیست</span>
          </button>

          {onCashTransfer && (
            <button
              id="btn-goto-cash-transfer-from-receipts"
              type="button"
              onClick={onCashTransfer}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs cursor-pointer shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>عملیه صندوق به صندوق</span>
            </button>
          )}
          <button
            id="btn-goto-new-receipt"
            type="button"
            onClick={onNewReceipt}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت سند دریافت جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Received AFN */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>مجموع دریافتی‌های افغانی {hasActiveFilters ? '(فیلتر شده)' : ''}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {formatNumber(metrics.totalAFN)} <span className="text-xs text-emerald-800">؋</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            واریز شده به صندوق‌های افغانی
          </div>
        </div>

        {/* Total Received USD */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>مجموع دریافتی‌های دالری {hasActiveFilters ? '(فیلتر شده)' : ''}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            ${formatNumber(metrics.totalUSD)} <span className="text-xs text-emerald-800">دالر</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            واریز شده به صندوق‌های دالری
          </div>
        </div>

        {/* Total Receipts Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>تعداد اسناد دریافت {hasActiveFilters ? `(${metrics.count} از ${metrics.allCount})` : ''}</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {metrics.count} <span className="text-xs text-slate-500">رسید</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            ثبت رسمی در دفاتر مالی
          </div>
        </div>
      </div>

      {/* Standard Accounting Filters Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو با شماره رسید، نام پرداخت‌کننده یا شرح..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
            />
          </div>

          {/* Filters Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setCurrencyFilter('all')}
                className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              >
                همه ارزها
              </button>
              <button
                type="button"
                onClick={() => setCurrencyFilter('AFN')}
                className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'AFN' ? 'bg-white text-emerald-700 shadow-2xs' : 'hover:text-slate-900'}`}
              >
                افغانی
              </button>
              <button
                type="button"
                onClick={() => setCurrencyFilter('USD')}
                className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'USD' ? 'bg-white text-emerald-700 shadow-2xs' : 'hover:text-slate-900'}`}
              >
                دالر
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
              <span>فیلترهای استاندارد</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              )}
              {showAdvancedFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200 cursor-pointer"
                title="پاک کردن تمام فیلترها"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Box */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* 1. Date range presets and inputs */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>بازه تاریخی اسناد دریافت (شمسی):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="از تاریخ (مثلاً 1405/01/01)"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setDatePreset('all');
                  }}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                />
                <span className="text-slate-400">تا</span>
                <input
                  type="text"
                  placeholder="تا تاریخ (مثلاً 1405/06/30)"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setDatePreset('all');
                  }}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleDatePreset('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${datePreset === 'all' && !startDate && !endDate ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  همه تاریخ‌ها
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('today')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${datePreset === 'today' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  امروز
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('7days')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${datePreset === '7days' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  ۷ روز اخیر
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('30days')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${datePreset === '30days' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  یک ماه اخیر
                </button>
              </div>
            </div>

            {/* 2. Cash Account Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                <span>صندوق واریزی:</span>
              </label>
              <select
                value={selectedCashAccount}
                onChange={e => setSelectedCashAccount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="all">همه صندوق‌ها</option>
                {cashAccounts.map(ca => (
                  <option key={ca.id} value={ca.id}>
                    {ca.name} ({ca.currency === 'AFN' ? 'افغانی' : 'دالر'})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Party Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>طرف حساب (مشتری):</span>
              </label>
              <select
                value={selectedPartyId}
                onChange={e => setSelectedPartyId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="all">همه طرف‌های حساب</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Amount Range Filter */}
            <div className="space-y-1 sm:col-span-2 md:col-span-4 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>فیلتر بر اساس بازه مبلغ:</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="حداقل مبلغ..."
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-32 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <span className="text-slate-400">الی</span>
                  <input
                    type="number"
                    placeholder="حداکثر مبلغ..."
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-32 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
                {hasActiveFilters && (
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    نمایش {filteredReceipts.length} سند دریافت از مجموع {receipts.length} سند
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600">
                <th className="py-3 px-4">شماره رسید</th>
                <th className="py-3 px-4">تاریخ و زمان</th>
                <th className="py-3 px-4">مشتری / پرداخت‌کننده</th>
                <th className="py-3 px-4">شرح سند</th>
                <th className="py-3 px-4">مبلغ کسر از حساب</th>
                <th className="py-3 px-4">صندوق واریزی</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    سند دریافتی با مشخصات انتخاب‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map(tx => {
                  const targetCash = cashAccounts.find(a => a.id === tx.cashRegister);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        <div>{tx.date}</div>
                        {tx.issueTime && <div className="text-slate-400">{tx.issueTime}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{tx.partyName || 'شخص ناشناس'}</div>
                        {tx.partyPhone && (
                          <div className="text-[10px] font-mono text-slate-400 font-normal">
                            {tx.partyPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm" title={tx.description}>
                        {cleanCardexDescription(tx.description, 40)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600">
                        {formatNumber(tx.amount)} {tx.currency === 'AFN' ? '؋' : '$'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800">
                          {targetCash?.name || 'صندوق نقدی'}
                          {tx.isExchange && tx.cashAmount && (
                            <span className="text-emerald-700 font-mono mr-1">
                              ({formatNumber(tx.cashAmount)} {tx.cashCurrency})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="ویرایش مجدد رسید"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(tx)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="چاپ رسید رسمی"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id, tx.transactionNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف رسید"
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
          </table>
        </div>
      </div>

      {/* Re-edit Receipt Modal */}
      {editingTx && (
        <PaymentModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          editingTransaction={editingTx}
          initialType="receive_payment"
        />
      )}
    </div>
  );
};
