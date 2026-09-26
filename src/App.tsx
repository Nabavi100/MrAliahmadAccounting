import React, { useState, useEffect } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SalesPurchaseView } from './components/SalesPurchaseView';
import { CustomersView } from './components/CustomersView';
import { InitialDefinitionsView } from './components/InitialDefinitionsView';
import { WarehousesView } from './components/WarehousesView';
import { CashAndExchangeView } from './components/CashAndExchangeView';
import { ProductsView } from './components/ProductsView';
import { CurrenciesView } from './components/CurrenciesView';
import { ExpensesView } from './components/ExpensesView';
import { IncomesView } from './components/IncomesView';
import { ReportsView } from './components/ReportsView';
import { DocumentPrintModal } from './components/DocumentPrintModal';
import { AccessAndResetModal } from './components/AccessAndResetModal';
import { PaymentModal } from './components/PaymentModal';
import { StockTransferModal } from './components/StockTransferModal';
import { InvoiceType, PrintableDocumentPayload, Invoice } from './types';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { EditInvoiceModal } from './components/EditInvoiceModal';
import { TransactionsLedgerView } from './components/TransactionsLedgerView';

import { FixedAssetsView } from './components/FixedAssetsView';
import { ShareholdersView } from './components/ShareholdersView';

// Dedicated standalone views
import { SalesInvoiceCreateView } from './components/SalesInvoiceCreateView';
import { SalesInvoicesListView } from './components/SalesInvoicesListView';
import { PurchaseInvoiceCreateView } from './components/PurchaseInvoiceCreateView';
import { PurchaseInvoicesListView } from './components/PurchaseInvoicesListView';
import { ReceiptCreateView } from './components/ReceiptCreateView';
import { ReceiptsListView } from './components/ReceiptsListView';
import { PaymentCreateView } from './components/PaymentCreateView';
import { PaymentsListView } from './components/PaymentsListView';
import { TradeOperationsHubView } from './components/TradeOperationsHubView';
import { ReceiptPaymentHubView } from './components/ReceiptPaymentHubView';
import { AuditLogView } from './components/AuditLogView';
import { ComprehensiveJournalView } from './components/ComprehensiveJournalView';
import { TelegramManagementView } from './components/TelegramManagementView';
import { TelegramBotModal } from './components/TelegramBotModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { LicenseStatusResult, verifyLicense } from './utils/licenseSecurity';
import { SecretLicenseModal } from './components/SecretLicenseModal';
import { LicenseWarningModal } from './components/LicenseWarningModal';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { startTelegramBotListener, stopTelegramBotListener } from './services/telegramBotService';

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
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [subFilter, setSubFilter] = useState<string>('all');

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
      {/* Sidebar with Hierarchical Submenus and Dynamic Theme/Style */}
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
        />

        {/* View Body */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <ErrorBoundary onReset={() => setActiveTab('dashboard')}>
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
          </ErrorBoundary>
        </main>
      </div>

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
