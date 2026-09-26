import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useTheme } from '../context/ThemeContext';
import {
  PieChart,
  Folder,
  Banknote,
  Truck,
  Factory,
  Building,
  TrendingUp,
  CreditCard,
  Users,
  Building2,
  Power,
  ChevronUp,
  ChevronDown,
  Warehouse,
  Boxes,
  Layers,
  FileSpreadsheet,
  Coins,
  Receipt,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { CompanySealLogo } from './CompanySealLogo';

export type NavTab =
  | 'dashboard'
  | 'journal'
  | 'definitions'
  | 'transactions'
  | 'invoices'
  | 'new_sale'
  | 'sales_invoices'
  | 'new_purchase'
  | 'purchase_invoices'
  | 'return_sell'
  | 'return_buy'
  | 'new_return_sell'
  | 'new_return_buy'
  | 'new_receipt'
  | 'receipts_list'
  | 'new_payment'
  | 'payments_list'
  | 'trade_hub'
  | 'receipt_payment_hub'
  | 'customers'
  | 'warehouses'
  | 'consignment'
  | 'cash'
  | 'expenses'
  | 'incomes'
  | 'fixed_assets'
  | 'shareholders'
  | 'products'
  | 'currencies'
  | 'reports'
  | 'audit_log'
  | 'telegram_manager';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  subFilter?: string;
  setSubFilter?: (sub: string) => void;
  onOpenNewInvoice?: (type: 'buy' | 'sell') => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange') => void;
  onOpenTransferModal?: () => void;
  onOpenAccessModal?: (tab?: 'roles' | 'reset' | 'backup') => void;
  onOpenTelegramModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  subFilter = 'all',
  setSubFilter,
  onOpenNewInvoice,
  onOpenPaymentModal,
  onOpenTransferModal,
  onOpenAccessModal,
  onOpenTelegramModal,
}) => {
  const { companySettings, logout } = useAccounting();
  const { theme, sidebarStyle } = useTheme();

  // Helper to find which section a tab belongs to
  const getSectionForTab = (tab: NavTab): string | null => {
    switch (tab) {
      case 'definitions':
      case 'warehouses':
      case 'currencies':
        return 'definitions';
      case 'cash':
        return 'cashAccounts';
      case 'trade_hub':
      case 'sales_invoices':
      case 'purchase_invoices':
      case 'new_sale':
      case 'new_purchase':
      case 'return_sell':
      case 'return_buy':
      case 'new_return_sell':
      case 'new_return_buy':
      case 'invoices':
      case 'consignment':
      case 'receipt_payment_hub':
      case 'new_receipt':
      case 'receipts_list':
      case 'new_payment':
      case 'payments_list':
      case 'incomes':
      case 'expenses':
        return 'tradeAndFinance';
      case 'fixed_assets':
      case 'shareholders':
        return 'fixedAssets';
      case 'customers':
      case 'products':
      case 'reports':
        return 'systemReports';
      case 'transactions':
        return 'accountingAndPnL';
      case 'audit_log':
      case 'telegram_manager':
        return 'systemManagement';
      case 'dashboard':
      default:
        return null;
    }
  };

  // Mutually exclusive accordion state: only the active menu section is open
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(() => {
    const activeSection = getSectionForTab(activeTab);
    return {
      definitions: activeSection === 'definitions',
      cashAccounts: activeSection === 'cashAccounts',
      tradeAndFinance: activeSection === 'tradeAndFinance',
      fixedAssets: activeSection === 'fixedAssets',
      systemReports: activeSection === 'systemReports',
      accountingAndPnL: activeSection === 'accountingAndPnL',
      systemManagement: activeSection === 'systemManagement',
    };
  });

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);

  // When any menu header is clicked:
  // If already open, collapse it. If closed, open ONLY this menu and collapse all others!
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = !!prev[section];
      return {
        definitions: !isCurrentlyOpen && section === 'definitions',
        cashAccounts: !isCurrentlyOpen && section === 'cashAccounts',
        tradeAndFinance: !isCurrentlyOpen && section === 'tradeAndFinance',
        fixedAssets: !isCurrentlyOpen && section === 'fixedAssets',
        systemReports: !isCurrentlyOpen && section === 'systemReports',
        accountingAndPnL: !isCurrentlyOpen && section === 'accountingAndPnL',
        systemManagement: !isCurrentlyOpen && section === 'systemManagement',
      };
    });
  };

  // When an option is selected:
  // Navigate, and automatically keep ONLY that section open while collapsing all other menus!
  const handleNavigate = (tab: NavTab, filter = 'all', sectionKey?: string | null) => {
    setActiveTab(tab);
    if (setSubFilter) {
      setSubFilter(filter);
    }
    const targetSection = sectionKey !== undefined ? sectionKey : getSectionForTab(tab);
    setOpenSections({
      definitions: targetSection === 'definitions',
      cashAccounts: targetSection === 'cashAccounts',
      tradeAndFinance: targetSection === 'tradeAndFinance',
      fixedAssets: targetSection === 'fixedAssets',
      systemReports: targetSection === 'systemReports',
      accountingAndPnL: targetSection === 'accountingAndPnL',
      systemManagement: targetSection === 'systemManagement',
    });
  };

  // Keep accordion in sync whenever activeTab changes from outside the sidebar
  useEffect(() => {
    const activeSection = getSectionForTab(activeTab);
    setOpenSections({
      definitions: activeSection === 'definitions',
      cashAccounts: activeSection === 'cashAccounts',
      tradeAndFinance: activeSection === 'tradeAndFinance',
      fixedAssets: activeSection === 'fixedAssets',
      systemReports: activeSection === 'systemReports',
      accountingAndPnL: activeSection === 'accountingAndPnL',
      systemManagement: activeSection === 'systemManagement',
    });
  }, [activeTab]);

  return (
    <aside
      id="app-sidebar-main"
      className="w-72 bg-white border-l border-slate-200/80 flex flex-col shrink-0 select-none shadow-xs z-20 h-screen font-sans overflow-hidden"
      dir="rtl"
    >
      {/* ---------------- 1. BRAND & COMPANY HEADER ---------------- */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <h1 className="text-slate-900 font-black text-sm tracking-tight truncate">
            {companySettings.name || 'شرکت تجارتی برادران نبوی'}
          </h1>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
            .SYSTEM MANAGEMENT
          </span>
        </div>

        {/* Authentic Company Circular Seal */}
        <CompanySealLogo size={44} className="shadow-2xs" />
      </div>

      {/* ---------------- 2. EXACT ORDER OF MENU ITEMS ---------------- */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {/* 1. داشبورد مدیریتی و روزنامچه */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-dashboard space-y-1">
          <button
            type="button"
            id="sidebar-btn-dashboard"
            onClick={() => handleNavigate('dashboard', 'all', null)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              activeTab === 'dashboard'
                ? theme === 'sky-glass'
                  ? 'bg-sky-500/20 text-sky-950 font-black border border-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                  : theme === 'gold'
                  ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-[#EEF2FF] text-[#2563EB] font-bold shadow-2xs'
                : 'bg-[#F4F7FE]/80 hover:bg-[#EEF2FF] text-[#2563EB] font-bold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PieChart className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
              <span className="text-xs">داشبورد مدیریتی</span>
            </div>
          </button>

          {/* دکمه روزنامچه جامع رویدادها و تراکنش‌ها در زیر گزینه داشبورد */}
          <button
            type="button"
            id="sidebar-btn-journal"
            onClick={() => handleNavigate('journal', 'all', null)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              activeTab === 'journal' || (activeTab === 'reports' && subFilter === 'journal')
                ? theme === 'sky-glass'
                  ? 'bg-blue-500/20 text-blue-950 font-black border border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                  : theme === 'gold'
                  ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-400/50'
                  : 'bg-[#EEF2FF] text-[#2563EB] font-black shadow-2xs border border-blue-200'
                : theme === 'sky-glass'
                ? 'bg-white/70 hover:bg-blue-50/70 text-slate-800 hover:text-blue-800 font-bold border border-sky-200/60'
                : theme === 'gold'
                ? 'bg-amber-950/20 hover:bg-amber-950/40 text-amber-200 font-medium border border-amber-800/40'
                : 'bg-[#F4F7FE]/80 hover:bg-[#EEF2FF] text-slate-700 hover:text-[#2563EB] font-bold'
            }`}
            title="روزنامچه جامع رویدادها، تراکنش‌ها و گردش گدام"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <span className="text-xs font-bold">روزنامچه</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
              Journal
            </span>
          </button>
        </div>

        {/* 2. تعاریف اولیه */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-definitions space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-definitions"
            onClick={() => toggleSection('definitions')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.definitions || getSectionForTab(activeTab) === 'definitions'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Folder className="w-4 h-4 text-[#2563EB] dark:text-amber-400" />
              <span className="text-xs">تعاریف اولیه</span>
            </div>
            {openSections.definitions ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-amber-400" />
            )}
          </button>

          {openSections.definitions && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-definitions-parties"
                onClick={() => handleNavigate('definitions', 'parties')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'parties'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                تعریف طرف حساب
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-products"
                onClick={() => handleNavigate('definitions', 'products')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'products'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                تعریف کالا و اجناس
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-warehouses"
                onClick={() => handleNavigate('definitions', 'warehouses')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'warehouses'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                تعریف گدام و انبار
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-cash"
                onClick={() => handleNavigate('definitions', 'cash')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'cash'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                تعریف صندوق‌ها
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-expenses"
                onClick={() => handleNavigate('definitions', 'expenses')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'expenses'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                تعریف هزینه‌ها
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-incomes"
                onClick={() => handleNavigate('definitions', 'incomes')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'incomes'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                تعریف عواید و درآمدها
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-currencies"
                onClick={() => handleNavigate('definitions', 'currencies')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'definitions' && subFilter === 'currencies'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                تعریف اسعار و ارزها
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-fixed-assets"
                onClick={() => handleNavigate('fixed_assets')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'fixed_assets'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                تجهیزات و دارایی‌ها
              </button>
              <button
                type="button"
                id="sidebar-sub-definitions-shareholders"
                onClick={() => handleNavigate('shareholders')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'shareholders'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                امور سهامداران و شرکا
              </button>
            </div>
          )}
        </div>

        {/* 3. گردش صندوق‌ها */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-cash space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-cash"
            onClick={() => toggleSection('cashAccounts')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.cashAccounts || getSectionForTab(activeTab) === 'cashAccounts'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Banknote className="w-4 h-4 text-[#2563EB] dark:text-emerald-400" />
              <span className="text-xs">گردش صندوق‌ها</span>
            </div>
            {openSections.cashAccounts ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-emerald-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-emerald-400" />
            )}
          </button>

          {openSections.cashAccounts && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-cash-usd-company"
                onClick={() => handleNavigate('cash', 'usd_cash')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'cash' && subFilter === 'usd_cash'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                صندوق شرکت دالری $
              </button>
              <button
                type="button"
                id="sidebar-sub-cash-usd-exchange"
                onClick={() => handleNavigate('cash', 'exchange_usd_cash')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'cash' && subFilter === 'exchange_usd_cash'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                صندوق صرافی دالری $
              </button>
              <button
                type="button"
                id="sidebar-sub-cash-afn-company"
                onClick={() => handleNavigate('cash', 'afn_cash')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'cash' && subFilter === 'afn_cash'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                صندوق شرکت افغانی AFN
              </button>
            </div>
          )}
        </div>

        {/* 4. بازرگانی و مالی */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-trade space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-trade"
            onClick={() => toggleSection('tradeAndFinance')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.tradeAndFinance || getSectionForTab(activeTab) === 'tradeAndFinance'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#2563EB] dark:text-indigo-400" />
              <span className="text-xs">بازرگانی و مالی</span>
            </div>
            {openSections.tradeAndFinance ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-indigo-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-indigo-400" />
            )}
          </button>

          {openSections.tradeAndFinance && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-new-sale"
                onClick={() => handleNavigate('new_sale')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'new_sale'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                فاکتور فروش (صدور فروش جدید)
              </button>
              <button
                type="button"
                id="sidebar-sub-return-sale"
                onClick={() => handleNavigate('trade_hub', 'return_sell')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'return_sell' || (activeTab === 'trade_hub' && subFilter === 'return_sell')
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                فاکتور برگشت از فروش (مرجوعی)
              </button>
              <button
                type="button"
                id="sidebar-sub-new-purchase"
                onClick={() => handleNavigate('new_purchase')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'new_purchase'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                فاکتور خرید (ثبت خرید کالا)
              </button>
              <button
                type="button"
                id="sidebar-sub-return-purchase"
                onClick={() => handleNavigate('trade_hub', 'return_buy')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'return_buy' || (activeTab === 'trade_hub' && subFilter === 'return_buy')
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                فاکتور برگشت از خرید
              </button>
              <button
                type="button"
                id="sidebar-sub-sales-purchases"
                onClick={() => handleNavigate('trade_hub', 'all')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'trade_hub' && (!subFilter || subFilter === 'all')
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                مرکز جامع فاکتورها و بازرگانی
              </button>
              <button
                type="button"
                id="sidebar-sub-consignment"
                onClick={() => handleNavigate('consignment')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'consignment'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                مدیریت گدام امانی
              </button>
              <button
                type="button"
                id="sidebar-sub-payments-receipts"
                onClick={() => handleNavigate('receipt_payment_hub')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'receipt_payment_hub' || activeTab === 'receipts_list' || activeTab === 'payments_list' || activeTab === 'transactions'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                دریافت و پرداخت (اسناد و لیست‌ها)
              </button>
              <button
                type="button"
                id="sidebar-sub-cash-transfer-op"
                onClick={() => handleNavigate('receipt_payment_hub', 'cash_transfer')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'receipt_payment_hub' && subFilter === 'cash_transfer'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                عملیه صندوق به صندوق
              </button>
              <button
                type="button"
                id="sidebar-sub-incomes"
                onClick={() => handleNavigate('incomes')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'incomes'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                عواید و سایر درآمدها
              </button>
              <button
                type="button"
                id="sidebar-sub-expenses"
                onClick={() => handleNavigate('expenses')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'expenses'
                    ? 'text-[#2563EB] font-bold bg-[#EEF2FF]'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                هزینه‌ها و مصارف جاری
              </button>
            </div>
          )}
        </div>

        {/* 5. فرآیند تولید (Single item with factory icon) */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-trade">
          <button
            type="button"
            id="sidebar-btn-production"
            onClick={() => setShowProductionModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Factory className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium">فرآیند تولید</span>
            </div>
          </button>
        </div>

        {/* 6. دارایی های ثابت و سهامداران */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-assets space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-assets"
            onClick={() => toggleSection('fixedAssets')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.fixedAssets || getSectionForTab(activeTab) === 'fixedAssets'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-[#2563EB] dark:text-purple-400" />
              <span className="text-xs">دارایی های ثابت و سهامداران</span>
            </div>
            {openSections.fixedAssets ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-purple-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-purple-400" />
            )}
          </button>

          {openSections.fixedAssets && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-fixed-assets"
                onClick={() => handleNavigate('fixed_assets')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'fixed_assets'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                تجهیزات و دارایی‌ها
              </button>
              <button
                type="button"
                id="sidebar-sub-shareholders"
                onClick={() => handleNavigate('shareholders')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium ${
                  activeTab === 'shareholders'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                امور سهامداران و شرکا
              </button>
            </div>
          )}
        </div>

        {/* 7. گزارشات سیستمی */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-reports space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-reports"
            onClick={() => toggleSection('systemReports')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.systemReports || getSectionForTab(activeTab) === 'systemReports'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-[#2563EB] dark:text-rose-400" />
              <span className="text-xs">گزارشات سیستمی</span>
            </div>
            {openSections.systemReports ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-rose-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-rose-400" />
            )}
          </button>

          {openSections.systemReports && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-rep-customers"
                onClick={() => handleNavigate('reports', 'parties', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && (subFilter === 'parties' || !subFilter || subFilter === 'all')
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>گزارش و مانده اشخاص</span>
              </button>
              <button
                type="button"
                id="sidebar-sub-rep-stock"
                onClick={() => handleNavigate('reports', 'inventory', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && subFilter === 'inventory'
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>موجودی کالا</span>
              </button>
              <button
                type="button"
                id="sidebar-sub-rep-sales"
                onClick={() => handleNavigate('reports', 'sales', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && subFilter === 'sales'
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>گزارش فروشات</span>
              </button>
              <button
                type="button"
                id="sidebar-sub-rep-product-sales"
                onClick={() => handleNavigate('reports', 'product_sales', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && subFilter === 'product_sales'
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>فروش کالاها (روزانه/ماهانه/سالانه)</span>
              </button>
              <button
                type="button"
                id="sidebar-sub-rep-purchases"
                onClick={() => handleNavigate('reports', 'purchases', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && subFilter === 'purchases'
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>گزارش خریدها</span>
              </button>
              <button
                type="button"
                id="sidebar-sub-rep-expenses"
                onClick={() => handleNavigate('reports', 'expenses', 'systemReports')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-between ${
                  activeTab === 'reports' && subFilter === 'expenses'
                    ? 'text-white bg-[#2563EB] font-bold shadow-xs'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                <span>گزارش کامل هزینه‌ها</span>
              </button>
            </div>
          )}
        </div>

        {/* 8. حسابداری و سود و زیان */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-reports space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-accounting"
            onClick={() => toggleSection('accountingAndPnL')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.accountingAndPnL || getSectionForTab(activeTab) === 'accountingAndPnL'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#2563EB] dark:text-cyan-400" />
              <span className="text-xs">حسابداری و سود و زیان</span>
            </div>
            {openSections.accountingAndPnL ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-cyan-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-cyan-400" />
            )}
          </button>

          {openSections.accountingAndPnL && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-pnl"
                onClick={() => handleNavigate('reports', 'profit_loss', 'accountingAndPnL')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'reports' && subFilter === 'profit_loss'
                    ? 'bg-[#EEF2FF] text-[#2563EB] font-bold'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                گزارش سود و زیان
              </button>
              <button
                type="button"
                id="sidebar-sub-balance"
                onClick={() => handleNavigate('reports', 'balance_sheet', 'accountingAndPnL')}
                className={`w-full text-right py-1 px-2 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                  activeTab === 'reports' && subFilter === 'balance_sheet'
                    ? 'bg-[#EEF2FF] text-[#2563EB] font-bold'
                    : 'text-slate-500 hover:text-[#2563EB] hover:bg-slate-50'
                }`}
              >
                ترازنامه و بیلاننس
              </button>
              <button
                type="button"
                id="sidebar-sub-manual-journal"
                onClick={() => handleNavigate('transactions', 'all', 'accountingAndPnL')}
                className="w-full text-right py-1 px-2 text-xs text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition-colors font-medium cursor-pointer"
              >
                اسناد حسابداری ( manual )
              </button>
            </div>
          )}
        </div>

        {/* 9. مدیریت سیستم */}
        <div className="sidebar-section-container sidebar-card-block sidebar-card-system space-y-0.5">
          <button
            type="button"
            id="sidebar-btn-system"
            onClick={() => toggleSection('systemManagement')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              openSections.systemManagement || getSectionForTab(activeTab) === 'systemManagement'
                ? theme === 'sky-glass'
                  ? 'bg-sky-50 text-sky-950 font-black border border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : theme === 'gold'
                  ? 'bg-amber-950/40 text-amber-300 font-black border border-amber-500/30'
                  : 'bg-[#EEF2FF] text-[#2563EB]'
                : 'text-[#2563EB] hover:bg-[#F4F7FE]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#2563EB] dark:text-slate-300" />
              <span className="text-xs">مدیریت سیستم</span>
            </div>
            {openSections.systemManagement ? (
              <ChevronUp className="w-4 h-4 text-[#2563EB] dark:text-slate-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2563EB] dark:text-slate-300" />
            )}
          </button>

          {openSections.systemManagement && (
            <div className="sidebar-submenu-wrapper mr-5 pr-3 border-r-2 border-dashed border-slate-200 dark:border-slate-700/60 py-1 space-y-1">
              <button
                type="button"
                id="sidebar-sub-audit-log"
                onClick={() => handleNavigate('audit_log')}
                className={`w-full text-right py-1.5 px-2 text-xs rounded-lg transition-colors font-bold flex items-center justify-between cursor-pointer ${
                  activeTab === 'audit_log'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-slate-600 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>دفتر ممیزی و امنیت (Audit Log)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black">
                  امنیت
                </span>
              </button>
              <button
                type="button"
                id="sidebar-sub-user-roles"
                onClick={() => {
                  if (onOpenAccessModal) onOpenAccessModal('roles');
                }}
                className="w-full text-right py-1 px-2 text-xs text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition-colors font-medium"
              >
                سطوح دسترسی کاربران
              </button>
              <button
                type="button"
                id="sidebar-sub-backup"
                onClick={() => {
                  if (onOpenAccessModal) onOpenAccessModal('backup');
                }}
                className="w-full text-right py-1 px-2 text-xs text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition-colors font-medium"
              >
                پشتیبان‌گیری از سیستم
              </button>
              <button
                type="button"
                id="sidebar-sub-telegram-manager"
                onClick={() => handleNavigate('telegram_manager', undefined, 'systemManagement')}
                className={`w-full text-right py-1.5 px-2 text-xs rounded-lg transition-colors font-bold flex items-center justify-between cursor-pointer ${
                  activeTab === 'telegram_manager'
                    ? 'text-[#2563EB] dark:text-amber-400 font-black bg-[#EEF2FF] dark:bg-amber-950/40 border border-blue-200 dark:border-amber-500/40 shadow-xs btn-active-luxury'
                    : 'text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>📱 مدیریت تلگرام</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#229ED9] text-white font-bold rounded-md">
                  ماژول اصلی
                </span>
              </button>
              <button
                type="button"
                id="sidebar-sub-telegram-bot"
                onClick={() => {
                  if (onOpenTelegramModal) onOpenTelegramModal();
                }}
                className="w-full text-right py-1.5 px-2 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold flex items-center justify-between cursor-pointer"
              >
                <span>ربات تلگرام و ارسال حسابات</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#229ED9] text-white font-bold rounded-md">
                  اتصال
                </span>
              </button>
              <button
                type="button"
                id="sidebar-sub-support"
                onClick={() => setShowSupportModal(true)}
                className="w-full text-right py-1 px-2 text-xs text-slate-500 hover:text-[#2563EB] hover:bg-slate-50 rounded-lg transition-colors font-medium"
              >
                پشتیبانی فنی سیستم
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ---------------- 3. FOOTER BUTTONS (MATCHING EXACT SCREENSHOT) ---------------- */}
      <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
        {/* تغییر واحد شرکت (Bordered pill button) */}
        <button
          type="button"
          id="sidebar-btn-switch-branch"
          onClick={() => setShowBranchModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl border border-slate-200/90 text-[#2563EB] hover:bg-slate-50 transition-colors font-bold text-xs shadow-2xs cursor-pointer"
        >
          <Building2 className="w-4 h-4 text-[#2563EB]" />
          <span>تغییر واحد شرکت</span>
        </button>

        {/* خروج از سیستم (Red power button) */}
        <button
          type="button"
          id="sidebar-btn-logout"
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl text-rose-600 hover:bg-rose-50 transition-colors font-bold text-xs cursor-pointer"
        >
          <Power className="w-4 h-4 text-rose-600" />
          <span>خروج از سیستم</span>
        </button>
      </div>

      {/* ---------------- MODALS FOR SIDEBAR ACTIONS ---------------- */}
      {/* 1. Branch / Company Switcher Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Building2 className="w-6 h-6" />
              <h3 className="font-black text-slate-900 text-base">انتخاب واحد / شعبه شرکت</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              شما در حال حاضر در واحد اصلی «{companySettings.name || 'شرکت تجارتی برادران نبوی'}» قرار دارید.
            </p>
            <div className="space-y-2">
              <div className="p-3 rounded-xl border-2 border-blue-500 bg-blue-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">واحد مرکزی هرات و کابل</h4>
                  <span className="text-[10px] text-slate-500">کد واحد: 01 (فعال)</span>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  واحد جاری
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-70 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-700 text-xs">شعبه بندر اسلام‌قلعه و تورغندی</h4>
                  <span className="text-[10px] text-slate-400">کد واحد: 02 (ترانزیت)</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">همگام‌سازی ابری</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Technical Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Users className="w-6 h-6" />
              <h3 className="font-black text-slate-900 text-base">پشتیبانی فنی سیستم</h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">توسعه و پشتیبانی:</span>
                <span className="font-bold text-slate-800">تیم مهندسی نرم‌افزار واسعی</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">شماره تماس فوری:</span>
                <span className="font-bold font-mono text-blue-600">0794511271 / 0794006460</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نسخه سیستم:</span>
                <span className="font-bold font-mono text-emerald-600">V4.8.2 Enterprise</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">وضعیت پایگاه داده:</span>
                <span className="font-bold text-emerald-600">پایدار و متصل</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Production Process Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Factory className="w-6 h-6" />
              <h3 className="font-black text-slate-900 text-base">واحد فرآیند تولید و بسته‌بندی</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              بخش خط تولید، فرمولاسیون و بسته‌بندی آرد، گچ و کیسه‌گیری مجدد آماده اتصال به ماژول صنعتی شرکت است.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">• ثبت خودکار مصرف مواد اولیه در گدام مرکزی</p>
              <p className="font-bold">• محاسبه بهای تمام شده کیسه‌ها و ضایعات</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowProductionModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Power className="w-6 h-6" />
              <h3 className="font-black text-slate-900 text-base">خروج از سیستم</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا مایل به قفل کردن سیستم و خروج از حساب کاربری مدیر کل هستید؟ کلیه داده‌ها در سیستم محفوظ است.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
              >
                تایید و خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
