import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, CashRegisterType } from '../types';
import { formatNumber, formatCurrency, getPersianDate, getCurrentTime } from '../utils/formatters';
import { PartySearchSelector } from './PartySearchSelector';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import {
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
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface ReceiptCreateViewProps {
  initialPartyId?: string;
  onBackToList: () => void;
  onViewReceipt?: (id: string) => void;
  onCashTransfer?: () => void;
  onSwitchTab?: (tab: 'create_receipt' | 'list_receipts' | 'create_payment' | 'list_payments' | 'cash_transfer') => void;
}

export const ReceiptCreateView: React.FC<ReceiptCreateViewProps> = ({
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

  // Debtors list (parties who owe money or customers)
  const customers = parties.filter(
    p => p.type === 'customer' || p.type === 'both' || p.balanceAFN < 0 || p.balanceUSD < 0
  );

  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    initialPartyId || customers[0]?.id || parties[0]?.id || ''
  );
  const [voucherNumber, setVoucherNumber] = useState<string>(() =>
    getNextTransactionNumber('receive_payment')
  );
  const [date, setDate] = useState<string>(getPersianDate());
  const [issueTime, setIssueTime] = useState<string>(getCurrentTime());
  const [description, setDescription] = useState<string>('');
  const [transactionSubject, setTransactionSubject] = useState<string>('دریافت بابت فاکتور نسیه');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState<boolean>(false);

  // Financial details
  // cashCurrency: ارز فیزیکی صندوق دریافت (افغانی یا دالر)
  const [cashCurrency, setCashCurrency] = useState<Currency>('AFN');
  // partyCurrency: ارز حساب معین مشتری که تصفیه می‌شود
  const [partyCurrency, setPartyCurrency] = useState<Currency>('USD');

  // Exchange toggle: تسویه چندارزی
  const [isExchange, setIsExchange] = useState<boolean>(true);
  const [exchangeRate, setExchangeRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Amounts
  const [cashAmount, setCashAmount] = useState<number>(6500); // مبلغ دریافتی به صندوق
  const [partyAmount, setPartyAmount] = useState<number>(100); // مبلغ کسر از حساب مشتری

  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegisterType>(() => {
    const afnAcc = cashAccounts.find(a => a.currency === 'AFN');
    return afnAcc ? afnAcc.id : 'afn_cash';
  });

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const targetCashAccount = cashAccounts.find(a => a.id === selectedCashRegister);

  // Today's Gregorian equivalent date
  const gregorianDate = new Date().toISOString().split('T')[0];

  // Auto-adapt when customer is selected based on active debts
  useEffect(() => {
    if (selectedParty) {
      if (selectedParty.balanceUSD < -0.01) {
        // Customer owes USD (e.g. -100 USD)
        const debtUSD = Math.abs(selectedParty.balanceUSD);
        setPartyCurrency('USD');
        setPartyAmount(debtUSD);
        setCashCurrency('AFN');
        setIsExchange(true);
        const rate = exchangeRate || cashRegister.usdToAfnRate || 65;
        setCashAmount(Math.round(debtUSD * rate));
      } else if (selectedParty.balanceAFN < -0.01) {
        // Customer owes AFN (e.g. -6500 AFN)
        const debtAFN = Math.abs(selectedParty.balanceAFN);
        setPartyCurrency('AFN');
        setPartyAmount(debtAFN);
        setCashCurrency('AFN');
        setIsExchange(false);
        setCashAmount(debtAFN);
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

  // Handle cash currency change (e.g. receiving AFN vs USD)
  const handleCashCurrencyChange = (newCashCurr: Currency) => {
    setCashCurrency(newCashCurr);
    const match = cashAccounts.find(a => a.currency === newCashCurr);
    if (match) setSelectedCashRegister(match.id);

    if (!isExchange) {
      setPartyCurrency(newCashCurr);
      setPartyAmount(cashAmount);
    } else {
      // Exchange active
      const rate = exchangeRate > 0 ? exchangeRate : 65;
      if (newCashCurr === 'AFN' && partyCurrency === 'USD') {
        // Receiving AFN for USD debt: cashAmount = partyAmount * rate
        setCashAmount(Math.round(partyAmount * rate));
      } else if (newCashCurr === 'USD' && partyCurrency === 'AFN') {
        // Receiving USD for AFN debt: cashAmount = partyAmount / rate
        setCashAmount(Number((partyAmount / rate).toFixed(2)));
      } else if (newCashCurr === partyCurrency) {
        setIsExchange(false);
        setPartyAmount(cashAmount);
      }
    }
  };

  // Handle customer ledger currency change
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

  // Handle Cash Amount Change (مبلغ ورودی نقدی صندوق)
  const handleCashAmountChange = (val: number) => {
    setCashAmount(val);
    if (!isExchange) {
      setPartyAmount(val);
      return;
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (cashCurrency === 'AFN' && partyCurrency === 'USD') {
      // Received AFN in safe, calculate USD deducted from customer
      const calculatedUSD = Number((val / rate).toFixed(4));
      // If close to customer's USD debt, snap to exact
      if (selectedParty && Math.abs(calculatedUSD - Math.abs(selectedParty.balanceUSD)) < 0.01) {
        setPartyAmount(Math.abs(selectedParty.balanceUSD));
      } else {
        setPartyAmount(calculatedUSD);
      }
    } else if (cashCurrency === 'USD' && partyCurrency === 'AFN') {
      // Received USD in safe, calculate AFN deducted from customer
      const calculatedAFN = Math.round(val * rate);
      if (selectedParty && Math.abs(calculatedAFN - Math.abs(selectedParty.balanceAFN)) < 1) {
        setPartyAmount(Math.abs(selectedParty.balanceAFN));
      } else {
        setPartyAmount(calculatedAFN);
      }
    } else {
      setPartyAmount(val);
    }
  };

  // Handle Party Amount Change (مبلغ کسر از حساب مشتری)
  const handlePartyAmountChange = (val: number) => {
    setPartyAmount(val);
    if (!isExchange) {
      setCashAmount(val);
      return;
    }
    const rate = exchangeRate > 0 ? exchangeRate : 65;
    if (partyCurrency === 'USD' && cashCurrency === 'AFN') {
      // Customer settling USD debt, paying in AFN
      setCashAmount(Math.round(val * rate));
    } else if (partyCurrency === 'AFN' && cashCurrency === 'USD') {
      // Customer settling AFN debt, paying in USD
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
      // Keep partyAmount (debt to settle) fixed, recalculate required cash in AFN
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
      // Switch to opposite currency
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

  // Quick 1-click full settlement
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

  // Party balance before & after:
  // In our system: negative (< 0) means debtor (قرضدار است به ما), positive (> 0) means creditor (طلبکار)
  const currentPartyAFN = selectedParty ? selectedParty.balanceAFN : 0;
  const currentPartyUSD = selectedParty ? selectedParty.balanceUSD : 0;

  // Calculate remaining balance accurately
  const calcNextPartyUSD = () => {
    if (partyCurrency !== 'USD') return currentPartyUSD;
    const nb = currentPartyUSD + partyAmount;
    return Math.abs(nb) < 0.001 ? 0 : Number(nb.toFixed(4));
  };

  const calcNextPartyAFN = () => {
    if (partyCurrency !== 'AFN') return currentPartyAFN;
    const nb = currentPartyAFN + partyAmount;
    return Math.abs(nb) < 0.001 ? 0 : Number(nb.toFixed(4));
  };

  const nextPartyUSD = calcNextPartyUSD();
  const nextPartyAFN = calcNextPartyAFN();

  // Cash account balance before & after:
  const currentCashBalance = targetCashAccount ? targetCashAccount.balance : 0;
  const nextCashBalance = currentCashBalance + finalCashAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      alert('لطفاً مشتری یا طرف‌حساب را انتخاب نمایید.');
      return;
    }
    if (finalCashAmount <= 0) {
      alert('مبلغ دریافتی باید بزرگتر از صفر باشد.');
      return;
    }

    let autoDesc = description.trim();
    if (!autoDesc) {
      if (isExchange) {
        autoDesc = `دریافت ${formatNumber(finalCashAmount)} ${
          finalCashCurrency === 'AFN' ? 'افغانی' : 'دالر'
        } نقدی به نرخ ${exchangeRate} در قبال تسویه ${formatNumber(partyAmount)} ${
          partyCurrency === 'USD' ? 'دالر' : 'افغانی'
        } از حساب مشتری ${selectedParty.name} بابت ${transactionSubject}`;
      } else {
        autoDesc = `دریافت نقدی ${formatNumber(partyAmount)} ${
          partyCurrency === 'USD' ? 'دالر' : 'افغانی'
        } از ${selectedParty.name} بابت ${transactionSubject}`;
      }
    }

    createTransaction({
      transactionNumber: voucherNumber,
      date,
      issueTime,
      type: 'receive_payment',
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
      {/* Top 4-Tab Navigation (Identical to User Reference Screenshot) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs flex items-center gap-1.5 cursor-default"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>ثبت دریافت (ورودی)</span>
          </button>

          <button
            type="button"
            onClick={onBackToList}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>لیست دریافت‌ها</span>
          </button>

          {onSwitchTab && (
            <>
              <button
                type="button"
                onClick={() => onSwitchTab('create_payment')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>ثبت پرداخت (خروجی)</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchTab('list_payments')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>لیست پرداخت‌ها</span>
              </button>
            </>
          )}
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
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>۱. دریافت از مشتری / تامین‌کننده</span>
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

        {/* Row 1: ارز صندوق (پول دریافتی) | نرخ تبادله روز */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              ارز صندوق (پول دریافتی) <span className="text-rose-500">*</span>
            </label>
            <select
              value={cashCurrency}
              onChange={e => handleCashCurrencyChange(e.target.value as Currency)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="AFN">افغانی (AFN) - پول رایج نقد</option>
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
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-black text-slate-900 outline-none text-left focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                افغانی / ۱ دالر
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: انتخاب مشتری / تامین‌کننده | بابت معامله */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800">
                انتخاب مشتری / تامین‌کننده <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsQuickPartyModalOpen(true)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تعریف مشتری جدید</span>
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="دریافت بابت فاکتور نسیه">دریافت بابت فاکتور نسیه</option>
                <option value="تسویه حساب دفتری مشتری">تسویه حساب دفتری مشتری</option>
                <option value="پیش‌پرداخت خرید سیمان">پیش‌پرداخت خرید سیمان</option>
                <option value="دریافت وجه امانی">دریافت وجه امانی</option>
                <option value="سایر بابت‌های دریافت">سایر بابت‌های دریافت</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Account Status Banner (حالت حساب مشتری) */}
        {selectedParty && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">حالت حساب مشتری:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {currentPartyUSD < -0.01 ? (
                    <span className="text-rose-600">
                      USD {formatNumber(Math.abs(currentPartyUSD))} (طرف‌حساب بدهکار است)
                    </span>
                  ) : currentPartyUSD > 0.01 ? (
                    <span className="text-blue-600">
                      USD {formatNumber(currentPartyUSD)} (طرف‌حساب طلبکار است)
                    </span>
                  ) : currentPartyAFN < -0.01 ? (
                    <span className="text-rose-600">
                      AFN {formatNumber(Math.abs(currentPartyAFN))} (طرف‌حساب بدهکار است)
                    </span>
                  ) : currentPartyAFN > 0.01 ? (
                    <span className="text-blue-600">
                      AFN {formatNumber(currentPartyAFN)} (طرف‌حساب طلبکار است)
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
                  {currentPartyUSD < 0 ? 'بدهکار' : currentPartyUSD > 0 ? 'طلبکار' : 'تسویه'}
                </span>
                <span>•</span>
                <span>
                  افغانی: {formatNumber(Math.abs(currentPartyAFN))} ؋{' '}
                  {currentPartyAFN < 0 ? 'بدهکار' : currentPartyAFN > 0 ? 'طلبکار' : 'تسویه'}
                </span>
              </div>
            </div>

            {/* Quick Settle Single-Click Button */}
            {(currentPartyUSD < -0.01 || currentPartyAFN < -0.01) && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">دکمه تسویه سریع:</span>
                {currentPartyUSD < -0.01 && (
                  <button
                    type="button"
                    onClick={() => applyFullSettlement('USD', Math.abs(currentPartyUSD))}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      تسویه کامل بدهی دلاری (${formatNumber(Math.abs(currentPartyUSD))} در قبال{' '}
                      {formatNumber(Math.round(Math.abs(currentPartyUSD) * exchangeRate))} افغانی)
                    </span>
                  </button>
                )}
                {currentPartyAFN < -0.01 && (
                  <button
                    type="button"
                    onClick={() => applyFullSettlement('AFN', Math.abs(currentPartyAFN))}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      تسویه کامل بدهی افغانی ({formatNumber(Math.abs(currentPartyAFN))} ؋)
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Currency Settlement Switch (فعال‌سازی تسویه چندارزی) */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 block">
                فعال‌سازی تسویه چندارزی (تبدیل مستقیم پول)
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                دریافت افغانی نقدی تحویل صندوق در قبال تسویه بدهی دلاری مشتری (یا بالعکس)
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
            <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Multi-Currency Sub-Box (Only when enabled) */}
        {isExchange && (
          <div className="p-4 sm:p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  ارز حساب معین مشتری <span className="text-rose-500">*</span>
                </label>
                <select
                  value={partyCurrency}
                  onChange={e => handlePartyCurrencyChange(e.target.value as Currency)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="USD">دالر (USD) - بدهی دلاری مشتری</option>
                  <option value="AFN">افغانی (AFN) - بدهی افغانی مشتری</option>
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

            {/* Amber Summary Box (دقیقاً مثل تصویر ارسالی کاربر) */}
            <div className="p-4 bg-amber-100/70 border border-amber-300 rounded-2xl space-y-1.5 text-xs text-amber-950">
              <div className="font-black text-xs text-amber-900 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>خلاصه محاسبه تبادله پول:</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-amber-200/60 font-medium">
                <span>مبلغ صندوق (پول دریافتی واقعی):</span>
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
              <div className="flex justify-between py-1 font-black text-emerald-900 bg-amber-50/80 px-2.5 rounded-xl border border-amber-300/80">
                <span>مبلغ نهایی معادل در معین مشتری (جهت تسویه):</span>
                <span className="font-mono text-sm">
                  {partyCurrency} {formatNumber(partyAmount, 2)} (از حساب مشتری کم و تصفیه می‌شود)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: واریز به صندوق | مبلغ دریافتی | تخفیف */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              واریز به صندوق <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCashRegister}
              onChange={e => setSelectedCashRegister(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
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
                مبلغ دریافتی (به واحد {cashCurrency}) <span className="text-rose-500">*</span>
              </label>
              {isExchange && (
                <span className="text-[10px] text-emerald-700 font-bold">
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none text-left focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                {cashCurrency === 'AFN' ? 'افغانی' : 'دالر'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-800 mb-1.5">
              تخفیف اعطا شده
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
                ? `دریافت نقدی ${formatNumber(cashAmount)} ${cashCurrency} با نرخ ${exchangeRate} در قبال تسویه ${formatNumber(partyAmount)} ${partyCurrency} از حساب ${selectedParty?.name || 'مشتری'}`
                : `دریافت نقدی ${formatNumber(cashAmount)} ${cashCurrency} از ${selectedParty?.name || 'مشتری'} بابت تسویه حساب`
            }
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Row 5: Prospective Customer Balance Banner (باقی‌مانده حساب مشتری پس از این سند) */}
        <div className="p-4 rounded-2xl border transition-all text-xs font-medium space-y-1 bg-emerald-50/70 border-emerald-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-emerald-950">
              باقی‌مانده حساب مشتری پس از این سند:
            </span>
            <div className="font-mono font-black text-sm">
              {partyCurrency === 'USD' ? (
                nextPartyUSD === 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>USD 0.00 (حساب کاملاً تصفیه و بی‌حساب می‌شود)</span>
                  </span>
                ) : nextPartyUSD < 0 ? (
                  <span className="text-rose-600">
                    USD {formatNumber(Math.abs(nextPartyUSD))} بدهکار
                  </span>
                ) : (
                  <span className="text-blue-600">
                    USD {formatNumber(nextPartyUSD)} طلبکار
                  </span>
                )
              ) : (
                nextPartyAFN === 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>AFN 0.00 (حساب کاملاً تصفیه و بی‌حساب می‌شود)</span>
                  </span>
                ) : nextPartyAFN < 0 ? (
                  <span className="text-rose-600">
                    AFN {formatNumber(Math.abs(nextPartyAFN))} بدهکار
                  </span>
                ) : (
                  <span className="text-blue-600">
                    AFN {formatNumber(nextPartyAFN)} طلبکار
                  </span>
                )
              )}
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60 font-mono">
            <span>موجودی جدید صندوق ({targetCashAccount?.name}):</span>
            <span className="font-bold text-emerald-800">
              {formatNumber(nextCashBalance)} {targetCashAccount?.currency} (+{formatNumber(finalCashAmount)} {finalCashCurrency})
            </span>
          </div>
        </div>

        {/* Submit Button (تأیید و ثبت سند دریافت) */}
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
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأیید و ثبت سند دریافت</span>
          </button>
        </div>
      </form>

      {/* Quick Party Add Modal */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        defaultType="customer"
        onSuccess={newParty => {
          setSelectedPartyId(newParty.id);
        }}
      />
    </div>
  );
};
