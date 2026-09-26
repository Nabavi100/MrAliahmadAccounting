import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ReceiptCreateView } from './ReceiptCreateView';
import { ReceiptsListView } from './ReceiptsListView';
import { PaymentCreateView } from './PaymentCreateView';
import { PaymentsListView } from './PaymentsListView';
import { CashToCashTransferView } from './CashToCashTransferView';
import { IncomeReceiptDesk } from './IncomeReceiptDesk';
import { ExpensePaymentDesk } from './ExpensePaymentDesk';
import { formatNumber } from '../utils/formatters';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  PlusCircle,
  Wallet,
  Coins,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  CheckCircle2,
  FileText,
  Sparkles,
  Building,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export type MasterSection = 'receipt_section' | 'payment_section' | 'list_receipts' | 'list_payments';

export type ReceiptActionType = 'customer_cash' | 'income' | 'cash_transfer';
export type PaymentActionType = 'customer_payment' | 'expense' | 'cash_transfer';

interface ReceiptPaymentHubViewProps {
  initialTab?: 'create_receipt' | 'list_receipts' | 'create_payment' | 'list_payments' | 'cash_transfer';
  initialPartyId?: string;
  onViewInvoice?: (id: string) => void;
}

export const ReceiptPaymentHubView: React.FC<ReceiptPaymentHubViewProps> = ({
  initialTab = 'create_receipt',
  initialPartyId,
  onViewInvoice,
}) => {
  const { transactions, cashRegister, cashAccounts } = useAccounting();

  // Master Section: Dropdown (حالت انتخاب بصورت کشویی)
  const [masterSection, setMasterSection] = useState<MasterSection>(() => {
    if (initialTab === 'list_receipts') return 'list_receipts';
    if (initialTab === 'list_payments') return 'list_payments';
    if (initialTab === 'create_payment') return 'payment_section';
    return 'receipt_section';
  });

  // Selected Option in Receipt ListBox (لیست باکس ۳ گزینه‌ای دریافت)
  // ۱. دریافت نقدی از مشتری • ۲. دریافت عواید • ۳. دریافت صندوق به صندوق
  const [receiptAction, setReceiptAction] = useState<ReceiptActionType>(() => {
    if (initialTab === 'cash_transfer') return 'cash_transfer';
    return 'customer_cash';
  });

  // Selected Option in Payment ListBox (لیست باکس ۳ گزینه‌ای پرداخت)
  // ۱. پرداخت به مشتری • ۲. پرداخت هزینه • ۳. پرداخت صندوق به صندوق
  const [paymentAction, setPaymentAction] = useState<PaymentActionType>(() => {
    if (initialTab === 'cash_transfer') return 'cash_transfer';
    return 'customer_payment';
  });

  const [partyId, setPartyId] = useState<string | undefined>(initialPartyId);

  // Sync if initialPartyId changes
  useEffect(() => {
    if (initialPartyId) {
      setPartyId(initialPartyId);
      setMasterSection('receipt_section');
      setReceiptAction('customer_cash');
    }
  }, [initialPartyId]);

  // Financial statistics
  const receiptsCount = transactions.filter(t => t.type === 'receive_payment').length;
  const paymentsCount = transactions.filter(t => t.type === 'make_payment').length;
  const cashTransfersCount = transactions.filter(t => t.type === 'cash_transfer').length;

  const afnAccount = cashAccounts.find(a => a.currency === 'AFN') || {
    balance: cashRegister.afnBalance || 0,
    name: 'صندوق افغانی',
  };
  const usdAccount = cashAccounts.find(a => a.currency === 'USD') || {
    balance: cashRegister.usdBalance || 0,
    name: 'صندوق دلاری',
  };

  return (
    <div className="p-3 sm:p-5 lg:p-7 space-y-6 max-w-7xl mx-auto overflow-y-auto font-sans" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. CORPORATE EXECUTIVE TREASURY STATUS & LIVE METRICS BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-bl from-blue-50/70 via-emerald-50/30 to-transparent pointer-events-none rounded-tr-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>سیستم بازرگانی و خزانه‌داری شرکتی</span>
              </span>
              <span className="text-[11px] text-slate-400 font-bold">•</span>
              <span className="text-xs text-slate-500 font-medium">
                مدیریت جامع دریافت، پرداخت، عواید، مصارف و اکسچنج ارزی
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              میز کار تخصصی دریافت و پرداخت (Cash & Payment Treasury Hub)
            </h2>
          </div>

          {/* Quick live balances display */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* AFN Cashbox */}
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ؋
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 block">صندوق نقدی افغانی</span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-950">
                  {formatNumber(afnAccount.balance)} <span className="text-[10px]">افغانی</span>
                </span>
              </div>
            </div>

            {/* USD Cashbox */}
            <div className="px-3.5 py-2 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                $
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-800 block">صندوق نقدی دلاری</span>
                <span className="text-xs sm:text-sm font-black font-mono text-blue-950">
                  {formatNumber(usdAccount.balance)} <span className="text-[10px]">دلار</span>
                </span>
              </div>
            </div>

            {/* Live Exchange Rate */}
            <div className="px-3 py-2 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 block">نرخ روز تسعیر</span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-950">
                  ۱$ = {cashRegister.usdToAfnRate || 65} <span className="text-[10px]">؋</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MASTER DROPDOWN SELECTOR (حالت انتخاب بصورت کشویی) */}
        {/* ========================================================================= */}
        <div className="pt-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="master-mode-dropdown" className="text-xs sm:text-sm font-black text-slate-900 block">
                  انتخاب بخش عملیاتی خزانه (حالت کشویی):
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  جهت اجرای عملیات دریافت، پرداخت یا بررسی دفاتر مالی انتخاب نمایید:
                </span>
              </div>
            </div>

            {/* Quick Fast-Switch Action Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMasterSection('receipt_section')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  masterSection === 'receipt_section'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 border border-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>بخش دریافت‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => setMasterSection('payment_section')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  masterSection === 'payment_section'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-rose-50 text-slate-700 border border-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>بخش پرداخت‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => setMasterSection('list_receipts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  masterSection === 'list_receipts'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>دفتر اسناد دریافتی ({receiptsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setMasterSection('list_payments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  masterSection === 'list_payments'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>دفتر اسناد پرداختی ({paymentsCount})</span>
              </button>
            </div>
          </div>

          {/* MAIN STYLED CORPORATE DROPDOWN SELECT */}
          <div className="relative">
            <select
              id="master-mode-dropdown"
              value={masterSection}
              onChange={e => setMasterSection(e.target.value as MasterSection)}
              className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100/80 border-2 border-slate-300 hover:border-blue-500 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition shadow-2xs appearance-none pr-4 pl-10"
            >
              <optgroup label="─── عملیات دریافت و ورودی وجه به صندوق ───">
                <option value="receipt_section">
                  📥 ۱. بخش دریافت‌ها (ثبت رسید مشتری، عواید متفرقه، یا دریافت صندوق به صندوق)
                </option>
              </optgroup>
              <optgroup label="─── عملیات پرداخت و خروجی وجه از صندوق ───">
                <option value="payment_section">
                  📤 ۲. بخش پرداخت‌ها (پرداخت به مشتری/تأمین‌کننده، پرداخت هزینه، یا پرداخت صندوق به صندوق)
                </option>
              </optgroup>
              <optgroup label="─── دفاتر و تاریخچه مالی ───">
                <option value="list_receipts">
                  📋 ۳. دفتر سوابق و لیست کلیه اسناد دریافتی مشتریان ({receiptsCount} سند ثبت شده)
                </option>
                <option value="list_payments">
                  📑 ۴. دفتر سوابق و لیست کلیه اسناد پرداختی و حواله‌ها ({paymentsCount} سند ثبت شده)
                </option>
              </optgroup>
            </select>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 flex items-center gap-1 font-bold text-xs">
              <span className="hidden sm:inline text-slate-400">کلیک برای تغییر</span>
              <ChevronDown className="w-5 h-5 text-slate-700" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. LISTBOX FOR RECEIPT SECTION (لیست باکس ۳ گزینه‌ای بخش دریافت) */}
        {/* ========================================================================= */}
        {masterSection === 'receipt_section' && (
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs sm:text-sm font-black text-emerald-950">
                  لیست‌باکس انتخاب نوع عملیات دریافت (۳ انتخاب اصلی):
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">
                عملیه مستقیماً در همین صفحه با پشتیبانی کامل از تسویه و اکسچنج ارزی انجام می‌شود
              </span>
            </div>

            {/* LISTBOX: EXACTLY 3 OPTIONS */}
            <div
              role="listbox"
              aria-label="نوع دریافت"
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              {/* گزینه اول: دریافت نقدی از مشتری */}
              <button
                type="button"
                role="option"
                aria-selected={receiptAction === 'customer_cash'}
                onClick={() => setReceiptAction('customer_cash')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  receiptAction === 'customer_cash'
                    ? 'bg-white border-emerald-600 shadow-md ring-4 ring-emerald-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-emerald-300 hover:bg-white'
                }`}
              >
                {receiptAction === 'customer_cash' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      receiptAction === 'customer_cash'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                    }`}
                  >
                    ۱
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      دریافت نقدی از مشتری
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      تسویه بدهکاری مشتری • پشتیبانی کامل از اکسچنج و تسویه چندارزی با نرخ روز
                    </span>
                  </div>
                </div>
              </button>

              {/* گزینه دوم: دریافت عواید */}
              <button
                type="button"
                role="option"
                aria-selected={receiptAction === 'income'}
                onClick={() => setReceiptAction('income')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  receiptAction === 'income'
                    ? 'bg-white border-emerald-600 shadow-md ring-4 ring-emerald-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-emerald-300 hover:bg-white'
                }`}
              >
                {receiptAction === 'income' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      receiptAction === 'income'
                        ? 'bg-teal-600 text-white'
                        : 'bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white'
                    }`}
                  >
                    ۲
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      دریافت عواید
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      ثبت و واریز عواید متفرقه، فروش ضایعات، کمیسیون، کرایه و درآمدها به صندوق
                    </span>
                  </div>
                </div>
              </button>

              {/* گزینه سوم: دریافت صندوق به صندوق */}
              <button
                type="button"
                role="option"
                aria-selected={receiptAction === 'cash_transfer'}
                onClick={() => setReceiptAction('cash_transfer')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  receiptAction === 'cash_transfer'
                    ? 'bg-white border-emerald-600 shadow-md ring-4 ring-emerald-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-emerald-300 hover:bg-white'
                }`}
              >
                {receiptAction === 'cash_transfer' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      receiptAction === 'cash_transfer'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                    }`}
                  >
                    ۳
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      دریافت صندوق به صندوق
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      انتقال ورودی وجه بین صندوق‌های شرکت • تبدیل ارز و اکسچنج نقدی با صرافی
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. LISTBOX FOR PAYMENT SECTION (لیست باکس ۳ گزینه‌ای بخش پرداخت) */}
        {/* ========================================================================= */}
        {masterSection === 'payment_section' && (
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-xs sm:text-sm font-black text-rose-950">
                  لیست‌باکس انتخاب نوع عملیات پرداخت (۳ انتخاب اصلی):
                </span>
              </div>
              <span className="text-[11px] text-rose-700 font-bold">
                عملیه در همان صفحه بصورت حرفه‌ای لوکس انجام می‌شود
              </span>
            </div>

            {/* LISTBOX: EXACTLY 3 OPTIONS */}
            <div
              role="listbox"
              aria-label="نوع پرداخت"
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              {/* گزینه اول: پرداخت به مشتری / تأمین‌کننده */}
              <button
                type="button"
                role="option"
                aria-selected={paymentAction === 'customer_payment'}
                onClick={() => setPaymentAction('customer_payment')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  paymentAction === 'customer_payment'
                    ? 'bg-white border-rose-600 shadow-md ring-4 ring-rose-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-rose-300 hover:bg-white'
                }`}
              >
                {paymentAction === 'customer_payment' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      paymentAction === 'customer_payment'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                    }`}
                  >
                    ۱
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      پرداخت به مشتری / تأمین‌کننده
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      تسویه طلبکاری تأمین‌کننده یا مشتری • پرداخت نقدی یا ارزی با اکسچنج
                    </span>
                  </div>
                </div>
              </button>

              {/* گزینه دوم: پرداخت هزینه */}
              <button
                type="button"
                role="option"
                aria-selected={paymentAction === 'expense'}
                onClick={() => setPaymentAction('expense')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  paymentAction === 'expense'
                    ? 'bg-white border-rose-600 shadow-md ring-4 ring-rose-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-rose-300 hover:bg-white'
                }`}
              >
                {paymentAction === 'expense' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      paymentAction === 'expense'
                        ? 'bg-pink-600 text-white'
                        : 'bg-pink-50 text-pink-700 group-hover:bg-pink-600 group-hover:text-white'
                    }`}
                  >
                    ۲
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      پرداخت هزینه
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      ثبت هزینه‌های جاری، کرایه حمل، معاشات، مصارف اداری از صندوق
                    </span>
                  </div>
                </div>
              </button>

              {/* گزینه سوم: پرداخت صندوق به صندوق */}
              <button
                type="button"
                role="option"
                aria-selected={paymentAction === 'cash_transfer'}
                onClick={() => setPaymentAction('cash_transfer')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-right group relative overflow-hidden ${
                  paymentAction === 'cash_transfer'
                    ? 'bg-white border-rose-600 shadow-md ring-4 ring-rose-500/10'
                    : 'bg-white/80 border-slate-200 hover:border-rose-300 hover:bg-white'
                }`}
              >
                {paymentAction === 'cash_transfer' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      paymentAction === 'cash_transfer'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                    }`}
                  >
                    ۳
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 block">
                      پرداخت صندوق به صندوق
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1 leading-relaxed">
                      انتقال خروجی وجوه بین صندوق‌های افغانی و دلاری با نرخ تسعیر
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. EXECUTION CONTAINER: PERFORMS DIRECTLY ON THE SAME PAGE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        {/* --------------------------------------------------------------------- */}
        {/* A. RECEIPT SECTION EXECUTION */}
        {/* --------------------------------------------------------------------- */}
        {masterSection === 'receipt_section' && (
          <div>
            {receiptAction === 'customer_cash' && (
              <ReceiptCreateView
                initialPartyId={partyId}
                onBackToList={() => setMasterSection('list_receipts')}
                onCashTransfer={() => setReceiptAction('cash_transfer')}
                onViewReceipt={() => setMasterSection('list_receipts')}
                onSwitchTab={tab => {
                  if (tab === 'list_receipts') setMasterSection('list_receipts');
                  else if (tab === 'create_payment') {
                    setMasterSection('payment_section');
                    setPaymentAction('customer_payment');
                  } else if (tab === 'list_payments') setMasterSection('list_payments');
                  else if (tab === 'cash_transfer') setReceiptAction('cash_transfer');
                }}
              />
            )}

            {receiptAction === 'income' && (
              <IncomeReceiptDesk
                onSuccess={() => {}}
                onViewList={() => setMasterSection('list_receipts')}
              />
            )}

            {receiptAction === 'cash_transfer' && (
              <CashToCashTransferView
                onBackToList={() => setReceiptAction('customer_cash')}
              />
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* B. PAYMENT SECTION EXECUTION */}
        {/* --------------------------------------------------------------------- */}
        {masterSection === 'payment_section' && (
          <div>
            {paymentAction === 'customer_payment' && (
              <PaymentCreateView
                initialPartyId={partyId}
                onBackToList={() => setMasterSection('list_payments')}
                onCashTransfer={() => setPaymentAction('cash_transfer')}
                onViewPayment={() => setMasterSection('list_payments')}
                onSwitchTab={tab => {
                  if (tab === 'list_payments') setMasterSection('list_payments');
                  else if (tab === 'create_receipt') {
                    setMasterSection('receipt_section');
                    setReceiptAction('customer_cash');
                  } else if (tab === 'list_receipts') setMasterSection('list_receipts');
                  else if (tab === 'cash_transfer') setPaymentAction('cash_transfer');
                }}
              />
            )}

            {paymentAction === 'expense' && (
              <ExpensePaymentDesk
                onSuccess={() => {}}
                onViewList={() => setMasterSection('list_payments')}
              />
            )}

            {paymentAction === 'cash_transfer' && (
              <CashToCashTransferView
                onBackToList={() => setPaymentAction('customer_payment')}
              />
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* C. LIST OF RECEIPTS */}
        {/* --------------------------------------------------------------------- */}
        {masterSection === 'list_receipts' && (
          <ReceiptsListView
            onNewReceipt={() => {
              setPartyId(undefined);
              setMasterSection('receipt_section');
              setReceiptAction('customer_cash');
            }}
            onCashTransfer={() => {
              setMasterSection('receipt_section');
              setReceiptAction('cash_transfer');
            }}
            onViewInvoice={onViewInvoice}
          />
        )}

        {/* --------------------------------------------------------------------- */}
        {/* D. LIST OF PAYMENTS */}
        {/* --------------------------------------------------------------------- */}
        {masterSection === 'list_payments' && (
          <PaymentsListView
            onNewPayment={() => {
              setPartyId(undefined);
              setMasterSection('payment_section');
              setPaymentAction('customer_payment');
            }}
            onCashTransfer={() => {
              setMasterSection('payment_section');
              setPaymentAction('cash_transfer');
            }}
            onViewInvoice={onViewInvoice}
          />
        )}
      </div>
    </div>
  );
};
