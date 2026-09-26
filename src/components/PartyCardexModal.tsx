import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Party, PartyLedgerEntry, Currency, Invoice, FinancialTransaction } from '../types';
import { formatNumber, formatCurrency, getPersianDate, isDateInRange, cleanCardexDescription } from '../utils/formatters';
import {
  X,
  User,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Search,
  Calendar,
  Eye,
  Maximize2,
  Minimize2,
  ArrowRight,
  RefreshCw,
  Coins,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PartyCardexModalProps {
  party: Party | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInvoice?: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment', partyId: string) => void;
  initialCurrency?: string;
}

export const PartyCardexModal: React.FC<PartyCardexModalProps> = ({
  party,
  isOpen,
  onClose,
  onViewInvoice,
  onOpenPaymentModal,
  initialCurrency = 'AFN',
}) => {
  const { invoices, transactions, currencies, openPrintModal } = useAccounting();

  // Active Currency Tab ('AFN' | 'USD' | other currency | 'all')
  const [activeTab, setActiveTab] = useState<string>(initialCurrency);
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoices' | 'payments' | 'exchange'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync initialCurrency when party changes or modal opens
  useEffect(() => {
    if (isOpen && party) {
      // If party has non-zero USD balance and zero AFN balance, default to USD tab, else AFN
      if (Math.abs(party.balanceAFN || 0) < 0.01 && Math.abs(party.balanceUSD || 0) > 0.01) {
        setActiveTab('USD');
      } else {
        setActiveTab('AFN');
      }
    }
  }, [isOpen, party]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute full chronological ledger entries for this party
  const {
    entriesByCurrency,
    allEntries,
    availableCurrencies,
    partyInvoices,
    partyTransactions,
    exchangeTransactions,
  } = useMemo(() => {
    if (!party) {
      return {
        entriesByCurrency: {} as Record<string, PartyLedgerEntry[]>,
        allEntries: [] as PartyLedgerEntry[],
        availableCurrencies: ['AFN', 'USD'],
        partyInvoices: [] as Invoice[],
        partyTransactions: [] as FinancialTransaction[],
        exchangeTransactions: [] as FinancialTransaction[],
      };
    }

    const matchedInvoices = invoices.filter(i => i.partyId === party.id);
    const matchedTransactions = transactions.filter(t => t.partyId === party.id);

    // Identify all exchange transactions involving this party
    const matchedExchangeTrxs = matchedTransactions.filter(
      tx => !!tx.isExchange || tx.type === 'currency_exchange'
    );

    // Dynamic set of currencies that have transactions, invoices, or balances for this party
    const currencySet = new Set<string>(['AFN', 'USD']);
    matchedInvoices.forEach(i => i.currency && currencySet.add(i.currency));
    matchedTransactions.forEach(t => {
      if (t.currency) currencySet.add(t.currency);
      if (t.cashCurrency) currencySet.add(t.cashCurrency);
    });
    if (currencies && Array.isArray(currencies)) {
      currencies.forEach(c => {
        if (c.code) {
          currencySet.add(c.code);
        }
      });
    }

    const activeCurrenciesList = Array.from(currencySet);

    // Base raw entries list
    const rawList: PartyLedgerEntry[] = [];

    // 1. Invoices
    matchedInvoices.forEach(inv => {
      const isSale = inv.type === 'sell';
      const itemsSummary = inv.items?.map(i => `${i.productName} (${formatNumber(i.quantity)} ${i.unit === 'ton' ? 'تن' : 'کیسه'})`).join('، ');

      rawList.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        time: inv.issueTime,
        type: isSale ? 'invoice_sell' : 'invoice_buy',
        typeLabel: isSale ? 'فاکتور فروش کالا' : 'فاکتور خرید کالا',
        documentNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        description: itemsSummary || inv.notes || 'فاکتور تجارتی',
        currency: inv.currency,
        debit: isSale ? inv.totalAmount : 0,
        credit: !isSale ? inv.totalAmount : 0,
        balanceAFN: 0,
        balanceUSD: 0,
      });

      // If invoice had an upfront cash payment recorded with it
      if (inv.paidAmount && inv.paidAmount > 0) {
        rawList.push({
          id: `inv-cash-${inv.id}`,
          date: inv.date,
          time: inv.issueTime,
          type: isSale ? 'payment_receive' : 'payment_make',
          typeLabel: isSale ? 'پرداخت نقدی سر فاکتور' : 'پیش‌پرداخت نقدی خرید',
          documentNumber: `نقد-${inv.invoiceNumber}`,
          invoiceId: inv.id,
          description: `تسویه نقدی همزمان با فاکتور #${inv.invoiceNumber}`,
          currency: inv.currency,
          debit: !isSale ? inv.paidAmount : 0,
          credit: isSale ? inv.paidAmount : 0,
          balanceAFN: 0,
          balanceUSD: 0,
        });
      }
    });

    // 2. Financial Transactions (Payments / Receipts / Exchange)
    matchedTransactions
      .filter(tx => !tx.invoiceId && !tx.id.startsWith('tx-inv-'))
      .forEach(tx => {
        const isReceive = tx.type === 'receive_payment';
        const isExch = !!tx.isExchange || tx.type === 'currency_exchange';

        let typeLabel = isReceive ? 'رسید دریافت وجه (صندوق)' : 'سند پرداخت وجه (صندوق)';
        if (isExch) {
          typeLabel = isReceive ? 'دریافت با تسویه اکسچنج' : 'پرداخت با تسویه اکسچنج';
        }

        let desc = tx.description || (isReceive ? 'دریافت وجه از طرف حساب' : 'پرداخت وجه به طرف حساب');
        if (isExch && tx.cashAmount && tx.cashCurrency && tx.cashCurrency !== tx.currency) {
          desc += ` [تسویه اکسچنج: ${formatNumber(tx.cashAmount)} ${tx.cashCurrency === 'AFN' ? 'افغانی' : 'دالر'}${tx.exchangeRate ? ` به نرخ ${tx.exchangeRate}` : ''}]`;
        }

        // Primary Entry: in the party account currency (tx.currency)
        rawList.push({
          id: `tx-${tx.id}`,
          date: tx.date,
          time: tx.issueTime,
          type: isReceive ? 'payment_receive' : 'payment_make',
          typeLabel,
          documentNumber: tx.transactionNumber,
          transactionId: tx.id,
          description: desc,
          currency: tx.currency,
          debit: !isReceive ? tx.amount : 0,
          credit: isReceive ? tx.amount : 0,
          balanceAFN: 0,
          balanceUSD: 0,
          isExchange: isExch,
          exchangeRate: tx.exchangeRate,
          cashAmount: tx.cashAmount,
          cashCurrency: tx.cashCurrency,
        });

        // If this was an exchange transaction where cash was paid/received in another currency (e.g. AFN cash for USD debt)
        // We also create an informative pair in the cash currency ledger so the user sees the cash that entered/exited in that currency!
        if (isExch && tx.cashCurrency && tx.cashCurrency !== tx.currency && tx.cashAmount && tx.cashAmount > 0) {
          // Cash side entry (shows the cash movement in the cash currency tab)
          rawList.push({
            id: `tx-exch-cash-${tx.id}`,
            date: tx.date,
            time: tx.issueTime,
            type: 'exchange',
            typeLabel: isReceive ? 'ورود نقدی اکسچنج به صندوق' : 'خروج نقدی اکسچنج از صندوق',
            documentNumber: `${tx.transactionNumber}-اکسچنج`,
            transactionId: tx.id,
            description: `🔄 مبلغ نقدی وارد شده بابت تبدیل و تسویه حساب ${tx.currency}: معادل ${formatNumber(tx.amount)} ${tx.currency} (نرخ تبدیل: ${tx.exchangeRate || '-'})`,
            currency: tx.cashCurrency,
            // Informational: Credit for receive, Debit for make, balanced by conversion
            credit: isReceive ? tx.cashAmount : 0,
            debit: !isReceive ? tx.cashAmount : 0,
            balanceAFN: 0,
            balanceUSD: 0,
            isExchange: true,
            exchangeRate: tx.exchangeRate,
            cashAmount: tx.cashAmount,
            cashCurrency: tx.cashCurrency,
          });

          // Corresponding offset so party cash currency ledger balance remains strictly aligned with actual party account balance
          rawList.push({
            id: `tx-exch-offset-${tx.id}`,
            date: tx.date,
            time: tx.issueTime,
            type: 'exchange',
            typeLabel: isReceive ? 'تبدیل نقدی جهت تسویه' : 'تبدیل نقدی دریافتی',
            documentNumber: `${tx.transactionNumber}-تبدیل`,
            transactionId: tx.id,
            description: `🔄 تبدیل و انتقال نقدی به حساب ${tx.currency} طرف حساب (تسویه ${formatNumber(tx.amount)} ${tx.currency})`,
            currency: tx.cashCurrency,
            debit: isReceive ? tx.cashAmount : 0,
            credit: !isReceive ? tx.cashAmount : 0,
            balanceAFN: 0,
            balanceUSD: 0,
            isExchange: true,
            exchangeRate: tx.exchangeRate,
            cashAmount: tx.cashAmount,
            cashCurrency: tx.cashCurrency,
          });
        }
      });

    // Sort chronologically ascending
    rawList.sort((a, b) => {
      const dateA = `${a.date} ${a.time || '00:00'}`;
      const dateB = `${b.date} ${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    // Opening balances computation for AFN and USD
    let recordedDebtAFN = 0;
    let recordedDebtUSD = 0;
    rawList.forEach(entry => {
      const net = entry.debit - entry.credit;
      if (entry.currency === 'AFN') recordedDebtAFN += net;
      else if (entry.currency === 'USD') recordedDebtUSD += net;
    });

    const expectedFinalDebtAFN = -(party.balanceAFN || 0);
    const openingDebtAFN = expectedFinalDebtAFN - recordedDebtAFN;

    const expectedFinalDebtUSD = -(party.balanceUSD || 0);
    const openingDebtUSD = expectedFinalDebtUSD - recordedDebtUSD;

    const openingEntries: PartyLedgerEntry[] = [];
    if (Math.abs(openingDebtAFN) > 0.01) {
      openingEntries.push({
        id: `opening-afn-${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : '1403/01/01',
        time: '00:00',
        type: openingDebtAFN > 0 ? 'invoice_sell' : 'payment_receive',
        typeLabel: 'مانده اولیه / تراز افتتاحیه',
        documentNumber: 'افتتاحیه-AFN',
        description: openingDebtAFN > 0 ? 'بدهی اولیه حساب قبل از دوره' : 'بستانکاری اولیه حساب قبل از دوره',
        currency: 'AFN',
        debit: openingDebtAFN > 0 ? openingDebtAFN : 0,
        credit: openingDebtAFN < 0 ? Math.abs(openingDebtAFN) : 0,
        balanceAFN: 0,
        balanceUSD: 0,
      });
    }

    if (Math.abs(openingDebtUSD) > 0.01) {
      openingEntries.push({
        id: `opening-usd-${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : '1403/01/01',
        time: '00:00',
        type: openingDebtUSD > 0 ? 'invoice_sell' : 'payment_receive',
        typeLabel: 'مانده اولیه / تراز افتتاحیه',
        documentNumber: 'افتتاحیه-USD',
        description: openingDebtUSD > 0 ? 'بدهی اولیه دلاری قبل از دوره' : 'بستانکاری اولیه دلاری قبل از دوره',
        currency: 'USD',
        debit: openingDebtUSD > 0 ? openingDebtUSD : 0,
        credit: openingDebtUSD < 0 ? Math.abs(openingDebtUSD) : 0,
        balanceAFN: 0,
        balanceUSD: 0,
      });
    }

    const fullMasterList = [...openingEntries, ...rawList];

    // Calculate running balance for each currency separately
    const currencyEntriesMap: Record<string, PartyLedgerEntry[]> = {};
    activeCurrenciesList.forEach(curr => {
      const currList = fullMasterList.filter(e => e.currency === curr);
      let runBal = 0;
      currList.forEach(entry => {
        runBal += (entry.debit - entry.credit);
        entry.runningBalance = runBal;
        if (curr === 'AFN') entry.balanceAFN = runBal;
        if (curr === 'USD') entry.balanceUSD = runBal;
      });
      currencyEntriesMap[curr] = currList;
    });

    // Also calculate global running balance across all currencies
    let globalAFN = 0;
    let globalUSD = 0;
    fullMasterList.forEach(entry => {
      const net = entry.debit - entry.credit;
      if (entry.currency === 'AFN') globalAFN += net;
      else if (entry.currency === 'USD') globalUSD += net;
      entry.balanceAFN = globalAFN;
      entry.balanceUSD = globalUSD;
    });

    return {
      entriesByCurrency: currencyEntriesMap,
      allEntries: fullMasterList,
      availableCurrencies: activeCurrenciesList,
      partyInvoices: matchedInvoices,
      partyTransactions: matchedTransactions,
      exchangeTransactions: matchedExchangeTrxs,
    };
  }, [party, invoices, transactions, currencies]);

  if (!isOpen || !party) return null;

  // Active entries depending on active tab
  const currentEntries = activeTab === 'all'
    ? (allEntries || [])
    : (entriesByCurrency[activeTab] || []);

  // Filter current entries by type, date, search
  const filteredEntries = currentEntries.filter(e => {
    if (typeFilter === 'invoices' && !e.type.startsWith('invoice')) return false;
    if (typeFilter === 'payments' && !e.type.startsWith('payment') && e.type !== 'exchange') return false;
    if (typeFilter === 'exchange' && !e.isExchange && e.type !== 'exchange') return false;

    // Date Range Filter
    if (e.date && e.date !== '---' && !isDateInRange(e.date, fromDate, toDate)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const docNum = String(e.documentNumber || '').toLowerCase();
      const desc = String(e.description || '').toLowerCase();
      const tLabel = String(e.typeLabel || '').toLowerCase();
      return docNum.includes(q) || desc.includes(q) || tLabel.includes(q);
    }
    return true;
  });

  // Calculate stats for the active view (plain object calculation without hooks to strictly respect React Rules of Hooks)
  let totalDebit = 0;
  let totalCredit = 0;
  let exchangeCount = 0;
  let exchangeSum = 0;

  filteredEntries.forEach(e => {
    totalDebit += (e.debit || 0);
    totalCredit += (e.credit || 0);
    if (e.isExchange) {
      exchangeCount += 1;
      exchangeSum += (e.debit > 0 ? e.debit : (e.credit || 0));
    }
  });

  let currentBalance = 0;
  if (activeTab === 'AFN') {
    currentBalance = party.balanceAFN || 0;
  } else if (activeTab === 'USD') {
    currentBalance = party.balanceUSD || 0;
  } else if (activeTab !== 'all') {
    // For any other specific currency, use the final running balance from the entries
    const entries = entriesByCurrency[activeTab] || [];
    const last = entries[entries.length - 1];
    currentBalance = last ? -(last.runningBalance || 0) : 0;
  }

  const activeStats = {
    totalDebit,
    totalCredit,
    currentBalance,
    recordCount: filteredEntries.length,
    exchangeCount,
    exchangeSum,
  };

  const handlePrintStatement = () => {
    const filteredInvs = partyInvoices.filter(i => isDateInRange(i.date, fromDate, toDate));
    const filteredTrxs = partyTransactions.filter(t => isDateInRange(t.date, fromDate, toDate));
    openPrintModal({
      type: 'party_statement',
      party,
      partyLedgerInvoices: filteredInvs,
      partyLedgerTransactions: filteredTrxs,
      selectedCurrency: activeTab,
      title: activeTab === 'all'
        ? `کارتکس و صورت‌حساب جامع: ${party.name}`
        : `کارتکس حساب ${activeTab === 'AFN' ? 'افغانی' : activeTab === 'USD' ? 'دالری' : activeTab}: ${party.name}`,
    });
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'AFN': return '؋';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'IRR': return '﷼';
      case 'PKR': return '₨';
      default: return code;
    }
  };

  const getCurrencyTitle = (code: string) => {
    switch (code) {
      case 'AFN': return 'افغانی (AFN)';
      case 'USD': return 'دالر آمریکا (USD)';
      case 'EUR': return 'یورو (EUR)';
      case 'IRR': return 'تومان / ریال ایران';
      case 'PKR': return 'کلدار پاکستان (PKR)';
      default: return code;
    }
  };

  const getPartyBalanceForCurrency = (code: string) => {
    if (code === 'AFN') return party.balanceAFN || 0;
    if (code === 'USD') return party.balanceUSD || 0;
    const entries = entriesByCurrency[code] || [];
    const last = entries[entries.length - 1];
    return last ? -(last.runningBalance || 0) : 0;
  };

  return (
    <div
      id="party-cardex-modal-backdrop"
      className={`fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 overflow-y-auto ${
        isFullScreen ? 'p-0 flex flex-col' : 'p-2 sm:p-4 md:p-6 flex items-center justify-center'
      }`}
      onClick={e => {
        if (e.target === e.currentTarget && !isFullScreen) onClose();
      }}
    >
      <div
        id="party-cardex-modal-container"
        className={`bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${
          isFullScreen
            ? 'w-full h-full rounded-none border-none max-h-screen'
            : 'rounded-3xl max-w-6xl w-full max-h-[94vh] my-auto'
        }`}
        dir="rtl"
      >
        {/* Header with Navigation & Full-Page Toggle */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition border border-white/15 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="بازگشت به لیست اشخاص و گزارشات"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">بازگشت به گزارش اشخاص</span>
            </button>
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  صفحه اختصاصی و کارتکس مالی: {party.name}
                </h3>
                {party.code && (
                  <span className="text-xs font-mono font-bold bg-white/15 px-2 py-0.5 rounded-lg text-slate-200 border border-white/10">
                    کد: #{party.code}
                  </span>
                )}
                {party.groupName && (
                  <span className="text-xs font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10">
                    {party.groupName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تفکیک کامل گردش حساب بر اساس ارزهای معامله‌شده، اسناد خرید و فروش، دریافت‌ها و پرداخت‌ها و تسویه‌های اکسچنج
              </p>
            </div>
          </div>

          {/* Action buttons: Fullscreen toggle & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition border border-white/15 cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
              title={isFullScreen ? 'خروج از حالت تمام صفحه' : 'نمایش صفحه کامل'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">حالت پنجره</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تمام صفحه</span>
                </>
              )}
            </button>

            <button
              id="party-cardex-modal-close-btn"
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl transition border border-white/15 hover:border-rose-500 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-xs"
              title="بستن (ESC)"
            >
              <X className="w-4 h-4" />
              <span>بستن</span>
            </button>
          </div>
        </div>

        {/* Currency Tabs Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 sm:px-6 pt-3 pb-0 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            {availableCurrencies.map(currencyCode => {
              const isActive = activeTab === currencyCode;
              const count = (entriesByCurrency[currencyCode] || []).length;
              const bal = getPartyBalanceForCurrency(currencyCode);
              const symbol = getCurrencySymbol(currencyCode);

              return (
                <button
                  key={currencyCode}
                  type="button"
                  onClick={() => setActiveTab(currencyCode)}
                  className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all relative border-t border-x cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 border-slate-200 shadow-xs z-10 -mb-[1px]'
                      : 'bg-slate-200/70 hover:bg-slate-200 text-slate-600 border-transparent'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                    currencyCode === 'AFN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currencyCode === 'USD'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {symbol}
                  </span>
                  <span className="whitespace-nowrap font-black">
                    {currencyCode === 'AFN' ? 'حساب افغانی' : currencyCode === 'USD' ? 'حساب دالری' : `حساب ${currencyCode}`}
                  </span>
                  
                  {/* Transaction count badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {count}
                  </span>

                  {/* Mini Balance Pill */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold whitespace-nowrap hidden md:inline ${
                    bal < -0.01
                      ? 'bg-rose-100 text-rose-700'
                      : bal > 0.01
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {formatCurrency(Math.abs(bal), currencyCode)}
                    <span className="font-sans mr-1 text-[9px]">
                      {bal < -0.01 ? '(بدهکار)' : bal > 0.01 ? '(طلبکار)' : '(تسویه)'}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* Comprehensive "All Currencies" Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all relative border-t border-x cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-xs z-10 -mb-[1px]'
                  : 'bg-slate-200/70 hover:bg-slate-200 text-slate-600 border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="whitespace-nowrap font-black">همه ارزها (تجمیعی)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/60 text-slate-600'
              }`}>
                {allEntries.length}
              </span>
            </button>
          </div>

          {/* Quick Print Button in Tabs Header */}
          <div className="pb-1.5 hidden sm:block">
            <button
              onClick={handlePrintStatement}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ صورت‌حساب رسمی A4</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* Active Tab Header / Overview Cards */}
          {activeTab !== 'all' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Balance for this specific currency */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    مانده حساب {getCurrencyTitle(activeTab)}:
                  </span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {activeTab}
                  </span>
                </div>
                <div
                  className={`text-xl font-black font-mono mt-1 ${
                    activeStats.currentBalance < -0.01
                      ? 'text-rose-600'
                      : activeStats.currentBalance > 0.01
                      ? 'text-emerald-600'
                      : 'text-slate-600'
                  }`}
                >
                  {formatCurrency(Math.abs(activeStats.currentBalance), activeTab)}
                </div>
                <div className="text-xs mt-1 font-bold flex items-center gap-1">
                  {activeStats.currentBalance < -0.01 ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      قرضدار ما است (بدهکار)
                    </span>
                  ) : activeStats.currentBalance > 0.01 ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      طلبکار از ما است (بستانکار)
                    </span>
                  ) : (
                    <span className="text-slate-400">حساب کاملاً تسویه است (۰)</span>
                  )}
                </div>
              </div>

              {/* Card 2: Total Debits in this currency */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block">
                  مجموع گردش بدهکار (فروش و خروجی):
                </span>
                <div className="text-lg font-black font-mono mt-1 text-rose-600">
                  {formatCurrency(activeStats.totalDebit, activeTab)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ارقام فاکتورهای فروش و پرداخت‌های ما
                </div>
              </div>

              {/* Card 3: Total Credits in this currency */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block">
                  مجموع گردش بستانکار (دریافتی و واریز):
                </span>
                <div className="text-lg font-black font-mono mt-1 text-emerald-600">
                  {formatCurrency(activeStats.totalCredit, activeTab)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ارقام دریافتی‌های نقدی و فاکتورهای خرید
                </div>
              </div>

              {/* Card 4: Quick Actions for this Currency */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPaymentModal) {
                      onOpenPaymentModal('receive_payment', party.id);
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>دریافت پول ({activeTab})</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPaymentModal) {
                      onOpenPaymentModal('make_payment', party.id);
                    }
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  <span>پرداخت پول ({activeTab})</span>
                </button>
              </div>
            </div>
          ) : (
            /* Multi-Currency Overview Cards when "All Currencies" tab is active */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* AFN Balance */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block">مانده حساب افغانی (AFN):</span>
                <div
                  className={`text-lg font-black font-mono mt-1 ${
                    party.balanceAFN < 0
                      ? 'text-rose-600'
                      : party.balanceAFN > 0
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {formatCurrency(Math.abs(party.balanceAFN), 'AFN')}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-bold">
                  {party.balanceAFN < 0 ? (
                    <span className="text-rose-600">قرضدار ما است (بدهکار)</span>
                  ) : party.balanceAFN > 0 ? (
                    <span className="text-emerald-600">طلبکار از ما است (بستانکار)</span>
                  ) : (
                    <span className="text-slate-400">حساب کاملاً تسویه است</span>
                  )}
                </div>
              </div>

              {/* USD Balance */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 block">مانده حساب دالری (USD):</span>
                <div
                  className={`text-lg font-black font-mono mt-1 ${
                    party.balanceUSD < 0
                      ? 'text-rose-600'
                      : party.balanceUSD > 0
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {formatCurrency(Math.abs(party.balanceUSD), 'USD')}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-bold">
                  {party.balanceUSD < 0 ? (
                    <span className="text-rose-600">قرضدار ما است (بدهکار)</span>
                  ) : party.balanceUSD > 0 ? (
                    <span className="text-emerald-600">طلبکار از ما است (بستانکار)</span>
                  ) : (
                    <span className="text-slate-400">حساب کاملاً تسویه است</span>
                  )}
                </div>
              </div>

              {/* Contact & Phone */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">مشخصات تماس:</span>
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{party.phone || 'ثبت نشده'}</span>
                </div>
                {party.address && (
                  <div className="text-slate-600 truncate">آدرس: {party.address}</div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPaymentModal) {
                      onOpenPaymentModal('receive_payment', party.id);
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>دریافت وجه (تسویه)</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPaymentModal) {
                      onOpenPaymentModal('make_payment', party.id);
                    }
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  <span>پرداخت وجه به طرف حساب</span>
                </button>
              </div>
            </div>
          )}

          {/* Exchange Notice Banner if party has exchange transactions */}
          {exchangeTransactions.length > 0 && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-purple-900">
                    گردش‌های تسویه‌شده با حالت اکسچنج و تبدیل اسعار
                  </h4>
                  <p className="text-purple-700 text-[11.5px] mt-0.5">
                    تعداد {exchangeTransactions.length} سند تبدیل اسعار در این حساب ثبت شده که مبالغ هر کدام در صفحه ارز مربوط به خود نمایش داده شده است.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'exchange' ? 'all' : 'exchange')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 border ${
                  typeFilter === 'exchange'
                    ? 'bg-purple-700 text-white border-purple-800'
                    : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-100'
                }`}
              >
                {typeFilter === 'exchange' ? 'نمایش همه تراکنش‌ها' : 'فقط تراکنش‌های اکسچنج'}
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی سند، فاکتور یا شرح..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 w-48 sm:w-56"
                />
              </div>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه اسناد و گردش‌ها ({currentEntries.length})</option>
                <option value="invoices">فقط فاکتورهای خرید و فروش</option>
                <option value="payments">فقط رسیدها و پرداخت‌های نقدی</option>
                <option value="exchange">فقط تراکنش‌های تبدیل ارز (اکسچنج)</option>
              </select>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 text-[11px]">از:</span>
                <input
                  type="text"
                  placeholder="۱۴۰۳/۰۱/۰۱"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-20 bg-transparent text-xs font-mono outline-none text-slate-800"
                />
                <span className="text-slate-500 text-[11px]">تا:</span>
                <input
                  type="text"
                  placeholder="۱۴۰۳/۱۲/۲۹"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-20 bg-transparent text-xs font-mono outline-none text-slate-800"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                    title="حذف فیلتر تاریخ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handlePrintStatement}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {activeTab === 'all'
                  ? 'چاپ صورت‌حساب تجمیعی'
                  : `چاپ کارتکس ${activeTab === 'AFN' ? 'افغانی' : activeTab === 'USD' ? 'دالری' : activeTab}`}
              </span>
            </button>
          </div>

          {/* Cardex Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">تاریخ و ساعت</th>
                    <th className="py-3 px-3">نوع عملیات مالی</th>
                    <th className="py-3 px-3">شماره سند / فاکتور</th>
                    <th className="py-3 px-3">شرح معامله و اقلام کالا</th>
                    {activeTab === 'all' && (
                      <th className="py-3 px-2 text-center">ارز</th>
                    )}
                    <th className="py-3 px-3 text-left text-rose-700 bg-rose-50/40">بدهکار (طلب ما)</th>
                    <th className="py-3 px-3 text-left text-emerald-700 bg-emerald-50/40">بستانکار (پرداخت او)</th>
                    <th className="py-3 px-3 text-left font-black bg-slate-50">مانده حساب لحظه‌ای</th>
                    <th className="py-3 px-2 text-center w-14">مشاهده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'all' ? 10 : 9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Coins className="w-8 h-8 text-slate-300" />
                          <span className="font-bold">
                            هیچ تراکنش یا سندی با ارز {activeTab === 'all' ? 'انتخابی' : activeTab} برای این طرف حساب ثبت نشده است.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e, idx) => {
                      // Calculate row running balance
                      const rowBal = activeTab === 'all'
                        ? (e.currency === 'AFN' ? e.balanceAFN : e.balanceUSD)
                        : (e.runningBalance ?? 0);
                      const isDebtor = rowBal > 0.01;
                      const isCreditor = rowBal < -0.01;

                      return (
                        <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 font-mono">{e.date}</div>
                            {e.time && <div className="text-[10px] text-slate-400 font-mono">{e.time}</div>}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {e.isExchange ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 text-purple-600" />
                                <span>{e.typeLabel}</span>
                              </span>
                            ) : e.type === 'invoice_sell' ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>فاکتور فروش</span>
                              </span>
                            ) : e.type === 'invoice_buy' ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>فاکتور خرید</span>
                              </span>
                            ) : e.type === 'payment_receive' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>دریافت نقد</span>
                              </span>
                            ) : e.type === 'payment_make' ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>پرداخت نقد</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                                {e.typeLabel}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            {e.documentNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-700 leading-snug max-w-[240px]" title={e.description}>
                            <div className="truncate font-medium">{cleanCardexDescription(e.description, 40)}</div>
                            {e.isExchange && e.cashAmount && e.cashCurrency && (
                              <div className="text-[10px] text-purple-700 font-mono mt-0.5 flex items-center gap-1">
                                <span>تبدیل نقدی:</span>
                                <strong>{formatNumber(e.cashAmount)} {e.cashCurrency}</strong>
                                {e.exchangeRate && <span>(به نرخ {e.exchangeRate})</span>}
                              </div>
                            )}
                          </td>

                          {/* Currency column (only shown in "All" view) */}
                          {activeTab === 'all' && (
                            <td className="py-3 px-2 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                                  e.currency === 'USD'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {e.currency}
                              </span>
                            </td>
                          )}

                          {/* Debit */}
                          <td className="py-3 px-3 text-left font-mono font-bold bg-rose-50/20 text-rose-700">
                            {e.debit > 0 ? formatCurrency(e.debit, e.currency) : '-'}
                          </td>
                          {/* Credit */}
                          <td className="py-3 px-3 text-left font-mono font-bold bg-emerald-50/20 text-emerald-700">
                            {e.credit > 0 ? formatCurrency(e.credit, e.currency) : '-'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3 px-3 text-left font-mono font-black text-slate-900 bg-slate-50/60 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={isDebtor ? 'text-rose-600' : isCreditor ? 'text-emerald-600' : 'text-slate-500'}>
                                {formatCurrency(Math.abs(rowBal), e.currency)}
                              </span>
                              {isDebtor && (
                                <span className="text-[10px] px-1 py-0.2 rounded font-sans font-bold bg-rose-100 text-rose-700">
                                  بدهکار
                                </span>
                              )}
                              {isCreditor && (
                                <span className="text-[10px] px-1 py-0.2 rounded font-sans font-bold bg-emerald-100 text-emerald-700">
                                  طلبکار
                                </span>
                              )}
                              {!isDebtor && !isCreditor && (
                                <span className="text-[10px] px-1 py-0.2 rounded font-sans font-bold bg-slate-100 text-slate-500">
                                  تسویه
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-2 text-center">
                            {e.invoiceId && onViewInvoice ? (
                              <button
                                onClick={() => {
                                  onClose();
                                  onViewInvoice(e.invoiceId!);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="مشاهده فاکتور"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
            <span>
              تعداد ردیف‌های فعال: <strong className="text-slate-900 font-mono">{filteredEntries.length}</strong> سند
            </span>
            {activeTab !== 'all' && (
              <span className="hidden sm:inline">
                ارز جاری: <strong className="text-blue-700">{getCurrencyTitle(activeTab)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintStatement}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300 cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>چاپ صورت‌حساب</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              بستن (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
