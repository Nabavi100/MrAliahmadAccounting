import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { CashRegisterAccount, FinancialTransaction } from '../types';
import { isDateInRange } from '../utils/formatters';
import { Printer, ArrowRight, Filter, X, Search, Calendar, ChevronDown } from 'lucide-react';

interface CashRegisterLedgerViewProps {
  account: CashRegisterAccount;
  onBack: () => void;
  onSwitchAccount?: (account: CashRegisterAccount) => void;
}

// Number and currency formatter matching the software screenshot
// Examples: 'USD 40,042.00-', 'USD 15,198.00-', 'AFN 427,340.00', 'AFN 170,123.00', 'USD 3,000.00'
export const formatLedgerAmount = (
  amount: number,
  currency: string,
  options?: { showMinusAtEnd?: boolean; hideCurrency?: boolean }
): string => {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);

  const currCode = currency === 'AFN' ? 'AFN' : currency === 'USD' ? 'USD' : currency;

  if (options?.hideCurrency) {
    if (isNegative) {
      return options?.showMinusAtEnd !== false ? `${formatted}-` : `-${formatted}`;
    }
    return formatted;
  }

  if (isNegative) {
    return options?.showMinusAtEnd !== false ? `${currCode} ${formatted}-` : `-${currCode} ${formatted}`;
  }
  return `${currCode} ${formatted}`;
};

