import React from 'react';
import { ConsignmentMovement, CompanySettings, Party } from '../../types';
import { formatNumber, getPersianDate, cleanCardexDescription } from '../../utils/formatters';

interface PrintConsignmentCardexProps {
  party?: Party;
  partyName?: string;
  consignmentMovements: ConsignmentMovement[];
  companySettings: CompanySettings;
  showSignatures?: boolean;
}

export const PrintConsignmentCardex: React.FC<PrintConsignmentCardexProps> = ({
  party,
  partyName,
  consignmentMovements = [],
  companySettings,
  showSignatures = true,
}) => {
  const resolvedPartyName = party?.name || partyName || 'همه مشتریان امانی';

  // Calculate totals and running balances
  let runTons = 0;
  let runBags = 0;
  let totalInTons = 0;
  let totalInBags = 0;
  let totalOutTons = 0;
  let totalOutBags = 0;

  const rowsWithBalance = consignmentMovements.map((m, idx) => {
    const isIn = m.type === 'deposit';
    const deltaTons = isIn ? m.quantityTons : -m.quantityTons;
    const deltaBags = isIn ? m.quantityBags : -m.quantityBags;

    if (isIn) {
      totalInTons += m.quantityTons;
      totalInBags += m.quantityBags;
    } else {
      totalOutTons += m.quantityTons;
      totalOutBags += m.quantityBags;
    }

    runTons += deltaTons;
    runBags += deltaBags;

    return {
      ...m,
      rowNumber: idx + 1,
      inTons: isIn ? m.quantityTons : 0,
      inBags: isIn ? m.quantityBags : 0,
      outTons: !isIn ? m.quantityTons : 0,
      outBags: !isIn ? m.quantityBags : 0,
      runningTons: Number(runTons.toFixed(3)),
      runningBags: Math.round(runBags),
    };
  });

  return (
    <div className="relative z-10 space-y-3 font-sans text-slate-900 printable-content">
      {/* 1. Luxury Official Header */}
      <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-14 h-14 object-contain rounded-lg bg-white border border-slate-300 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              امانت
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-[11px] text-amber-900 font-bold mt-0.5">
              کارتکس رسمی امانات مشتری و گدام امانی (گزارش واریز، خروج و مانده امانت)
            </p>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              تلفن: {companySettings.phone || '---'} {companySettings.address ? `• آدرس: ${companySettings.address}` : ''}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-[11px] font-black px-3 py-1 rounded-lg bg-amber-700 text-white shadow-xs">
            کارتکس امانات
          </span>
          <div className="text-xs font-black text-slate-900 mt-1">
            صاحب امانت: {resolvedPartyName}
          </div>
          <div className="text-[10px] text-slate-600 font-sans mt-0.5">
            تاریخ چاپ: {getPersianDate()}
          </div>
        </div>
      </div>

      {/* 2. Customer & Consignment Info Card */}
      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-3.5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-amber-800 block text-[10.5px] font-bold mb-0.5">صاحب امانت / مشتری:</span>
            <strong className="text-sm font-black text-slate-900">{resolvedPartyName}</strong>
          </div>
          <div>
            <span className="text-amber-800 block text-[10.5px] font-bold mb-0.5">شماره تماس / موبایل:</span>
            <span className="font-bold text-slate-800 font-mono text-xs">{party?.phone || '---'}</span>
          </div>
          <div>
            <span className="text-amber-800 block text-[10.5px] font-bold mb-0.5">گروه طرف حساب:</span>
            <span className="font-bold text-slate-800">{party?.groupName || 'مشتریان امانی'}</span>
          </div>
          <div>
            <span className="text-amber-800 block text-[10.5px] font-bold mb-0.5">وضعیت تسویه امانت:</span>
            <span className="font-black text-slate-900">
              {runTons > 0 ? 'دارای امانت فعال در گدام' : runTons === 0 ? 'تسویه کامل امانت' : 'اضافه تحویل شده'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Luxury KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border-2 border-amber-400 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-700 block font-bold mb-0.5">مانده امانت باقی‌مانده (تن):</span>
          <strong className="text-lg font-black text-amber-900 font-mono">
            {formatNumber(runTons)} تن
          </strong>
        </div>

        <div className="bg-white border-2 border-amber-400 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-700 block font-bold mb-0.5">مانده امانت باقی‌مانده (کیسه):</span>
          <strong className="text-lg font-black text-amber-900 font-mono">
            {formatNumber(runBags)} کیسه
          </strong>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">کل امانت تحویل گرفته شده:</span>
          <strong className="text-xs font-black text-emerald-800 font-mono block">
            {formatNumber(totalInTons)} تن
          </strong>
          <span className="text-[10px] text-emerald-700 font-mono">({formatNumber(totalInBags)} کیسه)</span>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
          <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">کل تحویل داده شده به مشتری:</span>
          <strong className="text-xs font-black text-rose-800 font-mono block">
            {formatNumber(totalOutTons)} تن
          </strong>
          <span className="text-[10px] text-rose-700 font-mono">({formatNumber(totalOutBags)} کیسه)</span>
        </div>
      </div>

      {/* 4. Movements Table */}
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-right border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-900 text-white font-black">
              <th className="p-2 border border-slate-700 text-center w-10">ردیف</th>
              <th className="p-2 border border-slate-700 text-center w-22">تاریخ</th>
              <th className="p-2 border border-slate-700 text-center w-26">نوع عملیات</th>
              <th className="p-2 border border-slate-700 text-center w-24">شماره سند</th>
              <th className="p-2 border border-slate-700 text-center w-28">کالا</th>
              <th className="p-2 border border-slate-700 text-center w-24">گدام</th>
              <th className="p-2 border border-slate-700 text-right">راننده / پلاک موتر / توضیحات</th>
              <th className="p-2 border border-slate-700 text-center w-20">ورود (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-20">ورود (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-20">خروج (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-20">خروج (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-22">مانده (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-22">مانده (تن)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rowsWithBalance.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 font-bold">
                  هیچ سابقه واریز یا تحویل کالای امانی برای این مشتری ثبت نشده است.
                </td>
              </tr>
            ) : (
              rowsWithBalance.map((m, idx) => (
                <tr key={m.id || idx} className={idx % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'}>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500">
                    {m.rowNumber}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                    {m.date}
                    {m.issueTime && <div className="text-[9px] text-slate-400">{m.issueTime}</div>}
                  </td>
                  <td className="p-2 border border-slate-200 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      m.type === 'deposit'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : 'bg-rose-100 text-rose-950 border border-rose-300'
                    }`}>
                      {m.type === 'deposit' ? 'واریز به امانی' : 'تحویل به مشتری'}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                    {m.documentNumber}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-bold text-slate-800 whitespace-nowrap">
                    {m.productName}
                  </td>
                  <td className="p-2 border border-slate-200 text-center text-slate-700 whitespace-nowrap">
                    {m.warehouseName || 'گدام امانی'}
                  </td>
                  <td className="p-2 border border-slate-200 text-slate-800 text-[10px] leading-tight font-medium max-w-[150px]" title={m.notes || ''}>
                    <div className="truncate">
                      {m.driverName ? `راننده: ${m.driverName}` : ''}
                      {m.carPlate ? ` (${m.carPlate})` : ''}
                    </div>
                    {m.notes && (
                      <div className="text-[9.5px] text-slate-500 truncate">
                        {cleanCardexDescription(m.notes, 35)}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {m.inBags > 0 ? formatNumber(m.inBags) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {m.inTons > 0 ? formatNumber(m.inTons) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                    {m.outBags > 0 ? formatNumber(m.outBags) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                    {m.outTons > 0 ? formatNumber(m.outTons) : '-'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-amber-950 whitespace-nowrap bg-amber-50/50">
                    {formatNumber(m.runningBags)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-amber-950 whitespace-nowrap bg-amber-50/50">
                    {formatNumber(m.runningTons)}
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
            <span className="text-slate-500 block mb-8 font-bold">انباردار گدام امانی</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              تحویل‌دهنده و انباردار
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">مسئول حسابداری امانات</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              امور مالی {companySettings.name}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید و امضای صاحب کالا / مشتری</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              {resolvedPartyName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
