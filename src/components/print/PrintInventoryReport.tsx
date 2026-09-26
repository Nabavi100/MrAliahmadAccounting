import React from 'react';
import { Product, Warehouse, StockInventory, CompanySettings } from '../../types';
import { formatNumber, formatCurrency, getPersianDate } from '../../utils/formatters';

interface PrintInventoryReportProps {
  products: Product[];
  warehouses: Warehouse[];
  stocks: StockInventory[];
  companySettings: CompanySettings;
  selectedWarehouseName?: string;
  selectedCategoryName?: string;
  showSignatures?: boolean;
}

export const PrintInventoryReport: React.FC<PrintInventoryReportProps> = ({
  products,
  warehouses,
  stocks,
  companySettings,
  selectedWarehouseName = 'تمامی گدام‌ها',
  selectedCategoryName = 'همه دسته‌ها',
  showSignatures = true,
}) => {
  // Aggregate stock per product and warehouse
  let totalTons = 0;
  let totalBags = 0;
  let totalValueUSD = 0;

  const rows: Array<{
    id: string;
    productCode: string;
    productName: string;
    category: string;
    warehouseName: string;
    quantityTons: number;
    quantityBags: number;
    buyPriceUSD: number;
    totalUSD: number;
    status: string;
  }> = [];

  stocks.forEach(stk => {
    const prod = products.find(p => p.id === stk.productId);
    const wh = warehouses.find(w => w.id === stk.warehouseId);
    if (!prod || !wh) return;

    const tons = stk.quantityTons || 0;
    const bags = stk.quantityBags || 0;
    const buyUSD = prod.buyPriceUSD || 0;
    const valUSD = tons * buyUSD;

    totalTons += tons;
    totalBags += bags;
    totalValueUSD += valUSD;

    rows.push({
      id: `${stk.warehouseId}-${stk.productId}`,
      productCode: prod.code || '---',
      productName: prod.name,
      category: prod.category || 'سیمان',
      warehouseName: wh.name,
      quantityTons: tons,
      quantityBags: bags,
      buyPriceUSD: buyUSD,
      totalUSD: valUSD,
      status: tons > 50 ? 'موجودی کافی' : tons > 0 ? 'نیاز به سفارش' : 'موجودی صفر',
    });
  });

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
            <div className="w-14 h-14 rounded-lg bg-teal-800 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              موجودی
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-[11px] text-teal-900 font-bold mt-0.5">
              گزارش جامع موجودی فیزیکی و ارزش کالاها در گدام‌ها
            </p>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              تلفن: {companySettings.phone || '---'} {companySettings.address ? `• آدرس: ${companySettings.address}` : ''}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-[11px] font-black px-3 py-1 rounded-lg bg-teal-800 text-white shadow-xs">
            گزارش موجودی کالا
          </span>
          <div className="text-xs font-black text-slate-900 mt-1">
            اقلام موجودی: {rows.length} ردیف
          </div>
          <div className="text-[10px] text-slate-600 font-sans mt-0.5">
            تاریخ تهیه: {getPersianDate()}
          </div>
        </div>
      </div>

      {/* 2. Filter criteria banner */}
      <div className="bg-teal-50/70 border-2 border-teal-300 rounded-xl p-3 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-teal-900 block text-[10.5px] font-bold mb-0.5">فیلتر گدام / انبار:</span>
            <strong className="text-xs font-black text-slate-900">{selectedWarehouseName}</strong>
          </div>
          <div>
            <span className="text-teal-900 block text-[10.5px] font-bold mb-0.5">فیلتر دسته‌بندی کالا:</span>
            <span className="font-bold text-slate-800">{selectedCategoryName}</span>
          </div>
          <div>
            <span className="text-teal-900 block text-[10.5px] font-bold mb-0.5">مبنای ارزش‌گذاری:</span>
            <span className="font-bold text-slate-800">آخرین نرخ خرید (COGS)</span>
          </div>
          <div>
            <span className="text-teal-900 block text-[10.5px] font-bold mb-0.5">تاریخ ثبت سیستمی:</span>
            <span className="font-bold text-slate-800 font-mono">{getPersianDate()}</span>
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-white border-2 border-teal-400 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-700 block font-bold mb-0.5">کل موجودی فیزیکی (تن):</span>
          <strong className="text-lg font-black text-teal-900 font-mono">
            {formatNumber(totalTons)} تن
          </strong>
        </div>

        <div className="bg-white border-2 border-teal-400 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-700 block font-bold mb-0.5">کل موجودی فیزیکی (کیسه):</span>
          <strong className="text-lg font-black text-teal-900 font-mono">
            {formatNumber(totalBags)} کیسه
          </strong>
        </div>

        <div className="bg-white border-2 border-teal-400 rounded-xl p-2.5 text-center shadow-2xs">
          <span className="text-[10.5px] text-slate-700 block font-bold mb-0.5">ارزش تخمینی کل موجودی:</span>
          <strong className="text-lg font-black text-emerald-800 font-mono">
            {formatCurrency(totalValueUSD, 'USD')}
          </strong>
        </div>
      </div>

      {/* 4. Table */}
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-right border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-900 text-white font-black">
              <th className="p-2 border border-slate-700 text-center w-10">ردیف</th>
              <th className="p-2 border border-slate-700 text-center w-20">کد کالا</th>
              <th className="p-2 border border-slate-700 text-right">نام جنس / مشخصات کالا</th>
              <th className="p-2 border border-slate-700 text-center w-24">دسته‌بندی</th>
              <th className="p-2 border border-slate-700 text-center w-28">گدام نگهداری</th>
              <th className="p-2 border border-slate-700 text-center w-24">موجودی (تن)</th>
              <th className="p-2 border border-slate-700 text-center w-24">موجودی (کیسه)</th>
              <th className="p-2 border border-slate-700 text-center w-24">نرخ خرید واحد</th>
              <th className="p-2 border border-slate-700 text-center w-28">ارزش کل موجودی</th>
              <th className="p-2 border border-slate-700 text-center w-24">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                  هیچ کالایی مطابق با فیلتر انتخابی در گدام‌ها یافت نشد.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                    {r.productCode}
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-slate-900 leading-relaxed">
                    {r.productName}
                  </td>
                  <td className="p-2 border border-slate-200 text-center text-slate-700 whitespace-nowrap">
                    {r.category}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-medium text-slate-800 whitespace-nowrap">
                    {r.warehouseName}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-blue-800 whitespace-nowrap">
                    {formatNumber(r.quantityTons)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-emerald-800 whitespace-nowrap">
                    {formatNumber(r.quantityBags)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                    {formatCurrency(r.buyPriceUSD, 'USD')}
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                    {formatCurrency(r.totalUSD, 'USD')}
                  </td>
                  <td className="p-2 border border-slate-200 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.quantityTons > 50
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : r.quantityTons > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {r.status}
                    </span>
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
            <span className="text-slate-500 block mb-8 font-bold">مدیر انبارداری و گدام‌ها</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مسئول انبارداری {companySettings.name}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">رئیس حسابداری صنعتی</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              امور مالی و کنترل موجودی
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید مدیریت عامل</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              {companySettings.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
