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
  X,
  Wallet,
  Printer,
  Check,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { getTelegramSettings, sendInvoiceToTelegramBot } from '../services/telegramBotService';
import { sendTelegramDirectMessage, buildInvoiceTelegramText } from '../services/telegramApiService';

interface SalesInvoiceCreateViewProps {
  onBackToList?: () => void;
  onViewInvoice: (id: string) => void;
  invoiceType?: 'sell' | 'return_sell';
}

interface ItemRowState {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string;
}

export const SalesInvoiceCreateView: React.FC<SalesInvoiceCreateViewProps> = ({
  onBackToList,
  onViewInvoice,
  invoiceType = 'sell',
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
    getProductStock,
    getNextInvoiceNumber,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Top header fields (matching screenshot IMG-20260906-WA0001.jpg)
  const isReturn = invoiceType === 'return_sell';
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [partySearch, setPartySearch] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(getPersianDate());
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => getNextInvoiceNumber(invoiceType));
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');

  // Keep invoice number in sync if invoiceType changes
  useEffect(() => {
    setInvoiceNumber(getNextInvoiceNumber(invoiceType));
  }, [invoiceType]);

  // 3 choices for deal type as explicitly requested by the user:
  // 1. فروش قطعی (عادی)
  // 2. ارسال امانی (به گدام امانی سپرده می‌شود)
  // 3. پیش‌فروش (تحویل بعداً)
  const [dealType, setDealType] = useState<string>(
    isReturn ? 'برگشت قطعی کالا' : 'فروش قطعی (عادی)'
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

  // Items table rows (Starts with 1 empty item row ready for instant search)
  const [rows, setRows] = useState<ItemRowState[]>([
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

  // Bottom section: discount, shipping, payment type, cash account, paid amount
  const [discount, setDiscount] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);

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

  // Handle party search matching
  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    const q = partySearch.toLowerCase();
    return parties.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
  }, [parties, partySearch]);

  // Add new item row and focus search input
  const handleAddRow = () => {
    const newId = 'row-' + Date.now() + Math.random().toString(36).substring(2, 6);
    const newRow: ItemRowState = {
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
      // If only 1 row, reset it instead of empty
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

  // Update item row field
  const handleUpdateRow = (id: string, updates: Partial<ItemRowState>) => {
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
              const basePrice = currency === 'AFN' ? prod.sellPriceAFN : prod.sellPriceUSD;
              if (updated.unit === 'bag') {
                updated.unitPrice = Math.round(basePrice / (prod.bagsPerTon || 20));
              } else {
                updated.unitPrice = basePrice;
              }
            }
          }
        }

        // If unit changed
        if (updates.unit) {
          const prod = products.find(p => p.id === updated.productId);
          if (prod) {
            const basePrice = currency === 'AFN' ? prod.sellPriceAFN : prod.sellPriceUSD;
            if (updates.unit === 'bag') {
              updated.unitPrice = Math.round(basePrice / (prod.bagsPerTon || 20));
            } else {
              updated.unitPrice = basePrice;
            }
          }
        }

        // Recompute total price
        updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      })
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

      // Convert discount & shipping
      if (discount > 0) setDiscount(Math.round(discount * effectiveRate * 100) / 100);
      if (shippingCost > 0) setShippingCost(Math.round(shippingCost * effectiveRate * 100) / 100);
      if (paidAmount > 0 && paymentType !== 'نقدی') {
        setPaidAmount(Math.round(paidAmount * effectiveRate * 100) / 100);
      }

      // Switch to AFN cash account
      const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
      if (afnAcc) setSelectedCashAccountId(afnAcc.id);

      notify('info', 'تغییر ارز به افغانی (؋)', `کلیه ستون‌های مبالغ و قیمت‌های فاکتور با نرخ روز (۱ دلار = ${formatNumber(effectiveRate)} افغانی) به صورت لحظه‌ای به افغانی تبدیل شدند.`);
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

      // Convert discount & shipping
      if (discount > 0) setDiscount(Number((discount / effectiveRate).toFixed(2)));
      if (shippingCost > 0) setShippingCost(Number((shippingCost / effectiveRate).toFixed(2)));
      if (paidAmount > 0 && paymentType !== 'نقدی') {
        setPaidAmount(Number((paidAmount / effectiveRate).toFixed(2)));
      }

      // Switch to USD cash account
      const usdAcc = cashAccounts.find(a => a.currency === 'USD');
      if (usdAcc) setSelectedCashAccountId(usdAcc.id);

      notify('info', 'تغییر ارز به دلار ($)', `کلیه ستون‌های مبالغ و قیمت‌های فاکتور با نرخ روز (۱ دلار = ${formatNumber(effectiveRate)} افغانی) به صورت لحظه‌ای به دلار تبدیل شدند.`);
    }
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  }, [rows]);

  // Final amount to receive = subtotal - discount + shippingCost
  const netPayable = useMemo(() => {
    return Math.max(0, subtotal - (discount || 0) + (shippingCost || 0));
  }, [subtotal, discount, shippingCost]);

  // Remaining balance
  const remainingBalance = useMemo(() => {
    return Math.max(0, netPayable - (paidAmount || 0));
  }, [netPayable, paidAmount]);

  // Auto-fill paidAmount according to user's paymentType choice
  useEffect(() => {
    if (paymentType === 'نقدی') {
      setPaidAmount(netPayable);
    } else if (paymentType === 'نسیه') {
      setPaidAmount(0);
    } else if (paymentType === 'نیمه نسیه') {
      // If switching to semi-credit and paidAmount was 0 or full, default to half
      setPaidAmount(prev => (prev === 0 || prev >= netPayable ? Math.round(netPayable / 2) : prev));
    }
  }, [paymentType, netPayable]);

  // Estimated profit calculation
  const estimatedProfit = useMemo(() => {
    let profit = 0;
    rows.forEach(r => {
      const prod = products.find(p => p.id === r.productId);
      if (prod && r.quantity > 0) {
        const buyPrice = currency === 'AFN' ? prod.buyPriceAFN : prod.buyPriceUSD;
        let effectiveCost = buyPrice;
        if (r.unit === 'bag') {
          effectiveCost = buyPrice / (prod.bagsPerTon || 20);
        }
        const unitMargin = (r.unitPrice || 0) - effectiveCost;
        profit += unitMargin * (r.quantity || 0);
      }
    });
    return Math.max(0, profit);
  }, [rows, products, currency]);

  // Form submission (Print & Save or Save only)
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent, shouldPrint: boolean = false, sendTelegramNow: boolean = false) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!selectedPartyId) {
      setFormError(isReturn ? 'لطفاً مشتری مرجوع‌کننده را مشخص فرمایید.' : 'لطفاً طرف حساب (مشتری) را انتخاب فرمایید.');
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

    // Convert only the filled rows to InvoiceItem format
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
      paidAmount >= netPayable ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    try {
      const created = createInvoice({
        invoiceNumber: invoiceNumber.trim() || getNextInvoiceNumber(invoiceType),
        type: invoiceType,
        date: invoiceDate,
        partyId: selectedPartyId,
        partyName: party ? party.name : 'مشتری نقدی',
        partyPhone: party?.phone,
        partyAddress: party?.address,
        warehouseId: selectedWarehouseId,
        currency,
        items: invoiceItems,
        subtotal,
        discount,
        totalAmount: netPayable,
        paidAmount,
        balanceAmount: remainingBalance,
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
        shippingCost,
        paymentType,
        cashRegister: selectedCashAccountId,
        cashRegisterId: selectedCashAccountId,
        notes: `نوع معامله: ${dealType}${shippingCost > 0 ? ` | کرایه خروجی: ${shippingCost} ${currency}` : ''}`,
      });

      // Auto-send or manual button send to Telegram
      const tgSettings = getTelegramSettings();
      if (sendTelegramNow || tgSettings.autoSendOnSave) {
        const targetChat = party?.telegramChatId || tgSettings.defaultChatId;
        if (targetChat) {
          const text = buildInvoiceTelegramText(created, party || undefined, companySettings);

          // Fast & secure backend proxy
          sendTelegramDirectMessage({
            chatId: targetChat,
            partyId: party?.id,
            partyName: party?.name || created.partyName,
            messageType: 'invoice',
            title: `فاکتور رسمی #${created.invoiceNumber}`,
            textContent: text,
          })
            .then(res => {
              if (res.success) {
                notify('success', 'ارسال فاکتور به تلگرام', `فاکتور #${created.invoiceNumber} به تلگرام ${party?.name || 'مشتری'} ارسال گردید.`);
              } else if (tgSettings.botToken) {
                // Client fallback
                sendInvoiceToTelegramBot(
                  {
                    invoice: created,
                    party,
                    customerPhone: party?.phone,
                    companyName: companySettings?.name || 'شرکت تجارتی برادران نبوی',
                    companyPhone: companySettings?.phone || '',
                    remainingBalanceThisInvoice: remainingBalance,
                    customerOverallBalanceAFN: party?.balanceAFN || 0,
                    customerOverallBalanceUSD: party?.balanceUSD || 0,
                    targetChatId: targetChat,
                  },
                  tgSettings
                ).then(fbRes => {
                  if (fbRes.success) {
                    notify('success', 'ارسال فاکتور به تلگرام', `فاکتور #${created.invoiceNumber} به تلگرام ${party?.name || 'مشتری'} ارسال گردید.`);
                  } else if (sendTelegramNow) {
                    notify('error', 'خطا در ارسال به تلگرام', fbRes.message);
                  }
                });
              } else if (sendTelegramNow) {
                notify('error', 'خطا در ارسال به تلگرام', res.error || 'ارسال فاکتور ناموفق بود.');
              }
            })
            .catch(err => {
              console.warn('Telegram send failed:', err);
              if (sendTelegramNow) {
                notify('error', 'خطای شبکه در ارسال به تلگرام', err?.message || 'نامشخص');
              }
            });
        } else if (sendTelegramNow) {
          notify('info', 'تلگرام مشتری متصل نیست', 'این مشتری هنوز در ربات تلگرام استارت نزده یا شماره ثبت نکرده است.');
        }
      }

      if (shouldPrint) {
        openPrintModal({
          type: 'invoice',
          invoice: created,
        });
      }

      onViewInvoice(created.id);
    } catch (err) {
      console.error(err);
      setFormError('خطا در ذخیره فاکتور. لطفاً ورودی‌ها را بررسی نمایید.');
      setIsSubmitting(false);
    }
  };

  // Gregorian equivalent of the entered Persian date
  const gregorianDateStr = getGregorianEquivalent(invoiceDate);

  return (
    <div className="w-full font-sans text-slate-800" dir="rtl">
      {isReturn && (
        <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-500 rounded-2xl flex items-center justify-between text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-xs shadow-2xs">
              فاکتور برگشت
            </span>
            <span className="text-xs font-bold">
              حالت فعال: ثبت فاکتور برگشت از فروش (مرجوعی کالا توسط مشتری). در سیستم و چاپ، سند به عنوان «فاکتور برگشت» صادر می‌شود.
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
        {/* ROW 1: 5 HEADER COLUMNS (EXACTLY AS SCREENSHOT IMG-20260906-WA0001.jpg) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-start">
          {/* 1. طرف حساب (مشتری) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>طرف حساب (مشتری)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={partySearch}
                  onChange={e => {
                    setPartySearch(e.target.value);
                  }}
                  placeholder="جستجو بر اساس نام یا کد..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
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
                        className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between border-b border-slate-100 last:border-0"
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
                className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. تاریخ فروش (شمسی) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>تاریخ {isReturn ? 'برگشت از فروش' : 'فروش'} (شمسی)</span>
            </label>
            <input
              type="text"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              placeholder="1405/06/15"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-center"
            />
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>معادل میلادی: {gregorianDateStr}</span>
            </div>
          </div>

          {/* 3. شماره فاکتور */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-red-500">*</span>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>شماره فاکتور {isReturn ? 'مرجوعی' : 'فروش'}</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                اتوماتیک
              </span>
            </div>
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              tabIndex={-1}
              title="شماره سند کاملاً خودکار توسط سیستم صادر می‌شود"
              placeholder="513"
              className="w-full px-3 py-2 bg-slate-100/90 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-800 text-center cursor-not-allowed select-none shadow-inner"
            />
          </div>

          {/* 4. گدام / انبار */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <WarehouseIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>{isReturn ? 'گدام ورودی مرجوعی' : 'گدام / انبار خروجی'}</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            >
              <option value="">انتخاب انبار...</option>
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
              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
              <span>نوع معامله</span>
            </label>
            <select
              value={dealType}
              onChange={e => setDealType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            >
              {isReturn ? (
                <>
                  <option value="برگشت قطعی کالا">برگشت قطعی کالا (ورود به گدام)</option>
                  <option value="برگشت کالای امانی">برگشت کالای امانی خریدار</option>
                  <option value="اصلاح و ابطال فروش">اصلاح و ابطال فاکتور فروش قبلی</option>
                </>
              ) : (
                <>
                  <option value="فروش قطعی (عادی)">فروش قطعی (عادی)</option>
                  <option value="ارسال امانی یعنی به گدام امانی سپرده میشود">
                    ارسال امانی یعنی به گدام امانی سپرده میشود
                  </option>
                  <option value="پیش فروش تحویل بعدا">پیش فروش تحویل بعدا</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Consignment info banner when dealType is consignment */}
        {(dealType.includes('امانی') || dealType.toLowerCase().includes('consignment')) && (
          <div className="mt-2 p-3 bg-teal-50/90 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 text-teal-900">
              <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 text-teal-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-teal-950 block">انتقال خودکار کالا به گدام امانی:</span>
                <span className="text-[11px] text-teal-700">
                  {isReturn
                    ? `اجناس مرجوعی از گدام امانی خارج و به انبار ورودی مرجوعی برگردانده خواهند شد.`
                    : `جنس از ${warehouses.find(w => w.id === selectedWarehouseId)?.name || 'گدام خروجی'} کسر گردیده و مستقیماً در موجودی و کارتکس گردش «گدام امانی» واریز و ثبت می‌گردد.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <label className="text-[11px] font-bold text-teal-900">گدام امانی مقصد:</label>
              <select
                value={consignmentWarehouseId || consignmentWarehouses[0]?.id || 'wh-2'}
                onChange={e => setConsignmentWarehouseId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-teal-900 outline-none"
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
          {/* انتخاب ارز فاکتور فروش */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-red-500">*</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>انتخاب ارز فاکتور {isReturn ? 'برگشت از فروش' : 'فروش'}</span>
              </label>
              <button
                type="button"
                id="btn-toggle-currency-sales-top"
                onClick={handleToggleCurrency}
                title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ جاری سیستم (${formatNumber(currencies.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
                className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-600" />
                <span>تغییر ارز ({currency === 'USD' ? 'تبدیل به افغانی ؋' : 'تبدیل به دلار $'})</span>
              </button>
            </div>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-left"
              dir="ltr"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ITEMS TABLE (EXACTLY AS SCREENSHOT IMG-20260906-WA0001.jpg) */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 w-[24%]">نام یا کد کالا</th>
                  <th className="py-2.5 px-3 w-[12%]">واحد اندازه‌گیری</th>
                  <th className="py-2.5 px-3 w-[12%] text-center">موجود در گدام</th>
                  <th className="py-2.5 px-3 w-[10%] text-center">تعداد فروش</th>
                  <th className="py-2.5 px-3 w-[14%] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>قیمت فروش (فی)</span>
                      <button
                        type="button"
                        id="btn-toggle-currency-sales-col"
                        onClick={handleToggleCurrency}
                        title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ روز`}
                        className="px-1.5 py-0.5 text-[10px] font-black rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition flex items-center gap-0.5 cursor-pointer border border-emerald-300/80 shadow-2xs active:scale-95"
                      >
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        <span>تغییر ارز</span>
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 w-[13%] text-center">جمع کل ({currency})</th>
                  <th className="py-2.5 px-3 w-[12%]">توضیحات ردیف (اختیاری)</th>
                  <th className="py-2.5 px-3 w-[4%] text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => {
                  const stockInfo = selectedWarehouseId && row.productId ? getProductStock(row.productId, selectedWarehouseId) : null;
                  const displayStock = stockInfo
                    ? row.unit === 'bag'
                      ? `${stockInfo.bags.toLocaleString('fa-IR')} بوجی`
                      : `${stockInfo.tons.toLocaleString('fa-IR')} تن`
                    : '---';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition">
                      {/* 1. نام یا کد کالا (تایپ و جستجوی سریع Autocomplete) */}
                      <td className="p-2 min-w-[220px]">
                        <ProductSearchSelector
                          id={`prod-search-${row.id}`}
                          compact
                          products={products}
                          selectedProductId={row.productId}
                          warehouseId={selectedWarehouseId}
                          currency={currency}
                          priceType="sell"
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-emerald-500 outline-none"
                        >
                          <option value="ton">تن</option>
                          <option value="bag">بوجی (کیسه)</option>
                        </select>
                      </td>

                      {/* 3. موجود در گدام */}
                      <td className="p-2 text-center">
                        <div className="bg-sky-50 border border-sky-200 text-sky-700 font-mono text-xs px-2 py-1.5 rounded-lg inline-block w-full text-center font-bold">
                          {displayStock}
                        </div>
                      </td>

                      {/* 4. تعداد فروش */}
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
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center text-slate-800 focus:border-emerald-500 outline-none"
                        />
                      </td>

                      {/* 5. قیمت فروش (فی) */}
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
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center text-slate-800 focus:border-emerald-500 outline-none"
                        />
                      </td>

                      {/* 6. جمع کل */}
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

                      {/* 7. توضیحات ردیف (اختیاری) */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => handleUpdateRow(row.id, { description: e.target.value })}
                          placeholder="توضیحات اختیاری"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:border-emerald-500 outline-none"
                        />
                      </td>

                      {/* 8. حذف */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="w-7 h-7 mx-auto rounded-full border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* افزودن ردیف کالا و دکمه تغییر ارز */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن ردیف کالا</span>
            </button>
            <button
              type="button"
              id="btn-toggle-currency-sales-table"
              onClick={handleToggleCurrency}
              title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی (نرخ روز سیستم: ۱ دلار = ${formatNumber(currencies.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-black transition shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>تغییر ارز ({currency === 'USD' ? 'تبدیل به افغانی ؋' : 'تبدیل به دلار $'})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: LIGHT MINT/GREEN TINTED CONTAINER (EXACTLY AS SCREENSHOT) */}
        {/* ========================================================================= */}
        <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
          {/* Row 1: جمع کل | تخفیف | کرایه خروجی (+) | نوع پرداخت */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* جمع کل */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">جمع کل</label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                  {currency}
                </span>
                <input
                  type="text"
                  readOnly
                  value={subtotal.toLocaleString()}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none"
                />
              </div>
            </div>

            {/* تخفیف */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">تخفیف</label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-500">
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

            {/* کرایه خروجی (+) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">کرایه خروجی (+)</label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={shippingCost}
                  onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none"
                />
              </div>
            </div>

            {/* نوع پرداخت: نقدی، نسیه، نیمه نسیه */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>نوع پرداخت</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {paymentType === 'نقدی' ? 'تسویه کامل' : paymentType === 'نسیه' ? 'قرض حسابی کامل' : 'بخشی نقد، مابقی قرض'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-xl border border-slate-300/80">
                <button
                  type="button"
                  onClick={() => setPaymentType('نقدی')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentType === 'نقدی'
                      ? 'bg-emerald-600 text-white shadow-xs'
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
          </div>

          {/* Row 2: واریز به صندوق مقصد | مبلغ دریافتی | باقی‌مانده */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* واریز به صندوق مقصد */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                {paymentType !== 'نسیه' && <span className="text-red-500">*</span>}
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isReturn ? 'پرداخت از صندوق (استرداد وجه)' : 'واریز به صندوق مقصد'}</span>
                {paymentType === 'نسیه' && (
                  <span className="text-[10px] text-slate-400 font-normal mr-auto">(اختیاری در نسیه)</span>
                )}
              </label>
              <select
                value={selectedCashAccountId}
                onChange={e => setSelectedCashAccountId(e.target.value)}
                disabled={paymentType === 'نسیه'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{paymentType === 'نسیه' ? 'بدون واریز به صندوق (قرض دفتری)' : 'انتخاب صندوق...'}</option>
                {cashAccounts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* مبلغ دریافتی */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{isReturn ? 'مبلغ عودت داده شده' : 'مبلغ دریافتی (نقدی)'}</span>
                {paymentType === 'نیمه نسیه' && (
                  <span className="text-[10px] text-amber-600 font-bold">مبلغ نقد را وارد کنید</span>
                )}
              </label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-500 font-mono border-l border-slate-200">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  max={netPayable}
                  step="any"
                  value={paidAmount}
                  disabled={paymentType === 'نسیه'}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setPaidAmount(val);
                    if (val > 0 && val < netPayable) {
                      setPaymentType('نیمه نسیه');
                    } else if (val >= netPayable && netPayable > 0) {
                      setPaymentType('نقدی');
                    } else if (val === 0) {
                      setPaymentType('نسیه');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 text-center bg-white outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* باقی‌مانده */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isReturn ? 'باقی‌مانده طلب دفتری خریدار' : 'باقی‌مانده حساب (نسیه)'}
              </label>
              <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                <span className="px-3 py-2 bg-rose-50 text-xs font-bold text-rose-600 font-mono border-l border-rose-200">
                  {currency}
                </span>
                <input
                  type="text"
                  readOnly
                  value={remainingBalance.toLocaleString()}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-rose-700 text-center bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Persistent Customer Account Balance Status on System */}
          {(() => {
            const party = parties.find(p => p.id === selectedPartyId);
            if (!party) return null;
            const prevPartyBal = currency === 'AFN' ? party.balanceAFN : party.balanceUSD;
            const resultingBal = isReturn ? (prevPartyBal + remainingBalance) : (prevPartyBal - remainingBalance);

            return (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-700">وضعیت الباقی حساب شخص در سیستم:</span>
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
                    <span className="text-[11px] text-slate-500 block">مانده حساب قبلی مشتری:</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {Math.abs(prevPartyBal).toLocaleString()} {currency}
                      </span>
                      <span className={`text-[10.5px] font-bold ${prevPartyBal < 0 ? 'text-rose-600' : prevPartyBal > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {prevPartyBal < 0 ? 'قرضدار ما' : prevPartyBal > 0 ? 'طلبکار' : 'بی‌حساب'}
                      </span>
                    </div>
                  </div>

                  {/* This Invoice Debt Impact */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-0.5">
                    <span className="text-[11px] text-slate-500 block">اثر نسیه این فاکتور:</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-bold text-rose-700 text-sm">
                        {remainingBalance.toLocaleString()} {currency}
                      </span>
                      <span className="text-[10.5px] font-bold text-rose-600">
                        {remainingBalance > 0 ? '+ افزایش قرض' : 'تسویه نقدی کامل'}
                      </span>
                    </div>
                  </div>

                  {/* Resulting Final Customer Balance */}
                  <div className={`p-2.5 rounded-xl border space-y-0.5 ${
                    resultingBal < 0
                      ? 'bg-rose-50 border-rose-200'
                      : resultingBal > 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="text-[11px] text-slate-700 block font-bold">الباقی کل حساب مشتری پس از ثبت:</span>
                    <div className="flex items-baseline justify-between">
                      <span className={`font-mono font-black text-sm ${
                        resultingBal < 0 ? 'text-rose-700' : resultingBal > 0 ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        {Math.abs(resultingBal).toLocaleString()} {currency}
                      </span>
                      <span className={`text-[10.5px] font-black ${
                        resultingBal < 0 ? 'text-rose-700' : resultingBal > 0 ? 'text-blue-700' : 'text-emerald-700'
                      }`}>
                        {resultingBal < 0 ? 'بدهکار نهایی (قرضدار)' : resultingBal > 0 ? 'بستانکار نهایی (طلبکار)' : 'تسویه کامل (صفر)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Row 3: Action Buttons & Summary Totals */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-emerald-200/60">
            {/* Left side: Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={e => handleSubmit(e, true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isReturn ? 'ثبت و چاپ فاکتور برگشت' : 'ثبت و چاپ فاکتور'}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={e => handleSubmit(e, false, true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="ثبت فاکتور و ارسال مستقیم متن و تصویر فاکتور به ربات تلگرام اختصاصی مشتری"
              >
                <Send className="w-4 h-4 -rotate-45" />
                <span>ثبت و ارسال به تلگرام</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 bg-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isReturn ? 'ثبت نهایی فاکتور برگشت' : 'ثبت فاکتور'}</span>
              </button>
            </div>

            {/* Right side: Grand summary */}
            <div className="text-right w-full sm:w-auto">
              <div className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                مبلغ نهایی جهت دریافت: {currency} {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">
                سود تخمینی (قبل از کسر کرایه و تخفیف): {currency} {estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Party Modal */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        initialType="customer"
        onPartyAdded={newParty => {
          setSelectedPartyId(newParty.id);
          setPartySearch(newParty.name);
          setIsQuickPartyModalOpen(false);
        }}
      />
    </div>
  );
};
