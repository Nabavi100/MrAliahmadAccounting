import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Party, Product, Invoice, FinancialTransaction, ExpenseItem, Unit, Currency } from '../types';
import { formatNumber, formatCurrency, getPersianDate, calculateBagsAndTons, isDateInRange } from '../utils/formatters';
import { PartyCardexModal } from './PartyCardexModal';
import { ProductCardexModal } from './ProductCardexModal';
import { FixedAssetsView } from './FixedAssetsView';
import { ShareholdersView } from './ShareholdersView';
import { GoogleDriveBackupPanel } from './GoogleDriveBackupPanel';
import { ComprehensiveJournalView } from './ComprehensiveJournalView';
import {
  FileBarChart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  DollarSign,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Printer,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Building,
  Briefcase,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  Percent,
  PieChart,
  Calendar,
  X,
  Tag,
  BarChart2,
  Scale,
} from 'lucide-react';
import { ProductSalesAnalysis } from './ProductSalesAnalysis';
import { PersianDateRangePicker } from './PersianDateRangePicker';

export type ReportSection =
  | 'parties'       // گزارش و مانده اشخاص (بدهکاران و بستانکاران)
  | 'inventory'     // موجودی کالا (کلی و به تفکیک گدام‌ها)
  | 'sales'         // گزارش فروشات
  | 'product_sales' // فروش کالاها (روزانه • ماهانه • سالانه)
  | 'purchases'     // گزارش خریدها
  | 'expenses'      // گزارش هزینه‌ها و مصارف
  | 'profit_loss'   // سود و زیان (P&L)
  | 'balance_sheet' // ترازنامه و بیلاننس
  | 'journal'       // اسناد حسابداری و دفتر روزنامه
  | 'fixed_assets'  // دارایی‌های ثابت و تجهیزات
  | 'shareholders'  // امور سهامداران و شرکا
  | 'backup';       // پشتیبان‌گیری و پایگاه داده

