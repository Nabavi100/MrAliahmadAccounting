import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, Unit, InvoiceType, InvoiceItem, Invoice } from '../types';
import { formatNumber, formatCurrency, getPersianDate, calculateBagsAndTons } from '../utils/formatters';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { PartySearchSelector } from './PartySearchSelector';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import { ProductSearchSelector } from './ProductSearchSelector';
import { TransactionsLedgerView } from './TransactionsLedgerView';
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  ArrowDownLeft,
  Trash2,
  Printer,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  User,
  DollarSign,
  Package,
  FileSpreadsheet,
  RotateCw,
  Wallet,
  Layers,
  UserPlus,
  ArrowLeftRight,
} from 'lucide-react';

interface SalesPurchaseViewProps {
  initialType?: InvoiceType;
  initialFilter?: 'all' | 'sell' | 'buy';
  initialActiveTab?: 'list' | 'transactions' | 'create';
  onViewInvoice: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment', partyId?: string) => void;
}

export const SalesPurchaseView: React.FC<SalesPurchaseViewProps> = ({
  initialType = 'sell',
  initialFilter = 'all',
  initialActiveTab = 'list',
  onViewInvoice,
  onOpenPaymentModal,
}) => {
  const {
    products,
    warehouses,
    parties,
    currencies,
    notify,
    invoices,
    createInvoice,
    deleteInvoice,
    getProductStock,
    cashRegister,
    cashAccounts,
    getNextInvoiceNumber,
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'list' | 'transactions' | 'create'>(initialActiveTab);
  const [filterType, setFilterType] = useState<'all' | 'sell' | 'buy'>(initialFilter);
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'AFN' | 'USD'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);

  // Sync external prop changes
  React.useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter);
    }
  }, [initialFilter]);

  React.useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  // Invoice creation form state
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialType);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => getNextInvoiceNumber(initialType));

  React.useEffect(() => {
    if (initialType) {
      setInvoiceType(initialType);
      setInvoiceNumber(getNextInvoiceNumber(initialType));
    }
  }, [initialType]);
  const [invoiceDate, setInvoiceDate] = useState(getPersianDate());
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id || '');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [notes, setNotes] = useState('');

  // Items in invoice
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Item row input form
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemUnit, setItemUnit] = useState<Unit>('ton');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(() => {
    const p = products[0];
    if (!p) return 0;
    return currency === 'AFN' ? (initialType === 'sell' ? p.sellPriceAFN : p.buyPriceAFN) : (initialType === 'sell' ? p.sellPriceUSD : p.buyPriceUSD);
  });

  // Payment amounts & Target Cash Account
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>(() => {
    const match = cashAccounts.find(a => a.currency === 'AFN');
    return match ? match.id : cashAccounts[0]?.id || 'afn_cash';
  });

  // When changing product or currency in item form, auto set recommended unit price
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const basePrice = currency === 'AFN' 
      ? (invoiceType === 'sell' ? p.sellPriceAFN : p.buyPriceAFN)
      : (invoiceType === 'sell' ? p.sellPriceUSD : p.buyPriceUSD);

    if (itemUnit === 'bag') {
      setItemUnitPrice(Math.round(basePrice / (p.bagsPerTon || 20)));
    } else {
      setItemUnitPrice(basePrice);
    }
  };

  const handleUnitChange = (newUnit: Unit) => {
    setItemUnit(newUnit);
    const p = products.find(prod => prod.id === selectedProductId);
    if (!p) return;
    const basePrice = currency === 'AFN' 
      ? (invoiceType === 'sell' ? p.sellPriceAFN : p.buyPriceAFN)
      : (invoiceType === 'sell' ? p.sellPriceUSD : p.buyPriceUSD);

    if (newUnit === 'bag') {
      setItemUnitPrice(Math.round(basePrice / (p.bagsPerTon || 20)));
    } else {
      setItemUnitPrice(basePrice);
    }
  };

  const handleCurrencyChange = (newCurr: Currency) => {
    setCurrency(newCurr);
    const p = products.find(prod => prod.id === selectedProductId);
    if (!p) return;
    const basePrice = newCurr === 'AFN' 
      ? (invoiceType === 'sell' ? p.sellPriceAFN : p.buyPriceAFN)
      : (invoiceType === 'sell' ? p.sellPriceUSD : p.buyPriceUSD);

    if (itemUnit === 'bag') {
      setItemUnitPrice(Math.round(basePrice / (p.bagsPerTon || 20)));
    } else {
      setItemUnitPrice(basePrice);
    }
  };

  // Instantaneous currency toggle between USD and AFN
  const handleToggleCurrency = () => {
    const usdCurrencyDef = currencies?.find(c => c.code === 'USD');
    const systemRate = usdCurrencyDef?.exchangeRateToAFN || cashRegister?.usdToAfnRate || 65;
    if (systemRate <= 0) return;

    if (currency === 'USD') {
      // USD -> AFN
      setCurrency('AFN');
      setItems(prevItems =>
        prevItems.map(item => {
          const newUnitPrice = Math.round((item.unitPrice || 0) * systemRate * 100) / 100;
          const newTotalPrice = Math.round((item.quantity || 0) * newUnitPrice * 100) / 100;
          return {
            ...item,
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );
      if (itemUnitPrice > 0) {
        setItemUnitPrice(Math.round(itemUnitPrice * systemRate * 100) / 100);
      }
      if (discount > 0) setDiscount(Math.round(discount * systemRate * 100) / 100);
      if (paidAmount > 0) setPaidAmount(Math.round(paidAmount * systemRate * 100) / 100);

      notify?.('info', 'تغییر ارز به افغانی (؋)', `کلیه ردیف‌ها و مبالغ با نرخ روز ($۱ = ${formatNumber(systemRate)} افغانی) به صورت لحظه‌ای به افغانی تبدیل شدند.`);
    } else {
      // AFN -> USD
      setCurrency('USD');
      setItems(prevItems =>
        prevItems.map(item => {
          const newUnitPrice = Number(((item.unitPrice || 0) / systemRate).toFixed(2));
          const newTotalPrice = Number(((item.quantity || 0) * newUnitPrice).toFixed(2));
          return {
            ...item,
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
          };
        })
      );
      if (itemUnitPrice > 0) {
        setItemUnitPrice(Number((itemUnitPrice / systemRate).toFixed(2)));
      }
      if (discount > 0) setDiscount(Number((discount / systemRate).toFixed(2)));
      if (paidAmount > 0) setPaidAmount(Number((paidAmount / systemRate).toFixed(2)));

      notify?.('info', 'تغییر ارز به دلار ($)', `کلیه ردیف‌ها و مبالغ با نرخ روز ($۱ = ${formatNumber(systemRate)} افغانی) به صورت لحظه‌ای به دلار تبدیل شدند.`);
    }
  };

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || itemQuantity <= 0 || itemUnitPrice <= 0) return;

    const { bags, tons } = calculateBagsAndTons(itemQuantity, itemUnit, prod.bagsPerTon);
    const totalPrice = itemQuantity * itemUnitPrice;
    const wh = warehouses.find(w => w.id === selectedWarehouseId);

    const newItem: InvoiceItem = {
      id: 'item-' + Date.now(),
      productId: prod.id,
      productName: prod.name,
      warehouseId: selectedWarehouseId,
      warehouseName: wh?.name,
      description: itemDescription.trim() || undefined,
      unit: itemUnit,
      quantity: itemQuantity,
      bagsCount: bags,
      tonsCount: tons,
      unitPrice: itemUnitPrice,
      currency,
      totalPrice,
    };

    const updated = [...items, newItem];
    setItems(updated);

    // Auto update paid amount to subtotal if user hasn't touched it
    const sub = updated.reduce((s, it) => s + it.totalPrice, 0);
    setPaidAmount(sub - discount);

    // Reset row
    setItemQuantity(1);
    setItemDescription('');
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    const sub = updated.reduce((s, it) => s + it.totalPrice, 0);
    setPaidAmount(Math.max(0, sub - discount));
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('لطفاً حداقل یک قلم کالا به فاکتور اضافه کنید');
      return;
    }

    const party = parties.find(p => p.id === selectedPartyId);
    const paymentStatus = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const created = createInvoice({
      invoiceNumber,
      type: invoiceType,
      date: invoiceDate,
      partyId: selectedPartyId,
      partyName: party ? party.name : 'مشتری متفرقه',
      warehouseId: selectedWarehouseId,
      currency,
      items,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus,
      cashRegister: selectedCashAccountId,
      cashRegisterId: selectedCashAccountId,
      notes,
    });

    // Reset and switch to list
    setItems([]);
    setDiscount(0);
    setPaidAmount(0);
    setNotes('');
    setInvoiceNumber(getNextInvoiceNumber(invoiceType));
    setActiveTab('list');
    onViewInvoice(created.id);
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filterType !== 'all' && inv.type !== filterType) return false;
    if (filterCurrency !== 'all' && inv.currency !== filterCurrency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.partyName.toLowerCase().includes(q) ||
        inv.items.some(it => it.productName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 p-1 rounded-xl flex items-center text-xs font-bold flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فهرست فاکتورها ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'transactions' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>دفتر ریز تراکنش‌های خرید و فروش</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setInvoiceType('sell');
              }}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'create' && invoiceType === 'sell'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + صدور فاکتور فروش
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setInvoiceType('buy');
              }}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'create' && invoiceType === 'buy'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + ثبت فاکتور خرید
            </button>
          </div>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در فاکتور، کالا یا مشتری..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs w-64 focus:outline-emerald-500"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="all">همه نوع فاکتور</option>
              <option value="sell">فقط فروش (سرخ)</option>
              <option value="buy">فقط خرید (آبی)</option>
            </select>
            <select
              value={filterCurrency}
              onChange={e => setFilterCurrency(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="all">همه ارزها</option>
              <option value="AFN">افغانی (AFN)</option>
              <option value="USD">دلار (USD)</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'transactions' ? (
        /* DETAILED TRANSACTIONS VIEW */
        <TransactionsLedgerView
          onViewInvoice={onViewInvoice}
          onOpenPaymentModal={onOpenPaymentModal}
        />
      ) : activeTab === 'create' ? (
        /* CREATE INVOICE FORM */
        <form onSubmit={handleSubmitInvoice} className="space-y-6">
          <div
            className={`rounded-2xl border p-6 transition-all ${
              invoiceType === 'sell'
                ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                : 'bg-blue-50/40 border-blue-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                    invoiceType === 'sell' ? 'bg-rose-600' : 'bg-blue-600'
                  }`}
                >
                  {invoiceType === 'sell' ? <ShoppingCart className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {invoiceType === 'sell' ? 'صدور فاکتور فروش کالا' : 'ثبت فاکتور خرید کالا'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    محاسبه خودکار تن و کیسه • تسویه نقدی مستقیم به صندوق یا قرضه به افغانی و دلار
                  </p>
                </div>
              </div>

              {/* Type toggle */}
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceType('sell');
                    setInvoiceNumber(getNextInvoiceNumber('sell'));
                  }}
                  className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                    invoiceType === 'sell' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-700'
                  }`}
                >
                  فروش کالا (سرخ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceType('buy');
                    setInvoiceNumber(getNextInvoiceNumber('buy'));
                  }}
                  className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                    invoiceType === 'buy' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700'
                  }`}
                >
                  خرید کالا (آبی)
                </button>
              </div>
            </div>

            {/* Top metadata grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    شماره فاکتور (مسلسل خودکار)
                  </label>
                  <button
                    type="button"
                    onClick={() => setInvoiceNumber(getNextInvoiceNumber(invoiceType))}
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold cursor-pointer"
                    title="تولید مجدد شماره مسلسل"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>تولید خودکار</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 tracking-wider"
                  placeholder={invoiceType === 'sell' ? 'Inv0001' : 'Pur0001'}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ سند</label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>

              {/* Searchable Customer/Supplier Selector with live search and quick add button */}
              <div>
                <PartySearchSelector
                  parties={parties}
                  selectedPartyId={selectedPartyId}
                  onSelect={partyId => setSelectedPartyId(partyId)}
                  onAddNewParty={() => setIsQuickPartyModalOpen(true)}
                  label={invoiceType === 'sell' ? 'خریدار / مشتری' : 'فروشنده / تأمین‌کننده'}
                  roleType={invoiceType === 'sell' ? 'customer' : 'supplier'}
                  activeCurrency={currency}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {invoiceType === 'sell' ? 'گدام مبدا (کسر موجودی)' : 'گدام مقصد (افزایش موجودی)'}
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={e => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
                  required
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.type !== 'standard' ? '(امانی)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency Selector Banner */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">ارز مبنای فاکتور:</span>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('AFN')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      currency === 'AFN'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    افغانی (AFN ؋)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      currency === 'USD'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    دلار آمریکا (USD $)
                  </button>
                </div>
                <button
                  type="button"
                  id="btn-toggle-currency-sales-purchase-banner"
                  onClick={handleToggleCurrency}
                  title={`تبدیل لحظه‌ای مبالغ بین دلار و افغانی با نرخ روز سیستم ($۱ = ${formatNumber(currencies?.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate || 65)} افغانی)`}
                  className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تغییر ارز ({currency === 'USD' ? 'تبدیل به افغانی ؋' : 'تبدیل به دلار $'})</span>
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                نرخ برابری روز: $۱ = {formatNumber(currencies?.find(c => c.code === 'USD')?.exchangeRateToAFN || cashRegister.usdToAfnRate)} افغانی
              </span>
            </div>
          </div>

          {/* ITEM BUILDER CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>افزودن کالا به فاکتور (تن / کیسه)</span>
            </h3>

            {/* Inputs row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-5">
              {/* Product with Search */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">نام یا کد کالا (جستجو و تایپ)</label>
                <ProductSearchSelector
                  compact
                  products={products}
                  selectedProductId={selectedProductId}
                  warehouseId={selectedWarehouseId}
                  currency={currency}
                  priceType={invoiceType}
                  placeholder="جستجو و تایپ نام یا کد کالا..."
                  onSelectProduct={(p) => handleProductChange(p.id)}
                  onClear={() => {
                    setSelectedProductId('');
                    setItemUnitPrice(0);
                  }}
                />
              </div>

              {/* Unit: Ton or Bag */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">واحد سنجش</label>
                <select
                  value={itemUnit}
                  onChange={e => handleUnitChange(e.target.value as Unit)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
                >
                  <option value="ton">تن (Ton)</option>
                  <option value="bag">کیسه / بوجی (Bag)</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  تعداد ({itemUnit === 'ton' ? 'تن' : 'کیسه'})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={itemQuantity}
                  onChange={e => setItemQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  قیمت فی ({currency === 'AFN' ? 'افغانی' : 'دلار'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={itemUnitPrice}
                  onChange={e => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Item Note / Truck / Consignment */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  توضیحات قلم (موتر / بارنامه)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً موتر ۳۴۰۵ هرات"
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              {/* Live Preview Info & Add Button */}
              <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-between pt-2 border-t border-slate-200/60">
                {(() => {
                  const prod = products.find(p => p.id === selectedProductId);
                  const bpt = prod?.bagsPerTon || 20;
                  const { bags, tons } = calculateBagsAndTons(itemQuantity, itemUnit, bpt);
                  const sub = itemQuantity * itemUnitPrice;
                  return (
                    <div className="text-xs text-slate-600 flex items-center gap-4">
                      <span>
                        معادل: <strong className="text-emerald-700">{formatNumber(tons)} تن</strong> ={' '}
                        <strong className="text-blue-700">{formatNumber(bags)} کیسه</strong> (هر تن {bpt} کیسه)
                      </span>
                      <span>
                        مبلغ قلم: <strong className="text-slate-900 font-mono">{formatCurrency(sub, currency)}</strong>
                      </span>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن به فاکتور</span>
                </button>
              </div>
            </div>

            {/* Added Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs text-slate-400 font-medium">
                  هنوز هیچ کالایی به فاکتور اضافه نشده است. کالا و مقدار را انتخاب و دکمه افزودن را بزنید.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ردیف</th>
                      <th className="px-4 py-3">شرح کالا</th>
                      <th className="px-4 py-3">واحد معامله</th>
                      <th className="px-4 py-3">مقدار (تن / کیسه)</th>
                      <th className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span>قیمت فی ({currency})</span>
                          <button
                            type="button"
                            onClick={handleToggleCurrency}
                            title="تغییر ارز و تبدیل لحظه‌ای مبالغ بین دلار و افغانی"
                            className="px-1.5 py-0.5 text-[10px] font-black rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition flex items-center gap-0.5 cursor-pointer border border-emerald-300/80 shadow-2xs active:scale-95"
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                            <span>تغییر ارز</span>
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3">توضیحات قلم</th>
                      <th className="px-4 py-3">مبلغ کل ({currency})</th>
                      <th className="px-4 py-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{it.productName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            {it.unit === 'ton' ? 'تن' : 'کیسه'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                          <span className="text-[11px] text-slate-400 mr-1.5">
                            ({it.unit === 'ton' ? `${formatNumber(it.bagsCount)} کیسه` : `${formatNumber(it.tonsCount)} تن`})
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {formatNumber(it.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {it.description || '---'}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(it.totalPrice, currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TOTALS & PAYMENT SETTLEMENT CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  توضیحات و یادداشت فاکتور (اختیاری)
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثال: تحویل درب گدام کابل، شماره موتر باربری ۵۴۲۱، تسویه باقی تا آخر ماه..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
                />
              </div>

              {/* Settlement summary */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">مجموع ناخالص:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">تخفیف:</span>
                  <div className="w-36">
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 text-left"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">مبلغ خالص فاکتور:</span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">پرداخت نقدی (صندوق):</span>
                  <div className="w-36">
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1 bg-white border border-emerald-300 rounded text-xs font-mono font-bold text-emerald-700 text-left"
                    />
                  </div>
                </div>

                {paidAmount > 0 && (
                  <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-700" />
                        <span>
                          {invoiceType === 'sell'
                            ? 'صندوق دریافت و واریز نقدی:'
                            : 'صندوق پرداخت و برداشت نقدی:'}
                        </span>
                      </label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-medium">
                        واریز مستقیم لحظه‌ای
                      </span>
                    </div>

                    <select
                      value={selectedCashAccountId}
                      onChange={e => setSelectedCashAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-emerald-600 cursor-pointer"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} [{acc.currency === 'AFN' ? 'افغانی ؋' : 'دلار $'}] — موجودی فعلی: {formatCurrency(acc.balance, acc.currency)}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-emerald-800 leading-tight">
                      مبلغ نقد فاکتور ({formatCurrency(paidAmount, currency)}) بلافاصله در موجودی این صندوق اعمال شده و در صورتحساب گردش صندوق ثبت می‌شود.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 bg-white p-2.5 rounded-lg">
                  <span className="font-bold text-rose-600">باقیمانده حساب (قرضه / نسیه):</span>
                  <span className="font-mono font-black text-rose-600 text-base">
                    {formatCurrency(balanceAmount, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
              >
                انصراف
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer ${
                  invoiceType === 'sell' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                ثبت و صدور نهایی فاکتور ({invoiceType === 'sell' ? 'فروش' : 'خرید'})
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* INVOICES LIST */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">شماره فاکتور</th>
                  <th className="px-5 py-3.5">تاریخ</th>
                  <th className="px-5 py-3.5">نوع سند</th>
                  <th className="px-5 py-3.5">طرف حساب</th>
                  <th className="px-5 py-3.5">کالاها و مقدار</th>
                  <th className="px-5 py-3.5">مبلغ کل</th>
                  <th className="px-5 py-3.5">نقدی / باقیمانده</th>
                  <th className="px-5 py-3.5">وضعیت</th>
                  <th className="px-5 py-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      هیچ فاکتوری با شرایط انتخابی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const totalTons = inv.items.reduce((s, it) => s + it.tonsCount, 0);
                    const totalBags = inv.items.reduce((s, it) => s + it.bagsCount, 0);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoiceForDetail(inv)}
                        className="hover:bg-emerald-50/50 cursor-pointer transition group"
                        title="جهت مشاهده جزئیات اقلام و قیمت‌ها کلیک کنید"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                          <span className="underline decoration-dotted underline-offset-4">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-mono">{inv.date}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                              inv.type === 'sell'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {inv.type === 'sell' ? 'فروش' : 'خرید'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">{inv.partyName}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {inv.items.map(it => it.productName).join(' + ')}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatNumber(totalTons)} تن ({formatNumber(totalBags)} کیسه)
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-black text-slate-900 text-sm">
                          {formatCurrency(inv.totalAmount, inv.currency)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-emerald-700 font-mono font-bold">
                            نقدی: {formatCurrency(inv.paidAmount, inv.currency)}
                          </div>
                          {inv.balanceAmount > 0 && (
                            <div className="text-rose-600 font-mono font-bold text-[11px] mt-0.5">
                              قرض: {formatCurrency(inv.balanceAmount, inv.currency)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              inv.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.paymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {inv.paymentStatus === 'paid'
                              ? 'تسویه شده'
                              : inv.paymentStatus === 'partial'
                              ? 'پرداخت قسمتی'
                              : 'نسیه'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoiceForDetail(inv)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="مشاهده اقلام و قیمت‌ها در فرم شیک"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>جزئیات</span>
                            </button>
                            <button
                              onClick={() => onViewInvoice(inv.id)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="چاپ رسمی فاکتور"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('آیا از حذف این فاکتور اطمینان دارید؟')) {
                                  deleteInvoice(inv.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
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
      )}

      {/* DETAILED INVOICE MODAL (FORM SHIK) */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForDetail}
        isOpen={!!selectedInvoiceForDetail}
        onClose={() => setSelectedInvoiceForDetail(null)}
        onPrint={inv => onViewInvoice(inv.id)}
        onOpenPayment={onOpenPaymentModal}
      />

      {/* QUICK ADD PARTY MODAL */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        onPartyCreated={newParty => {
          setSelectedPartyId(newParty.id);
        }}
        defaultType={invoiceType === 'sell' ? 'customer' : 'supplier'}
        defaultCurrency={currency}
      />
    </div>
  );
};
