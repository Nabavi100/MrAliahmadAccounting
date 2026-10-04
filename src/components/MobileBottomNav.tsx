import React from 'react';
import { LayoutDashboard, ShoppingCart, HandCoins, TrendingUp, Menu, Plus } from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab, subFilter?: string) => void;
  onOpenMenu: () => void;
  onOpenQuickActions: () => void;
}

/**
 * Thumb-friendly bottom navigation for phones/tablets.
 * The sidebar remains available through the "منو" tab.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onNavigate,
  onOpenMenu,
  onOpenQuickActions,
}) => {
  const items: { id: string; label: string; icon: React.ReactNode; tab?: NavTab; filter?: string }[] = [
    { id: 'nav-dashboard', label: 'داشبورد', icon: <LayoutDashboard className="w-5 h-5" />, tab: 'dashboard' },
    { id: 'nav-trade', label: 'فاکتورها', icon: <ShoppingCart className="w-5 h-5" />, tab: 'trade_hub' },
    { id: 'nav-rp', label: 'دریافت/پرداخت', icon: <HandCoins className="w-5 h-5" />, tab: 'receipt_payment_hub' },
    { id: 'nav-reports', label: 'گزارش‌ها', icon: <TrendingUp className="w-5 h-5" />, tab: 'reports' },
  ];

  // A tab counts as active for its own screen and for every related sub-screen
  // (e.g. the invoice tab stays highlighted while creating a purchase invoice).
  const activeGroups: Record<string, NavTab[]> = {
    dashboard: ['dashboard'],
    trade_hub: ['trade_hub', 'invoices', 'sales_invoices', 'purchase_invoices', 'new_sale', 'new_purchase', 'return_sell', 'return_buy', 'new_return_sell', 'new_return_buy'],
    receipt_payment_hub: ['receipt_payment_hub', 'new_receipt', 'receipts_list', 'new_payment', 'payments_list'],
    reports: ['reports', 'journal', 'transactions'],
  };

  const isActive = (tab?: NavTab) => {
    if (!tab) return false;
    const group = activeGroups[String(tab)];
    if (!group) return activeTab === tab;
    return group.includes(activeTab) || activeTab === tab;
  };

  return (
    <nav
      id="app-mobile-bottom-nav"
      dir="rtl"
      aria-label="ناوبری سریع موبایل"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] app-safe-bottom app-no-tap-highlight"
    >
      <div className="relative flex items-stretch justify-between px-1 pt-1 pb-1">
        {items.slice(0, 2).map(item => (
          <button
            key={item.id}
            type="button"
            id={item.id}
            onClick={() => item.tab && onNavigate(item.tab, item.filter)}
            aria-current={isActive(item.tab) ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors cursor-pointer ${
              isActive(item.tab) ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}

        {/* Center quick-action button */}
        <div className="w-16 flex items-start justify-center">
          <button
            type="button"
            id="mobile-btn-quick-action"
            onClick={onOpenQuickActions}
            aria-label="عملیات سریع و جستجو"
            className="-mt-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 active:scale-95 transition-transform cursor-pointer border-4 border-white"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {items.slice(2).map(item => (
          <button
            key={item.id}
            type="button"
            id={item.id}
            onClick={() => item.tab && onNavigate(item.tab, item.filter)}
            aria-current={isActive(item.tab) ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors cursor-pointer ${
              isActive(item.tab) ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          id="mobile-btn-menu"
          onClick={onOpenMenu}
          aria-label="باز کردن منوی کامل"
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold">منو</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
