import React from 'react';
import { ConsignmentMovement, CompanySettings, Party } from '../../types';
import { formatNumber, getPersianDate } from '../../utils/formatters';

interface PrintConsignmentDeliverySlipProps {
  movement: ConsignmentMovement;
  party?: Party;
  companySettings: CompanySettings;
  showSignatures?: boolean;
}

export const PrintConsignmentDeliverySlip: React.FC<PrintConsignmentDeliverySlipProps> = ({
  movement,
  party,
  companySettings,
  showSignatures = true,
}) => {
  const customerName = movement.partyName || party?.name || 'مشتری محترم';
  const customerPhone = movement.partyPhone || party?.phone || '---';

  return (
    <div className="relative z-10 space-y-4 font-sans text-slate-900 printable-content" dir="rtl">
      {/* 1. Official Header */}
      <div className="p-4 rounded-2xl border-2 border-slate-900 bg-white flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-16 h-16 object-contain rounded-xl bg-white border border-slate-300 p-1"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              {companySettings.logoIconText || 'خروج'}
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-xs text-amber-900 font-bold mt-0.5">
              سند خروجی و رسید رسمی تحویل بار از گدام امانی (برگه استاندارد A4)
            </p>
            <div className="text-[11px] text-slate-600 font-mono mt-1">
              تلفن دفتر و گدام: {companySettings.phone || '---'} {companySettings.address ? `• آدرس: ${companySettings.address}` : ''}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-xs font-black px-3.5 py-1.5 rounded-xl bg-amber-600 text-white shadow-xs">
            سند خروجی امانت
          </span>
          <div className="text-sm font-black text-slate-900 mt-1.5">
            شماره سند: <span className="font-mono text-amber-800">#{movement.documentNumber}</span>
          </div>
          <div className="text-xs text-slate-700 font-sans mt-0.5">
            تاریخ خروج: <strong className="font-mono">{movement.date}</strong> {movement.issueTime ? `(${movement.issueTime})` : ''}
          </div>
        </div>
      </div>

      {/* 2. Customer & Consignment Source Info */}
      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-amber-900 block text-[11px] font-bold mb-0.5">صاحب امانت / مشتری:</span>
            <strong className="text-sm font-black text-slate-900">{customerName}</strong>
          </div>
          <div>
            <span className="text-amber-900 block text-[11px] font-bold mb-0.5">شماره تماس مشتری:</span>
            <span className="font-bold text-slate-800 font-mono text-xs">{customerPhone}</span>
          </div>
          <div>
            <span className="text-amber-900 block text-[11px] font-bold mb-0.5">گدام مبدا تحویل بار:</span>
            <span className="font-bold text-slate-900 text-xs">{movement.warehouseName || 'گدام امانی'}</span>
          </div>
          <div>
            <span className="text-amber-900 block text-[11px] font-bold mb-0.5">نوع عملیات انبارداری:</span>
            <span className="font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
              خروج و تحویل به مشتری
            </span>
          </div>
        </div>
      </div>

      {/* 3. Items & Released Quantities Table */}
      <div className="border-2 border-slate-900 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between font-black text-xs">
          <span>مشخصات کالای خروجی و تعداد تحویل شده</span>
          <span>واحد سنجش: تن و کیسه</span>
        </div>
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
              <th className="p-3 border-l border-slate-300 text-center w-12">ردیف</th>
              <th className="p-3 border-l border-slate-300 text-right">نام کالا و جنس امانی</th>
              <th className="p-3 border-l border-slate-300 text-center w-28">مقدار خروجی (تن)</th>
              <th className="p-3 border-l border-slate-300 text-center w-28">تعداد خروجی (کیسه)</th>
              <th className="p-3 border-l border-slate-300 text-center w-40">گدام خروج</th>
              <th className="p-3 text-right">توضیحات و مشخصات بسته</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 font-bold">
              <td className="p-3 border-l border-slate-200 text-center font-mono text-slate-500">1</td>
              <td className="p-3 border-l border-slate-200 text-slate-900 font-black text-sm">
                {movement.productName}
              </td>
              <td className="p-3 border-l border-slate-200 text-center font-mono font-black text-rose-700 text-sm">
                {formatNumber(movement.quantityTons)} تن
              </td>
              <td className="p-3 border-l border-slate-200 text-center font-mono font-black text-rose-700 text-sm">
                {formatNumber(movement.quantityBags)} کیسه
              </td>
              <td className="p-3 border-l border-slate-200 text-center text-slate-700">
                {movement.warehouseName || 'گدام امانی'}
              </td>
              <td className="p-3 text-slate-600 text-xs">
                {movement.notes || 'تحویل بار امانی طبق درخواست مشتری'}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
              <td colSpan={2} className="p-3 text-left border-l border-slate-200">
                مجموع تحویل این مرحله:
              </td>
              <td className="p-3 text-center border-l border-slate-200 font-mono text-rose-800 text-sm">
                {formatNumber(movement.quantityTons)} تن
              </td>
              <td className="p-3 text-center border-l border-slate-200 font-mono text-rose-800 text-sm">
                {formatNumber(movement.quantityBags)} کیسه
              </td>
              <td colSpan={2} className="p-3 text-slate-500 text-[11px]">
                بار به صورت سالم و بدون کسری تحویل راننده گردید.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Driver & Transportation Details */}
      <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50 text-xs space-y-2">
        <h3 className="font-black text-slate-900 text-xs flex items-center gap-2">
          <span>اطلاعات موتروان و باربری:</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10.5px] font-bold">نام راننده / موتروان:</span>
            <strong className="text-slate-900 text-xs">{movement.driverName || 'تحویل حضوری مشتری'}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10.5px] font-bold">شماره پلاک موتر:</span>
            <strong className="text-slate-900 font-mono text-xs">{movement.carPlate || '---'}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10.5px] font-bold">شماره تماس راننده:</span>
            <strong className="text-slate-900 font-mono text-xs">{movement.driverPhone || '---'}</strong>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10.5px] font-bold">مقصد تخلیه بار:</span>
            <strong className="text-slate-900 text-xs">{movement.destination || 'هرات / مقصد مشتری'}</strong>
          </div>
        </div>
      </div>

      {/* 5. Remaining Consignment Balance Card */}
      {typeof movement.remainingTonsAfter === 'number' && (
        <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-black text-emerald-950 text-sm block">
              وضعیت مانده حساب امانت مشتری در گدام پس از این مرحله:
            </span>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              موجودی باقیمانده نزد گدام امانی برای تحویل در مراحل بعدی محفوظ است.
            </p>
          </div>
          <div className="text-left font-mono shrink-0">
            <div className="text-base font-black text-emerald-950">
              {formatNumber(movement.remainingTonsAfter)} تن
            </div>
            <div className="text-xs font-bold text-emerald-800">
              ({formatNumber(movement.remainingBagsAfter || 0)} کیسه باقیمانده)
            </div>
          </div>
        </div>
      )}

      {/* 6. Legal & Terms Notes */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
        <strong>یادداشت قانونی:</strong> این سند به منزله تسلیم و تحویل قطعی مقادیر فوق از محل کالای امانی بوده و با امضای متصدیان، تعهد شرکت نسبت به تعداد تحویل داده شده خاتمه یافته تلقی می‌شود.
      </div>

      {/* 7. Signatures Block */}
      {showSignatures && (
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-12">
            <span className="font-black text-slate-800 block">امضای تحویل‌دهنده (انباردار)</span>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-12">
            <span className="font-black text-slate-800 block">امضا و تایید راننده و متصدی باربری</span>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-12">
            <span className="font-black text-slate-800 block">امضا و اثر انگشت صاحب امانت / مشتری</span>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
};
