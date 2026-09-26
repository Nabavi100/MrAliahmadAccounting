import React from 'react';
import { ExpenseItem, CompanySettings } from '../../types';
import { formatNumber, formatCurrency, getPersianDate } from '../../utils/formatters';

interface PrintExpenseVoucherProps {
  expense: ExpenseItem;
  companySettings: CompanySettings;
  showSignatures?: boolean;
  showSignature?: boolean;
  signatureUrl?: string;
  signatureSize?: number;
}

export const PrintExpenseVoucher: React.FC<PrintExpenseVoucherProps> = ({
  expense,
  companySettings,
  showSignatures = true,
  showSignature = false,
  signatureUrl,
  signatureSize = 100,
}) => {
  return (
    <div className="relative z-10 space-y-4 font-sans text-slate-900 printable-content" dir="rtl">
      {/* 1. Official Header */}
      <div className="p-4 rounded-xl border-2 border-amber-600 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-14 h-14 object-contain rounded-lg bg-white border border-slate-300 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              {companySettings.logoIconText || 'هـ'}
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name} • امور مالی و خزانه‌داری
            </h1>
            <p className="text-xs text-amber-900 font-bold mt-0.5">
              سند رسمی پرداخت هزینه و مصارف جاری شرکت
            </p>
            <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
              سیستم جامع حسابداری مالی و گدام‌داری
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-xs font-black px-3 py-1 rounded-lg bg-amber-600 text-white shadow-xs">
            سند هزینه / مصارف
          </span>
          <div className="text-xs text-slate-700 font-bold mt-1.5 flex items-center gap-1">
            <span>شماره سند:</span>
            <strong className="text-amber-800 font-black">{expense.expenseNumber || expense.id}</strong>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            تاریخ صدور: {expense.date || getPersianDate()}
          </div>
        </div>
      </div>

      {/* 2. Voucher Details Grid */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
        <div className="bg-amber-50/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black text-amber-950">مشخصات سرفصل و پرداخت هزینه</span>
          <span className="text-[11px] font-medium text-slate-600">
            واحد پولی: <strong className="font-bold text-slate-900">{expense.currency === 'USD' ? 'دالر ($)' : 'افغانی (؋)'}</strong>
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">سرفصل و دسته هزینه:</span>
            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
              {expense.categoryName || 'مصارف عمومی'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">صندوق پرداخت‌کننده:</span>
            <span className="font-bold text-slate-800">
              {expense.cashRegisterName || (expense.cashRegisterId === 'usd_cash' ? 'صندوق دلار شرکت' : 'صندوق افغانی شرکت')}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">پرداخت به (دریافت‌کننده):</span>
            <span className="font-black text-slate-900">
              {expense.recipient || 'متفرقه / امور جاری'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">عنوـان هزینه:</span>
            <span className="font-bold text-slate-800">
              {expense.title}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">تاریخ ثبت سند:</span>
            <span className="font-mono font-bold text-slate-800">
              {expense.date}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-0.5">شماره مسلسل سند:</span>
            <span className="font-mono font-black text-amber-800">
              {expense.expenseNumber || '---'}
            </span>
          </div>
        </div>

        {/* Amount Box */}
        <div className="mx-4 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">مبلغ قطعی پرداختی هزینه:</span>
            <span className="font-mono font-black text-base sm:text-lg text-amber-900">
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            وضعیت سند: <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">پرداخت و کسر از صندوق انجام شد</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-4">
          <span className="text-slate-500 block text-[11px] font-bold mb-1">شرح کامل و توضیحات هزینه:</span>
          <p className="text-slate-900 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
            {expense.notes || expense.title || 'هزینه مصارف اداری و جاری شرکت ثبت گردیده است.'}
          </p>
        </div>
      </div>

      {/* 3. Official Accounting Signatures */}
      {showSignatures && (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-center text-xs">
          <div className="relative">
            <span className="text-slate-500 block mb-1 font-bold">امضای تحویل‌گیرنده وجه</span>
            <div className="min-h-[44px] flex items-center justify-center text-slate-400 text-[10px]">
              {expense.recipient ? `(${expense.recipient})` : '(محل امضا یا اثر انگشت)'}
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-slate-700 font-bold text-[11px]">
              تحویل‌گیرنده
            </div>
          </div>

          <div className="relative">
            <span className="text-slate-500 block mb-1 font-bold">امضای صادرکننده / مسئول مالی</span>
            <div className="relative min-h-[44px] flex items-center justify-center">
              {showSignature && signatureUrl && (
                <img
                  src={signatureUrl}
                  alt="امضای صادرکننده"
                  className="max-h-12 object-contain"
                  style={{ width: `${signatureSize * 0.7}px` }}
                />
              )}
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-slate-700 font-bold text-[11px]">
              امور مالی و حسابداری
            </div>
          </div>

          <div className="relative">
            <span className="text-slate-500 block mb-1 font-bold">تأیید مدیریت عامله شرکت</span>
            <div className="min-h-[44px] flex items-center justify-center text-slate-400 text-[10px]">
              (محل امضا و مهر رسمی)
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-slate-700 font-bold text-[11px]">
              {companySettings.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
