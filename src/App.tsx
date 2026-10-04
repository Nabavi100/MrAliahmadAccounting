import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { InvoiceType, PrintableDocumentPayload, Invoice } from './types';
import { LicenseStatusResult, verifyLicense } from './utils/licenseSecurity';
import { SecretLicenseModal } from './components/SecretLicenseModal';
import { LicenseWarningModal } from './components/LicenseWarningModal';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { startTelegramBotListener, stopTelegramBotListener } from './services/telegramBotService';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

/* -------------------------------------------------------------------------
 * Performance: every heavy workspace view is loaded on demand (code-split).
 * This keeps the first paint small — important on mobile networks — while the
 * Suspense fallback below shows a skeleton during the (cached) chunk fetch.
 * ------------------------------------------------------------------------- */
const lazyView = <T extends Record<string, any>, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  lazy(() => loader().then(m => ({ default: m[name] as React.ComponentType<any> })));

const DashboardView = lazyView(() => import('./components/DashboardView'), 'DashboardView');
const ComprehensiveJournalView = lazyView(() => import('./components/ComprehensiveJournalView'), 'ComprehensiveJournalView');
const TransactionsLedgerView = lazyView(() => import('./components/TransactionsLedgerView'), 'TransactionsLedgerView');
const TradeOperationsHubView = lazyView(() => import('./components/TradeOperationsHubView'), 'TradeOperationsHubView');
const ReceiptPaymentHubView = lazyView(() => import('./components/ReceiptPaymentHubView'), 'ReceiptPaymentHubView');
const InitialDefinitionsView = lazyView(() => import('./components/InitialDefinitionsView'), 'InitialDefinitionsView');
const WarehousesView = lazyView(() => import('./components/WarehousesView'), 'WarehousesView');
const CashAndExchangeView = lazyView(() => import('./components/CashAndExchangeView'), 'CashAndExchangeView');
const ProductsView = lazyView(() => import('./components/ProductsView'), 'ProductsView');
const CurrenciesView = lazyView(() => import('./components/CurrenciesView'), 'CurrenciesView');
const ExpensesView = lazyView(() => import('./components/ExpensesView'), 'ExpensesView');
const IncomesView = lazyView(() => import('./components/IncomesView'), 'IncomesView');
const ReportsView = lazyView(() => import('./components/ReportsView'), 'ReportsView');
const FixedAssetsView = lazyView(() => import('./components/FixedAssetsView'), 'FixedAssetsView');
const ShareholdersView = lazyView(() => import('./components/ShareholdersView'), 'ShareholdersView');
const AuditLogView = lazyView(() => import('./components/AuditLogView'), 'AuditLogView');
const TelegramManagementView = lazyView(() => import('./components/TelegramManagementView'), 'TelegramManagementView');
const TelegramBotModal = lazyView(() => import('./components/TelegramBotModal'), 'TelegramBotModal');
const DocumentPrintModal = lazyView(() => import('./components/DocumentPrintModal'), 'DocumentPrintModal');
const AccessAndResetModal = lazyView(() => import('./components/AccessAndResetModal'), 'AccessAndResetModal');
const PaymentModal = lazyView(() => import('./components/PaymentModal'), 'PaymentModal');
const StockTransferModal = lazyView(() => import('./components/StockTransferModal'), 'StockTransferModal');
const InvoiceDetailModal = lazyView(() => import('./components/InvoiceDetailModal'), 'InvoiceDetailModal');
const EditInvoiceModal = lazyView(() => import('./components/EditInvoiceModal'), 'EditInvoiceModal');

