import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { CurrencyDefinition } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import {
  Coins,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Globe,
  Sparkles,
  Info,
  X,
  Save,
  Calculator,
  RefreshCw,
} from 'lucide-react';

export const CurrenciesView: React.FC = () => {
  const {
    currencies,
    baseCurrency,
    setBaseCurrency,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    cashRegister,
    updateExchangeRate,
    openPrintModal,
    companySettings,
  } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyDefinition | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    exchangeRateToAFN: 1,
    exchangeRateToUSD: 0,
    isBase: false,
    notes: '',
  });

  // Quick Converter State
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcSourceCode, setCalcSourceCode] = useState<string>('USD');
  const [calcTargetCode, setCalcTargetCode] = useState<string>('AFN');

  // Open modal for new currency
  const handleOpenAdd = () => {
    setEditingCurrency(null);
    setFormData({
      code: '',
      name: '',
      symbol: '',
      exchangeRateToAFN: 1,
      exchangeRateToUSD: 0,
      isBase: false,
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (curr: CurrencyDefinition) => {
    setEditingCurrency(curr);
    setFormData({
      code: curr.code,
      name: curr.name,
      symbol: curr.symbol,
      exchangeRateToAFN: curr.exchangeRateToAFN,
      exchangeRateToUSD: curr.exchangeRateToUSD || (curr.exchangeRateToAFN / (cashRegister.usdToAfnRate || 65)),
      isBase: curr.id === baseCurrency.id || !!curr.isBase,
      notes: curr.notes || '',
    });
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    const rateAFN = Number(formData.exchangeRateToAFN) || 1;
    const rateUSD = formData.exchangeRateToUSD > 0 
      ? Number(formData.exchangeRateToUSD) 
      : rateAFN / (cashRegister.usdToAfnRate || 65);

    let savedId = '';
    if (editingCurrency) {
      savedId = editingCurrency.id;
      updateCurrency(editingCurrency.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || formData.code.trim().toUpperCase(),
        exchangeRateToAFN: rateAFN,
        exchangeRateToUSD: rateUSD,
        notes: formData.notes.trim(),
      });
    } else {
      const created = addCurrency({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || formData.code.trim().toUpperCase(),
        exchangeRateToAFN: rateAFN,
        exchangeRateToUSD: rateUSD,
        isBase: false,
        isDefault: false,
        notes: formData.notes.trim(),
      });
      savedId = created.id;
    }

    if (formData.isBase && savedId) {
      setBaseCurrency(savedId);
    }

    setIsModalOpen(false);
  };

  // Filtered Currencies
  const filteredCurrencies = currencies.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  // Calculation logic for quick converter
  const sourceCurr = currencies.find(c => c.code === calcSourceCode) || currencies[1] || currencies[0];
  const targetCurr = currencies.find(c => c.code === calcTargetCode) || currencies[0];

  const sourceRateAFN = sourceCurr?.exchangeRateToAFN || 1;
  const targetRateAFN = targetCurr?.exchangeRateToAFN || 1;
  const convertedAmount = targetRateAFN > 0 ? (calcAmount * sourceRateAFN) / targetRateAFN : 0;

  // Print Rate Sheet
  const handlePrintRateSheet = () => {
    openPrintModal({
      title: 'جدول رسمی نرخ برابری اسعار و ارزها',
      type: 'report',
      date: getPersianDate(),
      details: {
        'تاریخ استعلام': getPersianDate(),
        'واحد پایه سیستم': 'افغانی افغانستان (AFN)',
        'نرخ مرجع دلار': `${cashRegister.usdToAfnRate || 65} افغانی`,
        'شرکت صادرکننده': companySettings.name,
      },
      summaryCards: [
        {
          label: 'تعداد کل ارزهای فعال',
          value: `${currencies.length} اسعار`,
          color: 'blue',
        },
        {
          label: 'نرخ دلار صرافی',
          value: `${cashRegister.usdToAfnRate || 65} ؋`,
          color: 'emerald',
        },
      ],
      tableHeaders: ['کد ارز', 'نام کامل ارز', 'علامت', 'نرخ به افغانی (۱ واحد)', 'معادل ۱۰۰ واحد به افغانی', 'توضیحات و کاربرد'],
      tableRows: currencies.map(c => [
        c.code,
        c.name + (c.isBase ? ' (ارز پایه)' : ''),
        c.symbol,
        `${formatNumber(c.exchangeRateToAFN, 4)} ؋`,
        `${formatNumber(c.exchangeRateToAFN * 100, 2)} ؋`,
        c.notes || '—',
      ]),
      footerNotes: 'نرخ‌های فوق مبنای ثبت اسناد مالی و تبادله صندوق‌ها در سیستم حسابداری می‌باشد.',
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">تعریف و مدیریت اسعار و ارزها</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200">
                تعاریف اولیه سیستم
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              معرفی ارزهای جدید (یورو، کلدار، تومان، درهم، یوان و...)، تنظیم نرخ برابری روزانه و مبدل زنده اسعار
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintRateSheet}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ نرخ‌نامه روز اسعار</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>معرفی ارز جدید</span>
          </button>
        </div>
      </div>

      {/* 3 Summary & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Base Currency */}
        <div className="bg-white p-6 rounded-3xl border-2 border-emerald-300 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ارز اصلی محاسبه سود و زیان (P&L Base)</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {baseCurrency.name} ({baseCurrency.code})
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                کلیه محاسبات سود ناخالص و گزارشات مالی به این ارز سنجیده می‌شوند.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl font-mono shrink-0">
              {baseCurrency.symbol || baseCurrency.code}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">تغییر ارز مبنای سیستم:</span>
            <select
              value={baseCurrency.id}
              onChange={e => setBaseCurrency(e.target.value)}
              className="bg-slate-50 hover:bg-emerald-50 text-slate-900 font-bold text-xs py-1.5 px-3 rounded-xl border border-slate-300 outline-none cursor-pointer"
            >
              {currencies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reference USD Rate */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">نرخ مرجع صرافی دلار آمریکا</span>
            <h3 className="text-2xl font-black text-blue-600 font-mono mt-1">
              ۱ $ = {cashRegister.usdToAfnRate || 65} ؋
            </h3>
            <p className="text-[11px] text-blue-500 font-semibold mt-1">مبنای تبدیل صندوق‌های ارزی و صرافی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-2xl font-mono">
            $
          </div>
        </div>

        {/* Total Active Currencies */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">تعداد کل اسعار فعال</span>
            <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">
              {currencies.length} ارز بین‌المللی
            </h3>
            <p className="text-[11px] text-slate-300 mt-1">پشتیبانی کامل از حوالجات و تبادلات چندارزی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Currency Calculator / Converter Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">ماشین حساب و مبدل فوری اسعار</h3>
              <p className="text-[11px] text-slate-300">محاسبه آنی تبدیل نرخ هر ارز به ارز دیگر براساس نرخ‌های روز سیستم</p>
            </div>
          </div>

          <div className="text-xs text-amber-300 font-bold bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            ۱ {sourceCurr?.code} = {formatNumber(sourceRateAFN / targetRateAFN, 4)} {targetCurr?.code}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2">
          {/* Source Input */}
          <div className="md:col-span-4 bg-slate-800/80 rounded-2xl p-3 border border-slate-700">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">مبلغ مبدا:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={calcAmount}
                onChange={e => setCalcAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-lg font-mono font-black text-white outline-none"
              />
              <select
                value={calcSourceCode}
                onChange={e => setCalcSourceCode(e.target.value)}
                className="bg-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none border border-slate-600"
              >
                {currencies.map(c => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={() => {
                const temp = calcSourceCode;
                setCalcSourceCode(calcTargetCode);
                setCalcTargetCode(temp);
              }}
              className="p-2.5 bg-slate-700 hover:bg-slate-600 text-amber-400 rounded-xl transition cursor-pointer border border-slate-600"
              title="جابجایی ارز مبدا و مقصد"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Target Result */}
          <div className="md:col-span-4 bg-emerald-950/60 rounded-2xl p-3 border border-emerald-700/60">
            <label className="block text-[11px] font-bold text-emerald-400 mb-1">معادل در ارز مقصد:</label>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-mono font-black text-emerald-300">
                {formatNumber(convertedAmount, 2)} {targetCurr?.symbol}
              </span>
              <select
                value={calcTargetCode}
                onChange={e => setCalcTargetCode(e.target.value)}
                className="bg-emerald-900 text-emerald-100 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none border border-emerald-600"
              >
                {currencies.map(c => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick presets */}
          <div className="md:col-span-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setCalcAmount(1000);
                setCalcSourceCode('USD');
                setCalcTargetCode('AFN');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-300 border border-slate-700 cursor-pointer"
            >
              1,000 $ → AFN
            </button>
            <button
              onClick={() => {
                setCalcAmount(65000);
                setCalcSourceCode('AFN');
                setCalcTargetCode('USD');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-300 border border-slate-700 cursor-pointer"
            >
              65,000 ؋ → USD
            </button>
            <button
              onClick={() => {
                setCalcAmount(100);
                setCalcSourceCode('EUR');
                setCalcTargetCode('AFN');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-300 border border-slate-700 cursor-pointer"
            >
              100 € → AFN
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در کد، نام ارز یا کاربرد معاملات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          نمایش {filteredCurrencies.length} از {currencies.length} ارز
        </span>
      </div>

      {/* Currencies Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCurrencies.map(curr => {
          const isBase = curr.id === baseCurrency.id || !!curr.isBase;
          const isUSD = curr.code === 'USD';

          return (
            <div
              key={curr.id}
              className={`bg-white rounded-3xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                isBase
                  ? 'border-emerald-400 ring-2 ring-emerald-200/70 bg-gradient-to-b from-emerald-50/20 to-white'
                  : isUSD
                  ? 'border-blue-300 ring-2 ring-blue-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl font-mono ${
                        isBase
                          ? 'bg-emerald-100 text-emerald-800'
                          : isUSD
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {curr.symbol || curr.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{curr.name}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-black text-slate-700">
                          {curr.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {isBase ? 'ارز اصلی منتخب سود و زیان سیستم' : `معرفی شده در ${curr.createdAt || '1403/01/01'}`}
                      </span>
                    </div>
                  </div>

                  {isBase && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-black shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>ارز مبنای سود (Base)</span>
                    </span>
                  )}
                  {isUSD && !isBase && (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 text-[10px] font-black">
                      ارز صرافی
                    </span>
                  )}
                </div>

                {/* Rates Detail Box */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">نرخ برابری به افغانی (۱ واحد):</span>
                    <strong className="font-mono text-slate-900 font-bold">
                      {formatNumber(curr.exchangeRateToAFN, 4)} ؋
                    </strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">معادل ۱۰۰ واحد به افغانی:</span>
                    <strong className="font-mono text-emerald-700 font-bold">
                      {formatNumber(curr.exchangeRateToAFN * 100, 2)} ؋
                    </strong>
                  </div>

                  {curr.code !== 'AFN' && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">معادل ۱ دلار آمریکا:</span>
                      <strong className="font-mono text-blue-700 font-bold">
                        {formatNumber((cashRegister.usdToAfnRate || 65) / (curr.exchangeRateToAFN || 1), 2)} {curr.code}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Set As Base Currency Action Button */}
                {!isBase ? (
                  <button
                    type="button"
                    onClick={() => setBaseCurrency(curr.id)}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    title="محاسبه کلیه سودها و گزارشات سیستم بر اساس این ارز انجام شود"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تنظیم به عنوان ارز اصلی محاسبه سود و زیان</span>
                  </button>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>این ارز در حال حاضر مبنای محاسبه سود و زیان است</span>
                  </div>
                )}

                {/* Notes */}
                {curr.notes && (
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <Info className="w-3.5 h-3.5 inline text-slate-400 ml-1" />
                    {curr.notes}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const newRateStr = prompt(
                      `نرخ جدید هر ۱ ${curr.name} به افغانی را وارد نمایید:`,
                      String(curr.exchangeRateToAFN)
                    );
                    if (newRateStr) {
                      const newRate = parseFloat(newRateStr);
                      if (newRate > 0) {
                        updateCurrency(curr.id, { exchangeRateToAFN: newRate });
                      }
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-600 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بروزرسانی سریع نرخ</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(curr)}
                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                    title="ویرایش مشخصات ارز"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {!curr.isDefault && !isBase && (
                    <button
                      onClick={() => {
                        if (confirm(`آیا از حذف ارز "${curr.name}" (${curr.code}) مطمئن هستید؟`)) {
                          deleteCurrency(curr.id);
                        }
                      }}
                      className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition cursor-pointer"
                      title="حذف ارز"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Currency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCurrency ? `ویرایش ارز: ${editingCurrency.name}` : 'معرفی و تعریف ارز جدید'}
                  </h3>
                  <p className="text-xs text-slate-400">ثبت کد بین‌المللی، نام فارسی، سمبل و نرخ برابری به افغانی</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Currency Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    کد اختصاری ارز (ISO Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: EUR, PKR, IRR, CNY"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    علامت و نماد ارز <span className="text-slate-400 font-normal">(اختیاری)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: €, ₨, تومان, ¥, د.إ"
                    value={formData.symbol}
                    onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Full Persian Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام کامل فارسی ارز <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: یورو اروپا، کلدار پاکستان، تومان ایران، لیر ترکیه"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
              </div>

              {/* Exchange Rate to AFN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نرخ برابری هر ۱ واحد از این ارز به افغانی (؋) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  placeholder="مثلاً 70.5 برای یورو، 0.233 برای کلدار"
                  value={formData.exchangeRateToAFN}
                  onChange={e => setFormData({ ...formData, exchangeRateToAFN: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  مثال: اگر ۱ دلار = ۶۵ افغانی است، عدد ۶۵ را وارد کنید. اگر ۱ کلدار = ۰.۲۳ افغانی است، عدد ۰.۲۳ را وارد نمایید.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و کاربرد در معاملات</label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: مربوط به حوالجات صرافی سرای شهزاده یا واردات از بنادر..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Set as Base Currency Option */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="set-as-base-currency-checkbox"
                  checked={formData.isBase}
                  onChange={e => setFormData({ ...formData, isBase: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                />
                <label htmlFor="set-as-base-currency-checkbox" className="text-xs text-slate-800 cursor-pointer">
                  <span className="font-black text-emerald-900 block">
                    تنظیم به عنوان «ارز اصلی سیستم» جهت محاسبه مفاد و ضرر (Base Currency)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    با فعال‌سازی این گزینه، سود ناخالص فاکتورها، گزارش سود و زیان (P&L) و خلاصه بیلاننس بر مبنای این ارز سنجیده خواهند شد.
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCurrency ? 'ذخیره تغییرات ارز' : 'ثبت و معرفی ارز'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
