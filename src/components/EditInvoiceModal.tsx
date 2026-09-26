import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Invoice, InvoiceItem, Currency, Unit, InvoiceType, CashRegisterType } from '../types';
import { formatNumber, formatCurrency, getPersianDate, calculateBagsAndTons } from '../utils/formatters';
import { PartySearchSelector } from './PartySearchSelector';
import { ProductSearchSelector } from './ProductSearchSelector';
import {
  X,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Building,
  Package,
  Wallet,
  DollarSign,
  Calendar,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  ArrowLeftRight,
} from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedInvoice: Invoice) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  const {
    products,
    warehouses,
    parties,
    cashAccounts,
    currencies,
    cashRegister,
    notify,
    updateInvoice,
    getProductStock,
  } = useAccounting();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sell');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [issueTime, setIssueTime] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegisterType>('afn_cash');

  // Item row input form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemWarehouseId, setItemWarehouseId] = useState('');
  const [unit, setUnit] = useState<Unit>('ton');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [itemDescription, setItemDescription] = useState('');

  // Populate form when invoice is passed
  useEffect(() => {
    if (invoice) {
      setInvoiceType(invoice.type);
      setInvoiceNumber(invoice.invoiceNumber);
      setInvoiceDate(invoice.date);
      setIssueTime(invoice.issueTime || '');
      setSelectedPartyId(invoice.partyId);
      setSelectedWarehouseId(invoice.warehouseId || warehouses[0]?.id || '');
      setCurrency(invoice.currency);
      setNotes(invoice.notes || '');
      setItems([...invoice.items]);
      setDiscount(invoice.discount || 0);
      setPaidAmount(invoice.paidAmount || 0);
      setSelectedCashRegister(
        invoice.cashRegister || invoice.cashRegisterId || (invoice.currency === 'USD' ? 'usd_cash' : 'afn_cash')
      );

      if (products.length > 0) {
        setSelectedProductId(products[0].id);
        setUnitPrice(invoice.type === 'sell' ? (products[0].sellPriceAFN || products[0].priceAFN || 0) : (products[0].buyPriceAFN || 0));
      }
      setItemWarehouseId(invoice.warehouseId || warehouses[0]?.id || '');
    }
  }, [invoice, isOpen, warehouses, products]);

  // Update default item price when product or currency changes
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      if (currency === 'AFN') {
        setUnitPrice(invoiceType === 'sell' ? (prod.sellPriceAFN || prod.priceAFN || 0) : (prod.buyPriceAFN || 0));
      } else {
        setUnitPrice(invoiceType === 'sell' ? (prod.sellPriceUSD || prod.priceUSD || 0) : (prod.buyPriceUSD || 0));
      }
    }
  };

  // Add Item to Invoice
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === selectedProductId);
    if (!product || quantity <= 0 || unitPrice < 0) return;

    const { bags, tons } = calculateBagsAndTons(quantity, unit, product.bagsPerTon);
    const totalPrice = quantity * unitPrice;
    const targetWh = warehouses.find(w => w.id === (itemWarehouseId || selectedWarehouseId));

    const newItem: InvoiceItem = {
      id: 'item-' + Date.now(),
      productId: product.id,
      productName: product.name,
      warehouseId: targetWh?.id || selectedWarehouseId,
      warehouseName: targetWh?.name || 'گدام مرکزی',
      description: itemDescription,
      unit,
      quantity,
      bagsCount: bags,
      tonsCount: tons,
      unitPrice,
      currency,
      totalPrice,
    };

    setItems(prev => [...prev, newItem]);
    setItemDescription('');
    setQuantity(1);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Instantaneous currency conversion between USD and AFN
  const handleToggleCurrency = () => {
    const usdCurrencyDef = currencies.find(c => c.code === 'USD');
    const systemRate = usdCurrencyDef?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65;
    if (systemRate <= 0) return;

    if (currency === 'USD') {
      // USD -> AFN
      setCurrency('AFN');
      setItems(prev =>
        prev.map(it => {
          const newUnitPrice = Math.round((it.unitPrice || 0) * systemRate * 100) / 100;
          const newTotalPrice = Math.round((it.quantity || 0) * newUnitPrice * 100) / 100;
          return {
            ...it,
            currency: 'AFN',
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );
      if (unitPrice > 0) setUnitPrice(Math.round(unitPrice * systemRate * 100) / 100);
      if (discount > 0) setDiscount(Math.round(discount * systemRate * 100) / 100);
      if (paidAmount > 0) setPaidAmount(Math.round(paidAmount * systemRate * 100) / 100);
      setSelectedCashRegister('afn_cash');

      notify('info', 'تغییر ارز به افغانی (؋)', `کلیه اقلام و مبالغ فاکتور با نرخ روز (۱ دلار = ${formatNumber(systemRate)} افغانی) به افغانی تبدیل شدند.`);
    } else {
      // AFN -> USD
      setCurrency('USD');
      setItems(prev =>
        prev.map(it => {
          const newUnitPrice = Number(((it.unitPrice || 0) / systemRate).toFixed(2));
          const newTotalPrice = Number(((it.quantity || 0) * newUnitPrice).toFixed(2));
          return {
            ...it,
            currency: 'USD',
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );
      if (unitPrice > 0) setUnitPrice(Number((unitPrice / systemRate).toFixed(2)));
      if (discount > 0) setDiscount(Number((discount / systemRate).toFixed(2)));
      if (paidAmount > 0) setPaidAmount(Number((paidAmount / systemRate).toFixed(2)));
      setSelectedCashRegister('usd_cash');

      notify('info', 'تغییر ارز به دلار ($)', `کلیه اقلام و مبالغ فاکتور با نرخ روز (۱ دلار = ${formatNumber(systemRate)} افغانی) به دلار تبدیل شدند.`);
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus =
    paidAmount >= totalAmount && totalAmount > 0
      ? 'paid'
      : paidAmount > 0
      ? 'partial'
      : 'unpaid';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (items.length === 0) {
      alert('حداقل باید یک قلم کالا در فاکتور وجود داشته باشد.');
      return;
    }
    if (!selectedPartyId) {
      alert('لطفاً طرف حساب (مشتری یا فروشنده) را مشخص کنید.');
      return;
    }

    const party = parties.find(p => p.id === selectedPartyId);
    const updatedInvoice: Invoice = {
      ...invoice,
      type: invoiceType,
      invoiceNumber: invoiceNumber.trim() || invoice.invoiceNumber,
      date: invoiceDate,
      issueTime,
      partyId: selectedPartyId,
      partyName: party?.name || invoice.partyName,
      partyPhone: party?.phone || invoice.partyPhone,
      partyAddress: party?.address || invoice.partyAddress,
      partyGroupName: party?.groupName || invoice.partyGroupName,
      warehouseId: selectedWarehouseId,
      currency,
      items,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus,
      cashRegister: selectedCashRegister,
      cashRegisterId: selectedCashRegister,
      notes,
    };

    updateInvoice(updatedInvoice);
    if (onSaved) onSaved(updatedInvoice);
    onClose();
  };

  if (!isOpen || !invoice) return null;

  const isSale = invoiceType === 'sell';
  const party = parties.find(p => p.id === selectedPartyId);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[999] overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-4">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${
                isSale ? 'bg-rose-600' : 'bg-blue-600'
              }`}
            >
              {isSale ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {isSale ? 'ویرایش و اصلاح فاکتور فروش' : 'ویرایش و اصلاح فاکتور خرید'}
                </h3>
                <span className="text-xs font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-slate-200">
                  #{invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تغییرات به صورت خودکار در انبار، مانده حساب شخص و صندوق بازمحاسبه خواهد شد.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Top Form Grid */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره فاکتور</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ سند (شمسی)</label>
              <div className="relative">
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Party Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isSale ? 'مشتری / خریدار' : 'تأمین‌کننده / فروشنده'}
              </label>
              <PartySearchSelector
                parties={parties}
                selectedPartyId={selectedPartyId}
                onSelect={(id) => setSelectedPartyId(id)}
                partyType={isSale ? 'customer' : 'supplier'}
              />
            </div>

            {/* Default Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">گدام پیش‌فرض</label>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.type !== 'standard' ? '(امانی)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">ارز فاکتور</label>
                <button
                  type="button"
                  id="btn-toggle-currency-edit-modal"
                  onClick={handleToggleCurrency}
                  title={`تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ روز سیستم ($۱ = ${formatNumber(currencies?.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
                  className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 cursor-pointer active:scale-95 transition"
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  <span>تغییر ارز</span>
                </button>
              </div>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {currencies && currencies.length > 0 ? (
                  currencies.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="AFN">افغانی (AFN)</option>
                    <option value="USD">دالر آمریکایی (USD)</option>
                  </>
                )}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و یادداشت</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="توضیحات تکمیلی، شرایط تسویه، شماره موتر و..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Add / Edit Items Section */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>اقلام فاکتور ({items.length} ردیف)</span>
              </h4>
            </div>

            {/* Inline Add Item Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">کالا (انتخاب با تایپ و جستجو)</label>
                <ProductSearchSelector
                  compact
                  products={products}
                  selectedProductId={selectedProductId}
                  warehouseId={itemWarehouseId || selectedWarehouseId}
                  currency={currency}
                  priceType={invoiceType}
                  placeholder="جستجو و تایپ نام یا کد کالا..."
                  onSelectProduct={(p) => handleProductChange(p.id)}
                  onClear={() => {
                    setSelectedProductId('');
                    setUnitPrice(0);
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">واحد</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as Unit)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                >
                  <option value="ton">تُن (Ton)</option>
                  <option value="bag">کیسه / بوجی (Bag)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">مقدار / تعداد</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={quantity || ''}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  قیمت فی ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitPrice || ''}
                  onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold font-mono text-blue-700"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن قلم</span>
                </button>
              </div>
            </div>

            {/* Items Table */}
            {items.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">شرح کالا</th>
                      <th className="p-3">گدام</th>
                      <th className="p-3 text-center">مقدار</th>
                      <th className="p-3 text-center">معادل کیسه/تن</th>
                      <th className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>قیمت فی</span>
                          <button
                            type="button"
                            onClick={handleToggleCurrency}
                            title="تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی"
                            className="px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-100 hover:bg-blue-200 text-blue-900 transition flex items-center gap-0.5 cursor-pointer border border-blue-200 shadow-2xs active:scale-95"
                          >
                            <ArrowLeftRight className="w-2 h-2" />
                            <span>تغییر ارز</span>
                          </button>
                        </div>
                      </th>
                      <th className="p-3 text-center">مبلغ کل ({currency})</th>
                      <th className="p-3 text-center w-16">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{it.productName}</td>
                        <td className="p-3 text-slate-600">{it.warehouseName}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">
                          {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {formatNumber(it.bagsCount)} کیسه ({formatNumber(it.tonsCount)} تن)
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700">
                          {formatNumber(it.unitPrice)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-blue-700">
                          {formatCurrency(it.totalPrice, currency)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="حذف این قلم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                هیچ کالایی به این فاکتور اضافه نشده است.
              </div>
            )}
          </div>

          {/* Payment, Discount & Final Calculation */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ تخفیف ({currency})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount || ''}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-bold font-mono text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ پرداخت نقدی ({currency})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={paidAmount || ''}
                onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-bold font-mono text-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">صندوق واریز / برداشت نقدی</label>
              <select
                value={selectedCashRegister}
                onChange={e => setSelectedCashRegister(e.target.value as CashRegisterType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {cashAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick summary box */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-center">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>مبلغ نهایی فاکتور:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>باقیمانده (قرضه/طلب):</span>
                <span className={`font-mono font-bold ${balanceAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatCurrency(balanceAmount, currency)}
                </span>
              </div>
              {(() => {
                const party = parties.find(p => p.id === selectedPartyId);
                if (!party) return null;
                const partyBal = currency === 'AFN' ? party.balanceAFN : party.balanceUSD;
                return (
                  <div className="pt-2 mt-2 border-t border-slate-700 text-[11px] flex justify-between items-center">
                    <span className="text-slate-400">الباقی کل حساب شخص:</span>
                    <span className={`font-mono font-black ${partyBal < 0 ? 'text-rose-400' : partyBal > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {Math.abs(partyBal).toLocaleString()} {currency}{' '}
                      <span className="text-[10px] font-sans">
                        {partyBal < 0 ? '(قرضدار)' : partyBal > 0 ? '(طلبکار)' : '(تسویه کامل)'}
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer hover:scale-102 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات و بازمحاسبه فاکتور</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
