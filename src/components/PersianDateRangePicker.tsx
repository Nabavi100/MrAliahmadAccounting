import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { normalizePersianDate, getPersianDate } from '../utils/formatters';

export interface PersianDateRangePickerProps {
  fromDate: string;
  toDate: string;
  onChangeRange: (from: string, to: string) => void;
  onClear: () => void;
  label?: string;
  themeColor?: 'rose' | 'blue' | 'emerald' | 'indigo' | 'purple';
}

const PERSIAN_MONTHS = [
  { id: 1, name: 'حمل', altName: 'فروردین', days: 31 },
  { id: 2, name: 'ثور', altName: 'اردیبهشت', days: 31 },
  { id: 3, name: 'جوزا', altName: 'خرداد', days: 31 },
  { id: 4, name: 'سرطان', altName: 'تیر', days: 31 },
  { id: 5, name: 'اسد', altName: 'مرداد', days: 31 },
  { id: 6, name: 'سنبله', altName: 'شهریور', days: 31 },
  { id: 7, name: 'میزان', altName: 'مهر', days: 30 },
  { id: 8, name: 'عقرب', altName: 'آبان', days: 30 },
  { id: 9, name: 'قوس', altName: 'آذر', days: 30 },
  { id: 10, name: 'جدی', altName: 'دی', days: 30 },
  { id: 11, name: 'دلو', altName: 'بهمن', days: 30 },
  { id: 12, name: 'حوت', altName: 'اسفند', days: 29 },
];

/**
 * Helper to get clean Persian date string from a Date object: YYYY/MM/DD
 */
function getPersianDateFromDate(d: Date): string {
  try {
    const raw = new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return normalizePersianDate(raw);
  } catch {
    return getPersianDate();
  }
}

