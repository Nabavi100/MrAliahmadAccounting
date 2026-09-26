import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, Invoice, PaymentStatus } from '../types';
import { formatNumber, formatCurrency } from '../utils/formatters';
import {
  Building2,
  Plus,
  Search,
  Printer,
  Eye,
  Trash2,
  Calendar,
  Filter,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  Warehouse as WarehouseIcon,
  Edit2,
  Package,
} from 'lucide-react';
import { EditInvoiceModal } from './EditInvoiceModal';

interface PurchaseInvoicesListViewProps {
  onNewPurchase: () => void;
  onViewInvoice: (id: string) => void;
  onOpenPaymentModal?: (type: 'make_payment', partyId?: string) => void;
}

export const PurchaseInvoicesListView: React.FC<PurchaseInvoicesListViewProps> = ({
  onNewPurchase,
  onViewInvoice,
  onOpenPaymentModal,
}) => {
  const { invoices, deleteInvoice, openPrintModal } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Filter only purchase invoices
  const purchaseInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'buy');
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
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
  }, [purchaseInvoices, currencyFilter, statusFilter, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let totalPurchasesAFN = 0;
    let totalPurchasesUSD = 0;
    let totalPaidAFN = 0;
    let totalPaidUSD = 0;
    let totalPayableAFN = 0;
    let totalPayableUSD = 0;

    purchaseInvoices.forEach(inv => {
      if (inv.currency === 'AFN') {
        totalPurchasesAFN += inv.totalAmount;
        totalPaidAFN += inv.paidAmount;
        totalPayableAFN += inv.balanceAmount;
      } else {
        totalPurchasesUSD += inv.totalAmount;
        totalPaidUSD += inv.paidAmount;
        totalPayableUSD += inv.balanceAmount;
      }
    });

    return {
      totalPurchasesAFN,
      totalPurchasesUSD,
      totalPaidAFN,
      totalPaidUSD,
      totalPayableAFN,
      totalPayableUSD,
      count: purchaseInvoices.length,
    };
  }, [purchaseInvoices]);

  const handleDelete = (id: string, invoiceNum: string) => {
    if (window.confirm(`آیا از حذف فاکتور خرید شماره ${invoiceNum} اطمینان دارید؟ اقلام واردشده از گدام کسر و بدهی به فروشنده تعدیل خواهد شد.`)) {
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
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">لیست فاکتورهای خرید</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              مدیریت و مشاهده تمامی فاکتورهای خرید کالا، ورود اجناس به گدام‌ها و بدهی به تأمین‌کنندگان
            </p>
          </div>
        </div>

        <button
          id="btn-goto-new-purchase-invoice"
          type="button"
          onClick={onNewPurchase}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت فاکتور خرید جدید</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Purchases */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>مجموع خریدها (ورود به گدام)</span>
            <TrendingDown className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-slate-900 font-mono">
              {formatNumber(metrics.totalPurchasesAFN)} <span className="text-xs text-slate-500">؋</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-mono">
              ${formatNumber(metrics.totalPurchasesUSD)} <span className="text-xs text-slate-400">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            تعداد کل فاکتورها: {metrics.count} عدد
          </div>
        </div>

        {/* Cash Paid to Suppliers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>پرداخت نقدی به فروشنده</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-slate-900 font-mono">
              {formatNumber(metrics.totalPaidAFN)} <span className="text-xs text-slate-500">؋</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-mono">
              ${formatNumber(metrics.totalPaidUSD)} <span className="text-xs text-slate-400">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            کسر شده از صندوق پولی
          </div>
        </div>

        {/* Outstanding Payables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
            <span>باقیمانده بدهی ما به تأمین‌کننده</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <div className="text-lg font-black text-amber-600 font-mono">
              {formatNumber(metrics.totalPayableAFN)} <span className="text-xs text-amber-700">؋</span>
            </div>
            <div className="text-sm font-bold text-amber-600 font-mono">
              ${formatNumber(metrics.totalPayableUSD)} <span className="text-xs text-amber-700">دالر</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            ثبت در حساب طلبکاران
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
            placeholder="جستجو با شماره خرید، نام تأمین‌کننده یا کالا..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
              className={`px-3 py-1 rounded-lg transition ${currencyFilter === 'AFN' ? 'bg-white text-indigo-700 shadow-2xs' : 'hover:text-slate-900'}`}
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

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">همه وضعیت‌های تسویه</option>
            <option value="paid">تسویه شده نقدی</option>
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
                <th className="py-3 px-4">شماره خرید</th>
                <th className="py-3 px-4">تاریخ</th>
                <th className="py-3 px-4">تأمین‌کننده / فروشنده</th>
                <th className="py-3 px-4">اقلام و مشخصات</th>
                <th className="py-3 px-4">مبلغ کل خرید</th>
                <th className="py-3 px-4">پرداخت نقدی</th>
                <th className="py-3 px-4">باقیمانده بدهی</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    فاکتور خریدی با مشخصات انتخاب‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const itemsSummary = inv.items
                    .map(it => `${it.productName} (${formatNumber(it.quantity)} ${it.unit === 'ton' ? 'تن' : 'کیسه'})`)
                    .join('، ');

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
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
                                  <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <strong className="font-bold text-slate-900">{it.productName}</strong>
                                  <span className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1 rounded border border-indigo-200/60">
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
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
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
