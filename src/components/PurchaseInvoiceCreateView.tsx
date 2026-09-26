import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, Unit, InvoiceItem, Invoice } from '../types';
import {
  formatNumber,
  formatCurrency,
  getPersianDate,
  getGregorianEquivalent,
  calculateBagsAndTons,
} from '../utils/formatters';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import { ProductSearchSelector } from './ProductSearchSelector';
import {
  User,
  Calendar,
  FileText,
  Warehouse as WarehouseIcon,
  Ticket,
  DollarSign,
  ArrowLeftRight,
  Plus,
  Trash2,
  Wallet,
  Printer,
  Check,
  CheckCircle2,
  Truck,
  X,
  ShieldCheck,
} from 'lucide-react';

interface PurchaseInvoiceCreateViewProps {
  onBackToList?: () => void;
  onViewInvoice: (id: string) => void;
  invoiceType?: 'buy' | 'return_buy';
}

interface PurchaseItemRowState {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string;
}

interface ExtraExpenseRowState {
  id: string;
  partyName: string;
  title: string;
  currency: Currency;
  amount: number;
}

export const PurchaseInvoiceCreateView: React.FC<PurchaseInvoiceCreateViewProps> = ({
  onBackToList,
  onViewInvoice,
  invoiceType = 'buy',
}) => {
  const {
    products,
    warehouses,
    parties,
    currencies,
    cashAccounts,
    cashRegister,
    notify,
    createInvoice,
    getNextInvoiceNumber,
    openPrintModal,
  } = useAccounting();

  // Suppliers list
  const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');

  // Top header fields (matching screenshot IMG-20260906-WA0000.jpg)
  const isReturn = invoiceType === 'return_buy';
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [partySearch, setPartySearch] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(getPersianDate());
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => getNextInvoiceNumber(invoiceType));
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');

  // Keep invoice number in sync if invoiceType changes
  useEffect(() => {
    setInvoiceNumber(getNextInvoiceNumber(invoiceType));
  }, [invoiceType]);

  // 3 choices for purchase deal type:
  // 1. خرید قطعی (عادی)
  // 2. دریافت امانی (به گدام امانی سپرده می‌شود)
  // 3. پیش‌خرید (تحویل بعداً)
  const [dealType, setDealType] = useState<string>(
    isReturn ? 'برگشت قطعی خرید' : 'خرید قطعی (عادی)'
  );

  // Consignment Warehouses selection
  const consignmentWarehouses = useMemo(() => {
    return warehouses.filter(w => w.type !== 'standard' || w.id === 'wh-2' || w.name.includes('امانی'));
  }, [warehouses]);

  const [consignmentWarehouseId, setConsignmentWarehouseId] = useState<string>(() => {
    const defaultConsignment = warehouses.find(w => w.type !== 'standard' || w.id === 'wh-2' || w.name.includes('امانی'));
    return defaultConsignment?.id || 'wh-2';
  });

  // Currency & Exchange rate
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  // Quick Party Modal state
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);

  // Items table rows (Starts with 1 clean item row ready for instant search)
  const [rows, setRows] = useState<PurchaseItemRowState[]>([
    {
      id: 'row-1',
      productId: '',
      productName: '',
      unit: 'ton',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      description: '',
    },
  ]);

  // Overall discounts
  const [discount, setDiscount] = useState<number>(0);

  // Extra expenses (هزینه‌های جانبی فاکتور: کرایه، تخلیه، باسکول و غیره)
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpenseRowState[]>([]);

  // Explicit user requirement: "گزینه نقدی و نسیه و نیمه نسیه"
  const [paymentType, setPaymentType] = useState<'نقدی' | 'نسیه' | 'نیمه نسیه'>('نقدی');
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>(() => {
    const usdAcc = cashAccounts.find(a => a.currency === 'USD');
    return usdAcc ? usdAcc.id : cashAccounts[0]?.id || 'usd_cash';
  });
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // When currency changes, update default exchange rate and cash account
  useEffect(() => {
    const foundCurr = currencies.find(c => c.code === currency);
    if (foundCurr) {
      setExchangeRate(foundCurr.exchangeRateToAFN || 1);
    }
    const matchingCash = cashAccounts.find(a => a.currency === currency);
    if (matchingCash) {
      setSelectedCashAccountId(matchingCash.id);
    }
  }, [currency, currencies, cashAccounts]);

  // Sync initial party search text
  useEffect(() => {
    const p = parties.find(pt => pt.id === selectedPartyId);
    if (p) {
      setPartySearch(p.name);
    }
  }, [selectedPartyId, parties]);

  // Filter parties based on search
  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    const q = partySearch.toLowerCase();
    return parties.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
  }, [parties, partySearch]);

  // Add new item row and focus search input
  const handleAddRow = () => {
    const newId = 'row-' + Date.now() + Math.random().toString(36).substring(2, 6);
    const newRow: PurchaseItemRowState = {
      id: newId,
      productId: '',
      productName: '',
      unit: 'ton',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      description: '',
    };
    setRows(prev => [...prev, newRow]);
    setTimeout(() => {
      document.getElementById(`prod-search-${newId}`)?.focus();
    }, 50);
  };

  // Remove item row
  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: 'row-1',
          productId: '',
          productName: '',
          unit: 'ton',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          description: '',
        },
      ]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Update item row
  const handleUpdateRow = (id: string, updates: Partial<PurchaseItemRowState>) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };

        // If product changed or cleared
        if ('productId' in updates) {
          if (!updates.productId) {
            updated.productName = '';
            updated.unitPrice = 0;
            updated.totalPrice = 0;
          } else {
            const prod = products.find(p => p.id === updates.productId);
            if (prod) {
              updated.productName = prod.name;
              const basePrice = currency === 'AFN' ? prod.buyPriceAFN : prod.buyPriceUSD;
              if (updated.unit === 'bag') {
                updated.unitPrice = Math.round(basePrice / (prod.bagsPerTon || 20));
              } else {
                updated.unitPrice = basePrice;
              }
            }
          }
        }

        if (updates.unit) {
          const prod = products.find(p => p.id === updated.productId);
          if (prod) {
            const basePrice = currency === 'AFN' ? prod.buyPriceAFN : prod.buyPriceUSD;
            if (updates.unit === 'bag') {
              updated.unitPrice = Math.round(basePrice / (prod.bagsPerTon || 20));
            } else {
              updated.unitPrice = basePrice;
            }
          }
        }

        updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      })
    );
  };

  // Extra expenses handlers
  const handleAddExpense = () => {
    const newExp: ExtraExpenseRowState = {
      id: 'exp-' + Date.now() + Math.random(),
      partyName: '',
      title: 'کرایه حمل موتر',
      currency: currency,
      amount: 0,
    };
    setExtraExpenses(prev => [...prev, newExp]);
  };

  const handleRemoveExpense = (id: string) => {
    setExtraExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateExpense = (id: string, updates: Partial<ExtraExpenseRowState>) => {
    setExtraExpenses(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  // Toggle currency between USD and AFN with instantaneous conversion
  const handleToggleCurrency = () => {
    const usdCurrencyDef = currencies.find(c => c.code === 'USD');
    const systemRate = usdCurrencyDef?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65;
    const effectiveRate = (currency === 'USD' && exchangeRate > 1) ? exchangeRate : systemRate;
    if (effectiveRate <= 0) return;

    if (currency === 'USD') {
      // USD -> AFN
      const newCurrency: Currency = 'AFN';
      setCurrency(newCurrency);
      setExchangeRate(1);

      // Convert all rows instantaneously
      setRows(prevRows =>
        prevRows.map(row => {
          const newUnitPrice = Math.round((row.unitPrice || 0) * effectiveRate * 100) / 100;
          const newTotalPrice = Math.round((row.quantity || 0) * newUnitPrice * 100) / 100;
          return {
            ...row,
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );

      // Convert extra expenses if in USD
      setExtraExpenses(prevExp =>
        prevExp.map(exp => {
          if (exp.currency === 'USD' || !exp.currency) {
            return {
              ...exp,
              currency: 'AFN',
              amount: Math.round((exp.amount || 0) * effectiveRate * 100) / 100,
            };
          }
          return exp;
        })
      );

      // Convert discount
      if (discount > 0) setDiscount(Math.round(discount * effectiveRate * 100) / 100);
      if (paidAmount > 0 && paymentType !== 'نقدی') {
        setPaidAmount(Math.round(paidAmount * effectiveRate * 100) / 100);
      }

      // Switch to AFN cash account
      const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
      if (afnAcc) setSelectedCashAccountId(afnAcc.id);

      notify('info', 'تغییر ارز به افغانی (؋)', `کلیه ستون‌های مبالغ، قیمت‌های خرید و هزینه‌های جانبی با نرخ روز (۱ دلار = ${formatNumber(effectiveRate)} افغانی) به صورت لحظه‌ای به افغانی تبدیل شدند.`);
    } else {
      // AFN -> USD
      const newCurrency: Currency = 'USD';
      setCurrency(newCurrency);
      setExchangeRate(effectiveRate);

      // Convert all rows instantaneously
      setRows(prevRows =>
        prevRows.map(row => {
          const newUnitPrice = Number(((row.unitPrice || 0) / effectiveRate).toFixed(2));
          const newTotalPrice = Number(((row.quantity || 0) * newUnitPrice).toFixed(2));
          return {
            ...row,
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );

      // Convert extra expenses if in AFN
      setExtraExpenses(prevExp =>
        prevExp.map(exp => {
          if (exp.currency === 'AFN' || !exp.currency) {
            return {
              ...exp,
              currency: 'USD',
              amount: Number(((exp.amount || 0) / effectiveRate).toFixed(2)),
            };
          }
          return exp;
        })
      );

      // Convert discount
      if (discount > 0) setDiscount(Number((discount / effectiveRate).toFixed(2)));
      if (paidAmount > 0 && paymentType !== 'نقدی') {
        setPaidAmount(Number((paidAmount / effectiveRate).toFixed(2)));
      }

      // Switch to USD cash account
      const usdAcc = cashAccounts.find(a => a.currency === 'USD');
      if (usdAcc) setSelectedCashAccountId(usdAcc.id);

      notify('info', 'تغییر ارز به دلار ($)', `کلیه ستون‌های مبالغ، قیمت‌های خرید و هزینه‌های جانبی با نرخ روز (۱ دلار = ${formatNumber(effectiveRate)} افغانی) به صورت لحظه‌ای به دلار تبدیل شدند.`);
    }
  };

  // Financial calculations
  const itemsSubtotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  }, [rows]);

  const extraExpensesTotal = useMemo(() => {
    return extraExpenses.reduce((sum, e) => {
      // If expense is in another currency, convert to invoice currency if needed
      return sum + (e.amount || 0);
    }, 0);
  }, [extraExpenses]);

  // Final total with expenses = itemsSubtotal - discount + extraExpensesTotal
  const finalTotalAmount = useMemo(() => {
    return Math.max(0, itemsSubtotal - (discount || 0) + (extraExpensesTotal || 0));
  }, [itemsSubtotal, discount, extraExpensesTotal]);

  // Equivalent in base currency (AFN)
  const baseCurrencyEquivalent = useMemo(() => {
    return finalTotalAmount * (exchangeRate || 1);
  }, [finalTotalAmount, exchangeRate]);

  // Remaining debt
  const remainingDebt = useMemo(() => {
    return Math.max(0, finalTotalAmount - (paidAmount || 0));
  }, [finalTotalAmount, paidAmount]);

  // Auto-fill paidAmount according to user's paymentType choice
  useEffect(() => {
    if (paymentType === 'نقدی') {
      setPaidAmount(finalTotalAmount);
    } else if (paymentType === 'نسیه') {
      setPaidAmount(0);
    } else if (paymentType === 'نیمه نسیه') {
      // If switching to semi-credit and paidAmount was 0 or full, default to half
      setPaidAmount(prev => (prev === 0 || prev >= finalTotalAmount ? Math.round(finalTotalAmount / 2) : prev));
    }
  }, [paymentType, finalTotalAmount]);

  // Form submission
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent, shouldPrint: boolean = false) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!selectedPartyId) {
      setFormError(isReturn ? 'لطفاً تأمین‌کننده مرجوعی را انتخاب فرمایید.' : 'لطفاً طرف حساب (تأمین‌کننده) را انتخاب فرمایید.');
      return;
    }

    const validRows = rows.filter(r => r.productId && r.quantity > 0);
    if (validRows.length === 0) {
      setFormError('لطفاً حداقل یک قلم کالا با تعداد مشخص در یکی از ردیف‌های ۵‌گانه وارد نمایید.');
      return;
    }

    setIsSubmitting(true);

    const party = parties.find(p => p.id === selectedPartyId);
    const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);

    const invoiceItems: InvoiceItem[] = validRows.map(r => {
      const prod = products.find(p => p.id === r.productId);
      const bagsPerTon = prod?.bagsPerTon || 20;
      const { bags, tons } = calculateBagsAndTons(r.quantity, r.unit, bagsPerTon);
      return {
        id: 'item-' + Date.now() + Math.random(),
        productId: r.productId,
        productName: r.productName || prod?.name || 'کالا',
        warehouseId: selectedWarehouseId,
        warehouseName: selectedWh?.name,
        description: r.description.trim() || undefined,
        unit: r.unit,
        quantity: r.quantity,
        bagsCount: bags,
        tonsCount: tons,
        unitPrice: r.unitPrice,
        currency,
        totalPrice: r.totalPrice,
      };
    });

    const paymentStatus =
      paidAmount >= finalTotalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    try {
      const created = createInvoice({
        invoiceNumber: invoiceNumber.trim() || getNextInvoiceNumber(invoiceType),
        type: invoiceType,
        date: invoiceDate,
        partyId: selectedPartyId,
        partyName: party ? party.name : 'تأمین‌کننده کالا',
        partyPhone: party?.phone,
        partyAddress: party?.address,
        warehouseId: selectedWarehouseId,
        currency,
        items: invoiceItems,
        subtotal: itemsSubtotal,
        discount,
        totalAmount: finalTotalAmount,
        paidAmount,
        balanceAmount: remainingDebt,
        paymentStatus,
        dealType,
        dealTypeLabel: dealType,
        consignmentWarehouseId: (dealType.includes('امانی') || dealType.toLowerCase().includes('consignment'))
          ? (consignmentWarehouseId || consignmentWarehouses[0]?.id || 'wh-2')
          : undefined,
        consignmentWarehouseName: (dealType.includes('امانی') || dealType.toLowerCase().includes('consignment'))
          ? (consignmentWarehouses.find(w => w.id === consignmentWarehouseId)?.name || 'گدام امانی')
          : undefined,
        exchangeRate,
        extraExpenses: extraExpenses.map(e => ({
          id: e.id,
          partyName: e.partyName,
          title: e.title,
          currency: e.currency,
          amount: e.amount,
        })),
        extraExpensesTotal,
        paymentType,
        cashRegister: selectedCashAccountId,
        cashRegisterId: selectedCashAccountId,
        notes: `نوع معامله: ${dealType}${extraExpensesTotal > 0 ? ` | هزینه‌های جانبی: ${extraExpensesTotal} ${currency}` : ''}`,
      });

      if (shouldPrint) {
        openPrintModal({
          type: 'invoice',
          invoice: created,
        });
      }

      onViewInvoice(created.id);
    } catch (err) {
      console.error(err);
      setFormError('خطا در ثبت فاکتور خرید. لطفاً مقادیر را بررسی نمایید.');
      setIsSubmitting(false);
    }
  };

  const gregorianDateStr = getGregorianEquivalent(invoiceDate);

  return (
    <div className="w-full font-sans text-slate-800" dir="rtl">
      {isReturn && (
        <div className="mb-4 p-3 bg-purple-50 border-2 border-purple-500 rounded-2xl flex items-center justify-between text-purple-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-purple-600 text-white font-black rounded-lg text-xs shadow-2xs">
              فاکتور برگشت
            </span>
            <span className="text-xs font-bold">
              حالت فعال: ثبت فاکتور برگشت از خرید (مرجوعی کالا به تأمین‌کننده). در کلیه فرم‌ها و چاپ، سند به عنوان «فاکتور برگشت» مشخص می‌گردد.
            </span>
          </div>
        </div>
      )}

      {formError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
          <X className="w-4 h-4 text-rose-500" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={e => handleSubmit(e, false)} className="space-y-5">
        {/* ========================================================================= */}
        {/* ROW 1: 5 HEADER COLUMNS (EXACTLY AS SCREENSHOT IMG-20260906-WA0000.jpg) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-start">
          {/* 1. طرف حساب (تأمین‌کننده کالا) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>طرف حساب (تأمین‌کننده کالا)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={partySearch}
                  onChange={e => setPartySearch(e.target.value)}
                  placeholder="جستجو بر اساس نام یا کد..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
                {partySearch && filteredParties.length > 0 && partySearch !== parties.find(p => p.id === selectedPartyId)?.name && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                    {filteredParties.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPartyId(p.id);
                          setPartySearch(p.name);
                        }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                      >
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.phone || p.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsQuickPartyModalOpen(true)}
                title="افزودن طرف حساب جدید"
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. تاریخ فاکتور (شمسی) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>تاریخ فاکتور (شمسی)</span>
            </label>
            <input
              type="text"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              placeholder="1405/06/15"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center"
            />
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>معادل میلادی (دیتابیس): {gregorianDateStr}</span>
            </div>
          </div>

          {/* 3. شماره فاکتور خرید */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-red-500">*</span>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>شماره فاکتور خرید</span>
              </label>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                اتوماتیک
              </span>
            </div>
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              tabIndex={-1}
              title="شماره سند خرید کاملاً خودکار توسط سیستم صادر می‌شود"
              placeholder="155"
              className="w-full px-3 py-2 bg-slate-100/90 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-800 text-center cursor-not-allowed select-none shadow-inner"
            />
          </div>

          {/* 4. گدام / انبار ورودی */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <WarehouseIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>گدام / انبار ورودی</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            >
              <option value="">انتخاب انبار ورودی...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.location ? `(${w.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 5. نوع معامله (3 گزینه طبق درخواست کاربر) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <Ticket className="w-3.5 h-3.5 text-blue-600" />
              <span>نوع معامله</span>
            </label>
            <select
              value={dealType}
              onChange={e => setDealType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            >
              <option value="خرید قطعی (عادی)">خرید قطعی (عادی)</option>
              <option value="دریافت امانی یعنی به گدام امانی سپرده میشود">
                دریافت امانی یعنی به گدام امانی سپرده میشود
              </option>
              <option value="پیش‌خرید (تحویل بعداً)">پیش‌خرید (تحویل بعداً)</option>
            </select>
          </div>
        </div>

        {/* Consignment info banner when dealType is consignment */}
        {(dealType.includes('امانی') || dealType.toLowerCase().includes('consignment')) && (
          <div className="mt-2 p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-blue-950 block">انتقال خودکار کالا به گدام امانی:</span>
                <span className="text-[11px] text-blue-700">
                  {isReturn
                    ? `اجناس مرجوعی از گدام امانی کسر و به تأمین‌کننده عودت داده خواهند شد.`
                    : `اجناس دریافت شده مستقیماً در موجودی و کارتکس گردش «گدام امانی» واریز و ثبت می‌گردند.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <label className="text-[11px] font-bold text-blue-900">گدام امانی مقصد:</label>
              <select
                value={consignmentWarehouseId || consignmentWarehouses[0]?.id || 'wh-2'}
                onChange={e => setConsignmentWarehouseId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 outline-none"
              >
                {consignmentWarehouses.map(cw => (
                  <option key={cw.id} value={cw.id}>
                    {cw.name} {cw.location ? `(${cw.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 2: CURRENCY & EXCHANGE RATE (EXACTLY AS SCREENSHOT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* انتخاب ارز فاکتور خرید */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-red-500">*</span>
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>انتخاب ارز فاکتور خرید</span>
              </label>
              <button
                type="button"
                id="btn-toggle-currency-purchase-top"
                onClick={handleToggleCurrency}
                title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ جاری سیستم (${formatNumber(currencies.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
                className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
              >
                <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                <span>تغییر ارز ({currency === 'USD' ? 'تبدیل به افغانی ؋' : 'تبدیل به دلار $'})</span>
              </button>
            </div>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            >
              {currencies && currencies.length > 0 ? (
                currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))
              ) : (
                <>
                  <option value="USD">دلار (USD)</option>
                  <option value="AFN">افغانی (AFN)</option>
                </>
              )}
            </select>
          </div>

          {/* نرخ تسعیر */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>نرخ تسعیر (نرخ تبدیل نسبت به ارز پایه)</span>
            </label>
            <input
              type="number"
              step="any"
              value={exchangeRate}
              onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-left"
              dir="ltr"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ITEMS TABLE (EXACTLY AS SCREENSHOT IMG-20260900.jpg) */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 w-[26%]">نام یا کد کالا</th>
                  <th className="py-2.5 px-3 w-[14%]">واحد اندازه‌گیری</th>
                  <th className="py-2.5 px-3 w-[10%] text-center">تعداد</th>
                  <th className="py-2.5 px-3 w-[15%] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>قیمت واحد</span>
                      <button
                        type="button"
                        id="btn-toggle-currency-purchase-col"
                        onClick={handleToggleCurrency}
                        title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ روز`}
                        className="px-1.5 py-0.5 text-[10px] font-black rounded bg-blue-100 hover:bg-blue-200 text-blue-900 transition flex items-center gap-0.5 cursor-pointer border border-blue-300/80 shadow-2xs active:scale-95"
                      >
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        <span>تغییر ارز</span>
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 w-[15%] text-center">مبلغ کل ({currency})</th>
                  <th className="py-2.5 px-3 w-[16%]">توضیحات ردیف (اختیاری)</th>
                  <th className="py-2.5 px-3 w-[4%] text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    {/* 1. نام یا کد کالا (تایپ و جستجوی هوشمند Autocomplete) */}
                    <td className="p-2 min-w-[220px]">
                      <ProductSearchSelector
                        id={`prod-search-${row.id}`}
                        compact
                        products={products}
                        selectedProductId={row.productId}
                        warehouseId={selectedWarehouseId}
                        currency={currency}
                        priceType="buy"
                        placeholder="تایپ نام، کد یا بارکد کالا..."
                        onSelectProduct={(p) => {
                          handleUpdateRow(row.id, { productId: p.id, productName: p.name });
                        }}
                        onClear={() => {
                          handleUpdateRow(row.id, { productId: '', productName: '', unitPrice: 0, totalPrice: 0 });
                        }}
                        onAdvanceFocus={() => {
                          document.getElementById(`qty-input-${row.id}`)?.focus();
                        }}
                      />
                    </td>

                    {/* 2. واحد اندازه‌گیری */}
                    <td className="p-2">
                      <select
                        value={row.unit}
                        onChange={e => handleUpdateRow(row.id, { unit: e.target.value as Unit })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-blue-500 outline-none"
                      >
                        <option value="ton">تن</option>
                        <option value="bag">بوجی (کیسه)</option>
                      </select>
                    </td>

                    {/* 3. تعداد */}
                    <td className="p-2">
                      <input
                        id={`qty-input-${row.id}`}
                        type="number"
                        step="any"
                        min="0"
                        value={row.quantity || ''}
                        onChange={e => handleUpdateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`price-input-${row.id}`)?.focus();
                          }
                        }}
                        placeholder="تعداد"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* 4. قیمت واحد */}
                    <td className="p-2">
                      <input
                        id={`price-input-${row.id}`}
                        type="number"
                        step="any"
                        min="0"
                        value={row.unitPrice || ''}
                        onChange={e => handleUpdateRow(row.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const isLast = index === rows.length - 1;
                            if (isLast && row.productId) {
                              handleAddRow();
                            } else if (rows[index + 1]) {
                              document.getElementById(`prod-search-${rows[index + 1].id}`)?.focus();
                            }
                          }
                        }}
                        placeholder="نرخ فی"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center text-slate-800 focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* 5. مبلغ کل */}
                    <td className="p-2">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <span className="px-2 py-1 bg-slate-100 text-[11px] font-bold text-slate-500 font-mono border-l border-slate-200">
                          {currency}
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={row.totalPrice.toLocaleString()}
                          className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-800 text-center bg-transparent outline-none"
                        />
                      </div>
                    </td>

                    {/* 6. توضیحات ردیف (اختیاری) */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => handleUpdateRow(row.id, { description: e.target.value })}
                        placeholder="توضیحات اختیاری این کالا"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:border-blue-500 outline-none"
                      />
                    </td>

                    {/* 7. عملیات (حذف) */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="w-7 h-7 mx-auto rounded-full border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* افزودن ردیف جدید button و دکمه تغییر ارز */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-blue-500 text-blue-600 bg-white hover:bg-blue-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن ردیف جدید</span>
            </button>
            <button
              type="button"
              id="btn-toggle-currency-purchase-table"
              onClick={handleToggleCurrency}
              title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی (نرخ روز سیستم: ۱ دلار = ${formatNumber(currencies.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100 text-xs font-black transition shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span>تغییر ارز ({currency === 'USD' ? 'تبدیل به افغانی ؋' : 'تبدیل به دلار $'})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MIDDLE SECTION: جمع کل اقلام | تخفیف کلی */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">جمع کل اقلام</label>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
              <span className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                {currency}
              </span>
              <input
                type="text"
                readOnly
                value={itemsSubtotal.toLocaleString()}
                className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">تخفیف کلی</label>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
              <span className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXTRA EXPENSES BOX: هزینه‌های جانبی فاکتور (کرایه، تخلیه و غیره) */}
        {/* ========================================================================= */}
        <div className="bg-blue-50/50 border border-blue-200 rounded-3xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-blue-100 pb-2 text-blue-900 font-bold text-xs">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>هزینه‌های جانبی فاکتور (کرایه، تخلیه و غیره)</span>
          </div>

          {extraExpenses.length > 0 ? (
            <div className="border border-blue-200/80 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100/50 text-blue-900 font-bold border-b border-blue-200">
                    <th className="py-2 px-3">طرف حساب (کد یا نام) *</th>
                    <th className="py-2 px-3">شرح هزینه *</th>
                    <th className="py-2 px-3">ارز پرداخت *</th>
                    <th className="py-2 px-3 text-center">مبلغ هزینه *</th>
                    <th className="py-2 px-3 w-10 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {extraExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={exp.partyName}
                          onChange={e => handleUpdateExpense(exp.id, { partyName: e.target.value })}
                          placeholder="مثلاً: راننده موتر / انباردار"
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={exp.title}
                          onChange={e => handleUpdateExpense(exp.id, { title: e.target.value })}
                          placeholder="کرایه حمل / باسکول / بارگیری"
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={exp.currency}
                          onChange={e => handleUpdateExpense(exp.id, { currency: e.target.value as Currency })}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        >
                          <option value="USD">USD</option>
                          <option value="AFN">AFN</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={exp.amount}
                          onChange={e => handleUpdateExpense(exp.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              هیچ هزینه جانبی برای این فاکتور ثبت نشده است. در صورت نیاز به ثبت کرایه، باسکول یا بارگیری روی دکمه زیر کلیک نمایید.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={handleAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن هزینه جدید</span>
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 block">مجموع هزینه‌های جانبی (تسعیرشده)</span>
                <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                  <span className="px-2 py-1 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                    {currency}
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={extraExpensesTotal.toLocaleString()}
                    className="w-32 px-2 py-1 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none"
                  />
                </div>
              </div>

              {/* Dark black pill badge for final amount + expenses */}
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-500 block">مبلغ نهایی فاکتور + هزینه‌ها</span>
                <div className="inline-flex items-center gap-2 bg-slate-900 text-white font-mono px-4 py-2 rounded-xl text-base font-black shadow-xs">
                  <span>{currency}</span>
                  <span>{finalTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  معادل ارز پایه: {baseCurrencyEquivalent.toLocaleString()} ؋
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM PAYMENT SECTION */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {/* نوع پرداخت: نقدی، نسیه، نیمه نسیه */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>نوع پرداخت</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {paymentType === 'نقدی' ? 'تسویه نقدی' : paymentType === 'نسیه' ? 'قرض حسابی کامل' : 'بخشی نقد، مابقی قرض'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-xl border border-slate-300/80">
                <button
                  type="button"
                  onClick={() => setPaymentType('نقدی')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentType === 'نقدی'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  نقدی
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('نسیه')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentType === 'نسیه'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  نسیه
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('نیمه نسیه')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentType === 'نیمه نسیه'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/60'
                  }`}
                >
                  نیمه نسیه
                </button>
              </div>
            </div>

            {/* پرداخت از صندوق مبدأ */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                {paymentType !== 'نسیه' && <span className="text-red-500">*</span>}
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>{isReturn ? 'واریز به صندوق (استرداد وجه)' : 'پرداخت از صندوق مبدأ'}</span>
                {paymentType === 'نسیه' && (
                  <span className="text-[10px] text-slate-400 font-normal mr-auto">(اختیاری در نسیه)</span>
                )}
              </label>
              <select
                value={selectedCashAccountId}
                onChange={e => setSelectedCashAccountId(e.target.value)}
                disabled={paymentType === 'نسیه'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{paymentType === 'نسیه' ? 'بدون پرداخت از صندوق (قرض دفتری)' : 'انتخاب صندوق...'}</option>
                {cashAccounts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* مبلغ پرداختی */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{isReturn ? 'مبلغ استرداد نقدی' : 'مبلغ پرداختی (نقدی)'}</span>
                {paymentType === 'نیمه نسیه' && (
                  <span className="text-[10px] text-amber-600 font-bold">مبلغ نقد را وارد کنید</span>
                )}
              </label>
              <div className="flex items-center bg-white border border-emerald-500 rounded-xl overflow-hidden ring-1 ring-emerald-500/20">
                <span className="px-3 py-2 bg-emerald-50 text-xs font-bold text-emerald-600 font-mono border-l border-emerald-200">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  max={finalTotalAmount}
                  step="any"
                  value={paidAmount}
                  disabled={paymentType === 'نسیه'}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setPaidAmount(val);
                    if (val > 0 && val < finalTotalAmount) {
                      setPaymentType('نیمه نسیه');
                    } else if (val >= finalTotalAmount && finalTotalAmount > 0) {
                      setPaymentType('نقدی');
                    } else if (val === 0) {
                      setPaymentType('نسیه');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* باقی‌مانده بدهی */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isReturn ? 'باقی‌مانده طلب از تأمین‌کننده' : 'باقی‌مانده بدهی (نسیه)'}
              </label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                <span className="px-3 py-2 bg-rose-50 text-xs font-bold text-rose-600 font-mono border-l border-rose-200">
                  {currency}
                </span>
                <input
                  type="text"
                  readOnly
                  value={remainingDebt.toLocaleString()}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-rose-700 text-center bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Persistent Supplier Account Balance Status on System */}
          {(() => {
            const party = parties.find(p => p.id === selectedPartyId);
            if (!party) return null;
            const prevPartyBal = currency === 'AFN' ? party.balanceAFN : party.balanceUSD;
            // For buy: we owe supplier money -> balance increases positively (or decreases our debt if returning)
            const resultingBal = isReturn ? (prevPartyBal - remainingDebt) : (prevPartyBal + remainingDebt);

            return (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-700">وضعیت الباقی حساب تأمین‌کننده در سیستم:</span>
                    <span className="font-black text-slate-950 text-sm">{party.name}</span>
                    {party.phone && (
                      <span className="text-[11px] text-slate-500 font-mono">({party.phone})</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">واحد محاسبه: {currency}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Previous Balance */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5">
                    <span className="text-[11px] text-slate-500 block">مانده حساب قبلی شخص:</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {Math.abs(prevPartyBal).toLocaleString()} {currency}
                      </span>
                      <span className={`text-[10.5px] font-bold ${prevPartyBal > 0 ? 'text-blue-600' : prevPartyBal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {prevPartyBal > 0 ? 'طلبکار از ما' : prevPartyBal < 0 ? 'بدهکار به ما' : 'بی‌حساب'}
                      </span>
                    </div>
                  </div>

                  {/* This Invoice Debt Impact */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5">
                    <span className="text-[11px] text-slate-500 block">مانده ثبت نشده در این فاکتور:</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {remainingDebt.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10.5px] font-bold text-blue-600">
                        {remainingDebt > 0 ? '+ طلب تأمین‌کننده' : 'تسویه نقدی کامل'}
                      </span>
                    </div>
                  </div>

                  {/* Resulting Final Supplier Balance */}
                  <div className={`p-2.5 rounded-xl border space-y-0.5 ${
                    resultingBal > 0
                      ? 'bg-blue-50 border-blue-200'
                      : resultingBal < 0
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="text-[11px] text-slate-700 block font-bold">الباقی کل حساب شخص پس از ثبت:</span>
                    <div className="flex items-baseline justify-between">
                      <span className={`font-mono font-black text-sm ${
                        resultingBal > 0 ? 'text-blue-700' : resultingBal < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {Math.abs(resultingBal).toLocaleString()} {currency}
                      </span>
                      <span className={`text-[10.5px] font-black ${
                        resultingBal > 0 ? 'text-blue-700' : resultingBal < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {resultingBal > 0 ? 'طلبکار نهایی' : resultingBal < 0 ? 'بدهکار به ما' : 'تسویه کامل (صفر)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={e => handleSubmit(e, true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isReturn ? 'ثبت و چاپ فاکتور برگشت' : 'ثبت و چاپ'}</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-blue-500 text-blue-700 hover:bg-blue-50 bg-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isReturn ? 'ثبت نهایی فاکتور برگشت' : 'ثبت فاکتور'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Quick Add Party Modal */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        initialType="supplier"
        onPartyAdded={newParty => {
          setSelectedPartyId(newParty.id);
          setPartySearch(newParty.name);
          setIsQuickPartyModalOpen(false);
        }}
      />
    </div>
  );
};
