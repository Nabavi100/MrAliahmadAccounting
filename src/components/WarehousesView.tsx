import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Warehouse, WarehouseType, Product } from '../types';
import { formatNumber, getPersianDate, cleanCardexDescription } from '../utils/formatters';
import { ConsignmentDeliveryModal } from './ConsignmentDeliveryModal';
import {
  Warehouse as WarehouseIcon,
  ShieldCheck,
  Plus,
  Repeat,
  Package,
  MapPin,
  Phone,
  User,
  ArrowRightLeft,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Box,
  Printer,
  BarChart3,
  Layers,
  Search,
  CheckCircle2,
  Info,
  TrendingUp,
  Truck,
  Users,
  History,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface WarehousesViewProps {
  onOpenTransferModal: (fromWarehouseId?: string) => void;
  consignmentOnly?: boolean;
  initialFilterType?: string;
}

export const WarehousesView: React.FC<WarehousesViewProps> = ({
  onOpenTransferModal,
  consignmentOnly = false,
  initialFilterType,
}) => {
  const {
    warehouses,
    stocks,
    products,
    transfers,
    consignmentMovements,
    deleteConsignmentMovement,
    getCustomerConsignmentBalances,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getWarehouseStockDetails,
    openPrintModal,
  } = useAccounting();

  // Top View Mode: 'overview' | 'graphical_breakdown' | 'customer_consignment_ledger' | 'delivery_history'
  const [activeTab, setActiveTab] = useState<'overview' | 'graphical_breakdown' | 'customer_consignment_ledger' | 'delivery_history'>(
    consignmentOnly ? 'customer_consignment_ledger' : 'overview'
  );

  const [filterType, setFilterType] = useState<string>(
    initialFilterType || (consignmentOnly ? 'consignment' : 'all')
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    consignmentOnly || initialFilterType === 'consignment'
      ? warehouses.find(w => w.type !== 'standard')?.id || warehouses[0]?.id || ''
      : warehouses[0]?.id || ''
  );
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryInitialPartyName, setDeliveryInitialPartyName] = useState<string>('');
  const [deliveryInitialPartyId, setDeliveryInitialPartyId] = useState<string>('');

  React.useEffect(() => {
    if (initialFilterType) {
      setFilterType(initialFilterType);
      if (initialFilterType === 'consignment') {
        const cWh = warehouses.find(w => w.type !== 'standard');
        if (cWh) setSelectedWarehouseId(cWh.id);
      }
    }
  }, [initialFilterType, warehouses]);

  // Add/Edit Warehouse Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<WarehouseType>('standard');
  const [ownerName, setOwnerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = (initialType: WarehouseType = 'standard') => {
    setEditingWh(null);
    setCode(String(warehouses.length + 1));
    setName('');
    setLocation('');
    setType(initialType);
    setOwnerName('');
    setContactPhone('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (wh: Warehouse) => {
    setEditingWh(wh);
    setCode(wh.code || '');
    setName(wh.name);
    setLocation(wh.location);
    setType(wh.type);
    setOwnerName(wh.ownerName || '');
    setContactPhone(wh.contactPhone || '');
    setNotes(wh.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingWh) {
      updateWarehouse(editingWh.id, {
        code: code.trim() || String(warehouses.length + 1),
        name,
        location,
        type,
        ownerName,
        contactPhone,
        notes,
      });
    } else {
      const created = addWarehouse({
        code: code.trim() || String(warehouses.length + 1),
        name,
        location,
        type,
        ownerName,
        contactPhone,
        notes,
      });
      setSelectedWarehouseId(created.id);
    }
    setIsAddModalOpen(false);
  };

  // Group warehouses by type
  const standardWarehouses = warehouses.filter(w => w.type === 'standard');
  const consignmentWarehouses = warehouses.filter(w => w.type !== 'standard');

  // Compute total stocks for standard vs consignment
  const standardStocks = stocks.filter(s => {
    const wh = warehouses.find(w => w.id === s.warehouseId);
    return wh && wh.type === 'standard';
  });
  const consignmentStocks = stocks.filter(s => {
    const wh = warehouses.find(w => w.id === s.warehouseId);
    return wh && wh.type !== 'standard';
  });

  const totalStandardTons = standardStocks.reduce((sum, s) => sum + (s.quantityTons || 0), 0);
  const totalStandardBags = standardStocks.reduce((sum, s) => sum + (s.quantityBags || 0), 0);

  const totalConsignmentTons = consignmentStocks.reduce((sum, s) => sum + (s.quantityTons || 0), 0);
  const totalConsignmentBags = consignmentStocks.reduce((sum, s) => sum + (s.quantityBags || 0), 0);

  const grandTotalTons = totalStandardTons + totalConsignmentTons;
  const grandTotalBags = totalStandardBags + totalConsignmentBags;
  const standardRatio = grandTotalTons > 0 ? (totalStandardTons / grandTotalTons) * 100 : 0;
  const consignmentRatio = grandTotalTons > 0 ? (totalConsignmentTons / grandTotalTons) * 100 : 0;

  // Product-by-product breakdown for graphical comparison
  const productComparisons = useMemo(() => {
    return products.map(prod => {
      const pStdStocks = stocks.filter(s => {
        const wh = warehouses.find(w => w.id === s.warehouseId);
        return s.productId === prod.id && wh && wh.type === 'standard';
      });
      const pCsgStocks = stocks.filter(s => {
        const wh = warehouses.find(w => w.id === s.warehouseId);
        return s.productId === prod.id && wh && wh.type !== 'standard';
      });

      const stdTons = pStdStocks.reduce((sum, s) => sum + (s.quantityTons || 0), 0);
      const stdBags = pStdStocks.reduce((sum, s) => sum + (s.quantityBags || 0), 0);

      const csgTons = pCsgStocks.reduce((sum, s) => sum + (s.quantityTons || 0), 0);
      const csgBags = pCsgStocks.reduce((sum, s) => sum + (s.quantityBags || 0), 0);

      const prodTotalTons = stdTons + csgTons;
      const prodTotalBags = stdBags + csgBags;

      const stdPercent = prodTotalTons > 0 ? (stdTons / prodTotalTons) * 100 : 0;
      const csgPercent = prodTotalTons > 0 ? (csgTons / prodTotalTons) * 100 : 0;

      return {
        product: prod,
        stdTons,
        stdBags,
        csgTons,
        csgBags,
        totalTons: prodTotalTons,
        totalBags: prodTotalBags,
        stdPercent,
        csgPercent,
      };
    });
  }, [products, stocks, warehouses]);

  // Customer Consignment Balances (Distinct customer separation even if 10+ customers)
  const customerConsignmentBalances = useMemo(() => {
    return getCustomerConsignmentBalances();
  }, [consignmentMovements]);

  const filteredCustomerBalances = useMemo(() => {
    if (!customerSearch.trim()) return customerConsignmentBalances;
    const q = customerSearch.toLowerCase().trim();
    return customerConsignmentBalances.filter(cb => {
      return (
        cb.partyName.toLowerCase().includes(q) ||
        (cb.partyPhone && cb.partyPhone.includes(q)) ||
        cb.products.some(p => p.productName.toLowerCase().includes(q))
      );
    });
  }, [customerConsignmentBalances, customerSearch]);

  // Consignment delivery (withdrawal) movements history
  const consignmentDeliveriesHistory = useMemo(() => {
    return consignmentMovements.filter(m => m.type === 'withdrawal');
  }, [consignmentMovements]);

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter(w => {
    if (consignmentOnly || filterType === 'consignment') {
      return w.type !== 'standard';
    }
    if (filterType === 'standard') {
      return w.type === 'standard';
    }
    return true;
  });

  const selectedWh = warehouses.find(w => w.id === selectedWarehouseId) || filteredWarehouses[0];
  const currentStockDetails = selectedWh ? getWarehouseStockDetails(selectedWh.id) : [];

  const totalWhTons = currentStockDetails.reduce((sum, item) => sum + item.tons, 0);
  const totalWhBags = currentStockDetails.reduce((sum, item) => sum + item.bags, 0);

  // Transfers history involving selected warehouse
  const whTransfers = transfers.filter(
    t => selectedWh && (t.fromWarehouseId === selectedWh.id || t.toWarehouseId === selectedWh.id)
  );

  const openDeliveryModalForCustomer = (partyName: string, partyId?: string) => {
    setDeliveryInitialPartyName(partyName);
    setDeliveryInitialPartyId(partyId || '');
    setIsDeliveryModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto" dir="rtl">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <WarehouseIcon className="w-6 h-6 text-blue-600" />
            <span>مدیریت انبارها، تفکیک کالاها و گدام امانی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            تفکیک دقیق و گرافیکی موجودی تجارتی (معمولی) از امانات مشتریان و صدور اسناد ترخیص A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDeliveryInitialPartyName('');
              setDeliveryInitialPartyId('');
              setIsDeliveryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>+ ثبت سند خروجی بار امانی</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenTransferModal(selectedWh?.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Repeat className="w-4 h-4 text-emerald-400" />
            <span>انتقال بین گدام‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => openAddModal(consignmentOnly ? 'consignment_in' : 'standard')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ تعریف گدام جدید</span>
          </button>
        </div>
      </div>

      {/* 4 Main Operational Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-blue-900 shadow-sm font-black'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <WarehouseIcon className="w-4 h-4 text-blue-600" />
          <span>موجودی و کارتکس انبارها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('graphical_breakdown')}
          className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'graphical_breakdown'
              ? 'bg-white text-indigo-900 shadow-sm font-black'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>نمودار تفکیک کالا (معمولی vs امانی)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customer_consignment_ledger')}
          className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'customer_consignment_ledger'
              ? 'bg-white text-amber-950 shadow-sm font-black'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <Users className="w-4 h-4 text-amber-600" />
          <span>دفتر امانات به تفکیک مشتری ({customerConsignmentBalances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery_history')}
          className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'delivery_history'
              ? 'bg-white text-emerald-950 shadow-sm font-black'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          <span>سوابق تحویل و خروج بار ({consignmentDeliveriesHistory.length})</span>
        </button>
      </div>

      {/* TOP COMPARISON BANNER (Always present for instant visual awareness) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                نسبت موجودی ملکی شرکت در برابر امانات مشتریان
              </h3>
              <p className="text-[11px] text-slate-500">
                کل موجودی در کلیه گدام‌ها: <strong className="text-slate-800 font-mono">{formatNumber(grandTotalTons)} تن</strong> ({formatNumber(grandTotalBags)} کیسه)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-800">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <span>ملکی / معمولی: <strong>{standardRatio.toFixed(1)}%</strong></span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-800">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>امانی مشتریان: <strong>{consignmentRatio.toFixed(1)}%</strong></span>
            </span>
          </div>
        </div>

        {/* Dual Graphical Progress Bar */}
        <div className="w-full h-6 bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200/80 p-0.5 shadow-inner">
          <div
            style={{ width: `${grandTotalTons > 0 ? Math.max(standardRatio, 2) : 50}%` }}
            className="h-full bg-gradient-to-r from-blue-700 to-indigo-600 rounded-s-lg transition-all duration-500 flex items-center justify-center text-[10px] sm:text-xs text-white font-mono font-black overflow-hidden"
            title={`ملکی معمولی: ${formatNumber(totalStandardTons)} تن`}
          >
            {standardRatio > 10 && `${standardRatio.toFixed(0)}% ملکی (${formatNumber(totalStandardTons)} تن)`}
          </div>
          <div
            style={{ width: `${grandTotalTons > 0 ? Math.max(consignmentRatio, 2) : 50}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-e-lg transition-all duration-500 flex items-center justify-center text-[10px] sm:text-xs text-white font-mono font-black overflow-hidden"
            title={`امانی: ${formatNumber(totalConsignmentTons)} تن`}
          >
            {consignmentRatio > 10 && `${consignmentRatio.toFixed(0)}% امانی (${formatNumber(totalConsignmentTons)} تن)`}
          </div>
        </div>

        {/* 2 Visual Status Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs font-black text-blue-950 block">گدام‌های ملکی / معمولی</span>
                <span className="text-[10.5px] text-blue-700">سرمایه و موجودی آزاد جهت معامله و فروش</span>
              </div>
            </div>
            <div className="text-left font-mono">
              <span className="text-sm font-black text-blue-900">{formatNumber(totalStandardTons)} تن</span>
              <span className="text-[10px] text-slate-500 block">({formatNumber(totalStandardBags)} کیسه)</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-black text-amber-950 block">گدام‌های امانی (کالای مشتریان)</span>
                <span className="text-[10.5px] text-amber-800">تحت امانت و غیرقابل فروش، ترخیص با حواله</span>
              </div>
            </div>
            <div className="text-left font-mono">
              <span className="text-sm font-black text-amber-950">{formatNumber(totalConsignmentTons)} تن</span>
              <span className="text-[10px] text-slate-500 block">({formatNumber(totalConsignmentBags)} کیسه)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* TAB 1: OVERVIEW & WAREHOUSES MANAGEMENT                                                    */}
      {/* ========================================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filter Tabs for Warehouses */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه گدام‌ها ({warehouses.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('standard')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'standard'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                <WarehouseIcon className="w-3.5 h-3.5" />
                <span>ملکی / معمولی ({standardWarehouses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('consignment')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'consignment'
                    ? 'bg-amber-600 text-white shadow-2xs font-black'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>امانی ({consignmentWarehouses.length})</span>
              </button>
            </div>
          </div>

          {/* Warehouse Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredWarehouses.map(wh => {
              const isSelected = selectedWh?.id === wh.id;
              const whStocks = stocks.filter(s => s.warehouseId === wh.id);
              const tonsCount = whStocks.reduce((sum, s) => sum + s.quantityTons, 0);
              const bagsCount = whStocks.reduce((sum, s) => sum + s.quantityBags, 0);
              const isStandard = wh.type === 'standard';
              const shareOfTotal = grandTotalTons > 0 ? (tonsCount / grandTotalTons) * 100 : 0;

              return (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? isStandard
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : isStandard
                      ? 'bg-white/90 border-slate-200/90 hover:border-blue-300 hover:bg-white shadow-2xs'
                      : 'bg-amber-50/20 border-amber-200/80 hover:border-amber-400 hover:bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-2xs ${
                          isStandard
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isStandard ? <WarehouseIcon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                      </div>
                      {wh.code && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          کد: {wh.code}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                        isStandard
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : 'bg-amber-100 text-amber-950 border-amber-300'
                      }`}
                    >
                      {isStandard
                        ? 'گدام ملکی (معمولی)'
                        : wh.type === 'consignment_in'
                        ? 'گدام امانی (نزد ما)'
                        : 'امانی (نزد همکار)'}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm mb-1">{wh.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate mb-2">{wh.location || 'موقعیت مشخص نشده'}</p>

                  {wh.ownerName && (
                    <div className="text-[11px] text-amber-950 font-bold mb-2 bg-amber-100/70 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1 truncate">
                      <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate">امانت‌گذار: {wh.ownerName}</span>
                    </div>
                  )}

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>سهم از کل موجودی:</span>
                      <span className="font-mono font-bold text-slate-700">{shareOfTotal.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(shareOfTotal, 100)}%` }}
                        className={`h-full rounded-full ${
                          isStandard ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">موجودی کالا:</span>
                    <div className="text-left font-mono">
                      <span className={`font-black ${isStandard ? 'text-blue-900' : 'text-amber-950'}`}>
                        {formatNumber(tonsCount)} تن
                      </span>
                      <span className="text-[10px] text-slate-400 block">({formatNumber(bagsCount)} کیسه)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Warehouse Details */}
          {selectedWh && (() => {
            const isStandard = selectedWh.type === 'standard';
            const filteredStockDetails = currentStockDetails.filter(item => {
              if (!productSearch.trim()) return true;
              const q = productSearch.toLowerCase().trim();
              return (
                item.product.name.toLowerCase().includes(q) ||
                item.product.code.toLowerCase().includes(q) ||
                (item.product.category && item.product.category.toLowerCase().includes(q))
              );
            });

            return (
              <div className="space-y-4">
                {/* Context Banner */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isStandard
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : 'bg-amber-50/80 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl text-white shadow-xs ${
                        isStandard ? 'bg-blue-600' : 'bg-amber-600'
                      }`}
                    >
                      {isStandard ? <WarehouseIcon className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base">{selectedWh.name}</h3>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            isStandard
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-amber-200 text-amber-900 border-amber-400'
                          }`}
                        >
                          {isStandard ? 'گدام ملکی / معمولی شرکت' : 'گدام امانی مشتریان'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">
                        {isStandard
                          ? 'کالاهای موجود در این گدام دارایی شرکت بوده و در فاکتورهای فروش عادی تسویه و ترخیص می‌گردند.'
                          : 'کالاهای این گدام متعلق به مشتریان است. هر بار که مشتری جنس برد، سند خروجی امانی ثبت و تحویل موتروان می‌گردد.'}
                      </p>
                    </div>
                  </div>

                  {!isStandard && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryInitialPartyName(selectedWh.ownerName || '');
                          setIsDeliveryModalOpen(true);
                        }}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Truck className="w-4 h-4" />
                        <span>ثبت سند خروجی این گدام</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const whMovements = consignmentMovements.filter(
                            m => m.warehouseId === selectedWh.id
                          );
                          openPrintModal({
                            type: 'customer_consignment_cardex',
                            customerName: selectedWh.ownerName || selectedWh.name,
                            consignmentMovements: whMovements,
                          });
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>چاپ کارتکس A4</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stock Table & Transfers History */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Stock Table */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Box className="w-4 h-4 text-emerald-600" />
                          <span>موجودی اقلام در «{selectedWh.name}»</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          مجموع: <strong className="text-slate-800 font-mono">{formatNumber(totalWhTons)} تن</strong> (
                          {formatNumber(totalWhBags)} کیسه)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="جستجوی کالا..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            className="w-36 sm:w-44 pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            openPrintModal({
                              type: 'products_inventory_report',
                              inventoryProducts: products,
                              inventoryStocks: stocks.filter(s => s.warehouseId === selectedWh.id),
                              selectedWarehouseName: selectedWh.name,
                            });
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200 shadow-xs"
                          title="چاپ رسمی موجودی این گدام در قطع A4"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>چاپ موجودی (A4)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(selectedWh)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">کد / نام کالا</th>
                            <th className="px-3 py-3">دسته‌بندی</th>
                            <th className="px-4 py-3">موجودی به تن</th>
                            <th className="px-4 py-3">موجودی به کیسه</th>
                            <th className="px-4 py-3">سهم از این گدام</th>
                            <th className="px-3 py-3">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStockDetails.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-400">
                                در این گدام هیچ کالایی موجود نیست.
                              </td>
                            </tr>
                          ) : (
                            filteredStockDetails.map(({ product, tons, bags }) => {
                              const itemRatio = totalWhTons > 0 ? (tons / totalWhTons) * 100 : 0;
                              return (
                                <tr key={product.id} className="hover:bg-slate-50/80 transition">
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{product.code}</div>
                                  </td>
                                  <td className="px-3 py-3.5 text-slate-600">{product.category}</td>
                                  <td className="px-4 py-3.5 font-mono font-black text-slate-900 text-sm">
                                    {formatNumber(tons)} تن
                                  </td>
                                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                                    {formatNumber(bags)} کیسه
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="w-28 space-y-1">
                                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                        <span>{itemRatio.toFixed(1)}%</span>
                                        <span>{formatNumber(tons)}/{formatNumber(totalWhTons)}</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          style={{ width: `${Math.min(itemRatio, 100)}%` }}
                                          className={`h-full rounded-full ${
                                            isStandard ? 'bg-blue-600' : 'bg-amber-500'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3.5">
                                    {tons <= product.minStockTons ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        نزدیک اتمام
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        کافی
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transfers History */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                      <span>تاریخچه جابجایی بار این گدام</span>
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[440px]">
                      {whTransfers.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs">
                          هیچ انتقالی برای این گدام ثبت نشده است.
                        </div>
                      ) : (
                        whTransfers.map(trf => {
                          const isIncoming = trf.toWarehouseId === selectedWh.id;
                          return (
                            <div
                              key={trf.id}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-900">{trf.transferNumber}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">{trf.date}</span>
                                  <button
                                    type="button"
                                    onClick={() => openPrintModal({ type: 'stock_transfer', stockTransfer: trf })}
                                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition cursor-pointer"
                                    title="چاپ حواله انتقال بار (A4)"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="font-bold text-slate-800">{trf.productName}</div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">
                                  {isIncoming ? `از: ${trf.fromWarehouseName}` : `به: ${trf.toWarehouseName}`}
                                </span>
                                <span className="font-mono font-bold text-emerald-700">
                                  {formatNumber(trf.tonsCount)} تن ({formatNumber(trf.bagsCount)} کیسه)
                                </span>
                              </div>

                              {trf.description && (
                                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                                  {cleanCardexDescription(trf.description, 32)}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenTransferModal(selectedWh.id)}
                      className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Repeat className="w-4 h-4" />
                      <span>ثبت جابجایی جدید از این گدام</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 2: GRAPHICAL BREAKDOWN PER PRODUCT (Ordinary vs Consignment)                          */}
      {/* ========================================================================================= */}
      {activeTab === 'graphical_breakdown' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-indigo-950">
                  تفکیک و مقایسه گرافیکی موجودی کالا به کالا (معمولی vs امانی)
                </h3>
                <p className="text-xs text-indigo-800 mt-0.5">
                  نمایش درصد و مقدار دقیق کالاهای ملکی شرکت در مقایسه با کالاهای امانت مشتریان برای هر جنس
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-blue-700 bg-white px-2 py-1 rounded-lg border border-blue-200">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>ملکی (قابل فروش آزاد)</span>
              </span>
              <span className="flex items-center gap-1 text-amber-700 bg-white px-2 py-1 rounded-lg border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>امانی (امانات مشتریان)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productComparisons.map(item => (
              <div
                key={item.product.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 hover:border-indigo-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">{item.product.name}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      کد: {item.product.code} • {item.product.category}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-500 block">جمع کل موجودی:</span>
                    <strong className="text-base font-black font-mono text-slate-900">
                      {formatNumber(item.totalTons)} تن
                    </strong>
                    <span className="text-[11px] text-slate-400 block font-mono">({formatNumber(item.totalBags)} کیسه)</span>
                  </div>
                </div>

                {/* Dual Color Graphical Progress Bar for this specific item */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-blue-800">
                      ملکی: {formatNumber(item.stdTons)} تن ({item.stdPercent.toFixed(1)}%)
                    </span>
                    <span className="text-amber-800">
                      امانی: {formatNumber(item.csgTons)} تن ({item.csgPercent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200 p-0.5">
                    <div
                      style={{ width: `${item.totalTons > 0 ? Math.max(item.stdPercent, item.stdTons > 0 ? 3 : 0) : 50}%` }}
                      className="h-full bg-gradient-to-r from-blue-700 to-indigo-600 rounded-s transition-all duration-500"
                    />
                    <div
                      style={{ width: `${item.totalTons > 0 ? Math.max(item.csgPercent, item.csgTons > 0 ? 3 : 0) : 50}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-e transition-all duration-500"
                    />
                  </div>
                </div>

                {/* Quantitative Details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-[10.5px] font-bold text-blue-900 block">دارایی ملکی شرکت:</span>
                    <span className="font-mono font-black text-blue-800 text-sm">
                      {formatNumber(item.stdTons)} تن
                    </span>
                    <span className="text-[10px] text-blue-600 block">({formatNumber(item.stdBags)} کیسه)</span>
                  </div>

                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                    <span className="text-[10.5px] font-bold text-amber-950 block">امانات مشتریان:</span>
                    <span className="font-mono font-black text-amber-900 text-sm">
                      {formatNumber(item.csgTons)} تن
                    </span>
                    <span className="text-[10px] text-amber-700 block">({formatNumber(item.csgBags)} کیسه)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 3: CUSTOMER CONSIGNMENT LEDGER (Separation by customer, even 10+ customers)             */}
      {/* ========================================================================================= */}
      {activeTab === 'customer_consignment_ledger' && (
        <div className="space-y-5">
          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-amber-950">
                    دفتر حساب امانات به نام هر مشتری (کارتکس و تفکیک موجودی اشخاص)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400">
                    {customerConsignmentBalances.length} مشتری
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-0.5">
                  کالای هر مشتری با فاکتور در گدام امانی ذخیره شده و در هر مرحله تحویل، سند خروجی مجزا با ذکر تاریخ و مانده صادر می‌شود.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام مشتری..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-48 sm:w-56 pr-9 pl-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:border-amber-500 shadow-2xs font-bold text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeliveryInitialPartyName('');
                  setIsDeliveryModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>+ ثبت خروجی جدید</span>
              </button>
            </div>
          </div>

          {/* List of Customers with Consignment Stocks */}
          {filteredCustomerBalances.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">هیچ مشتری امانت‌گذاری یافت نشد</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                هنگام صدور فاکتور فروش، نوع معامله را «امانت در گدام» انتخاب نمایید تا بار به نام مشتری وارد گدام امانی شود.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomerBalances.map(cust => {
                const hasStock = cust.remainingTons > 0;
                return (
                  <div
                    key={cust.partyId + cust.partyName}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Customer Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm border border-amber-200">
                            {cust.partyName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900 text-base">{cust.partyName}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  hasStock
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {hasStock ? 'دارای موجودی امانت' : 'تسویه شده'}
                              </span>
                            </div>
                            {cust.partyPhone && (
                              <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{cust.partyPhone}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer Balance Badge */}
                        <div className="text-left font-mono">
                          <span className="text-[10px] font-bold text-slate-500 block">مانده فعلی نزد گدام:</span>
                          <span className="text-lg font-black text-amber-950 font-mono">
                            {formatNumber(cust.remainingTons)} تن
                          </span>
                          <span className="text-[11px] text-amber-800 font-mono block">
                            ({formatNumber(cust.remainingBags)} کیسه)
                          </span>
                        </div>
                      </div>

                      {/* Financial Totals: In, Out, Remaining */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">کل واریز شده:</span>
                          <strong className="text-blue-800 font-mono font-black">
                            {formatNumber(cust.totalInTons)} تن
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block">({formatNumber(cust.totalInBags)} کیسه)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">کل برده شده:</span>
                          <strong className="text-rose-700 font-mono font-black">
                            {formatNumber(cust.totalOutTons)} تن
                          </strong>
                          <span className="text-[9.5px] text-slate-400 block">({formatNumber(cust.totalOutBags)} کیسه)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-900 block font-bold">مانده امانت:</span>
                          <strong className="text-emerald-700 font-mono font-black">
                            {formatNumber(cust.remainingTons)} تن
                          </strong>
                          <span className="text-[9.5px] text-emerald-600 block">({formatNumber(cust.remainingBags)} کیسه)</span>
                        </div>
                      </div>

                      {/* Products List for this customer */}
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">اقلام امانت این مشتری:</span>
                        <div className="space-y-1">
                          {cust.products.map(prod => (
                            <div
                              key={prod.productId}
                              className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5 text-amber-600" />
                                <span className="font-bold text-slate-800">{prod.productName}</span>
                              </div>
                              <div className="font-mono text-[11px] flex items-center gap-3">
                                <span className="text-slate-500">وارده: {formatNumber(prod.totalInTons)} تن</span>
                                <span className="text-rose-600">برده شده: {formatNumber(prod.totalOutTons)} تن</span>
                                <span className="font-black text-amber-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  مانده: {formatNumber(prod.remainingTons)} تن
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openDeliveryModalForCustomer(cust.partyName, cust.partyId)}
                        disabled={!hasStock}
                        className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>ثبت خروج بار این شخص</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const customerMovements = consignmentMovements.filter(
                            m => m.partyName === cust.partyName || m.partyId === cust.partyId
                          );
                          openPrintModal({
                            type: 'customer_consignment_cardex',
                            customerName: cust.partyName,
                            consignmentMovements: customerMovements,
                          });
                        }}
                        className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        title="چاپ کارتکس رسمی امانی مشتری در ابعاد A4"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>چاپ کارتکس (A4)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 4: DELIVERY AND WITHDRAWAL HISTORY TABLE (چندتا برده شده، چه تاریخ، چند تا مانده)       */}
      {/* ========================================================================================= */}
      {activeTab === 'delivery_history' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-950">
                  تاریخچه مراحل خروج و ترخیص بار امانی (چندتا برده شده، چه تاریخ، چند تا مانده)
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  گزارش گام‌به‌گام تحویل بار به رانندگان همراه با شماره پلاک، تاریخ و مانده موجودی پس از هر ترخیص
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeliveryInitialPartyName('');
                setIsDeliveryModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Truck className="w-4 h-4" />
              <span>+ ثبت خروج بار جدید</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-black">
                  <tr>
                    <th className="p-3 text-center w-12">ردیف</th>
                    <th className="p-3 text-center">شماره سند خروجی</th>
                    <th className="p-3 text-center">تاریخ و ساعت</th>
                    <th className="p-3">مشتری (صاحب بار)</th>
                    <th className="p-3">کالا</th>
                    <th className="p-3">گدام امانی</th>
                    <th className="p-3 text-center bg-rose-900/60">مقدار برده شده (خروجی)</th>
                    <th className="p-3 text-center bg-emerald-900/60">مانده پس از این مرحله</th>
                    <th className="p-3">راننده و پلاک موتر</th>
                    <th className="p-3 text-center w-24">عملیات چاپ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consignmentDeliveriesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        تاکنون هیچ سند خروجی از گدام امانی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    consignmentDeliveriesHistory.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 text-center font-mono font-black text-slate-900">
                          {m.documentNumber}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                          {m.date}
                          {m.issueTime && <div className="text-[10px] text-slate-400">{m.issueTime}</div>}
                        </td>
                        <td className="p-3 font-black text-slate-900">{m.partyName}</td>
                        <td className="p-3 font-bold text-slate-800">{m.productName}</td>
                        <td className="p-3 text-slate-600">{m.warehouseName || 'گدام امانی'}</td>
                        <td className="p-3 text-center font-mono font-black text-rose-700 bg-rose-50/40">
                          {formatNumber(m.quantityTons)} تن
                          <div className="text-[10px] text-slate-500 font-normal">({formatNumber(m.quantityBags)} کیسه)</div>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                          {m.remainingTonsAfter !== undefined ? `${formatNumber(m.remainingTonsAfter)} تن` : '---'}
                          {m.remainingBagsAfter !== undefined && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              ({formatNumber(m.remainingBagsAfter)} کیسه)
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-700 max-w-[180px]">
                          <div className="font-bold truncate">{m.driverName || 'تحویل‌گیرنده مشتری'}</div>
                          {m.carPlate && <div className="text-slate-400 font-mono text-[10px]">پلاک: {m.carPlate}</div>}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                openPrintModal({
                                  type: 'consignment_delivery_slip',
                                  consignmentDelivery: m,
                                });
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="چاپ سند خروجی در قطع استاندارد A4"
                            >
                              <Printer className="w-3 h-3 text-amber-400" />
                              <span>چاپ A4</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف سند خروجی #${m.documentNumber} اطمینان دارید؟ موجودی به گدام و مشتری برگشت داده می‌شود.`)) {
                                  deleteConsignmentMovement(m.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="حذف و استرداد موجودی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* CONSIGNMENT DELIVERY MODAL */}
      <ConsignmentDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        initialPartyName={deliveryInitialPartyName}
        initialPartyId={deliveryInitialPartyId}
        initialWarehouseId={selectedWh?.id}
      />

      {/* ADD/EDIT WAREHOUSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveWarehouse}
            className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingWh ? 'ویرایش مشخصات گدام' : 'تعریف گدام جدید (ملکی یا امانی)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">کد گدام</label>
                <input
                  type="text"
                  placeholder="کد"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-blue-700 font-mono outline-none focus:bg-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">نام گدام *</label>
                <input
                  type="text"
                  placeholder="مثلاً: گدام مرکزی هرات"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع گدام</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as WarehouseType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="standard">گدام ملکی تجارتی (متعلق به شرکت)</option>
                <option value="consignment_in">گدام امانی (کالای امانت مشتریان نزد ما)</option>
                <option value="consignment_out">گدام امانی خارجی (کالای امانت ما نزد دیگران)</option>
              </select>
            </div>

            {type !== 'standard' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام صاحب امانت / شرکت امانت‌گذار
                </label>
                <input
                  type="text"
                  placeholder="مثال: حاجی رسول اکبری"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">آدرس / موقعیت</label>
                <input
                  type="text"
                  placeholder="کابل، چوک ده‌بوری"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره تماس انباردار</label>
                <input
                  type="text"
                  placeholder="۰۷۹۹۰۰۱۱۲۲"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ظرفیت انبار، نرخ کرایه انبارداری و..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {editingWh ? 'ذخیره گدام' : 'ایجاد گدام'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
