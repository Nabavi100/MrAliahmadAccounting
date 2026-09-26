import React from 'react';
import { FinancialTransaction, CompanySettings } from '../../types';
import { formatNumber, formatCurrency, getPersianDate } from '../../utils/formatters';

interface PrintCashExchangeVoucherProps {
  transaction: FinancialTransaction;
  companySettings: CompanySettings;
  showSignatures?: boolean;
}

export const PrintCashExchangeVoucher: React.FC<PrintCashExchangeVoucherProps> = ({
  transaction,
  companySettings,
  showSignatures = true,
}) => {
  const isExchange = transaction.isExchange || transaction.type === 'currency_exchange' || (transaction.targetCurrency && transaction.targetCurrency !== transaction.currency);

  const getRegisterTitle = (reg?: string) => {
    if (reg === 'afn_cash') return 'صندوق افغانی شرکت';
    if (reg === 'usd_cash') return 'صندوق دلار شرکت';
    if (reg === 'exchange_usd_cash') return 'صندوق صرافی و تبدیل';
    return reg || 'صندوق نقدی';
  };

  const fromTitle = getRegisterTitle(transaction.fromCashRegister || transaction.cashRegister);
  const toTitle = getRegisterTitle(transaction.toCashRegister);

  return (
    <div className="relative z-10 space-y-3 font-sans text-slate-900 printable-content">
      {/* 1. Header */}
      <div className="p-3.5 rounded-xl border-2 border-indigo-700 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-14 h-14 object-contain rounded-lg bg-white border border-slate-300 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-indigo-800 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              صندوق
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-[11px] text-indigo-900 font-bold mt-0.5">
              {isExchange ? 'سند رسمی تبادله اسعار و اکسچنج ارزی بین‌صندوقی' : 'سند رسمی انتقال وجه بین صندوق‌های شرکت'}
            </p>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              خزانه‌داری و مدیریت مالی • تاریخ صدور: {transaction.date || getPersianDate()}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-[11px] font-black px-3 py-1 rounded-lg bg-indigo-800 text-white shadow-xs">
            {isExchange ? 'حواله اکسچنج ارزی' : 'حواله انتقال وجه'}
          </span>
          <div className="text-xs font-black text-slate-900 mt-1">
            شماره سند: #{transaction.transactionNumber}
          </div>
          <div className="text-[10px] text-slate-600 font-sans mt-0.5">
            ساعت: {transaction.issueTime || '۱۰:۰۰'}
          </div>
        </div>
      </div>

      {/* 2. Transfer & Exchange Grid */}
      <div className="bg-indigo-50/60 border-2 border-indigo-200 rounded-xl p-4 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-indigo-200">
          <div>
            <span className="text-indigo-900 block text-[10.5px] font-bold mb-0.5">صندوق مبدأ (برداشت):</span>
            <strong className="text-sm font-black text-rose-700">{fromTitle}</strong>
          </div>
          <div>
            <span className="text-indigo-900 block text-[10.5px] font-bold mb-0.5">صندوق مقصد (واریز):</span>
            <strong className="text-sm font-black text-emerald-700">{toTitle}</strong>
          </div>
          <div>
            <span className="text-indigo-900 block text-[10.5px] font-bold mb-0.5">مبلغ برداشتی مبدأ:</span>
            <strong className="text-base font-black text-slate-900 font-mono">
              {formatCurrency(transaction.amount, transaction.currency)}
            </strong>
          </div>
          <div>
            <span className="text-indigo-900 block text-[10.5px] font-bold mb-0.5">مبلغ واریزی مقصد:</span>
            <strong className="text-base font-black text-emerald-800 font-mono">
              {transaction.targetAmount && transaction.targetCurrency
                ? formatCurrency(transaction.targetAmount, transaction.targetCurrency)
                : formatCurrency(transaction.amount, transaction.currency)}
            </strong>
          </div>
        </div>

        {isExchange && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-indigo-200">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">نرخ تبادله / اکسچنج:</span>
              <strong className="text-sm font-black text-indigo-900 font-mono">
                {transaction.exchangeRate ? formatNumber(transaction.exchangeRate) : '---'}
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                (افغانی در برابر ۱ دلار یا برعکس)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">ارز مبدأ / مقصد:</span>
              <strong className="text-xs font-black text-slate-800 font-mono">
                {transaction.currency} ➔ {transaction.targetCurrency || transaction.currency}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">طرف صرافی / تفصیل:</span>
              <strong className="text-xs font-black text-slate-800">
                {transaction.partyName || 'صندوق صرافی داخلی'}
              </strong>
            </div>
          </div>
        )}

        <div className="pt-1">
          <span className="text-slate-500 block text-[10px] font-bold mb-1">بابت و شرح عملیات:</span>
          <p className="text-slate-900 font-medium bg-white p-3 rounded-lg border border-indigo-200 text-[11.5px] leading-relaxed">
            {transaction.description || 'انتقال و تبادله وجوه میان حساب‌های نقدینگی شرکت'}
          </p>
        </div>
      </div>

      {/* 3. Signatures */}
      {showSignatures && (
        <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-slate-300 text-center text-[10.5px]">
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تحویل‌دهنده (مسئول صندوق مبدأ)</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مسئول {fromTitle}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تحویل‌گیرنده (مسئول صندوق مقصد / صراف)</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مسئول {toTitle}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید مدیریت مالی</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مدیر مالی {companySettings.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
