import React, { useState, useRef, useEffect } from 'react';
import { useTheme, AppTheme, SidebarStyle } from '../context/ThemeContext';
import {
  Palette,
  Moon,
  Sun,
  Layout,
  Check,
  ChevronDown,
  Sparkles,
  Sliders,
  Layers,
  ListFilter,
  CreditCard,
  Columns,
} from 'lucide-react';

interface ThemeSwitcherDropdownProps {
  minimal?: boolean;
}

export const ThemeSwitcherDropdown: React.FC<ThemeSwitcherDropdownProps> = ({ minimal = false }) => {
  const { theme, setTheme, sidebarStyle, setSidebarStyle, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { id: AppTheme; name: string; desc: string; color: string; iconBg: string; symbol: string }[] = [
    {
      id: 'sky-glass',
      name: 'تم شیشه‌ای بلورین (Sky Glass)',
      desc: 'تم روشن بلورین و شیشه‌ای با هاله آسمانی، دکمه‌های کریستالی و زمینه پرنور شفاف',
      color: 'bg-sky-100 border-sky-400',
      iconBg: 'bg-sky-100 text-sky-700 border border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]',
      symbol: '💎',
    },
    {
      id: 'light',
      name: 'تم روشن استاندارد (Light)',
      desc: 'کنتراست بالا، زمینه شفاف و استایل تمیز دفاتر حسابداری',
      color: 'bg-white border-blue-600',
      iconBg: 'bg-blue-100 text-blue-700',
      symbol: '☼',
    },
    {
      id: 'dark',
      name: 'تم شب زغال‌سنگی (Dark Slate)',
      desc: 'کنتراست عمیق مشکی و زغال‌سنگی، بدون خستگی چشم در شب',
      color: 'bg-slate-950 border-slate-700',
      iconBg: 'bg-slate-800 text-slate-200',
      symbol: '☾',
    },
    {
      id: 'gold',
      name: 'تم طلایی سلطنتی (Royal Gold)',
      desc: 'پالت لوکس زرین و مشکی با حاشیه‌های زرین و دکمه‌های طلایی درخشان',
      color: 'bg-amber-500 border-amber-300',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-xs',
      symbol: '★',
    },
    {
      id: 'executive',
      name: 'تم اداری سرمه‌ای (Executive Navy)',
      desc: 'سبک سازمانی مدیران ارشد با پالت لاجوردی و کنتراست عمیق سازمانی',
      color: 'bg-slate-900 border-indigo-500',
      iconBg: 'bg-indigo-900 text-indigo-200',
      symbol: '♦',
    },
    {
      id: 'classic',
      name: 'تم دفاتر کلاسیک (Classic Ivory)',
      desc: 'زمینه ملایم خاکی و عاجی سبک دفاتر بازرگانی و صرافی سنتی',
      color: 'bg-stone-100 border-stone-400',
      iconBg: 'bg-stone-200 text-stone-800',
      symbol: '❖',
    },
    {
      id: 'vibrant',
      name: 'تم بازرگانی زمردی (Vibrant Emerald)',
      desc: 'رنگ‌های با طراوت زمردی و سبز نعنایی برای پویایی و انرژی معاملات',
      color: 'bg-emerald-50 border-emerald-600',
      iconBg: 'bg-emerald-100 text-emerald-800',
      symbol: '▲',
    },
  ];

  const sidebarStyles: { id: SidebarStyle; name: string; icon: any; desc: string }[] = [
    {
      id: 'modern-list',
      name: 'منوی لیستی مدرن',
      icon: ListFilter,
      desc: 'سلسله‌مراتب تمیز، خطوط راهنما و کمترین شلوغی',
    },
    {
      id: 'colored-cards',
      name: 'کارت‌های رنگی تفکیک‌شده',
      icon: CreditCard,
      desc: 'منوهای رنگی با پس‌زمینه‌های متمایز و آیکون‌های بولد',
    },
    {
      id: 'compact',
      name: 'منوی فشرده حسابداری',
      icon: Columns,
      desc: 'بهینه‌سازی تراکم آیتم‌ها برای حداکثر دید صفحه',
    },
  ];

  const currentThemeObj = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        id="btn-theme-switcher-toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          minimal
            ? `w-9 h-9 rounded-xl border flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95 ${
                theme === 'sky-glass'
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-900 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                  : theme === 'gold'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400/80 text-amber-950 dark:text-amber-300'
                  : theme === 'dark' || theme === 'executive'
                  ? 'bg-slate-800 border-slate-700 text-slate-100'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90'
              }`
            : `flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                theme === 'sky-glass'
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-900 shadow-[0_0_12px_rgba(56,189,248,0.25)] backdrop-blur-md'
                  : theme === 'gold'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400/80 text-amber-950 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : theme === 'dark' || theme === 'executive'
                  ? 'bg-slate-800 border-slate-700 text-slate-100'
                  : theme === 'classic'
                  ? 'bg-stone-100 border-stone-300 text-stone-900'
                  : theme === 'vibrant'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`
        }
        title="تغییر تم رنگی و استایل برنامه"
        aria-label="تغییر تم رنگی"
      >
        <Palette
          className={`w-4 h-4 ${
            theme === 'sky-glass'
              ? 'text-sky-600'
              : theme === 'gold'
              ? 'text-amber-500'
              : theme === 'vibrant'
              ? 'text-emerald-600'
              : theme === 'executive'
              ? 'text-indigo-400'
              : theme === 'dark'
              ? 'text-blue-400'
              : 'text-blue-600'
          }`}
        />
        {!minimal && (
          <>
            <span className="hidden sm:inline font-bold">
              {currentThemeObj.name.split(' (')[0]}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-92 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3.5 z-50 text-right space-y-4">
          {/* Themes Selection */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>پالت و تم‌های گرافیکی برنامه</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {themes.map(t => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition cursor-pointer border ${
                      isSelected
                        ? t.id === 'sky-glass'
                          ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-[0_0_18px_rgba(56,189,248,0.3)] ring-2 ring-sky-400/40 backdrop-blur-md'
                          : t.id === 'gold'
                          ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-stone-900 border-amber-500 shadow-xs ring-2 ring-amber-400/30'
                          : t.id === 'dark'
                          ? 'bg-slate-800 border-slate-600 text-white shadow-xs ring-2 ring-slate-400/20'
                          : t.id === 'executive'
                          ? 'bg-slate-800 border-indigo-500 text-indigo-100 shadow-xs ring-2 ring-indigo-400/20'
                          : t.id === 'vibrant'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-400/20'
                          : t.id === 'classic'
                          ? 'bg-stone-100 border-stone-400 text-stone-900 shadow-xs ring-2 ring-stone-400/20'
                          : 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs ring-2 ring-blue-400/20'
                        : 'border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${t.iconBg}`}>
                        {t.symbol}
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isSelected ? 'text-slate-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {t.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                          {t.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        t.id === 'sky-glass' ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.8)]' :
                        t.id === 'gold' ? 'bg-amber-500 text-slate-950' :
                        t.id === 'vibrant' ? 'bg-emerald-600 text-white' :
                        t.id === 'executive' ? 'bg-indigo-600 text-white' :
                        t.id === 'classic' ? 'bg-stone-700 text-white' :
                        t.id === 'dark' ? 'bg-blue-500 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Style Selection */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-indigo-500" />
                <span>طرح و استایل منو (Sidebar Style)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {sidebarStyles.find(s => s.id === sidebarStyle)?.name}
              </span>
            </div>

            <div className="space-y-1.5">
              {sidebarStyles.map(s => {
                const IconComp = s.icon;
                const isSelected = sidebarStyle === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSidebarStyle(s.id);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-xs ring-2 ring-indigo-400/20'
                        : 'border-slate-200/50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">{s.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{s.desc}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        <span>فعال</span>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
