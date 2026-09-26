import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  BookOpen,
  Printer,
  Search,
  RotateCcw,
  Calendar,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
  PackageMinus,
  Truck,
  Warehouse,
  Eye,
  FileText,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Currency, Invoice, FinancialTransaction, ExpenseItem, StockTransfer } from '../types';
import { formatCurrency, formatNumberEn, getPersianDate } from '../utils/formatters';

interface ComprehensiveJournalViewProps {
  onViewInvoice?: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment') => void;
}

export type JournalCategoryTab =
  | 'all'
  | 'sales'
  | 'purchases'
  | 'receipts'
  | 'payments'
  | 'warehouse'
  | 'expenses';

export type DateQuickFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export interface JournalEventItem {
  id: string;
  date: string;
  time: string;
  typeCategory: 'sales' | 'purchases' | 'receipts' | 'payments' | 'warehouse' | 'expenses';
  typeLabel: string;
  badgeStyle: string;
  docNumber: string;
  partyOrLocation: string;
  description: string;
  inflowText: string;
  inflowAmount: number; // AFN equivalent
  outflowText: string;
  outflowAmount: number; // AFN equivalent
  isFinancial: boolean;
  isPhysicalStock: boolean;
  physicalQtyIn: number;
  physicalQtyOut: number;
  currency?: Currency;
  originalAmount?: number;
  relatedInvoice?: Invoice;
  relatedTransaction?: FinancialTransaction;
  relatedExpense?: ExpenseItem;
  relatedTransfer?: StockTransfer;
}