/** Skeleton shown while a workspace view chunk is being fetched. */
const ViewLoadingSkeleton: React.FC = () => (
  <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5" dir="rtl" aria-busy="true" aria-live="polite">
    <div className="flex items-center gap-3">
      <div className="app-skeleton w-10 h-10 rounded-xl" />
      <div className="space-y-2 flex-1">
        <div className="app-skeleton h-4 w-48 rounded-md" />
        <div className="app-skeleton h-3 w-72 rounded-md" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="app-skeleton h-3 w-24 rounded-md" />
          <div className="app-skeleton h-6 w-32 rounded-md" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="app-skeleton h-4 w-40 rounded-md" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="app-skeleton h-9 w-full rounded-lg" />
      ))}
    </div>
    <span className="sr-only">در حال بارگذاری…</span>
  </div>
);

const MainApp: React.FC = () => {
  const {
    invoices,
    parties,
    updateParty,
    notify,
    activePrintDoc,
    closePrintModal,
    openPrintModal,
    isAuthenticated,
    companySettings,
    logout,
  } = useAccounting();
  const LAST_TAB_KEY = 'hesabdar_last_active_tab_v1';
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem(LAST_TAB_KEY) as NavTab | null;
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [subFilter, setSubFilter] = useState<string>('all');

  // Always start a newly opened screen from the top instead of inheriting the
  // previous screen's scroll offset (jarring on long reports and lists).
  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;
    try {
      container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      container.scrollTop = 0;
    }
  }, [activeTab, subFilter]);

  // Remember the last visited screen so reopening the app (e.g. from a phone)
  // returns the user straight to where they left off.
  useEffect(() => {
    try {
      localStorage.setItem(LAST_TAB_KEY, activeTab);
    } catch {
      /* storage unavailable — non-critical */
    }
  }, [activeTab]);

  // The scrollable view container (reset on navigation so users always land at the top)
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

  // Navigation shell state: off-canvas sidebar drawer, command palette, shortcuts help
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const handleNavigate = React.useCallback((tab: NavTab, filter: string = 'all') => {
    setSubFilter(filter);
    setActiveTab(tab);
  }, []);

  // References for live Telegram Bot listener
  const partiesRef = React.useRef(parties);
  partiesRef.current = parties;
  const invoicesRef = React.useRef(invoices);
  invoicesRef.current = invoices;
  const companySettingsRef = React.useRef(companySettings);
  companySettingsRef.current = companySettings;

  // Background Telegram Bot Polling Listener for real-time customer /start & balance requests
  useEffect(() => {
    startTelegramBotListener({
      getParties: () => partiesRef.current,
      getInvoices: () => invoicesRef.current,
      getCompanySettings: () => companySettingsRef.current,
      onPartyLinked: (partyId, chatId, username) => {
        updateParty(partyId, {
          telegramChatId: chatId,
          telegramUsername: username,
          telegramLinkedAt: new Date().toISOString(),
          telegramLastInquiry: new Date().toISOString(),
        });
        const party = partiesRef.current.find(p => p.id === partyId);
        notify(
          'success',
          '📱 اتصال موفق مشتری به ربات تلگرام',
          `مشتری محترم «${party?.name || ''}» با شماره تماس ثبت‌شده در سیستم به ربات متصل گردید.`
        );
      },
      onNewLog: log => {
        if (log.type === 'inquiry') {
          notify('info', 'استعلام حساب از تلگرام', log.message);
        }
      },
    });

    return () => {
      stopTelegramBotListener();
    };
  }, [updateParty, notify]);

  // License Security & Expiration Management State
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult | null>(null);
  const [isSecretLicenseModalOpen, setIsSecretLicenseModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const refreshLicense = async () => {
    try {
      const res = await verifyLicense();
      setLicenseStatus(res);
      if (res.shouldShowDailyAlert || res.shouldShowHourlyAlert) {
        setIsWarningModalOpen(true);
      }
    } catch (e) {
      console.error('License check error:', e);
    }
  };

  useEffect(() => {
    refreshLicense();
    const interval = setInterval(refreshLicense, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-lock inactivity listener based on company settings
  useEffect(() => {
    if (!isAuthenticated) return;
    const timeoutMinutes = companySettings?.autoLockMinutes || 0;
    if (timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timerId: any = null;

    const performLock = () => {
      logout();
    };

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(performLock, timeoutMs);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    let lastReset = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle event checks to at most once per 1.5 seconds
      if (now - lastReset > 1500) {
        lastReset = now;
        resetTimer();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [isAuthenticated, companySettings?.autoLockMinutes, logout]);

  // Modals state
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [editingInvoiceGlobal, setEditingInvoiceGlobal] = useState<Invoice | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessModalInitialTab, setAccessModalInitialTab] = useState<
    'roles' | 'reset' | 'backup' | 'company' | 'telegram'
  >('roles');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<
    'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange'
  >('receive_payment');
  const [paymentPartyId, setPaymentPartyId] = useState<string | undefined>(undefined);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromWarehouseId, setTransferFromWarehouseId] = useState<string | undefined>(undefined);

  const [salesInitialType, setSalesInitialType] = useState<InvoiceType>('sell');
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string | undefined>(undefined);

  const handleSelectCashAccount = (accountId: string) => {
    setSelectedCashAccountId(accountId);
    setActiveTab('cash');
  };

  const handleOpenNewInvoice = (type: InvoiceType = 'sell') => {
    if (type === 'buy') {
      setActiveTab('new_purchase');
    } else if (type === 'return_sell') {
      setSubFilter('return_sell');
      setActiveTab('new_return_sell');
    } else if (type === 'return_buy') {
      setSubFilter('return_buy');
      setActiveTab('new_return_buy');
    } else {
      setActiveTab('new_sale');
    }
  };

  const handleOpenPaymentModal = (
    type: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange' = 'receive_payment',
    partyId?: string
  ) => {
    if (type === 'receive_payment') {
      setPaymentPartyId(partyId);
      setActiveTab('new_receipt');
    } else if (type === 'make_payment') {
      setPaymentPartyId(partyId);
      setActiveTab('new_payment');
    } else {
      setPaymentModalType(type);
      setPaymentPartyId(partyId);
      setIsPaymentModalOpen(true);
    }
  };

  const handleOpenTransferModal = (fromWarehouseId?: string) => {
    setTransferFromWarehouseId(fromWarehouseId);
    setIsTransferModalOpen(true);
  };

  const handleOpenAccessModal = (
    tab: 'roles' | 'reset' | 'backup' | 'company' | 'telegram' = 'roles'
  ) => {
    setAccessModalInitialTab(tab);
    setIsAccessModalOpen(true);
  };

  const handleViewInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setSelectedInvoiceForDetail(inv);
    }
  };

  // ---- Global keyboard shortcuts (Ctrl+K palette, Alt+<key> actions, …) ----
  useGlobalShortcuts({
    onTogglePalette: () => setIsCommandPaletteOpen(prev => !prev),
    onToggleSidebar: () => setIsSidebarOpen(prev => !prev),
    onNavigate: tab => {
      setSubFilter('all');
      setActiveTab(tab);
    },
    onNewSale: () => handleOpenNewInvoice('sell'),
    onNewPurchase: () => handleOpenNewInvoice('buy'),
    onNewReceipt: () => handleOpenPaymentModal('receive_payment'),
    onNewPayment: () => handleOpenPaymentModal('make_payment'),
    onTransfer: () => handleOpenTransferModal(),
    onManageUsers: () => handleOpenAccessModal('roles'),
    onShowHelp: () => setIsShortcutsOpen(true),
  });

  // Full Security Lock Screen if license is expired, tampered, or clock rolled back
  if (
    licenseStatus &&
    (!licenseStatus.isValid ||
      licenseStatus.isExpired ||
      licenseStatus.isTampered ||
      licenseStatus.isClockRolledBack)
  ) {
    return (
      <ErrorBoundary>
        <LicenseLockScreen
          status={licenseStatus}
          onActivated={refreshLicense}
          onOpenSecretModal={() => setIsSecretLicenseModalOpen(true)}
        />
        <SecretLicenseModal
          isOpen={isSecretLicenseModalOpen}
          onClose={() => setIsSecretLicenseModalOpen(false)}
          onLicenseUpdated={refreshLicense}
        />
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen />
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-800 font-sans overflow-hidden select-none" dir="rtl">
      {/* Sidebar with Hierarchical Submenus and Dynamic Theme/Style
          (docked on desktop, off-canvas drawer on phones/tablets) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subFilter={subFilter}
        setSubFilter={setSubFilter}
        onOpenNewInvoice={handleOpenNewInvoice}
        onOpenPaymentModal={handleOpenPaymentModal}
        onOpenTransferModal={handleOpenTransferModal}
        onOpenAccessModal={handleOpenAccessModal}
        onOpenTelegramModal={() => setActiveTab('telegram_manager')}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenNewInvoice={handleOpenNewInvoice}
          onOpenPaymentModal={handleOpenPaymentModal}
          onOpenAccessModal={handleOpenAccessModal}
          onOpenTelegramModal={() => setActiveTab('telegram_manager')}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onShowShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* View Body — bottom padding keeps content clear of the mobile tab bar */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto bg-slate-50 app-touch-scroll pb-24 lg:pb-0"
        >
          <ErrorBoundary onReset={() => setActiveTab('dashboard')}>
            <Suspense fallback={<ViewLoadingSkeleton />}>
            <div key={activeTab} className="app-view-enter">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <DashboardView
                setActiveTab={setActiveTab}
                setSubFilter={setSubFilter}
                onOpenNewInvoice={handleOpenNewInvoice}
                onOpenPaymentModal={handleOpenPaymentModal}
                onOpenTransferModal={handleOpenTransferModal}
                onViewInvoice={handleViewInvoice}
                onSelectCashAccount={handleSelectCashAccount}
              />
            )}

            {/* Comprehensive Journal / روزنامچه جامع رویدادها و تراکنش‌ها */}
            {activeTab === 'journal' && (
              <ComprehensiveJournalView
                onViewInvoice={handleViewInvoice}
                onOpenPaymentModal={handleOpenPaymentModal}
              />
            )}

            {/* Master Ledger */}
            {activeTab === 'transactions' && (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <TransactionsLedgerView
                  onViewInvoice={handleViewInvoice}
                  onOpenNewInvoice={handleOpenNewInvoice}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  onOpenTransferModal={handleOpenTransferModal}
                />
              </div>
            )}

            {/* TRADE OPERATIONS HUB (خرید، فروش، برگشت از خرید، برگشت از فروش) */}
            {(activeTab === 'trade_hub' ||
              activeTab === 'sales_invoices' ||
              activeTab === 'purchase_invoices' ||
              activeTab === 'new_sale' ||
              activeTab === 'new_purchase' ||
              activeTab === 'return_sell' ||
              activeTab === 'return_buy' ||
              activeTab === 'new_return_sell' ||
              activeTab === 'new_return_buy' ||
              activeTab === 'invoices') && (
              <TradeOperationsHubView
                key={`${activeTab}-${subFilter}`}
                initialType={
                  activeTab === 'new_return_sell' || activeTab === 'return_sell' || (activeTab === 'trade_hub' && subFilter === 'return_sell')
                    ? 'return_sell'
                    : activeTab === 'new_return_buy' || activeTab === 'return_buy' || (activeTab === 'trade_hub' && subFilter === 'return_buy')
                    ? 'return_buy'
                    : activeTab === 'new_purchase' || activeTab === 'purchase_invoices' || (activeTab === 'trade_hub' && subFilter === 'buy')
                    ? 'buy'
                    : 'sell'
                }
                initialViewMode={
                  activeTab === 'new_sale' || activeTab === 'new_purchase' || activeTab === 'new_return_sell' || activeTab === 'new_return_buy'
                    ? 'create'
                    : 'list'
                }
                onViewInvoice={handleViewInvoice}
                onOpenPaymentModal={handleOpenPaymentModal}
              />
            )}

          {/* RECEIPTS & PAYMENTS HUB (دریافت، لیست دریافتی‌ها، پرداخت، لیست پرداختی‌ها) */}
          {(activeTab === 'receipt_payment_hub' ||
            activeTab === 'receipts_list' ||
            activeTab === 'payments_list' ||
            activeTab === 'new_receipt' ||
            activeTab === 'new_payment') && (
            <ReceiptPaymentHubView
              initialTab={
                activeTab === 'new_receipt'
                  ? 'create_receipt'
                  : activeTab === 'new_payment'
                  ? 'create_payment'
                  : activeTab === 'payments_list'
                  ? 'list_payments'
                  : 'list_receipts'
              }
              initialPartyId={paymentPartyId}
              onViewInvoice={handleViewInvoice}
            />
          )}

          {/* Definitions / تعاریف اولیه یکپارچه */}
          {activeTab === 'definitions' && (
            <InitialDefinitionsView
              initialSubTab={
                subFilter === 'products'
                  ? 'products'
                  : subFilter === 'warehouses'
                  ? 'warehouses'
                  : subFilter === 'cash'
                  ? 'cash'
                  : subFilter === 'expenses'
                  ? 'expenses'
                  : subFilter === 'incomes'
                  ? 'incomes'
                  : subFilter === 'currencies'
                  ? 'currencies'
                  : subFilter === 'fixed_assets'
                  ? 'fixed_assets'
                  : subFilter === 'shareholders'
                  ? 'shareholders'
                  : 'parties'
              }
              onOpenPaymentModal={handleOpenPaymentModal}
              onViewInvoice={handleViewInvoice}
              onOpenTransferModal={handleOpenTransferModal}
            />
          )}

          {/* Parties / Customers */}
          {activeTab === 'customers' && (
            <InitialDefinitionsView
              initialSubTab="parties"
              initialGroupId={subFilter !== 'all' ? subFilter : undefined}
              onOpenPaymentModal={handleOpenPaymentModal}
              onViewInvoice={handleViewInvoice}
              onOpenTransferModal={handleOpenTransferModal}
            />
          )}

          {/* Warehouses */}
          {activeTab === 'warehouses' && (
            <WarehousesView
              onOpenTransferModal={handleOpenTransferModal}
              consignmentOnly={false}
              initialFilterType={subFilter === 'consignment' ? 'consignment' : 'all'}
            />
          )}

          {activeTab === 'consignment' && (
            <WarehousesView
              onOpenTransferModal={handleOpenTransferModal}
              consignmentOnly={true}
              initialFilterType="consignment"
            />
          )}

          {/* Cash & Bank */}
          {activeTab === 'cash' && (
            <CashAndExchangeView
              onOpenPaymentModal={handleOpenPaymentModal}
              initialSelectedAccountId={subFilter && subFilter !== 'all' ? subFilter : selectedCashAccountId}
            />
          )}

          {/* Products & Price list */}
          {activeTab === 'products' && <ProductsView onViewInvoice={handleViewInvoice} />}

          {/* Expenses */}
          {activeTab === 'expenses' && (
            <ExpensesView
              onOpenPaymentModal={handleOpenPaymentModal}
              autoOpenCreate={subFilter === 'create' || subFilter === 'new_expense'}
            />
          )}

          {/* Incomes */}
          {activeTab === 'incomes' && (
            <IncomesView
              onOpenPaymentModal={handleOpenPaymentModal}
              autoOpenCreate={subFilter === 'create' || subFilter === 'new_income'}
            />
          )}

          {/* Currencies */}
          {activeTab === 'currencies' && <CurrenciesView />}

          {/* Fixed Assets */}
          {activeTab === 'fixed_assets' && <FixedAssetsView />}

          {/* Shareholders */}
          {activeTab === 'shareholders' && <ShareholdersView />}

          {/* Reports */}
          {activeTab === 'reports' && (
            <ReportsView
              initialSection={subFilter}
              onViewInvoice={handleViewInvoice}
              onOpenPaymentModal={handleOpenPaymentModal}
              onOpenTransferModal={handleOpenTransferModal}
            />
          )}

          {/* Audit Log / دفتر ممیزی، امنیت و رویدادهای سیستم */}
          {activeTab === 'audit_log' && <AuditLogView />}

          {/* Telegram Management View / ماژول جامع مدیریت تلگرام */}
          {activeTab === 'telegram_manager' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              <TelegramManagementView />
            </div>
          )}
            </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom tab bar (phones / tablets only) */}
      <ErrorBoundary>
      <MobileBottomNav
        activeTab={activeTab}
        onNavigate={(tab, filter) => {
          setSubFilter(filter || 'all');
          setActiveTab(tab);
        }}
        onOpenMenu={() => setIsSidebarOpen(true)}
        onOpenQuickActions={() => setIsCommandPaletteOpen(true)}
      />

      {/* Global search & quick command palette (Ctrl/⌘ + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab, filter) => {
          setSubFilter(filter || 'all');
          setActiveTab(tab);
        }}
        onOpenNewInvoice={handleOpenNewInvoice}
        onOpenPaymentModal={handleOpenPaymentModal}
        onOpenTransferModal={handleOpenTransferModal}
        onOpenAccessModal={handleOpenAccessModal}
        onViewInvoice={handleViewInvoice}
        onShowShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Keyboard shortcut reference (Alt + H) */}
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </ErrorBoundary>

      {/* Notifications Toast */}
      <ToastContainer />

      {/* Invoice Detail Modal (Form Shik) */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForDetail}
        isOpen={!!selectedInvoiceForDetail}
        onClose={() => setSelectedInvoiceForDetail(null)}
        onPrint={inv => {
          setSelectedInvoiceForDetail(null);
          openPrintModal({
            type: 'invoice',
            invoice: inv,
          });
        }}
        onOpenPayment={(type, partyId) => {
          handleOpenPaymentModal(type, partyId);
        }}
        onEditInvoice={inv => {
          setSelectedInvoiceForDetail(null);
          setEditingInvoiceGlobal(inv);
        }}
      />

      {/* Global Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={!!editingInvoiceGlobal}
        invoice={editingInvoiceGlobal}
        onClose={() => setEditingInvoiceGlobal(null)}
      />

      {/* Lazily loaded dialogs — rendering nothing while their chunk arrives */}
      <Suspense fallback={null}>
      {/* Printing & Document Modal */}
      <DocumentPrintModal
        document={activePrintDoc}
        onClose={closePrintModal}
      />

      {/* Access Control & Reset Modal */}
      <AccessAndResetModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        initialTab={accessModalInitialTab}
      />

      {/* Quick Payment / Transfer Modal (fallback for quick modal actions) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPartyId(undefined);
        }}
        initialType={paymentModalType}
        initialPartyId={paymentPartyId}
      />

      {/* Warehouse Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferFromWarehouseId(undefined);
        }}
        initialFromWarehouseId={transferFromWarehouseId}
      />

      {/* License Warning Modal (Daily in last week / Hourly on last day) */}
      {licenseStatus && (
        <LicenseWarningModal
          status={licenseStatus}
          isOpen={isWarningModalOpen}
          onClose={() => setIsWarningModalOpen(false)}
          onActivated={refreshLicense}
          onOpenSecretModal={() => setIsSecretLicenseModalOpen(true)}
        />
      )}

      {/* Secret License Management Modal */}
      <SecretLicenseModal
        isOpen={isSecretLicenseModalOpen}
        onClose={() => setIsSecretLicenseModalOpen(false)}
        onLicenseUpdated={refreshLicense}
      />

      {/* Telegram Bot Settings Modal */}
      <TelegramBotModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AccountingProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </AccountingProvider>
    </ErrorBoundary>
  );
}
