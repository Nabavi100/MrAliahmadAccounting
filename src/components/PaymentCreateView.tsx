import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, CashRegisterType } from '../types';
import { formatNumber, formatCurrency, getPersianDate, getCurrentTime } from '../utils/formatters';
import { PartySearchSelector } from './PartySearchSelector';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  DollarSign,
  Wallet,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
  Repeat,
  FileText,
  Calendar,
  Clock,
  ArrowLeftRight,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface PaymentCreateViewProps {
  initialPartyId?: string;
  onBackToList: () => void;
  onViewPayment?: (id: string) => void;
  onCashTransfer?: () => void;
  onSwitchTab?: (tab: 'create_receipt' | 'list_receipts' | 'create_payment' | 'list_payments' | 'cash_transfer') => void;
}

export const PaymentCreateView: React.FC<PaymentCreateViewProps> = ({
  initialPartyId,
  onBackToList,
  onCashTransfer,
  onSwitchTab,
}) => {
  const {
    parties,
    cashAccounts,
    cashRegister,
    getNextTransactionNumber,
    createTransaction,
  } = useAccounting();

  // Suppliers & Creditors list
  const suppliers = parties.filter(
    p => p.type === 'supplier' || p.type === 'both' || p.balanceAFN > 0 || p.balanceUSD > 0
  );

  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    initialPartyId || suppliers[0]?.id || parties[0]?.id || ''
  );
  const [voucherNumber, setVoucherNumber] = useState<string>(() =>
    getNextTransactionNumber('make_payment')
  );
  const [date, setDate] = useState<string>(getPersianDate());
  const [issueTime, setIssueTime] = useState<string>(getCurrentTime());
  const [description, setDescription] = useState<string>('');
  const [transactionSubject, setTransactionSubject] = useState<string>('پرداخت بابت فاکتور خرید');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState<boolean>(false);

  // Financial details
  // cashCurrency: ارز فیزیکی صندوق پرداخت (افغانی یا دالر)
  const [cashCurrency, setCashCurrency] = useState<Currency>('AFN');
  // partyCurrency: ارز حساب معین طرف‌حساب که تسویه می‌شود
  const [partyCurrency, setPartyCurrency] = useState<Currency>('USD');

  // Exchange toggle: تسویه چندارزی
  const [isExchange, setIsExchange] = useState<boolean>(true);
  const [exchangeRate, setExchangeRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Amounts
  const [cashAmount, setCashAmount] = useState<number>(6500); // مبلغ پرداختی از صندوق
  const [partyAmount, setPartyAmount] = useState<number>(100); // مبلغ کسر از طلبکاری طرف‌حساب

  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegisterType>(() => {
    const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
    return afnAcc ? afnAcc.id : 'afn_cash';
  });

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const sourceCashAccount = cashAccounts.find(a => a.id === selectedCashRegister);

  // Today's Gregorian equivalent date
  const gregorianDate = new Date().toISOString().split('T')[0];

  // Auto-adapt when party is selected based on active credits/debts
  useEffect(() => {
    if (selectedParty) {
      if (selectedParty.balanceUSD > 0.01) {
        // Supplier is creditor in USD
        const creditUSD = selectedParty.balanceUSD;
        setPartyCurrency('USD');
        setPartyAmount(creditUSD);
        setCashCurrency('AFN');
        setIsExchange(true);
        const rate = exchangeRate || cashRegister.usdToAfnRate || 65;
        setCashAmount(Math.round(creditUSD * rate));
      } else if (selectedParty.balanceAFN > 0.01) {
        // Supplier is creditor in AFN
        const creditAFN = selectedParty.balanceAFN;
        setPartyCurrency('AFN');
        setPartyAmount(creditAFN);
        setCashCurrency('AFN');
        setIsExchange(false);
        setCashAmount(creditAFN);
      }
    }
  }, [selectedPartyId]);

  // Keep selected cash register in sync with cash currency
  useEffect(() => {
    const match = cashAccounts.find(a => a.currency === cashCurrency);
    if (match) {
      setSelectedCashRegister(match.id);
    }
  }, [cashCurrency, cashAccounts]);

  // Handle cash currency change (e.g. paying AFN vs USD)
  const handleCashCurrencyChange = (newCashCurr: Currency) => {
    setCashCurrency(newCashCurr);
    const match = cashAccounts.find(a => a.currency === newCashCurr);
    if (match) setSelectedCashRegister(match.id);

    if (!isExchange) {
      setPartyCurrency(newCashCurr);
      setPartyAmount(cashAmount);
    } else {
      const rate = exchangeRate > 0 ? exchangeRate : 65;
      if (newCashCurr === 'AFN' && partyCurrency === 'USD') {
        setCashAmount(Math.round(partyAmount * rate));
      } else if (newCashCurr === 'USD' && partyCurrency === 'AFN') {
        setCashAmount(Number((partyAmount / rate).toFixed(2)));
      } else if (newCashCurr === partyCurrency) {
        setIsExchange(false);
        setPartyAmount(cashAmount);
      }
    }
  };

  // Handle party ledger currency change
  const handlePartyCurrencyChange = (newPartyCurr: Currency) => {
    setPartyCurrency(newPartyCurr);
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (cashCurrency === newPartyCurr) {
      setIsExchange(false);
      setPartyAmount(cashAmount);
    } else {
      setIsExchange(true);
      if (cashCurrency === 'AFN' && newPartyCurr === 'USD') {
        setCashAmount(Math.round(partyAmount * rate));
      } else if (cashCurrency === 'USD' && newPartyCurr === 'AFN') {
        setCashAmount(Number((partyAmount / rate).toFixed(2)));
      }
    }
  };

  // Handle Cash Amount Change (مبلغ پرداختی از صندوق)
  const handleCashAmountChange = (val: number) => {
    setCashAmount(val);
    if (!isExchange) {
      setPartyAmount(val);
      return;
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (cashCurrency === 'AFN' && partyCurrency === 'USD') {
      const calculatedUSD = Number((val / rate).toFixed(4));
      if (selectedParty && Math.abs(calculatedUSD - selectedParty.balanceUSD) < 0.01) {
        setPartyAmount(selectedParty.balanceUSD);
      } else {
        setPartyAmount(calculatedUSD);
      }
    } else if (cashCurrency === 'USD' && partyCurrency === 'AFN') {
      const calculatedAFN = Math.round(val * rate);
      if (selectedParty && Math.abs(calculatedAFN - selectedParty.balanceAFN) < 1) {
        setPartyAmount(selectedParty.balanceAFN);
      } else {
        setPartyAmount(calculatedAFN);
      }
    } else {
      setPartyAmount(val);
    }
  };

  // Handle Party Amount Change (مبلغ کسر از طلبکاری طرف‌حساب)
  const handlePartyAmountChange = (val: number) => {
    setPartyAmount(val);
    if (!isExchange) {
      setCashAmount(val);
      return;
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (partyCurrency === 'USD' && cashCurrency === 'AFN') {
      setCashAmount(Math.round(val * rate));
    } else if (partyCurrency === 'AFN' && cashCurrency === 'USD') {
      setCashAmount(Number((val / rate).toFixed(2)));
    } else {
      setCashAmount(val);
    }
  };

  // Handle Exchange Rate Change
  const handleExchangeRateChange = (rate: number) => {
    setExchangeRate(rate);
    if (!isExchange || rate <= 0) return;
    if (cashCurrency === 'AFN' && partyCurrency === 'USD') {
      setCashAmount(Math.round(partyAmount * rate));
    } else if (cashCurrency === 'USD' && partyCurrency === 'AFN') {
      setCashAmount(Number((partyAmount / rate).toFixed(2)));
    }
  };

  // Toggle multi-currency
  const handleToggleExchange = (checked: boolean) => {
    setIsExchange(checked);
    const rate = exchangeRate > 0 ? exchangeRate : (cashRegister.usdToAfnRate || 65);
    if (checked) {
      const opposite: Currency = cashCurrency === 'AFN' ? 'USD' : 'AFN';
      setPartyCurrency(opposite);
      if (cashCurrency === 'AFN' && opposite === 'USD') {
        setCashAmount(Math.round(partyAmount * rate));
      } else {
        setCashAmount(Number((partyAmount / rate).toFixed(2)));
      }
    } else {
      setPartyCurrency(cashCurrency);
      setPartyAmount(cashAmount);
    }
  };

  // Quick 1-click full settlement of debt/credit
  const applyFullSettlement = (curr: 'USD' | 'AFN', amount: number) => {
    const rate = exchangeRate > 0 ? exchangeRate : (cashRegister.usdToAfnRate || 65);
    setPartyCurrency(curr);
    setPartyAmount(amount);

    if (curr === 'USD') {
      if (cashCurrency === 'AFN') {
        setIsExchange(true);
        setCashAmount(Math.round(amount * rate));
      } else {
        setIsExchange(false);
        setCashAmount(amount);
      }
    } else {
      if (cashCurrency === 'USD') {
        setIsExchange(true);
        setCashAmount(Number((amount / rate).toFixed(2)));
      } else {
        setIsExchange(false);
        setCashAmount(amount);
      }
    }
  };

  // Preview Calculations
  const finalCashAmount = isExchange ? cashAmount : partyAmount;
  const finalCashCurrency = cashCurrency;

  const currentPartyAFN = selectedParty ? selectedParty.balanceAFN : 0;
  const currentPartyUSD = selectedParty ? selectedParty.balanceUSD : 0;

  // Calculate remaining balance accurately
  const calcNextPartyUSD = () => {
    if (partyCurrency !== 'USD') return currentPartyUSD;
    const nb = currentPartyUSD - partyAmount;
    return Math.abs(nb) < 0.001 ? 0 : Number(nb.toFixed(4));
  };

  const calcNextPartyAFN = () => {
    if (partyCurrency !== 'AFN') return currentPartyAFN;
    const nb = currentPartyAFN - partyAmount;
    return Math.abs(nb) < 0.001 ? 0 : Number(nb.toFixed(4));
  };

  const nextPartyUSD = calcNextPartyUSD();
  const nextPartyAFN = calcNextPartyAFN();

  const currentCashBalance = sourceCashAccount ? sourceCashAccount.balance : 0;
  const nextCashBalance = currentCashBalance - finalCashAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      alert('لطفاً دریافت‌کننده وجه یا تامین‌کننده را انتخاب نمایید.');
      return;
    }
    if (finalCashAmount <= 0) {
      alert('مبلغ پرداختی باید بزرگتر از صفر باشد.');
      return;
    }

    let autoDesc = description.trim();
    if (!autoDesc) {
      if (isExchange) {
        autoDesc = `پرداخت نقدی ${formatNumber(finalCashAmount)} ${
          finalCashCurrency === 'AFN' ? 'افغانی' : 'دالر'
        } با نرخ ${exchangeRate} در قبال تسویه ${formatNumber(partyAmount)} ${
          partyCurrency === 'USD' ? 'دالر' : 'افغانی'
        } به حساب ${selectedParty.name} بابت ${transactionSubject}`;
      } else {
        autoDesc = `پرداخت نقدی ${formatNumber(partyAmount)} ${
          partyCurrency === 'USD' ? 'دالر' : 'افغانی'
        } به ${selectedParty.name} بابت ${transactionSubject}`;
      }
    }

    createTransaction({
      transactionNumber: voucherNumber,
      date,
      issueTime,
      type: 'make_payment',
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyPhone: selectedParty.phone,
      amount: partyAmount,
      currency: partyCurrency,
      isExchange,
      exchangeRate: isExchange ? exchangeRate : undefined,
      cashAmount: finalCashAmount,
      cashCurrency: finalCashCurrency,
      cashRegister: selectedCashRegister,
      description: autoDesc,
    });

    onBackToList();
  };

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto font-sans space-y-5">
      {/* Top 4-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('create_receipt')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>ثبت دریافت (ورودی)</span>
            </button>
          )}

          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('list_receipts')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>لیست دریافت‌ها</span>
            </button>
          )}

          <button
            type="button"
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs flex items-center gap-1.5 cursor-default"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>ثبت پرداخت (خروجی)</span>
          </button>

          <button
            type="button"
            onClick={onBackToList}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>لیست پرداخت‌ها</span>
          </button>
        </div>

        {onCashTransfer && (
          <button
            type="button"
            onClick={onCashTransfer}
            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
            <span>صندوق به صندوق / صرافی</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5">
        {/* Document Header Line: سند شماره | نوع | تاریخ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 text-xs">
          <div>
            <span className="text-slate-500 font-bold block mb-1">شماره سند:</span>
            <input
              type="text"
              value={voucherNumber}
              onChange={e => setVoucherNumber(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none"
            />
          </div>

          <div>
            <span className="text-slate-500 font-bold block mb-1">نوع سند:</span>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-rose-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              <span>۲. پرداخت به مشتری / تامین‌کننده</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-bold block mb-1">تاریخ سند:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-left outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                میلادی: {gregorianDate}
              </span>
            </div>
          </div>
        </div>

        {/* Row 1: ارز صندوق (پول پرداختی) | نرخ تبادله روز */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              ارز صندوق (پول پرداختی) <span className="text-rose-500">*</span>
            </label>
            <select
              value={cashCurrency}
              onChange={e => handleCashCurrencyChange(e.target.value as Currency)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="AFN">افغانی (AFN) - پرداخت نقدی افغانی</option>
              <option value="USD">دالر آمریکایی (USD)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800">
                نرخ تبادله روز (نسبت به دالر) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleExchangeRateChange(cashRegister.usdToAfnRate || 65)}
                className="text-[11px] text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>نرخ پیش‌فرض سیستم ({cashRegister.usdToAfnRate || 65})</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={exchangeRate}
                onChange={e => handleExchangeRateChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-black text-slate-900 outline-none text-left focus:ring-2 focus:ring-rose-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                افغانی / ۱ دالر
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: دریافت‌کننده وجه | بابت معامله */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800">
                دریافت‌کننده وجه (تامین‌کننده / مشتری) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsQuickPartyModalOpen(true)}
                className="text-[11px] text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تعریف طرف‌حساب جدید</span>
              </button>
            </div>
            <PartySearchSelector
              parties={parties}
              selectedPartyId={selectedPartyId}
              onSelect={id => setSelectedPartyId(id)}
              onSelectParty={id =>
                setSelectedPartyId(typeof id === 'object' && id?.id ? id.id : String(id))
              }
              onAddNewParty={() => setIsQuickPartyModalOpen(true)}
              placeholder="جستجو یا انتخاب طرف‌حساب..."
              partyTypeFilter="all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              بابت معامله <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={transactionSubject}
                onChange={e => setTransactionSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="پرداخت بابت فاکتور خرید">پرداخت بابت فاکتور خرید</option>
                <option value="تسویه حساب دفتری">تسویه حساب دفتری</option>
                <option value="پیش‌پرداخت سفارش سیمان">پیش‌پرداخت سفارش سیمان</option>
                <option value="استرداد وجه امانی">استرداد وجه امانی</option>
                <option value="سایر بابت‌های پرداخت">سایر بابت‌های پرداخت</option>
              </select>
            </div>
          </div>
        </div>

        {/* Party Account Status Banner */}
        {selectedParty && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">حالت حساب طرف‌حساب:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {currentPartyUSD > 0.01 ? (
                    <span className="text-blue-600">
                      USD {formatNumber(currentPartyUSD)} (طرف‌حساب طلبکار است)
                    </span>
                  ) : currentPartyUSD < -0.01 ? (
                    <span className="text-rose-600">
                      USD {formatNumber(Math.abs(currentPartyUSD))} (طرف‌حساب بدهکار است)
                    </span>
                  ) : currentPartyAFN > 0.01 ? (
                    <span className="text-blue-600">
                      AFN {formatNumber(currentPartyAFN)} (طرف‌حساب طلبکار است)
                    </span>
                  ) : currentPartyAFN < -0.01 ? (
                    <span className="text-rose-600">
                      AFN {formatNumber(Math.abs(currentPartyAFN))} (طرف‌حساب بدهکار است)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold">۰.۰۰ (حساب کاملاً تصفیه و بی‌حساب است)</span>
                  )}
                </span>
              </div>

              {/* Both Currencies Details */}
              <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-slate-500">
                <span>
                  دالر: ${formatNumber(Math.abs(currentPartyUSD))}{' '}
                  {currentPartyUSD > 0 ? 'طلبکار' : currentPartyUSD < 0 ? 'بدهکار' : 'تسویه'}
                </span>
                <span>•</span>
                <span>
                  افغانی: {formatNumber(Math.abs(currentPartyAFN))} ؋{' '}
                  {currentPartyAFN > 0 ? 'طلبکار' : currentPartyAFN < 0 ? 'بدهکار' : 'تسویه'}
                </span>
              </div>
            </div>

            {/* Quick Settle Single-Click Button */}
            {(currentPartyUSD > 0.01 || currentPartyAFN > 0.01) && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">دکمه تسویه سریع طلب:</span>
                {currentPartyUSD > 0.01 && (
                  <button
                    type="button"
                    onClick={() => applyFullSettlement('USD', currentPartyUSD)}
                    className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                    <span>
                      تسویه کامل طلبکاری دلاری (${formatNumber(currentPartyUSD)} با پرداخت{' '}
                      {formatNumber(Math.round(currentPartyUSD * exchangeRate))} افغانی)
                    </span>
                  </button>
                )}
                {currentPartyAFN > 0.01 && (
                  <button
                    type="button"
                    onClick={() => applyFullSettlement('AFN', currentPartyAFN)}
                    className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                    <span>
                      تسویه کامل طلبکاری افغانی ({formatNumber(currentPartyAFN)} ؋)
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Currency Settlement Switch */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 block">
                فعال‌سازی تسویه چندارزی (تبدیل مستقیم پول)
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                پرداخت افغانی نقدی از صندوق در قبال تسویه طلبکاری دلاری طرف‌حساب (یا بالعکس)
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isExchange}
              onChange={e => handleToggleExchange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {/* Multi-Currency Sub-Box */}
        {isExchange && (
          <div className="p-4 sm:p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  ارز حساب معین طرف‌حساب <span className="text-rose-500">*</span>
                </label>
                <select
                  value={partyCurrency}
                  onChange={e => handlePartyCurrencyChange(e.target.value as Currency)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="USD">دالر (USD) - طلبکاری دلاری طرف‌حساب</option>
                  <option value="AFN">افغانی (AFN) - طلبکاری افغانی طرف‌حساب</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  نرخ تبادله توافقی <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => handleExchangeRateChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-black text-slate-900 outline-none text-left focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {cashCurrency === 'AFN' ? 'افغانی به ازای هر ۱ دالر' : 'دالر به ازای هر ۱ افغانی'}
                  </span>
                </div>
              </div>
            </div>

            {/* Amber Summary Box */}
            <div className="p-4 bg-amber-100/70 border border-amber-300 rounded-2xl space-y-1.5 text-xs text-amber-950">
              <div className="font-black text-xs text-amber-900 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>خلاصه محاسبه تبادله پول:</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-amber-200/60 font-medium">
                <span>مبلغ صندوق (پول پرداختی فیزیکی):</span>
                <span className="font-mono font-black text-amber-900">
                  {cashCurrency} {formatNumber(cashAmount, 2)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-amber-200/60 font-medium">
                <span>مبنای تبادله توافقی:</span>
                <span className="font-mono font-black text-amber-900">
                  هر 1 USD معادل {formatNumber(exchangeRate, 2)} AFN
                </span>
              </div>
              <div className="flex justify-between py-1 font-black text-rose-900 bg-amber-50/80 px-2.5 rounded-xl border border-amber-300/80">
                <span>مبلغ نهایی معادل در معین طرف‌حساب (جهت تسویه):</span>
                <span className="font-mono text-sm">
                  {partyCurrency} {formatNumber(partyAmount, 2)} (از طلبکاری طرف‌حساب کسر و تسویه می‌شود)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: برداشت از صندوق | مبلغ پرداختی | تخفیف */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              برداشت از صندوق <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCashRegister}
              onChange={e => setSelectedCashRegister(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
            >
              {cashAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency} - موجودی: {formatNumber(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800">
                مبلغ پرداختی (به واحد {cashCurrency}) <span className="text-rose-500">*</span>
              </label>
              {isExchange && (
                <span className="text-[10px] text-rose-700 font-bold">
                  معادل {formatNumber(partyAmount)} {partyCurrency}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                value={cashAmount}
                onChange={e => handleCashAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none text-left focus:ring-2 focus:ring-rose-500"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                {cashCurrency === 'AFN' ? 'افغانی' : 'دالر'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              تخفیف دریافت شده
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={discountAmount}
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none text-left"
            />
          </div>
        </div>

        {/* Row 4: شرح تفصیل سند (توضیحات) */}
        <div>
          <label className="block text-xs font-black text-slate-800 mb-1.5">
            شرح تفصیل سند (توضیحات)
          </label>
          <input
            type="text"
            placeholder={
              isExchange
                ? `پرداخت نقدی ${formatNumber(cashAmount)} ${cashCurrency} با نرخ ${exchangeRate} در قبال تسویه ${formatNumber(partyAmount)} ${partyCurrency} از طلبکاری ${selectedParty?.name || 'طرف‌حساب'}`
                : `پرداخت نقدی ${formatNumber(cashAmount)} ${cashCurrency} به ${selectedParty?.name || 'طرف‌حساب'} بابت تسویه حساب`
            }
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Row 5: Prospective Party Balance Banner */}
        <div className="p-4 rounded-2xl border transition-all text-xs font-medium space-y-1 bg-rose-50/70 border-rose-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-rose-950">
              باقی‌مانده حساب طرف‌حساب پس از این سند:
            </span>
            <div className="font-mono font-black text-sm">
              {partyCurrency === 'USD' ? (
                nextPartyUSD === 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>USD 0.00 (حساب کاملاً تصفیه و بی‌حساب می‌شود)</span>
                  </span>
                ) : nextPartyUSD > 0 ? (
                  <span className="text-blue-600">
                    USD {formatNumber(nextPartyUSD)} طلبکار
                  </span>
                ) : (
                  <span className="text-rose-600">
                    USD {formatNumber(Math.abs(nextPartyUSD))} بدهکار
                  </span>
                )
              ) : (
                nextPartyAFN === 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>AFN 0.00 (حساب کاملاً تصفیه و بی‌حساب می‌شود)</span>
                  </span>
                ) : nextPartyAFN > 0 ? (
                  <span className="text-blue-600">
                    AFN {formatNumber(nextPartyAFN)} طلبکار
                  </span>
                ) : (
                  <span className="text-rose-600">
                    AFN {formatNumber(Math.abs(nextPartyAFN))} بدهکار
                  </span>
                )
              )}
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-rose-200/60 font-mono">
            <span>موجودی جدید صندوق ({sourceCashAccount?.name}):</span>
            <span className="font-bold text-rose-800">
              {formatNumber(nextCashBalance)} {sourceCashAccount?.currency} (-{formatNumber(finalCashAmount)} {finalCashCurrency})
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            انصراف و بازگشت
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-black transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأیید و ثبت سند پرداخت</span>
          </button>
        </div>
      </form>

      {/* Quick Party Add Modal */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        defaultType="supplier"
        onSuccess={newParty => {
          setSelectedPartyId(newParty.id);
        }}
      />
    </div>
  );
};