export const CashRegisterLedgerView: React.FC<CashRegisterLedgerViewProps> = ({
  account,
  onBack,
  onSwitchAccount,
}) => {
  const { transactions, cashAccounts, openPrintModal, companySettings } = useAccounting();

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperationType, setSelectedOperationType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // 1. Filter transactions related to this cash register
  const accountTransactions = useMemo(() => {
    return transactions.filter(t => {
      const isDirectMatch = t.cashRegister === account.id;
      const isTransferMatch = t.fromCashRegister === account.id || t.toCashRegister === account.id;
      const isLegacyMatch =
        (account.id === 'afn_cash' && t.currency === 'AFN' && !t.cashRegister) ||
        (account.id === 'usd_cash' && t.currency === 'USD' && !t.cashRegister);

      return isDirectMatch || isTransferMatch || isLegacyMatch;
    });
  }, [transactions, account.id, account.currency]);

  // 2. Compute ledger line items with running balance (کاردکس)
  const ledgerRows = useMemo(() => {
    // Initial balance row
    const initialBal = account.initialBalance || 0;

    let runningBal = initialBal;

    const rows: Array<{
      id: string;
      rowNumber: number;
      date: string;
      operationType: string;
      operationBadgeClass: string;
      partyName: string;
      inAmount: number;
      outAmount: number;
      runningBalance: number;
      description: string;
      rawTransaction?: FinancialTransaction;
    }> = [];

    // Sort transactions by date and creation
    const sorted = [...accountTransactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.issueTime || '').localeCompare(b.issueTime || '');
    });

    sorted.forEach((t, idx) => {
      let inAmt = 0;
      let outAmt = 0;
      let opType = 'عملیات مالی';
      let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
      let party = t.partyName || t.description || 'طرف حساب نامشخص';
      let desc = t.description || '';

      if (t.type === 'receive_payment') {
        inAmt = t.isExchange && t.cashAmount ? t.cashAmount : t.amount;
        if (desc.includes('فاکتور فروش') || desc.includes('فروش')) {
          opType = 'دریافت فاکتور فروش';
          badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300';
        } else {
          opType = 'دریافت از مشتری';
          badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300';
        }
      } else if (t.type === 'make_payment') {
        outAmt = t.isExchange && t.cashAmount ? t.cashAmount : t.amount;
        if (desc.includes('فاکتور خرید') || desc.includes('خرید')) {
          opType = 'پرداخت فاکتور خرید';
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-300';
        } else {
          opType = 'پرداخت به مشتری';
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-300';
        }
      } else if (t.type === 'expense') {
        outAmt = t.isExchange && t.cashAmount ? t.cashAmount : t.amount;
        opType = 'هزینه و مصارف';
        badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
      } else if (t.type === 'cash_transfer') {
        if (t.toCashRegister === account.id) {
          inAmt = t.amount;
          opType = 'انتقال ورودی (صندوق)';
          badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-300';
          party = 'انتقال بین‌صندوقی';
        } else if (t.fromCashRegister === account.id) {
          outAmt = t.amount;
          opType = 'انتقال خروجی (صندوق)';
          badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-300';
          party = 'انتقال بین‌صندوقی';
        }
      } else if (t.type === 'currency_exchange') {
        if (t.toCashRegister === account.id || (!t.toCashRegister && t.targetCurrency === account.currency)) {
          inAmt = t.targetAmount || 0;
          opType = 'انتقال ورودی (صندوق)';
          badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-300';
          party = 'انتقال بین‌صندوقی';
        } else if (t.fromCashRegister === account.id || (!t.fromCashRegister && t.currency === account.currency)) {
          outAmt = t.amount;
          opType = 'انتقال خروجی (صندوق)';
          badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-300';
          party = 'انتقال بین‌صندوقی';
        }
      }

      runningBal = runningBal + inAmt - outAmt;

      rows.push({
        id: t.id,
        rowNumber: idx + 2,
        date: t.date || '---',
        operationType: opType,
        operationBadgeClass: badgeClass,
        partyName: party,
        inAmount: inAmt,
        outAmount: outAmt,
        runningBalance: runningBal,
        description: desc,
        rawTransaction: t,
      });
    });

    return rows;
  }, [accountTransactions, account.initialBalance, account.id, account.currency]);

  // 3. Filter the rows by search and filters
  const filteredRows = useMemo(() => {
    return ledgerRows.filter(row => {
      // Operation Type Filter
      if (selectedOperationType !== 'all') {
        if (selectedOperationType === 'opening' && row.operationType !== 'تراز افتتاحیه') return false;
        if (selectedOperationType === 'receive' && !row.operationType.includes('دریافت')) return false;
        if (selectedOperationType === 'payment' && !row.operationType.includes('پرداخت')) return false;
        if (selectedOperationType === 'transfer' && !row.operationType.includes('انتقال')) return false;
        if (selectedOperationType === 'expense' && !row.operationType.includes('هزینه')) return false;
        if (selectedOperationType === 'sale_receipt' && row.operationType !== 'دریافت فاکتور فروش') return false;
      }

      // Date Range Filter
      if (row.date !== '---' && !isDateInRange(row.date, fromDate, toDate)) return false;

      // Text Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchParty = row.partyName.toLowerCase().includes(q);
        const matchDesc = row.description.toLowerCase().includes(q);
        const matchOp = row.operationType.toLowerCase().includes(q);
        return matchParty || matchDesc || matchOp;
      }

      return true;
    });
  }, [ledgerRows, selectedOperationType, fromDate, toDate, searchQuery]);

  // Current final balance
  const currentFinalBalance = account.balance !== undefined ? account.balance : 0;
  const initialBalance = account.initialBalance !== undefined ? account.initialBalance : 0;

  // Print function
  const handlePrint = () => {
    openPrintModal({
      title: `دفتر ریز تراکنش‌های صندوق: ${account.name}`,
      subtitle: `مشاهده کاردکس نقدینگی، مانده ردیف و موجودی افتتاحیه به تفکیک ارز صندوق | تاریخ: ${new Date().toLocaleDateString('fa-AF')}`,
      type: 'financial_report',
      summaryCards: [
        {
          label: 'موجودی اولیه (افتتاحیه واقعی):',
          value: formatLedgerAmount(initialBalance, account.currency),
          color: 'emerald',
        },
        {
          label: 'موجودی فعلی (مانده جاری صندوق):',
          value: formatLedgerAmount(currentFinalBalance, account.currency),
          color: 'blue',
        },
      ],
      tableHeaders: ['ردیف', 'تاریخ', 'نوع عملیات', 'بابت / طرف حساب', 'ورودی (+)', 'خروجی (-)', 'مانده ردیف (کاردکس)', 'توضیحات'],
      tableRows: [
        [
          '1',
          '---',
          'تراز افتتاحیه',
          'موجودی اولیه صندوق',
          '---',
          '---',
          formatLedgerAmount(initialBalance, account.currency),
          'موجودی اولیه صندوق در زمان شروع تراکنش‌ها',
        ],
        ...filteredRows.map(r => [
          String(r.rowNumber),
          r.date,
          r.operationType,
          r.partyName,
          r.inAmount > 0 ? formatLedgerAmount(r.inAmount, account.currency, { showMinusAtEnd: false }) : '---',
          r.outAmount > 0 ? formatLedgerAmount(r.outAmount, account.currency, { showMinusAtEnd: false }) : '---',
          formatLedgerAmount(r.runningBalance, account.currency),
          r.description || '---',
        ]),
      ],
      footerNotes: `مجموع مانده نهایی صندوق (باقیمانده): ${formatLedgerAmount(currentFinalBalance, account.currency)} | صادر شده توسط سیستم حسابداری ${companySettings.name}`,
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Title + Subtitle + Action Buttons) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Right: Title & Subtitle */}
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-800">
              دفتر ریز تراکنش‌های صندوق: <span className="text-blue-600 font-extrabold">{account.name}</span>
            </h1>

            {/* Quick account switch dropdown (if multiple accounts exist) */}
            {onSwitchAccount && cashAccounts.length > 1 && (
              <div className="relative group inline-block">
                <select
                  value={account.id}
                  onChange={e => {
                    const target = cashAccounts.find(a => a.id === e.target.value);
                    if (target) onSwitchAccount(target);
                  }}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-bold outline-none cursor-pointer hover:border-blue-400 transition"
                >
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency === 'AFN' ? 'افغانی' : 'دالر'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده کاردکس نقدینگی، مانده ردیف و موجودی افتتاحیه به تفکیک ارز صندوق
          </p>
        </div>

        {/* Left: Buttons (Print + Return) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>چاپ دفتر صندوق</span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <span>بازگشت</span>
            <span className="font-mono text-sm leading-none">←</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DUAL KPI CARDS (Initial Balance + Current Balance) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: موجودی فعلی (مانده جاری صندوق) - Left in image */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-600 block">موجودی فعلی (مانده جاری صندوق):</span>
            <div className="text-2xl md:text-3xl font-black text-blue-600 font-mono mt-1 tracking-tight">
              {formatLedgerAmount(currentFinalBalance, account.currency)}
            </div>
          </div>

          {/* Smooth curved vertical arc bracket (blue) on right side of card */}
          <div className="flex items-center justify-center pr-2 pl-1">
            <svg className="w-5 h-16 text-blue-500" viewBox="0 0 20 64" fill="none">
              <path
                d="M4 6 C16 18, 16 46, 4 58"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: موجودی اولیه (افتتاحیه واقعی) - Right in image */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-600 block">موجودی اولیه (افتتاحیه واقعی):</span>
            <div className="text-2xl md:text-3xl font-black text-emerald-600 font-mono mt-1 tracking-tight">
              {formatLedgerAmount(initialBalance, account.currency)}
            </div>
          </div>

          {/* Smooth curved vertical arc bracket (green) on right side of card */}
          <div className="flex items-center justify-center pr-2 pl-1">
            <svg className="w-5 h-16 text-emerald-500" viewBox="0 0 20 64" fill="none">
              <path
                d="M4 6 C16 18, 16 46, 4 58"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SMART FILTER & SEARCH CARD */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        {/* Filter Title */}
        <div className="flex items-center justify-end gap-1.5 text-slate-700 font-bold text-xs">
          <span>فیلتر و جستجوی هوشمند تراکنش‌ها</span>
          <Filter className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
        </div>

        {/* 2x2 Grid Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
          {/* Row 1 Left: نوع عملیات مالی */}
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 text-center md:text-center">نوع عملیات مالی</label>
            <div className="relative">
              <select
                value={selectedOperationType}
                onChange={e => setSelectedOperationType(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-blue-400 appearance-none text-center cursor-pointer transition"
              >
                <option value="all">همه تراکنش‌ها</option>
                <option value="receive">دریافت از مشتری / فروش</option>
                <option value="payment">پرداخت به مشتری / خرید</option>
                <option value="sale_receipt">دریافت فاکتور فروش</option>
                <option value="transfer">انتقال بین‌صندوقی</option>
                <option value="expense">هزینه و مصارف</option>
                <option value="opening">تراز افتتاحیه</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Row 1 Right: جستجو در شرح معامله و طرف‌حساب */}
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 text-right">جستجو در شرح معامله و طرف‌حساب</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="مثال: نام مشتری، کرایه، فاکتور..."
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 text-right transition"
            />
          </div>

          {/* Row 2 Left: تا تاریخ (شمسی) */}
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 text-center">تا تاریخ (شمسی)</label>
            <div className="relative">
              <input
                type="text"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                placeholder="همه تاریخ‌ها"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-500 outline-none focus:border-blue-400 text-center transition"
              />
              {toDate ? (
                <button
                  type="button"
                  onClick={() => setToDate('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px] pointer-events-none">
                  ✕
                </div>
              )}
            </div>
          </div>

          {/* Row 2 Right: از تاریخ (شمسی) */}
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 text-center">از تاریخ (شمسی)</label>
            <div className="relative">
              <input
                type="text"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                placeholder="همه تاریخ‌ها"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-500 outline-none focus:border-blue-400 text-center transition"
              />
              {fromDate ? (
                <button
                  type="button"
                  onClick={() => setFromDate('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px] pointer-events-none">
                  ✕
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DETAILED TRANSACTIONS TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200 text-center">
                <th className="py-3.5 px-3 w-14 text-center border-l border-slate-200">ردیف</th>
                <th className="py-3.5 px-4 w-28 text-center border-l border-slate-200">تاریخ</th>
                <th className="py-3.5 px-4 w-36 text-center border-l border-slate-200">نوع عملیات</th>
                <th className="py-3.5 px-5 text-center border-l border-slate-200">بابت / طرف حساب</th>
                <th className="py-3.5 px-4 w-36 text-center border-l border-slate-200">ورودی (+)</th>
                <th className="py-3.5 px-4 w-36 text-center border-l border-slate-200">خروجی (-)</th>
                <th className="py-3.5 px-5 w-44 text-center border-l border-slate-200">مانده ردیف (کاردکس)</th>
                <th className="py-3.5 px-6 text-center">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: تراز افتتاحیه (Opening Balance) */}
              {(selectedOperationType === 'all' || selectedOperationType === 'opening') && (
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800 border-l border-slate-100">
                    1
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 border-l border-slate-100">
                    ---
                  </td>
                  <td className="py-3.5 px-4 text-center border-l border-slate-100">
                    <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-600 border border-slate-300">
                      تراز افتتاحیه
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-slate-800 border-l border-slate-100">
                    موجودی اولیه صندوق
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 border-l border-slate-100">
                    ---
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 border-l border-slate-100">
                    ---
                  </td>
                  <td className="py-3.5 px-5 text-center border-l border-slate-100 font-mono font-bold text-slate-800">
                    <div>{formatLedgerAmount(initialBalance, account.currency)}</div>
                  </td>
                  <td className="py-3.5 px-6 text-center text-slate-500 text-[11px]">
                    موجودی اولیه صندوق در زمان شروع تراکنش‌ها
                  </td>
                </tr>
              )}

              {/* Rows 2..N: Transactions */}
              {filteredRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition">
                  {/* ردیف */}
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800 border-l border-slate-100">
                    {row.rowNumber}
                  </td>

                  {/* تاریخ */}
                  <td className="py-3.5 px-4 text-center text-slate-700 font-mono text-[11px] border-l border-slate-100">
                    {row.date}
                  </td>

                  {/* نوع عملیات */}
                  <td className="py-3.5 px-4 text-center border-l border-slate-100">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-bold border ${row.operationBadgeClass}`}>
                      {row.operationType}
                    </span>
                  </td>

                  {/* بابت / طرف حساب */}
                  <td className="py-3.5 px-5 text-center font-bold text-slate-800 border-l border-slate-100">
                    {row.partyName}
                  </td>

                  {/* ورودی (+) */}
                  <td className="py-3.5 px-4 text-center border-l border-slate-100 font-mono font-bold text-emerald-600">
                    {row.inAmount > 0 ? (
                      formatLedgerAmount(row.inAmount, account.currency, { showMinusAtEnd: false })
                    ) : (
                      <span className="text-slate-300 font-normal">---</span>
                    )}
                  </td>

                  {/* خروجی (-) */}
                  <td className="py-3.5 px-4 text-center border-l border-slate-100 font-mono font-bold text-rose-600">
                    {row.outAmount > 0 ? (
                      formatLedgerAmount(row.outAmount, account.currency, { showMinusAtEnd: false })
                    ) : (
                      <span className="text-slate-300 font-normal">---</span>
                    )}
                  </td>

                  {/* مانده ردیف (کاردکس) */}
                  <td className="py-3.5 px-5 text-center border-l border-slate-100 font-mono">
                    <div className={`font-bold text-xs ${row.runningBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatLedgerAmount(row.runningBalance, account.currency)}
                    </div>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                      {row.runningBalance >= 0 ? '(بدهکار)' : '(طلبکار)'}
                    </span>
                  </td>

                  {/* توضیحات */}
                  <td className="py-3.5 px-6 text-center text-slate-500 text-[11px] max-w-xs truncate">
                    {row.description || '---'}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && selectedOperationType !== 'opening' && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    تراکنشی مطابق با فیلترهای اعمال‌شده یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* 5. SUMMARY FOOTER (مجموع مانده نهایی صندوق (باقیمانده)) */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          {/* Left: Final Balance in light-blue card */}
          <div className="bg-blue-50/90 border border-blue-200 text-blue-800 px-6 py-1.5 rounded-xl font-mono font-black text-sm tracking-tight">
            {formatLedgerAmount(currentFinalBalance, account.currency)}
          </div>

          {/* Right: Label */}
          <div className="font-bold text-slate-800 text-xs">
            مجموع مانده نهایی صندوق (باقیمانده)
          </div>
        </div>
      </div>
    </div>
  );
};
