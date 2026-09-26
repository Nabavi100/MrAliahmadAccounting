import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Unit, StockTransfer } from '../types';
import { formatNumber, getPersianDate, calculateBagsAndTons } from '../utils/formatters';
import { ProductSearchSelector } from './ProductSearchSelector';
import { Repeat, X, ArrowRightLeft, Warehouse as WarehouseIcon } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFromWarehouseId?: string;
  editingTransfer?: StockTransfer | null;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  initialFromWarehouseId,
  editingTransfer,
}) => {
  const {
    warehouses,
    products,
    createStockTransfer,
    updateStockTransfer,
    getProductStock,
    getNextTransferNumber,
  } = useAccounting();

  const [fromWhId, setFromWhId] = useState<string>(initialFromWarehouseId || warehouses[0]?.id || '');
  const [toWhId, setToWhId] = useState<string>(warehouses[1]?.id || warehouses[0]?.id || '');
  const [productId, setProductId] = useState<string>(products[0]?.id || '');
  const [transferNumber, setTransferNumber] = useState<string>(() => getNextTransferNumber());
  const [unit, setUnit] = useState<Unit>('ton');
  const [quantity, setQuantity] = useState<number>(5);
  const [date, setDate] = useState<string>(getPersianDate());
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (editingTransfer) {
      setTransferNumber(editingTransfer.transferNumber);
      setDate(editingTransfer.date);
      setFromWhId(editingTransfer.fromWarehouseId);
      setToWhId(editingTransfer.toWarehouseId);
      setProductId(editingTransfer.productId);
      setUnit(editingTransfer.unit);
      setQuantity(editingTransfer.quantity);
      setDescription(editingTransfer.description || '');
    } else if (isOpen) {
      setTransferNumber(getNextTransferNumber());
      if (initialFromWarehouseId) {
        setFromWhId(initialFromWarehouseId);
        const otherWh = warehouses.find(w => w.id !== initialFromWarehouseId);
        if (otherWh) setToWhId(otherWh.id);
      }
    }
  }, [isOpen, editingTransfer, initialFromWarehouseId, warehouses]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === productId);
  const fromWh = warehouses.find(w => w.id === fromWhId);
  const toWh = warehouses.find(w => w.id === toWhId);

  const availableStock = getProductStock(productId, fromWhId);
  const bagsPerTon = selectedProduct?.bagsPerTon || 20;
  const { bags, tons } = calculateBagsAndTons(quantity, unit, bagsPerTon);

  const isQuantityExceeded =
    !editingTransfer &&
    (unit === 'ton' ? quantity > availableStock.tons : quantity > availableStock.bags);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !fromWh || !toWh || fromWhId === toWhId || quantity <= 0) {
      alert('لطفاً گدام مبدأ و مقصد متفاوتی انتخاب کنید');
      return;
    }

    if (isQuantityExceeded) {
      alert('موجودی گدام مبدأ کافی نیست!');
      return;
    }

    if (editingTransfer) {
      updateStockTransfer({
        ...editingTransfer,
        transferNumber,
        date,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        fromWarehouseId: fromWh.id,
        fromWarehouseName: fromWh.name,
        toWarehouseId: toWh.id,
        toWarehouseName: toWh.name,
        quantity,
        unit,
        bagsCount: bags,
        tonsCount: tons,
        description: description || `انتقال ${formatNumber(tons)} تن (${formatNumber(bags)} کیسه) باربری از ${fromWh.name} به ${toWh.name}`,
      });
    } else {
      createStockTransfer({
        transferNumber,
        date,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        fromWarehouseId: fromWh.id,
        fromWarehouseName: fromWh.name,
        toWarehouseId: toWh.id,
        toWarehouseName: toWh.name,
        quantity,
        unit,
        bagsCount: bags,
        tonsCount: tons,
        description: description || `انتقال ${formatNumber(tons)} تن (${formatNumber(bags)} کیسه) باربری از ${fromWh.name} به ${toWh.name}`,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">انتقال بار بین گدام‌ها</h3>
              <p className="text-xs text-slate-500">جابجایی کالا بین گدام‌های ملکی و امانی</p>
            </div>
          </div>

          <button
            id="transfer-modal-close-btn"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-2xs"
            title="بستن فرم (ESC)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">بستن (ESC)</span>
          </button>
        </div>

        {/* Transfer Number & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                شماره حواله
              </label>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                اتوماتیک
              </span>
            </div>
            <input
              type="text"
              value={transferNumber}
              readOnly
              tabIndex={-1}
              title="شماره حواله کاملاً خودکار توسط سیستم تولید می‌شود"
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-800 tracking-wider cursor-not-allowed select-none shadow-inner"
              placeholder="Trf0001"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ انتقال</label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              required
            />
          </div>
        </div>

        {/* Warehouse Selection Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">گدام مبدأ (کسر بار)</label>
            <select
              value={fromWhId}
              onChange={e => setFromWhId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.type !== 'standard' ? '(امانی)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">گدام مقصد (ورود بار)</label>
            <select
              value={toWhId}
              onChange={e => setToWhId(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              {warehouses
                .filter(w => w.id !== fromWhId)
                .map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.type !== 'standard' ? '(امانی)' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Product selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب کالا (جستجو و تایپ)</label>
          <ProductSearchSelector
            compact
            products={products}
            selectedProductId={productId}
            warehouseId={fromWhId}
            placeholder="جستجو و تایپ نام یا کد کالا..."
            onSelectProduct={(p) => setProductId(p.id)}
            onClear={() => setProductId('')}
          />
        </div>

        {/* Available stock in source indicator */}
        <div className="flex items-center justify-between text-xs px-3 py-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
          <span>موجودی قابل انتقال در گدام مبدا:</span>
          <span className="font-mono font-bold">
            {formatNumber(availableStock.tons)} تن ({formatNumber(availableStock.bags)} کیسه)
          </span>
        </div>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">واحد جابجایی</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as Unit)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value="ton">تن (Ton)</option>
              <option value="bag">کیسه / بوجی (Bag)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مقدار ({unit === 'ton' ? 'تن' : 'کیسه'})
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold text-slate-900 ${
                isQuantityExceeded ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200'
              }`}
              required
            />
          </div>
        </div>

        {/* Calculated preview */}
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs text-blue-900">
          <span>معادل بار جابجا شده:</span>
          <strong className="font-mono font-black text-sm text-blue-800">
            {formatNumber(tons)} تن = {formatNumber(bags)} کیسه
          </strong>
        </div>

        {/* Description & Transport details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            مشخصات باربری / راننده / توضیحات
          </label>
          <input
            type="text"
            placeholder="مثال: لاری باربری اتحاد - راننده حبیب‌الله - بارنامه شماره ۸۷۲"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isQuantityExceeded || fromWhId === toWhId}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            ثبت و اعمال انتقال بار
          </button>
        </div>
      </form>
    </div>
  );
};
