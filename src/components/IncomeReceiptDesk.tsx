import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency } from '../types';
import { formatNumber, formatCurrency, getPersianDate, getCurrentTime } from '../utils/formatters';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  Printer,
  Plus,
  RefreshCw,
  ArrowLeftRight,
  Layers,
} from 'lucide-react';

interface IncomeReceiptDeskProps {
  onSuccess?: () => void;
  onViewList?: () => void;
}

export const IncomeReceiptDesk: React.FC<IncomeReceiptDeskProps> = ({
  onSuccess,
  onViewList,
}) => {
  const {
    cashAccounts,
    cashRegister,
    incomeCategories,
    createIncome,
    getNextIncomeNumber,
    openPrintModal,
  } = useAccounting();

  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(incomeCategories[0]?.id || '');
  const [payer, setPayer] = useState<string>('');
  const [voucherNumber, setVoucherNumber] = useState<string>(() => getNextIncomeNumber());
  const [date, setDate] = useState<string>(getPersianDate());
  const [issueTime, setIssueTime] = useState<string>(getCurrentTime());
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [unitPrice, setUnitPrice] = useState<number | undefined>(undefined);

  // Financial details & Cash register
  const [selectedCashRegister, setSelectedCashRegister] = useState<string>(() => {
    const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
    return afnAcc ? afnAcc.id : 'afn_cash';
  });

  const activeCashAcc = cashAccounts.find(a => a.id === selectedCashRegister);
  const cashboxCurrency = (activeCashAcc?.currency || 'AFN') as Currency;

  // Received Currency (مبلغ فیزیکی دریافتی)
  const [receivedCurrency, setReceivedCurrency] = useState<Currency>(cashboxCurrency);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // Multi-Currency Exchange (اکسچنج ارزی عواید)
  const [isExchange, setIsExchange] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Status & Notifications
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successDoc, setSuccessDoc] = useState<{ id: string; num: string; amount: number; curr: Currency } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automatically sync exchange if received currency differs from cashbox currency
  useEffect(() => {
    if (receivedCurrency !== cashboxCurrency) {
      setIsExchange(true);
    }
  }, [receivedCurrency, cashboxCurrency]);

  // Handle unit price * quantity calculation
  const handleQuantityChange = (qty: number) => {
    setQuantity(qty);
    if (unitPrice && unitPrice > 0) {
      setReceivedAmount(qty * unitPrice);
    }
  };

  const handleUnitPriceChange = (price: number) => {
    setUnitPrice(price);
    if (quantity && quantity > 0) {
      setReceivedAmount(quantity * price);
    }
  };

  // Calculate final deposited amount to the cashbox
  const calculateCashboxDeposit = (): { amount: number; rateUsed: number } => {
    if (!isExchange || receivedCurrency === cashboxCurrency) {
      return { amount: receivedAmount, rateUsed: 1 };
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (receivedCurrency === 'USD' && cashboxCurrency === 'AFN') {
      // Received USD, Depositing to AFN cashbox: amount in AFN = USD * rate
      return { amount: Math.round(receivedAmount * rate), rateUsed: rate };
    } else if (receivedCurrency === 'AFN' && cashboxCurrency === 'USD') {
      // Received AFN, Depositing to USD cashbox: amount in USD = AFN / rate
      return { amount: parseFloat((receivedAmount / rate).toFixed(2)), rateUsed: rate };
    }
    return { amount: receivedAmount, rateUsed: rate };
  };

  const depositDetails = calculateCashboxDeposit();

  const handleSubmit = (e: React.FormEvent, printAfterSave = false) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('لطفاً عنوان یا بابت عاید را مشخص نمایید.');
      return;
    }
    if (receivedAmount <= 0) {
      setErrorMsg('مبلغ دریافتی عاید باید بیشتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = incomeCategories.find(c => c.id === categoryId);
      const selectedReg = cashAccounts.find(a => a.id === selectedCashRegister);

      const exchangeNote = isExchange && receivedCurrency !== cashboxCurrency
        ? ` (دریافت ارزی: ${formatNumber(receivedAmount)} ${receivedCurrency} با نرخ ${exchangeRate} ⇋ واریز ${formatNumber(depositDetails.amount)} ${cashboxCurrency} به ${selectedReg?.name || 'صندوق'})`
        : '';

      const created = createIncome({
        title: title.trim(),
        categoryId,
        categoryName: selectedCat?.name || 'عواید متفرقه',
        amount: depositDetails.amount,
        currency: cashboxCurrency,
        date,
        payer: payer.trim() || undefined,
        receiptNumber: voucherNumber,
        cashRegisterId: selectedCashRegister,
        cashRegisterName: selectedReg?.name,
        quantity: quantity && quantity > 0 ? quantity : undefined,
        unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
        notes: (notes.trim() + exchangeNote).trim() || undefined,
      });

      setSuccessDoc({
        id: created.id,
        num: created.incomeNumber || voucherNumber,
        amount: depositDetails.amount,
        curr: cashboxCurrency,
      });

      if (printAfterSave) {
        openPrintModal({
          type: 'income',
          income: created,
        });
      }

      // Reset form
      setTitle('');
      setPayer('');
      setNotes('');
      setQuantity(undefined);
      setUnitPrice(undefined);
      setReceivedAmount(0);
      setVoucherNumber(getNextIncomeNumber());

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('خطا در ذخیره‌سازی سند عاید: ' + (err?.message || 'ورودی‌ها را بازبینی کنید.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner / Corporate Accent */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
                  میز کار مالی و بازرگانی • بخش دریافت عواید
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  واریز مستقیم به صندوق
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                ثبت و واریز عواید متفرقه تجارتی با پشتیبانی از اکسچنج ارزی
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewList && (
              <button
                type="button"
                onClick={onViewList}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs text-white"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>مشاهده سوابق و لیست عواید</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {successDoc && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm">
                سند عاید با شماره {successDoc.num} با موفقیت ثبت و به صندوق واریز گردید.
              </div>
              <div className="text-xs text-emerald-700 mt-0.5 font-mono">
                مبلغ واریزی: {formatNumber(successDoc.amount)} {successDoc.curr} • مانده صندوق به‌روزرسانی شد.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPrintModal({ type: 'income', income: successDoc })}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ رسید عاید</span>
            </button>
            <button
              type="button"
              onClick={() => setSuccessDoc(null)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Income Form */}
      <form onSubmit={e => handleSubmit(e, false)} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-6 shadow-xs">
        {/* Document Header Metadata: شماره سند | تاریخ | ساعت */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 text-xs">
          <div>
            <label className="text-slate-500 font-bold block mb-1">شماره سند عاید:</label>
            <input
              type="text"
              value={voucherNumber}
              onChange={e => setVoucherNumber(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-500 font-bold block mb-1">تاریخ ثبت:</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 font-bold block mb-1">ساعت ثبت:</label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={issueTime}
                onChange={e => setIssueTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Form Row 1: عنوان عاید & دسته‌بندی & طرف پرداخت‌کننده */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 md:col-span-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <span>عنوان و شرح عاید</span>
            </label>
            <input
              type="text"
              placeholder="مثلاً: فروش ۲۵۰ عدد بوجی خالی، عاید خدمات، سود صرافی..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>گروه و دسته‌بندی عاید</span>
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {incomeCategories && incomeCategories.length > 0 ? (
                incomeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              ) : (
                <option value="">عایدات متفرقه و عمومی</option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span>پرداخت‌کننده / مشتری طرف معامله</span>
              <span className="text-[10px] text-slate-400 font-normal">(اختیاری)</span>
            </label>
            <input
              type="text"
              placeholder="نام شخص، خریدار یا مشتری..."
              value={payer}
              onChange={e => setPayer(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Form Row 2: صندوق واریزی • ارز دریافتی • ارز صندوق */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>صندوق واریزی (مقصد واریز وجه)</span>
            </label>
            <select
              value={selectedCashRegister}
              onChange={e => {
                const regId = e.target.value;
                setSelectedCashRegister(regId);
                const match = cashAccounts.find(a => a.id === regId);
                if (match && !isExchange) {
                  setReceivedCurrency(match.currency);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {cashAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} • موجودی: {formatNumber(acc.balance)} {acc.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>ارز فیزیکی وجه دریافتی</span>
            </label>
            <select
              value={receivedCurrency}
              onChange={e => {
                const curr = e.target.value as Currency;
                setReceivedCurrency(curr);
                if (curr !== cashboxCurrency) {
                  setIsExchange(true);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="AFN">افغانی (AFN ؋)</option>
              <option value="USD">دلار آمریکا (USD $)</option>
              <option value="EUR">یورو (EUR €)</option>
              <option value="PKR">کلدار پاکستان (PKR)</option>
              <option value="IRR">تومان ایران (IRR)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="text-rose-500">*</span>
                <span>مبلغ دریافتی</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-mono font-bold">
                {receivedCurrency}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={receivedAmount || ''}
              onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-black text-slate-900 text-left outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Multi-Currency Exchange Panel (اکسچنج ارزی عواید) */}
        <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-900">
                تسویه چندارزی و اکسچنج درآمد (تبدیل ارز دریافتی به ارز صندوق):
              </span>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isExchange}
                onChange={e => setIsExchange(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-slate-700 select-none">
                فعال‌سازی محاسبه نرخ تبادله (اکسچنج)
              </span>
            </label>
          </div>

          {isExchange && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  نرخ برابری و تسعیر (هر ۱ دلار به افغانی):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setExchangeRate(cashRegister.usdToAfnRate || 65)}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold border border-slate-200 transition cursor-pointer whitespace-nowrap"
                  >
                    نرخ روز سیستم
                  </button>
                </div>
              </div>

              {/* Equivalence Preview Card */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-emerald-800 block">
                    مبلغ نهایی که وارد {activeCashAcc?.name || 'صندوق'} می‌شود:
                  </span>
                  <div className="text-base font-mono font-black text-emerald-950 mt-0.5">
                    {formatNumber(depositDetails.amount)} {cashboxCurrency}
                  </div>
                </div>
                <div className="text-left text-[11px] font-mono text-emerald-700">
                  {receivedCurrency} {formatNumber(receivedAmount)} ⇋ {cashboxCurrency} {formatNumber(depositDetails.amount)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional: تعداد و فی واحد */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              تعداد اقلام فروخته‌شده (اختیاری):
            </label>
            <input
              type="number"
              min="0"
              placeholder="مثلاً: ۲۵۰ عدد کیسه یا ۳۰ پالت..."
              value={quantity || ''}
              onChange={e => handleQuantityChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              قیمت فی واحد (اختیاری):
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="مثلاً: ۲۰ افغانی برای هر عدد..."
              value={unitPrice || ''}
              onChange={e => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
            />
          </div>
        </div>

        {/* توضیحات تکمیلی */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            توضیحات و یادداشت تکمیلی سند:
          </label>
          <textarea
            rows={2}
            placeholder="هرگونه یادداشت مرتبط با این عاید یا شماره حواله..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white resize-none"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت سند عاید و واریز به صندوق'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={e => handleSubmit(e, true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>ثبت و چاپ رسید</span>
            </button>
          </div>

          <div className="text-right w-full sm:w-auto text-xs text-slate-500 font-medium">
            مبلغ نهایی واریزی به صندوق: <span className="font-mono font-black text-emerald-700 text-sm">{formatNumber(depositDetails.amount)} {cashboxCurrency}</span>
          </div>
        </div>
      </form>
    </div>
  );
};
