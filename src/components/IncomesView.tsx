import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { IncomeItem, IncomeCategory, Currency } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  TrendingUp,
  Plus,
  Search,
  FolderPlus,
  Trash2,
  Edit2,
  Printer,
  Receipt,
  Layers,
  Calendar,
  Wallet,
  Building,
  Filter,
  CheckCircle2,
  X,
  Package,
  Boxes,
  Sparkles,
  Calculator,
  Coins,
  ArrowDownToLine,
} from 'lucide-react';

interface IncomesViewProps {
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment') => void;
  autoOpenCreate?: boolean;
}

export const IncomesView: React.FC<IncomesViewProps> = ({
  autoOpenCreate = false,
}) => {
  const {
    incomes,
    incomeCategories,
    createIncome,
    updateIncome,
    deleteIncome,
    addIncomeCategory,
    updateIncomeCategory,
    deleteIncomeCategory,
    cashAccounts,
    cashRegister,
    openPrintModal,
  } = useAccounting();

  // Selected Category filter for ListBox
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'USD' | 'AFN'>('ALL');

  // Modals
  const [isNewIncomeModalOpen, setIsNewIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IncomeCategory | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormCode, setCategoryFormCode] = useState('');
  const [categoryFormDesc, setCategoryFormDesc] = useState('');
  const [categoryFormColor, setCategoryFormColor] = useState('emerald');

  // Form State for Income Create / Edit
  const [incTitle, setIncTitle] = useState('');
  const [incCategoryId, setIncCategoryId] = useState('');
  const [incAmount, setIncAmount] = useState<number>(0);
  const [incCurrency, setIncCurrency] = useState<Currency>('AFN');
  const [incQuantity, setIncQuantity] = useState<string>('');
  const [incUnitPrice, setIncUnitPrice] = useState<string>('');
  const [incCashRegisterId, setIncCashRegisterId] = useState('afn_cash');
  const [incPayer, setIncPayer] = useState('');
  const [incReceiptNumber, setIncReceiptNumber] = useState('');
  const [incDate, setIncDate] = useState(new Date().toLocaleDateString('fa-AF'));
  const [incNotes, setIncNotes] = useState('');

  // Quick preset titles for cement bags, flour bags, pallets, loading, etc.
  const quickPresets = [
    { title: 'فروش کیسه خالی سیمان غوری', catCode: 'BAG-01', defaultQty: 250, defaultUnit: 20 },
    { title: 'فروش بوجی خالی آرد قزاقستان', catCode: 'BAG-01', defaultQty: 300, defaultUnit: 15 },
    { title: 'فروش پالت‌های چوبی وارداتی گدام', catCode: 'PAL-02', defaultQty: 40, defaultUnit: 6, curr: 'USD' as const },
    { title: 'عاید خدمات بارگیری و پورتاژ موتر لاری', catCode: 'SRV-03', defaultAmount: 6000 },
    { title: 'عاید اجاره موقت فضای انبار', catCode: 'RNT-04', defaultAmount: 15000 },
    { title: 'کمیسیون واسطه‌گری ترانزیت کالا', catCode: 'COM-05', defaultAmount: 200, curr: 'USD' as const },
  ];

  // Open modal for new income
  const handleOpenNewIncome = () => {
    setEditingIncome(null);
    setIncTitle('');
    setIncCategoryId(incomeCategories[0]?.id || 'inc-cat-bags');
    setIncAmount(0);
    setIncCurrency('AFN');
    setIncQuantity('');
    setIncUnitPrice('');
    setIncCashRegisterId('afn_cash');
    setIncPayer('');
    setIncReceiptNumber('');
    setIncDate(new Date().toLocaleDateString('fa-AF'));
    setIncNotes('');
    setIsNewIncomeModalOpen(true);
  };

  React.useEffect(() => {
    if (autoOpenCreate) {
      handleOpenNewIncome();
    }
  }, [autoOpenCreate]);

  // Open modal for editing income
  const handleOpenEditIncome = (income: IncomeItem) => {
    setEditingIncome(income);
    setIncTitle(income.title);
    setIncCategoryId(income.categoryId);
    setIncAmount(income.amount);
    setIncCurrency(income.currency);
    setIncQuantity(income.quantity ? String(income.quantity) : '');
    setIncUnitPrice(income.unitPrice ? String(income.unitPrice) : '');
    setIncCashRegisterId(
      income.cashRegisterId || (income.currency === 'USD' ? 'usd_cash' : 'afn_cash')
    );
    setIncPayer(income.payer || '');
    setIncReceiptNumber(income.receiptNumber || '');
    setIncDate(income.date);
    setIncNotes(income.notes || '');
    setIsNewIncomeModalOpen(true);
  };

  // Quick preset apply
  const applyPreset = (preset: typeof quickPresets[0]) => {
    setIncTitle(preset.title);
    const foundCat = incomeCategories.find(c => c.code === preset.catCode) || incomeCategories[0];
    if (foundCat) setIncCategoryId(foundCat.id);
    
    if (preset.curr) {
      setIncCurrency(preset.curr);
      setIncCashRegisterId(preset.curr === 'USD' ? 'usd_cash' : 'afn_cash');
    }

    if (preset.defaultQty && preset.defaultUnit) {
      setIncQuantity(String(preset.defaultQty));
      setIncUnitPrice(String(preset.defaultUnit));
      setIncAmount(preset.defaultQty * preset.defaultUnit);
    } else if (preset.defaultAmount) {
      setIncAmount(preset.defaultAmount);
      setIncQuantity('');
      setIncUnitPrice('');
    }
  };

  // Quantity / Unit Price live calculator
  const handleQuantityChange = (val: string) => {
    setIncQuantity(val);
    const q = parseFloat(val);
    const u = parseFloat(incUnitPrice);
    if (!isNaN(q) && !isNaN(u) && q > 0 && u > 0) {
      setIncAmount(q * u);
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setIncUnitPrice(val);
    const q = parseFloat(incQuantity);
    const u = parseFloat(val);
    if (!isNaN(q) && !isNaN(u) && q > 0 && u > 0) {
      setIncAmount(q * u);
    }
  };

  // Save Income (Create or Update)
  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim() || incAmount <= 0) return;

    const cat = incomeCategories.find(c => c.id === incCategoryId);
    const cashAcc = cashAccounts.find(a => a.id === incCashRegisterId);
    const qty = incQuantity ? parseFloat(incQuantity) : undefined;
    const uPrice = incUnitPrice ? parseFloat(incUnitPrice) : undefined;

    if (editingIncome) {
      updateIncome(editingIncome.id, {
        title: incTitle,
        categoryId: incCategoryId,
        categoryName: cat?.name || 'عواید متفرقه',
        amount: incAmount,
        currency: incCurrency,
        quantity: qty,
        unitPrice: uPrice,
        cashRegisterId: incCashRegisterId,
        cashRegisterName:
          cashAcc?.name || (incCashRegisterId === 'usd_cash' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
        payer: incPayer,
        receiptNumber: incReceiptNumber,
        date: incDate,
        notes: incNotes,
      });
    } else {
      createIncome({
        title: incTitle,
        categoryId: incCategoryId,
        categoryName: cat?.name || 'عواید متفرقه',
        amount: incAmount,
        currency: incCurrency,
        quantity: qty,
        unitPrice: uPrice,
        cashRegisterId: incCashRegisterId,
        cashRegisterName:
          cashAcc?.name || (incCashRegisterId === 'usd_cash' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
        payer: incPayer,
        receiptNumber: incReceiptNumber,
        date: incDate,
        notes: incNotes,
      });
    }

    setIsNewIncomeModalOpen(false);
    setEditingIncome(null);
  };

  // Category save
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) return;

    if (editingCategory) {
      updateIncomeCategory(editingCategory.id, {
        name: categoryFormName,
        code: categoryFormCode,
        description: categoryFormDesc,
        color: categoryFormColor,
      });
    } else {
      addIncomeCategory({
        name: categoryFormName,
        code: categoryFormCode || `INC-0${incomeCategories.length + 1}`,
        description: categoryFormDesc,
        color: categoryFormColor,
      });
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // Filtered Incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter(item => {
      const matchCat = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
      const matchCurr = currencyFilter === 'ALL' || item.currency === currencyFilter;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.incomeNumber && item.incomeNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.payer && item.payer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchCurr && matchQuery;
    });
  }, [incomes, selectedCategoryId, currencyFilter, searchQuery]);

  // Totals
  const totalAFN = useMemo(() => {
    return filteredIncomes
      .filter(e => e.currency === 'AFN')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredIncomes]);

  const totalUSD = useMemo(() => {
    return filteredIncomes
      .filter(e => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredIncomes]);

  const totalEquivalentAFN = useMemo(() => {
    const rate = cashRegister.usdToAfnRate || 70.8;
    return totalAFN + totalUSD * rate;
  }, [totalAFN, totalUSD, cashRegister.usdToAfnRate]);

  // Top category
  const topCategoryName = useMemo(() => {
    if (incomes.length === 0) return '—';
    const totals: { [cat: string]: number } = {};
    incomes.forEach(inc => {
      const cat = inc.categoryName || 'سایر';
      const amtAfn = inc.currency === 'USD' ? inc.amount * (cashRegister.usdToAfnRate || 70.8) : inc.amount;
      totals[cat] = (totals[cat] || 0) + amtAfn;
    });
    let maxCat = '';
    let maxVal = -1;
    Object.entries(totals).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });
    return maxCat || '—';
  }, [incomes, cashRegister.usdToAfnRate]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>مدیریت و ثبت عواید و درآمدهای جانبی</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                {incomes.length} سند
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ثبت عاید حاصل از فروش کیسه سیمان، بوجی خالی، پالت، ضایعات و خدمات بارگیری با افزایش خودکار موجودی صندوق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-income-category"
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormName('');
              setCategoryFormCode('');
              setCategoryFormDesc('');
              setCategoryFormColor('emerald');
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
            <span>گروه‌بندی عواید</span>
          </button>

          <button
            id="btn-new-income"
            onClick={handleOpenNewIncome}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت عاید جدید</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total AFN Incomes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">مجموع عواید افغانی</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {formatNumber(totalAFN)} <span className="text-xs font-normal text-slate-500">؋</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">واریز مستقیم به صندوق افغانی</div>
        </div>

        {/* Stat 2: Total USD Incomes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">مجموع عواید دلاری</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-700 font-mono">
            ${formatNumber(totalUSD)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">واریز به صندوق شرکت دالری</div>
        </div>

        {/* Stat 3: Total Equivalent AFN */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">معادل کل به افغانی</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatNumber(totalEquivalentAFN)} <span className="text-xs font-normal text-slate-500">؋</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">نرخ برابری: {cashRegister.usdToAfnRate} ؋</div>
        </div>

        {/* Stat 4: Top Category */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">دسته پردرآمدترین</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-black text-slate-800 truncate" title={topCategoryName}>
            {topCategoryName}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">بر اساس ارزش ریالی ثبت شده</div>
        </div>
      </div>

      {/* Main Content: Two Columns with Vertical ListBox on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Right Column: Categories Vertical ListBox */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900">دسته‌بندی عواید</h2>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
              {incomeCategories.length}
            </span>
          </div>

          {/* Categories List */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>همه دسته‌ها (کل عواید)</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  selectedCategoryId === 'all'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {incomes.length}
              </span>
            </button>

            {incomeCategories.map(cat => {
              const count = incomes.filter(i => i.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`group rounded-xl p-2 transition flex items-center justify-between gap-1.5 ${
                    isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="flex-1 text-right text-xs font-medium text-slate-800 flex items-center gap-2 truncate cursor-pointer"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        cat.color === 'blue'
                          ? 'bg-blue-500'
                          : cat.color === 'amber'
                          ? 'bg-amber-500'
                          : cat.color === 'purple'
                          ? 'bg-purple-500'
                          : cat.color === 'teal'
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-emerald-200 text-emerald-800 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                        setCategoryFormName(cat.name);
                        setCategoryFormCode(cat.code || '');
                        setCategoryFormDesc(cat.description || '');
                        setCategoryFormColor(cat.color || 'emerald');
                        setIsCategoryModalOpen(true);
                      }}
                      title="ویرایش دسته‌بندی"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `آیا از حذف دسته‌بندی «${cat.name}» اطمینان دارید؟`
                          )
                        ) {
                          deleteIncomeCategory(cat.id);
                        }
                      }}
                      title="حذف دسته‌بندی"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryFormName('');
              setCategoryFormCode('');
              setCategoryFormDesc('');
              setCategoryFormColor('emerald');
              setIsCategoryModalOpen(true);
            }}
            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition border border-dashed border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ دسته جدید عاید</span>
          </button>
        </div>

        {/* Left Column: Incomes Table and Filters (3 Columns Wide) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در شرح، خریدار، شماره رسید..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Currency Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto justify-center">
              <button
                onClick={() => setCurrencyFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  currencyFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                همه ارزها
              </button>
              <button
                onClick={() => setCurrencyFilter('AFN')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  currencyFilter === 'AFN'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                افغانی (؋)
              </button>
              <button
                onClick={() => setCurrencyFilter('USD')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  currencyFilter === 'USD'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                دلار ($)
              </button>
            </div>
          </div>

          {/* Incomes Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3.5">سند / تاریخ</th>
                  <th className="px-4 py-3.5">شرح و عنوان عاید</th>
                  <th className="px-4 py-3.5">دسته‌بندی</th>
                  <th className="px-4 py-3.5">تعداد و قیمت فی</th>
                  <th className="px-4 py-3.5">پرداخت‌کننده / خریدار</th>
                  <th className="px-4 py-3.5">صندوق واریزی</th>
                  <th className="px-4 py-3.5 text-left">مبلغ کل عاید</th>
                  <th className="px-4 py-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <TrendingUp className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">
                          هیچ سند عایدی با فیلترهای انتخابی یافت نشد
                        </p>
                        <button
                          onClick={handleOpenNewIncome}
                          className="text-xs text-emerald-600 font-bold hover:underline mt-1"
                        >
                          + ثبت اولین سند عاید (مثلاً فروش کیسه سیمان)
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.map(item => {
                    const isUsd = item.currency === 'USD';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Number & Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 font-mono">{item.incomeNumber}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.date}</div>
                        </td>

                        {/* Title & Notes */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 max-w-xs">{item.title}</div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        {/* Category Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {item.categoryName || 'سایر عواید'}
                          </span>
                        </td>

                        {/* Quantity & Unit Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {item.quantity ? (
                            <div className="font-mono text-slate-800 font-bold">
                              {formatNumber(item.quantity)} عدد
                              {item.unitPrice ? (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  فی: {formatNumber(item.unitPrice)} {isUsd ? '$' : '؋'}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Payer */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{item.payer || 'مشتری آزاد'}</div>
                          {item.receiptNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              رسید: {item.receiptNumber}
                            </div>
                          )}
                        </td>

                        {/* Cash Register */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.cashRegisterName || (isUsd ? 'صندوق دالری' : 'صندوق افغانی')}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-left whitespace-nowrap">
                          <div
                            className={`font-black font-mono text-sm ${
                              isUsd ? 'text-blue-700' : 'text-emerald-700'
                            }`}
                          >
                            +{formatCurrency(item.amount, item.currency)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                openPrintModal({
                                  type: 'income_receipt',
                                  income: item,
                                  title: `قبض دریافت عاید - ${item.incomeNumber}`,
                                });
                              }}
                              title="چاپ رسید رسمی عاید"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditIncome(item)}
                              title="ویرایش سند"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `آیا از حذف سند عاید «${item.title}» به مبلغ ${formatCurrency(
                                      item.amount,
                                      item.currency
                                    )} اطمینان دارید؟ (مبلغ مربوطه از صندوق کسر خواهد شد)`
                                  )
                                ) {
                                  deleteIncome(item.id);
                                }
                              }}
                              title="حذف سند"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

          {/* Table Footer Totals */}
          {filteredIncomes.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 font-medium">
                نمایش <span className="font-bold text-slate-800">{filteredIncomes.length}</span> مورد از مجموع{' '}
                <span className="font-bold text-slate-800">{incomes.length}</span> سند عاید
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">جمع افغانی:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatNumber(totalAFN)} ؋
                  </span>
                </div>
                {totalUSD > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">جمع دالری:</span>
                    <span className="font-mono font-black text-blue-700 text-sm">
                      ${formatNumber(totalUSD)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create / Edit Income */}
      {isNewIncomeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingIncome ? 'ویرایش سند عاید' : 'ثبت عاید جدید (فروش کیسه، ضایعات و خدمات)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مبلغ عاید پس از ثبت به طور خودکار به صندوق پولی اضافه می‌گردد
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewIncomeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Picker (only when creating new) */}
            {!editingIncome && (
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>انتخاب سریع عنوان و فرمول محاسبه:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 text-[11px] font-medium rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveIncome} className="space-y-4">
              {/* Title & Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان و بابت عاید * (مثلاً: فروش ۴۰۰ عدد کیسه خالی سیمان غوری)
                </label>
                <input
                  type="text"
                  required
                  placeholder="شرح دقیق عاید دریافتی..."
                  value={incTitle}
                  onChange={e => setIncTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Category & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    دسته‌بندی عاید *
                  </label>
                  <select
                    value={incCategoryId}
                    onChange={e => setIncCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {incomeCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    واحد پول *
                  </label>
                  <select
                    value={incCurrency}
                    onChange={e => {
                      const curr = e.target.value as 'AFN' | 'USD';
                      setIncCurrency(curr);
                      setIncCashRegisterId(curr === 'USD' ? 'usd_cash' : 'afn_cash');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  >
                    <option value="AFN">افغانی (AFN ؋)</option>
                    <option value="USD">دلار آمریکایی (USD $)</option>
                  </select>
                </div>
              </div>

              {/* Optional Quantity & Unit Price Auto-Calculator */}
              <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/70 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>محاسبه‌گر تعداد و قیمت فی (اختیاری):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      تعداد کیسه / پالت:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="مثلاً ۳۰۰"
                      value={incQuantity}
                      onChange={e => handleQuantityChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      قیمت فی ({incCurrency === 'USD' ? '$' : '؋'}):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="مثلاً ۲۰"
                      value={incUnitPrice}
                      onChange={e => handleUnitPriceChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      مبلغ کل دریافتی *:
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={incAmount || ''}
                      onChange={e => setIncAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-xs font-mono text-center focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cash Register & Payer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    واریز به صندوق *
                  </label>
                  <select
                    value={incCashRegisterId}
                    onChange={e => setIncCashRegisterId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency === 'USD' ? '$' : '؋'}) - موجودی:{' '}
                        {formatNumber(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    پرداخت‌کننده / خریدار
                  </label>
                  <input
                    type="text"
                    placeholder="نام شخص یا شرکت خریدار..."
                    value={incPayer}
                    onChange={e => setIncPayer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Date & Receipt Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ سند (شمسی) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1403/01/01"
                    value={incDate}
                    onChange={e => setIncDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره قبض / رسید بانکی
                  </label>
                  <input
                    type="text"
                    placeholder="شماره فیش یا بارنامه..."
                    value={incReceiptNumber}
                    onChange={e => setIncReceiptNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات و مشخصات تکمیلی
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات و مشخصات..."
                  value={incNotes}
                  onChange={e => setIncNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewIncomeModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  {editingIncome ? 'ذخیره تغییرات' : 'ثبت و واریز به صندوق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Categories Management */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  {editingCategory ? 'ویرایش دسته‌بندی عواید' : 'تعریف دسته‌بندی جدید عواید'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام دسته‌بندی عاید *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: فروش بوجی و کیسه خالی"
                  value={categoryFormName}
                  onChange={e => setCategoryFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کد دسته‌بندی (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: BAG-01"
                  value={categoryFormCode}
                  onChange={e => setCategoryFormCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رنگ برچسب
                </label>
                <select
                  value={categoryFormColor}
                  onChange={e => setCategoryFormColor(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="emerald">سبز زمردی (Emerald)</option>
                  <option value="amber">نارنجی طلایی (Amber)</option>
                  <option value="blue">آبی درباری (Blue)</option>
                  <option value="purple">بنفش تجارتی (Purple)</option>
                  <option value="teal">فیروزه‌ای (Teal)</option>
                  <option value="slate">خاکستری تیره (Slate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شرح و توضیحات دسته
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحاتی در مورد ماهیت این درآمد..."
                  value={categoryFormDesc}
                  onChange={e => setCategoryFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  ذخیره دسته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
