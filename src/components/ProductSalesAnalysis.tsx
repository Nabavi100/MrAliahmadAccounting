import React, { useState, useMemo, useRef } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Product, Invoice, InvoiceItem } from '../types';
import {
  formatNumber,
  formatCurrency,
  getPersianDate,
  normalizePersianDate,
  isDateInRange,
} from '../utils/formatters';
import {
  BarChart2,
  Calendar,
  Clock,
  TrendingUp,
  Boxes,
  Layers,
  Filter,
  Search,
  CheckSquare,
  Square,
  X,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  ArrowUpDown,
  Building2,
  Package,
  Eye,
  CalendarDays,
  Percent,
} from 'lucide-react';

interface ProductSalesAnalysisProps {
  initialProductId?: string;
  initialProductIds?: string[];
  isModal?: boolean;
  onClose?: () => void;
  onViewInvoice?: (id: string) => void;
}

// اسامی ماه‌های تقویم خورشیدی رسمی افغانستان و ایران
const PERSIAN_MONTH_NAMES: Record<string, string> = {
  '01': 'حمل (فروردین)',
  '02': 'ثور (اردیبهشت)',
  '03': 'جوزا (خرداد)',
  '04': 'سرطان (تیر)',
  '05': 'اسد (مرداد)',
  '06': 'سنبله (شهریور)',
  '07': 'میزان (مهر)',
  '08': 'عقرب (آبان)',
  '09': 'قوس (آذر)',
  '10': 'جدی (دی)',
  '11': 'دلو (بهمن)',
  '12': 'حوت (اسفند)',
};

