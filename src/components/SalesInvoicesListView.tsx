import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, Invoice, PaymentStatus } from '../types';
import { formatNumber, formatCurrency } from '../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Search,
  Printer,
  Eye,
  Trash2,
  FileText,
  Calendar,
  Filter,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  Edit2,
  Package,
} from 'lucide-react';
import { EditInvoiceModal } from './EditInvoiceModal';

interface SalesInvoicesListViewProps {
  onNewInvoice: () => void;
  onViewInvoice: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment', partyId?: string) => void;
}

export const SalesInvoicesListView: React.FC<SalesInvoicesListViewProps> = ({
  onNewInvoice,
  onViewInvoice,
  onOpenPaymentModal,
}) => {
  const { invoices, deleteInvoice, openPrintModal } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'recent'>('all');

  // Filter only sales invoices
  const salesInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'sell');
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter(inv => {
      if (currencyFilter !== 'all' && inv.currency !== currencyFilter) return false;
      if (statusFilter !== 'all' && inv.paymentStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchParty = inv.partyName.toLowerCase().includes(q);
        const matchNote = (inv.notes || '').toLowerCase().includes(q);
        const matchItem = inv.items.some(it => it.productName.toLowerCase().includes(q));
        if (!matchNum && !matchParty && !matchNote && !matchItem) return false;
      }

      return true;
    });
  }, [salesInvoices, currencyFilter, statusFilter, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let totalSalesAFN = 0;
    let totalSalesUSD = 0;
    let totalCashAFN = 0;
    let totalCashUSD = 0;
    let totalDebtAFN = 0;
    let totalDebtUSD = 0;

    salesInvoices.forEach(inv => {
      if (inv.currency === 'AFN') {
        totalSalesAFN += inv.totalAmount;
        totalCashAFN += inv.paidAmount;
        totalDebtAFN += inv.balanceAmount;
      } else {
        totalSalesUSD += inv.totalAmount;
        totalCashUSD += inv.paidAmount;
        totalDebtUSD += inv.balanceAmount;
      }
    });

    return {
      totalSalesAFN,
      totalSalesUSD,
      totalCashAFN,
      totalCashUSD,
      totalDebtAFN,
      totalDebtUSD,
      count: salesInvoices.length,
    };
  }, [salesInvoices]);

  const handleDelete = (id: string, invoiceNum: string) => {
    if (window.confirm(`آیا از حذف فاکتور فروش شماره ${invoiceNum} اطمینان دارید؟ موجودی گدام و مانده حساب مشتری به حالت قبل برمی‌گردد.`)) {
      deleteInvoice(id);
    }
  };

  const handlePrint = (inv: Invoice) => {
    openPrintModal({
      type: 'invoice',
      invoice: inv,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">لیست فاکتورهای فروش</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              مدیریت و مشاهده تمامی فاکتورهای فروش صادرشده، تسویه‌های نقدی و مانده طلبات مشتریان
            </p>
          </div>
        </div>

        <button
          id="btn-goto-new-sale-invoice"
          type="button"
          onClick={onNewInvoice}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت فاکتور فروش جدید</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>مجموع ارزش فاکتورهای فروش</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-slate-900 font-mono">
              {formatNumber(metrics.totalSalesAFN)} <span className="text-xs text-slate-500">؋</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-mono">
              ${formatNumber(metrics.totalSalesUSD)} <span className="text-xs text-slate-400">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            تعداد کل فاکتورها: {metrics.count} عدد
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>وصولی نقدی (سر فاکتور)</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-emerald-600 font-mono">
              {formatNumber(metrics.totalCashAFN)} <span className="text-xs text-emerald-700">؋</span>
            </div>
            <div className="text-sm font-bold text-emerald-600 font-mono">
              ${formatNumber(metrics.totalCashUSD)} <span className="text-xs text-emerald-700">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">
            واریز مستقیم به صندوق
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>باقیمانده طلبات (نسیه)</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-amber-600 font-mono">
              {formatNumber(metrics.totalDebtAFN)} <span className="text-xs text-amber-700">؋</span>
            </div>
            <div className="text-sm font-bold text-amber-600 font-mono">
              ${formatNumber(metrics.totalDebtUSD)} <span className="text-xs text-amber-700">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            منتقل شده به حساب مشتریان
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو با شماره فاکتور، نام مشتری یا قلم کالا..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Currency */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setCurrencyFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              همه ارزها
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('AFN')}
              className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'AFN' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              افغانی
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('USD')}
              className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'USD' ? 'bg-white text-emerald-700 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              دالر
            </button>
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">همه وضعیت‌های پرداخت</option>
            <option value="paid">تسویه کامل (نقدی)</option>
            <option value="partial">پرداخت جزئی</option>
            <option value="unpaid">کاملاً نسیه</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600">
                <th className="py-3 px-4">شماره فاکتور</th>
                <th className="py-3 px-4">تاریخ و زمان</th>
                <th className="py-3 px-4">مشتری / خریدار</th>
                <th className="py-3 px-4">اقلام فاکتور</th>
                <th className="py-3 px-4">مبلغ کل</th>
                <th className="py-3 px-4">نقدی دریافتی</th>
                <th className="py-3 px-4">باقیمانده (طلب)</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    فاکتور فروشی با مشخصات انتخاب‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const itemsSummary = inv.items
                    .map(it => `${it.productName} (${formatNumber(it.quantity)} ${it.unit === 'ton' ? 'تن' : 'کیسه'})`)
                    .join('، ');

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        <div>{inv.date}</div>
                        {inv.issueTime && <div className="text-slate-400">{inv.issueTime}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{inv.partyName}</div>
                        {inv.partyPhone && (
                          <div className="text-[10px] font-mono text-slate-400 font-normal">
                            {inv.partyPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 min-w-[200px] max-w-sm">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {inv.items && inv.items.length > 0 ? (
                              inv.items.map((it, itemIdx) => (
                                <span
                                  key={itemIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200/70 text-slate-800 text-[11px] transition-colors"
                                  title={`${it.productName}: ${formatNumber(it.quantity)} ${it.unit === 'ton' ? 'تن' : 'کیسه'}`}
                                >
                                  <Package className="w-3 h-3 text-blue-600 shrink-0" />
                                  <strong className="font-bold text-slate-900">{it.productName}</strong>
                                  <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1 rounded border border-blue-200/60">
                                    {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">بدون اقلام کالا</span>
                            )}
                          </div>
                          {(() => {
                            const totalTons = inv.items?.reduce((s, it) => s + (it.tonsCount || 0), 0) || 0;
                            const totalBags = inv.items?.reduce((s, it) => s + (it.bagsCount || 0), 0) || 0;
                            if (totalTons <= 0 && totalBags <= 0) return null;
                            return (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 font-bold">
                                <span className="text-slate-400">جمع:</span>
                                <span>
                                  {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''}
                                  {totalTons > 0 && totalBags > 0 ? ' • ' : ''}
                                  {totalBags > 0 ? `${formatNumber(totalBags)} کیسه` : ''}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatNumber(inv.totalAmount)} {inv.currency === 'AFN' ? '؋' : '$'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        {formatNumber(inv.paidAmount)} {inv.currency === 'AFN' ? '؋' : '$'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">
                        {inv.balanceAmount > 0 ? (
                          <span>
                            {formatNumber(inv.balanceAmount)} {inv.currency === 'AFN' ? '؋' : '$'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[11px]">تسویه شد</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {inv.paymentStatus === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            تسویه نقدی
                          </span>
                        ) : inv.paymentStatus === 'partial' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            پرداخت جزئی
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            نسیه
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewInvoice(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="مشاهده فاکتور"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="ویرایش مجدد فاکتور"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(inv)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="چاپ فاکتور"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف فاکتور"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Re-edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          isOpen={!!editingInvoice}
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
      )}
    </div>
  );
};
