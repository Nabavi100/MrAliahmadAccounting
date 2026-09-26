import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Product, ProductCategory } from '../types';
import { formatNumber, formatCurrency } from '../utils/formatters';
import { ProductCardexModal } from './ProductCardexModal';
import { ProductSalesAnalysis } from './ProductSalesAnalysis';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Scale,
  DollarSign,
  Boxes,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  Tag,
  Layers,
  FolderPlus,
  Printer,
  Warehouse as WarehouseIcon,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

interface ProductsViewProps {
  onViewInvoice?: (id: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onViewInvoice }) => {
  const {
    products,
    productCategories,
    addProductCategory,
    updateProductCategory,
    deleteProductCategory,
    getNextProductCode,
    warehouses,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductStock,
    stocks,
    openPrintModal,
  } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForCardex, setSelectedProductForCardex] = useState<Product | null>(null);
  const [selectedProductForSales, setSelectedProductForSales] = useState<Product | null>(null);
  const [isGlobalSalesAnalysisOpen, setIsGlobalSalesAnalysisOpen] = useState(false);

  const handlePrintAllInventory = () => {
    const filteredProducts = products.filter(p => {
      if (selectedCategoryFilter !== 'all' && p.categoryId !== selectedCategoryFilter && p.category !== selectedCategoryFilter) return false;
      if (searchQuery && !p.name.includes(searchQuery) && !p.code?.includes(searchQuery)) return false;
      return true;
    });

    const whName = selectedWarehouseFilter === 'all'
      ? 'تمامی گدام‌ها'
      : warehouses.find(w => w.id === selectedWarehouseFilter)?.name || 'گدام انتخابی';

    const catName = selectedCategoryFilter === 'all'
      ? 'همه گروه‌های کالا'
      : productCategories.find(c => c.id === selectedCategoryFilter)?.name || selectedCategoryFilter;

    const matchingStocks = stocks.filter(stk => {
      if (selectedWarehouseFilter !== 'all' && stk.warehouseId !== selectedWarehouseFilter) return false;
      if (!filteredProducts.some(p => p.id === stk.productId)) return false;
      return true;
    });

    openPrintModal({
      type: 'products_inventory_report',
      inventoryProducts: filteredProducts,
      inventoryStocks: matchingStocks,
      selectedWarehouseName: whName,
      selectedCategoryName: catName,
      title: 'گزارش جامع موجودی فیزیکی و ارزش کالاها در گدام‌ها',
      subtitle: `گدام: ${whName} • دسته‌بندی: ${catName}`,
    });
  };

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Escape key handler for add/edit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isCategoryModalOpen) setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isCategoryModalOpen]);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [category, setCategory] = useState('گروه سیمان');
  const [bagWeightKg, setBagWeightKg] = useState<number>(50);
  const [buyPriceAFN, setBuyPriceAFN] = useState<number>(30000);
  const [buyPriceUSD, setBuyPriceUSD] = useState<number>(400);
  const [sellPriceAFN, setSellPriceAFN] = useState<number>(35000);
  const [sellPriceUSD, setSellPriceUSD] = useState<number>(450);
  const [minStockTons, setMinStockTons] = useState<number>(5);

  // Initial stock fields (ثبت اول دوره کالا)
  const [initialWarehouseId, setInitialWarehouseId] = useState<string>('');
  const [initialStockTons, setInitialStockTons] = useState<number>(0);
  const [initialStockBags, setInitialStockBags] = useState<number>(0);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(getNextProductCode());
    const defaultCat = productCategories[0]?.name || 'گروه سیمان';
    const defaultCatId = productCategories[0]?.id || '';
    setCategory(defaultCat);
    setCategoryId(defaultCatId);
    setBagWeightKg(50);
    setBuyPriceAFN(30000);
    setBuyPriceUSD(400);
    setSellPriceAFN(35000);
    setSellPriceUSD(450);
    setMinStockTons(5);
    setInitialWarehouseId(warehouses[0]?.id || '');
    setInitialStockTons(0);
    setInitialStockBags(0);
    setIsAddModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCode(prod.code);
    setCategory(prod.category);
    setCategoryId(prod.categoryId || '');
    setBagWeightKg(prod.bagWeightKg);
    setBuyPriceAFN(prod.buyPriceAFN);
    setBuyPriceUSD(prod.buyPriceUSD);
    setSellPriceAFN(prod.sellPriceAFN);
    setSellPriceUSD(prod.sellPriceUSD);
    setMinStockTons(prod.minStockTons);
    setInitialWarehouseId(prod.initialWarehouseId || warehouses[0]?.id || '');
    setInitialStockTons(prod.initialStockTons || 0);
    setInitialStockBags(prod.initialStockBags || 0);
    setIsAddModalOpen(true);
  };

  const handleTonsChange = (val: number) => {
    setInitialStockTons(val);
    const bagsPerTon = 1000 / (bagWeightKg || 50);
    setInitialStockBags(Math.round(val * bagsPerTon));
  };

  const handleBagsChange = (val: number) => {
    setInitialStockBags(val);
    const bagsPerTon = 1000 / (bagWeightKg || 50);
    setInitialStockTons(parseFloat((val / bagsPerTon).toFixed(3)));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        code,
        category,
        categoryId: categoryId || undefined,
        bagWeightKg,
        buyPriceAFN,
        buyPriceUSD,
        sellPriceAFN,
        sellPriceUSD,
        minStockTons,
      });
    } else {
      addProduct({
        name,
        code: code || getNextProductCode(),
        category,
        categoryId: categoryId || undefined,
        bagWeightKg,
        buyPriceAFN,
        buyPriceUSD,
        sellPriceAFN,
        sellPriceUSD,
        minStockTons,
        initialWarehouseId: initialStockTons > 0 ? initialWarehouseId : undefined,
        initialStockTons: initialStockTons > 0 ? initialStockTons : undefined,
        initialStockBags: initialStockBags > 0 ? initialStockBags : undefined,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const added = addProductCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
    });
    setCategory(added.name);
    setCategoryId(added.id);
    setNewCatName('');
    setNewCatDesc('');
    setIsCategoryModalOpen(false);
  };

  const productStockStats = products.map(p => {
    const stock = getProductStock(p.id);
    const minThreshold = p.minStockTons !== undefined && p.minStockTons !== null ? p.minStockTons : 5;
    const isOutOfStock = stock.tons <= 0;
    const isLow = !isOutOfStock && stock.tons <= minThreshold;
    const isOk = stock.tons > minThreshold;
    const deficitTons = Math.max(0, parseFloat((minThreshold - stock.tons).toFixed(3)));
    const bagsPerTon = p.bagsPerTon || (1000 / (p.bagWeightKg || 50));
    const deficitBags = Math.round(deficitTons * bagsPerTon);
    return {
      product: p,
      stock,
      minThreshold,
      isOutOfStock,
      isLow,
      isOk,
      deficitTons,
      deficitBags,
    };
  });

  const lowStockItems = productStockStats.filter(s => s.isOutOfStock || s.isLow);

  // Category Stock Summary: موجودی هر گروه
  const categoryStockSummary = React.useMemo(() => {
    const catMap = new Map<string, {
      id?: string;
      name: string;
      productCount: number;
      totalTons: number;
      totalBags: number;
    }>();

    productCategories.forEach(c => {
      catMap.set(c.name, {
        id: c.id,
        name: c.name,
        productCount: 0,
        totalTons: 0,
        totalBags: 0,
      });
    });

    products.forEach(p => {
      const catName = p.category?.trim() || 'عمومی';
      if (!catMap.has(catName)) {
        catMap.set(catName, {
          id: p.categoryId,
          name: catName,
          productCount: 0,
          totalTons: 0,
          totalBags: 0,
        });
      }
      const item = catMap.get(catName)!;
      item.productCount += 1;

      const stk = getProductStock(
        p.id,
        selectedWarehouseFilter === 'all' ? undefined : selectedWarehouseFilter
      );
      item.totalTons += stk.tons;
      item.totalBags += stk.bags;
    });

    return Array.from(catMap.values()).sort((a, b) => b.totalTons - a.totalTons);
  }, [productCategories, products, selectedWarehouseFilter, getProductStock]);

  const filteredProducts = productStockStats.filter(({ product: p, isOutOfStock, isLow, isOk }) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category filter
    if (selectedCategoryFilter !== 'all') {
      if (p.category !== selectedCategoryFilter && p.categoryId !== selectedCategoryFilter) {
        return false;
      }
    }

    // Status filter
    if (stockFilter === 'low') {
      return isOutOfStock || isLow;
    }
    if (stockFilter === 'ok') {
      return isOk;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>تعریف کالاها و مدیریت موجودی و نقطه سفارش</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم مشخصات کالا، دسته‌بندی‌ها (گروه سیمان، گچ روی کار، گچ زیرکار، سیمان سفید، پودر سنگ...)، حد نصاب هشدار و نرخ‌ها
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی کالا یا گروه..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs w-52 md:w-60 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Warehouse Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedWarehouseFilter}
              onChange={e => setSelectedWarehouseFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">همه گدام‌ها</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrintAllInventory}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-black transition border border-indigo-200 cursor-pointer shadow-2xs"
            title="چاپ رسمی فهرست و موجودی تمامی کالاها با فیلتر"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>چاپ موجودی کالاها</span>
          </button>

          <button
            onClick={() => setIsGlobalSalesAnalysisOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-black transition border border-rose-200 cursor-pointer shadow-2xs"
            title="تحلیل و مشخص کردن فروشات روزانه، ماهانه و سالانه کالاها"
          >
            <BarChart2 className="w-4 h-4 text-rose-600" />
            <span>فروشات روزانه، ماهانه و سالانه</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
            title="مدیریت و تعریف گروه‌های کالایی"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>دسته‌بندی‌ها ({productCategories.length})</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ تعریف کالای جدید</span>
          </button>
        </div>
      </div>

      {/* موجودی هر گروه: نمایش تعداد باقیمانده هر گروه در زیر جمله */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>موجودی هر گروه</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                  {categoryStockSummary.length} گروه
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تعداد و تناژ باقیمانده کالاهای هر گروه به همراه فیلتر سریع
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCategoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>نمایش همه گروه‌ها</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer font-bold px-2 py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مدیریت گروه‌ها</span>
            </button>
          </div>
        </div>

        {/* کارت‌های تعداد باقیمانده هر گروه در زیر جمله */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
              selectedCategoryFilter === 'all'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>همه گروه‌ها</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{products.length} کالا</span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-baseline justify-between text-[11px]">
              <span className="text-slate-500 font-medium">باقیمانده کل:</span>
              <span className="font-mono font-black text-slate-900">
                {formatNumber(categoryStockSummary.reduce((sum, c) => sum + c.totalTons, 0))} <span className="text-[10px] font-sans">تن</span>
              </span>
            </div>
          </button>

          {categoryStockSummary.map(cat => {
            const isSelected = selectedCategoryFilter === cat.name;
            const isZero = cat.totalTons <= 0;
            return (
              <button
                type="button"
                key={cat.name}
                id={`product-cat-card-${cat.name.replace(/\s+/g, '-')}`}
                onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.name)}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                    : isZero
                    ? 'bg-rose-50/40 hover:bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-2xs border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 truncate">
                  <span className="truncate flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isZero ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 mr-1 font-bold">
                    {cat.productCount} کالا
                  </span>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/70 space-y-0.5">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">تعداد باقیمانده:</span>
                    <span className="font-mono font-black text-slate-900">
                      {formatNumber(cat.totalTons)} <span className="text-[10px] font-sans">تن</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>کیسه:</span>
                    <span className="font-mono font-bold text-slate-600">
                      {formatNumber(cat.totalBags)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Categories Horizontal Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>فیلتر سریع بر اساس گروه محصول:</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedCategoryFilter === 'all' ? 'همه گروه‌ها فعال است' : `فیلتر روی «${selectedCategoryFilter}»`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه گروه‌ها ({products.length})
          </button>
          {categoryStockSummary.map(cat => {
            const isSelected = selectedCategoryFilter === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {formatNumber(cat.totalTons)} تن
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Low Stock Alert Notification Card */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300/90 rounded-2xl p-4.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm flex items-center gap-2">
                <span>هشدار موجودی پایین ({lowStockItems.length} قلم کالا زیر نقطه سفارش)</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                موجودی کالاهای دارای برچسب هشدار از حداقل تعیین‌شده کمتر است. جهت مشاهده سریع، از فیلتر زیر استفاده نمایید.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                stockFilter === 'low'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{stockFilter === 'low' ? 'نمایش همه کالاها' : 'فیلتر کالاهای دارای کسری'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStockFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            stockFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          همه وضعیت‌ها ({products.length})
        </button>
        <button
          onClick={() => setStockFilter('low')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            stockFilter === 'low'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>نیازمند سفارش / هشدار کسری ({lowStockItems.length})</span>
        </button>
        <button
          onClick={() => setStockFilter('ok')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            stockFilter === 'ok'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>موجودی کافی ({products.length - lowStockItems.length})</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">کد و نام محصول</th>
                <th className="px-5 py-3.5">دسته‌بندی</th>
                <th className="px-5 py-3.5">مشخصات کیسه در تن</th>
                <th className="px-5 py-3.5">قیمت خرید (تن)</th>
                <th className="px-5 py-3.5">قیمت فروش (تن)</th>
                <th className="px-5 py-3.5">حد نصاب هشدار (نقطه سفارش)</th>
                <th className="px-5 py-3.5">موجودی فعلی کل انبارها</th>
                <th className="px-5 py-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(({ product: p, stock, minThreshold, isOutOfStock, isLow, deficitTons, deficitBags }) => {
                return (
                  <tr
                    key={p.id}
                    className={`transition ${
                      isOutOfStock
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : isLow
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">
                        وزن کیسه: <span className="font-mono">{p.bagWeightKg} kg</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        هر تن = <span className="font-mono">{p.bagsPerTon}</span> کیسه
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-slate-800">{formatCurrency(p.buyPriceAFN, 'AFN')}</div>
                      <div className="text-[11px] text-slate-500 font-bold">${p.buyPriceUSD}</div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-emerald-700">{formatCurrency(p.sellPriceAFN, 'AFN')}</div>
                      <div className="text-[11px] text-emerald-600 font-bold">${p.sellPriceUSD}</div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-slate-800">{minThreshold} تن</div>
                      <div className="text-[10px] text-slate-500">
                        ({Math.round(minThreshold * (p.bagsPerTon || 20))} کیسه)
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-black text-slate-900 text-sm">
                            {formatNumber(stock.tons)} تن
                          </div>
                          <div className="text-[11px] text-slate-500 font-bold">
                            ({formatNumber(stock.bags)} کیسه)
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mr-2">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                              <span>❌ ناموجود</span>
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex flex-col text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                              <span className="flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>هشدار موجودی کم</span>
                              </span>
                              <span className="text-[9px] text-rose-700 font-normal">
                                کسری: {deficitTons} تن
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مطلوب</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProductForCardex(p)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-blue-200"
                          title="مشاهده کارتکس گردش و تراکنش‌های خرید و فروش این کالا"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>کارتکس کالا</span>
                        </button>
                        <button
                          onClick={() => setSelectedProductForSales(p)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-rose-200"
                          title="مشاهده فروشات روزانه، ماهانه و سالانه این کالا"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                          <span>فروشات کالا</span>
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف محصول ${p.name} اطمینان دارید؟`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-hidden">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'ویرایش اطلاعات کالا' : 'تعریف کالای جدید'}
              </h3>
              <button
                id="product-form-modal-close-btn"
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                title="بستن فرم (ESC)"
              >
                <X className="w-4 h-4" />
                <span>بستن (ESC)</span>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام محصول *</label>
                  <input
                    type="text"
                    placeholder="مثال: سیمان تیپ ۵ فله، گچ سفید صالحی، پودر سنگ البرز..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">کد کالا (مسلسل)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">دسته‌بندی (گروه)</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>+ گروه جدید</span>
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={e => {
                      const selectedName = e.target.value;
                      setCategory(selectedName);
                      const found = productCategories.find(c => c.name === selectedName);
                      setCategoryId(found ? found.id : '');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  >
                    {productCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="سایر کالاها">سایر کالاها</option>
                  </select>
                </div>
              </div>

              {/* Bag Weight Configuration */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900">
                    وزن هر کیسه به کیلوگرم (kg)
                  </label>
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    هر تن = {Math.round(1000 / (bagWeightKg || 50))} کیسه
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={bagWeightKg}
                  onChange={e => setBagWeightKg(parseFloat(e.target.value) || 50)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                  required
                />
                <p className="text-[10px] text-emerald-800">
                  این عدد مبنای تبدیل خودکار تعداد کیسه به تن و برعکس در هنگام خرید و فروش خواهد بود.
                </p>
              </div>

              {/* Default Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت خرید به تن (افغانی)</label>
                  <input
                    type="number"
                    value={buyPriceAFN}
                    onChange={e => setBuyPriceAFN(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت فروش به تن (افغانی)</label>
                  <input
                    type="number"
                    value={sellPriceAFN}
                    onChange={e => setSellPriceAFN(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت خرید به تن (دلار)</label>
                  <input
                    type="number"
                    value={buyPriceUSD}
                    onChange={e => setBuyPriceUSD(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت فروش به تن (دلار)</label>
                  <input
                    type="number"
                    value={sellPriceUSD}
                    onChange={e => setSellPriceUSD(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Minimum Stock Threshold for Alerts */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>حد نصاب هشدار موجودی پایین (نقطه سفارش به تن) *</span>
                  </label>
                  <span className="text-xs font-bold text-amber-800 font-mono">
                    معادل {Math.round(minStockTons * (1000 / (bagWeightKg || 50)))} کیسه
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={minStockTons}
                  onChange={e => setMinStockTons(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
                <p className="text-[10px] text-amber-800">
                  هرگاه موجودی کل این کالا در انبارها کمتر یا مساوی این مقدار شود، سیستم در داشبورد و گزارشات هشدار کسری و سفارش خرید صادر خواهد کرد.
                </p>
              </div>

              {/* Opening Stock Definition (ثبت موجودی اول دوره کالا) */}
              {!editingProduct && (
                <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                      <Boxes className="w-4 h-4 text-blue-600" />
                      <span>ثبت موجودی اول دوره کالا در انبار</span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">اختیاری</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1">انبار یا گدام مقصد</label>
                      <select
                        value={initialWarehouseId}
                        onChange={e => setInitialWarehouseId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                      >
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.type === 'consignment' ? '(امانی)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1">مقدار اول دوره (تن)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={initialStockTons || ''}
                        onChange={e => handleTonsChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1">تعداد بوجی (کیسه)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={initialStockBags || ''}
                        onChange={e => handleBagsChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-800">
                    در صورت وارد کردن مقدار موجودی اول دوره، کالا به صورت خودکار با این موجودی اولیه در انبار مربوطه ثبت خواهد شد.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {editingProduct ? 'ذخیره کالا' : 'افزودن کالا'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">مدیریت دسته‌بندی‌ها و گروه‌های کالا</h3>
                  <p className="text-[11px] text-slate-500">تعریف گروه‌های سیمان، گچ، پودر سنگ و سایر مصالح</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 text-xs font-bold shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddCategorySubmit} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-emerald-600" />
                <span>افزودن دسته‌بندی / گروه جدید</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نام گروه *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: گروه گچ روی کار"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">توضیحات (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثلاً: انواع گچ سفید کاری و پرداخت"
                    value={newCatDesc}
                    onChange={e => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت گروه کالایی جدید</span>
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>گروه‌های ثبت‌شده ({productCategories.length}):</span>
                <span className="text-[11px] text-slate-400">امکان ویرایش و حذف</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                {productCategories.map(cat => {
                  const count = products.filter(p => p.category === cat.name || p.categoryId === cat.id).length;
                  return (
                    <div key={cat.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{cat.name}</div>
                          {cat.description && (
                            <div className="text-[10px] text-slate-400">{cat.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {count} کالا
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTitle = prompt('نام جدید برای این گروه را وارد کنید:', cat.name);
                            if (newTitle && newTitle.trim()) {
                              updateProductCategory(cat.id, { name: newTitle.trim() });
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="ویرایش نام گروه"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`آیا از حذف گروه «${cat.name}» مطمئن هستید؟`)) {
                              deleteProductCategory(cat.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="حذف گروه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                بستن و اعمال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CARDEX MODAL */}
      <ProductCardexModal
        product={selectedProductForCardex}
        isOpen={!!selectedProductForCardex}
        onClose={() => setSelectedProductForCardex(null)}
        onViewInvoice={onViewInvoice}
      />

      {/* PRODUCT SALES ANALYSIS MODAL (فروشات روزانه، ماهانه و سالانه) */}
      {(selectedProductForSales || isGlobalSalesAnalysisOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {selectedProductForSales
                      ? `فروشات روزانه، ماهانه و سالانه: ${selectedProductForSales.name}`
                      : 'گزارش و تحلیل فروشات کالاها (روزانه • ماهانه • سالانه)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedProductForSales
                      ? `کد کالا: ${selectedProductForSales.code || '---'} • گروه: ${selectedProductForSales.category || 'عمومی'}`
                      : 'مشخص کردن فروشات یک یا چندین کالای انتخابی'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForSales(null);
                  setIsGlobalSalesAnalysisOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                title="بستن پنجره"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ProductSalesAnalysis
                initialProductId={selectedProductForSales?.id}
                onViewInvoice={onViewInvoice}
                isModal={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
