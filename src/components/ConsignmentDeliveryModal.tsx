import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { formatNumber, getPersianDate, calculateBagsAndTons } from '../utils/formatters';
import {
  X,
  ShieldCheck,
  Truck,
  FileText,
  Printer,
  Calendar,
  User,
  Box,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
} from 'lucide-react';

interface ConsignmentDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartyId?: string;
  initialPartyName?: string;
  initialWarehouseId?: string;
}

export const ConsignmentDeliveryModal: React.FC<ConsignmentDeliveryModalProps> = ({
  isOpen,
  onClose,
  initialPartyId,
  initialPartyName,
  initialWarehouseId,
}) => {
  const {
    parties,
    warehouses,
    products,
    consignmentMovements,
    createConsignmentMovement,
    getCustomerConsignmentBalances,
    getNextConsignmentDocNumber,
    openPrintModal,
  } = useAccounting();

  // All consignment balances per customer
  const customerBalances = useMemo(() => {
    return getCustomerConsignmentBalances();
  }, [consignmentMovements]);

  // Customers that have or had consignment balances
  const consignmentCustomers = useMemo(() => {
    // Unique list of customers from balances
    const names = new Set<string>();
    const list: { id: string; name: string; phone?: string; remainingTons: number }[] = [];
    customerBalances.forEach(cb => {
      if (!names.has(cb.partyName)) {
        names.add(cb.partyName);
        list.push({
          id: cb.partyId,
          name: cb.partyName,
          phone: cb.partyPhone,
          remainingTons: cb.remainingTons,
        });
      }
    });
    // Also include other customers in parties list in case manual deposit is made
    parties.forEach(p => {
      if (!names.has(p.name)) {
        names.add(p.name);
        list.push({
          id: p.id,
          name: p.name,
          phone: p.phone,
          remainingTons: 0,
        });
      }
    });
    return list;
  }, [customerBalances, parties]);

  const [selectedPartyName, setSelectedPartyName] = useState<string>(() => {
    return initialPartyName || consignmentCustomers[0]?.name || '';
  });

  const selectedPartyInfo = useMemo(() => {
    return parties.find(p => p.name === selectedPartyName || p.id === initialPartyId);
  }, [parties, selectedPartyName, initialPartyId]);

  const selectedCustomerBalance = useMemo(() => {
    return customerBalances.find(cb => cb.partyName === selectedPartyName);
  }, [customerBalances, selectedPartyName]);

  // Consignment warehouses
  const consignmentWarehouses = useMemo(() => {
    const list = warehouses.filter(w => w.type !== 'standard' || w.id === 'wh-2' || w.name.includes('امانی'));
    return list.length > 0 ? list : warehouses;
  }, [warehouses]);

  const [warehouseId, setWarehouseId] = useState<string>(() => {
    return initialWarehouseId || consignmentWarehouses[0]?.id || warehouses[0]?.id || '';
  });

  const [docNumber, setDocNumber] = useState<string>(() => getNextConsignmentDocNumber());
  const [date, setDate] = useState<string>(getPersianDate());
  const [issueTime, setIssueTime] = useState<string>('11:00');

  // Products available for this customer
  const availableProducts = useMemo(() => {
    if (!selectedCustomerBalance) return [];
    return selectedCustomerBalance.products.filter(p => p.remainingTons > 0);
  }, [selectedCustomerBalance]);

  const [productId, setProductId] = useState<string>('');
  const [unit, setUnit] = useState<'ton' | 'bag'>('ton');
  const [quantity, setQuantity] = useState<number>(1);
  const [driverName, setDriverName] = useState<string>('');
  const [carPlate, setCarPlate] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Update selected product when customer changes
  useEffect(() => {
    if (availableProducts.length > 0) {
      setProductId(availableProducts[0].productId);
    } else {
      setProductId('');
    }
  }, [selectedPartyName, availableProducts]);

  // Sync initial props
  useEffect(() => {
    if (initialPartyName) {
      setSelectedPartyName(initialPartyName);
    }
    if (initialWarehouseId) {
      setWarehouseId(initialWarehouseId);
    }
    if (isOpen) {
      setDocNumber(getNextConsignmentDocNumber());
      setDate(getPersianDate());
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setIssueTime(`${h}:${m}`);
    }
  }, [isOpen, initialPartyName, initialWarehouseId]);

  // Active product details
  const activeProduct = products.find(p => p.id === productId);
  const activeProdBalance = selectedCustomerBalance?.products.find(p => p.productId === productId);
  const maxAvailableTons = activeProdBalance ? activeProdBalance.remainingTons : 0;
  const maxAvailableBags = activeProdBalance ? activeProdBalance.remainingBags : 0;

  const bagsPerTon = activeProduct?.bagsPerTon || 20;
  const { bags, tons } = calculateBagsAndTons(quantity, unit, bagsPerTon);

  const isExceeded = unit === 'ton' ? tons > maxAvailableTons : bags > maxAvailableBags;

  const handleSubmit = (shouldPrint: boolean) => {
    setError('');

    if (!selectedPartyName.trim()) {
      setError('لطفاً نام مشتری را انتخاب فرمایید.');
      return;
    }

    if (!productId) {
      setError('این مشتری کالای امانی دارای موجودی در گدام ندارد.');
      return;
    }

    if (quantity <= 0) {
      setError('لطفاً مقدار معتبر وارد نمایید.');
      return;
    }

    if (isExceeded) {
      setError(`مقدار درخواستی (${formatNumber(tons)} تن) بیشتر از مانده موجودی این مشتری (${formatNumber(maxAvailableTons)} تن) است!`);
      return;
    }

    const wh = warehouses.find(w => w.id === warehouseId);
    const prod = products.find(p => p.id === productId);

    const movement = createConsignmentMovement({
      partyId: selectedPartyInfo?.id || selectedPartyName,
      partyName: selectedPartyName,
      partyPhone: selectedPartyInfo?.phone || selectedCustomerBalance?.partyPhone,
      warehouseId,
      warehouseName: wh?.name || 'گدام امانی',
      productId,
      productName: prod?.name || activeProdBalance?.productName || 'کالا',
      date,
      issueTime,
      type: 'withdrawal',
      documentType: 'delivery_slip',
      documentNumber: docNumber,
      quantityTons: tons,
      quantityBags: bags,
      driverName: driverName.trim() || undefined,
      carPlate: carPlate.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      receiverName: receiverName.trim() || selectedPartyName,
      destination: destination.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (shouldPrint) {
      openPrintModal({
        type: 'consignment_delivery_slip',
        consignmentDelivery: movement,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  ثبت سند خروجی و تحویل بار از گدام امانی
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  حواله ترخیص امانی
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                کسر از موجودی امانی مشتری و صدور برگه رسمی تحویل به موتروان (سایز استاندارد A4)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <X className="w-4 h-4" />
            <span>بستن</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Document Number & Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>شماره سند خروجی</span>
              </label>
              <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                اتوماتیک
              </span>
            </div>
            <input
              type="text"
              value={docNumber}
              readOnly
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-900 text-center cursor-not-allowed select-none shadow-inner"
              title="شماره سند به صورت کاملاً اتوماتیک صادر می‌شود"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>تاریخ تحویل (شمسی)</span>
            </label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 text-center outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>ساعت بارگیری</span>
            </label>
            <input
              type="text"
              value={issueTime}
              onChange={e => setIssueTime(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 text-center outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Customer & Warehouse Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>مشتری امانت‌گذار (صاحب بار)</span>
            </label>
            <select
              value={selectedPartyName}
              onChange={e => setSelectedPartyName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
            >
              {consignmentCustomers.map(c => (
                <option key={c.id + c.name} value={c.name}>
                  {c.name} {c.remainingTons > 0 ? `(مانده: ${formatNumber(c.remainingTons)} تن)` : '(بدون مانده فعلی)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <span className="text-red-500">*</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>گدام امانی مبدأ</span>
            </label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
            >
              {consignmentWarehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.location ? `(${w.location})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Current Stock Status Banner */}
        {selectedCustomerBalance && (
          <div className="p-3 bg-amber-50/70 border border-amber-300/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-amber-950">
                وضعیت حساب امانی مشتری: «{selectedPartyName}»
              </span>
              <span className="font-mono font-black text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                کل مانده: {formatNumber(selectedCustomerBalance.remainingTons)} تن ({formatNumber(selectedCustomerBalance.remainingBags)} کیسه)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              {selectedCustomerBalance.products.map(p => (
                <div
                  key={p.productId}
                  onClick={() => setProductId(p.productId)}
                  className={`px-2.5 py-1.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                    productId === p.productId
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white text-slate-800 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span className="font-bold">{p.productName}:</span>
                  <span className="font-mono font-black">
                    مانده: {formatNumber(p.remainingTons)} تن
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product & Quantity Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              کالای امانی جهت تحویل *
            </label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
            >
              {availableProducts.length === 0 ? (
                <option value="">هیچ کالایی دارای موجودی نیست</option>
              ) : (
                availableProducts.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} (موجود: {formatNumber(p.remainingTons)} تن)
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              مقدار تحویل داده شده *
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0.001"
                step="any"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-mono font-black text-slate-900 outline-none text-center ${
                  isExceeded ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-amber-500'
                }`}
              />
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as 'ton' | 'bag')}
                className="w-20 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ton">تن</option>
                <option value="bag">کیسه</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              معادل تن و کیسه
            </label>
            <div className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center flex flex-col justify-center h-[38px]">
              <span className="font-bold text-slate-800">
                {formatNumber(tons)} تن = {formatNumber(bags)} کیسه
              </span>
            </div>
          </div>
        </div>

        {/* Driver & Logistics Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              نام راننده / تحویل‌گیرنده
            </label>
            <input
              type="text"
              placeholder="محمدخان احمدی"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              شماره پلاک موتر
            </label>
            <input
              type="text"
              placeholder="۴۸۲۱ کابل"
              value={carPlate}
              onChange={e => setCarPlate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-amber-500 text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              شماره تماس راننده
            </label>
            <input
              type="text"
              placeholder="۰۷۸۸۱۱۰۰۲۲"
              value={driverPhone}
              onChange={e => setDriverPhone(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-amber-500 text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              مقصد بار
            </label>
            <input
              type="text"
              placeholder="هرات / جاده ولایت"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            ملاحظات سند خروجی (توضیحات اختیاری)
          </label>
          <input
            type="text"
            placeholder="مرحله دوم تحویل بار امانی طبق هماهنگی تلفنی..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isExceeded || !productId}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>ثبت خروجی بار</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isExceeded || !productId}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>ثبت و چاپ برگه خروجی A4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
