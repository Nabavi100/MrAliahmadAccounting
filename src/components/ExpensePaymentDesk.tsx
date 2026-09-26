import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency } from '../types';
import { formatNumber, formatCurrency, getPersianDate, getCurrentTime } from '../utils/formatters';
import {
  TrendingDown,
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
  User,
} from 'lucide-react';

interface ExpensePaymentDeskProps {
  onSuccess?: () => void;
  onViewList?: () => void;
}

export const ExpensePaymentDesk: React.FC<ExpensePaymentDeskProps> = ({
  onSuccess,
  onViewList,
}) => {
  const {
    cashAccounts,
    cashRegister,
    expenseCategories,
    createExpense,
    getNextExpenseNumber,
    openPrintModal,
  } = useAccounting();

  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(expenseCategories[0]?.id || '');
  const [recipient, setRecipient] = useState<string>('');
  const [voucherNumber, setVoucherNumber] = useState<string>(() => getNextExpenseNumber());
  const [date, setDate] = useState<string>(getPersianDate());
  const [issueTime, setIssueTime] = useState<string>(getCurrentTime());
  const [notes, setNotes] = useState<string>('');

  // Financial details & Source Cash register
  const [selectedCashRegister, setSelectedCashRegister] = useState<string>(() => {
    const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
    return afnAcc ? afnAcc.id : 'afn_cash';
  });

  const activeCashAcc = cashAccounts.find(a => a.id === selectedCashRegister);
  const cashboxCurrency = (activeCashAcc?.currency || 'AFN') as Currency;

  // Paid Currency (ارز فیزیکی پرداختی)
  const [paidCurrency, setPaidCurrency] = useState<Currency>(cashboxCurrency);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Multi-Currency Exchange (اکسچنج ارزی پرداخت هزینه)
  const [isExchange, setIsExchange] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Status & Notifications
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successDoc, setSuccessDoc] = useState<{ id: string; num: string; amount: number; curr: Currency } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automatically sync exchange if paid currency differs from cashbox currency
  useEffect(() => {
    if (paidCurrency !== cashboxCurrency) {
      setIsExchange(true);
    }
  }, [paidCurrency, cashboxCurrency]);

  // Calculate final deducted amount from the cashbox
  const calculateCashboxWithdrawal = (): { amount: number; rateUsed: number } => {
    if (!isExchange || paidCurrency === cashboxCurrency) {
      return { amount: paidAmount, rateUsed: 1 };
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (paidCurrency === 'USD' && cashboxCurrency === 'AFN') {
      // Paid USD, Deducting from AFN cashbox: amount in AFN = USD * rate
      return { amount: Math.round(paidAmount * rate), rateUsed: rate };
    } else if (paidCurrency === 'AFN' && cashboxCurrency === 'USD') {
      // Paid AFN, Deducting from USD cashbox: amount in USD = AFN / rate
      return { amount: parseFloat((paidAmount / rate).toFixed(2)), rateUsed: rate };
    }
    return { amount: paidAmount, rateUsed: rate };
  };

  const withdrawalDetails = calculateCashboxWithdrawal();

  const handleSubmit = (e: React.FormEvent, printAfterSave = false) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('لطفاً عنوان یا بابت هزینه را مشخص نمایید.');
      return;
    }
    if (paidAmount <= 0) {
      setErrorMsg('مبلغ هزینه باید بیشتر از صفر باشد.');
      return;
    }

    // Check cashbox funds
    if (activeCashAcc && activeCashAcc.balance < withdrawalDetails.amount) {
      const confirmLow = window.confirm(
        `موجودی فعلی ${activeCashAcc.name} (${formatNumber(activeCashAcc.balance)} ${cashboxCurrency}) کمتر از مبلغ پرداختی (${formatNumber(withdrawalDetails.amount)} ${cashboxCurrency}) است. آیا مایل به ثبت سند و منفی شدن موجودی صندوق هستید؟`
      );
      if (!confirmLow) return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = expenseCategories.find(c => c.id === categoryId);
      const selectedReg = cashAccounts.find(a => a.id === selectedCashRegister);

      const exchangeNote = isExchange && paidCurrency !== cashboxCurrency
        ? ` (پرداخت ارزی: ${formatNumber(paidAmount)} ${paidCurrency} با نرخ ${exchangeRate} ⇋ کسر ${formatNumber(withdrawalDetails.amount)} ${cashboxCurrency} از ${selectedReg?.name || 'صندوق'})`
        : '';

      const created = createExpense({
        title: title.trim(),
        categoryId,
        categoryName: selectedCat?.name || 'هزینه‌های عمومی',
        amount: withdrawalDetails.amount,
        currency: cashboxCurrency,
        date,
        recipient: recipient.trim() || undefined,
        receiptNumber: voucherNumber,
        expenseNumber: voucherNumber,
        cashRegisterId: selectedCashRegister,
        cashRegisterName: selectedReg?.name,
        notes: (notes.trim() + exchangeNote).trim() || undefined,
      });

      setSuccessDoc({
        id: created.id,
        num: created.expenseNumber || voucherNumber,
        amount: withdrawalDetails.amount,
        curr: cashboxCurrency,
      });

      if (printAfterSave) {
        openPrintModal({
          type: 'expense',
          expense: created,
        });
      }

      // Reset form
      setTitle('');
      setRecipient('');
      setNotes('');
      setPaidAmount(0);
      setVoucherNumber(getNextExpenseNumber());

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('خطا در ذخیره‌سازی سند هزینه: ' + (err?.message || 'ورودی‌ها را بازبینی کنید.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Banner / Corporate Accent */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 rounded-3xl p-5 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-200">
                  میز کار مالی و بازرگانی • بخش پرداخت هزینه
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  تخلیه مستقیم از صندوق
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                ثبت و پرداخت هزینه‌های جاری و دفتری با تسویه و اکسچنج ارزی
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
                <FileText className="w-4 h-4 text-rose-200" />
                <span>مشاهده سوابق و لیست هزینه‌ها</span>
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
                سند هزینه با شماره {successDoc.num} با موفقیت ثبت و از صندوق کسر گردید.
              </div>
              <div className="text-xs text-emerald-700 mt-0.5 font-mono">
                مبلغ پرداختی: {formatNumber(successDoc.amount)} {successDoc.curr} • موجودی صندوق به‌روز شد.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPrintModal({ type: 'expense', expense: successDoc })}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ سند هزینه</span>
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

      {/* Main Expense Form */}
      <form onSubmit={e => handleSubmit(e, false)} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-6 shadow-xs">
        {/* Document Header Metadata: شماره سند | تاریخ | ساعت */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 text-xs">
          <div>
            <label className="text-slate-500 font-bold block mb-1">شماره سند هزینه:</label>
            <input
              type="text"
              value={voucherNumber}
              onChange={e => setVoucherNumber(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-slate-500 font-bold block mb-1">تاریخ پرداخت:</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 font-bold block mb-1">ساعت پرداخت:</label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={issueTime}
                onChange={e => setIssueTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Form Row 1: عنوان هزینه & دسته‌بندی & دریافت‌کننده وجه */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 md:col-span-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <span>عنوان و بابت هزینه</span>
            </label>
            <input
              type="text"
              placeholder="مثلاً: کرایه حمل بار، معاشات، مصارف آشپزخانه، برق..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>گروه و دسته‌بندی هزینه</span>
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
            >
              {expenseCategories && expenseCategories.length > 0 ? (
                expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              ) : (
                <option value="">هزینه‌های عمومی و دفتری</option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>دریافت‌کننده وجه / پرسنل / راننده</span>
            </label>
            <input
              type="text"
              placeholder="نام شخص دریافت‌کننده یا راننده..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Form Row 2: صندوق برداشتی • ارز پرداختی • مبلغ هزینه */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span className="text-rose-500">*</span>
              <Wallet className="w-3.5 h-3.5 text-rose-600" />
              <span>صندوق برداشتی (منبع پرداخت وجه)</span>
            </label>
            <select
              value={selectedCashRegister}
              onChange={e => {
                const regId = e.target.value;
                setSelectedCashRegister(regId);
                const match = cashAccounts.find(a => a.id === regId);
                if (match && !isExchange) {
                  setPaidCurrency(match.currency);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
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
              <DollarSign className="w-3.5 h-3.5 text-rose-600" />
              <span>ارز فیزیکی وجه پرداختی</span>
            </label>
            <select
              value={paidCurrency}
              onChange={e => {
                const curr = e.target.value as Currency;
                setPaidCurrency(curr);
                if (curr !== cashboxCurrency) {
                  setIsExchange(true);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
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
                <span>مبلغ پرداختی هزینه</span>
              </span>
              <span className="text-[11px] text-rose-700 font-mono font-bold">
                {paidCurrency}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={paidAmount || ''}
              onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-black text-slate-900 text-left outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Multi-Currency Exchange Panel (اکسچنج ارزی پرداخت هزینه) */}
        <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-black text-slate-900">
                تسویه چندارزی و اکسچنج هزینه (تبدیل ارز هزینه به ارز صندوق):
              </span>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isExchange}
                onChange={e => setIsExchange(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:ring-2 focus:ring-rose-500"
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-rose-800 block">
                    مبلغ نهایی که از {activeCashAcc?.name || 'صندوق'} کسر می‌شود:
                  </span>
                  <div className="text-base font-mono font-black text-rose-950 mt-0.5">
                    {formatNumber(withdrawalDetails.amount)} {cashboxCurrency}
                  </div>
                </div>
                <div className="text-left text-[11px] font-mono text-rose-700">
                  {paidCurrency} {formatNumber(paidAmount)} ⇋ {cashboxCurrency} {formatNumber(withdrawalDetails.amount)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* توضیحات تکمیلی */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            توضیحات و جزئیات فاکتور/رسید هزینه:
          </label>
          <textarea
            rows={2}
            placeholder="هرگونه یادداشت مرتبط با این هزینه، شماره بارنامه یا قبض..."
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
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت سند هزینه و پرداخت از صندوق'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={e => handleSubmit(e, true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-rose-400" />
              <span>ثبت و چاپ سند</span>
            </button>
          </div>

          <div className="text-right w-full sm:w-auto text-xs text-slate-500 font-medium">
            مبلغ نهایی کسری از صندوق: <span className="font-mono font-black text-rose-700 text-sm">{formatNumber(withdrawalDetails.amount)} {cashboxCurrency}</span>
          </div>
        </div>
      </form>
    </div>
  );
};
