import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Product, ProductCardexMovement, Invoice, StockTransfer } from '../types';
import { formatNumber, formatCurrency, getPersianDate, cleanCardexDescription } from '../utils/formatters';
import { EditInvoiceModal } from './EditInvoiceModal';
import { StockTransferModal } from './StockTransferModal';
import {
  X,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Printer,
  Search,
  Filter,
  Calendar,
  Warehouse as WarehouseIcon,
  Truck,
  Eye,
  Edit2,
  FileText,
} from 'lucide-react';

interface ProductCardexModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInvoice?: (id: string) => void;
}

export const ProductCardexModal: React.FC<ProductCardexModalProps> = ({
  product,
  isOpen,
  onClose,
  onViewInvoice,
}) => {
  const { invoices, transfers, warehouses, products, getProductStock, openPrintModal } = useAccounting();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [movementFilter, setMovementFilter] = useState<'all' | 'buy' | 'sell' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<StockTransfer | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute movements for this product chronologically
  const movements = useMemo(() => {
    if (!product) return [];

    const list: ProductCardexMovement[] = [];

    // 1. Invoices (Buy & Sell)
    invoices.forEach(inv => {
      inv.items.forEach((item, itemIdx) => {
        if (item.productId === product.id) {
          const isBuy = inv.type === 'buy';
          list.push({
            id: `inv-${inv.id}-${item.id || itemIdx}`,
            date: inv.date,
            time: inv.issueTime,
            type: isBuy ? 'buy' : 'sell',
            typeLabel: isBuy ? 'خرید کالا (ورود به گدام)' : 'فروش کالا (خروج از گدام)',
            documentNumber: inv.invoiceNumber,
            invoiceId: inv.id,
            partyName: inv.partyName,
            warehouseId: item.warehouseId || inv.warehouseId,
            warehouseName: item.warehouseName || warehouses.find(w => w.id === (item.warehouseId || inv.warehouseId))?.name || 'گدام مرکزی',
            unit: item.unit,
            inQuantity: isBuy ? item.quantity : 0,
            inBags: isBuy ? item.bagsCount : 0,
            inTons: isBuy ? item.tonsCount : 0,
            outQuantity: !isBuy ? item.quantity : 0,
            outBags: !isBuy ? item.bagsCount : 0,
            outTons: !isBuy ? item.tonsCount : 0,
            unitPrice: item.unitPrice,
            currency: inv.currency,
            totalPrice: item.totalPrice,
            balanceTons: 0, // calculated below
            balanceBags: 0,
            notes: item.description || inv.notes,
          });
        }
      });
    });

    // 2. Stock Transfers
    transfers.forEach(tr => {
      if (tr.productId === product.id) {
        // Transfer Out from fromWarehouse
        list.push({
          id: `tr-out-${tr.id}`,
          date: tr.date,
          time: tr.issueTime,
          type: 'transfer_out',
          typeLabel: `انتقال خروجی به ${tr.toWarehouseName}`,
          documentNumber: tr.transferNumber,
          transferId: tr.id,
          partyName: `انتقال به ${tr.toWarehouseName}`,
          warehouseId: tr.fromWarehouseId,
          warehouseName: tr.fromWarehouseName,
          unit: tr.unit,
          inQuantity: 0,
          inBags: 0,
          inTons: 0,
          outQuantity: tr.quantity,
          outBags: tr.bagsCount,
          outTons: tr.tonsCount,
          unitPrice: 0,
          totalPrice: 0,
          balanceTons: 0,
          balanceBags: 0,
          notes: tr.description,
        });

        // Transfer In to toWarehouse
        list.push({
          id: `tr-in-${tr.id}`,
          date: tr.date,
          time: tr.issueTime,
          type: 'transfer_in',
          typeLabel: `انتقال وارده از ${tr.fromWarehouseName}`,
          documentNumber: tr.transferNumber,
          transferId: tr.id,
          partyName: `انتقال از ${tr.fromWarehouseName}`,
          warehouseId: tr.toWarehouseId,
          warehouseName: tr.toWarehouseName,
          unit: tr.unit,
          inQuantity: tr.quantity,
          inBags: tr.bagsCount,
          inTons: tr.tonsCount,
          outQuantity: 0,
          outBags: 0,
          outTons: 0,
          unitPrice: 0,
          totalPrice: 0,
          balanceTons: 0,
          balanceBags: 0,
          notes: tr.description,
        });
      }
    });

    // Sort chronologically ascending
    list.sort((a, b) => {
      const dateA = `${a.date} ${a.time || '00:00'}`;
      const dateB = `${b.date} ${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    // Calculate running balance
    let currentTons = 0;
    let currentBags = 0;
    list.forEach(item => {
      currentTons += (item.inTons - item.outTons);
      currentBags += (item.inBags - item.outBags);
      item.balanceTons = Number(currentTons.toFixed(3));
      item.balanceBags = Math.round(currentBags);
    });

    return list;
  }, [product, invoices, transfers, warehouses]);

  if (!isOpen || !product) return null;

  // Filtered movements
  const filteredMovements = movements.filter(m => {
    if (selectedWarehouseId !== 'all' && m.warehouseId !== selectedWarehouseId) {
      return false;
    }
    if (movementFilter === 'buy' && m.type !== 'buy') return false;
    if (movementFilter === 'sell' && m.type !== 'sell') return false;
    if (movementFilter === 'transfer' && m.type !== 'transfer_in' && m.type !== 'transfer_out') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.documentNumber.toLowerCase().includes(q) ||
        (m.partyName && m.partyName.toLowerCase().includes(q)) ||
        m.warehouseName.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const currentProductStock = getProductStock(
    product.id,
    selectedWarehouseId !== 'all' ? selectedWarehouseId : undefined
  );

  const totalInTons = filteredMovements.reduce((sum, m) => sum + m.inTons, 0);
  const totalInBags = filteredMovements.reduce((sum, m) => sum + m.inBags, 0);
  const totalOutTons = filteredMovements.reduce((sum, m) => sum + m.outTons, 0);
  const totalOutBags = filteredMovements.reduce((sum, m) => sum + m.outBags, 0);

  const handlePrintCardex = () => {
    if (!product) return;
    openPrintModal({
      type: 'product_cardex',
      product,
      productMovements: filteredMovements,
      title: `کارتکس رسمی گردش کالا: ${product.name}`,
      subtitle: `گدام: ${selectedWarehouseId === 'all' ? 'همه گدام‌ها' : warehouses.find(w => w.id === selectedWarehouseId)?.name || ''} • تاریخ: ${getPersianDate()}`,
      metadata: [
        { label: 'نام جنس', value: product.name },
        { label: 'کد کالا', value: product.code || '---' },
        { label: 'دسته‌بندی', value: product.category || 'سیمان' },
        { label: 'وزن هر پاکت', value: `${product.bagWeightKg || 50} کیلوگرم` },
        { label: 'ضریب تبدیل', value: `${product.bagsPerTon || 20} کیسه در تن` },
      ],
      summaryCards: [
        { label: 'موجودی کل (تن)', value: `${formatNumber(currentProductStock.tons)} تن`, color: 'blue' },
        { label: 'موجودی کل (کیسه)', value: `${formatNumber(currentProductStock.bags)} کیسه`, color: 'emerald' },
        { label: 'ورودی دوره (تن)', value: `${formatNumber(totalInTons)} تن`, color: 'indigo' },
        { label: 'خروجی دوره (تن)', value: `${formatNumber(totalOutTons)} تن`, color: 'rose' },
      ],
    });
  };

  return (
    <div
      id="product-cardex-modal-backdrop"
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="product-cardex-modal-container"
        className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  کارتکس گردش و تراکنش‌های کالا: {product.name}
                </h3>
                <span className="text-xs font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10">
                  کد: {product.code}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                وزن هر بوجی: {product.bagWeightKg} کیلوگرم (هر {product.bagsPerTon} بوجی = ۱ تن) • دسته‌بندی: {product.category}
              </p>
            </div>
          </div>

          {/* Prominent Standardized Close Button */}
          <button
            id="product-cardex-modal-close-btn"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl transition border border-white/15 hover:border-rose-500 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-xs"
            title="بستن فرم (ESC)"
          >
            <X className="w-4 h-4" />
            <span>بستن (ESC)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">موجودی فعلی در گدام:</span>
              <div className="text-lg font-black text-emerald-600 font-mono mt-1">
                {formatNumber(currentProductStock.tons)} تن
              </div>
              <div className="text-xs text-slate-600 font-mono">
                {formatNumber(currentProductStock.bags)} بوجی (کیسه)
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-600 block">مجموع کل وارده / خرید:</span>
              <div className="text-lg font-black text-blue-700 font-mono mt-1">
                {formatNumber(totalInTons)} تن
              </div>
              <div className="text-xs text-slate-600 font-mono">
                {formatNumber(totalInBags)} بوجی
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-600 block">مجموع کل صادره / فروش:</span>
              <div className="text-lg font-black text-rose-700 font-mono mt-1">
                {formatNumber(totalOutTons)} تن
              </div>
              <div className="text-xs text-slate-600 font-mono">
                {formatNumber(totalOutBags)} بوجی
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">نرخ‌های مصوب:</span>
              <div className="text-xs text-slate-700 font-mono font-bold mt-1">
                فروش: {formatCurrency(product.sellPriceAFN, 'AFN')} / {formatCurrency(product.sellPriceUSD, 'USD')}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                خرید: {formatCurrency(product.buyPriceAFN, 'AFN')} / {formatCurrency(product.buyPriceUSD, 'USD')}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی سند، خریدار/فروشنده یا موتر..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 w-56"
                />
              </div>

              {/* Warehouse selector */}
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه گدام‌ها</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {/* Movement Type Filter */}
              <select
                value={movementFilter}
                onChange={e => setMovementFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه تراکنش‌ها ({movements.length})</option>
                <option value="buy">فقط خرید و ورود (وارده)</option>
                <option value="sell">فقط فروش و خروج (صادره)</option>
                <option value="transfer">فقط انتقالات بین گدام‌ها</option>
              </select>
            </div>

            <button
              onClick={handlePrintCardex}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>چاپ کارتکس</span>
            </button>
          </div>

          {/* Cardex Movement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">تاریخ و ساعت</th>
                    <th className="py-3 px-3">نوع عملیات</th>
                    <th className="py-3 px-3">شماره سند / فاکتور</th>
                    <th className="py-3 px-3">طرف حساب / شرح</th>
                    <th className="py-3 px-3">گدام</th>
                    <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900">وارده (تن/کیسه)</th>
                    <th className="py-3 px-3 text-center bg-rose-50/50 text-rose-900">صادره (تن/کیسه)</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-900">مانده موجودی</th>
                    <th className="py-3 px-3 text-left">مبلغ و نرخ</th>
                    <th className="py-3 px-3 text-center w-24">اقدامات و ویرایش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        هیچ تراکنش یا گردش کالایی با این فیلتر ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 font-mono">{m.date}</div>
                          {m.time && <div className="text-[10px] text-slate-400 font-mono">{m.time}</div>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {m.type === 'buy' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>خرید (ورود)</span>
                            </span>
                          )}
                          {m.type === 'sell' && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>فروش (خروج)</span>
                            </span>
                          )}
                          {m.type === 'transfer_in' && (
                            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              <span>انتقال وارده</span>
                            </span>
                          )}
                          {m.type === 'transfer_out' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              <span>انتقال صادره</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {m.documentNumber}
                        </td>
                        <td className="py-3 px-3 max-w-[170px]" title={m.notes || ''}>
                          <div className="font-bold text-slate-900 truncate">{m.partyName || '-'}</div>
                          {m.notes && (
                            <div className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 truncate block">
                              {cleanCardexDescription(m.notes, 28)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {m.warehouseName}
                        </td>
                        {/* Inward */}
                        <td className="py-3 px-3 text-center bg-blue-50/30 font-mono">
                          {m.inTons > 0 ? (
                            <div>
                              <span className="font-bold text-blue-700 text-xs">+{formatNumber(m.inTons)} تن</span>
                              <div className="text-[10px] text-slate-500">({formatNumber(m.inBags)} بوجی)</div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        {/* Outward */}
                        <td className="py-3 px-3 text-center bg-rose-50/30 font-mono">
                          {m.outTons > 0 ? (
                            <div>
                              <span className="font-bold text-rose-700 text-xs">-{formatNumber(m.outTons)} تن</span>
                              <div className="text-[10px] text-slate-500">({formatNumber(m.outBags)} بوجی)</div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        {/* Balance */}
                        <td className="py-3 px-3 text-center bg-emerald-50/30 font-mono font-black text-emerald-800">
                          <div>
                            <span>{formatNumber(m.balanceTons)} تن</span>
                            <div className="text-[10px] font-normal text-emerald-600">({formatNumber(m.balanceBags)} بوجی)</div>
                          </div>
                        </td>
                        {/* Pricing */}
                        <td className="py-3 px-3 text-left font-mono">
                          {m.unitPrice > 0 ? (
                            <div>
                              <span className="text-slate-800 font-bold text-xs">
                                {formatCurrency(m.totalPrice, m.currency || 'USD')}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                فی: {formatCurrency(m.unitPrice, m.currency || 'USD')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">حواله انبار</span>
                          )}
                        </td>
                        {/* Action View & Edit */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {m.invoiceId && (
                              <>
                                {onViewInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onViewInvoice(m.invoiceId!);
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                    title="مشاهده فاکتور"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetInv = invoices.find(inv => inv.id === m.invoiceId);
                                    if (targetInv) setEditingInvoice(targetInv);
                                  }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="ویرایش مجدد فاکتور"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {m.transferId && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trf = transfers.find(t => t.id === m.transferId);
                                    if (trf) openPrintModal({ type: 'stock_transfer', stockTransfer: trf });
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="چاپ حواله انتقال"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trf = transfers.find(t => t.id === m.transferId);
                                    if (trf) setEditingTransfer(trf);
                                  }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="ویرایش مجدد حواله انتقال"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!m.invoiceId && !m.transferId && <span className="text-slate-300">-</span>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            تعداد رکوردها: {filteredMovements.length} تراکنش
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
          >
            بستن فرم (ESC)
          </button>
        </div>
      </div>

      {/* Edit Invoice Modal from Cardex */}
      <EditInvoiceModal
        isOpen={!!editingInvoice}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
      />

      {/* Edit Stock Transfer Modal from Cardex */}
      <StockTransferModal
        isOpen={!!editingTransfer}
        editingTransfer={editingTransfer}
        onClose={() => setEditingTransfer(null)}
      />
    </div>
  );
};
