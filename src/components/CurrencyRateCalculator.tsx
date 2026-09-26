import React, { useState, useEffect, useRef } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { formatNumber } from '../utils/formatters';
import {
  Calculator,
  ArrowLeftRight,
  Copy,
  Check,
  X,
  RotateCcw,
  TrendingUp,
  Save,
  Coins,
} from 'lucide-react';

interface CurrencyRateCalculatorProps {
  minimal?: boolean;
}

export const CurrencyRateCalculator: React.FC<CurrencyRateCalculatorProps> = ({ minimal = false }) => {
  const { cashRegister, updateExchangeRate } = useAccounting();
  const [isOpen, setIsOpen] = useState(false);

  // Rate state (defaults to system rate)
  const systemRate = cashRegister.usdToAfnRate || 65;
  const [rate, setRate] = useState<number>(systemRate);
  const [rateInput, setRateInput] = useState<string>(systemRate.toString());

  // Conversion amounts
  const [usdInput, setUsdInput] = useState<string>('100');
  const [afnInput, setAfnInput] = useState<string>((100 * systemRate).toLocaleString());

  // Last edited direction: 'usd' or 'afn'
  const [lastEdited, setLastEdited] = useState<'usd' | 'afn'>('usd');
  const [copiedField, setCopiedField] = useState<'usd' | 'afn' | null>(null);
  const [rateUpdatedSuccess, setRateUpdatedSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with system rate when system rate changes
  useEffect(() => {
    setRate(systemRate);
    setRateInput(systemRate.toString());
    if (lastEdited === 'usd') {
      const u = parseFloat(usdInput.replace(/,/g, '')) || 0;
      setAfnInput(Math.round(u * systemRate).toLocaleString());
    } else {
      const a = parseFloat(afnInput.replace(/,/g, '')) || 0;
      setUsdInput((a / (systemRate || 1)).toFixed(2));
    }
  }, [systemRate]);

  // Click outside and escape handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle USD input change
  const handleUsdChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setUsdInput(clean);
    setLastEdited('usd');
    const u = parseFloat(clean);
    if (!isNaN(u) && rate > 0) {
      setAfnInput(Math.round(u * rate).toLocaleString());
    } else if (clean === '') {
      setAfnInput('');
    }
  };

  // Handle AFN input change
  const handleAfnChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setAfnInput(clean ? parseFloat(clean).toLocaleString() : '');
    setLastEdited('afn');
    const a = parseFloat(clean);
    if (!isNaN(a) && rate > 0) {
      setUsdInput((a / rate).toFixed(2));
    } else if (clean === '') {
      setUsdInput('');
    }
  };

  // Handle Rate input change
  const handleRateChange = (val: string) => {
    setRateInput(val);
    const r = parseFloat(val);
    if (!isNaN(r) && r > 0) {
      setRate(r);
      if (lastEdited === 'usd') {
        const u = parseFloat(usdInput.replace(/,/g, '')) || 0;
        setAfnInput(Math.round(u * r).toLocaleString());
      } else {
        const a = parseFloat(afnInput.replace(/,/g, '')) || 0;
        setUsdInput((a / r).toFixed(2));
      }
    }
  };

  // Apply custom rate to whole system
  const handleApplyRateToSystem = () => {
    if (rate > 0) {
      updateExchangeRate(rate);
      setRateUpdatedSuccess(true);
      setTimeout(() => setRateUpdatedSuccess(false), 2500);
    }
  };

  // Reset rate to current system rate
  const handleResetRate = () => {
    setRate(systemRate);
    setRateInput(systemRate.toString());
    const u = parseFloat(usdInput.replace(/,/g, '')) || 0;
    setAfnInput(Math.round(u * systemRate).toLocaleString());
  };

  // Copy to clipboard
  const handleCopy = (field: 'usd' | 'afn', val: string) => {
    navigator.clipboard.writeText(val.replace(/,/g, ''));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Quick chips
  const applyQuickUsd = (amt: number) => {
    setUsdInput(amt.toString());
    setAfnInput(Math.round(amt * rate).toLocaleString());
    setLastEdited('usd');
  };

  const applyQuickAfn = (amt: number) => {
    setAfnInput(amt.toLocaleString());
    setUsdInput((amt / rate).toFixed(2));
    setLastEdited('afn');
  };

  const usdNum = parseFloat(usdInput.replace(/,/g, '')) || 0;
  const afnNum = parseFloat(afnInput.replace(/,/g, '')) || 0;

  return (
    <div className="relative" ref={containerRef} dir="rtl">
      {/* Header Trigger Button */}
      {minimal ? (
        <button
          type="button"
          id="header-btn-currency-calculator"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border-slate-200/90'
          }`}
          title={`قیمت اسعار و تبدیل لحظه‌ای ($۱ = ${rate} افغانی) - کلیک برای محاسبه`}
          aria-label="قیمت ارز و ماشین حساب"
        >
          <Coins className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-blue-600'}`} />
          <span className="font-mono text-[11px] font-black tracking-tight">
            ${rate}
          </span>
        </button>
      ) : (
        <button
          type="button"
          id="header-btn-currency-calculator"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border-slate-200/90'
          }`}
          title="ماشین حساب سریع تبدیل نرخ اسعار (دالر و افغانی)"
        >
          <Calculator className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-blue-600'}`} />
          <span className="hidden sm:inline">محاسبه ارز</span>
          <span
            className={`font-mono text-[10.5px] px-1.5 py-0.2 rounded-full ${
              isOpen ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {rate}
          </span>
        </button>
      )}

      {/* Floating Popover Calculator Card */}
      {isOpen && (
        <div
          id="header-currency-calculator-popover"
          className="absolute top-full mt-2.5 right-0 z-50 w-80 sm:w-[350px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">ماشین حساب اسعار</h4>
                <p className="text-[10px] text-slate-400 font-medium">تبدیل سریع افغانی به دلار و بالعکس</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rate Bar */}
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                نرخ مبادله (۱ دالر = چند افغانی):
              </span>
              {rate !== systemRate && (
                <button
                  type="button"
                  onClick={handleResetRate}
                  className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer font-bold"
                  title="بازنشانی به نرخ روز سیستم"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  نرخ روز ({systemRate})
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  value={rateInput}
                  onChange={e => handleRateChange(e.target.value)}
                  className="w-full bg-white text-xs font-black font-mono text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="مثلاً 65.5"
                />
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">AFN</span>
              </div>

              {rate !== systemRate && (
                <button
                  type="button"
                  onClick={handleApplyRateToSystem}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                  title="ذخیره این نرخ به عنوان نرخ رسمی در تمام سیستم"
                >
                  <Save className="w-3 h-3" />
                  <span>ثبت در سیستم</span>
                </button>
              )}
            </div>

            {rateUpdatedSuccess && (
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-0.5">
                <Check className="w-3 h-3" />
                نرخ در تمام بخش‌های سیستم با موفقیت بروزرسانی شد.
              </p>
            )}
          </div>

          {/* Dual Currency Inputs */}
          <div className="mt-3 space-y-2.5">
            {/* USD Input Block */}
            <div
              className={`p-2.5 rounded-xl border transition ${
                lastEdited === 'usd'
                  ? 'bg-blue-50/40 border-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-blue-600 font-black">$</span>
                  <span>مبلغ به دلار (USD)</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy('usd', usdInput)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                  title="کپی مبلغ دلار"
                >
                  {copiedField === 'usd' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>کپی</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={usdInput}
                  onChange={e => handleUsdChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-base font-black font-mono text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 text-left focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  dir="ltr"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-black font-mono">$</span>
              </div>

              {/* Quick USD Chips */}
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {[10, 50, 100, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => applyQuickUsd(amt)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-md text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Middle Indicator */}
            <div className="flex items-center justify-center">
              <div className="p-1.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* AFN Input Block */}
            <div
              className={`p-2.5 rounded-xl border transition ${
                lastEdited === 'afn'
                  ? 'bg-emerald-50/40 border-emerald-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-emerald-600 font-black">؋</span>
                  <span>مبلغ به افغانی (AFN)</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy('afn', afnInput)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                  title="کپی مبلغ افغانی"
                >
                  {copiedField === 'afn' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>کپی</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={afnInput}
                  onChange={e => handleAfnChange(e.target.value)}
                  placeholder="0"
                  className="w-full text-base font-black font-mono text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 text-left focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  dir="ltr"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">AFN</span>
              </div>

              {/* Quick AFN Chips */}
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {[1000, 5000, 10000, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => applyQuickAfn(amt)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 rounded-md text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    {formatNumber(amt)} ؋
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Formula & Summary Pill */}
          <div className="mt-3 p-2 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
            <p className="text-[11px] font-bold text-blue-900 leading-snug">
              {formatNumber(usdNum)} دلار با نرخ {rate} ={' '}
              <span className="text-emerald-700 font-black">{formatNumber(afnNum)} افغانی</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
