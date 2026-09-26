import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Building2,
  Menu,
  Lock,
  Cloud,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { ThemeSwitcherDropdown } from './ThemeSwitcherDropdown';
import { CurrencyRateCalculator } from './CurrencyRateCalculator';

interface HeaderProps {
  activeTab: NavTab;
  onOpenNewInvoice: (type?: 'buy' | 'sell') => void;
  onOpenPaymentModal: (type?: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange') => void;
  onOpenAccessModal?: (tab?: 'roles' | 'reset' | 'backup' | 'company' | 'telegram') => void;
  onOpenTelegramModal?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenNewInvoice,
  onOpenPaymentModal,
  onOpenAccessModal,
  onOpenTelegramModal,
  onToggleSidebar,
}) => {
  const { currentUser, companySettings, logout } = useAccounting();

  return (
    <header className="h-16 bg-[#F8FAFC] border-b border-slate-200/70 flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 font-sans select-none" dir="rtl">
      {/* Right side: Menu button, Company Brand & Sleek Currency Rate Icon Button */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="باز و بسته کردن منو"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Executive Company Wordmark Pill */}
        <button
          type="button"
          onClick={() => onOpenAccessModal && onOpenAccessModal('company')}
          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs transition cursor-pointer max-w-[200px] sm:max-w-none"
          title="مشخصات و تنظیمات لوگوی شرکت"
        >
          {companySettings.logoUrl ? (
            <img src={companySettings.logoUrl} alt="لوگو" className="w-4 h-4 object-contain rounded-md shrink-0" />
          ) : (
            <Building2 className="w-4 h-4 text-[#2563EB] shrink-0" />
          )}
          <span className="text-xs font-black text-slate-900 truncate">
            {companySettings.name || 'شرکت تجارتی برادران نبوی'}
          </span>
        </button>

        {/* Minimal Chic Currency Rate Icon Button */}
        <CurrencyRateCalculator minimal />
      </div>

      {/* Left side: Minimal Chic Action Icons (Google Drive, Telegram, Theme, User, Lock) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Sleek Google Drive Cloud Backup Icon Button */}
        <button
          type="button"
          id="header-btn-google-drive"
          onClick={() => onOpenAccessModal && onOpenAccessModal('backup')}
          className="w-9 h-9 rounded-xl bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-slate-200/90 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
          title="پشتیبان‌گیری ابری و تنظیمات گوگل درایو"
          aria-label="گوگل درایو"
        >
          <Cloud className="w-4 h-4" />
        </button>

        {/* Sleek Official Telegram Bot Icon Button */}
        <button
          type="button"
          id="header-btn-telegram"
          onClick={() => onOpenTelegramModal ? onOpenTelegramModal() : onOpenAccessModal?.('telegram')}
          className="w-9 h-9 rounded-xl bg-white hover:bg-sky-50 text-[#229ED9] hover:text-[#1982b8] border border-slate-200/90 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
          title="مدیریت تلگرام و ارتباط با مشتریان"
          aria-label="ربات تلگرام"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
          </svg>
        </button>

        {/* Minimal Theme Switcher Icon Button */}
        <ThemeSwitcherDropdown minimal />

        {/* Sleek User Profile Badge */}
        <button
          id="header-btn-user-profile"
          type="button"
          onClick={() => onOpenAccessModal && onOpenAccessModal('roles')}
          className="flex items-center gap-2 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200/90 text-xs font-bold transition shadow-2xs cursor-pointer"
          title={`کاربر جاری: ${currentUser?.name || 'مدیر کل'} (${currentUser?.roleTitle || 'مدیر سیستم'}) - کلیک جهت مدیریت کاربران`}
        >
          <div className={`w-7 h-7 rounded-lg ${currentUser?.avatarColor || 'bg-[#2563EB]'} text-white flex items-center justify-center text-[11px] font-black shadow-2xs shrink-0`}>
            {(currentUser?.name || 'مدیر').slice(0, 2)}
          </div>
          <span className="text-xs font-black text-slate-800 hidden md:inline truncate max-w-[100px]">
            {currentUser?.name || 'مدیر سیستم'}
          </span>
        </button>

        {/* Sleek Lock Screen / Logout Icon Button */}
        <button
          type="button"
          id="header-btn-logout"
          onClick={logout}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
          title="خروج از حساب و قفل سیستم"
          aria-label="قفل برنامه"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
