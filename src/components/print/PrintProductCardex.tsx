import React from 'react';
import { Product, ProductCardexMovement, CompanySettings } from '../../types';
import { formatNumber, getPersianDate, cleanCardexDescription } from '../../utils/formatters';

interface PrintProductCardexProps {
  product: Product;
  productMovements?: ProductCardexMovement[];
  companySettings: CompanySettings;
  summaryCards?: Array<{ label: string; value: string; color?: string }>;
  metadata?: Array<{ label: string; value: string }>;
  showSignatures?: boolean;
}

export const PrintProductCardex: React.FC<PrintProductCardexProps> = ({
  product,
  productMovements = [],
  companySettings,
  summaryCards = [],
  metadata = [],
  showSignatures = true,
}) => {
  const totalInTons = productMovements.reduce((sum, m) => sum + (m.inTons || 0), 0);
  const totalInBags = productMovements.reduce((sum, m) => sum + (m.inBags || 0), 0);
  const totalOutTons = productMovements.reduce((sum, m) => sum + (m.outTons || 0), 0);
  const totalOutBags = productMovements.reduce((sum, m) => sum + (m.outBags || 0), 0);
  const lastBalanceTons = productMovements.length > 0 ? productMovements[productMovements.length - 1].balanceTons : 0;
  const lastBalanceBags = productMovements.length > 0 ? productMovements[productMovements.length - 1].balanceBags : 0;

  return (
    <div className="relative z-10 space-y-3 font-sans text-slate-900 printable-content">
      {/* 1. Header */}
      <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-14 h-14 object-contain rounded-lg bg-white border border-slate-300 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              کالا
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              کارتکس رسمی گردش و موجودی فیزیکی کالا (دفتر انبارداری)
            </p>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              تلفن: {companySettings.phone || '---'} {companySettings.address ? `• آدرس: ${companySettings.address}` : ''}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-[11px] font-black px-3 py-1 rounded-lg bg-slate-900 text-white">
            کارتکس کالا
          </span>
          <div className="text-xs font-black text-slate-900 mt-1">
            کد جنس: #{product.code || product.id.slice(0, 6)}
          </div>
          <div className="text-[10px] text-slate-600 font-sans mt-0.5">
            تاریخ چاپ: {getPersianDate()}
          </div>
        </div>
      </div>

      {/* 2. Product Details */}
      <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-3.5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">نام جنس / کالا:</span>
            <strong className="text-sm font-black text-slate-900">{product.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">دسته‌بندی کالا:</span>
            <span className="font-bold text-slate-800">{product.category || 'سیمان'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">وزن هر کیسه / پاکت:</span>
            <span className="font-bold text-slate-800 font-mono">{product.bagWeightKg || 50} کیلوگرم</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">ضریب تبدیل کیسه/تن:</span>
            <span className="font-bold text-slate-800 font-mono">{product.bagsPerTon || 20} کیسه در تن</span>
          </div>
        </div>
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border-2 border-slate-300 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">موجودی فعلی (تن):</span>
          <strong className="text-base font-black text-blue-800 font-mono">
            {formatNumber(lastBalanceTons)} تن
          </strong>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">موجودی فعلی (کیسه):</span>
          <strong className="text-base font-black text-emerald-800 font-mono">
            {formatNumber(lastBalanceBags)} کیسه
          </strong>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">کل ورودی دوره:</span>
          <strong className="text-xs font-black text-emerald-700 font-mono block">
            {formatNumber(totalInTons)} تن
          </strong>
          <span className="text-[10px] text-emerald-600 font-mono">({formatNumber(totalInBags)} کیسه)</span>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">کل خروجی دوره:</span>
          <strong className="text-xs font-black text-rose-700 font-mono block">
            {formatNumber(totalOutTons)} تن
          </strong>
          <span className="text-[10px] text-rose-600 font-mono">({formatNumber(totalOutBags)} کیسه)</span>
        </div>
      </div>

      {/* 4. Movements Table */}
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-right border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-900 text-white font-black">
              <th className="p-2 border border-slate-700 text-center w-10">ردیف</th>
              <th className="p-2 border border-slate-700 text-center w-22">تاریخ</th>
              <th className="p-2 border border-slate-700 text-center w-24">نوع گردش</th>
              <th className="p-2 border border-slate-700 text-center w-22">شماره سند</th>
              <th className="p-2 border border-slate-700 text-center w-28">گدام</th>
              <th className="p-2 border border-slate-700 text-right">طرف حساب / تفصیل</th>
              <th className="p-2 border border-slate-700 text-center w-20">ورود (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-20">ورود (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-20">خروج (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-20">خروج (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-22">مانده (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-22">مانده (کیسه)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {productMovements.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 font-bold">
                  هیچ سابقه گردش ورودی یا خروجی برای این کالا ثبت نشده است.
                </td>
              </tr>
            ) : (
              productMovements.map((m, idx) => (
                <tr key={m.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                    {m.date}
                  </td>
                  <td className="p-2 border border-slate-200 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      m.type === 'buy' || m.type === 'transfer_in'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {m.typeLabel}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                    {m.documentNumber}
                  </td>
                  <td className="p-2 border border-slate-200 text-center whitespace-nowrap text-slate-700 font-medium">
                    {m.warehouseName}
                  </td>
                  <td className="p-2 border border-slate-200 text-slate-800 text-[10px] leading-tight font-medium max-w-[170px]" title={m.notes || ''}>
                    <div className="font-bold truncate">{m.partyName || '---'}</div>
                    {m.notes && (
                      <div className="text-[9px] text-slate-500 truncate">
                        {cleanCardexDescription(m.notes, 30)}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {m.inTons > 0 ? formatNumber(m.inTons) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {m.inBags > 0 ? formatNumber(m.inBags) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                    {m.outTons > 0 ? formatNumber(m.outTons) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                    {m.outBags > 0 ? formatNumber(m.outBags) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                    {formatNumber(m.balanceTons)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                    {formatNumber(m.balanceBags)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Signatures */}
      {showSignatures && (
        <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-slate-300 text-center text-[10.5px]">
          <div>
            <span className="text-slate-500 block mb-8 font-bold">انباردار و تحویل‌دهنده گدام</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مسئول گدام‌های شرکت
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">حسابدار انبار و کالا</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              امور حسابداری صنعتی و انبار
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید مدیریت عامله</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              {companySettings.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
