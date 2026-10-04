import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutRow {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  rows: ShortcutRow[];
}

/**
 * Central registry of every keyboard shortcut the app supports.
 * Kept in one place so the help dialog and the global handler never drift apart.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'جستجو و ناوبری',
    rows: [
      { keys: ['Ctrl', 'K'], label: 'جستجوی سراسری و اجرای سریع دستورات' },
      { keys: ['Ctrl', 'B'], label: 'باز و بسته کردن منوی کناری' },
      { keys: ['Alt', '1'], label: 'داشبورد مدیریتی' },
      { keys: ['Alt', '2'], label: 'روزنامچه جامع رویدادها' },
      { keys: ['Alt', '3'], label: 'مرکز عملیات تجارتی (فاکتورها)' },
      { keys: ['Alt', '4'], label: 'دریافت و پرداخت' },
      { keys: ['Alt', '5'], label: 'طرف حساب‌ها و مشتریان' },
      { keys: ['Alt', '6'], label: 'گدام‌ها و انبارها' },
      { keys: ['Alt', '7'], label: 'صندوق‌ها و اسعار' },
      { keys: ['Alt', '8'], label: 'گزارش‌ها، سود و زیان و ترازنامه' },
      { keys: ['Alt', '9'], label: 'تعاریف اولیه سیستم' },
    ],
  },
  {
    title: 'عملیات سریع',
    rows: [
      { keys: ['Alt', 'N'], label: 'صدور فاکتور فروش جدید' },
      { keys: ['Alt', 'M'], label: 'صدور فاکتور خرید جدید' },
      { keys: ['Alt', 'R'], label: 'ثبت رسید دریافت وجه' },
      { keys: ['Alt', 'P'], label: 'ثبت سند پرداخت وجه' },
      { keys: ['Alt', 'T'], label: 'انتقال کالا بین گدام‌ها' },
      { keys: ['Alt', 'S'], label: 'مدیریت کاربران و سطوح دسترسی' },
      { keys: ['Alt', 'H'], label: 'همین راهنمای میان‌بُرها' },
    ],
  },
  {
    title: 'داخل پنجره جستجو و فرم‌ها',
    rows: [
      { keys: ['↑', '↓'], label: 'حرکت بین نتایج' },
      { keys: ['Enter'], label: 'انتخاب نتیجه فعال' },
      { keys: ['Esc'], label: 'بستن پنجره فعال' },
      { keys: ['Tab'], label: 'انتقال به فیلد بعدی فرم' },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9995] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="راهنمای میان‌بُرهای کیبورد"
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">میان‌بُرهای کیبورد</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                برای کار سریع‌تر با سیستم، بدون استفاده از ماوس
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="بستن راهنما"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.title} className="space-y-2">
              <h4 className="text-xs font-black text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {group.title}
              </h4>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                {group.rows.map(row => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <span className="text-[12px] font-bold text-slate-700">{row.label}</span>
                    <span className="flex items-center gap-1 shrink-0" dir="ltr">
                      {row.keys.map((key, i) => (
                        <React.Fragment key={`${row.label}-${key}-${i}`}>
                          {i > 0 && <span className="text-[10px] text-slate-400 font-bold">+</span>}
                          <kbd className="min-w-[26px] text-center px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 border-b-2 text-[11px] font-mono font-bold text-slate-700 shadow-2xs">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            نکته: در صورت استفاده از رایانه مکینتاش، جای <b className="font-mono">Ctrl</b> از کلید{' '}
            <b className="font-mono">⌘</b> استفاده کنید. میان‌بُرها در هنگام تایپ متن داخل فرم‌ها غیرفعال می‌شوند.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