export const PersianDateRangePicker: React.FC<PersianDateRangePickerProps> = ({
  fromDate,
  toDate,
  onChangeRange,
  onClear,
  label = 'فیلتر بازه زمانی و تقویم',
  themeColor = 'rose',
}) => {
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'from' | 'to'>('from');

  // Parse current today's Persian date
  const todayStr = useMemo(() => normalizePersianDate(getPersianDate()), []);
  const todayParts = useMemo(() => {
    const p = todayStr.split('/');
    return {
      year: parseInt(p[0], 10) || 1403,
      month: parseInt(p[1], 10) || 1,
      day: parseInt(p[2], 10) || 1,
    };
  }, [todayStr]);

  // Calendar navigator state (year & month viewing)
  const [calYear, setCalYear] = useState<number>(todayParts.year);
  const [calMonth, setCalMonth] = useState<number>(todayParts.month);

  // Quick preset selections
  const handlePreset = (preset: string) => {
    const now = new Date();
    if (preset === 'all') {
      onClear();
      return;
    }

    if (preset === 'today') {
      onChangeRange(todayStr, todayStr);
      return;
    }

    if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yStr = getPersianDateFromDate(y);
      onChangeRange(yStr, yStr);
      return;
    }

    if (preset === 'last_7_days') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 7);
      onChangeRange(getPersianDateFromDate(d7), todayStr);
      return;
    }

    if (preset === 'last_30_days') {
      const d30 = new Date();
      d30.setDate(now.getDate() - 30);
      onChangeRange(getPersianDateFromDate(d30), todayStr);
      return;
    }

    if (preset === 'this_month') {
      const y = todayParts.year;
      const m = String(todayParts.month).padStart(2, '0');
      const maxDays = PERSIAN_MONTHS[todayParts.month - 1]?.days || 30;
      onChangeRange(`${y}/${m}/01`, `${y}/${m}/${String(maxDays).padStart(2, '0')}`);
      return;
    }

    if (preset === 'last_month') {
      let prevM = todayParts.month - 1;
      let prevY = todayParts.year;
      if (prevM < 1) {
        prevM = 12;
        prevY -= 1;
      }
      const mStr = String(prevM).padStart(2, '0');
      const maxDays = PERSIAN_MONTHS[prevM - 1]?.days || 30;
      onChangeRange(`${prevY}/${mStr}/01`, `${prevY}/${mStr}/${String(maxDays).padStart(2, '0')}`);
      return;
    }

    if (preset === 'this_year') {
      const y = todayParts.year;
      onChangeRange(`${y}/01/01`, `${y}/12/29`);
      return;
    }
  };

  // Determine current active preset
  const currentPreset = useMemo(() => {
    if (!fromDate && !toDate) return 'all';
    if (fromDate === todayStr && toDate === todayStr) return 'today';
    const y = todayParts.year;
    const m = String(todayParts.month).padStart(2, '0');
    const maxDays = PERSIAN_MONTHS[todayParts.month - 1]?.days || 30;
    if (fromDate === `${y}/${m}/01` && toDate === `${y}/${m}/${String(maxDays).padStart(2, '0')}`) {
      return 'this_month';
    }
    if (fromDate === `${y}/01/01` && toDate === `${y}/12/29`) {
      return 'this_year';
    }
    return 'custom';
  }, [fromDate, toDate, todayStr, todayParts]);

  // Color theme classes
  const themeClasses = {
    rose: {
      activeTab: 'bg-rose-600 text-white shadow-xs',
      button: 'text-rose-700 hover:bg-rose-50 border-rose-200',
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      ring: 'focus:ring-rose-500',
      icon: 'text-rose-600',
      calHeader: 'bg-rose-600 text-white',
      daySelected: 'bg-rose-600 text-white font-black shadow-xs',
      dayRange: 'bg-rose-100 text-rose-900',
    },
    blue: {
      activeTab: 'bg-blue-600 text-white shadow-xs',
      button: 'text-blue-700 hover:bg-blue-50 border-blue-200',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      ring: 'focus:ring-blue-500',
      icon: 'text-blue-600',
      calHeader: 'bg-blue-600 text-white',
      daySelected: 'bg-blue-600 text-white font-black shadow-xs',
      dayRange: 'bg-blue-100 text-blue-900',
    },
    emerald: {
      activeTab: 'bg-emerald-600 text-white shadow-xs',
      button: 'text-emerald-700 hover:bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      ring: 'focus:ring-emerald-500',
      icon: 'text-emerald-600',
      calHeader: 'bg-emerald-600 text-white',
      daySelected: 'bg-emerald-600 text-white font-black shadow-xs',
      dayRange: 'bg-emerald-100 text-emerald-900',
    },
    indigo: {
      activeTab: 'bg-indigo-600 text-white shadow-xs',
      button: 'text-indigo-700 hover:bg-indigo-50 border-indigo-200',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      ring: 'focus:ring-indigo-500',
      icon: 'text-indigo-600',
      calHeader: 'bg-indigo-600 text-white',
      daySelected: 'bg-indigo-600 text-white font-black shadow-xs',
      dayRange: 'bg-indigo-100 text-indigo-900',
    },
    purple: {
      activeTab: 'bg-purple-600 text-white shadow-xs',
      button: 'text-purple-700 hover:bg-purple-50 border-purple-200',
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
      ring: 'focus:ring-purple-500',
      icon: 'text-purple-600',
      calHeader: 'bg-purple-600 text-white',
      daySelected: 'bg-purple-600 text-white font-black shadow-xs',
      dayRange: 'bg-purple-100 text-purple-900',
    },
  }[themeColor];

  // Calendar Day Picker logic
  const daysInCalMonth = useMemo(() => {
    return PERSIAN_MONTHS[calMonth - 1]?.days || 30;
  }, [calMonth]);

  const handleSelectDay = (day: number) => {
    const formatted = `${calYear}/${String(calMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    if (activeTarget === 'from') {
      onChangeRange(formatted, toDate && toDate >= formatted ? toDate : formatted);
      setActiveTarget('to');
    } else {
      if (fromDate && formatted < fromDate) {
        onChangeRange(formatted, fromDate);
      } else {
        onChangeRange(fromDate || formatted, formatted);
      }
      setShowCalendarModal(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
      {/* Header and Active Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl bg-slate-100 ${themeClasses.icon}`}>
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800">{label}</span>
            <span className="text-[10px] text-slate-400 block">تقویم هجری خورشیدی • بر اساس تاریخ ثبت اسناد</span>
          </div>
        </div>

        {/* Current Active Range Tag */}
        {(fromDate || toDate) ? (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-black border flex items-center gap-1.5 ${themeClasses.badge}`}>
              <Calendar className="w-3 h-3" />
              <span>
                {fromDate ? `از ${fromDate}` : 'از ابتدا'} {toDate ? `تا ${toDate}` : 'تا کنون'}
              </span>
            </span>
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="لغو فیلتر تاریخ و نمایش تمام اسناد"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-slate-400 self-start sm:self-auto">
            نمایش تمامی اسناد (بدون محدودیت زمانی)
          </span>
        )}
      </div>

      {/* Row 1: Quick Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'all', label: 'همه زمان‌ها' },
          { id: 'today', label: 'امروز' },
          { id: 'yesterday', label: 'دیروز' },
          { id: 'last_7_days', label: '۷ روز اخیر' },
          { id: 'last_30_days', label: '۳۰ روز اخیر' },
          { id: 'this_month', label: 'این ماه' },
          { id: 'last_month', label: 'ماه گذشته' },
          { id: 'this_year', label: 'امسال' },
        ].map(p => {
          const isSelected = currentPreset === p.id;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isSelected
                  ? themeClasses.activeTab
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setActiveTarget('from');
            setShowCalendarModal(!showCalendarModal);
          }}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            showCalendarModal || currentPreset === 'custom'
              ? `${themeClasses.activeTab} border-transparent`
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>کادر تقویم و انتخاب دستی</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showCalendarModal ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Row 2: Direct Date Inputs (Always visible or toggleable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        <div>
          <label className="block text-[10.5px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <span>از تاریخ:</span>
            <span className="text-[9.5px] text-slate-400 font-mono">(YYYY/MM/DD)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={`مثلاً ${todayStr}`}
              value={fromDate}
              onChange={e => onChangeRange(normalizePersianDate(e.target.value), toDate)}
              className={`w-full px-3 py-1.5 pr-8 rounded-xl border border-slate-200 text-xs font-mono text-center focus:outline-none focus:ring-2 ${themeClasses.ring} bg-slate-50 focus:bg-white`}
            />
            <Calendar
              onClick={() => {
                setActiveTarget('from');
                setShowCalendarModal(true);
              }}
              className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer hover:text-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10.5px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <span>تا تاریخ:</span>
            <span className="text-[9.5px] text-slate-400 font-mono">(YYYY/MM/DD)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={`مثلاً ${todayStr}`}
              value={toDate}
              onChange={e => onChangeRange(fromDate, normalizePersianDate(e.target.value))}
              className={`w-full px-3 py-1.5 pr-8 rounded-xl border border-slate-200 text-xs font-mono text-center focus:outline-none focus:ring-2 ${themeClasses.ring} bg-slate-50 focus:bg-white`}
            />
            <Calendar
              onClick={() => {
                setActiveTarget('to');
                setShowCalendarModal(true);
              }}
              className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer hover:text-slate-700"
            />
          </div>
        </div>

        <div className="flex items-end gap-1.5 sm:col-span-2">
          <button
            type="button"
            onClick={() => {
              setActiveTarget('from');
              setShowCalendarModal(!showCalendarModal);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              showCalendarModal ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{showCalendarModal ? 'بستن کادر تقویم' : 'باز کردن کادر تقویم شمسی'}</span>
          </button>

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={onClear}
              className="py-1.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="پاک کردن فیلتر تاریخ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>حذف فیلتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Popover/Embedded Calendar Box */}
      {showCalendarModal && (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 mt-2 animate-fadeIn">
          {/* Target Selector: From or To */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTarget('from')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTarget === 'from' ? themeClasses.activeTab : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                انتخاب «از تاریخ» {fromDate && `(${fromDate})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTarget('to')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTarget === 'to' ? themeClasses.activeTab : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                انتخاب «تا تاریخ» {toDate && `(${toDate})`}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCalendarModal(false)}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month and Year Navigator */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (calMonth === 1) {
                  setCalMonth(12);
                  setCalYear(calYear - 1);
                } else {
                  setCalMonth(calMonth - 1);
                }
              }}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={calMonth}
                onChange={e => setCalMonth(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
              >
                {PERSIAN_MONTHS.map(m => (
                  <option key={m.id} value={m.id}>
                    ماه {m.id}: {m.name} ({m.altName})
                  </option>
                ))}
              </select>

              <select
                value={calYear}
                onChange={e => setCalYear(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none"
              >
                {[1401, 1402, 1403, 1404, 1405, 1406, 1407].map(y => (
                  <option key={y} value={y}>
                    سال {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setCalYear(todayParts.year);
                  setCalMonth(todayParts.month);
                }}
                className="px-2 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10.5px] font-bold cursor-pointer"
              >
                ماه جاری
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (calMonth === 12) {
                  setCalMonth(1);
                  setCalYear(calYear + 1);
                } else {
                  setCalMonth(calMonth + 1);
                }
              }}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center pt-1">
            {Array.from({ length: daysInCalMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateFormatted = `${calYear}/${String(calMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
              const isToday = dateFormatted === todayStr;
              const isFrom = dateFormatted === fromDate;
              const isTo = dateFormatted === toDate;
              const isInRange = fromDate && toDate && dateFormatted > fromDate && dateFormatted < toDate;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`h-9 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center relative cursor-pointer ${
                    isFrom || isTo
                      ? themeClasses.daySelected
                      : isInRange
                      ? themeClasses.dayRange
                      : isToday
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                  title={`${dateFormatted}${isToday ? ' (امروز)' : ''}`}
                >
                  {day}
                  {isToday && !isFrom && !isTo && (
                    <span className="w-1 h-1 rounded-full bg-amber-600 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick instructions / close */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            <span>
              در حال انتخاب: <strong className="text-slate-800">{activeTarget === 'from' ? 'از تاریخ (شروع)' : 'تا تاریخ (پایان)'}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowCalendarModal(false)}
              className="px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800"
            >
              تایید و اعمال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