interface ReportsViewProps {
  initialSection?: string;
  onViewInvoice?: (id: string) => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment', partyId?: string) => void;
  onOpenTransferModal?: (warehouseId?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  initialSection = 'parties',
  onViewInvoice,
  onOpenPaymentModal,
  onOpenTransferModal,
}) => {
  const {
    companySettings,
    cashRegister,
    parties,
    partyGroups,
    invoices,
    stocks,
    warehouses,
    products,
    productCategories: definedProductCategories,
    transactions,
    expenses,
    expenseCategories,
    createExpense,
    deleteExpense,
    incomes,
    incomeCategories,
    calculateTotalStockValue,
    getProductStock,
    getWarehouseStockDetails,
    exportJSON,
    importJSON,
    resetToDemoData,
    resetNewFinancialYear,
    resetWipeCleanAll,
    openPrintModal,
    baseCurrency,
    convertToBase,
  } = useAccounting();

  // Normalizer for sub-report section
  const normalizeReportSection = (sec?: string): ReportSection => {
    if (!sec || sec === 'all') return 'parties';
    if (sec === 'pnl' || sec === 'profit_loss' || sec === 'profit') return 'profit_loss';
    if (sec === 'balance' || sec === 'balance_sheet') return 'balance_sheet';
    return sec as ReportSection;
  };

  // Active sub-report section
  const [activeSection, setActiveSection] = useState<ReportSection>(() =>
    normalizeReportSection(initialSection)
  );

  // Synchronize when initialSection prop updates from sidebar
  useEffect(() => {
    if (initialSection) {
      setActiveSection(normalizeReportSection(initialSection));
    }
  }, [initialSection]);

  // Cardex modal targets
  const [selectedPartyForCardex, setSelectedPartyForCardex] = useState<Party | null>(null);
  const [selectedProductForCardex, setSelectedProductForCardex] = useState<Product | null>(null);

  // Status for backup/import
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. PARTY BALANCES (گزارش و مانده اشخاص)
  // -------------------------------------------------------------
  const [partyStatusFilter, setPartyStatusFilter] = useState<'all' | 'debtors' | 'creditors' | 'settled'>('all');
  const [partyCurrencyFilter, setPartyCurrencyFilter] = useState<'all' | 'afn' | 'usd' | 'both'>('all');
  const [partyGroupFilter, setPartyGroupFilter] = useState<string>('all');
  const [partySearchQuery, setPartySearchQuery] = useState<string>('');
  const [partySortBy, setPartySortBy] = useState<'max_debt' | 'max_credit' | 'name' | 'activity'>('max_debt');

  // Filtered & Sorted Parties List
  const filteredParties = useMemo(() => {
    return parties
      .filter(p => {
        // Status filter (balance < 0 means they owe us = بدهکار, balance > 0 means we owe them = بستانکار)
        const isDebtor = p.balanceAFN < 0 || p.balanceUSD < 0;
        const isCreditor = p.balanceAFN > 0 || p.balanceUSD > 0;
        const isSettled = p.balanceAFN === 0 && p.balanceUSD === 0;

        if (partyStatusFilter === 'debtors' && !isDebtor) return false;
        if (partyStatusFilter === 'creditors' && !isCreditor) return false;
        if (partyStatusFilter === 'settled' && !isSettled) return false;

        // Currency filter
        if (partyCurrencyFilter === 'afn' && p.balanceAFN === 0) return false;
        if (partyCurrencyFilter === 'usd' && p.balanceUSD === 0) return false;
        if (partyCurrencyFilter === 'both' && (p.balanceAFN === 0 || p.balanceUSD === 0)) return false;

        // Group filter
        if (partyGroupFilter !== 'all' && p.groupId !== partyGroupFilter) return false;

        // Search query
        if (partySearchQuery.trim()) {
          const q = partySearchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCompany = (p.company || '').toLowerCase().includes(q);
          const matchPhone = (p.phone || '').includes(q);
          const matchGroup = (p.groupName || '').toLowerCase().includes(q);
          if (!matchName && !matchCompany && !matchPhone && !matchGroup) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (partySortBy === 'name') {
          return a.name.localeCompare(b.name, 'fa');
        }
        if (partySortBy === 'max_debt') {
          // Sum debt in AFN equivalent (negative balances)
          const debtA =
            (a.balanceAFN < 0 ? Math.abs(a.balanceAFN) : 0) +
            (a.balanceUSD < 0 ? Math.abs(a.balanceUSD) * (cashRegister.usdToAfnRate || 70.8) : 0);
          const debtB =
            (b.balanceAFN < 0 ? Math.abs(b.balanceAFN) : 0) +
            (b.balanceUSD < 0 ? Math.abs(b.balanceUSD) * (cashRegister.usdToAfnRate || 70.8) : 0);
          return debtB - debtA;
        }
        if (partySortBy === 'max_credit') {
          const credA =
            (a.balanceAFN > 0 ? a.balanceAFN : 0) +
            (a.balanceUSD > 0 ? a.balanceUSD * (cashRegister.usdToAfnRate || 70.8) : 0);
          const credB =
            (b.balanceAFN > 0 ? b.balanceAFN : 0) +
            (b.balanceUSD > 0 ? b.balanceUSD * (cashRegister.usdToAfnRate || 70.8) : 0);
          return credB - credA;
        }
        return 0;
      });
  }, [parties, partyStatusFilter, partyCurrencyFilter, partyGroupFilter, partySearchQuery, partySortBy, cashRegister.usdToAfnRate]);

  // Party Balances KPI aggregations
  const partyMetrics = useMemo(() => {
    let totalDebtorsCount = 0;
    let totalCreditorsCount = 0;
    let totalSettledCount = 0;

    let debtAFN = 0;
    let debtUSD = 0;
    let creditAFN = 0;
    let creditUSD = 0;

    parties.forEach(p => {
      if (p.balanceAFN < 0) debtAFN += Math.abs(p.balanceAFN);
      if (p.balanceAFN > 0) creditAFN += p.balanceAFN;

      if (p.balanceUSD < 0) debtUSD += Math.abs(p.balanceUSD);
      if (p.balanceUSD > 0) creditUSD += p.balanceUSD;

      if (p.balanceAFN < 0 || p.balanceUSD < 0) totalDebtorsCount++;
      else if (p.balanceAFN > 0 || p.balanceUSD > 0) totalCreditorsCount++;
      else totalSettledCount++;
    });

    const netReceivablesAFN = debtAFN - creditAFN + (debtUSD - creditUSD) * (cashRegister.usdToAfnRate || 70.8);

    return {
      debtAFN,
      debtUSD,
      creditAFN,
      creditUSD,
      totalDebtorsCount,
      totalCreditorsCount,
      totalSettledCount,
      netReceivablesAFN,
    };
  }, [parties, cashRegister.usdToAfnRate]);

  // -------------------------------------------------------------
  // 2. PRODUCT INVENTORY (موجودی کالا کلی و در گدام‌ها)
  // -------------------------------------------------------------
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState<string>('all');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');

  const stockStats = calculateTotalStockValue();

  // Categories list for filter
  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    if (definedProductCategories && definedProductCategories.length > 0) {
      definedProductCategories.forEach(c => {
        if (c.name?.trim()) cats.add(c.name.trim());
      });
    }
    products.forEach(p => {
      if (p.category?.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [definedProductCategories, products]);

  // All Products with Stock Calculations for Inventory Table
  const allProductsWithStock = useMemo(() => {
    return products.map(prod => {
      // Overall stock across all warehouses
      const overallStock = getProductStock(prod.id);

      // Stock in each warehouse
      const warehouseBreakdown = warehouses.map(wh => {
        const whStock = getProductStock(prod.id, wh.id);
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          warehouseType: wh.type,
          tons: whStock.tons,
          bags: whStock.bags,
        };
      });

      const minThreshold = prod.minStockTons !== undefined && prod.minStockTons !== null ? prod.minStockTons : 5;
      const isOut = overallStock.tons <= 0;
      const isLow = !isOut && overallStock.tons <= minThreshold;
      const isGood = overallStock.tons > minThreshold;
      const deficitTons = Math.max(0, parseFloat((minThreshold - overallStock.tons).toFixed(3)));
      const bagsPerTon = prod.bagsPerTon || (1000 / (prod.bagWeightKg || 50));
      const deficitBags = Math.round(deficitTons * bagsPerTon);

      // Value of this product
      const valueAFN = overallStock.tons * (prod.buyPriceAFN || 0);
      const valueUSD = overallStock.tons * (prod.buyPriceUSD || 0);

      return {
        product: prod,
        overallStock,
        warehouseBreakdown,
        minThreshold,
        deficitTons,
        deficitBags,
        isLow,
        isOut,
        isGood,
        valueAFN,
        valueUSD,
      };
    });
  }, [products, warehouses, getProductStock]);

  // Group stock summary: موجودی هر گروه
  const categoryStockSummary = useMemo(() => {
    const catMap = new Map<string, {
      name: string;
      productCount: number;
      totalTons: number;
      totalBags: number;
      valueAFN: number;
      valueUSD: number;
      lowCount: number;
      outCount: number;
    }>();

    // Initialize with all unique category names
    productCategories.forEach(catName => {
      catMap.set(catName, {
        name: catName,
        productCount: 0,
        totalTons: 0,
        totalBags: 0,
        valueAFN: 0,
        valueUSD: 0,
        lowCount: 0,
        outCount: 0,
      });
    });

    allProductsWithStock.forEach(item => {
      const catName = item.product.category?.trim() || 'عمومی';
      if (!catMap.has(catName)) {
        catMap.set(catName, {
          name: catName,
          productCount: 0,
          totalTons: 0,
          totalBags: 0,
          valueAFN: 0,
          valueUSD: 0,
          lowCount: 0,
          outCount: 0,
        });
      }
      const entry = catMap.get(catName)!;
      entry.productCount += 1;

      // Calculate stock based on selected warehouse or all warehouses
      let prodTons = item.overallStock.tons;
      let prodBags = item.overallStock.bags;
      if (stockWarehouseFilter !== 'all') {
        const whItem = item.warehouseBreakdown.find(w => w.warehouseId === stockWarehouseFilter);
        prodTons = whItem ? whItem.tons : 0;
        prodBags = whItem ? whItem.bags : 0;
      }

      entry.totalTons += prodTons;
      entry.totalBags += prodBags;
      entry.valueAFN += prodTons * (item.product.buyPriceAFN || 0);
      entry.valueUSD += prodTons * (item.product.buyPriceUSD || 0);

      if (item.isLow) entry.lowCount += 1;
      if (item.isOut) entry.outCount += 1;
    });

    return Array.from(catMap.values()).sort((a, b) => b.totalTons - a.totalTons);
  }, [productCategories, allProductsWithStock, stockWarehouseFilter]);

  // Filtered Products for Inventory Table
  const filteredProductsWithStock = useMemo(() => {
    return allProductsWithStock.filter(item => {
      // Category filter
      if (
        stockCategoryFilter !== 'all' &&
        item.product.category !== stockCategoryFilter &&
        item.product.categoryId !== stockCategoryFilter
      ) {
        return false;
      }

      // Status filter
      if (stockStatusFilter === 'available' && (item.isOut || item.isLow)) return false;
      if (stockStatusFilter === 'low' && !item.isLow) return false;
      if (stockStatusFilter === 'out' && !item.isOut) return false;

      // Warehouse filter (must have stock in selected warehouse)
      if (stockWarehouseFilter !== 'all') {
        const whItem = item.warehouseBreakdown.find(w => w.warehouseId === stockWarehouseFilter);
        if (!whItem || whItem.tons <= 0) return false;
      }

      // Search
      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.toLowerCase();
        const matchName = item.product.name.toLowerCase().includes(q);
        const matchCode = (item.product.code || '').toLowerCase().includes(q);
        const matchCat = (item.product.category || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }

      return true;
    });
  }, [allProductsWithStock, stockCategoryFilter, stockStatusFilter, stockWarehouseFilter, stockSearchQuery]);

  // -------------------------------------------------------------
  // 3. SALES REPORT (گزارش فروشات) - فیلترهای پیشرفته و تقویم
  // -------------------------------------------------------------
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [salesCurrencyFilter, setSalesCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [salesFromDate, setSalesFromDate] = useState('');
  const [salesToDate, setSalesToDate] = useState('');
  const [salesPartyFilter, setSalesPartyFilter] = useState<string>('all');
  const [salesPaymentStatusFilter, setSalesPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [salesProductFilter, setSalesProductFilter] = useState<string>('all');
  const [salesWarehouseFilter, setSalesWarehouseFilter] = useState<string>('all');

  const sellInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'sell');
  }, [invoices]);

  const filteredSellInvoices = useMemo(() => {
    return sellInvoices.filter(inv => {
      if (salesCurrencyFilter !== 'all' && inv.currency !== salesCurrencyFilter) return false;

      if ((salesFromDate || salesToDate) && !isDateInRange(inv.date, salesFromDate, salesToDate)) {
        return false;
      }

      if (salesPartyFilter !== 'all' && inv.partyId !== salesPartyFilter && inv.partyName !== salesPartyFilter) {
        return false;
      }

      if (salesPaymentStatusFilter !== 'all') {
        if (salesPaymentStatusFilter === 'paid' && inv.paymentStatus !== 'paid') return false;
        if (salesPaymentStatusFilter === 'partial' && inv.paymentStatus !== 'partial') return false;
        if (salesPaymentStatusFilter === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
      }

      if (salesWarehouseFilter !== 'all') {
        const matchesWarehouse = inv.warehouseId === salesWarehouseFilter || inv.items?.some(it => it.warehouseId === salesWarehouseFilter);
        if (!matchesWarehouse) return false;
      }

      if (salesProductFilter !== 'all') {
        const hasProduct = inv.items?.some(it => it.productId === salesProductFilter || it.productName === salesProductFilter);
        if (!hasProduct) return false;
      }

      if (salesSearchQuery.trim()) {
        const q = salesSearchQuery.toLowerCase();
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchParty = inv.partyName.toLowerCase().includes(q);
        const matchDate = inv.date.includes(q);
        const matchItems = inv.items?.some(it => it.productName.toLowerCase().includes(q));
        const matchNotes = (inv.notes || '').toLowerCase().includes(q);
        if (!matchNumber && !matchParty && !matchDate && !matchItems && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [
    sellInvoices,
    salesCurrencyFilter,
    salesFromDate,
    salesToDate,
    salesPartyFilter,
    salesPaymentStatusFilter,
    salesWarehouseFilter,
    salesProductFilter,
    salesSearchQuery,
  ]);

  const salesAggregations = useMemo(() => {
    let totalAFN = 0;
    let totalUSD = 0;
    let paidAFN = 0;
    let paidUSD = 0;
    let debtAFN = 0;
    let debtUSD = 0;
    let totalTons = 0;
    let totalBags = 0;

    filteredSellInvoices.forEach(inv => {
      if (inv.currency === 'AFN') {
        totalAFN += inv.totalAmount;
        paidAFN += inv.paidAmount;
        debtAFN += inv.balanceAmount;
      } else {
        totalUSD += inv.totalAmount;
        paidUSD += inv.paidAmount;
        debtUSD += inv.balanceAmount;
      }
      inv.items?.forEach(it => {
        totalTons += it.tonsCount || 0;
        totalBags += it.bagsCount || 0;
      });
    });

    return { totalAFN, totalUSD, paidAFN, paidUSD, debtAFN, debtUSD, totalTons, totalBags };
  }, [filteredSellInvoices]);

  // -------------------------------------------------------------
  // 4. PURCHASES REPORT (گزارش خریدها) - فیلترهای پیشرفته و تقویم
  // -------------------------------------------------------------
  const [buySearchQuery, setBuySearchQuery] = useState('');
  const [buyCurrencyFilter, setBuyCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [buyFromDate, setBuyFromDate] = useState('');
  const [buyToDate, setBuyToDate] = useState('');
  const [buyPartyFilter, setBuyPartyFilter] = useState<string>('all');
  const [buyPaymentStatusFilter, setBuyPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [buyProductFilter, setBuyProductFilter] = useState<string>('all');
  const [buyWarehouseFilter, setBuyWarehouseFilter] = useState<string>('all');

  const buyInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'buy');
  }, [invoices]);

  const filteredBuyInvoices = useMemo(() => {
    return buyInvoices.filter(inv => {
      if (buyCurrencyFilter !== 'all' && inv.currency !== buyCurrencyFilter) return false;

      if ((buyFromDate || buyToDate) && !isDateInRange(inv.date, buyFromDate, buyToDate)) {
        return false;
      }

      if (buyPartyFilter !== 'all' && inv.partyId !== buyPartyFilter && inv.partyName !== buyPartyFilter) {
        return false;
      }

      if (buyPaymentStatusFilter !== 'all') {
        if (buyPaymentStatusFilter === 'paid' && inv.paymentStatus !== 'paid') return false;
        if (buyPaymentStatusFilter === 'partial' && inv.paymentStatus !== 'partial') return false;
        if (buyPaymentStatusFilter === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
      }

      if (buyWarehouseFilter !== 'all') {
        const matchesWarehouse = inv.warehouseId === buyWarehouseFilter || inv.items?.some(it => it.warehouseId === buyWarehouseFilter);
        if (!matchesWarehouse) return false;
      }

      if (buyProductFilter !== 'all') {
        const hasProduct = inv.items?.some(it => it.productId === buyProductFilter || it.productName === buyProductFilter);
        if (!hasProduct) return false;
      }

      if (buySearchQuery.trim()) {
        const q = buySearchQuery.toLowerCase();
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchParty = inv.partyName.toLowerCase().includes(q);
        const matchDate = inv.date.includes(q);
        const matchItems = inv.items?.some(it => it.productName.toLowerCase().includes(q));
        const matchNotes = (inv.notes || '').toLowerCase().includes(q);
        if (!matchNumber && !matchParty && !matchDate && !matchItems && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [
    buyInvoices,
    buyCurrencyFilter,
    buyFromDate,
    buyToDate,
    buyPartyFilter,
    buyPaymentStatusFilter,
    buyWarehouseFilter,
    buyProductFilter,
    buySearchQuery,
  ]);

  const buyAggregations = useMemo(() => {
    let totalAFN = 0;
    let totalUSD = 0;
    let paidAFN = 0;
    let paidUSD = 0;
    let payableAFN = 0;
    let payableUSD = 0;
    let totalTons = 0;
    let totalBags = 0;

    filteredBuyInvoices.forEach(inv => {
      if (inv.currency === 'AFN') {
        totalAFN += inv.totalAmount;
        paidAFN += inv.paidAmount;
        payableAFN += inv.balanceAmount;
      } else {
        totalUSD += inv.totalAmount;
        paidUSD += inv.paidAmount;
        payableUSD += inv.balanceAmount;
      }
      inv.items?.forEach(it => {
        totalTons += it.tonsCount || 0;
        totalBags += it.bagsCount || 0;
      });
    });

    return { totalAFN, totalUSD, paidAFN, paidUSD, payableAFN, payableUSD, totalTons, totalBags };
  }, [filteredBuyInvoices]);

  // -------------------------------------------------------------
  // UNIVERSAL PRINT HANDLERS FOR ALL REPORTS & OPERATIONS
  // -------------------------------------------------------------
  const handlePrintInventoryReport = (specificCategory?: string) => {
    const catToFilter = specificCategory || stockCategoryFilter;
    const filteredProds = filteredProductsWithStock
      .filter(item => {
        if (specificCategory && specificCategory !== 'all') {
          return item.product.category === specificCategory || item.product.categoryId === specificCategory;
        }
        return true;
      })
      .map(p => p.product);

    const selectedWh = stockWarehouseFilter !== 'all'
      ? warehouses.find(w => w.id === stockWarehouseFilter)?.name
      : 'تمامی گدام‌ها';
    const selectedCat = catToFilter !== 'all' ? catToFilter : 'همه گروه‌ها';

    openPrintModal({
      type: 'products_inventory_report',
      inventoryProducts: filteredProds,
      inventoryStocks: stocks,
      selectedWarehouseName: selectedWh,
      selectedCategoryName: selectedCat,
      showSignatures: true,
    });
  };

  const handlePrintSalesReport = () => {
    const partyName = salesPartyFilter !== 'all'
      ? parties.find(p => p.id === salesPartyFilter)?.name || salesPartyFilter
      : 'همه مشتریان و خریداران';
    const dateRangeText = (salesFromDate || salesToDate)
      ? `از تاریخ ${salesFromDate || 'ابتدا'} تا ${salesToDate || 'کنون'}`
      : 'تمامی ادوار مالی';
    const currencyText = salesCurrencyFilter === 'all' ? 'همه ارزها (افغانی و دالر)' : salesCurrencyFilter === 'AFN' ? 'افغانی (AFN)' : 'دالر (USD)';
    const statusText = salesPaymentStatusFilter === 'paid' ? 'تسویه کامل نقدی'
      : salesPaymentStatusFilter === 'partial' ? 'نیمه‌نسیه'
      : salesPaymentStatusFilter === 'unpaid' ? 'نسیه و قرض'
      : 'همه وضعیت‌ها';

    openPrintModal({
      title: 'گزارش رسمی و تحلیلی فروشات کالا',
      subtitle: `بازه زمانی: ${dateRangeText} • مشتری: ${partyName} • وضعیت: ${statusText} • ارز: ${currencyText}`,
      metadata: [
        { label: 'بازه تاریخی گزارش', value: dateRangeText },
        { label: 'تعداد فاکتورهای صادر شده', value: `${filteredSellInvoices.length} فاکتور` },
        { label: 'مجموع فروش افغانی', value: `${formatNumber(salesAggregations.totalAFN)} ؋` },
        { label: 'مجموع فروش دالری', value: `$${formatNumber(salesAggregations.totalUSD)}` },
        { label: 'کل تناژ فروخته شده', value: `${formatNumber(salesAggregations.totalTons)} تن` },
        { label: 'کل کیسه‌های فروخته شده', value: `${formatNumber(salesAggregations.totalBags)} کیسه` },
        { label: 'مانده طلب (نسیه)', value: `${formatNumber(salesAggregations.debtAFN)} ؋ / $${formatNumber(salesAggregations.debtUSD)}` },
        { label: 'تاریخ تهیه گزارش', value: getPersianDate() },
      ],
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                <th className="border border-slate-300 p-2 text-center">شماره فاکتور</th>
                <th className="border border-slate-300 p-2 text-center">تاریخ</th>
                <th className="border border-slate-300 p-2">نام مشتری / خریدار</th>
                <th className="border border-slate-300 p-2">کالای داخل فاکتور و تناژ</th>
                <th className="border border-slate-300 p-2 text-left">مبلغ کل فاکتور</th>
                <th className="border border-slate-300 p-2 text-left">دریافتی نقدی</th>
                <th className="border border-slate-300 p-2 text-left">مانده نسیه</th>
                <th className="border border-slate-300 p-2 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSellInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">فاکتور فروشی با این شرایط فیلتر یافت نشد.</td>
                </tr>
              ) : (
                filteredSellInvoices.map((inv, idx) => {
                  const totalTons = inv.items?.reduce((s, it) => s + (it.tonsCount || 0), 0) || 0;
                  const totalBags = inv.items?.reduce((s, it) => s + (it.bagsCount || 0), 0) || 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono text-slate-600">{inv.date}</td>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">{inv.partyName}</td>
                      <td className="border border-slate-300 p-2">
                        <div className="space-y-1">
                          {inv.items.map((it, itemIdx) => (
                            <div key={itemIdx} className="text-[11px] text-slate-700">
                              • <strong>{it.productName}</strong>: {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                            </div>
                          ))}
                          {(totalTons > 0 || totalBags > 0) && (
                            <div className="text-[10px] text-slate-500 font-mono pt-0.5 border-t border-dashed border-slate-200 font-bold">
                              جمع: {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''} {totalBags > 0 ? `(${formatNumber(totalBags)} کیسه)` : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-black text-slate-900">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-bold text-emerald-700">{formatCurrency(inv.paidAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-bold text-rose-700">{formatCurrency(inv.balanceAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-center text-[10px] font-bold">
                        {inv.paymentStatus === 'paid' ? 'تسویه نقدی' : inv.paymentStatus === 'partial' ? 'نیمه‌نسیه' : 'نسیه'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={5} className="border border-slate-300 p-2.5 text-right font-black">
                  مجموع کل گزارش فروشات ({filteredSellInvoices.length} فاکتور):
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-slate-900">
                  {formatNumber(salesAggregations.totalAFN)} ؋<br/>${formatNumber(salesAggregations.totalUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-emerald-700">
                  {formatNumber(salesAggregations.paidAFN)} ؋<br/>${formatNumber(salesAggregations.paidUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-rose-700">
                  {formatNumber(salesAggregations.debtAFN)} ؋<br/>${formatNumber(salesAggregations.debtUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-center text-[10px]">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ),
    });
  };

  const handlePrintPurchasesReport = () => {
    const partyName = buyPartyFilter !== 'all'
      ? parties.find(p => p.id === buyPartyFilter)?.name || buyPartyFilter
      : 'همه فروشندگان / واردکنندگان';
    const dateRangeText = (buyFromDate || buyToDate)
      ? `از تاریخ ${buyFromDate || 'ابتدا'} تا ${buyToDate || 'کنون'}`
      : 'تمامی ادوار مالی';
    const currencyText = buyCurrencyFilter === 'all' ? 'همه ارزها (افغانی و دالر)' : buyCurrencyFilter === 'AFN' ? 'افغانی (AFN)' : 'دالر (USD)';
    const statusText = buyPaymentStatusFilter === 'paid' ? 'تسویه کامل نقدی'
      : buyPaymentStatusFilter === 'partial' ? 'نیمه‌نسیه'
      : buyPaymentStatusFilter === 'unpaid' ? 'نسیه (قرض)'
      : 'همه وضعیت‌ها';

    openPrintModal({
      title: 'گزارش رسمی و تحلیلی خریدها و واردات کالا',
      subtitle: `بازه زمانی: ${dateRangeText} • فروشنده: ${partyName} • وضعیت: ${statusText} • ارز: ${currencyText}`,
      metadata: [
        { label: 'بازه تاریخی گزارش', value: dateRangeText },
        { label: 'تعداد فاکتورهای خرید', value: `${filteredBuyInvoices.length} فاکتور` },
        { label: 'مجموع خرید افغانی', value: `${formatNumber(buyAggregations.totalAFN)} ؋` },
        { label: 'مجموع خرید دالری', value: `$${formatNumber(buyAggregations.totalUSD)}` },
        { label: 'کل تناژ خریداری شده', value: `${formatNumber(buyAggregations.totalTons)} تن` },
        { label: 'کل کیسه‌های خریداری شده', value: `${formatNumber(buyAggregations.totalBags)} کیسه` },
        { label: 'مانده بدهی ما به فروشندگان', value: `${formatNumber(buyAggregations.payableAFN)} ؋ / $${formatNumber(buyAggregations.payableUSD)}` },
        { label: 'تاریخ تهیه گزارش', value: getPersianDate() },
      ],
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                <th className="border border-slate-300 p-2 text-center">شماره فاکتور</th>
                <th className="border border-slate-300 p-2 text-center">تاریخ</th>
                <th className="border border-slate-300 p-2">فروشنده / واردکننده</th>
                <th className="border border-slate-300 p-2">کالای داخل فاکتور و تناژ</th>
                <th className="border border-slate-300 p-2 text-left">مبلغ کل فاکتور</th>
                <th className="border border-slate-300 p-2 text-left">پرداخت نقدی</th>
                <th className="border border-slate-300 p-2 text-left">مانده طلب فروشنده</th>
                <th className="border border-slate-300 p-2 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBuyInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">فاکتور خریدی با این شرایط فیلتر یافت نشد.</td>
                </tr>
              ) : (
                filteredBuyInvoices.map((inv, idx) => {
                  const totalTons = inv.items?.reduce((s, it) => s + (it.tonsCount || 0), 0) || 0;
                  const totalBags = inv.items?.reduce((s, it) => s + (it.bagsCount || 0), 0) || 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono text-slate-600">{inv.date}</td>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">{inv.partyName}</td>
                      <td className="border border-slate-300 p-2">
                        <div className="space-y-1">
                          {inv.items.map((it, itemIdx) => (
                            <div key={itemIdx} className="text-[11px] text-slate-700">
                              • <strong>{it.productName}</strong>: {formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}
                            </div>
                          ))}
                          {(totalTons > 0 || totalBags > 0) && (
                            <div className="text-[10px] text-slate-500 font-mono pt-0.5 border-t border-dashed border-slate-200 font-bold">
                              جمع: {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''} {totalBags > 0 ? `(${formatNumber(totalBags)} کیسه)` : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-black text-slate-900">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-bold text-emerald-700">{formatCurrency(inv.paidAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-bold text-blue-700">{formatCurrency(inv.balanceAmount, inv.currency)}</td>
                      <td className="border border-slate-300 p-2 text-center text-[10px] font-bold">
                        {inv.paymentStatus === 'paid' ? 'تسویه نقدی' : inv.paymentStatus === 'partial' ? 'نیمه‌نسیه' : 'نسیه'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={5} className="border border-slate-300 p-2.5 text-right font-black">
                  مجموع کل گزارش خریدها ({filteredBuyInvoices.length} فاکتور):
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-slate-900">
                  {formatNumber(buyAggregations.totalAFN)} ؋<br/>${formatNumber(buyAggregations.totalUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-emerald-700">
                  {formatNumber(buyAggregations.paidAFN)} ؋<br/>${formatNumber(buyAggregations.paidUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-blue-700">
                  {formatNumber(buyAggregations.payableAFN)} ؋<br/>${formatNumber(buyAggregations.payableUSD)}
                </td>
                <td className="border border-slate-300 p-2.5 text-center text-[10px]">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ),
    });
  };

  const handlePrintPartiesReport = (targetFilter?: 'debtors' | 'creditors' | 'settled' | 'all', targetGroupId?: string) => {
    const activeStatus = targetFilter !== undefined ? targetFilter : partyStatusFilter;
    const activeGroupId = targetGroupId !== undefined ? targetGroupId : partyGroupFilter;

    // Filter list specifically for this print request
    const partiesToPrint = parties.filter(p => {
      const isDebtor = p.balanceAFN < 0 || p.balanceUSD < 0;
      const isCreditor = p.balanceAFN > 0 || p.balanceUSD > 0;
      const isSettled = p.balanceAFN === 0 && p.balanceUSD === 0;

      if (activeStatus === 'debtors' && !isDebtor) return false;
      if (activeStatus === 'creditors' && !isCreditor) return false;
      if (activeStatus === 'settled' && !isSettled) return false;

      if (partyCurrencyFilter === 'afn' && p.balanceAFN === 0) return false;
      if (partyCurrencyFilter === 'usd' && p.balanceUSD === 0) return false;
      if (partyCurrencyFilter === 'both' && (p.balanceAFN === 0 || p.balanceUSD === 0)) return false;

      if (activeGroupId !== 'all' && p.groupId !== activeGroupId) return false;

      if (partySearchQuery.trim()) {
        const q = partySearchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCompany = (p.company || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').includes(q);
        const matchGroup = (p.groupName || '').toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchPhone && !matchGroup) return false;
      }

      return true;
    });

    const statusTitle = activeStatus === 'debtors'
      ? 'گزارش اختصاصی بدهکاران به شرکت (قرضداران و مطالبات)'
      : activeStatus === 'creditors'
      ? 'گزارش اختصاصی بستانکاران از شرکت (طلبکاران و تعهدات)'
      : activeStatus === 'settled'
      ? 'گزارش حساب‌های تسویه شده و بی‌حساب'
      : 'گزارش تفصیلی مانده حساب کلیه اشخاص و طرف‌های حساب';

    const groupName = activeGroupId !== 'all'
      ? partyGroups.find(g => g.id === activeGroupId)?.name || 'گروه انتخابی'
      : 'تمامی دسته‌ها و گروه‌ها';

    let printDebtAFN = 0;
    let printDebtUSD = 0;
    let printCreditAFN = 0;
    let printCreditUSD = 0;

    partiesToPrint.forEach(p => {
      if (p.balanceAFN < 0) printDebtAFN += Math.abs(p.balanceAFN);
      if (p.balanceAFN > 0) printCreditAFN += p.balanceAFN;
      if (p.balanceUSD < 0) printDebtUSD += Math.abs(p.balanceUSD);
      if (p.balanceUSD > 0) printCreditUSD += p.balanceUSD;
    });

    const tableHeaders = ['ردیف', 'نام طرف‌حساب', 'گروه / صنف', 'شماره تماس', 'مانده افغانی (AFN)', 'مانده دالری (USD)', 'وضعیت'];
    const tableRows = partiesToPrint.map((p, idx) => {
      const isDebtor = p.balanceAFN < 0 || p.balanceUSD < 0;
      const isCreditor = p.balanceAFN > 0 || p.balanceUSD > 0;
      const statusLabel = isDebtor ? 'بدهکار (قرضدار)' : isCreditor ? 'طلبکار' : 'تسویه';
      return [
        idx + 1,
        p.name,
        p.groupName || 'عمومی',
        p.phone || '—',
        p.balanceAFN !== 0 ? `${formatNumber(p.balanceAFN)} ؋` : '۰ ؋',
        p.balanceUSD !== 0 ? `$${formatNumber(p.balanceUSD)}` : '$۰',
        statusLabel,
      ];
    });

    openPrintModal({
      title: statusTitle,
      subtitle: `دسته‌بندی: ${groupName} • فیلتر وضعیت: ${activeStatus === 'debtors' ? 'فقط بدهکاران' : activeStatus === 'creditors' ? 'فقط بستانکاران' : 'همه'} • تاریخ گزارش: ${getPersianDate()}`,
      metadata: [
        { label: 'تعداد اشخاص در این لیست', value: `${partiesToPrint.length} شخص / شرکت` },
        { label: 'گروه انتخاب شده', value: groupName },
        { label: 'مجموع طلب ما (بدهکاران)', value: `${formatNumber(printDebtAFN)} ؋ / $${formatNumber(printDebtUSD)}` },
        { label: 'مجموع بدهی ما (بستانکاران)', value: `${formatNumber(printCreditAFN)} ؋ / $${formatNumber(printCreditUSD)}` },
        { label: 'تاریخ تهیه گزارش', value: getPersianDate() },
      ],
      summaryCards: [
        { label: 'تعداد اشخاص لیست', value: `${partiesToPrint.length} نفر` },
        { label: 'گروه چاپی', value: groupName },
        { label: 'مجموع طلب ما', value: `${formatNumber(printDebtAFN)} ؋` },
        { label: 'مجموع بدهی ما', value: `${formatNumber(printCreditAFN)} ؋` },
      ],
      tableHeaders,
      tableRows,
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                <th className="border border-slate-300 p-2">نام طرف‌حساب</th>
                <th className="border border-slate-300 p-2 text-center">گروه</th>
                <th className="border border-slate-300 p-2 text-center">شماره تماس</th>
                <th className="border border-slate-300 p-2 text-left">مانده افغانی (AFN)</th>
                <th className="border border-slate-300 p-2 text-left">مانده دالری (USD)</th>
                <th className="border border-slate-300 p-2 text-center">وضعیت حساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {partiesToPrint.map((p, idx) => {
                const isDebtor = p.balanceAFN < 0 || p.balanceUSD < 0;
                const isCreditor = p.balanceAFN > 0 || p.balanceUSD > 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900">{p.name}</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">{p.groupName || 'عمومی'}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">{p.phone || '—'}</td>
                    <td className={`border border-slate-300 p-2 text-left font-mono font-bold ${p.balanceAFN < 0 ? 'text-rose-700' : p.balanceAFN > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                      {p.balanceAFN !== 0 ? formatCurrency(p.balanceAFN, 'AFN') : '۰ ؋'}
                    </td>
                    <td className={`border border-slate-300 p-2 text-left font-mono font-bold ${p.balanceUSD < 0 ? 'text-rose-700' : p.balanceUSD > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                      {p.balanceUSD !== 0 ? `$${formatNumber(p.balanceUSD)}` : '$۰'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-[10px] font-bold">
                      {isDebtor ? 'بدهکار (قرضدار)' : isCreditor ? 'طلبکار' : 'تسویه'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  };

  const handlePrintProfitLoss = () => {
    openPrintModal({
      title: 'صورت سود و زیان رسمی (Profit & Loss Statement)',
      subtitle: `دوره مالی: ${pnlPeriod === 'today' ? 'امروز' : pnlPeriod === 'month' ? 'این ماه' : pnlPeriod === 'year' ? 'امسال' : 'تمامی دوره‌ها'} • تاریخ گزارش: ${getPersianDate()}`,
      metadata: [
        { label: 'کل فروش خالص دوره', value: `${formatNumber(pnlSalesTotals.totalAFN)} ؋ / $${formatNumber(pnlSalesTotals.totalUSD)}` },
        { label: 'بهای تمام شده کالای فروش رفته (COGS)', value: `${formatNumber(cogsCalculations.cogsAFN)} ؋ / $${formatNumber(cogsCalculations.cogsUSD)}` },
        { label: 'سود ناخالص تجاری', value: `${formatNumber(totalGrossProfitEquivalentBase)} ${baseCurrency.symbol || baseCurrency.code}` },
        { label: 'کل هزینه‌ها و مصارف جاری', value: `${formatNumber(pnlTotalExpEquivalentBase)} ${baseCurrency.symbol || baseCurrency.code}` },
        { label: 'سود یا زیان خالص نهایی', value: `${formatNumber(netProfitBase)} ${baseCurrency.symbol || baseCurrency.code}` },
      ],
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-300 p-2.5">درآمد فروش کالاها</td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-black text-emerald-800">{formatNumber(pnlSalesTotals.totalAFN)} ؋ / ${formatNumber(pnlSalesTotals.totalUSD)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2.5 text-rose-800 font-bold">کسر می‌شود: بهای تمام شده کالای فروش رفته (COGS)</td>
                <td className="border border-slate-300 p-2.5 text-left font-mono font-bold text-rose-700">({formatNumber(cogsCalculations.cogsAFN)} ؋ / ${formatNumber(cogsCalculations.cogsUSD)})</td>
              </tr>
              <tr className="bg-emerald-50 font-black">
                <td className="border border-slate-300 p-2.5 text-emerald-950">سود ناخالص عملیاتی (Gross Profit)</td>
                <td className="border border-slate-300 p-2.5 text-left font-mono text-emerald-800">{formatNumber(totalGrossProfitEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2.5 text-slate-700 font-medium">افزودن: سایر عواید متفرقه</td>
                <td className="border border-slate-300 p-2.5 text-left font-mono text-emerald-600">+{formatNumber(pnlTotalIncomeEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2.5 text-rose-800 font-medium">کسر می‌شود: کل هزینه‌ها و مصارف جاری دوره</td>
                <td className="border border-slate-300 p-2.5 text-left font-mono text-rose-700">({formatNumber(pnlTotalExpEquivalentBase)} {baseCurrency.symbol || baseCurrency.code})</td>
              </tr>
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="border border-slate-900 p-3">سود (زیان) خالص نهایی دوره (Net Profit)</td>
                <td className="border border-slate-900 p-3 text-left font-mono text-emerald-400">{formatNumber(netProfitBase)} {baseCurrency.symbol || baseCurrency.code}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    });
  };

  const handlePrintBalanceSheet = () => {
    openPrintModal({
      title: 'ترازنامه مالی رسمی (Balance Sheet)',
      subtitle: `تاریخ تنظیم: ${getPersianDate()} • مطابق استانداردهای حسابداری`,
      metadata: [
        { label: 'مجموع کل دارایی‌ها (افغانی)', value: `${formatNumber(totalAssetsAFN)} ؋` },
        { label: 'مجموع کل بدهی‌ها (پاسیو)', value: `${formatNumber(totalLiabilitiesAFN)} ؋` },
        { label: 'ارزش خالص شرکت و حقوق سرمایه', value: `${formatNumber(netCompanyWorthAFN)} ؋` },
        { label: 'تاریخ تهیه ترازنامه', value: getPersianDate() },
      ],
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded p-3">
              <h5 className="font-bold border-b pb-1 mb-2 text-slate-900">دارایی‌ها (اکتیو)</h5>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between"><span>نقدینگی در صندوق افغانی:</span><strong>{formatNumber(cashRegister.afnBalance)} ؋</strong></div>
                <div className="flex justify-between"><span>نقدینگی در صندوق دالری ($):</span><strong>${formatNumber(cashRegister.usdBalance)}</strong></div>
                <div className="flex justify-between"><span>صندوق دالری سرای شهزاده:</span><strong>${formatNumber(cashRegister.exchangeUsdBalance || 0)}</strong></div>
                <div className="flex justify-between"><span>ارزش موجودی کالا در گدام‌ها:</span><strong>{formatNumber(stockStats.afnValue)} ؋</strong></div>
                <div className="flex justify-between"><span>طلبات از مشتریان (قرض‌ها):</span><strong>{formatNumber(partyMetrics.debtAFN)} ؋ + ${formatNumber(partyMetrics.debtUSD)}</strong></div>
                <div className="flex justify-between border-t pt-1 font-black text-emerald-900 bg-emerald-50 p-1">
                  <span>جمع کل دارایی‌ها (معادل افغانی):</span><span>{formatNumber(totalAssetsAFN)} ؋</span>
                </div>
              </div>
            </div>
            <div className="border border-slate-300 rounded p-3">
              <h5 className="font-bold border-b pb-1 mb-2 text-slate-900">بدهی‌ها و سرمایه (پاسیو)</h5>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between"><span>بدهی به تأمین‌کنندگان (افغانی):</span><strong>{formatNumber(partyMetrics.creditAFN)} ؋</strong></div>
                <div className="flex justify-between"><span>بدهی به تأمین‌کنندگان (دالری):</span><strong>${formatNumber(partyMetrics.creditUSD)}</strong></div>
                <div className="flex justify-between"><span>مجموع کل بدهی‌ها (معادل افغانی):</span><strong>{formatNumber(totalLiabilitiesAFN)} ؋</strong></div>
                <div className="flex justify-between border-t pt-1 font-black text-blue-900 bg-blue-50 p-1">
                  <span>ارزش خالص حقوق سرمایه (Equity):</span><span>{formatNumber(netCompanyWorthAFN)} ؋</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    });
  };

  const handlePrintExpensesReport = () => {
    openPrintModal({
      title: 'گزارش تفصیلی هزینه‌ها و مصارف',
      subtitle: `تاریخ تهیه گزارش: ${getPersianDate()}`,
      metadata: [
        { label: 'تعداد کل هزینه‌ها', value: `${expenses.length} مورد` },
        { label: 'مجموع هزینه‌های افغانی', value: `${formatNumber(totalExpensesAFN)} ؋` },
        { label: 'مجموع هزینه‌های دالری', value: `$${formatNumber(totalExpensesUSD)}` },
      ],
      customContent: (
        <div className="space-y-4 text-xs font-sans text-slate-800" dir="rtl">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                <th className="border border-slate-300 p-2 text-center">تاریخ</th>
                <th className="border border-slate-300 p-2">عنوان هزینه</th>
                <th className="border border-slate-300 p-2 text-center">دسته‌بندی</th>
                <th className="border border-slate-300 p-2">دریافت‌کننده</th>
                <th className="border border-slate-300 p-2 text-left">مبلغ هزینه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {expenses.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{exp.date}</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900">{exp.title}</td>
                  <td className="border border-slate-300 p-2 text-center">{exp.categoryName}</td>
                  <td className="border border-slate-300 p-2 text-slate-600">{exp.recipient || '—'}</td>
                  <td className="border border-slate-300 p-2 text-left font-mono font-bold text-rose-700">{formatCurrency(exp.amount, exp.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    });
  };


  // -------------------------------------------------------------
  // 5. EXPENSES & COSTS (هزینه‌ها و مصارف واقعی از سیستم)
  // -------------------------------------------------------------
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCategoryId, setNewExpCategoryId] = useState('');
  const [newExpAmount, setNewExpAmount] = useState<number>(0);
  const [newExpCurrency, setNewExpCurrency] = useState<Currency>('AFN');
  const [newExpRecipient, setNewExpRecipient] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle || newExpAmount <= 0) return;

    const selectedCat = expenseCategories.find(c => c.id === newExpCategoryId) || expenseCategories[0];

    createExpense({
      title: newExpTitle,
      categoryId: selectedCat?.id || 'exp-cat-transport',
      categoryName: selectedCat?.name || 'ترانسپورت و کرایه',
      amount: newExpAmount,
      currency: newExpCurrency,
      date: getPersianDate(),
      recipient: newExpRecipient || 'متفرقه',
      cashRegisterId: newExpCurrency === 'USD' ? 'usd_cash' : 'afn_cash',
      cashRegisterName: newExpCurrency === 'USD' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی',
    });

    setNewExpTitle('');
    setNewExpAmount(0);
    setNewExpRecipient('');
    setIsAddingExpense(false);
  };

  const totalExpensesAFN = useMemo(() => {
    return expenses.filter(e => e.currency === 'AFN').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalExpensesUSD = useMemo(() => {
    return expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalExpEquivalentAFN = useMemo(() => {
    const rate = cashRegister.usdToAfnRate || 70.8;
    return totalExpensesAFN + totalExpensesUSD * rate;
  }, [totalExpensesAFN, totalExpensesUSD, cashRegister.usdToAfnRate]);

  // Breakdown of expenses by category
  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amountAFN: number; amountUSD: number; color?: string }> = {};

    expenseCategories.forEach(cat => {
      map[cat.id] = { id: cat.id, name: cat.name, amountAFN: 0, amountUSD: 0, color: cat.color };
    });

    expenses.forEach(exp => {
      const catId = exp.categoryId || 'other';
      if (!map[catId]) {
        map[catId] = { id: catId, name: exp.categoryName || 'متفرقه', amountAFN: 0, amountUSD: 0 };
      }
      if (exp.currency === 'AFN') {
        map[catId].amountAFN += exp.amount;
      } else {
        map[catId].amountUSD += exp.amount;
      }
    });

    return Object.values(map).filter(cat => cat.amountAFN > 0 || cat.amountUSD > 0);
  }, [expenses, expenseCategories]);

  // -------------------------------------------------------------
  // 6. PROFIT & LOSS (سود و زیان تجارتی بر مبنای داده‌های واقعی و دوره مالی)
  // -------------------------------------------------------------
  const [pnlPeriod, setPnlPeriod] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [pnlStartDate, setPnlStartDate] = useState<string>('');
  const [pnlEndDate, setPnlEndDate] = useState<string>('');

  const effectivePnlDateRange = useMemo(() => {
    const today = getPersianDate();
    if (pnlPeriod === 'today') {
      return { from: today, to: today };
    }
    if (pnlPeriod === 'month') {
      const parts = today.split('/');
      if (parts.length >= 2) {
        return { from: `${parts[0]}/${parts[1]}/01`, to: `${parts[0]}/${parts[1]}/31` };
      }
    }
    if (pnlPeriod === 'year') {
      const parts = today.split('/');
      if (parts.length >= 1) {
        return { from: `${parts[0]}/01/01`, to: `${parts[0]}/12/29` };
      }
    }
    if (pnlPeriod === 'custom') {
      return { from: pnlStartDate, to: pnlEndDate };
    }
    return { from: '', to: '' };
  }, [pnlPeriod, pnlStartDate, pnlEndDate]);

  // Filtered sales invoices for P&L period
  const pnlSellInvoices = useMemo(() => {
    return sellInvoices.filter(inv => {
      if (effectivePnlDateRange.from || effectivePnlDateRange.to) {
        return isDateInRange(inv.date, effectivePnlDateRange.from, effectivePnlDateRange.to);
      }
      return true;
    });
  }, [sellInvoices, effectivePnlDateRange]);

  // Filtered expenses for P&L period
  const pnlExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (effectivePnlDateRange.from || effectivePnlDateRange.to) {
        return isDateInRange(exp.date, effectivePnlDateRange.from, effectivePnlDateRange.to);
      }
      return true;
    });
  }, [expenses, effectivePnlDateRange]);

  // Filtered incomes for P&L period
  const pnlIncomes = useMemo(() => {
    return (incomes || []).filter(inc => {
      if (effectivePnlDateRange.from || effectivePnlDateRange.to) {
        return isDateInRange(inc.date, effectivePnlDateRange.from, effectivePnlDateRange.to);
      }
      return true;
    });
  }, [incomes, effectivePnlDateRange]);

  // Sales totals for P&L
  const pnlSalesTotals = useMemo(() => {
    let totalAFN = 0;
    let totalUSD = 0;
    pnlSellInvoices.forEach(inv => {
      if (inv.currency === 'AFN') {
        totalAFN += inv.totalAmount;
      } else {
        totalUSD += inv.totalAmount;
      }
    });
    return { totalAFN, totalUSD };
  }, [pnlSellInvoices]);

  // Calculate real COGS from sold invoice items and product buy prices
  const cogsCalculations = useMemo(() => {
    let cogsAFN = 0;
    let cogsUSD = 0;

    pnlSellInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const buyPriceAFN = prod?.buyPriceAFN || 0;
        const buyPriceUSD = prod?.buyPriceUSD || 0;
        const tons = it.tonsCount || (it.unit === 'ton' ? it.quantity : it.quantity / 20);

        if (inv.currency === 'AFN') {
          cogsAFN += tons * buyPriceAFN;
        } else {
          cogsUSD += tons * buyPriceUSD;
        }
      });
    });

    return { cogsAFN, cogsUSD };
  }, [pnlSellInvoices, products]);

  const grossProfitAFN = pnlSalesTotals.totalAFN - cogsCalculations.cogsAFN;
  const grossProfitUSD = pnlSalesTotals.totalUSD - cogsCalculations.cogsUSD;
  const totalGrossProfitEquivalentBase = convertToBase(grossProfitAFN, 'AFN') + convertToBase(grossProfitUSD, 'USD');

  // P&L Expenses totals
  const pnlExpensesAFN = useMemo(() => {
    return pnlExpenses.filter(e => e.currency === 'AFN').reduce((sum, e) => sum + e.amount, 0);
  }, [pnlExpenses]);

  const pnlExpensesUSD = useMemo(() => {
    return pnlExpenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  }, [pnlExpenses]);

  const pnlTotalExpEquivalentBase = useMemo(() => {
    return convertToBase(pnlExpensesAFN, 'AFN') + convertToBase(pnlExpensesUSD, 'USD');
  }, [pnlExpensesAFN, pnlExpensesUSD, convertToBase]);

  // P&L Incomes totals
  const pnlIncomesAFN = useMemo(() => {
    return pnlIncomes.filter(i => i.currency === 'AFN').reduce((sum, i) => sum + i.amount, 0);
  }, [pnlIncomes]);

  const pnlIncomesUSD = useMemo(() => {
    return pnlIncomes.filter(i => i.currency === 'USD').reduce((sum, i) => sum + i.amount, 0);
  }, [pnlIncomes]);

  const pnlTotalIncomeEquivalentBase = useMemo(() => {
    return convertToBase(pnlIncomesAFN, 'AFN') + convertToBase(pnlIncomesUSD, 'USD');
  }, [pnlIncomesAFN, pnlIncomesUSD, convertToBase]);

  // Income category breakdown for P&L display
  const pnlIncomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; amountAFN: number; amountUSD: number }> = {};
    (incomeCategories || []).forEach(cat => {
      map[cat.id] = { id: cat.id, name: cat.name, amountAFN: 0, amountUSD: 0 };
    });
    pnlIncomes.forEach(inc => {
      const catId = inc.categoryId || 'other';
      if (!map[catId]) {
        map[catId] = { id: catId, name: inc.categoryName || 'عایدات متفرقه', amountAFN: 0, amountUSD: 0 };
      }
      if (inc.currency === 'AFN') {
        map[catId].amountAFN += inc.amount;
      } else {
        map[catId].amountUSD += inc.amount;
      }
    });
    return Object.values(map).filter(cat => cat.amountAFN > 0 || cat.amountUSD > 0);
  }, [pnlIncomes, incomeCategories]);

  // Net Operating Profit = (Gross Profit + Incomes) - Operating Expenses
  const netProfitBase = (totalGrossProfitEquivalentBase + pnlTotalIncomeEquivalentBase) - pnlTotalExpEquivalentBase;

  // -------------------------------------------------------------
  // 7. BALANCE SHEET (ترازنامه و بیلاننس مالی)
  // -------------------------------------------------------------
  const totalAssetsAFN =
    cashRegister.afnBalance +
    cashRegister.usdBalance * (cashRegister.usdToAfnRate || 70.8) +
    (cashRegister.exchangeUsdBalance || 0) * (cashRegister.usdToAfnRate || 70.8) +
    stockStats.afnValue +
    partyMetrics.debtAFN +
    partyMetrics.debtUSD * (cashRegister.usdToAfnRate || 70.8);

  const totalLiabilitiesAFN =
    partyMetrics.creditAFN + partyMetrics.creditUSD * (cashRegister.usdToAfnRate || 70.8);

  const netCompanyWorthAFN = totalAssetsAFN - totalLiabilitiesAFN;

  // -------------------------------------------------------------
  // 8. DYNAMIC DOUBLE-ENTRY ACCOUNTING JOURNAL (دفتر روزنامه و اسناد دوبل حسابداری)
  // -------------------------------------------------------------
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalTypeFilter, setJournalTypeFilter] = useState<'all' | 'sales' | 'purchases' | 'payments' | 'expenses' | 'exchange'>('all');
  const [journalDisplayMode, setJournalDisplayMode] = useState<'comprehensive' | 'double_entry'>('comprehensive');

  const journalEntries = useMemo(() => {
    const list: {
      id: string;
      voucherNo: string;
      date: string;
      title: string;
      description: string;
      debitTitle: string;
      creditTitle: string;
      amount: number;
      currency: Currency;
      type: 'sales' | 'purchases' | 'payments' | 'expenses' | 'exchange';
      relatedInvoice?: Invoice;
      relatedTransaction?: FinancialTransaction;
      relatedExpense?: ExpenseItem;
    }[] = [];

    // Sales Invoices -> Journal Vouchers
    invoices.filter(i => i.type === 'sell').forEach(inv => {
      list.push({
        id: `jv-sell-${inv.id}`,
        voucherNo: `VOU-${inv.invoiceNumber}`,
        date: inv.date,
        title: `سند فروش کالا (فاکتور ${inv.invoiceNumber})`,
        description: `فروش به ${inv.partyName} - اقلام: ${inv.items.map(it => it.productName).join('، ')}`,
        debitTitle: inv.paidAmount > 0 
          ? (inv.balanceAmount === 0 ? 'صندوق نقدی (دریافت کامل نقدی)' : `حساب دریافتنی (${inv.partyName}) + صندوق نقدی`)
          : `حساب‌های دریافتنی تجارتی (${inv.partyName})`,
        creditTitle: 'درآمد حاصل از فروش کالا',
        amount: inv.totalAmount,
        currency: inv.currency,
        type: 'sales',
        relatedInvoice: inv,
      });
    });

    // Purchase Invoices -> Journal Vouchers
    invoices.filter(i => i.type === 'buy').forEach(inv => {
      list.push({
        id: `jv-buy-${inv.id}`,
        voucherNo: `VOU-${inv.invoiceNumber}`,
        date: inv.date,
        title: `سند خرید کالا (فاکتور خرید ${inv.invoiceNumber})`,
        description: `خرید از ${inv.partyName} - اقلام: ${inv.items.map(it => it.productName).join('، ')}`,
        debitTitle: 'موجودی کالای گدام‌ها / خرید تجارتی',
        creditTitle: inv.paidAmount > 0
          ? (inv.balanceAmount === 0 ? 'صندوق نقدی (پرداخت نقدی)' : `حساب‌های پرداختنی (${inv.partyName}) + صندوق`)
          : `حساب‌های پرداختنی تجارتی (${inv.partyName})`,
        amount: inv.totalAmount,
        currency: inv.currency,
        type: 'purchases',
        relatedInvoice: inv,
      });
    });

    // Financial Transactions -> Journal Vouchers
    transactions.forEach(tx => {
      if (tx.type === 'receive_payment') {
        list.push({
          id: `jv-tx-${tx.id}`,
          voucherNo: `VOU-${tx.transactionNumber || tx.id.slice(-6)}`,
          date: tx.date,
          title: `سند دریافت وجه نقد / تسویه طلبات (${tx.partyName || 'مشتری'})`,
          description: tx.notes || `دریافت وجه از طرف حساب ${tx.partyName}`,
          debitTitle: tx.cashRegisterName || (tx.currency === 'USD' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
          creditTitle: `حساب‌های دریافتنی (${tx.partyName || 'طرف حساب'})`,
          amount: tx.amount,
          currency: tx.currency,
          type: 'payments',
          relatedTransaction: tx,
        });
      } else if (tx.type === 'make_payment') {
        list.push({
          id: `jv-tx-${tx.id}`,
          voucherNo: `VOU-${tx.transactionNumber || tx.id.slice(-6)}`,
          date: tx.date,
          title: `سند پرداخت وجه نقد / تسویه بدهی (${tx.partyName || 'تأمین‌کننده'})`,
          description: tx.notes || `پرداخت وجه به طرف حساب ${tx.partyName}`,
          debitTitle: `حساب‌های پرداختنی (${tx.partyName || 'طرف حساب'})`,
          creditTitle: tx.cashRegisterName || (tx.currency === 'USD' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
          amount: tx.amount,
          currency: tx.currency,
          type: 'payments',
          relatedTransaction: tx,
        });
      } else if (tx.type === 'currency_exchange') {
        list.push({
          id: `jv-tx-${tx.id}`,
          voucherNo: `VOU-${tx.transactionNumber || tx.id.slice(-6)}`,
          date: tx.date,
          title: `سند تبادله و تبدیل ارز (صرافی)`,
          description: tx.notes || `تبدیل ارز با نرخ برابری ${tx.exchangeRate || 1}`,
          debitTitle: 'صندوق مقصد (ارز دریافت شده)',
          creditTitle: 'صندوق مبدا (ارز پرداخت شده)',
          amount: tx.amount,
          currency: tx.currency,
          type: 'exchange',
          relatedTransaction: tx,
        });
      }
    });

    // Expenses -> Journal Vouchers
    expenses.forEach(exp => {
      list.push({
        id: `jv-exp-${exp.id}`,
        voucherNo: `VOU-${exp.expenseNumber || exp.id.slice(-6)}`,
        date: exp.date,
        title: `سند هزینه ${exp.categoryName || 'جاری و اداری'}`,
        description: `${exp.title} • دریافت‌کننده: ${exp.recipient || 'متفرقه'}`,
        debitTitle: `هزینه‌های ${exp.categoryName || 'عملیاتی و تجارتی'}`,
        creditTitle: exp.cashRegisterName || (exp.currency === 'USD' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
        amount: exp.amount,
        currency: exp.currency,
        type: 'expenses',
        relatedExpense: exp,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, transactions, expenses]);

  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(j => {
      if (journalTypeFilter !== 'all' && j.type !== journalTypeFilter) return false;
      if (journalSearchQuery.trim()) {
        const q = journalSearchQuery.toLowerCase();
        return (
          j.voucherNo.toLowerCase().includes(q) ||
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.debitTitle.toLowerCase().includes(q) ||
          j.creditTitle.toLowerCase().includes(q) ||
          j.date.includes(q)
        );
      }
      return true;
    });
  }, [journalEntries, journalTypeFilter, journalSearchQuery]);

  // Backup handlers
  const handleDownloadBackup = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hesabdar-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLocalFileImport(file);
  };

  const handleLocalFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importJSON(content);
      if (success) {
        setImportStatus('اطلاعات با موفقیت بازیابی شد.');
      } else {
        setImportStatus('خطا در فایل پشتیبان. فرمت نامعتبر است.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  // Helper to render complete printable double-entry accounting journal voucher with transactions and goods
  const renderJournalVoucherPrintContent = (j: typeof journalEntries[0]) => {
    const inv = j.relatedInvoice;
    const exp = j.relatedExpense;
    const tx = j.relatedTransaction;

    return (
      <div className="space-y-6 text-slate-800 font-vazir text-right" dir="rtl">
        {/* 1. Top Header Box */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h2 className="text-xl font-black text-slate-900">سند دوبل حسابداری (دفتر روزنامه)</h2>
          <p className="text-xs text-slate-500 mt-1">شرکت بازرگانی برادران نبوی • سیستم یکپارچه حسابداری و مدیریت گدام</p>
        </div>

        {/* 2. Voucher Metadata Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block font-bold">شماره سند روزنامه:</span>
            <strong className="text-slate-900 font-black font-mono text-sm">{j.voucherNo}</strong>
          </div>
          <div>
            <span className="text-slate-500 block font-bold">تاریخ ثبت سند:</span>
            <strong className="text-slate-900 font-black font-mono">{j.date}</strong>
          </div>
          <div>
            <span className="text-slate-500 block font-bold">دسته‌بندی عملیات:</span>
            <strong className="text-slate-900 font-black">
              {j.type === 'sales' ? 'فاکتور فروش کالا' :
               j.type === 'purchases' ? 'فاکتور خرید کالا' :
               j.type === 'payments' ? 'دریافت / پرداخت نقدی' :
               j.type === 'expenses' ? 'سند مصارف و هزینه' : 'صرافی و تبدیل ارز'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block font-bold">مبلغ کل سند:</span>
            <strong className="text-slate-900 font-black font-mono text-sm text-emerald-700">
              {formatCurrency(j.amount, j.currency)}
            </strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block font-bold">عنوان سند:</span>
            <span className="text-slate-900 font-bold">{j.title}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block font-bold">شرح و بابت:</span>
            <span className="text-slate-700">{j.description}</span>
          </div>
        </div>

        {/* 3. Double Entry Accounting Articles (آرتیکل‌های حسابداری دوبل) */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-900">آرتیکل‌های ثبت دوبل حسابداری (بدهکار / بستانکار)</h3>
          <table className="w-full border-collapse border border-slate-300 text-xs text-right">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="border border-slate-300 p-2.5 w-12 text-center">ردیف</th>
                <th className="border border-slate-300 p-2.5">کد و شرح حسابداری معین / کل</th>
                <th className="border border-slate-300 p-2.5 text-center">بابت</th>
                <th className="border border-slate-300 p-2.5 text-rose-700 text-left font-mono">بدهکار (Debit)</th>
                <th className="border border-slate-300 p-2.5 text-blue-700 text-left font-mono">بستانکار (Credit)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 text-center font-mono font-bold">۱</td>
                <td className="border border-slate-300 p-2 font-black text-rose-800">{j.debitTitle}</td>
                <td className="border border-slate-300 p-2 text-slate-600 text-xs">ثبت بدهکار طبق سند {j.voucherNo}</td>
                <td className="border border-slate-300 p-2 font-mono font-black text-rose-700 text-left bg-rose-50/40">
                  {formatCurrency(j.amount, j.currency)}
                </td>
                <td className="border border-slate-300 p-2 text-center font-mono text-slate-300">-</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 text-center font-mono font-bold">۲</td>
                <td className="border border-slate-300 p-2 font-black text-blue-800">{j.creditTitle}</td>
                <td className="border border-slate-300 p-2 text-slate-600 text-xs">ثبت بستانکار طبق سند {j.voucherNo}</td>
                <td className="border border-slate-300 p-2 text-center font-mono text-slate-300">-</td>
                <td className="border border-slate-300 p-2 font-mono font-black text-blue-700 text-left bg-blue-50/40">
                  {formatCurrency(j.amount, j.currency)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black text-xs">
                <td colSpan={3} className="border border-slate-300 p-2 text-left">جمع تراز سند حسابداری (Balance):</td>
                <td className="border border-slate-300 p-2 text-rose-700 text-left font-mono">{formatCurrency(j.amount, j.currency)}</td>
                <td className="border border-slate-300 p-2 text-blue-700 text-left font-mono">{formatCurrency(j.amount, j.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. DETAILS OF TRANSACTIONS & GOODS / ریز معاملات و اقلام پیوست */}
        {inv && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900">
                جدول ریز اقلام کالاها و معاملات فاکتور ({inv.type === 'sell' ? 'فروش' : 'خرید'})
              </h3>
              <span className="text-[11px] font-bold text-slate-600">
                طرف حساب: <strong className="text-slate-900">{inv.partyName}</strong> • شماره فاکتور: <strong className="font-mono">{inv.invoiceNumber}</strong>
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs text-right">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                  <th className="border border-slate-300 p-2">نام کالا / شرح معامله</th>
                  <th className="border border-slate-300 p-2 text-center">تعداد / مقدار</th>
                  <th className="border border-slate-300 p-2 text-center">واحد</th>
                  <th className="border border-slate-300 p-2 text-left font-mono">قیمت واحد ({inv.currency})</th>
                  <th className="border border-slate-300 p-2 text-left font-mono">جمع کل ({inv.currency})</th>
                </tr>
              </thead>
              <tbody>
                {inv.items && inv.items.length > 0 ? (
                  inv.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-bold text-slate-800">{it.productName}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{formatNumber(it.quantity)}</td>
                      <td className="border border-slate-300 p-2 text-center">{it.unit || 'عدد'}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono">{formatNumber(it.unitPrice)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono font-black text-slate-900">{formatNumber(it.totalPrice)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-300 p-3 text-center text-slate-500">
                      هیچ قلم کالایی در این فاکتور ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-xs">
                  <td colSpan={4} className="border border-slate-300 p-2 text-left">مجموع ناخالص فاکتور:</td>
                  <td colSpan={2} className="border border-slate-300 p-2 text-left font-mono font-black">
                    {formatCurrency(inv.totalAmount + (inv.discount || 0), inv.currency)}
                  </td>
                </tr>
                {(inv.discount || 0) > 0 && (
                  <tr className="bg-slate-50 text-xs text-rose-700">
                    <td colSpan={4} className="border border-slate-300 p-2 text-left">تخفیف ویژه اعمال شده:</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-left font-mono font-bold">
                      -{formatCurrency(inv.discount, inv.currency)}
                    </td>
                  </tr>
                )}
                <tr className="bg-emerald-50 text-xs font-black text-emerald-900">
                  <td colSpan={4} className="border border-slate-300 p-2 text-left">مبلغ پرداختی نقد / تسویه شده:</td>
                  <td colSpan={2} className="border border-slate-300 p-2 text-left font-mono">
                    {formatCurrency(inv.paidAmount, inv.currency)}
                  </td>
                </tr>
                {inv.balanceAmount > 0 && (
                  <tr className="bg-amber-50 text-xs font-black text-amber-900">
                    <td colSpan={4} className="border border-slate-300 p-2 text-left">مانده نسیه / الباقی طلب:</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-left font-mono">
                      {formatCurrency(inv.balanceAmount, inv.currency)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {tx && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <h3 className="text-xs font-black text-slate-900">ریز جزئیات تراکنش مالی و تسویه معامله</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block font-bold">طرف حساب:</span>
                <strong className="text-slate-900 font-bold">{tx.partyName || 'طرف حساب متفرقه'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">صندوق / حساب مالی:</span>
                <strong className="text-slate-900 font-bold">{tx.cashRegisterName || 'صندوق اصلی شرکت'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">نوع معامله مالی:</span>
                <strong className="text-slate-900 font-bold">
                  {tx.type === 'receive_payment' ? 'دریافت وجه (تسویه بدهی مشتری)' :
                   tx.type === 'make_payment' ? 'پرداخت وجه (تسویه حساب طلبکار)' : 'تبدیل و خرید/فروش ارز'}
                </strong>
              </div>
              {tx.exchangeRate && tx.exchangeRate !== 1 && (
                <div>
                  <span className="text-slate-500 block font-bold">نرخ تبادله ارز:</span>
                  <strong className="text-slate-900 font-mono">{tx.exchangeRate}</strong>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-slate-500 block font-bold">شرح و بابت:</span>
                <span className="text-slate-800">{tx.notes || 'تسویه حساب حسابداری'}</span>
              </div>
            </div>
          </div>
        )}

        {exp && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <h3 className="text-xs font-black text-slate-900">ریز جزئیات سند مصارف و هزینه‌ها</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block font-bold">عنوان هزینه:</span>
                <strong className="text-slate-900 font-bold">{exp.title}</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">سرفصل دسته‌بندی:</span>
                <strong className="text-slate-900 font-bold">{exp.categoryName || 'مصارف جاری شرکت'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">دریافت‌کننده وجه:</span>
                <strong className="text-slate-900 font-bold">{exp.recipient || 'متفرقه'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">صندوق پرداخت‌کننده:</span>
                <strong className="text-slate-900 font-bold">{exp.cashRegisterName || 'صندوق نقد'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block font-bold">شرح تفصیلی:</span>
                <span className="text-slate-800">{exp.notes || 'هزینه‌های تجارتی شرکت'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Official Signatures */}
        <div className="grid grid-cols-4 gap-3 pt-10 border-t border-slate-200 text-center text-xs">
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تنظیم‌کننده سند</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              امور حسابداری
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">حسابدار مسئول</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              تایید دفاتر
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">مدیر امور مالی</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مدیریت مالی
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">امضای مدیریت عامله</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              برادران نبوی
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & Section Selector Tabs */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <FileBarChart className="w-7 h-7 text-indigo-600" />
              <span>مرکز گزارشات جامع، مانده اشخاص و حسابداری</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              مشاهده طلبات، بدهیات، موجودی کالاها به تفکیک گدام، گزارش فروش و خرید، سود و زیان، و ترازنامه مالی
            </p>
          </div>

          {/* Quick Rate & Net Worth Badge */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <span className="text-slate-500">نرخ روز صرافی:</span>
            <span className="font-mono text-emerald-700 font-black">1$ = {cashRegister.usdToAfnRate || 70.8} ؋</span>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <span className="text-slate-500">سرمایه خالص:</span>
            <span className="font-mono text-blue-700 font-black">{formatNumber(netCompanyWorthAFN)} ؋</span>
          </div>
        </div>

        {/* Scrollable Sub-Menu Navigation Tabs */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
          <button
            id="tab-btn-parties"
            onClick={() => setActiveSection('parties')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'parties'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>گزارش و مانده اشخاص (بدهکار/بستانکار)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${activeSection === 'parties' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {parties.length}
            </span>
          </button>

          <button
            id="tab-btn-inventory"
            onClick={() => setActiveSection('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>موجودی کالا (کلی و در گدام‌ها)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${activeSection === 'inventory' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {products.length}
            </span>
          </button>

          <button
            id="tab-btn-sales"
            onClick={() => setActiveSection('sales')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'sales'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>گزارش فروشات</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${activeSection === 'sales' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {sellInvoices.length}
            </span>
          </button>

          <button
            id="tab-btn-product-sales"
            onClick={() => setActiveSection('product_sales')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'product_sales'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>فروش کالاها (روزانه/ماهانه/سالانه)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${activeSection === 'product_sales' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
              تحلیلی
            </span>
          </button>

          <button
            id="tab-btn-purchases"
            onClick={() => setActiveSection('purchases')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'purchases'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>گزارش خریدها</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${activeSection === 'purchases' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {buyInvoices.length}
            </span>
          </button>

          <button
            id="tab-btn-expenses"
            onClick={() => setActiveSection('expenses')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'expenses'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>هزینه‌ها و مصارف</span>
          </button>

          <button
            id="tab-btn-profit-loss"
            onClick={() => setActiveSection('profit_loss')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'profit_loss'
                ? 'bg-teal-700 text-white shadow-sm shadow-teal-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>سود و زیان (P&L)</span>
          </button>

          <button
            id="tab-btn-balance-sheet"
            onClick={() => setActiveSection('balance_sheet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'balance_sheet'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>ترازنامه و بیلاننس</span>
          </button>

          <button
            id="tab-btn-journal"
            onClick={() => setActiveSection('journal')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'journal'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>اسناد حسابداری</span>
          </button>

          <button
            id="tab-btn-fixed-assets"
            onClick={() => setActiveSection('fixed_assets')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'fixed_assets'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>دارایی‌های ثابت</span>
          </button>

          <button
            id="tab-btn-shareholders"
            onClick={() => setActiveSection('shareholders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'shareholders'
                ? 'bg-cyan-700 text-white shadow-sm shadow-cyan-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>امور سهامداران</span>
          </button>

          <button
            id="tab-btn-backup"
            onClick={() => setActiveSection('backup')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSection === 'backup'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>پشتیبان‌گیری</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECTION: PARTY BALANCES / گزارش و مانده اشخاص (بدهکاران و بستانکاران) */}
      {/* ========================================================================= */}
      {activeSection === 'parties' && (
        <div className="space-y-6">
          {/* Summary KPI Cards for Party Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Debtors in AFN & USD (Money owed to us) */}
            <div className="bg-white p-5 rounded-3xl border border-rose-200/80 shadow-xs space-y-2 bg-gradient-to-br from-rose-50/40 via-white to-white relative group">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                <span>طلبات ما از مشتریان (بدهکاران)</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                    {partyMetrics.totalDebtorsCount} نفر
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintPartiesReport('debtors')}
                    className="p-1 text-rose-700 hover:bg-rose-100 rounded-lg transition border border-rose-200 cursor-pointer"
                    title="چاپ اختصاصی لیست بدهکاران"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-rose-700 font-mono">
                  {formatCurrency(partyMetrics.debtAFN, 'AFN')}
                </div>
                <div className="text-sm font-bold text-rose-600 font-mono">
                  {formatCurrency(partyMetrics.debtUSD, 'USD')}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-slate-400">مجموع قرضه مشتریان بابت فاکتورهای فروش</p>
                <button
                  type="button"
                  onClick={() => handlePrintPartiesReport('debtors')}
                  className="text-[10px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>چاپ بدهکاران</span>
                </button>
              </div>
            </div>

            {/* Creditors in AFN & USD (Money we owe to suppliers) */}
            <div className="bg-white p-5 rounded-3xl border border-blue-200/80 shadow-xs space-y-2 bg-gradient-to-br from-blue-50/40 via-white to-white relative group">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                <span>بدهی ما به تأمین‌کنندگان (بستانکاران)</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                    {partyMetrics.totalCreditorsCount} نفر
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintPartiesReport('creditors')}
                    className="p-1 text-blue-700 hover:bg-blue-100 rounded-lg transition border border-blue-200 cursor-pointer"
                    title="چاپ اختصاصی لیست بستانکاران (طلبکاران)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-blue-700 font-mono">
                  {formatCurrency(partyMetrics.creditAFN, 'AFN')}
                </div>
                <div className="text-sm font-bold text-blue-600 font-mono">
                  {formatCurrency(partyMetrics.creditUSD, 'USD')}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-slate-400">مجموع مانده حساب و طلب فروشندگان و تجار</p>
                <button
                  type="button"
                  onClick={() => handlePrintPartiesReport('creditors')}
                  className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>چاپ بستانکاران</span>
                </button>
              </div>
            </div>

            {/* Net Receivables */}
            <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-xs space-y-2 bg-gradient-to-br from-emerald-50/40 via-white to-white">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>خالص طلبات تجارتی (به معادل افغانی)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-800 font-mono">
                {formatNumber(partyMetrics.netReceivablesAFN)} ؋
              </div>
              <div className="text-xs font-bold text-slate-500 font-mono">
                معادل: ${formatNumber(partyMetrics.netReceivablesAFN / (cashRegister.usdToAfnRate || 70.8))}
              </div>
              <p className="text-[10px] text-slate-400">تفاضل طلبات منهای بدهی‌های تجارتی</p>
            </div>

            {/* Settled / Total Parties */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>وضعیت کلی حساب‌ها</span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">{parties.length}</div>
                  <div className="text-[10px] text-slate-400">کل طرف‌حساب‌ها</div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <div className="text-lg font-black text-slate-600 font-mono">{partyMetrics.totalSettledCount}</div>
                  <div className="text-[10px] text-slate-400">حساب‌های تسویه‌شده</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">در {partyGroups.length} دسته‌بندی و گروه مجزا</p>
            </div>
          </div>

          {/* Search, Status Filter & Group Filter Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی نام شخص، شرکت، شماره تماس..."
                  value={partySearchQuery}
                  onChange={e => setPartySearchQuery(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setPartyStatusFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    partyStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  همه ({parties.length})
                </button>
                <button
                  onClick={() => setPartyStatusFilter('debtors')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    partyStatusFilter === 'debtors'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  بدهکاران به ما ({partyMetrics.totalDebtorsCount})
                </button>
                <button
                  onClick={() => setPartyStatusFilter('creditors')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    partyStatusFilter === 'creditors'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  بستانکاران از ما ({partyMetrics.totalCreditorsCount})
                </button>
                <button
                  onClick={() => setPartyStatusFilter('settled')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    partyStatusFilter === 'settled'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  تسویه شده ({partyMetrics.totalSettledCount})
                </button>
              </div>

              {/* Group and Sort dropdowns + Print button */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                <div className="flex items-center gap-1">
                  <select
                    value={partyGroupFilter}
                    onChange={e => setPartyGroupFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
                  >
                    <option value="all">تمام گروه‌ها</option>
                    {partyGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {partyGroupFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handlePrintPartiesReport(partyStatusFilter, partyGroupFilter)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title={`چاپ مشخص این گروه (${partyGroups.find(g => g.id === partyGroupFilter)?.name || ''})`}
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">چاپ این گروه</span>
                    </button>
                  )}
                </div>

                <select
                  value={partySortBy}
                  onChange={e => setPartySortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
                >
                  <option value="max_debt">بیشترین بدهکاری به ما</option>
                  <option value="max_credit">بیشترین بستانکاری (طلب)</option>
                  <option value="name">نام (الفبا)</option>
                </select>

                <button
                  type="button"
                  onClick={() => handlePrintPartiesReport()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  title="چاپ رسمی صورت وضعیت مانده حساب اشخاص"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ گزارش اشخاص</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Party Balances Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>لیست تفصیلی مانده حساب اشخاص (افغانی و دلاری)</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-bold">
                  تعداد موارد: <strong className="text-slate-900 font-mono">{filteredParties.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handlePrintPartiesReport()}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="چاپ لیست مانده حساب اشخاص"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ این لیست</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">کد / نام شخص و شرکت</th>
                    <th className="px-5 py-3.5">شماره تماس / آدرس</th>
                    <th className="px-5 py-3.5">گروه طرف‌حساب</th>
                    <th className="px-5 py-3.5">وضعیت حساب</th>
                    <th className="px-5 py-3.5 text-left">مانده حساب افغانی (AFN)</th>
                    <th className="px-5 py-3.5 text-left">مانده حساب دلاری (USD)</th>
                    <th className="px-5 py-3.5 text-left">معادل کل به افغانی</th>
                    <th className="px-5 py-3.5 text-center">عملیات و کارتکس</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        هیچ حسابی با مشخصات فیلتر شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((p, idx) => {
                      const isDebtorAFN = p.balanceAFN < 0;
                      const isCreditorAFN = p.balanceAFN > 0;
                      const isDebtorUSD = p.balanceUSD < 0;
                      const isCreditorUSD = p.balanceUSD > 0;

                      const isOverallDebtor = p.balanceAFN < 0 || p.balanceUSD < 0;
                      const isOverallCreditor = p.balanceAFN > 0 || p.balanceUSD > 0;
                      const isSettled = p.balanceAFN === 0 && p.balanceUSD === 0;

                      // Total equivalent in AFN
                      const totalEquivalentAFN =
                        p.balanceAFN + p.balanceUSD * (cashRegister.usdToAfnRate || 70.8);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-indigo-50/30 transition group"
                        >
                          {/* Name & Company */}
                          <td className="px-5 py-3.5">
                            <div
                              onClick={() => setSelectedPartyForCardex(p)}
                              className="flex items-center gap-2.5 cursor-pointer group/name"
                              title="کلیک برای ورود به صفحه و پرونده مالی این شخص"
                            >
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover/name:bg-indigo-600 group-hover/name:text-white transition">
                                {p.name ? p.name[0] : '؟'}
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block group-hover/name:text-indigo-600 group-hover/name:underline transition">
                                  {p.name}
                                </span>
                                {p.company && <span className="text-[10px] text-slate-400">{p.company}</span>}
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                            <div>{p.phone || '—'}</div>
                            {p.address && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{p.address}</div>}
                          </td>

                          {/* Group */}
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                              {p.groupName || 'عمومی'}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5">
                            {isOverallDebtor && (
                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                <span>بدهکار به ما (قرضدار)</span>
                              </span>
                            )}
                            {isOverallCreditor && (
                              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                <span>طلبکار از ما</span>
                              </span>
                            )}
                            {isSettled && (
                              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                تسویه / بی‌حساب
                              </span>
                            )}
                          </td>

                          {/* AFN Balance */}
                          <td className="px-5 py-3.5 text-left font-mono">
                            <div
                              className={`font-black text-xs ${
                                isDebtorAFN
                                  ? 'text-rose-600'
                                  : isCreditorAFN
                                  ? 'text-blue-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.balanceAFN === 0
                                ? '0 ؋'
                                : `${formatNumber(Math.abs(p.balanceAFN))} ؋`}
                            </div>
                            {isDebtorAFN && <span className="text-[9px] text-rose-500 font-bold block">بدهکار</span>}
                            {isCreditorAFN && <span className="text-[9px] text-blue-500 font-bold block">طلبکار</span>}
                          </td>

                          {/* USD Balance */}
                          <td className="px-5 py-3.5 text-left font-mono">
                            <div
                              className={`font-black text-xs ${
                                isDebtorUSD
                                  ? 'text-rose-600'
                                  : isCreditorUSD
                                  ? 'text-blue-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.balanceUSD === 0
                                ? '$0'
                                : `$${formatNumber(Math.abs(p.balanceUSD))}`}
                            </div>
                            {isDebtorUSD && <span className="text-[9px] text-rose-500 font-bold block">بدهکار</span>}
                            {isCreditorUSD && <span className="text-[9px] text-blue-500 font-bold block">طلبکار</span>}
                          </td>

                          {/* Total Equivalent in AFN */}
                          <td className="px-5 py-3.5 text-left font-mono">
                            <span
                              className={`font-black text-xs ${
                                totalEquivalentAFN < 0
                                  ? 'text-rose-700'
                                  : totalEquivalentAFN > 0
                                  ? 'text-blue-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {totalEquivalentAFN === 0
                                ? '0 ؋'
                                : `${formatNumber(Math.abs(totalEquivalentAFN))} ؋`}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPartyForCardex(p)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-indigo-200"
                                title="مشاهده صورت‌حساب کامل، گردش فاکتورها و دریافت/پرداخت"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>کارتکس / دفتر کل</span>
                              </button>

                              {onOpenPaymentModal && (
                                <>
                                  <button
                                    onClick={() => onOpenPaymentModal('receive_payment', p.id)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition cursor-pointer border border-emerald-200"
                                    title="دریافت پول از این شخص"
                                  >
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => onOpenPaymentModal('make_payment', p.id)}
                                    className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl transition cursor-pointer border border-orange-200"
                                    title="پرداخت پول به این شخص"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SECTION: PRODUCT INVENTORY / موجودی کالا (کلی و در گدام‌ها) */}
      {/* ========================================================================= */}
      {activeSection === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-xs space-y-2 bg-gradient-to-br from-emerald-50/40 via-white to-white">
              <span className="text-xs font-bold text-emerald-800">مجموع تناژ موجود در انبارها</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatNumber(stockStats.totalTons)} <span className="text-sm font-sans">تن</span>
              </div>
              <div className="text-xs text-slate-500 font-mono font-bold">
                معادل {formatNumber(stockStats.totalBags)} کیسه استاندارد
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">ارزش کل موجودی به افغانی (قیمت خرید)</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatNumber(stockStats.afnValue)} ؋
              </div>
              <div className="text-xs text-slate-400">بر اساس میانگین نرخ خرید اجناس</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">ارزش دلاری موجودی گدام‌ها</span>
              <div className="text-2xl font-black text-blue-700 font-mono">
                ${formatNumber(stockStats.usdValue)}
              </div>
              <div className="text-xs text-slate-400">سرمایه راکد در گدام‌های فعال</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500">گدام‌های تحت پوشش</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {warehouses.length} <span className="text-sm font-sans">گدام</span>
              </div>
              <div className="text-xs text-slate-500">
                مرکزی کابل، هرات، امانی و ملکی
              </div>
            </div>
          </div>

          {/* Low Stock Alert Banner inside Inventory Report */}
          {allProductsWithStock.filter(p => p.isOut || p.isLow).length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-700 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span>سیستم هشدار موجودی پایین گدام‌ها</span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      {allProductsWithStock.filter(p => p.isOut || p.isLow).length} قلم کالا زیر نقطه سفارش
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    موجودی کالاهای زیر به حد نصاب هشدار (حداقل مجاز) یا صفر رسیده است. توصیه می‌شود نسبت به ثبت فاکتور خرید یا انتقال اقدام فرمایید.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    stockStatusFilter === 'low'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{stockStatusFilter === 'low' ? 'نمایش همه کالاها' : 'فیلتر اقلام دارای کسری و هشدار'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* بخش موجودی هر گروه: نمایش تعداد باقیمانده هر گروه در زیر جمله */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Boxes className="w-4 h-4 text-emerald-700" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    موجودی هر گروه
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                    {categoryStockSummary.length} گروه کالایی
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  تعداد و تناژ باقیمانده کالاهای هر گروه به تفکیک تن، کیسه و وضعیت انبار
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {stockCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStockCategoryFilter('all')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200 shadow-2xs"
                  >
                    <span>نمایش همه گروه‌ها (لغو فیلتر «{stockCategoryFilter}»)</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[11px]">
                  {stockWarehouseFilter === 'all'
                    ? 'محاسبه در تمام گدام‌ها'
                    : `گدام: ${warehouses.find(w => w.id === stockWarehouseFilter)?.name || 'انتخابی'}`}
                </div>
              </div>
            </div>

            {/* کارت‌های تعداد باقیمانده هر گروه در زیر جمله */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {categoryStockSummary.map(cat => {
                const isSelected = stockCategoryFilter === cat.name;
                const isOut = cat.totalTons <= 0;
                const hasLow = cat.lowCount > 0;

                return (
                  <button
                    type="button"
                    key={cat.name}
                    id={`category-stock-card-${cat.name.replace(/\s+/g, '-')}`}
                    onClick={() => setStockCategoryFilter(isSelected ? 'all' : cat.name)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                        : isOut
                        ? 'bg-rose-50/30 hover:bg-rose-50/70 border-rose-200'
                        : hasLow
                        ? 'bg-amber-50/30 hover:bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50/70 hover:bg-white hover:border-slate-300 hover:shadow-2xs border-slate-200'
                    }`}
                  >
                    <div className="w-full space-y-2.5">
                      {/* عنوان گروه و تعداد اقلام */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-800 flex items-center gap-2 truncate">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isOut ? 'bg-rose-500' : hasLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="truncate group-hover:text-emerald-700 transition">
                            {cat.name}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                          {cat.productCount} قلم کالا
                        </span>
                      </div>

                      {/* کادر تعداد باقیمانده */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-bold text-slate-500">تعداد باقیمانده:</span>
                          <div className="text-left font-mono">
                            <span className="text-base font-black text-slate-900">
                              {formatNumber(cat.totalTons)}
                            </span>
                            <span className="text-[11px] font-sans text-slate-600 font-bold mr-1">تن</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span>معادل کیسه:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {formatNumber(cat.totalBags)} <span className="text-[10px] font-sans">کیسه</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* وضعیت و راهنمای فیلتر */}
                    <div className="w-full mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[10px]">
                      {isOut ? (
                        <span className="text-rose-600 font-bold">● موجودی صفر</span>
                      ) : hasLow ? (
                        <span className="text-amber-700 font-bold">⚠️ {cat.lowCount} قلم نیازمند خرید</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">✓ موجودی کافی</span>
                      )}
                      <div className="flex items-center gap-1">
                        <span className={`font-bold transition ${
                          isSelected ? 'text-emerald-700 underline font-black' : 'text-slate-400 group-hover:text-emerald-600'
                        }`}>
                          {isSelected ? 'فیلتر فعال' : 'کلیک برای فیلتر'}
                        </span>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintInventoryReport(cat.name);
                          }}
                          className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-md transition"
                          title={`چاپ موجودی رسمی گروه ${cat.name}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Category Filters */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی نام کالا یا کد..."
                value={stockSearchQuery}
                onChange={e => setStockSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <select
                value={stockWarehouseFilter}
                onChange={e => setStockWarehouseFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">تمام گدام‌ها</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={stockCategoryFilter}
                onChange={e => setStockCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none font-medium"
              >
                <option value="all">تمام گروه‌ها (مجموع {formatNumber(stockStats.totalTons)} تن)</option>
                {categoryStockSummary.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} (باقیمانده: {formatNumber(c.totalTons)} تن)
                  </option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none font-bold"
              >
                <option value="all">تمام وضعیت‌ها</option>
                <option value="available">موجودی کافی و مطلوب</option>
                <option value="low">⚠️ هشدار کسری و موجودی کم</option>
                <option value="out">❌ ناموجود (موجودی صفر)</option>
              </select>

              <button
                type="button"
                onClick={() => handlePrintInventoryReport()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
                title="چاپ رسمی موجودی کالاها و تفکیک گدام‌ها"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ موجودی کالا</span>
              </button>
            </div>
          </div>

          {/* Product Inventory Table (Total & Per Warehouse Breakdown) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>موجودی کلی کالاها، حد نصاب هشدار و تفکیک در هر گدام (تن و کیسه)</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-bold">
                  تعداد اقلام: <strong className="text-slate-900 font-mono">{filteredProductsWithStock.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handlePrintInventoryReport()}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="چاپ رسمی لیست موجودی فیلتر شده"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ لیست</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">کد / نام کالا و مشخصات</th>
                    <th className="px-5 py-3.5">دسته‌بندی و وزن کیسه</th>
                    <th className="px-5 py-3.5 text-center">حد نصاب هشدار (نقطه سفارش)</th>
                    <th className="px-5 py-3.5 text-center">موجودی کل و وضعیت</th>
                    <th className="px-5 py-3.5">موجودی تفکیکی در گدام‌ها</th>
                    <th className="px-5 py-3.5 text-left">نرخ خرید / فروش فی تن</th>
                    <th className="px-5 py-3.5 text-left">ارزش کل موجودی</th>
                    <th className="px-5 py-3.5 text-center">کارتکس کالا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProductsWithStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        کالایی با شرایط جستجو یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredProductsWithStock.map(({ product: prod, overallStock, warehouseBreakdown, minThreshold, deficitTons, isLow, isOut, valueAFN, valueUSD }) => (
                      <tr
                        key={prod.id}
                        className={`transition group ${
                          isOut
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : isLow
                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                            : 'hover:bg-emerald-50/30'
                        }`}
                      >
                        {/* Name & Code */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <strong className="text-slate-900 block text-xs">{prod.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{prod.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category & Bag Weight */}
                        <td className="px-5 py-3.5">
                          <div className="text-slate-700 font-bold">{prod.category || 'عمومی'}</div>
                          <div className="text-[10px] text-slate-400">
                            کیسه {prod.bagWeightKg || 50} کیلویی ({prod.bagsPerTon || 20} کیسه/تن)
                          </div>
                        </td>

                        {/* Minimum Threshold */}
                        <td className="px-5 py-3.5 text-center font-mono">
                          <div className="font-bold text-slate-800 text-xs">
                            {minThreshold} تن
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({Math.round(minThreshold * (prod.bagsPerTon || 20))} کیسه)
                          </div>
                        </td>

                        {/* Total Stock & Low Stock Status Badge */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="font-black text-sm text-slate-900 font-mono">
                            {formatNumber(overallStock.tons)} <span className="text-[10px] font-sans">تن</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold font-mono">
                            ({formatNumber(overallStock.bags)} کیسه)
                          </div>
                          {isOut ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-extrabold border border-rose-200">
                              ❌ ناموجود
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex flex-col mt-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-300">
                              <span className="flex items-center gap-0.5 justify-center">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>هشدار کسری</span>
                              </span>
                              <span className="text-[8px] text-rose-700">کسری: {deficitTons} تن</span>
                            </span>
                          ) : (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                              ✅ مطلوب
                            </span>
                          )}
                        </td>

                        {/* Breakdown Per Warehouse */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {warehouseBreakdown.map(wh => (
                              <div
                                key={wh.warehouseId}
                                className={`px-2.5 py-1 rounded-xl text-[10px] border flex items-center gap-1.5 font-mono ${
                                  wh.tons > 0
                                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                                    : 'bg-slate-50/50 border-slate-100 text-slate-400'
                                }`}
                              >
                                <span className="font-sans font-bold text-slate-600">{wh.warehouseName}:</span>
                                <strong className={wh.tons > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                                  {formatNumber(wh.tons)} تن
                                </strong>
                                <span className="text-[9px] text-slate-400">({formatNumber(wh.bags)} ک)</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Unit Prices */}
                        <td className="px-5 py-3.5 text-left font-mono">
                          <div className="text-[11px] text-slate-700">
                            خرید: <strong>{formatCurrency(prod.buyPriceAFN, 'AFN')}</strong>
                          </div>
                          <div className="text-[10px] text-emerald-700">
                            فروش: <strong>{formatCurrency(prod.sellPriceAFN, 'AFN')}</strong>
                          </div>
                        </td>

                        {/* Total Stock Value */}
                        <td className="px-5 py-3.5 text-left font-mono">
                          <div className="font-black text-xs text-slate-900">
                            {formatNumber(valueAFN)} ؋
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ${formatNumber(valueUSD)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProductForCardex(prod)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                              title="مشاهده گردش ورود، خروج و انتقال کالا"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>کارتکس کالا</span>
                            </button>

                            <button
                              onClick={() => setSelectedProductForCardex(prod)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-xs"
                              title="چاپ فوری کارتکس کالا"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {onOpenTransferModal && (
                              <button
                                onClick={() => onOpenTransferModal()}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                                title="حواله و انتقال بین گدام‌ها"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* ========================================================================= */}
      {/* 3. SECTION: SALES REPORT / گزارش فروشات */}
      {/* ========================================================================= */}
      {activeSection === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs bg-gradient-to-br from-rose-50/40 via-white to-white">
              <span className="text-xs font-bold text-rose-800">مجموع فروش به افغانی</span>
              <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                {formatCurrency(salesAggregations.totalAFN, 'AFN')}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                وصول نقدی: {formatCurrency(salesAggregations.paidAFN, 'AFN')} • نسیه: {formatCurrency(salesAggregations.debtAFN, 'AFN')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs bg-gradient-to-br from-rose-50/40 via-white to-white">
              <span className="text-xs font-bold text-rose-800">مجموع فروش به دلار ($)</span>
              <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                {formatCurrency(salesAggregations.totalUSD, 'USD')}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                وصول نقدی: ${formatNumber(salesAggregations.paidUSD)} • نسیه: ${formatNumber(salesAggregations.debtUSD)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">کل تناژ و کیسه‌های فروخته شده</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {formatNumber(salesAggregations.totalTons)} <span className="text-sm font-sans">تن</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                معادل {formatNumber(salesAggregations.totalBags)} کیسه در {sellInvoices.length} فاکتور فروش
              </div>
            </div>
          </div>

          {/* بنر سوئیچ سریع به تحلیل و تفکیک فروشات کالاها */}
          <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  تحلیل و مشخص کردن فروشات روزانه، ماهانه و سالانه کالاها
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  بررسی دقیق حجم، تناژ و ارزش فروش برای یک کالای مشخص یا چند کالای انتخابی
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('product_sales')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <TrendingUp className="w-4 h-4" />
              <span>مشاهده فروش روزانه، ماهانه و سالانه کالاها</span>
            </button>
          </div>

          {/* Advanced Filter Bar with Persian Calendar and Multi-criteria filters */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Persian Date Picker */}
              <div className="flex-1">
                <PersianDateRangePicker
                  fromDate={salesFromDate}
                  toDate={salesToDate}
                  onChangeRange={(from, to) => {
                    setSalesFromDate(from);
                    setSalesToDate(to);
                  }}
                  onClear={() => {
                    setSalesFromDate('');
                    setSalesToDate('');
                  }}
                  label="فیلتر بازه زمانی و تقویم فروشات"
                  themeColor="emerald"
                />
              </div>

              {/* Universal Print Button */}
              <button
                type="button"
                onClick={handlePrintSalesReport}
                className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
                title="چاپ گزارش رسمی و تفصیلی فروشات"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسمی گزارش فروشات</span>
              </button>
            </div>

            {/* Detailed Select Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
              {/* Search query */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی شماره فاکتور، خریدار، کالا..."
                  value={salesSearchQuery}
                  onChange={e => setSalesSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Party / Customer filter */}
              <select
                value={salesPartyFilter}
                onChange={e => setSalesPartyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه مشتریان</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Product filter */}
              <select
                value={salesProductFilter}
                onChange={e => setSalesProductFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه کالاها</option>
                {products.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>

              {/* Currency filter */}
              <select
                value={salesCurrencyFilter}
                onChange={e => setSalesCurrencyFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none font-bold"
              >
                <option value="all">همه ارزها (افغانی و دلار)</option>
                <option value="AFN">فقط افغانی (AFN)</option>
                <option value="USD">فقط دالر (USD)</option>
              </select>

              {/* Payment status filter */}
              <select
                value={salesPaymentStatusFilter}
                onChange={e => setSalesPaymentStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه وضعیت‌های پرداخت</option>
                <option value="paid">تسویه کامل نقدی</option>
                <option value="partial">نیمه‌نسیه</option>
                <option value="unpaid">نسیه و قرض</option>
              </select>
            </div>

            {/* Filter tags / active filters reset */}
            {(salesSearchQuery || salesCurrencyFilter !== 'all' || salesPartyFilter !== 'all' || salesProductFilter !== 'all' || salesPaymentStatusFilter !== 'all' || salesFromDate || salesToDate) && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-rose-700">فیلترهای فعال:</span>
                  {salesFromDate && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">از {salesFromDate}</span>}
                  {salesToDate && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">تا {salesToDate}</span>}
                  {salesPartyFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">مشتری انتخاب شده</span>}
                  {salesProductFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">کالای انتخاب شده</span>}
                  {salesCurrencyFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">ارز: {salesCurrencyFilter}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSalesSearchQuery('');
                    setSalesCurrencyFilter('all');
                    setSalesFromDate('');
                    setSalesToDate('');
                    setSalesPartyFilter('all');
                    setSalesProductFilter('all');
                    setSalesPaymentStatusFilter('all');
                    setSalesWarehouseFilter('all');
                  }}
                  className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer text-xs shrink-0"
                >
                  حذف همه فیلترها
                </button>
              </div>
            )}
          </div>

          {/* Sales Invoices Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                <span>فهرست فاکتورهای فروش صادر شده</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-bold">
                  تعداد: <strong className="text-slate-900 font-mono">{filteredSellInvoices.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={handlePrintSalesReport}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="چاپ رسمی فاکتورهای فیلتر شده"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ گزارش فروشات</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">شماره فاکتور / تاریخ</th>
                    <th className="px-5 py-3.5">مشتری / خریدار</th>
                    <th className="px-5 py-3.5">اقلام، کالاها و تناژ فروش</th>
                    <th className="px-5 py-3.5 text-left">مبلغ کل فاکتور</th>
                    <th className="px-5 py-3.5 text-left">پرداخت نقدی</th>
                    <th className="px-5 py-3.5 text-left">مانده نسیه</th>
                    <th className="px-5 py-3.5 text-center">مشاهده و چاپ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSellInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">
                        هیچ فاکتور فروشی مطابق فیلترهای اعمال شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredSellInvoices.map(inv => {
                      const totalTons = inv.items?.reduce((sum, it) => sum + (it.tonsCount || 0), 0) || 0;
                      const totalBags = inv.items?.reduce((sum, it) => sum + (it.bagsCount || 0), 0) || 0;

                      return (
                        <tr key={inv.id} className="hover:bg-rose-50/20 transition">
                          <td className="px-5 py-3.5 font-mono">
                            <strong className="text-slate-900">{inv.invoiceNumber}</strong>
                            <div className="text-[10px] text-slate-400">{inv.date}</div>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {inv.partyName}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {inv.items?.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-[11px]"
                                >
                                  <Package className="w-3 h-3 text-rose-500" />
                                  <strong className="font-bold">{it.productName}:</strong>
                                  <span className="font-mono">{formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}</span>
                                </span>
                              ))}
                            </div>
                            {(totalTons > 0 || totalBags > 0) && (
                              <div className="text-[10px] text-slate-500 font-mono mt-1 font-bold">
                                مجموع: {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''} {totalBags > 0 ? `(${formatNumber(totalBags)} کیسه)` : ''}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono font-black text-slate-900">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-emerald-700 font-bold">
                            {formatCurrency(inv.paidAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-rose-600 font-black">
                            {formatCurrency(inv.balanceAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onViewInvoice && onViewInvoice(inv.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                                title="مشاهده جزئیات فاکتور"
                              >
                                نمایش
                              </button>
                              <button
                                onClick={() => openPrintModal({ type: 'invoice', invoice: inv })}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                                title="چاپ مستقیم فاکتور"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.5. SECTION: PRODUCT SALES ANALYSIS / گزارش و تحلیل فروشات کالاها (روزانه • ماهانه • سالانه) */}
      {/* ========================================================================= */}
      {activeSection === 'product_sales' && (
        <ProductSalesAnalysis onViewInvoice={onViewInvoice} />
      )}

      {/* ========================================================================= */}
      {/* 4. SECTION: PURCHASES REPORT / گزارش خریدها */}
      {/* ========================================================================= */}
      {activeSection === 'purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs bg-gradient-to-br from-blue-50/40 via-white to-white">
              <span className="text-xs font-bold text-blue-800">مجموع خریدهای افغانی</span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {formatCurrency(buyAggregations.totalAFN, 'AFN')}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                پرداخت شده: {formatCurrency(buyAggregations.paidAFN, 'AFN')} • باقیمانده طلب: {formatCurrency(buyAggregations.payableAFN, 'AFN')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs bg-gradient-to-br from-blue-50/40 via-white to-white">
              <span className="text-xs font-bold text-blue-800">مجموع خریدهای دلاری ($)</span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {formatCurrency(buyAggregations.totalUSD, 'USD')}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                پرداخت شده: ${formatNumber(buyAggregations.paidUSD)} • مانده طلب: ${formatNumber(buyAggregations.payableUSD)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">کل تناژ خریداری و وارده به گدام‌ها</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {formatNumber(buyAggregations.totalTons)} <span className="text-sm font-sans">تن</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                معادل {formatNumber(buyAggregations.totalBags)} کیسه در {buyInvoices.length} فاکتور خرید
              </div>
            </div>
          </div>

          {/* Advanced Filter Bar with Persian Calendar and Multi-criteria filters */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Persian Date Picker */}
              <div className="flex-1">
                <PersianDateRangePicker
                  fromDate={buyFromDate}
                  toDate={buyToDate}
                  onChangeRange={(from, to) => {
                    setBuyFromDate(from);
                    setBuyToDate(to);
                  }}
                  onClear={() => {
                    setBuyFromDate('');
                    setBuyToDate('');
                  }}
                  label="فیلتر بازه زمانی و تقویم خریدها"
                  themeColor="blue"
                />
              </div>

              {/* Universal Print Button */}
              <button
                type="button"
                onClick={handlePrintPurchasesReport}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
                title="چاپ گزارش رسمی و تفصیلی خریدها"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسمی گزارش خریدها</span>
              </button>
            </div>

            {/* Detailed Select Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
              {/* Search query */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی شماره فاکتور، فروشنده، کالا..."
                  value={buySearchQuery}
                  onChange={e => setBuySearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Party / Supplier filter */}
              <select
                value={buyPartyFilter}
                onChange={e => setBuyPartyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه فروشندگان</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Product filter */}
              <select
                value={buyProductFilter}
                onChange={e => setBuyProductFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه کالاها</option>
                {products.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>

              {/* Currency filter */}
              <select
                value={buyCurrencyFilter}
                onChange={e => setBuyCurrencyFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none font-bold"
              >
                <option value="all">همه ارزها (افغانی و دلار)</option>
                <option value="AFN">فقط افغانی (AFN)</option>
                <option value="USD">فقط دالر (USD)</option>
              </select>

              {/* Payment status filter */}
              <select
                value={buyPaymentStatusFilter}
                onChange={e => setBuyPaymentStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">همه وضعیت‌های پرداخت</option>
                <option value="paid">تسویه کامل نقدی</option>
                <option value="partial">نیمه‌نسیه</option>
                <option value="unpaid">نسیه و بدهی</option>
              </select>
            </div>

            {/* Filter tags / active filters reset */}
            {(buySearchQuery || buyCurrencyFilter !== 'all' || buyPartyFilter !== 'all' || buyProductFilter !== 'all' || buyPaymentStatusFilter !== 'all' || buyFromDate || buyToDate) && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-blue-700">فیلترهای فعال:</span>
                  {buyFromDate && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">از {buyFromDate}</span>}
                  {buyToDate && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">تا {buyToDate}</span>}
                  {buyPartyFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">فروشنده انتخاب شده</span>}
                  {buyProductFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">کالای انتخاب شده</span>}
                  {buyCurrencyFilter !== 'all' && <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">ارز: {buyCurrencyFilter}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBuySearchQuery('');
                    setBuyCurrencyFilter('all');
                    setBuyFromDate('');
                    setBuyToDate('');
                    setBuyPartyFilter('all');
                    setBuyProductFilter('all');
                    setBuyPaymentStatusFilter('all');
                    setBuyWarehouseFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-xs shrink-0"
                >
                  حذف همه فیلترها
                </button>
              </div>
            )}
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-blue-600" />
                <span>فهرست فاکتورهای خرید و واردات کالا</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-bold">
                  تعداد: <strong className="text-slate-900 font-mono">{filteredBuyInvoices.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={handlePrintPurchasesReport}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="چاپ رسمی فاکتورهای خرید فیلتر شده"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ گزارش خریدها</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">شماره فاکتور / تاریخ</th>
                    <th className="px-5 py-3.5">فروشنده / واردکننده</th>
                    <th className="px-5 py-3.5">اقلام خریداری شده</th>
                    <th className="px-5 py-3.5 text-left">مبلغ کل فاکتور</th>
                    <th className="px-5 py-3.5 text-left">پرداخت نقدی</th>
                    <th className="px-5 py-3.5 text-left">مانده طلب فروشنده</th>
                    <th className="px-5 py-3.5 text-center">مشاهده و چاپ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBuyInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">
                        هیچ فاکتور خریدی مطابق فیلترهای اعمال شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredBuyInvoices.map(inv => {
                      const totalTons = inv.items?.reduce((sum, it) => sum + (it.tonsCount || 0), 0) || 0;
                      const totalBags = inv.items?.reduce((sum, it) => sum + (it.bagsCount || 0), 0) || 0;

                      return (
                        <tr key={inv.id} className="hover:bg-blue-50/20 transition">
                          <td className="px-5 py-3.5 font-mono">
                            <strong className="text-slate-900">{inv.invoiceNumber}</strong>
                            <div className="text-[10px] text-slate-400">{inv.date}</div>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {inv.partyName}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {inv.items?.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-[11px]"
                                >
                                  <Package className="w-3 h-3 text-blue-500" />
                                  <strong className="font-bold">{it.productName}:</strong>
                                  <span className="font-mono">{formatNumber(it.quantity)} {it.unit === 'ton' ? 'تن' : 'کیسه'}</span>
                                </span>
                              ))}
                            </div>
                            {(totalTons > 0 || totalBags > 0) && (
                              <div className="text-[10px] text-slate-500 font-mono mt-1 font-bold">
                                مجموع: {totalTons > 0 ? `${formatNumber(totalTons)} تن` : ''} {totalBags > 0 ? `(${formatNumber(totalBags)} کیسه)` : ''}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono font-black text-slate-900">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-emerald-700 font-bold">
                            {formatCurrency(inv.paidAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-blue-700 font-black">
                            {formatCurrency(inv.balanceAmount, inv.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onViewInvoice && onViewInvoice(inv.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                                title="مشاهده جزئیات فاکتور"
                              >
                                نمایش
                              </button>
                              <button
                                onClick={() => openPrintModal({ type: 'invoice', invoice: inv })}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition cursor-pointer"
                                title="چاپ مستقیم فاکتور"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SECTION: EXPENSES / هزینه‌ها و مصارف */}
      {/* ========================================================================= */}
      {activeSection === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white px-5 py-3 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">مجموع هزینه‌های افغانی</span>
                <strong className="text-lg font-black text-amber-700 font-mono">
                  {formatCurrency(totalExpensesAFN, 'AFN')}
                </strong>
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">مجموع هزینه‌های دلاری</span>
                <strong className="text-lg font-black text-amber-700 font-mono">
                  {formatCurrency(totalExpensesUSD, 'USD')}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintExpensesReport}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                title="چاپ رسمی گزارش هزینه‌ها و مصارف"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ گزارش هزینه‌ها</span>
              </button>

              <button
                onClick={() => setIsAddingExpense(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت مصارف و هزینه جدید</span>
              </button>
            </div>
          </div>

          {/* Add Expense Form Modal */}
          {isAddingExpense && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <span>ثبت هزینه و مصارف جدید</span>
                </h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان و بابت هزینه</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: کرایه حمل موتر از بندر تورغندی"
                      value={newExpTitle}
                      onChange={e => setNewExpTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی</label>
                      <select
                        value={newExpCategoryId}
                        onChange={e => setNewExpCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        {expenseCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                        {expenseCategories.length === 0 && (
                          <option value="default">مصارف عمومی</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">واحد پولی</label>
                      <select
                        value={newExpCurrency}
                        onChange={e => setNewExpCurrency(e.target.value as Currency)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="AFN">افغانی (AFN ؋)</option>
                        <option value="USD">دلار ($ USD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ پرداختی</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newExpAmount || ''}
                        onChange={e => setNewExpAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">دریافت‌کننده / راننده</label>
                      <input
                        type="text"
                        placeholder="نام شخص یا نهاد"
                        value={newExpRecipient}
                        onChange={e => setNewExpRecipient(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddingExpense(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      ثبت در دفاتر مصارف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-600" />
                <p className="text-sm font-bold text-slate-600">هیچ هزینه‌ای در سیستم ثبت نشده است.</p>
                <p className="text-xs text-slate-400 mt-1">
                  می‌توانید با استفاده از دکمه «ثبت مصارف و هزینه جدید» هزینه‌ها را وارد نمایید.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">ردیف / تاریخ</th>
                      <th className="px-5 py-3.5">عنوان و بابت مصارف</th>
                      <th className="px-5 py-3.5">دسته‌بندی</th>
                      <th className="px-5 py-3.5">صندوق پرداخت‌کننده</th>
                      <th className="px-5 py-3.5">دریافت‌کننده وجه</th>
                      <th className="px-5 py-3.5 text-left">مبلغ پرداختی</th>
                      <th className="px-5 py-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp, i) => (
                      <tr key={exp.id} className="hover:bg-amber-50/20 transition">
                        <td className="px-5 py-3.5 font-mono text-slate-500">
                          #{i + 1} • {exp.date}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{exp.title}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                            {exp.categoryName || 'مصارف عمومی'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{exp.cashRegisterName || 'صندوق شرکت'}</td>
                        <td className="px-5 py-3.5 text-slate-800 font-medium">{exp.recipient || 'متفرقه'}</td>
                        <td className="px-5 py-3.5 text-left font-mono font-black text-rose-600">
                          {formatCurrency(exp.amount, exp.currency)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف هزینه «${exp.title}» مطمئن هستید؟`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                            title="حذف هزینه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SECTION: PROFIT & LOSS / سود و زیان (P&L) */}
      {/* ========================================================================= */}
      {activeSection === 'profit_loss' && (
        <div className="space-y-6">
          {/* P&L Period Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 ml-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>دوره محاسباتی سود و زیان:</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPnlPeriod('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pnlPeriod === 'all' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه دوره‌ها (کل)
                </button>
                <button
                  type="button"
                  onClick={() => setPnlPeriod('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pnlPeriod === 'today' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  امروز
                </button>
                <button
                  type="button"
                  onClick={() => setPnlPeriod('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pnlPeriod === 'month' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  این ماه
                </button>
                <button
                  type="button"
                  onClick={() => setPnlPeriod('year')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pnlPeriod === 'year' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  سال جاری
                </button>
                <button
                  type="button"
                  onClick={() => setPnlPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pnlPeriod === 'custom' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  بازه دلخواه
                </button>
              </div>

              {pnlPeriod === 'custom' && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-slate-500 text-[11px]">از:</span>
                  <input
                    type="text"
                    placeholder="۱۴۰۳/۰۱/۰۱"
                    value={pnlStartDate}
                    onChange={e => setPnlStartDate(e.target.value)}
                    className="w-20 bg-transparent text-xs font-mono outline-none text-slate-800"
                  />
                  <span className="text-slate-500 text-[11px]">تا:</span>
                  <input
                    type="text"
                    placeholder="۱۴۰۳/۱۲/۲۹"
                    value={pnlEndDate}
                    onChange={e => setPnlEndDate(e.target.value)}
                    className="w-20 bg-transparent text-xs font-mono outline-none text-slate-800"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 font-mono font-medium">
                {pnlPeriod === 'all' && 'محاسبه از آغاز عملیات سیستم تا کنون'}
                {pnlPeriod === 'today' && `گزارش روزانه: ${getPersianDate()}`}
                {pnlPeriod === 'month' && 'گزارش ماه جاری بر مبنای تقویم شمسی'}
                {pnlPeriod === 'year' && 'گزارش کل سال مالی جاری'}
                {pnlPeriod === 'custom' && (effectivePnlDateRange.from || effectivePnlDateRange.to ? `از ${effectivePnlDateRange.from || 'ابتدا'} تا ${effectivePnlDateRange.to || 'اکنون'}` : 'لطفاً بازه تاریخ را وارد نمایید')}
              </div>

              <button
                type="button"
                onClick={handlePrintProfitLoss}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                title="چاپ رسمی صورت حساب سود و زیان (P&L)"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ صورت سود و زیان</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md border border-teal-900">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">
                    سود خالص تجارتی دوره (Net Operating Profit)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold border border-teal-500/30">
                    ارز اصلی منتخب: {baseCurrency.name} ({baseCurrency.code})
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                  {formatNumber(netProfitBase)} {baseCurrency.symbol || baseCurrency.code}
                </h3>
                <p className="text-xs text-teal-200 font-mono">
                  معادل افغانی: {formatNumber(convertToBase(netProfitBase, baseCurrency.code) * (baseCurrency.exchangeRateToAFN || 1))} ؋ | دلار: ${formatNumber((convertToBase(netProfitBase, baseCurrency.code) * (baseCurrency.exchangeRateToAFN || 1)) / (cashRegister.usdToAfnRate || 65))}
                </p>
              </div>

              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">سود ناخالص بازرگانی:</span>
                  <span className="font-bold text-teal-300 font-mono">
                    {formatNumber(totalGrossProfitEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">+ سایر عواید و درآمدها:</span>
                  <span className="font-bold text-emerald-300 font-mono">
                    {formatNumber(pnlTotalIncomeEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">- کل هزینه‌ها و مصارف:</span>
                  <span className="font-bold text-rose-300 font-mono">
                    {formatNumber(pnlTotalExpEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}
                  </span>
                </div>
                <div className="h-px bg-white/10 my-1" />
                <div className="flex justify-between text-teal-200 font-black">
                  <span>سود خالص نهایی:</span>
                  <span className="font-mono">
                    {formatNumber(netProfitBase)} {baseCurrency.symbol || baseCurrency.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sales & Gross Profit */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>درآمدها و فروشات کل دوره</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl font-mono">
                  <span className="text-slate-600">فروشات افغانی:</span>
                  <strong className="text-slate-900 font-bold">{formatCurrency(pnlSalesTotals.totalAFN, 'AFN')}</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl font-mono">
                  <span className="text-slate-600">فروشات دلاری:</span>
                  <strong className="text-slate-900 font-bold">${formatNumber(pnlSalesTotals.totalUSD)}</strong>
                </div>
                <div className="flex justify-between p-3 bg-emerald-50 rounded-xl font-mono text-emerald-800 font-bold">
                  <span>بهای تمام شده (COGS):</span>
                  <span>{formatNumber(cogsCalculations.cogsAFN + cogsCalculations.cogsUSD * (cashRegister.usdToAfnRate || 70.8))} ؋</span>
                </div>
                <div className="flex justify-between p-3 bg-teal-50 rounded-xl font-mono text-teal-900 font-bold">
                  <span>سود ناخالص بازرگانی:</span>
                  <span>{formatNumber(totalGrossProfitEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}</span>
                </div>
              </div>
            </div>

            {/* Other Incomes */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>سایر عواید و درآمدهای دوره</span>
              </h4>
              <div className="space-y-2 text-xs">
                {pnlIncomeCategoryBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl font-bold">
                    هیچ عایدی متفرقه‌ای برای این دوره ثبت نشده است (۰ ؋)
                  </div>
                ) : (
                  pnlIncomeCategoryBreakdown.map(cat => (
                    <div key={cat.id} className="flex justify-between p-3 bg-slate-50 rounded-xl font-mono">
                      <span className="text-slate-700">{cat.name}:</span>
                      <strong className="text-emerald-700">
                        {cat.amountAFN > 0 && `${formatNumber(cat.amountAFN)} ؋`}
                        {cat.amountAFN > 0 && cat.amountUSD > 0 && ' + '}
                        {cat.amountUSD > 0 && `$${formatNumber(cat.amountUSD)}`}
                      </strong>
                    </div>
                  ))
                )}
                <div className="flex justify-between p-3 bg-emerald-50 rounded-xl font-mono text-emerald-900 font-bold border border-emerald-100">
                  <span>مجموع سایر عواید (معادل ارز اصلی):</span>
                  <span>{formatNumber(pnlTotalIncomeEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-600" />
                <span>هزینه‌ها و مصارف جاری دوره</span>
              </h4>
              <div className="space-y-2 text-xs">
                {pnlExpenses.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl font-bold">
                    هیچ هزینه‌ای برای این دوره مالی ثبت نشده است (۰ ؋)
                  </div>
                ) : (
                  expenseCategoryBreakdown.map(cat => (
                    <div key={cat.id} className="flex justify-between p-3 bg-slate-50 rounded-xl font-mono">
                      <span className="text-slate-700">{cat.name}:</span>
                      <strong className="text-slate-900">
                        {cat.amountAFN > 0 && `${formatNumber(cat.amountAFN)} ؋`}
                        {cat.amountAFN > 0 && cat.amountUSD > 0 && ' + '}
                        {cat.amountUSD > 0 && `$${formatNumber(cat.amountUSD)}`}
                      </strong>
                    </div>
                  ))
                )}
                <div className="flex justify-between p-3 bg-rose-50 rounded-xl font-mono text-rose-900 font-bold border border-rose-100">
                  <span>مجموع کل هزینه‌ها (معادل ارز اصلی):</span>
                  <span>{formatNumber(pnlTotalExpEquivalentBase)} {baseCurrency.symbol || baseCurrency.code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SECTION: BALANCE SHEET / ترازنامه و بیلاننس مالی */}
      {/* ========================================================================= */}
      {activeSection === 'balance_sheet' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">ترازنامه مالی و بیلاننس تجارتی</h3>
                <p className="text-[11px] text-slate-500">تطابق دارایی‌ها، بدهی‌ها و حقوق صاحبان سرمایه</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrintBalanceSheet}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              title="چاپ رسمی ترازنامه و بیلاننس مالی"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ ترازنامه مالی</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets (دارایی‌ها) */}
            <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <h4 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>دارایی‌های تجارتی (Assets)</span>
                </h4>
                <strong className="text-base font-black text-emerald-700 font-mono">
                  {formatNumber(totalAssetsAFN)} ؋
                </strong>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">نقدینگی در صندوق افغانی:</span>
                  <strong className="font-mono text-slate-900">{formatNumber(cashRegister.afnBalance)} ؋</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">نقدینگی در صندوق دالری ($):</span>
                  <strong className="font-mono text-slate-900">${formatNumber(cashRegister.usdBalance)}</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">صندوق دالری صرافی سرای شهزاده:</span>
                  <strong className="font-mono text-slate-900">${formatNumber(cashRegister.exchangeUsdBalance || 0)}</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">ارزش کل موجودی کالا در گدام‌ها:</span>
                  <strong className="font-mono text-emerald-700">{formatNumber(stockStats.afnValue)} ؋</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">طلبات از مشتریان (قرضداری‌ها):</span>
                  <strong className="font-mono text-rose-600">{formatNumber(partyMetrics.debtAFN)} ؋ + ${formatNumber(partyMetrics.debtUSD)}</strong>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity (بدهی‌ها و حقوق صاحبان سهام) */}
            <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span>بدهی‌ها و سرمایه خالص (Liabilities & Equity)</span>
                </h4>
                <strong className="text-base font-black text-blue-700 font-mono">
                  {formatNumber(totalAssetsAFN)} ؋
                </strong>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">بدهی ما به تامین‌کنندگان (افغانی):</span>
                  <strong className="font-mono text-blue-700">{formatNumber(partyMetrics.creditAFN)} ؋</strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">بدهی ما به تامین‌کنندگان (دلار):</span>
                  <strong className="font-mono text-blue-700">${formatNumber(partyMetrics.creditUSD)}</strong>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between p-3 bg-emerald-50 rounded-xl">
                  <span className="text-emerald-900 font-bold">خالص حقوق صاحبان سرمایه (Net Worth):</span>
                  <strong className="font-mono text-emerald-800 font-black">{formatNumber(netCompanyWorthAFN)} ؋</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SECTION: JOURNAL ENTRIES / اسناد حسابداری و دفتر روزنامه */}
      {/* ========================================================================= */}
      {activeSection === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setJournalDisplayMode('comprehensive')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                journalDisplayMode === 'comprehensive'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              روزنامچه جامع رویدادها و تراکنش‌ها (طرح شیک و زنده)
            </button>
            <button
              type="button"
              onClick={() => setJournalDisplayMode('double_entry')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                journalDisplayMode === 'double_entry'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اسناد دوبل حسابداری (دفتر روزنامه معین)
            </button>
          </div>

          {journalDisplayMode === 'comprehensive' ? (
            <ComprehensiveJournalView
              onViewInvoice={onViewInvoice}
              onOpenPaymentModal={onOpenPaymentModal}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-black text-xs text-slate-800">دفتر روزنامه و اسناد دوبل حسابداری (Journal Entries)</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  {filteredJournalEntries.length} از {journalEntries.length} سند
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجو در اسناد، طرف حساب و شرح..."
                    value={journalSearchQuery}
                    onChange={e => setJournalSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setJournalTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setJournalTypeFilter('sales')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'sales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    فروش
                  </button>
                  <button
                    onClick={() => setJournalTypeFilter('purchases')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'purchases' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    خرید
                  </button>
                  <button
                    onClick={() => setJournalTypeFilter('payments')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    دریافت/پرداخت
                  </button>
                  <button
                    onClick={() => setJournalTypeFilter('expenses')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'expenses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    مصارف
                  </button>
                  <button
                    onClick={() => setJournalTypeFilter('exchange')}
                    className={`px-2.5 py-1 rounded-lg transition ${journalTypeFilter === 'exchange' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                  >
                    صرافی
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    openPrintModal({
                      type: 'financial_report',
                      title: 'دفتر روزنامه حسابداری (General Journal)',
                      subtitle: `دفتر ثبت کلیه اسناد و رویدادهای مالی • تعداد کل اسناد: ${filteredJournalEntries.length} • تاریخ صدور: ${getPersianDate()}`,
                      tableHeaders: ['شماره سند', 'تاریخ', 'عنوان سند و بابت معامله', 'حساب بدهکار (Debit)', 'حساب بستانکار (Credit)', 'مبلغ سند'],
                      tableRows: filteredJournalEntries.map(j => [
                        j.voucherNo,
                        j.date,
                        `${j.title} - ${j.description}`,
                        j.debitTitle,
                        j.creditTitle,
                        formatCurrency(j.amount, j.currency),
                      ]),
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ کل روزنامچه</span>
                </button>
              </div>
            </div>

            {filteredJournalEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-600" />
                <p className="text-sm font-bold text-slate-600">هیچ سند حسابداری ثبت نشده است.</p>
                <p className="text-xs text-slate-400 mt-1">
                  پس از ثبت فاکتورهای فروش/خرید، دریافت و پرداخت‌ها یا مصارف، اسناد دوبل حسابداری به‌صورت خودکار در این قسمت ثبت و نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">شماره سند / تاریخ</th>
                      <th className="px-5 py-3.5">شرح و بابت سند</th>
                      <th className="px-5 py-3.5">حساب بدهکار (Debit)</th>
                      <th className="px-5 py-3.5">حساب بستانکار (Credit)</th>
                      <th className="px-5 py-3.5 text-left">مبلغ سند</th>
                      <th className="px-5 py-3.5 text-center">چاپ سند و فاکتور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJournalEntries.map(j => (
                      <tr key={j.id} className="hover:bg-purple-50/20 transition">
                        <td className="px-5 py-3.5 font-mono">
                          <strong className="text-slate-900">{j.voucherNo}</strong>
                          <div className="text-[10px] text-slate-400">{j.date}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800">{j.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{j.description}</div>
                        </td>
                        <td className="px-5 py-3.5 text-rose-700 font-bold">{j.debitTitle}</td>
                        <td className="px-5 py-3.5 text-blue-700 font-bold">{j.creditTitle}</td>
                        <td className="px-5 py-3.5 text-left font-mono font-black text-slate-900">
                          {formatCurrency(j.amount, j.currency)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* 1. Print Official Commercial Invoice if available */}
                            {j.relatedInvoice && (
                              <button
                                type="button"
                                title="چاپ فاکتور رسمی معامله با لیست کامل کالاها، قیمت، تخفیف و مشخصات"
                                onClick={() => {
                                  openPrintModal({
                                    type: 'invoice',
                                    invoice: j.relatedInvoice,
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3 h-3" />
                                <span>فاکتور رسمی</span>
                              </button>
                            )}

                            {/* 2. Print Financial Payment Receipt if available */}
                            {j.relatedTransaction && (
                              <button
                                type="button"
                                title="چاپ رسید تسویه و تراکنش مالی"
                                onClick={() => {
                                  openPrintModal({
                                    type: 'payment_receipt',
                                    transaction: j.relatedTransaction,
                                  });
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3 h-3" />
                                <span>رسید معامله</span>
                              </button>
                            )}

                            {/* 2.5 Print Expense Voucher if available */}
                            {j.relatedExpense && (
                              <button
                                type="button"
                                title="چاپ سند مصارف و هزینه"
                                onClick={() => {
                                  openPrintModal({
                                    type: 'expense_voucher',
                                    expense: j.relatedExpense,
                                  });
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3 h-3" />
                                <span>سند مصارف</span>
                              </button>
                            )}

                            {/* 3. Print Complete Double Entry Accounting Voucher (with itemized breakdown) */}
                            <button
                              type="button"
                              title="چاپ سند دوبل حسابداری با ثبت دفاتر، آرتیکل‌ها و ریز معاملات"
                              onClick={() => {
                                openPrintModal({
                                  type: 'custom',
                                  title: `سند حسابداری ${j.voucherNo}`,
                                  customContent: renderJournalVoucherPrintContent(j),
                                });
                              }}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <FileText className="w-3 h-3" />
                              <span>سند حسابداری</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. SECTION: FIXED ASSETS / تجهیزات و دارایی‌های ثابت */}
      {/* ========================================================================= */}
      {activeSection === 'fixed_assets' && (
        <FixedAssetsView />
      )}

      {/* ========================================================================= */}
      {/* 10. SECTION: SHAREHOLDERS / امور سهامداران و شرکا */}
      {/* ========================================================================= */}
      {activeSection === 'shareholders' && (
        <ShareholdersView />
      )}

      {/* ========================================================================= */}
      {/* 11. SECTION: BACKUP & DATABASE / پشتیبان‌گیری و پایگاه داده */}
      {/* ========================================================================= */}
      {activeSection === 'backup' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-8">
          <div>
            <h3 className="font-black text-slate-900 text-base mb-1">پشتیبان‌گیری ابری گوگل درایو و پایگاه داده</h3>
            <p className="text-xs text-slate-500">
              پشتیبان‌گیری خودکار و دستی در فضای ابری امن Google Drive، دانلود فایل پشتیبان محلی (JSON) و مدیریت بازنشانی داده‌ها.
            </p>
          </div>

          {importStatus && (
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* Google Drive & Backup Hub Panel */}
          <GoogleDriveBackupPanel
            onLocalExport={handleDownloadBackup}
            onLocalImport={handleLocalFileImport}
          />

          {/* Advanced Administration / Database Resets */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-700">عملیات پیشرفته مدیریتی و ریست پایگاه داده</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  if (confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌ها به حالت نمونه اولیه (Demo) بازنشانی شوند؟')) {
                    resetToDemoData();
                    setImportStatus('داده‌های نمونه پیش‌فرض با موفقیت بارگذاری شد.');
                    setTimeout(() => setImportStatus(null), 3000);
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بازنشانی به داده‌های دمو</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('آیا می‌خواهید سال مالی جدید شروع کنید؟ (فاکتورها، تراکنش‌ها و اسناد صفر شده و کالاها، اشخاص و مانده‌ها حفظ می‌گردند)')) {
                    resetNewFinancialYear();
                    setImportStatus('سال مالی جدید با موفقیت ایجاد گردید.');
                    setTimeout(() => setImportStatus(null), 3000);
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>شروع سال مالی جدید</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('هشدار: آیا مطمئن هستید که می‌خواهید کل داده‌ها، اسناد، فاکتورها و هزینه‌ها را کاملاً پاک و صفر کنید (Wipe Clean)؟ این عملیات غیرقابل برگشت است.')) {
                    resetWipeCleanAll();
                    setImportStatus('تمامی اطلاعات، اسناد و هزینه‌ها با موفقیت پاک و صفر شدند.');
                    setTimeout(() => setImportStatus(null), 3000);
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>پاک‌سازی کامل کلیه اسناد (Wipe)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTY CARDEX MODAL */}
      {selectedPartyForCardex && (
        <PartyCardexModal
          party={selectedPartyForCardex}
          isOpen={!!selectedPartyForCardex}
          onClose={() => setSelectedPartyForCardex(null)}
          onViewInvoice={onViewInvoice}
          onOpenPaymentModal={onOpenPaymentModal}
        />
      )}

      {/* PRODUCT CARDEX MODAL */}
      <ProductCardexModal
        product={selectedProductForCardex}
        isOpen={!!selectedProductForCardex}
        onClose={() => setSelectedProductForCardex(null)}
        onViewInvoice={onViewInvoice}
      />
    </div>
  );
};