export const ProductSalesAnalysis: React.FC<ProductSalesAnalysisProps> = ({
  initialProductId,
  initialProductIds,
  isModal = false,
  onClose,
  onViewInvoice,
}) => {
  const { products, invoices, warehouses, companySettings } = useAccounting();

  // -------------------------------------------------------------
  // حالت انتخاب کالاها: یک کالا (single) یا چندین کالا (multiple) یا همه (all)
  // -------------------------------------------------------------
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple' | 'all'>(() => {
    if (initialProductId) return 'single';
    if (initialProductIds && initialProductIds.length > 0) return 'multiple';
    return 'single';
  });

  // آیدی کالای تکی انتخاب شده
  const [selectedSingleProductId, setSelectedSingleProductId] = useState<string>(() => {
    if (initialProductId) return initialProductId;
    return products[0]?.id || '';
  });

  // لیست آیدی‌های چند کالای مشخص شده
  const [selectedMultipleProductIds, setSelectedMultipleProductIds] = useState<string[]>(() => {
    if (initialProductIds && initialProductIds.length > 0) return initialProductIds;
    if (initialProductId) return [initialProductId];
    return products.slice(0, 3).map(p => p.id);
  });

  // فیلتر متنی برای جستجوی سریع در لیست کالاها
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // -------------------------------------------------------------
  // بازه زمانی و دوره‌بندی: روزانه، ماهانه، سالانه
  // -------------------------------------------------------------
  const [timeBreakdown, setTimeBreakdown] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // فیلتر محدوده تاریخی (پیش‌فرض‌ها)
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'this_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // فیلتر ارز
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');

  // فیلتر گدام
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // ردیف بازشده برای مشاهده جزئیات فاکتورهای هر دوره
  const [expandedPeriodKey, setExpandedPeriodKey] = useState<string | null>(null);

  // تب نمایش: جدول تجمیع دوره‌ای یا ریز فاکتورها
  const [viewTab, setViewTab] = useState<'periods' | 'comparison' | 'invoices'>('periods');

  // مرتب‌سازی جدول
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'tons_desc' | 'afn_desc' | 'usd_desc'>('date_desc');

  // دسته‌بندی‌های موجود محصولات
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // کالاهای فیلتر شده برای چک‌باکس‌ها در انتخاب چندگانه
  const filteredProductsForSelection = useMemo(() => {
    return products.filter(p => {
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) return false;
      if (productSearchQuery.trim()) {
        const q = productSearchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
      }
      return true;
    });
  }, [products, selectedCategoryFilter, productSearchQuery]);

  // تعیین آیدی‌های قطعی کالاهای تحت بررسی بر اساس حالت انتخاب
  const activeProductIds = useMemo(() => {
    if (selectionMode === 'all') {
      return products.map(p => p.id);
    }
    if (selectionMode === 'single') {
      return selectedSingleProductId ? [selectedSingleProductId] : [];
    }
    return selectedMultipleProductIds;
  }, [selectionMode, selectedSingleProductId, selectedMultipleProductIds, products]);

  // آبجکت مپ برای دسترسی سریع به کالا
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  // تاریخ‌های واقعی اعمال شده بر اساس Preset
  const effectiveDateRange = useMemo(() => {
    const today = getPersianDate();
    if (datePreset === 'today') {
      return { from: today, to: today };
    }
    if (datePreset === 'this_month') {
      const parts = today.split('/');
      if (parts.length >= 2) {
        return { from: `${parts[0]}/${parts[1]}/01`, to: `${parts[0]}/${parts[1]}/31` };
      }
    }
    if (datePreset === 'this_year') {
      const parts = today.split('/');
      if (parts.length >= 1) {
        return { from: `${parts[0]}/01/01`, to: `${parts[0]}/12/29` };
      }
    }
    if (datePreset === 'last7') {
      // ۷ روز اخیر
      return { from: '', to: today, limitLast7: true };
    }
    if (datePreset === 'custom') {
      return { from: startDate, to: endDate };
    }
    return { from: '', to: '' };
  }, [datePreset, startDate, endDate]);

  // -------------------------------------------------------------
  // استخراج تمام اقلام فروش کالاهای مشخص شده
  // -------------------------------------------------------------
  interface ExtractedSaleItem {
    invoiceId: string;
    invoiceNumber: string;
    date: string;
    normalizedDate: string;
    partyId: string;
    partyName: string;
    currency: 'AFN' | 'USD';
    productId: string;
    productName: string;
    tons: number;
    bags: number;
    amount: number;
    unitPrice: number;
    unit: 'ton' | 'bag';
    warehouseId?: string;
  }

  const salesItems = useMemo(() => {
    const list: ExtractedSaleItem[] = [];
    const sellInvoices = invoices.filter(inv => inv.type === 'sell');

    sellInvoices.forEach(inv => {
      // فیلتر ارز
      if (currencyFilter !== 'all' && inv.currency !== currencyFilter) {
        return;
      }

      // فیلتر تاریخ
      if (effectiveDateRange.from || effectiveDateRange.to) {
        if (!isDateInRange(inv.date, effectiveDateRange.from, effectiveDateRange.to)) {
          return;
        }
      }

      const normalizedDate = normalizePersianDate(inv.date);

      inv.items.forEach(item => {
        // فیلتر کالاهای مشخص شده
        if (!activeProductIds.includes(item.productId)) {
          return;
        }

        // فیلتر گدام
        if (warehouseFilter !== 'all' && item.warehouseId && item.warehouseId !== warehouseFilter) {
          return;
        }

        const prod = productMap.get(item.productId);
        const bagsPerTon = prod?.bagsPerTon || 20;

        let tons = item.tonsCount || 0;
        let bags = item.bagsCount || 0;

        if (!tons && !bags) {
          if (item.unit === 'ton') {
            tons = item.quantity;
            bags = Math.round(item.quantity * bagsPerTon);
          } else {
            bags = item.quantity;
            tons = Number((item.quantity / bagsPerTon).toFixed(3));
          }
        }

        const amount = item.totalPrice || (item.quantity * item.unitPrice);

        list.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          normalizedDate,
          partyId: inv.partyId,
          partyName: inv.partyName,
          currency: (inv.currency as 'AFN' | 'USD') || 'AFN',
          productId: item.productId,
          productName: item.productName || prod?.name || 'کالای نامشخص',
          tons,
          bags,
          amount,
          unitPrice: item.unitPrice,
          unit: item.unit || 'ton',
          warehouseId: item.warehouseId,
        });
      });
    });

    return list;
  }, [invoices, activeProductIds, currencyFilter, effectiveDateRange, warehouseFilter, productMap]);

  // -------------------------------------------------------------
  // محاسبات تجمیعی کل (KPIs)
  // -------------------------------------------------------------
  const globalSummary = useMemo(() => {
    let totalTons = 0;
    let totalBags = 0;
    let totalAFN = 0;
    let totalUSD = 0;
    const invoiceIdsSet = new Set<string>();
    const partiesSet = new Set<string>();

    salesItems.forEach(it => {
      totalTons += it.tons;
      totalBags += it.bags;
      if (it.currency === 'AFN') {
        totalAFN += it.amount;
      } else {
        totalUSD += it.amount;
      }
      invoiceIdsSet.add(it.invoiceId);
      if (it.partyName) partiesSet.add(it.partyName);
    });

    // محاسبه میانگین نرخ فروش
    const avgRatePerTonAFN = totalTons > 0 && totalAFN > 0 ? Math.round(totalAFN / totalTons) : 0;
    const avgRatePerTonUSD = totalTons > 0 && totalUSD > 0 ? Number((totalUSD / totalTons).toFixed(1)) : 0;

    return {
      totalTons,
      totalBags,
      totalAFN,
      totalUSD,
      invoiceCount: invoiceIdsSet.size,
      partiesCount: partiesSet.size,
      avgRatePerTonAFN,
      avgRatePerTonUSD,
      itemsCount: salesItems.length,
    };
  }, [salesItems]);

  // -------------------------------------------------------------
  // گروه بندی دوره‌ای: روزانه، ماهانه، سالانه
  // -------------------------------------------------------------
  interface PeriodGroup {
    periodKey: string;
    periodLabel: string;
    periodSubLabel?: string;
    totalTons: number;
    totalBags: number;
    amountAFN: number;
    amountUSD: number;
    invoiceCount: number;
    itemsCount: number;
    parties: string[];
    productsSold: { productId: string; productName: string; tons: number; bags: number; amountAFN: number; amountUSD: number }[];
    items: ExtractedSaleItem[];
  }

  const groupedPeriods = useMemo(() => {
    const map = new Map<string, {
      periodKey: string;
      periodLabel: string;
      periodSubLabel?: string;
      totalTons: number;
      totalBags: number;
      amountAFN: number;
      amountUSD: number;
      invoiceIds: Set<string>;
      partiesSet: Set<string>;
      productMap: Map<string, { productId: string; productName: string; tons: number; bags: number; amountAFN: number; amountUSD: number }>;
      items: ExtractedSaleItem[];
    }>();

    salesItems.forEach(it => {
      let key = '';
      let label = '';
      let subLabel: string | undefined = undefined;

      const dateStr = it.normalizedDate || it.date || '';
      const parts = dateStr.split('/');

      if (timeBreakdown === 'daily') {
        // روزانه
        key = dateStr || 'نامشخص';
        label = key;
      } else if (timeBreakdown === 'monthly') {
        // ماهانه (سال/ماه)
        if (parts.length >= 2) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          key = `${y}/${m}`;
          const mName = PERSIAN_MONTH_NAMES[m] || `ماه ${m}`;
          label = `${mName} ${y}`;
          subLabel = `کد دوره: ${y}/${m}`;
        } else {
          key = dateStr || 'نامشخص';
          label = key;
        }
      } else {
        // سالانه (سال)
        if (parts.length >= 1 && parts[0].length === 4) {
          key = parts[0];
          label = `سال مالی ${key}`;
        } else {
          key = dateStr || 'نامشخص';
          label = key;
        }
      }

      if (!map.has(key)) {
        map.set(key, {
          periodKey: key,
          periodLabel: label,
          periodSubLabel: subLabel,
          totalTons: 0,
          totalBags: 0,
          amountAFN: 0,
          amountUSD: 0,
          invoiceIds: new Set<string>(),
          partiesSet: new Set<string>(),
          productMap: new Map(),
          items: [],
        });
      }

      const pGroup = map.get(key)!;
      pGroup.totalTons += it.tons;
      pGroup.totalBags += it.bags;
      if (it.currency === 'AFN') {
        pGroup.amountAFN += it.amount;
      } else {
        pGroup.amountUSD += it.amount;
      }
      pGroup.invoiceIds.add(it.invoiceId);
      if (it.partyName) pGroup.partiesSet.add(it.partyName);
      pGroup.items.push(it);

      // تفکیک کالاها درون این دوره
      if (!pGroup.productMap.has(it.productId)) {
        pGroup.productMap.set(it.productId, {
          productId: it.productId,
          productName: it.productName,
          tons: 0,
          bags: 0,
          amountAFN: 0,
          amountUSD: 0,
        });
      }
      const prodSub = pGroup.productMap.get(it.productId)!;
      prodSub.tons += it.tons;
      prodSub.bags += it.bags;
      if (it.currency === 'AFN') {
        prodSub.amountAFN += it.amount;
      } else {
        prodSub.amountUSD += it.amount;
      }
    });

    const result: PeriodGroup[] = Array.from(map.values()).map(g => ({
      periodKey: g.periodKey,
      periodLabel: g.periodLabel,
      periodSubLabel: g.periodSubLabel,
      totalTons: g.totalTons,
      totalBags: g.totalBags,
      amountAFN: g.amountAFN,
      amountUSD: g.amountUSD,
      invoiceCount: g.invoiceIds.size,
      itemsCount: g.items.length,
      parties: Array.from(g.partiesSet),
      productsSold: Array.from(g.productMap.values()),
      items: g.items,
    }));

    // مرتب سازی
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return b.periodKey.localeCompare(a.periodKey);
      }
      if (sortBy === 'date_asc') {
        return a.periodKey.localeCompare(b.periodKey);
      }
      if (sortBy === 'tons_desc') {
        return b.totalTons - a.totalTons;
      }
      if (sortBy === 'afn_desc') {
        return b.amountAFN - a.amountAFN;
      }
      if (sortBy === 'usd_desc') {
        return b.amountUSD - a.amountUSD;
      }
      return 0;
    });

    return result;
  }, [salesItems, timeBreakdown, sortBy]);

  // -------------------------------------------------------------
  // تفکیک و مقایسه کالا به کالا (برای حالت چند کالا یا همه کالاها)
  // -------------------------------------------------------------
  const perProductBreakdown = useMemo(() => {
    const map = new Map<string, {
      product: Product | undefined;
      productId: string;
      productName: string;
      category: string;
      totalTons: number;
      totalBags: number;
      amountAFN: number;
      amountUSD: number;
      invoiceCount: Set<string>;
    }>();

    salesItems.forEach(it => {
      if (!map.has(it.productId)) {
        const prod = productMap.get(it.productId);
        map.set(it.productId, {
          product: prod,
          productId: it.productId,
          productName: it.productName,
          category: prod?.category || 'عمومی',
          totalTons: 0,
          totalBags: 0,
          amountAFN: 0,
          amountUSD: 0,
          invoiceCount: new Set<string>(),
        });
      }
      const item = map.get(it.productId)!;
      item.totalTons += it.tons;
      item.totalBags += it.bags;
      if (it.currency === 'AFN') {
        item.amountAFN += it.amount;
      } else {
        item.amountUSD += it.amount;
      }
      item.invoiceCount.add(it.invoiceId);
    });

    return Array.from(map.values()).map(item => ({
      ...item,
      invoiceCount: item.invoiceCount.size,
      tonsShare: globalSummary.totalTons > 0 ? (item.totalTons / globalSummary.totalTons) * 100 : 0,
      afnShare: globalSummary.totalAFN > 0 ? (item.amountAFN / globalSummary.totalAFN) * 100 : 0,
      usdShare: globalSummary.totalUSD > 0 ? (item.amountUSD / globalSummary.totalUSD) * 100 : 0,
    })).sort((a, b) => b.totalTons - a.totalTons);
  }, [salesItems, productMap, globalSummary]);

  // عملیات انتخاب و لغو انتخاب چندگانه
  const toggleSelectMultipleProduct = (id: string) => {
    setSelectedMultipleProductIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllFilteredProducts = () => {
    const ids = filteredProductsForSelection.map(p => p.id);
    setSelectedMultipleProductIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelectedProducts = () => {
    setSelectedMultipleProductIds([]);
  };

  // خروجی CSV
  const handleExportCSV = () => {
    if (groupedPeriods.length === 0) return;
    const rows = [
      ['دوره زمانی', 'تناژ فروش (تن)', 'تعداد کیسه', 'مبلغ به افغانی', 'مبلغ به دلار', 'تعداد فاکتور', 'تعداد اقلام'],
      ...groupedPeriods.map(g => [
        `"${g.periodLabel}"`,
        g.totalTons.toFixed(2),
        g.totalBags,
        g.amountAFN,
        g.amountUSD,
        g.invoiceCount,
        g.itemsCount,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `product_sales_${timeBreakdown}_${getPersianDate().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // چاپ مستقیم
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${isModal ? 'p-6 max-h-[90vh] overflow-y-auto bg-slate-50 rounded-3xl' : ''}`}>
      {/* هدر اصلی ماژول */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                گزارش فروشات روزانه، ماهانه و سالانه کالاها
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-black">
                {timeBreakdown === 'daily' ? '📅 روزانه' : timeBreakdown === 'monthly' ? '🗓️ ماهانه' : '🏛️ سالانه'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تعیین و تفکیک دقیق فروش برای یک کالا یا چندین کالای مشخص شده در بازه‌های زمانی مختلف
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="دانلود فایل اکسل / CSV"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="چاپ رسمی این گزارش"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ گزارش</span>
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* پنل تنظیمات و فیلترهای اصلی: انتخاب کالا + دوره روزانه/ماهانه/سالانه */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        {/* ردیف ۱: انتخاب حالت کالا (تک کالا / چندین کالای مشخص / همه کالاها) */}
        <div className="space-y-3 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-rose-600" />
              <span>مرحله ۱: مشخص کردن کالا یا کالاها</span>
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setSelectionMode('single')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'single'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>یک کالا (تکی)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode('multiple')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'multiple'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>چندین کالای مشخص ({selectedMultipleProductIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectionMode === 'all'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>تمام کالاها ({products.length})</span>
              </button>
            </div>
          </div>

          {/* محتوای حالت ۱: انتخاب تک کالا */}
          {selectionMode === 'single' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  انتخاب کالای مورد نظر برای بررسی فروش:
                </label>
                <select
                  value={selectedSingleProductId}
                  onChange={e => setSelectedSingleProductId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(کد: ${p.code})` : ''} - دسته: {p.category || 'عمومی'}
                    </option>
                  ))}
                </select>
              </div>

              {/* کارت خلاصه کالای انتخاب شده */}
              {productMap.get(selectedSingleProductId) && (
                <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                    <span>{productMap.get(selectedSingleProductId)?.name}</span>
                    <span className="text-[10px] font-mono text-rose-700 font-bold">
                      وزن هر کیسه: {productMap.get(selectedSingleProductId)?.bagWeightKg} kg
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>نرخ فروش ثبت شده:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(productMap.get(selectedSingleProductId)?.sellPriceAFN || 0, 'AFN')} • ${productMap.get(selectedSingleProductId)?.sellPriceUSD || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* محتوای حالت ۲: انتخاب چندین کالای مشخص */}
          {selectionMode === 'multiple' && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      placeholder="جستجوی نام یا کد کالا..."
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <select
                    value={selectedCategoryFilter}
                    onChange={e => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
                  >
                    <option value="all">همه گروه‌ها</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFilteredProducts}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    + انتخاب همه ({filteredProductsForSelection.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedProducts}
                    className="text-xs text-slate-500 hover:text-rose-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    لغو همه انتخاب‌ها
                  </button>
                </div>
              </div>

              {/* برچسب‌های کالاهای انتخاب شده */}
              {selectedMultipleProductIds.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-rose-50/40 rounded-2xl border border-rose-100">
                  <span className="text-[11px] font-bold text-rose-900 ml-1">
                    کالاهای انتخاب شده ({selectedMultipleProductIds.length}):
                  </span>
                  {selectedMultipleProductIds.map(id => {
                    const prod = productMap.get(id);
                    if (!prod) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <span>{prod.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelectMultipleProduct(id)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* لیست چک‌باکس‌های کالاها */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {filteredProductsForSelection.map(prod => {
                  const isSelected = selectedMultipleProductIds.includes(prod.id);
                  return (
                    <button
                      type="button"
                      key={prod.id}
                      onClick={() => toggleSelectMultipleProduct(prod.id)}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="truncate pl-1">
                        <div className="text-xs truncate">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {prod.category || 'عمومی'} {prod.code ? `• ${prod.code}` : ''}
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* محتوای حالت ۳: همه کالاها */}
          {selectionMode === 'all' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>گزارش جامع تمام <strong>{products.length}</strong> قلم کالای موجود در سیستم آماده تفکیک است.</span>
              <span className="font-mono font-bold text-slate-800">۱۰۰٪ کالاها انتخاب شده</span>
            </div>
          )}
        </div>

        {/* ردیف ۲: انتخاب دوره‌بندی زمانی (روزانه • ماهانه • سالانه) و بازه تاریخی */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* بخش دوره تجمیع: روزانه / ماهانه / سالانه */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-rose-600" />
              <span>مرحله ۲: نحوه مشخص کردن فروشات (دوره)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTimeBreakdown('daily')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  timeBreakdown === 'daily'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>فروش روزانه</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeBreakdown('monthly')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  timeBreakdown === 'monthly'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>فروش ماهانه</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeBreakdown('yearly')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  timeBreakdown === 'yearly'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>فروش سالانه</span>
              </button>
            </div>
          </div>

          {/* فیلتر محدوده تاریخی */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-rose-600" />
              <span>محدوده زمانی اسناد:</span>
            </label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">همه زمان‌ها (تمام اسناد)</option>
              <option value="today">امروز ({getPersianDate()})</option>
              <option value="this_month">این ماه خورشیدی</option>
              <option value="this_year">امسال (سال جاری)</option>
              <option value="custom">بازه انتخابی دلخواه (از تاریخ تا تاریخ)</option>
            </select>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  placeholder="از تاریخ (مثلاً ۱۴۰۳/۰۱/۰۱)"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-center font-mono focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="تا تاریخ (مثلاً ۱۴۰۳/۱۲/۲۹)"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-center font-mono focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* فیلتر ارز و گدام */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">ارز معاملات:</label>
              <select
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:outline-none"
              >
                <option value="all">همه ارزها (AFN و $)</option>
                <option value="AFN">فقط افغانی (؋)</option>
                <option value="USD">فقط دلار ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">گدام مبدا:</label>
              <select
                value={warehouseFilter}
                onChange={e => setWarehouseFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:outline-none"
              >
                <option value="all">تمام گدام‌ها</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* شاخص‌های کلیدی (KPIs) برای کالاهای انتخاب شده در این بازه */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* کارت ۱: تناژ و کیسه فروخته شده */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs bg-gradient-to-br from-rose-50/40 via-white to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">حجم کل فروش</span>
            <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-2">
            {formatNumber(globalSummary.totalTons)} <span className="text-sm font-sans font-bold">تن</span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1 font-semibold">
            معادل <strong className="text-slate-800">{formatNumber(globalSummary.totalBags)}</strong> کیسه
          </div>
        </div>

        {/* کارت ۲: مجموع فروش افغانی */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">مجموع فروش به افغانی</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
            {formatCurrency(globalSummary.totalAFN, 'AFN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            میانگین نرخ: {globalSummary.avgRatePerTonAFN > 0 ? `${formatNumber(globalSummary.avgRatePerTonAFN)} ؋/تن` : '---'}
          </div>
        </div>

        {/* کارت ۳: مجموع فروش دلاری */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">مجموع فروش به دلار ($)</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono mt-2">
            {formatCurrency(globalSummary.totalUSD, 'USD')}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            میانگین نرخ: {globalSummary.avgRatePerTonUSD > 0 ? `$${globalSummary.avgRatePerTonUSD}/تن` : '---'}
          </div>
        </div>

        {/* کارت ۴: فاکتورها و خریداران */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">تعداد فاکتور و خریدار</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {globalSummary.invoiceCount} <span className="text-sm font-sans font-bold">فاکتور</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            عرضه شده به <strong className="text-slate-800">{globalSummary.partiesCount}</strong> خریدار مختلف
          </div>
        </div>
      </div>

      {/* تب‌های داخلی برای مشاهده: جدول دوره‌ای / سهم هر کالا / ریز فاکتورها */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTab('periods')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'periods'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>
              جدول فروش {timeBreakdown === 'daily' ? 'روزانه' : timeBreakdown === 'monthly' ? 'ماهانه' : 'سالانه'} ({groupedPeriods.length} دوره)
            </span>
          </button>

          {activeProductIds.length > 1 && (
            <button
              type="button"
              onClick={() => setViewTab('comparison')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewTab === 'comparison'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>تفکیک و سهم هر کالا ({perProductBreakdown.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'invoices'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ریز فاکتورهای فروش ({salesItems.length} ردیف)</span>
          </button>
        </div>

        {/* ابزار مرتب‌سازی */}
        {viewTab === 'periods' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">مرتب‌سازی:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="date_desc">تاریخ (جدیدترین اول)</option>
              <option value="date_asc">تاریخ (قدیمی‌ترین اول)</option>
              <option value="tons_desc">بیشترین تناژ فروش</option>
              <option value="afn_desc">بیشترین فروش افغانی</option>
              <option value="usd_desc">بیشترین فروش دلاری</option>
            </select>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* نما ۱: جدول تجمیع دوره‌ای (روزانه • ماهانه • سالانه) */}
      {/* --------------------------------------------------------------------- */}
      {viewTab === 'periods' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span>
                تفکیک فروش بر اساس دوره {timeBreakdown === 'daily' ? 'روزانه' : timeBreakdown === 'monthly' ? 'ماهانه' : 'سالانه'}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                (کلیک روی هر ردیف برای مشاهده ریز فاکتورها)
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              تعداد دوره‌ها: <strong className="text-slate-900">{groupedPeriods.length}</strong>
            </span>
          </div>

          {groupedPeriods.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              هیچ فروش ثبت شده‌ای برای کالای انتخابی در این بازه زمانی یافت نشد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">
                      {timeBreakdown === 'daily' ? 'تاریخ روز' : timeBreakdown === 'monthly' ? 'ماه و سال' : 'سال مالی'}
                    </th>
                    <th className="px-5 py-3.5">کالاهای فروخته شده</th>
                    <th className="px-5 py-3.5 text-center">تناژ فروش (تن)</th>
                    <th className="px-5 py-3.5 text-center">معادل کیسه</th>
                    <th className="px-5 py-3.5 text-left">فروش به افغانی</th>
                    <th className="px-5 py-3.5 text-left">فروش به دلار</th>
                    <th className="px-5 py-3.5 text-center">تعداد فاکتور</th>
                    <th className="px-5 py-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedPeriods.map(period => {
                    const isExpanded = expandedPeriodKey === period.periodKey;
                    return (
                      <React.Fragment key={period.periodKey}>
                        <tr
                          onClick={() => setExpandedPeriodKey(isExpanded ? null : period.periodKey)}
                          className={`cursor-pointer transition ${
                            isExpanded ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{period.periodLabel}</span>
                              {period.periodSubLabel && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {period.periodSubLabel}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            <div className="flex items-center gap-1 flex-wrap max-w-xs">
                              {period.productsSold.map(p => (
                                <span
                                  key={p.productId}
                                  className="text-[10.5px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                                >
                                  {p.productName}: <strong>{formatNumber(p.tons)}</strong> تن
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900 text-sm">
                            {formatNumber(period.totalTons)}
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono text-slate-600 font-bold">
                            {formatNumber(period.totalBags)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono font-black text-emerald-700">
                            {formatCurrency(period.amountAFN, 'AFN')}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono font-black text-blue-700">
                            {formatCurrency(period.amountUSD, 'USD')}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
                              {period.invoiceCount} فاکتور
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedPeriodKey(isExpanded ? null : period.periodKey);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                              title={isExpanded ? 'بستن جزئیات' : 'مشاهده فاکتورهای این دوره'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* ردیف باز شونده: ریز اقلام این دوره */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-rose-100">
                            <td colSpan={8} className="p-4">
                              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                  <span>ریز فروشات مربوط به «{period.periodLabel}»</span>
                                  <span className="text-[11px] text-slate-500">
                                    مشتریان خریدار: {period.parties.join(' • ') || '---'}
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                      <tr>
                                        <th className="p-2">شماره فاکتور</th>
                                        <th className="p-2">تاریخ</th>
                                        <th className="p-2">خریدار / مشتری</th>
                                        <th className="p-2">کالا</th>
                                        <th className="p-2 text-center">تناژ</th>
                                        <th className="p-2 text-center">کیسه</th>
                                        <th className="p-2 text-left">مبلغ ردیف</th>
                                        <th className="p-2 text-center">مشاهده فاکتور</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {period.items.map((it, idx) => (
                                        <tr key={`${it.invoiceId}-${idx}`} className="hover:bg-slate-50">
                                          <td className="p-2 font-mono font-bold text-slate-900">{it.invoiceNumber}</td>
                                          <td className="p-2 font-mono text-slate-500">{it.date}</td>
                                          <td className="p-2 font-medium text-slate-800">{it.partyName}</td>
                                          <td className="p-2 text-slate-700">{it.productName}</td>
                                          <td className="p-2 text-center font-mono font-bold text-slate-900">{formatNumber(it.tons)} تن</td>
                                          <td className="p-2 text-center font-mono text-slate-600">{formatNumber(it.bags)}</td>
                                          <td className="p-2 text-left font-mono font-bold text-slate-900">
                                            {formatCurrency(it.amount, it.currency)}
                                          </td>
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => onViewInvoice && onViewInvoice(it.invoiceId)}
                                              className="text-rose-600 hover:text-rose-800 text-[11px] font-bold underline cursor-pointer"
                                            >
                                              مشاهده فاکتور
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {/* سطر جمع کل نهایی */}
                <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="px-5 py-3.5">مجموع کل ({groupedPeriods.length} دوره)</td>
                    <td className="px-5 py-3.5 text-slate-500 font-normal">---</td>
                    <td className="px-5 py-3.5 text-center font-mono text-sm text-rose-700">
                      {formatNumber(globalSummary.totalTons)} تن
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-800">
                      {formatNumber(globalSummary.totalBags)}
                    </td>
                    <td className="px-5 py-3.5 text-left font-mono text-emerald-800">
                      {formatCurrency(globalSummary.totalAFN, 'AFN')}
                    </td>
                    <td className="px-5 py-3.5 text-left font-mono text-blue-800">
                      {formatCurrency(globalSummary.totalUSD, 'USD')}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">{globalSummary.invoiceCount}</td>
                    <td className="px-5 py-3.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* نما ۲: تفکیک و مقایسه سهم هر یک از کالاهای انتخاب شده */}
      {/* --------------------------------------------------------------------- */}
      {viewTab === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                <Percent className="w-4 h-4 text-rose-600" />
                <span>سهم و حجم فروش هر کالا در بازه زمانی تعیین شده</span>
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">
                تنوع کالاها: {perProductBreakdown.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">نام کالا / دسته</th>
                    <th className="px-5 py-3.5 text-center">تناژ فروش (تن)</th>
                    <th className="px-5 py-3.5 text-center">کیسه</th>
                    <th className="px-5 py-3.5 text-left">فروش افغانی</th>
                    <th className="px-5 py-3.5 text-left">فروش دلاری</th>
                    <th className="px-5 py-3.5 text-center">درصد سهم از حجم کل</th>
                    <th className="px-5 py-3.5 text-center">تعداد فاکتور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perProductBreakdown.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <div>{item.productName}</div>
                        <div className="text-[10.5px] text-slate-400 font-normal">{item.category}</div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-black text-rose-700 text-sm">
                        {formatNumber(item.totalTons)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-600 font-bold">
                        {formatNumber(item.totalBags)}
                      </td>
                      <td className="px-5 py-3.5 text-left font-mono font-bold text-emerald-700">
                        {formatCurrency(item.amountAFN, 'AFN')}
                      </td>
                      <td className="px-5 py-3.5 text-left font-mono font-bold text-blue-700">
                        {formatCurrency(item.amountUSD, 'USD')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, item.tonsShare))}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {item.tonsShare.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-700">
                        {item.invoiceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* نما ۳: ریز فاکتورهای فروش کالاهای انتخابی */}
      {/* --------------------------------------------------------------------- */}
      {viewTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <span className="font-black text-xs text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>فهرست ریز ردیف‌های فروش برای کالاهای انتخابی</span>
            </span>
            <span className="text-xs text-slate-500 font-mono font-bold">
              تعداد ردیف‌ها: {salesItems.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">شماره فاکتور / تاریخ</th>
                  <th className="px-5 py-3.5">خریدار / مشتری</th>
                  <th className="px-5 py-3.5">نام کالای فروخته شده</th>
                  <th className="px-5 py-3.5 text-center">تناژ</th>
                  <th className="px-5 py-3.5 text-center">کیسه</th>
                  <th className="px-5 py-3.5 text-left">نرخ واحد</th>
                  <th className="px-5 py-3.5 text-left">مبلغ کل ردیف</th>
                  <th className="px-5 py-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesItems.map((it, idx) => (
                  <tr key={`${it.invoiceId}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono">
                      <div className="font-bold text-slate-900">{it.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">{it.date}</div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{it.partyName}</td>
                    <td className="px-5 py-3.5 text-slate-700">{it.productName}</td>
                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900">
                      {formatNumber(it.tons)} تن
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-600 font-medium">
                      {formatNumber(it.bags)}
                    </td>
                    <td className="px-5 py-3.5 text-left font-mono text-slate-600">
                      {formatCurrency(it.unitPrice, it.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-left font-mono font-black text-emerald-700">
                      {formatCurrency(it.amount, it.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewInvoice && onViewInvoice(it.invoiceId)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        نمایش فاکتور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* استایل‌های پرینت استاندارد */}
      <div className="hidden print:block text-slate-900 text-xs p-6 space-y-4">
        <div className="text-center border-b pb-4">
          <h1 className="text-xl font-black">{companySettings.name || 'سیستم بازرگانی و انبارداری'}</h1>
          <p className="text-sm mt-1">
            گزارش رسمی فروشات {timeBreakdown === 'daily' ? 'روزانه' : timeBreakdown === 'monthly' ? 'ماهانه' : 'سالانه'} کالاها
          </p>
          <div className="text-xs text-slate-500 mt-1">
            تاریخ تهیه گزارش: {getPersianDate()}
          </div>
        </div>

        <div className="border p-3 rounded-lg text-xs space-y-1">
          <div><strong>کالاهای انتخابی:</strong> {selectionMode === 'all' ? 'تمام کالاها' : selectionMode === 'single' ? productMap.get(selectedSingleProductId)?.name : `${selectedMultipleProductIds.length} قلم کالا`}</div>
          <div><strong>دوره زمانی:</strong> {timeBreakdown === 'daily' ? 'روزانه' : timeBreakdown === 'monthly' ? 'ماهانه' : 'سالانه'}</div>
          <div><strong>مجموع کل تناژ:</strong> {formatNumber(globalSummary.totalTons)} تن ({formatNumber(globalSummary.totalBags)} کیسه)</div>
          <div><strong>مجموع ارزش فروش:</strong> {formatCurrency(globalSummary.totalAFN, 'AFN')} • {formatCurrency(globalSummary.totalUSD, 'USD')}</div>
        </div>

        <table className="w-full text-right border-collapse border border-slate-300 text-xs mt-4">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="border p-2">دوره زمانی</th>
              <th className="border p-2 text-center">تناژ فروش (تن)</th>
              <th className="border p-2 text-center">کیسه</th>
              <th className="border p-2 text-left">فروش افغانی</th>
              <th className="border p-2 text-left">فروش دلاری</th>
              <th className="border p-2 text-center">تعداد فاکتور</th>
            </tr>
          </thead>
          <tbody>
            {groupedPeriods.map(p => (
              <tr key={p.periodKey} className="border-b">
                <td className="border p-2 font-bold">{p.periodLabel}</td>
                <td className="border p-2 text-center">{formatNumber(p.totalTons)}</td>
                <td className="border p-2 text-center">{formatNumber(p.totalBags)}</td>
                <td className="border p-2 text-left">{formatCurrency(p.amountAFN, 'AFN')}</td>
                <td className="border p-2 text-left">{formatCurrency(p.amountUSD, 'USD')}</td>
                <td className="border p-2 text-center">{p.invoiceCount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-8 pt-12 text-center">
          <div>
            <div>امضای مدیر فروش:</div>
            <div className="mt-8">..................................</div>
          </div>
          <div>
            <div>امضای مدیر مالی / انبارداری:</div>
            <div className="mt-8">..................................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