export const ComprehensiveJournalView: React.FC<ComprehensiveJournalViewProps> = ({
  onViewInvoice,
  onOpenPaymentModal,
}) => {
  const {
    invoices,
    transactions,
    expenses,
    transfers,
    warehouses,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Helper for warehouse names
  const getWarehouseName = (id?: string) => {
    if (!id) return 'گدام مرکزی';
    const wh = warehouses.find(w => w.id === id);
    return wh ? wh.name : 'گدام مرکزی';
  };

  // Date filters state: default to today, but if there are records with specific date we can support both
  const todayPersian = useMemo(() => getPersianDate(), []);
  
  // Find latest date in data if available, or default to todayPersian
  const latestDataDate = useMemo(() => {
    const dates: string[] = [];
    invoices.forEach(i => i.date && dates.push(i.date));
    transactions.forEach(t => t.date && dates.push(t.date));
    expenses.forEach(e => e.date && dates.push(e.date));
    if (dates.length > 0) {
      dates.sort((a, b) => b.localeCompare(a));
      return dates[0];
    }
    return todayPersian;
  }, [invoices, transactions, expenses, todayPersian]);

  const [dateQuickFilter, setDateQuickFilter] = useState<DateQuickFilter>('today');
  const [startDate, setStartDate] = useState<string>(latestDataDate || todayPersian);
  const [endDate, setEndDate] = useState<string>(latestDataDate || todayPersian);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<JournalCategoryTab>('all');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Function to apply quick date filters
  const applyQuickDateFilter = (filter: DateQuickFilter) => {
    setDateQuickFilter(filter);
    const baseDate = latestDataDate || todayPersian;
    const parts = baseDate.split('/').map(Number);
    const y = parts[0] || 1405;
    const m = parts[1] || 6;
    const d = parts[2] || 30;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    if (filter === 'today') {
      setStartDate(baseDate);
      setEndDate(baseDate);
    } else if (filter === 'yesterday') {
      const prevDay = d > 1 ? d - 1 : 1;
      const yestStr = `${y}/${pad(m)}/${pad(prevDay)}`;
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (filter === 'week') {
      const startDay = Math.max(1, d - 7);
      setStartDate(`${y}/${pad(m)}/${pad(startDay)}`);
      setEndDate(baseDate);
    } else if (filter === 'month') {
      setStartDate(`${y}/${pad(m)}/01`);
      setEndDate(`${y}/${pad(m)}/30`);
    } else if (filter === 'year') {
      setStartDate(`${y}/01/01`);
      setEndDate(`${y}/12/29`);
    }
  };

  // Build Comprehensive List of All Business Events
  const allEvents = useMemo(() => {
    const list: JournalEventItem[] = [];

    // 1. INVOICES & WAREHOUSE DISPATCH / RECEIPTS
    invoices.forEach(inv => {
      const isSale = inv.type === 'sell';
      const isBuy = inv.type === 'buy';
      const isReturnSell = inv.type === 'return_sell';
      const isReturnBuy = inv.type === 'return_buy';

      const time = inv.createdAt
        ? new Date(inv.createdAt).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '10:00';

      const currSymbol = inv.currency === 'AFN' ? '؋' : inv.currency === 'USD' ? '$' : inv.currency;
      const rateToAFN = inv.currency === 'USD' ? 65 : 1; // standard or context rate
      const afnAmount = inv.totalAmount * (inv.currency === 'USD' ? 65 : 1);

      // (A) Financial Record of the Invoice
      if (isSale) {
        list.push({
          id: `ev-inv-sell-${inv.id}`,
          date: inv.date,
          time,
          typeCategory: 'sales',
          typeLabel: 'فاکتور فروش',
          badgeStyle: 'bg-emerald-600 text-white',
          docNumber: `#${inv.invoiceNumber}`,
          partyOrLocation: inv.partyName || 'مشتری متفرقه (نقدی)',
          description: `فروش کالا بابت فاکتور شماره ${inv.invoiceNumber}`,
          inflowText: `+${formatNumberEn(inv.totalAmount)} ${currSymbol}`,
          inflowAmount: afnAmount,
          outflowText: '---',
          outflowAmount: 0,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: inv.currency,
          originalAmount: inv.totalAmount,
          relatedInvoice: inv,
        });
      } else if (isBuy) {
        list.push({
          id: `ev-inv-buy-${inv.id}`,
          date: inv.date,
          time,
          typeCategory: 'purchases',
          typeLabel: 'فاکتور خرید',
          badgeStyle: 'bg-blue-600 text-white',
          docNumber: `#${inv.invoiceNumber}`,
          partyOrLocation: inv.partyName || 'تأمین‌کننده کالا',
          description: `خرید کالا بابت فاکتور شماره ${inv.invoiceNumber}`,
          inflowText: '---',
          inflowAmount: 0,
          outflowText: `-${formatNumberEn(inv.totalAmount)} ${currSymbol}`,
          outflowAmount: afnAmount,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: inv.currency,
          originalAmount: inv.totalAmount,
          relatedInvoice: inv,
        });
      } else if (isReturnSell) {
        list.push({
          id: `ev-inv-ret-sell-${inv.id}`,
          date: inv.date,
          time,
          typeCategory: 'sales',
          typeLabel: 'برگشت از فروش',
          badgeStyle: 'bg-rose-600 text-white',
          docNumber: `#${inv.invoiceNumber}`,
          partyOrLocation: inv.partyName || 'مشتری',
          description: `برگشت از فروش کالا بابت فاکتور شماره ${inv.invoiceNumber}`,
          inflowText: '---',
          inflowAmount: 0,
          outflowText: `-${formatNumberEn(inv.totalAmount)} ${currSymbol}`,
          outflowAmount: afnAmount,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: inv.currency,
          originalAmount: inv.totalAmount,
          relatedInvoice: inv,
        });
      } else if (isReturnBuy) {
        list.push({
          id: `ev-inv-ret-buy-${inv.id}`,
          date: inv.date,
          time,
          typeCategory: 'purchases',
          typeLabel: 'برگشت از خرید',
          badgeStyle: 'bg-amber-600 text-white',
          docNumber: `#${inv.invoiceNumber}`,
          partyOrLocation: inv.partyName || 'تأمین‌کننده',
          description: `برگشت از خرید کالا بابت فاکتور شماره ${inv.invoiceNumber}`,
          inflowText: `+${formatNumberEn(inv.totalAmount)} ${currSymbol}`,
          inflowAmount: afnAmount,
          outflowText: '---',
          outflowAmount: 0,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: inv.currency,
          originalAmount: inv.totalAmount,
          relatedInvoice: inv,
        });
      }

      // (B) Physical Stock Movement per Item in Invoice
      inv.items.forEach((it, idx) => {
        const itemWarehouseName = getWarehouseName(it.warehouseId || inv.warehouseId);
        const itemDocNum = `SM-${2100 + (parseInt(inv.invoiceNumber, 10) || 100) * 2 + idx}`;
        
        let qtySpec = `${formatNumberEn(it.quantity, 2)} ${it.unit || 'عدد'}`;
        if (it.bagsCount) {
          qtySpec = `${formatNumberEn(it.bagsCount)} کیسه`;
        } else if (it.tonsCount) {
          qtySpec = `${formatNumberEn(it.tonsCount, 2)} تن`;
        }

        const tonsLabel = it.tonsCount ? ` (${formatNumberEn(it.tonsCount, 2)} تن)` : '';
        const bagsLabel = it.bagsCount ? ` (${formatNumberEn(it.bagsCount)} کیسه)` : '';
        const extraWeight = it.bagsCount && it.tonsCount ? ` (${it.bagsCount} کیسه (${it.tonsCount}Kg))` : bagsLabel || tonsLabel;

        if (isSale) {
          // Warehouse Out
          list.push({
            id: `ev-wh-out-${inv.id}-${idx}`,
            date: inv.date,
            time,
            typeCategory: 'warehouse',
            typeLabel: 'خروج از گدام',
            badgeStyle: 'bg-amber-500 text-white',
            docNumber: itemDocNum,
            partyOrLocation: itemWarehouseName,
            description: `${it.productName} - خروجی فروش فاکتور ${inv.invoiceNumber} (${qtySpec}${extraWeight})`,
            inflowText: '---',
            inflowAmount: 0,
            outflowText: `-${qtySpec}${extraWeight}`,
            outflowAmount: 0,
            isFinancial: false,
            isPhysicalStock: true,
            physicalQtyIn: 0,
            physicalQtyOut: it.quantity,
            relatedInvoice: inv,
          });
        } else if (isBuy) {
          // Warehouse In
          list.push({
            id: `ev-wh-in-${inv.id}-${idx}`,
            date: inv.date,
            time,
            typeCategory: 'warehouse',
            typeLabel: 'ورود به گدام',
            badgeStyle: 'bg-sky-500 text-white',
            docNumber: itemDocNum,
            partyOrLocation: itemWarehouseName,
            description: `${it.productName} - ورود خرید فاکتور ${inv.invoiceNumber} (${qtySpec}${extraWeight})`,
            inflowText: `+${qtySpec}${extraWeight}`,
            inflowAmount: 0,
            outflowText: '---',
            outflowAmount: 0,
            isFinancial: false,
            isPhysicalStock: true,
            physicalQtyIn: it.quantity,
            physicalQtyOut: 0,
            relatedInvoice: inv,
          });
        }
      });
    });

    // 2. FINANCIAL TRANSACTIONS (دریافت و پرداخت نقد و صرافی)
    transactions.forEach(tx => {
      const time = tx.createdAt
        ? new Date(tx.createdAt).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '11:15';
      const currSymbol = tx.currency === 'AFN' ? '؋' : tx.currency === 'USD' ? '$' : tx.currency;
      const afnAmount = tx.amount * (tx.currency === 'USD' ? 65 : 1);

      if (tx.type === 'receive_payment') {
        list.push({
          id: `ev-tx-rec-${tx.id}`,
          date: tx.date,
          time,
          typeCategory: 'receipts',
          typeLabel: 'دریافت نقد',
          badgeStyle: 'bg-teal-600 text-white',
          docNumber: `REC-${tx.transactionNumber || tx.id.slice(-4)}`,
          partyOrLocation: tx.partyName || tx.cashRegisterName || 'صندوق شرکت',
          description: tx.notes || `دریافت وجه نقدی از ${tx.partyName || 'مشتری'} بابت تسویه حساب`,
          inflowText: `+${formatNumberEn(tx.amount)} ${currSymbol}`,
          inflowAmount: afnAmount,
          outflowText: '---',
          outflowAmount: 0,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: tx.currency,
          originalAmount: tx.amount,
          relatedTransaction: tx,
        });
      } else if (tx.type === 'make_payment') {
        list.push({
          id: `ev-tx-pay-${tx.id}`,
          date: tx.date,
          time,
          typeCategory: 'payments',
          typeLabel: 'پرداخت نقد',
          badgeStyle: 'bg-rose-600 text-white',
          docNumber: `PAY-${tx.transactionNumber || tx.id.slice(-4)}`,
          partyOrLocation: tx.partyName || tx.cashRegisterName || 'صندوق شرکت',
          description: tx.notes || `پرداخت وجه نقدی به ${tx.partyName || 'تأمین‌کننده'} بابت تسویه طلبات`,
          inflowText: '---',
          inflowAmount: 0,
          outflowText: `-${formatNumberEn(tx.amount)} ${currSymbol}`,
          outflowAmount: afnAmount,
          isFinancial: true,
          isPhysicalStock: false,
          physicalQtyIn: 0,
          physicalQtyOut: 0,
          currency: tx.currency,
          originalAmount: tx.amount,
          relatedTransaction: tx,
        });
      }
    });

    // 3. EXPENSES (هزینه‌ها)
    expenses.forEach(exp => {
      const time = exp.createdAt
        ? new Date(exp.createdAt).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:30';
      const currSymbol = exp.currency === 'AFN' ? '؋' : exp.currency === 'USD' ? '$' : exp.currency;
      const afnAmount = exp.amount * (exp.currency === 'USD' ? 65 : 1);

      list.push({
        id: `ev-exp-${exp.id}`,
        date: exp.date,
        time,
        typeCategory: 'expenses',
        typeLabel: 'ثبت هزینه',
        badgeStyle: 'bg-slate-700 text-white',
        docNumber: `EXP-${exp.expenseNumber || exp.id.slice(-4)}`,
        partyOrLocation: exp.recipient || exp.categoryName || 'امور جاری شرکت',
        description: `${exp.title} (${exp.categoryName || 'مصارف عمومی'})`,
        inflowText: '---',
        inflowAmount: 0,
        outflowText: `-${formatNumberEn(exp.amount)} ${currSymbol}`,
        outflowAmount: afnAmount,
        isFinancial: true,
        isPhysicalStock: false,
        physicalQtyIn: 0,
        physicalQtyOut: 0,
        currency: exp.currency,
        originalAmount: exp.amount,
        relatedExpense: exp,
      });
    });

    // 4. TRANSFERS (گردش و انتقال بین گدام‌ها)
    transfers.forEach(tr => {
      const time = tr.createdAt
        ? new Date(tr.createdAt).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '14:00';

      list.push({
        id: `ev-tr-${tr.id}`,
        date: tr.date,
        time,
        typeCategory: 'warehouse',
        typeLabel: 'انتقال گدام',
        badgeStyle: 'bg-indigo-600 text-white',
        docNumber: `TR-${tr.id.slice(-4)}`,
        partyOrLocation: `${getWarehouseName(tr.fromWarehouseId)} ➔ ${getWarehouseName(tr.toWarehouseId)}`,
        description: `انتقال انبار: ${tr.quantity} ${tr.unit || 'عدد'} از ${tr.productName}`,
        inflowText: `+${formatNumberEn(tr.quantity)} (مقصد)`,
        inflowAmount: 0,
        outflowText: `-${formatNumberEn(tr.quantity)} (مبدا)`,
        outflowAmount: 0,
        isFinancial: false,
        isPhysicalStock: true,
        physicalQtyIn: tr.quantity,
        physicalQtyOut: tr.quantity,
        relatedTransfer: tr,
      });
    });

    // Sort descending by date and time
    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.time.localeCompare(a.time);
    });
  }, [invoices, transactions, expenses, transfers, warehouses, refreshKey]);

  // Filtered events based on date range, category, and search query
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      // Date filter
      if (startDate && ev.date < startDate) return false;
      if (endDate && ev.date > endDate) return false;

      // Category tab filter
      if (selectedCategory !== 'all' && ev.typeCategory !== selectedCategory) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchParty = ev.partyOrLocation.toLowerCase().includes(q);
        const matchDoc = ev.docNumber.toLowerCase().includes(q);
        const matchDesc = ev.description.toLowerCase().includes(q);
        const matchType = ev.typeLabel.toLowerCase().includes(q);
        if (!matchParty && !matchDoc && !matchDesc && !matchType) return false;
      }

      return true;
    });
  }, [allEvents, startDate, endDate, selectedCategory, searchQuery]);

  // Calculations for Top 4 Bold Cards
  const {
    totalInflowAFN,
    totalOutflowAFN,
    totalPhysicalIn,
    totalPhysicalOut,
  } = useMemo(() => {
    let inMoney = 0;
    let outMoney = 0;
    let physIn = 0;
    let physOut = 0;

    filteredEvents.forEach(ev => {
      if (ev.isFinancial) {
        inMoney += ev.inflowAmount || 0;
        outMoney += ev.outflowAmount || 0;
      }
      if (ev.isPhysicalStock) {
        physIn += ev.physicalQtyIn || 0;
        physOut += ev.physicalQtyOut || 0;
      }
    });

    return {
      totalInflowAFN: inMoney,
      totalOutflowAFN: outMoney,
      totalPhysicalIn: physIn,
      totalPhysicalOut: physOut,
    };
  }, [filteredEvents]);

  // Calculations for 6 White Metric Cards
  const metrics = useMemo(() => {
    let salesAFN = 0;
    let salesUSD = 0;
    let purchasesAFN = 0;
    let purchasesUSD = 0;
    let receiptsAFN = 0;
    let receiptsUSD = 0;
    let paymentsAFN = 0;
    let paymentsUSD = 0;
    let expensesAFN = 0;
    let expensesUSD = 0;

    filteredEvents.forEach(ev => {
      const orig = ev.originalAmount || 0;
      const isUSD = ev.currency === 'USD';

      if (ev.typeCategory === 'sales' && ev.isFinancial) {
        if (isUSD) {
          salesUSD += orig;
          salesAFN += orig * 65;
        } else {
          salesAFN += orig;
          salesUSD += orig / 65;
        }
      } else if (ev.typeCategory === 'purchases' && ev.isFinancial) {
        if (isUSD) {
          purchasesUSD += orig;
          purchasesAFN += orig * 65;
        } else {
          purchasesAFN += orig;
          purchasesUSD += orig / 65;
        }
      } else if (ev.typeCategory === 'receipts' && ev.isFinancial) {
        if (isUSD) {
          receiptsUSD += orig;
          receiptsAFN += orig * 65;
        } else {
          receiptsAFN += orig;
          receiptsUSD += orig / 65;
        }
      } else if (ev.typeCategory === 'payments' && ev.isFinancial) {
        if (isUSD) {
          paymentsUSD += orig;
          paymentsAFN += orig * 65;
        } else {
          paymentsAFN += orig;
          paymentsUSD += orig / 65;
        }
      } else if (ev.typeCategory === 'expenses' && ev.isFinancial) {
        if (isUSD) {
          expensesUSD += orig;
          expensesAFN += orig * 65;
        } else {
          expensesAFN += orig;
          expensesUSD += orig / 65;
        }
      }
    });

    return {
      salesAFN,
      salesUSD,
      purchasesAFN,
      purchasesUSD,
      receiptsAFN,
      receiptsUSD,
      paymentsAFN,
      paymentsUSD,
      expensesAFN,
      expensesUSD,
    };
  }, [filteredEvents]);

  // Handle Print Action
  const handlePrintJournal = () => {
    openPrintModal({
      type: 'financial_report',
      title: 'روزنامچه جامع رویدادها و تراکنش‌ها',
      subtitle: `گزارش کلیه معاملات مالی و انبارداری • بازه زمانی: از ${startDate} تا ${endDate} • تعداد کل ردیف‌ها: ${filteredEvents.length}`,
      tableHeaders: [
        '#',
        'زمان و تاریخ',
        'نوع رویداد',
        'شماره سند',
        'طرف حساب / محل',
        'شرح و تفصیلات تراکنش',
        'ورود / دریافت (+)',
        'خروج / پرداخت (-)',
      ],
      tableRows: filteredEvents.map((ev, idx) => [
        (idx + 1).toString(),
        `${ev.date} ${ev.time}`,
        ev.typeLabel,
        ev.docNumber,
        ev.partyOrLocation,
        ev.description,
        ev.inflowText,
        ev.outflowText,
      ]),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1600px] mx-auto space-y-4" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & TITLE */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>روزنامچه جامع رویدادها و تراکنش‌ها</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              نمایش زنده و لحظه‌ای تمامی فعالیت‌های خرید، فروش، دریافت، پرداخت، گردش گدام و هزینه‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrintJournal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>چاپ روزنامچه</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SUMMARY BANNER: 4 LARGE BOLD SOLID CARDS */}
      {/* ========================================================================= */}
      <div className="border border-blue-200/80 rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-blue-50/40 to-slate-50/20 shadow-2xs space-y-3">
        {/* Banner Title Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-100 text-blue-700">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-black text-xs sm:text-sm text-slate-900">
              خلاصه و مجموع تراز کل روزنامچه (بازه انتخابی)
            </span>
          </div>

          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
            از {startDate} تا {endDate}
          </span>
        </div>

        {/* 4 Solid Colored Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 (Right): Green / Emerald -> مجموع کل ورود و دریافت مالی (+) */}
          <div className="bg-emerald-600 text-white rounded-xl p-3.5 shadow-sm flex flex-col justify-between min-h-[96px] relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-black">
              <span>مجموع کل ورود و دریافت مالی (+)</span>
              <div className="p-1 rounded bg-emerald-500/50">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 text-left font-mono font-black text-xl sm:text-2xl tracking-tight" dir="ltr">
              + {formatNumberEn(totalInflowAFN)} <span className="text-base font-normal">؋</span>
            </div>
            <div className="text-[10.5px] text-emerald-100 font-medium">
              حاصل فروشات و دریافتی‌های نقد
            </div>
          </div>

          {/* Card 2: Red / Crimson -> مجموع کل خروج و پرداخت مالی (-) */}
          <div className="bg-red-600 text-white rounded-xl p-3.5 shadow-sm flex flex-col justify-between min-h-[96px] relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-black">
              <span>مجموع کل خروج و پرداخت مالی (-)</span>
              <div className="p-1 rounded bg-red-500/50">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 text-left font-mono font-black text-xl sm:text-2xl tracking-tight" dir="ltr">
              - {formatNumberEn(totalOutflowAFN)} <span className="text-base font-normal">؋</span>
            </div>
            <div className="text-[10.5px] text-red-100 font-medium">
              حاصل خریدها، پرداختی‌ها و هزینه‌ها
            </div>
          </div>

          {/* Card 3: Sky Blue -> مجموع کل وارده به گدام (+) */}
          <div className="bg-sky-600 text-white rounded-xl p-3.5 shadow-sm flex flex-col justify-between min-h-[96px] relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-black">
              <span>مجموع کل وارده به گدام (+)</span>
              <div className="p-1 rounded bg-sky-500/50">
                <PackagePlus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 text-left font-mono font-black text-xl sm:text-2xl tracking-tight" dir="ltr">
              +{formatNumberEn(totalPhysicalIn, 2)}
            </div>
            <div className="text-[10.5px] text-sky-100 font-medium">
              کل مقدار اقلام فیزیکی وارد شده به انبار
            </div>
          </div>

          {/* Card 4 (Left): Orange / Amber -> مجموع کل صادره از گدام (-) */}
          <div className="bg-amber-500 text-white rounded-xl p-3.5 shadow-sm flex flex-col justify-between min-h-[96px] relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-black">
              <span>مجموع کل صادره از گدام (-)</span>
              <div className="p-1 rounded bg-amber-400/50">
                <PackageMinus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 text-left font-mono font-black text-xl sm:text-2xl tracking-tight" dir="ltr">
              -{formatNumberEn(totalPhysicalOut, 2)}
            </div>
            <div className="text-[10.5px] text-amber-100 font-medium">
              کل مقدار اقلام فیزیکی خارج شده از انبار
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECOND ROW: 6 DETAILED STAT CARDS (CLEAN WHITE WITH ACCENT TOP BORDER) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. فروشات */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-emerald-500 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">فروشات</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {formatNumberEn(metrics.salesAFN)} <span className="text-[10px] text-slate-500 font-normal">؋</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5" dir="ltr">
            $ {formatNumberEn(metrics.salesUSD, 2)}
          </div>
        </div>

        {/* 2. خریدها */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-blue-500 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">خریدها</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {formatNumberEn(metrics.purchasesAFN)} <span className="text-[10px] text-slate-500 font-normal">؋</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5" dir="ltr">
            $ {formatNumberEn(metrics.purchasesUSD, 2)}
          </div>
        </div>

        {/* 3. دریافت نقد */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-cyan-500 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">دریافت نقد</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {formatNumberEn(metrics.receiptsAFN)} <span className="text-[10px] text-slate-500 font-normal">؋</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5" dir="ltr">
            $ {formatNumberEn(metrics.receiptsUSD, 2)}
          </div>
        </div>

        {/* 4. پرداخت نقد */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-rose-500 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">پرداخت نقد</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {formatNumberEn(metrics.paymentsAFN)} <span className="text-[10px] text-slate-500 font-normal">؋</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5" dir="ltr">
            $ {formatNumberEn(metrics.paymentsUSD, 2)}
          </div>
        </div>

        {/* 5. کل هزینه‌ها */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-slate-700 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">کل هزینه‌ها</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {formatNumberEn(metrics.expensesAFN)} <span className="text-[10px] text-slate-500 font-normal">؋</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5" dir="ltr">
            $ {formatNumberEn(metrics.expensesUSD, 2)}
          </div>
        </div>

        {/* 6. کل رویدادها */}
        <div className="bg-white rounded-xl border border-slate-200 border-r-4 border-r-slate-400 p-2.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 block">کل رویدادها</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-1">
            {filteredEvents.length} ردیف
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            ثبت‌شده در بازه
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FILTERS, QUICK TIMELINE & SEARCH CONTROLS */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-1">
        {/* Right side: Quick Timeline Buttons and Date Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeline Label */}
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 ml-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>فیلترهای زمانی سریع:</span>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => applyQuickDateFilter('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateQuickFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('yesterday')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateQuickFilter === 'yesterday'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              دیروز
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateQuickFilter === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              هفته‌وار
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateQuickFilter === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ماه‌وار
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateFilter('year')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateQuickFilter === 'year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              سالانه
            </button>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2 mr-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold mb-0.5">از تاریخ (شروع بازه)</span>
              <input
                type="text"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateQuickFilter('custom');
                }}
                className="w-28 text-center font-mono text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="1405/01/01"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold mb-0.5">تا تاریخ (پایان بازه)</span>
              <input
                type="text"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateQuickFilter('custom');
                }}
                className="w-28 text-center font-mono text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="1405/12/29"
              />
            </div>
          </div>
        </div>

        {/* Left side: Search input and Refresh Button */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col flex-1 sm:w-72">
            <span className="text-[10px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              <span>جستجوی سریع رویداد:</span>
            </span>
            <div className="relative">
              <input
                type="text"
                placeholder="نام طرف حساب، شماره سند..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-right text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 h-[34px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازخوانی روزنامچه</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CATEGORY FILTER PILLS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-black transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
          }`}
        >
          همه رویدادها
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('sales')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'sales'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
              : 'bg-white text-emerald-700 border-emerald-500 hover:bg-emerald-50'
          }`}
        >
          فروشات
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('purchases')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'purchases'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white text-blue-700 border-blue-500 hover:bg-blue-50'
          }`}
        >
          خریدها
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('receipts')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'receipts'
              ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
              : 'bg-white text-cyan-700 border-cyan-500 hover:bg-cyan-50'
          }`}
        >
          دریافتی نقد
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('payments')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'payments'
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-white text-rose-700 border-rose-500 hover:bg-rose-50'
          }`}
        >
          پرداختی نقد
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('warehouse')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'warehouse'
              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'bg-white text-amber-700 border-amber-500 hover:bg-amber-50'
          }`}
        >
          گردش گدام
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('expenses')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
            selectedCategory === 'expenses'
              ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-50'
          }`}
        >
          هزینه‌ها
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 6. MAIN TABLE (DARK NAVY HEADER, HIGH CONTRAST, ULTRA-SHIK) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-700">هیچ رویداد یا تراکنشی در این بازه زمانی یافت نشد</h3>
            <p className="text-xs text-slate-400 mt-1">
              لطفاً بازه زمانی را تغییر دهید یا فیلتر «همه رویدادها» را انتخاب نمایید.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              {/* Dark Navy Header matching screenshot */}
              <thead className="bg-[#0f172a] text-white">
                <tr className="h-11 border-b border-slate-800 text-[11px] font-bold">
                  <th className="py-2.5 px-3 text-center w-[4%]">#</th>
                  <th className="py-2.5 px-3 text-center w-[11%]">زمان و تاریخ</th>
                  <th className="py-2.5 px-3 text-center w-[11%]">نوع رویداد</th>
                  <th className="py-2.5 px-3 text-center w-[9%]">شماره سند</th>
                  <th className="py-2.5 px-4 text-right w-[17%]">طرف حساب / محل</th>
                  <th className="py-2.5 px-4 text-right w-[30%]">شرح و تفصیلات تراکنش</th>
                  <th className="py-2.5 px-3 text-center w-[9%]">ورود / دریافت (+)</th>
                  <th className="py-2.5 px-3 text-center w-[9%]">خروج / پرداخت (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((ev, idx) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-blue-50/30 transition-colors h-12 font-medium group"
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="py-2 px-3 text-center font-mono">
                      <div className="text-slate-900 font-bold text-xs">{ev.date}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{ev.time}</div>
                    </td>

                    {/* Event Type Badge */}
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-tight ${ev.badgeStyle}`}
                      >
                        {ev.typeLabel}
                      </span>
                    </td>

                    {/* Document Number */}
                    <td className="py-2 px-3 text-center font-mono">
                      {ev.relatedInvoice && onViewInvoice ? (
                        <button
                          type="button"
                          onClick={() => onViewInvoice(ev.relatedInvoice!.id)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-xs transition"
                          title="مشاهده جزئیات فاکتور"
                        >
                          {ev.docNumber}
                        </button>
                      ) : (
                        <span className="font-bold text-slate-900 text-xs">{ev.docNumber}</span>
                      )}
                    </td>

                    {/* Party or Location */}
                    <td className="py-2 px-4 text-right">
                      <strong className="text-slate-900 font-bold text-xs block truncate" title={ev.partyOrLocation}>
                        {ev.partyOrLocation}
                      </strong>
                    </td>

                    {/* Description */}
                    <td className="py-2 px-4 text-right">
                      <span className="text-slate-700 text-xs leading-relaxed" title={ev.description}>
                        {ev.description}
                      </span>
                    </td>

                    {/* Inflow (+) */}
                    <td className="py-2 px-3 text-center font-mono">
                      {ev.inflowText !== '---' ? (
                        <span className="font-black text-emerald-600 text-xs">
                          {ev.inflowText}
                        </span>
                      ) : (
                        <span className="text-slate-300">---</span>
                      )}
                    </td>

                    {/* Outflow (-) */}
                    <td className="py-2 px-3 text-center font-mono">
                      {ev.outflowText !== '---' ? (
                        ev.isPhysicalStock ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10.5px] border border-rose-200/60">
                            {ev.outflowText}
                          </span>
                        ) : (
                          <span className="font-black text-rose-600 text-xs">
                            {ev.outflowText}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">---</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
