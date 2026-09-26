import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  Product,
  ProductCategory,
  Warehouse,
  StockInventory,
  Party,
  PartyGroup,
  Invoice,
  InvoiceType,
  FinancialTransaction,
  TransactionType,
  StockTransfer,
  CashRegisterState,
  CashRegisterAccount,
  AssetGroup,
  FixedAsset,
  Shareholder,
  Currency,
  CurrencyDefinition,
  Unit,
  AppUser,
  UserRole,
  PrintableDocumentPayload,
  CompanySettings,
  AppFontSize,
  JournalVoucher,
  JournalVoucherLine,
  TrialBalanceAccount,
  ProductProfitabilityAnalysis,
  LowStockAlertItem,
  ExpenseDefinition,
  AuditLogEntry,
  ConsignmentMovement,
} from '../types';
import {
  initialProducts,
  initialProductCategories,
  initialWarehouses,
  initialStocks,
  initialParties,
  initialPartyGroups,
  initialInvoices,
  initialTransactions,
  initialTransfers,
  initialConsignmentMovements,
  initialCashRegister,
  initialCashAccounts,
  initialAssetGroups,
  initialFixedAssets,
  initialShareholders,
  initialUsers,
  initialCompanySettings,
  initialCurrencies,
  initialExpenseCategories,
  initialExpenseDefinitions,
  initialExpenses,
  initialIncomeCategories,
  initialIncomes,
  initialJournalVouchers,
  initialAuditLogs,
} from '../data/initialData';
import { getCurrentTime, getPersianDate, getTodayDate } from '../utils/formatters';
import { ExpenseCategory, ExpenseItem, IncomeCategory, IncomeItem } from '../types';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
}

interface AccountingContextType {
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  resetCompanySettings: () => void;

  appFontSize: AppFontSize;
  setAppFontSize: (size: AppFontSize) => void;
  fontSizeNumber: number;
  setFontSizeNumber: (size: number) => void;

  products: Product[];
  productCategories: ProductCategory[];
  addProductCategory: (category: Omit<ProductCategory, 'id' | 'createdAt'>) => ProductCategory;
  updateProductCategory: (id: string, category: Partial<ProductCategory>) => void;
  deleteProductCategory: (id: string) => void;
  getNextProductCode: () => string;
  warehouses: Warehouse[];
  stocks: StockInventory[];
  parties: Party[];
  partyGroups: PartyGroup[];
  getNextPartyCode: () => string;
  invoices: Invoice[];
  transactions: FinancialTransaction[];
  transfers: StockTransfer[];
  cashRegister: CashRegisterState;

  // Expenses & Financial Categories (هزینه‌ها و امور مالی)
  expenses: ExpenseItem[];
  expenseCategories: ExpenseCategory[];
  expenseDefinitions: ExpenseDefinition[];
  createExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt' | 'expenseNumber'> & { expenseNumber?: string }) => ExpenseItem;
  updateExpense: (id: string, expense: Partial<ExpenseItem>) => void;
  deleteExpense: (id: string) => void;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'createdAt'>) => ExpenseCategory;
  updateExpenseCategory: (id: string, category: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  addExpenseDefinition: (definition: Omit<ExpenseDefinition, 'id'>) => ExpenseDefinition;
  updateExpenseDefinition: (id: string, definition: Partial<ExpenseDefinition>) => void;
  deleteExpenseDefinition: (id: string) => void;

  // Incomes & Secondary Revenues (عواید، فروش کیسه سیمان، پالت و درآمدهای جانبی)
  incomes: IncomeItem[];
  incomeCategories: IncomeCategory[];
  createIncome: (income: Omit<IncomeItem, 'id' | 'createdAt' | 'incomeNumber'>) => IncomeItem;
  updateIncome: (id: string, income: Partial<IncomeItem>) => void;
  deleteIncome: (id: string) => void;
  addIncomeCategory: (category: Omit<IncomeCategory, 'id' | 'createdAt'>) => IncomeCategory;
  updateIncomeCategory: (id: string, category: Partial<IncomeCategory>) => void;
  deleteIncomeCategory: (id: string) => void;
  getNextIncomeNumber: () => string;

  // Currencies & Exchange Management (اسعار و ارزها)
  currencies: CurrencyDefinition[];
  baseCurrency: CurrencyDefinition;
  setBaseCurrency: (currencyIdOrCode: string) => void;
  convertToBase: (amount: number, fromCurrencyCode: string) => number;
  addCurrency: (currency: Omit<CurrencyDefinition, 'id' | 'createdAt'>) => CurrencyDefinition;
  updateCurrency: (id: string, currency: Partial<CurrencyDefinition>) => void;
  deleteCurrency: (id: string) => void;
  getCurrencyByCode: (code: string) => CurrencyDefinition | undefined;

  // Cash Register Accounts (صندوق‌ها)
  cashAccounts: CashRegisterAccount[];
  addCashAccount: (account: Omit<CashRegisterAccount, 'id' | 'createdAt'>) => CashRegisterAccount;
  updateCashAccount: (id: string, account: Partial<CashRegisterAccount>) => void;
  deleteCashAccount: (id: string) => void;

  // Fixed Asset Groups & Assets (تجهیزات و دارایی‌های ثابت)
  assetGroups: AssetGroup[];
  addAssetGroup: (group: Omit<AssetGroup, 'id' | 'createdAt'>) => AssetGroup;
  updateAssetGroup: (id: string, group: Partial<AssetGroup>) => void;
  deleteAssetGroup: (id: string) => void;

  fixedAssets: FixedAsset[];
  addFixedAsset: (asset: Omit<FixedAsset, 'id' | 'createdAt'>) => FixedAsset;
  updateFixedAsset: (id: string, asset: Partial<FixedAsset>) => void;
  deleteFixedAsset: (id: string) => void;

  // Shareholders & Partners (امور سهامداران و شرکا)
  shareholders: Shareholder[];
  addShareholder: (sh: Omit<Shareholder, 'id' | 'createdAt' | 'sharePercentage'>) => Shareholder;
  updateShareholder: (id: string, sh: Partial<Shareholder>) => void;
  deleteShareholder: (id: string) => void;

  // Party Groups CRUD
  addPartyGroup: (group: Omit<PartyGroup, 'id' | 'createdAt'>) => PartyGroup;
  updatePartyGroup: (id: string, group: Partial<PartyGroup>) => void;
  deletePartyGroup: (id: string) => void;

  // Users & Access Roles & Security
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => AppUser;
  updateUser: (id: string, user: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  isAuthenticated: boolean;
  login: (usernameOrId: string, passwordAttempt: string) => { success: boolean; message?: string };
  logout: () => void;

  // Printing & Document Modal
  activePrintDoc: PrintableDocumentPayload | null;
  openPrintModal: (docOrType: any, maybeData?: any) => void;
  closePrintModal: () => void;

  // Document Management & Editing (همه اسناد با قابلیت ویرایش)
  getNextInvoiceNumber: (type: InvoiceType) => string;
  getNextTransactionNumber: (type: TransactionType) => string;
  getNextTransferNumber: () => string;
  getNextExpenseNumber: () => string;
  getNextConsignmentDocNumber: () => string;
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;

  createTransaction: (tx: Omit<FinancialTransaction, 'id' | 'createdAt'>) => FinancialTransaction;
  updateTransaction: (tx: FinancialTransaction) => void;
  deleteTransaction: (id: string) => void;

  createStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt'>) => StockTransfer;
  updateStockTransfer: (transfer: StockTransfer) => void;
  deleteStockTransfer: (id: string) => void;

  // Consignment Customer Tracking & Movements
  consignmentMovements: ConsignmentMovement[];
  createConsignmentMovement: (movement: Omit<ConsignmentMovement, 'id' | 'createdAt'>) => ConsignmentMovement;
  updateConsignmentMovement: (id: string, movement: Partial<ConsignmentMovement>) => void;
  deleteConsignmentMovement: (id: string) => void;
  getCustomerConsignmentBalances: (warehouseId?: string) => Array<{
    partyId: string;
    partyName: string;
    partyPhone?: string;
    totalInTons: number;
    totalInBags: number;
    totalOutTons: number;
    totalOutBags: number;
    remainingTons: number;
    remainingBags: number;
    products: Array<{
      productId: string;
      productName: string;
      totalInTons: number;
      totalInBags: number;
      totalOutTons: number;
      totalOutBags: number;
      remainingTons: number;
      remainingBags: number;
    }>;
  }>;

  addProduct: (product: Omit<Product, 'id' | 'bagsPerTon'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => Warehouse;
  updateWarehouse: (id: string, warehouse: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  addParty: (party: Omit<Party, 'id' | 'createdAt'>) => Party;
  updateParty: (id: string, party: Partial<Party>) => void;
  deleteParty: (id: string) => void;
  updateExchangeRate: (newRate: number) => void;
  updateCashBalances: (afn: number, usd: number, exchangeUsd?: number) => void;

  // Helpers
  getProductStock: (productId: string, warehouseId?: string) => { tons: number; bags: number };
  getWarehouseStockDetails: (warehouseId: string) => { product: Product; tons: number; bags: number }[];
  getPartySummary: (partyId: string) => {
    party: Party | undefined;
    invoices: Invoice[];
    transactions: FinancialTransaction[];
  };
  calculateTotalStockValue: () => { afnValue: number; usdValue: number; totalTons: number; totalBags: number };
  getLowStockAlerts: () => LowStockAlertItem[];
  
  // Audit Logs (ممیزی و ردیابی رویدادها)
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  clearAuditLogs: () => void;

  // Real-time user action notifications / toasts (پیام برای هر عملیه)
  notifications: ToastNotification[];
  notify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  removeNotification: (id: string) => void;

  // Data Reset & Backup
  resetToDemoData: () => void;
  resetNewFinancialYear: () => void;
  resetWipeCleanAll: () => void;
  exportJSON: () => string;
  importJSON: (jsonString: string) => boolean;
}

const LOCAL_STORAGE_KEY = 'AFGHAN_ACCOUNTING_DATA_V2';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[Storage Warning] Failed to persist key "${key}":`, err);
    // If quota exceeded and this is audit logs, clear them to free space
    if (key.includes('_audit_logs')) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }
};

const sanitizeAuditPayload = (obj: any): string => {
  if (!obj) return '';
  try {
    const raw = typeof obj === 'string' ? JSON.parse(obj) : obj;
    const clone = JSON.parse(JSON.stringify(raw));
    const truncateDeep = (target: any) => {
      if (!target || typeof target !== 'object') return;
      for (const k of Object.keys(target)) {
        if (typeof target[k] === 'string' && (target[k].startsWith('data:image') || target[k].length > 150)) {
          target[k] = `[داده تصویر/فایل باینری - ${target[k].substring(0, 24)}...]`;
        } else if (typeof target[k] === 'object') {
          truncateDeep(target[k]);
        }
      }
    };
    truncateDeep(clone);
    return JSON.stringify(clone, null, 2);
  } catch {
    return String(obj).substring(0, 150);
  }
};

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appFontSize, setAppFontSizeState] = useState<AppFontSize>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_fontsize') as AppFontSize | null;
    return saved && ['sm', 'md', 'lg', 'xl'].includes(saved) ? saved : 'md';
  });

  const setAppFontSize = (size: AppFontSize) => {
    setAppFontSizeState(size);
    safeSetItem(LOCAL_STORAGE_KEY + '_fontsize', size);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg', 'font-scale-xl');
    root.classList.add(`font-scale-${appFontSize}`);
  }, [appFontSize]);

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_company');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const nameVal = parsed?.name?.trim();
        const effectiveName = (!nameVal || nameVal === 'حسابداری پیشرفته تجارتی و گدام‌داری')
          ? 'شرکت تجارتی برادران نبوی'
          : nameVal;
        return {
          ...initialCompanySettings,
          ...parsed,
          name: effectiveName,
        };
      } catch (e) {
        return initialCompanySettings;
      }
    }
    return initialCompanySettings;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_users');
    if (saved) {
      try {
        const parsed: AppUser[] = JSON.parse(saved);
        return parsed.map(u => {
          const updated = { ...u };
          if (updated.id === 'usr-1') {
            updated.name = 'علی احمد نبوی';
            updated.phone = '0794006460';
          }
          if (!updated.password) {
            updated.password = '123';
          }
          return updated;
        });
      } catch (e) {
        return initialUsers;
      }
    }
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_current_user');
    if (saved) {
      try {
        const parsed: AppUser = JSON.parse(saved);
        if (parsed.id === 'usr-1') {
          return { ...parsed, name: 'علی احمد نبوی', phone: '0794006460', password: parsed.password || '123' };
        }
        return { ...parsed, password: parsed.password || '123' };
      } catch (e) {
        return initialUsers[0];
      }
    }
    return initialUsers[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Purge any legacy localStorage authentication flags so credentials are required when reopening
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY + '_is_authenticated');
    } catch {}

    // Require username and password whenever the application is closed and reopened.
    // In web browsers, sessionStorage is automatically deleted upon closing the tab/window.
    const savedSession = sessionStorage.getItem(LOCAL_STORAGE_KEY + '_auth_session');
    return savedSession === 'true';
  });

  const [activePrintDoc, setActivePrintDoc] = useState<PrintableDocumentPayload | null>(null);

  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_product_categories');
    return saved ? JSON.parse(saved) : initialProductCategories;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_warehouses');
    return saved ? JSON.parse(saved) : initialWarehouses;
  });

  const [stocks, setStocks] = useState<StockInventory[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_stocks');
    return saved ? JSON.parse(saved) : initialStocks;
  });

  const [parties, setParties] = useState<Party[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_parties');
    return saved ? JSON.parse(saved) : initialParties;
  });

  const [partyGroups, setPartyGroups] = useState<PartyGroup[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_party_groups');
    return saved ? JSON.parse(saved) : initialPartyGroups;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_transfers');
    return saved ? JSON.parse(saved) : initialTransfers;
  });

  const [currencies, setCurrencies] = useState<CurrencyDefinition[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_currencies');
    if (saved) {
      try {
        const parsed: CurrencyDefinition[] = JSON.parse(saved);
        if (!parsed.some(c => c.isBase)) {
          return parsed.map(c => (c.code === 'AFN' ? { ...c, isBase: true } : c));
        }
        return parsed;
      } catch (e) {
        return initialCurrencies;
      }
    }
    return initialCurrencies;
  });

  const [cashAccounts, setCashAccounts] = useState<CashRegisterAccount[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_cash_accounts');
    return saved ? JSON.parse(saved) : initialCashAccounts;
  });

  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_asset_groups');
    return saved ? JSON.parse(saved) : initialAssetGroups;
  });

  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_fixed_assets');
    return saved ? JSON.parse(saved) : initialFixedAssets;
  });

  const [shareholders, setShareholders] = useState<Shareholder[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_shareholders');
    return saved ? JSON.parse(saved) : initialShareholders;
  });

  const [cashRegister, setCashRegister] = useState<CashRegisterState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_cash');
    return saved ? JSON.parse(saved) : initialCashRegister;
  });

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_expense_categories');
    return saved ? JSON.parse(saved) : initialExpenseCategories;
  });

  const [expenseDefinitions, setExpenseDefinitions] = useState<ExpenseDefinition[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_expense_definitions');
    return saved ? JSON.parse(saved) : initialExpenseDefinitions;
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_income_categories');
    return saved ? JSON.parse(saved) : initialIncomeCategories;
  });

  const [incomes, setIncomes] = useState<IncomeItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_incomes');
    return saved ? JSON.parse(saved) : initialIncomes;
  });

  const [consignmentMovements, setConsignmentMovements] = useState<ConsignmentMovement[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_consignment_movements');
    return saved ? JSON.parse(saved) : initialConsignmentMovements;
  });

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_consignment_movements', JSON.stringify(consignmentMovements));
  }, [consignmentMovements]);

  const [fontSizeNumber, setFontSizeNumberState] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_fontsizenumber');
    return saved ? Number(saved) : 13;
  });

  const setFontSizeNumber = (num: number) => {
    setFontSizeNumberState(num);
    safeSetItem(LOCAL_STORAGE_KEY + '_fontsizenumber', String(num));
    document.documentElement.style.setProperty('--app-base-font-size', `${num}px`);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--app-base-font-size', `${fontSizeNumber}px`);
  }, [fontSizeNumber]);

  // Sync state changes with localStorage
  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_expense_definitions', JSON.stringify(expenseDefinitions));
  }, [expenseDefinitions]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_income_categories', JSON.stringify(incomeCategories));
  }, [incomeCategories]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_product_categories', JSON.stringify(productCategories));
  }, [productCategories]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_warehouses', JSON.stringify(warehouses));
  }, [warehouses]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_parties', JSON.stringify(parties));
  }, [parties]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_party_groups', JSON.stringify(partyGroups));
  }, [partyGroups]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_transfers', JSON.stringify(transfers));
  }, [transfers]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_currencies', JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_cash_accounts', JSON.stringify(cashAccounts));
  }, [cashAccounts]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_asset_groups', JSON.stringify(assetGroups));
  }, [assetGroups]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_fixed_assets', JSON.stringify(fixedAssets));
  }, [fixedAssets]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_shareholders', JSON.stringify(shareholders));
  }, [shareholders]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_company', JSON.stringify(companySettings));
    if (typeof document !== 'undefined') {
      document.title = companySettings.name || 'شرکت تجارتی برادران نبوی';
    }
  }, [companySettings]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_cash', JSON.stringify(cashRegister));
  }, [cashRegister]);

  // Audit Logs State (دفتر ثبت رویدادها و ممیزی سیستم)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse audit logs', e);
      }
    }
    return initialAuditLogs;
  });

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY + '_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    try {
      const newEntry: AuditLogEntry = {
        ...entry,
        id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: `${getPersianDate()} - ${getCurrentTime()}`,
        user: entry.user || currentUser?.name || 'مدیر سیستم',
        userRole: entry.userRole || currentUser?.role || 'admin',
        previousValue: entry.previousValue ? sanitizeAuditPayload(entry.previousValue) : undefined,
        newValue: entry.newValue ? sanitizeAuditPayload(entry.newValue) : undefined,
      };
      setAuditLogs(prev => [newEntry, ...prev.slice(0, 199)]);
    } catch (err) {
      console.warn('Failed to add audit log:', err);
    }
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY + '_audit_logs');
    } catch {}
  };

  // Real-time Notifications / Toast Messages (پیغام لحظه‌ای برای هر عملیه)
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const notify = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newNotif: ToastNotification = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Helper to determine if a deal type is a consignment transaction
  const isConsignmentDealType = (dealType?: string, dealTypeLabel?: string): boolean => {
    const dt = (dealType || dealTypeLabel || '').toLowerCase();
    return dt.includes('امانی') || dt.includes('consignment');
  };

  // Helper to find the appropriate consignment warehouse
  const getConsignmentWarehouse = (preferredId?: string, excludeWhId?: string): Warehouse => {
    if (preferredId) {
      const wh = warehouses.find(w => w.id === preferredId);
      if (wh) return wh;
    }
    const found =
      warehouses.find(
        w =>
          (w.type === 'consignment_in' ||
            w.type === 'consignment' ||
            w.id === 'wh-2' ||
            (w.code && w.code.toLowerCase().includes('consignment')) ||
            w.name.includes('امانی')) &&
          w.id !== excludeWhId
      ) ||
      warehouses.find(w => w.id === 'wh-2') ||
      warehouses.find(w => w.type !== 'standard' && w.id !== excludeWhId) ||
      warehouses[0];
    return found;
  };

  // Auto-reconcile consignment transfers & stock for any existing consignment invoices
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;

    const consignmentInvoices = invoices.filter(
      inv => (inv.type === 'sell' || inv.type === 'return_sell') && isConsignmentDealType(inv.dealType, inv.dealTypeLabel)
    );
    if (consignmentInvoices.length === 0) return;

    let missingTransfers: StockTransfer[] = [];
    let stocksToAdjust: { warehouseId: string; productId: string; deltaTons: number; deltaBags: number }[] = [];

    consignmentInvoices.forEach(inv => {
      const targetWh = getConsignmentWarehouse(inv.consignmentWarehouseId, inv.warehouseId);
      const targetWhId = targetWh?.id || 'wh-2';
      const targetWhName = targetWh?.name || 'گدام امانی';
      const sourceWh = warehouses.find(w => w.id === inv.warehouseId);

      const hasTransfer = transfers.some(t => t.id.startsWith(`trf-inv-${inv.id}`));
      if (!hasTransfer) {
        inv.items.forEach((item, idx) => {
          if (item.warehouseId !== targetWhId) {
            const isSale = inv.type === 'sell';
            const fromWhId = isSale ? item.warehouseId : targetWhId;
            const fromWhName = isSale ? (item.warehouseName || sourceWh?.name || 'گدام مبدا') : targetWhName;
            const toWhId = isSale ? targetWhId : item.warehouseId;
            const toWhName = isSale ? targetWhName : (item.warehouseName || sourceWh?.name || 'گدام مبدا');
            const actionText = isSale ? 'ارسال امانی' : 'برگشت کالای امانی';

            missingTransfers.push({
              id: `trf-inv-${inv.id}-${item.productId || idx}`,
              transferNumber: `TRF-${inv.invoiceNumber}-${idx + 1}`,
              date: inv.date,
              issueTime: inv.issueTime || '10:00',
              productId: item.productId,
              productName: item.productName,
              fromWarehouseId: fromWhId,
              fromWarehouseName: fromWhName,
              toWarehouseId: toWhId,
              toWarehouseName: toWhName,
              quantity: item.quantity,
              unit: item.unit,
              tonsCount: item.tonsCount,
              bagsCount: item.bagsCount,
              driverName: inv.driverName || (isSale ? 'ارسال به گدام امانی' : 'برگشت از گدام امانی'),
              carPlate: inv.carPlate || '',
              description: `${actionText} بابت فاکتور ${isSale ? 'فروش' : 'مرجوعی'} #${inv.invoiceNumber} به طرف‌حساب ${inv.partyName}`,
              notes: `همگام‌سازی خودکار انتقال گدام امانی از فاکتور #${inv.invoiceNumber}`,
              createdAt: inv.createdAt || new Date().toISOString(),
            });

            // Adjust stock in target consignment warehouse
            const deltaTons = isSale ? item.tonsCount : -item.tonsCount;
            const deltaBags = isSale ? item.bagsCount : -item.bagsCount;
            stocksToAdjust.push({
              warehouseId: targetWhId,
              productId: item.productId,
              deltaTons,
              deltaBags,
            });
          }
        });
      }
    });

    if (missingTransfers.length > 0) {
      setTransfers(prev => [...missingTransfers, ...prev]);
      setStocks(prev => {
        let updated = [...prev];
        stocksToAdjust.forEach(adj => {
          const idx = updated.findIndex(s => s.warehouseId === adj.warehouseId && s.productId === adj.productId);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              quantityTons: updated[idx].quantityTons + adj.deltaTons,
              quantityBags: updated[idx].quantityBags + adj.deltaBags,
            };
          } else {
            updated.push({
              warehouseId: adj.warehouseId,
              productId: adj.productId,
              quantityTons: adj.deltaTons,
              quantityBags: adj.deltaBags,
            });
          }
        });
        return updated;
      });
    }
  }, [invoices]);

  // Company Settings Handlers
  const updateCompanySettings = (newSettings: Partial<CompanySettings>) => {
    try {
      const prev = companySettings;
      const updated = { ...prev, ...newSettings };
      setCompanySettings(updated);

      setTimeout(() => {
        try {
          addAuditLog({
            action: 'settings_change',
            actionLabel: 'تغییر مشخصات شرکت',
            category: 'system',
            entityTitle: 'تنظیمات عمومی شرکت',
            details: `تغییر مشخصات یا تنظیمات شرکت به "${updated.name}"`,
            previousValue: sanitizeAuditPayload(prev),
            newValue: sanitizeAuditPayload(updated),
          });
        } catch (auditErr) {
          console.warn('Failed to record audit log for company settings:', auditErr);
        }
      }, 0);

      notify('success', 'تنظیمات شرکت با موفقیت به‌روزرسانی شد');
    } catch (err) {
      console.error('Failed to update company settings:', err);
      notify('error', 'خطا در اعمال تغییرات تنظیمات شرکت');
    }
  };

  const resetCompanySettings = () => {
    setCompanySettings(initialCompanySettings);
    notify('info', 'تنظیمات شرکت به حالت اولیه بازنشانی شد');
  };

  // Product Categories CRUD
  const addProductCategory = (catData: Omit<ProductCategory, 'id' | 'createdAt'>): ProductCategory => {
    const newCat: ProductCategory = {
      ...catData,
      id: 'cat-' + Date.now(),
      createdAt: getTodayDate(companySettings.calendarType),
    };
    setProductCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateProductCategory = (id: string, catData: Partial<ProductCategory>) => {
    setProductCategories(prev => prev.map(c => (c.id === id ? { ...c, ...catData } : c)));
    if (catData.name) {
      setProducts(prev =>
        prev.map(p => (p.categoryId === id ? { ...p, category: catData.name! } : p))
      );
    }
  };

  const deleteProductCategory = (id: string) => {
    setProductCategories(prev => prev.filter(c => c.id !== id));
  };

  // ================= AUTOMATIC SEQUENTIAL DOCUMENT NUMBER GENERATORS =================
  const issuedInvoiceNumbersRef = useRef<Record<string, number>>({});
  const issuedTransactionNumbersRef = useRef<Record<string, number>>({});
  const issuedExpenseNumbersRef = useRef<number>(0);
  const issuedPartyCodeRef = useRef<number>(0);
  const issuedTransferNumbersRef = useRef<number>(0);

  // 1. Invoices (Sales: INV-001 | Purchases: PUR-001 | Return Sales: SRT-001 | Return Purchases: PRT-001)
  const getNextInvoiceNumber = (type: InvoiceType): string => {
    try {
      let prefix = 'INV';
      if (type === 'buy') prefix = 'PUR';
      else if (type === 'return_sell') prefix = 'SRT';
      else if (type === 'return_buy') prefix = 'PRT';
      const relevant = (invoices || []).filter(i => i && i.type === type);
      let maxSequence = 0;

      relevant.forEach(inv => {
        if (!inv || !inv.invoiceNumber) return;
        const invNumStr = String(inv.invoiceNumber);
        const match = invNumStr.match(/(?:Inv|Pur|Srt|Prt|INV|PUR|SRT|PRT)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = invNumStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = Math.max(maxSequence, issuedInvoiceNumbersRef.current[type] || 0) + 1;
      issuedInvoiceNumbersRef.current[type] = nextVal;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating next invoice number:', err);
      const prefix = type === 'buy' ? 'PUR' : type === 'return_sell' ? 'SRT' : type === 'return_buy' ? 'PRT' : 'INV';
      return `${prefix}-001`;
    }
  };

  // 2. Financial Transactions (Receive: REC-001 | Pay: PAY-001 | Exchange: EXC-001 | General: TRX-001)
  const getNextTransactionNumber = (type: TransactionType): string => {
    try {
      let prefix = 'TRX';
      if (type === 'receive_payment') prefix = 'REC';
      else if (type === 'make_payment') prefix = 'PAY';
      else if (type === 'currency_exchange') prefix = 'EXC';

      const relevant = (transactions || []).filter(t => t && t.type === type);
      let maxSequence = 0;

      relevant.forEach(tx => {
        if (!tx || !tx.transactionNumber) return;
        const txNumStr = String(tx.transactionNumber);
        const match = txNumStr.match(/(?:Rec|Pay|Exc|Trx|REC|PAY|EXC|TRX)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = txNumStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = Math.max(maxSequence, issuedTransactionNumbersRef.current[type] || 0) + 1;
      issuedTransactionNumbersRef.current[type] = nextVal;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating transaction number:', err);
      return 'TRX-001';
    }
  };

  // 3. Products Code Generator (PRD-001, PRD-002...)
  const getNextProductCode = (): string => {
    try {
      const prefix = 'PRD';
      let maxSequence = 0;

      (products || []).forEach(p => {
        if (!p || !p.code) return;
        const codeStr = String(p.code);
        const match = codeStr.match(/(?:PRD|prod|Prod)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = codeStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = maxSequence + 1;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating product code:', err);
      return 'PRD-001';
    }
  };

  // 3.1 Party Code Generator (101, 102, 103...)
  const getNextPartyCode = (): string => {
    try {
      let maxVal = 0;
      (parties || []).forEach(p => {
        if (!p || !p.code) return;
        const numStr = String(p.code).replace(/\D/g, '');
        if (numStr) {
          const val = parseInt(numStr, 10);
          if (!isNaN(val) && val > maxVal) {
            maxVal = val;
          }
        }
      });
      const nextVal = Math.max(maxVal, issuedPartyCodeRef.current, 100) + 1;
      issuedPartyCodeRef.current = nextVal;
      return String(nextVal);
    } catch (err) {
      console.error('Error generating party code:', err);
      return '101';
    }
  };

  // 4. Stock Transfers (Warehouse transfer: TRF-001, TRF-002...)
  const getNextTransferNumber = (): string => {
    try {
      const prefix = 'TRF';
      let maxSequence = 0;

      (transfers || []).forEach(tr => {
        if (!tr || !tr.transferNumber) return;
        const trNumStr = String(tr.transferNumber);
        const match = trNumStr.match(/(?:Trf|TRF)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = trNumStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = Math.max(maxSequence, issuedTransferNumbersRef.current || 0) + 1;
      issuedTransferNumbersRef.current = nextVal;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating transfer number:', err);
      return 'TRF-001';
    }
  };

  // 5. Expenses (Expense voucher: EXP-001, EXP-002...)
  const getNextExpenseNumber = (): string => {
    try {
      const prefix = 'EXP';
      let maxSequence = 0;

      (expenses || []).forEach(ex => {
        if (!ex || !ex.expenseNumber) return;
        const exNumStr = String(ex.expenseNumber);
        const match = exNumStr.match(/(?:Exp|EXP)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = exNumStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = Math.max(maxSequence, issuedExpenseNumbersRef.current || 0) + 1;
      issuedExpenseNumbersRef.current = nextVal;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating expense number:', err);
      return 'EXP-001';
    }
  };

  // 6. Consignment Delivery Slips (CSG-001, CSG-002...)
  const getNextConsignmentDocNumber = (): string => {
    try {
      const prefix = 'CSG';
      let maxSequence = 0;

      (consignmentMovements || []).forEach(m => {
        if (!m || !m.documentNumber) return;
        const numStr = String(m.documentNumber);
        const match = numStr.match(/(?:Csg|CSG)?[-_]?(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        } else {
          const allDigits = numStr.replace(/\D/g, '');
          if (allDigits) {
            const val = parseInt(allDigits.slice(-4), 10);
            if (!isNaN(val) && val > maxSequence) {
              maxSequence = val;
            }
          }
        }
      });

      const nextVal = maxSequence + 1;
      return `${prefix}-${String(nextVal).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating consignment doc number:', err);
      return 'CSG-001';
    }
  };

  // Create Invoice (Buy / Sell)
  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const party = parties.find(p => p.id === invoiceData.partyId);
    const resolvedInvoiceNumber = (invoiceData.invoiceNumber || '').trim() || getNextInvoiceNumber(invoiceData.type);
    
    // Check if an invoice with this invoiceNumber and type already exists (prevent duplicate creation on repeated submit clicks)
    const existingSameInvoice = invoices.find(
      i => i.invoiceNumber.trim() === resolvedInvoiceNumber && i.type === invoiceData.type
    );

    if (existingSameInvoice) {
      const updatedInv: Invoice = {
        ...invoiceData,
        id: existingSameInvoice.id,
        invoiceNumber: resolvedInvoiceNumber,
        issueTime: invoiceData.issueTime || existingSameInvoice.issueTime || getCurrentTime(),
        partyPhone: invoiceData.partyPhone || party?.phone || '',
        partyAddress: invoiceData.partyAddress || party?.address || '',
        partyGroupName: invoiceData.partyGroupName || party?.groupName || '',
        createdAt: existingSameInvoice.createdAt,
      };
      updateInvoice(updatedInv);
      return updatedInv;
    }

    const newId = 'inv-' + Date.now();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: newId,
      invoiceNumber: resolvedInvoiceNumber,
      issueTime: invoiceData.issueTime || getCurrentTime(),
      partyPhone: invoiceData.partyPhone || party?.phone || '',
      partyAddress: invoiceData.partyAddress || party?.address || '',
      partyGroupName: invoiceData.partyGroupName || party?.groupName || '',
      createdAt: new Date().toISOString(),
    };

    // 1. Update Invoices list
    setInvoices(prev => [newInvoice, ...prev]);

    // 2. Update stock quantities & handle consignment warehouse movement
    const isWhConsignment = (whId?: string) => {
      if (!whId) return false;
      const w = warehouses.find(wh => wh.id === whId);
      return w ? (w.type !== 'standard' || w.id === 'wh-2' || (w.code && w.code.toLowerCase().includes('consignment')) || w.name.includes('امانی')) : false;
    };

    const hasExplicitConsignment = isConsignmentDealType(newInvoice.dealType, newInvoice.dealTypeLabel);
    const hasConsignmentWh = isWhConsignment(newInvoice.warehouseId) || isWhConsignment(newInvoice.consignmentWarehouseId);
    const isConsignment = hasExplicitConsignment || hasConsignmentWh;

    const targetConsignmentWh = isConsignment
      ? getConsignmentWarehouse(
          isWhConsignment(newInvoice.consignmentWarehouseId) ? newInvoice.consignmentWarehouseId : (isWhConsignment(newInvoice.warehouseId) ? newInvoice.warehouseId : undefined)
        )
      : null;
    const targetConsignmentWhId = targetConsignmentWh?.id || 'wh-2';

    // Standard central warehouse from which goods are physically drawn if selling on consignment
    const standardCompanyWh = warehouses.find(w => w.type === 'standard' && w.id !== targetConsignmentWhId) || warehouses[0];
    const defaultSourceWhId = standardCompanyWh?.id || 'wh-1';

    setStocks(prevStocks => {
      let updated = [...prevStocks];
      newInvoice.items.forEach(item => {
        const isStockIn = newInvoice.type === 'buy' || newInvoice.type === 'return_sell';

        if (isConsignment) {
          // In a sales consignment deal: goods are drawn from company standard warehouse and DEPOSITED into consignment warehouse
          const sourceWhId = (item.warehouseId && !isWhConsignment(item.warehouseId))
            ? item.warehouseId
            : (newInvoice.warehouseId && !isWhConsignment(newInvoice.warehouseId))
            ? newInvoice.warehouseId
            : defaultSourceWhId;

          // 1) Deduct/Add from source warehouse
          const sourceDeltaTons = isStockIn ? item.tonsCount : -item.tonsCount;
          const sourceDeltaBags = isStockIn ? item.bagsCount : -item.bagsCount;
          const sourceIdx = updated.findIndex(s => s.warehouseId === sourceWhId && s.productId === item.productId);
          if (sourceIdx >= 0) {
            updated[sourceIdx] = {
              ...updated[sourceIdx],
              quantityTons: Math.max(0, updated[sourceIdx].quantityTons + sourceDeltaTons),
              quantityBags: Math.max(0, updated[sourceIdx].quantityBags + sourceDeltaBags),
            };
          } else {
            updated.push({
              warehouseId: sourceWhId,
              productId: item.productId,
              quantityTons: Math.max(0, sourceDeltaTons),
              quantityBags: Math.max(0, sourceDeltaBags),
            });
          }

          // 2) Add/Deduct to target consignment warehouse
          const cDeltaTons = isStockIn ? -item.tonsCount : item.tonsCount;
          const cDeltaBags = isStockIn ? -item.bagsCount : item.bagsCount;
          const cIdx = updated.findIndex(s => s.warehouseId === targetConsignmentWhId && s.productId === item.productId);
          if (cIdx >= 0) {
            updated[cIdx] = {
              ...updated[cIdx],
              quantityTons: Math.max(0, updated[cIdx].quantityTons + cDeltaTons),
              quantityBags: Math.max(0, updated[cIdx].quantityBags + cDeltaBags),
            };
          } else {
            updated.push({
              warehouseId: targetConsignmentWhId,
              productId: item.productId,
              quantityTons: Math.max(0, cDeltaTons),
              quantityBags: Math.max(0, cDeltaBags),
            });
          }
        } else {
          // Standard ordinary invoice
          const deltaTons = isStockIn ? item.tonsCount : -item.tonsCount;
          const deltaBags = isStockIn ? item.bagsCount : -item.bagsCount;
          const targetWh = item.warehouseId || newInvoice.warehouseId || defaultSourceWhId;
          const existingIdx = updated.findIndex(s => s.warehouseId === targetWh && s.productId === item.productId);

          if (existingIdx >= 0) {
            const current = updated[existingIdx];
            updated[existingIdx] = {
              ...current,
              quantityTons: current.quantityTons + deltaTons,
              quantityBags: current.quantityBags + deltaBags,
            };
          } else {
            updated.push({
              warehouseId: targetWh,
              productId: item.productId,
              quantityTons: deltaTons,
              quantityBags: deltaBags,
            });
          }
        }
      });
      return updated;
    });

    // Auto-create StockTransfer and ConsignmentMovement records for consignment transactions
    if (isConsignment && targetConsignmentWhId) {
      const sourceWhId = (newInvoice.warehouseId && !isWhConsignment(newInvoice.warehouseId))
        ? newInvoice.warehouseId
        : defaultSourceWhId;
      const sourceWh = warehouses.find(w => w.id === sourceWhId);

      const autoTransfers: StockTransfer[] = newInvoice.items.map((item, idx) => {
        const isSale = newInvoice.type === 'sell';
        const fromWhId = isSale ? sourceWhId : targetConsignmentWhId;
        const fromWhName = isSale ? (sourceWh?.name || 'گدام مرکزی ملکی') : (targetConsignmentWh?.name || 'گدام امانی');
        const toWhId = isSale ? targetConsignmentWhId : sourceWhId;
        const toWhName = isSale ? (targetConsignmentWh?.name || 'گدام امانی') : (sourceWh?.name || 'گدام مرکزی ملکی');
        const actionText = isSale ? 'ارسال امانی' : 'برگشت کالای امانی';

        return {
          id: `trf-inv-${newId}-${item.productId || idx}`,
          transferNumber: `TRF-${resolvedInvoiceNumber}-${idx + 1}`,
          date: newInvoice.date,
          issueTime: newInvoice.issueTime || getCurrentTime(),
          productId: item.productId,
          productName: item.productName,
          fromWarehouseId: fromWhId,
          fromWarehouseName: fromWhName,
          toWarehouseId: toWhId,
          toWarehouseName: toWhName,
          quantity: item.quantity,
          unit: item.unit,
          tonsCount: item.tonsCount,
          bagsCount: item.bagsCount,
          driverName: newInvoice.driverName || (isSale ? 'ارسال به گدام امانی' : 'برگشت از گدام امانی'),
          carPlate: newInvoice.carPlate || '',
          description: `${actionText} بابت فاکتور ${isSale ? 'فروش' : 'مرجوعی'} #${resolvedInvoiceNumber} به طرف‌حساب ${newInvoice.partyName}`,
          notes: `ثبت خودکار انتقال به گدام امانی از فاکتور #${resolvedInvoiceNumber}`,
          createdAt: new Date().toISOString(),
        };
      });

      if (autoTransfers.length > 0) {
        setTransfers(prev => [...autoTransfers, ...prev]);
      }

      // Automatically register Consignment Movement per customer inside the consignment warehouse
      const autoConsignments: ConsignmentMovement[] = newInvoice.items.map((item, idx) => {
        const isSale = newInvoice.type === 'sell';
        return {
          id: `csg-inv-${newId}-${item.productId || idx}`,
          partyId: newInvoice.partyId,
          partyName: newInvoice.partyName,
          partyPhone: newInvoice.partyPhone || party?.phone,
          warehouseId: targetConsignmentWhId,
          warehouseName: targetConsignmentWh?.name || 'گدام امانی',
          productId: item.productId,
          productName: item.productName,
          date: newInvoice.date,
          issueTime: newInvoice.issueTime || getCurrentTime(),
          type: isSale ? 'deposit' : 'withdrawal',
          documentType: 'invoice',
          documentNumber: resolvedInvoiceNumber,
          quantityTons: item.tonsCount,
          quantityBags: item.bagsCount,
          driverName: newInvoice.driverName || (isSale ? 'تحویل به گدام امانی' : 'برگشت از گدام امانی'),
          carPlate: newInvoice.carPlate || '',
          notes: `واریز به گدام امانی از فاکتور ${isSale ? 'فروش' : 'مرجوعی'} #${resolvedInvoiceNumber} به نام «${newInvoice.partyName}»`,
          createdAt: new Date().toISOString(),
        };
      });

      if (autoConsignments.length > 0) {
        setConsignmentMovements(prev => [...autoConsignments, ...prev]);
      }
    }

    // 3. Update party balances
    if (newInvoice.partyId) {
      setParties(prevParties =>
        prevParties.map(party => {
          if (party.id !== newInvoice.partyId) return party;

          const remainingDue = newInvoice.balanceAmount;
          if (newInvoice.type === 'sell') {
            if (newInvoice.currency === 'AFN') {
              return { ...party, balanceAFN: party.balanceAFN - remainingDue };
            } else {
              return { ...party, balanceUSD: party.balanceUSD - remainingDue };
            }
          } else if (newInvoice.type === 'return_sell') {
            // Returning goods from sales decreases customer debt (or increases credit)
            if (newInvoice.currency === 'AFN') {
              return { ...party, balanceAFN: party.balanceAFN + remainingDue };
            } else {
              return { ...party, balanceUSD: party.balanceUSD + remainingDue };
            }
          } else if (newInvoice.type === 'buy') {
            if (newInvoice.currency === 'AFN') {
              return { ...party, balanceAFN: party.balanceAFN + remainingDue };
            } else {
              return { ...party, balanceUSD: party.balanceUSD + remainingDue };
            }
          } else if (newInvoice.type === 'return_buy') {
            // Returning goods to supplier reduces our payable to supplier
            if (newInvoice.currency === 'AFN') {
              return { ...party, balanceAFN: party.balanceAFN - remainingDue };
            } else {
              return { ...party, balanceUSD: party.balanceUSD - remainingDue };
            }
          }
          return party;
        })
      );
    }

    // 4. Update Cash Register & Cash Accounts and record Financial Transaction
    if (newInvoice.paidAmount > 0) {
      const reg = newInvoice.cashRegister || newInvoice.cashRegisterId || (newInvoice.currency === 'AFN' ? 'afn_cash' : 'usd_cash');
      const isCashIn = newInvoice.type === 'sell' || newInvoice.type === 'return_buy';
      const delta = isCashIn ? newInvoice.paidAmount : -newInvoice.paidAmount;

      setCashRegister(prev => {
        if (reg === 'afn_cash') {
          return { ...prev, afnBalance: Math.max(0, prev.afnBalance + delta) };
        } else if (reg === 'usd_cash') {
          return { ...prev, usdBalance: Math.max(0, prev.usdBalance + delta) };
        } else if (reg === 'exchange_usd_cash') {
          return { ...prev, exchangeUsdBalance: Math.max(0, (prev.exchangeUsdBalance || 0) + delta) };
        }
        return prev;
      });

      setCashAccounts(prev =>
        prev.map(acc => {
          if (acc.id === reg) {
            return { ...acc, balance: Math.max(0, acc.balance + delta) };
          }
          return acc;
        })
      );

      // Auto-create linked transaction in transactions register
      const txType: TransactionType = isCashIn ? 'receive_payment' : 'make_payment';
      const descPrefix =
        newInvoice.type === 'sell'
          ? `دریافت نقدی بابت فاکتور فروش #${resolvedInvoiceNumber}`
          : newInvoice.type === 'return_sell'
          ? `پرداخت نقدی مرجوعی فروش #${resolvedInvoiceNumber}`
          : newInvoice.type === 'buy'
          ? `پرداخت نقدی بابت فاکتور خرید #${resolvedInvoiceNumber}`
          : `دریافت نقدی استرداد خرید #${resolvedInvoiceNumber}`;

      const autoTx: FinancialTransaction = {
        id: 'tx-inv-' + newId,
        transactionNumber: getNextTransactionNumber(txType),
        date: newInvoice.date,
        issueTime: newInvoice.issueTime || getCurrentTime(),
        type: txType,
        partyId: newInvoice.partyId,
        partyName: newInvoice.partyName,
        partyPhone: newInvoice.partyPhone,
        partyAddress: newInvoice.partyAddress,
        amount: newInvoice.paidAmount,
        currency: newInvoice.currency,
        cashRegister: reg,
        description: descPrefix,
        invoiceId: newId,
        createdAt: new Date().toISOString(),
      };
      setTransactions(prev => [autoTx, ...prev]);
    }

    // Add Audit Log Entry
    const invTypeName = newInvoice.type === 'sell' ? 'فروش' : newInvoice.type === 'buy' ? 'خرید' : 'مرجوعی';
    addAuditLog({
      action: 'create',
      actionLabel: `ثبت فاکتور ${invTypeName}`,
      category: 'invoice',
      entityId: newId,
      entityNumber: resolvedInvoiceNumber,
      entityTitle: `فاکتور #${resolvedInvoiceNumber} (${newInvoice.partyName})`,
      details: `ثبت فاکتور ${invTypeName} به مبلغ کل ${(newInvoice.totalAmount || 0).toLocaleString()} ${newInvoice.currency} (رسید نقدی: ${newInvoice.paidAmount.toLocaleString()} ${newInvoice.currency})`,
      newValue: JSON.stringify(newInvoice, null, 2),
    });

    notify(
      'success',
      `فاکتور ${invTypeName} با موفقیت در سیستم ثبت گردید`,
      `شماره فاکتور: #${resolvedInvoiceNumber} • طرف حساب: ${newInvoice.partyName} • مبلغ: ${(newInvoice.totalAmount || 0).toLocaleString()} ${newInvoice.currency}`
    );

    return newInvoice;
  };

  // Update Invoice (Edit existing invoice)
  function updateInvoice(updatedInvoice: Invoice) {
    const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
    if (!oldInvoice) return;

    // 1. Revert old stock changes, apply new stock changes
    const oldIsConsignment = isConsignmentDealType(oldInvoice.dealType, oldInvoice.dealTypeLabel);
    const oldConsignmentWh = oldIsConsignment
      ? getConsignmentWarehouse(oldInvoice.consignmentWarehouseId, oldInvoice.warehouseId)
      : null;
    const oldConsignmentWhId = oldConsignmentWh?.id || 'wh-2';

    const newIsConsignment = isConsignmentDealType(updatedInvoice.dealType, updatedInvoice.dealTypeLabel);
    const newConsignmentWh = newIsConsignment
      ? getConsignmentWarehouse(updatedInvoice.consignmentWarehouseId, updatedInvoice.warehouseId)
      : null;
    const newConsignmentWhId = newConsignmentWh?.id || 'wh-2';

    setStocks(prevStocks => {
      let updated = [...prevStocks];
      // Revert old
      oldInvoice.items.forEach(item => {
        const idx = updated.findIndex(s => s.warehouseId === item.warehouseId && s.productId === item.productId);
        const deltaTons = oldInvoice.type === 'buy' ? -item.tonsCount : item.tonsCount;
        const deltaBags = oldInvoice.type === 'buy' ? -item.bagsCount : item.bagsCount;
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: Math.max(0, updated[idx].quantityTons + deltaTons),
            quantityBags: Math.max(0, updated[idx].quantityBags + deltaBags),
          };
        }

        if (oldIsConsignment && oldConsignmentWhId && oldConsignmentWhId !== item.warehouseId) {
          const cRevertDeltaTons = oldInvoice.type === 'sell' ? -item.tonsCount : item.tonsCount;
          const cRevertDeltaBags = oldInvoice.type === 'sell' ? -item.bagsCount : item.bagsCount;
          const cIdx = updated.findIndex(s => s.warehouseId === oldConsignmentWhId && s.productId === item.productId);
          if (cIdx >= 0) {
            updated[cIdx] = {
              ...updated[cIdx],
              quantityTons: Math.max(0, updated[cIdx].quantityTons + cRevertDeltaTons),
              quantityBags: Math.max(0, updated[cIdx].quantityBags + cRevertDeltaBags),
            };
          }
        }
      });

      // Apply new
      updatedInvoice.items.forEach(item => {
        const idx = updated.findIndex(s => s.warehouseId === item.warehouseId && s.productId === item.productId);
        const deltaTons = updatedInvoice.type === 'buy' ? item.tonsCount : -item.tonsCount;
        const deltaBags = updatedInvoice.type === 'buy' ? item.bagsCount : -item.bagsCount;
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: Math.max(0, updated[idx].quantityTons + deltaTons),
            quantityBags: Math.max(0, updated[idx].quantityBags + deltaBags),
          };
        } else if (updatedInvoice.type === 'buy') {
          updated.push({
            warehouseId: item.warehouseId,
            productId: item.productId,
            quantityTons: item.tonsCount,
            quantityBags: item.bagsCount,
          });
        }

        if (newIsConsignment && newConsignmentWhId && newConsignmentWhId !== item.warehouseId) {
          const cApplyDeltaTons = updatedInvoice.type === 'sell' ? item.tonsCount : -item.tonsCount;
          const cApplyDeltaBags = updatedInvoice.type === 'sell' ? item.bagsCount : -item.bagsCount;
          const cIdx = updated.findIndex(s => s.warehouseId === newConsignmentWhId && s.productId === item.productId);
          if (cIdx >= 0) {
            updated[cIdx] = {
              ...updated[cIdx],
              quantityTons: Math.max(0, updated[cIdx].quantityTons + cApplyDeltaTons),
              quantityBags: Math.max(0, updated[cIdx].quantityBags + cApplyDeltaBags),
            };
          } else {
            updated.push({
              warehouseId: newConsignmentWhId,
              productId: item.productId,
              quantityTons: cApplyDeltaTons,
              quantityBags: cApplyDeltaBags,
            });
          }
        }
      });
      return updated;
    });

    // Update transfers for consignment
    setTransfers(prev => {
      const filtered = prev.filter(t => !t.id.startsWith(`trf-inv-${updatedInvoice.id}`));
      if (!newIsConsignment || !newConsignmentWhId) return filtered;

      const sourceWh = warehouses.find(w => w.id === updatedInvoice.warehouseId);
      const autoTransfers: StockTransfer[] = updatedInvoice.items
        .filter(item => item.warehouseId !== newConsignmentWhId)
        .map((item, idx) => {
          const isSale = updatedInvoice.type === 'sell';
          const fromWhId = isSale ? item.warehouseId : newConsignmentWhId;
          const fromWhName = isSale ? (item.warehouseName || sourceWh?.name || 'گدام مبدا') : (newConsignmentWh?.name || 'گدام امانی');
          const toWhId = isSale ? newConsignmentWhId : item.warehouseId;
          const toWhName = isSale ? (newConsignmentWh?.name || 'گدام امانی') : (item.warehouseName || sourceWh?.name || 'گدام مبدا');
          const actionText = isSale ? 'ارسال امانی' : 'برگشت کالای امانی';

          return {
            id: `trf-inv-${updatedInvoice.id}-${item.productId || idx}`,
            transferNumber: `TRF-${updatedInvoice.invoiceNumber}-${idx + 1}`,
            date: updatedInvoice.date,
            issueTime: updatedInvoice.issueTime || getCurrentTime(),
            productId: item.productId,
            productName: item.productName,
            fromWarehouseId: fromWhId,
            fromWarehouseName: fromWhName,
            toWarehouseId: toWhId,
            toWarehouseName: toWhName,
            quantity: item.quantity,
            unit: item.unit,
            tonsCount: item.tonsCount,
            bagsCount: item.bagsCount,
            driverName: updatedInvoice.driverName || (isSale ? 'ارسال به گدام امانی' : 'برگشت از گدام امانی'),
            carPlate: updatedInvoice.carPlate || '',
            description: `${actionText} بابت فاکتور ${isSale ? 'فروش' : 'مرجوعی'} #${updatedInvoice.invoiceNumber} به طرف‌حساب ${updatedInvoice.partyName}`,
            notes: `ثبت خودکار انتقال به گدام امانی از فاکتور #${updatedInvoice.invoiceNumber}`,
            createdAt: new Date().toISOString(),
          };
        });

      return [...autoTransfers, ...filtered];
    });

    // 2. Revert old party balances, apply new
    setParties(prevParties =>
      prevParties.map(party => {
        let p = { ...party };
        if (p.id === oldInvoice.partyId) {
          const oldRem = oldInvoice.balanceAmount;
          if (oldInvoice.type === 'sell') {
            if (oldInvoice.currency === 'AFN') p.balanceAFN += oldRem;
            else p.balanceUSD += oldRem;
          } else {
            if (oldInvoice.currency === 'AFN') p.balanceAFN -= oldRem;
            else p.balanceUSD -= oldRem;
          }
        }
        if (p.id === updatedInvoice.partyId) {
          const newRem = updatedInvoice.balanceAmount;
          if (updatedInvoice.type === 'sell') {
            if (updatedInvoice.currency === 'AFN') p.balanceAFN -= newRem;
            else p.balanceUSD -= newRem;
          } else {
            if (updatedInvoice.currency === 'AFN') p.balanceAFN += newRem;
            else p.balanceUSD -= newRem;
          }
        }
        return p;
      })
    );

    // 3. Revert old cash, apply new cash
    const oldReg = oldInvoice.cashRegister || oldInvoice.cashRegisterId || (oldInvoice.currency === 'AFN' ? 'afn_cash' : 'usd_cash');
    const oldDelta = oldInvoice.type === 'sell' ? -oldInvoice.paidAmount : oldInvoice.paidAmount;
    const newReg = updatedInvoice.cashRegister || updatedInvoice.cashRegisterId || (updatedInvoice.currency === 'AFN' ? 'afn_cash' : 'usd_cash');
    const newDelta = updatedInvoice.type === 'sell' ? updatedInvoice.paidAmount : -updatedInvoice.paidAmount;

    setCashRegister(prev => {
      const next = { ...prev };
      if (oldInvoice.paidAmount > 0) {
        if (oldReg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance + oldDelta);
        else if (oldReg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance + oldDelta);
        else if (oldReg === 'exchange_usd_cash') next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) + oldDelta);
      }
      if (updatedInvoice.paidAmount > 0) {
        if (newReg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance + newDelta);
        else if (newReg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance + newDelta);
        else if (newReg === 'exchange_usd_cash') next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) + newDelta);
      }
      return next;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        let b = acc.balance;
        if (oldInvoice.paidAmount > 0 && acc.id === oldReg) b += oldDelta;
        if (updatedInvoice.paidAmount > 0 && acc.id === newReg) b += newDelta;
        return { ...acc, balance: Math.max(0, b) };
      })
    );

    // Update linked financial transaction in transactions list
    setTransactions(prev => {
      const filtered = prev.filter(t => t.invoiceId !== updatedInvoice.id && t.id !== 'tx-inv-' + updatedInvoice.id);
      if (updatedInvoice.paidAmount > 0) {
        const txType: TransactionType = updatedInvoice.type === 'sell' ? 'receive_payment' : 'make_payment';
        const autoTx: FinancialTransaction = {
          id: 'tx-inv-' + updatedInvoice.id,
          transactionNumber: getNextTransactionNumber(txType),
          date: updatedInvoice.date,
          issueTime: updatedInvoice.issueTime || getCurrentTime(),
          type: txType,
          partyId: updatedInvoice.partyId,
          partyName: updatedInvoice.partyName,
          partyPhone: updatedInvoice.partyPhone,
          partyAddress: updatedInvoice.partyAddress,
          amount: updatedInvoice.paidAmount,
          currency: updatedInvoice.currency,
          cashRegister: newReg,
          description:
            updatedInvoice.type === 'sell'
              ? `دریافت نقدی بابت فاکتور فروش #${updatedInvoice.invoiceNumber}`
              : `پرداخت نقدی بابت فاکتور خرید #${updatedInvoice.invoiceNumber}`,
          invoiceId: updatedInvoice.id,
          createdAt: new Date().toISOString(),
        };
        return [autoTx, ...filtered];
      }
      return filtered;
    });

    setInvoices(prev => prev.map(inv => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));

    // Add Audit Log Entry
    const invTypeName = updatedInvoice.type === 'sell' ? 'فروش' : updatedInvoice.type === 'buy' ? 'خرید' : 'مرجوعی';
    addAuditLog({
      action: 'update',
      actionLabel: `ویرایش فاکتور ${invTypeName}`,
      category: 'invoice',
      entityId: updatedInvoice.id,
      entityNumber: updatedInvoice.invoiceNumber,
      entityTitle: `فاکتور #${updatedInvoice.invoiceNumber} (${updatedInvoice.partyName})`,
      details: `ویرایش فاکتور ${invTypeName} شماره #${updatedInvoice.invoiceNumber}. مبلغ قبل: ${(oldInvoice.totalAmount || 0).toLocaleString()} ${oldInvoice.currency} -> مبلغ جدید: ${(updatedInvoice.totalAmount || 0).toLocaleString()} ${updatedInvoice.currency}`,
      previousValue: JSON.stringify(oldInvoice, null, 2),
      newValue: JSON.stringify(updatedInvoice, null, 2),
    });

    notify(
      'success',
      'فاکتور با موفقیت اصلاح شد',
      `فاکتور #${updatedInvoice.invoiceNumber} مربوط به ${updatedInvoice.partyName} به‌روزرسانی شد.`
    );
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      const invTypeName = inv.type === 'sell' ? 'فروش' : inv.type === 'buy' ? 'خرید' : 'مرجوعی';

      // Add Audit Log Entry for Deletion
      addAuditLog({
        action: 'delete',
        actionLabel: `حذف فاکتور ${invTypeName}`,
        category: 'invoice',
        entityId: inv.id,
        entityNumber: inv.invoiceNumber,
        entityTitle: `فاکتور #${inv.invoiceNumber} (${inv.partyName})`,
        details: `حذف فاکتور ${invTypeName} شماره #${inv.invoiceNumber} به مبلغ کل ${(inv.totalAmount || 0).toLocaleString()} ${inv.currency} و بازگردانی خودکار انبار و حساب شخص`,
        previousValue: JSON.stringify(inv, null, 2),
      });

      notify(
        'warning',
        'فاکتور از سیستم حذف شد',
        `فاکتور #${inv.invoiceNumber} حذف و موجودی گدام و مانده حساب طرف حساب اصلاح گردید.`
      );

      // Revert stock changes (including consignment warehouse)
      const isConsignment = isConsignmentDealType(inv.dealType, inv.dealTypeLabel);
      const consignmentWh = isConsignment
        ? getConsignmentWarehouse(inv.consignmentWarehouseId, inv.warehouseId)
        : null;
      const consignmentWhId = consignmentWh?.id || 'wh-2';

      setStocks(prevStocks => {
        let updated = [...prevStocks];
        inv.items.forEach(item => {
          const idx = updated.findIndex(s => s.warehouseId === item.warehouseId && s.productId === item.productId);
          const deltaTons = inv.type === 'buy' ? -item.tonsCount : item.tonsCount;
          const deltaBags = inv.type === 'buy' ? -item.bagsCount : item.bagsCount;
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              quantityTons: Math.max(0, updated[idx].quantityTons + deltaTons),
              quantityBags: Math.max(0, updated[idx].quantityBags + deltaBags),
            };
          }

          if (isConsignment && consignmentWhId && consignmentWhId !== item.warehouseId) {
            const cRevertDeltaTons = inv.type === 'sell' ? -item.tonsCount : item.tonsCount;
            const cRevertDeltaBags = inv.type === 'sell' ? -item.bagsCount : item.bagsCount;
            const cIdx = updated.findIndex(s => s.warehouseId === consignmentWhId && s.productId === item.productId);
            if (cIdx >= 0) {
              updated[cIdx] = {
                ...updated[cIdx],
                quantityTons: Math.max(0, updated[cIdx].quantityTons + cRevertDeltaTons),
                quantityBags: Math.max(0, updated[cIdx].quantityBags + cRevertDeltaBags),
              };
            }
          }
        });
        return updated;
      });

      // Remove linked consignment transfers
      setTransfers(prev => prev.filter(t => !t.id.startsWith(`trf-inv-${id}`)));

      // Revert party balances
      if (inv.partyId) {
        setParties(prevParties =>
          prevParties.map(party => {
            if (party.id !== inv.partyId) return party;
            const remainingDue = inv.balanceAmount;
            if (inv.type === 'sell') {
              return inv.currency === 'AFN'
                ? { ...party, balanceAFN: party.balanceAFN + remainingDue }
                : { ...party, balanceUSD: party.balanceUSD + remainingDue };
            } else {
              return inv.currency === 'AFN'
                ? { ...party, balanceAFN: party.balanceAFN - remainingDue }
                : { ...party, balanceUSD: party.balanceUSD - remainingDue };
            }
          })
        );
      }

      // Revert cash balances
      if (inv.paidAmount > 0) {
        const reg = inv.cashRegister || inv.cashRegisterId || (inv.currency === 'AFN' ? 'afn_cash' : 'usd_cash');
        const delta = inv.type === 'sell' ? -inv.paidAmount : inv.paidAmount;

        setCashRegister(prev => {
          const next = { ...prev };
          if (reg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance + delta);
          else if (reg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance + delta);
          else if (reg === 'exchange_usd_cash') next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) + delta);
          return next;
        });

        setCashAccounts(prev =>
          prev.map(acc => {
            if (acc.id === reg) {
              return { ...acc, balance: Math.max(0, acc.balance + delta) };
            }
            return acc;
          })
        );
      }

      // Remove linked financial transaction
      setTransactions(prev => prev.filter(t => t.invoiceId !== id && t.id !== 'tx-inv-' + id));

      // Remove linked consignment movements & transfers
      setConsignmentMovements(prev => prev.filter(c => !c.id.startsWith(`csg-inv-${id}`)));
      setTransfers(prev => prev.filter(t => !t.id.startsWith(`trf-inv-${id}`)));
    }

    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  // Create Financial Transaction (Receive money from debtor / Pay money to supplier / Exchange / Cash Transfer)
  const createTransaction = (txData: Omit<FinancialTransaction, 'id' | 'createdAt'>): FinancialTransaction => {
    const party = txData.partyId ? parties.find(p => p.id === txData.partyId) : undefined;
    const resolvedTxNumber = (txData.transactionNumber || '').trim() || getNextTransactionNumber(txData.type);

    // Prevent duplicate document creation on repeated submit clicks: if same number & type exists, update it instead
    const existingSameTx = transactions.find(
      t => t.transactionNumber.trim() === resolvedTxNumber && t.type === txData.type
    );
    if (existingSameTx) {
      const updatedTx: FinancialTransaction = {
        ...txData,
        id: existingSameTx.id,
        transactionNumber: resolvedTxNumber,
        issueTime: txData.issueTime || existingSameTx.issueTime || getCurrentTime(),
        partyPhone: txData.partyPhone || party?.phone || '',
        partyAddress: txData.partyAddress || party?.address || '',
        createdAt: existingSameTx.createdAt,
      };
      updateTransaction(updatedTx);
      return updatedTx;
    }

    const newId = 'tx-' + Date.now();
    const newTx: FinancialTransaction = {
      ...txData,
      id: newId,
      transactionNumber: resolvedTxNumber,
      issueTime: txData.issueTime || getCurrentTime(),
      partyPhone: txData.partyPhone || party?.phone || '',
      partyAddress: txData.partyAddress || party?.address || '',
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);

    // 1. Handle party balance modifications
    if (newTx.partyId) {
      setParties(prevParties =>
        prevParties.map(party => {
          if (party.id !== newTx.partyId) return party;

          if (newTx.type === 'receive_payment') {
            // Customer is paying back their debt: their balance increases (towards 0 or positive)
            if (newTx.currency === 'AFN') {
              const newBal = party.balanceAFN + newTx.amount;
              return { ...party, balanceAFN: Math.abs(newBal) < 0.0001 ? 0 : Number(newBal.toFixed(4)) };
            } else {
              const newBal = party.balanceUSD + newTx.amount;
              return { ...party, balanceUSD: Math.abs(newBal) < 0.0001 ? 0 : Number(newBal.toFixed(4)) };
            }
          } else if (newTx.type === 'make_payment') {
            // We are paying our supplier/debt: supplier credit balance decreases (towards 0)
            if (newTx.currency === 'AFN') {
              const newBal = party.balanceAFN - newTx.amount;
              return { ...party, balanceAFN: Math.abs(newBal) < 0.0001 ? 0 : Number(newBal.toFixed(4)) };
            } else {
              const newBal = party.balanceUSD - newTx.amount;
              return { ...party, balanceUSD: Math.abs(newBal) < 0.0001 ? 0 : Number(newBal.toFixed(4)) };
            }
          }
          return party;
        })
      );
    }

    // 2. Handle Cash Accounts & Cash Register
    const cashVal = newTx.isExchange && newTx.cashAmount ? newTx.cashAmount : newTx.amount;

    setCashRegister(prev => {
      const next = { ...prev, exchangeUsdBalance: prev.exchangeUsdBalance || 0 };

      const applyToRegister = (reg: typeof newTx.cashRegister, val: number) => {
        if (reg === 'afn_cash') {
          next.afnBalance = (next.afnBalance || 0) + val;
        } else if (reg === 'usd_cash') {
          next.usdBalance = (next.usdBalance || 0) + val;
        } else if (reg === 'exchange_usd_cash') {
          next.exchangeUsdBalance = (next.exchangeUsdBalance || 0) + val;
        }
      };

      if (newTx.type === 'receive_payment') {
        applyToRegister(newTx.cashRegister, cashVal);
      } else if (newTx.type === 'make_payment' || newTx.type === 'expense') {
        applyToRegister(newTx.cashRegister, -cashVal);
      } else if (newTx.type === 'currency_exchange') {
        const fromReg = newTx.fromCashRegister || (newTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
        const toReg = newTx.toCashRegister || (newTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
        applyToRegister(fromReg, -newTx.amount);
        applyToRegister(toReg, newTx.targetAmount || 0);
      } else if (newTx.type === 'cash_transfer') {
        if (newTx.fromCashRegister && newTx.toCashRegister) {
          applyToRegister(newTx.fromCashRegister, -newTx.amount);
          const toAmount = newTx.isExchange && newTx.targetAmount ? newTx.targetAmount : newTx.amount;
          applyToRegister(newTx.toCashRegister, toAmount);
        }
      }

      return next;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        if (newTx.type === 'receive_payment' && acc.id === newTx.cashRegister) {
          return { ...acc, balance: acc.balance + cashVal };
        } else if ((newTx.type === 'make_payment' || newTx.type === 'expense') && acc.id === newTx.cashRegister) {
          return { ...acc, balance: acc.balance - cashVal };
        } else if (newTx.type === 'currency_exchange') {
          const fromReg = newTx.fromCashRegister || (newTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
          const toReg = newTx.toCashRegister || (newTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
          if (acc.id === fromReg) {
            return { ...acc, balance: acc.balance - newTx.amount };
          }
          if (acc.id === toReg) {
            return { ...acc, balance: acc.balance + (newTx.targetAmount || 0) };
          }
        } else if (newTx.type === 'cash_transfer') {
          if (acc.id === newTx.fromCashRegister) {
            return { ...acc, balance: acc.balance - newTx.amount };
          }
          if (acc.id === newTx.toCashRegister) {
            const toAmount = newTx.isExchange && newTx.targetAmount ? newTx.targetAmount : newTx.amount;
            return { ...acc, balance: acc.balance + toAmount };
          }
        }
        return acc;
      })
    );

    // Add Audit Log Entry
    const txLabelMap: Record<string, string> = {
      receive_payment: 'دریافت وجه',
      make_payment: 'پرداخت وجه',
      currency_exchange: 'تبادله اسعار',
      cash_transfer: 'انتقال صندوق به صندوق',
      expense: 'هزینه و مصارف',
    };
    const txLabel = txLabelMap[newTx.type] || 'سند مالی';

    addAuditLog({
      action: newTx.type === 'cash_transfer' ? 'transfer' : 'create',
      actionLabel: `ثبت ${txLabel}`,
      category: 'transaction',
      entityId: newId,
      entityNumber: resolvedTxNumber,
      entityTitle: `${txLabel} #${resolvedTxNumber}`,
      details: `ثبت ${txLabel} به مبلغ ${newTx.amount.toLocaleString()} ${newTx.currency}${newTx.partyName ? ` • طرف حساب: ${newTx.partyName}` : ''}${newTx.description ? ` (${newTx.description})` : ''}`,
      newValue: JSON.stringify(newTx, null, 2),
    });

    notify(
      'success',
      `${txLabel} با موفقیت ثبت شد`,
      `شماره سند: #${resolvedTxNumber} • مبلغ: ${newTx.amount.toLocaleString()} ${newTx.currency}`
    );

    return newTx;
  };

  const deleteTransaction = (id: string) => {
    const oldTx = transactions.find(t => t.id === id);
    if (oldTx) {
      const txLabelMap: Record<string, string> = {
        receive_payment: 'دریافت وجه',
        make_payment: 'پرداخت وجه',
        currency_exchange: 'تبادله اسعار',
        cash_transfer: 'انتقال صندوق به صندوق',
        expense: 'هزینه و مصارف',
      };
      const txLabel = txLabelMap[oldTx.type] || 'سند مالی';

      // Add Audit Log
      addAuditLog({
        action: 'delete',
        actionLabel: `حذف ${txLabel}`,
        category: 'transaction',
        entityId: oldTx.id,
        entityNumber: oldTx.transactionNumber,
        entityTitle: `${txLabel} #${oldTx.transactionNumber}`,
        details: `حذف ${txLabel} شماره #${oldTx.transactionNumber} به مبلغ ${oldTx.amount.toLocaleString()} ${oldTx.currency} و بازگردانی خودکار موجودی حساب‌ها`,
        previousValue: JSON.stringify(oldTx, null, 2),
      });

      notify(
        'warning',
        `${txLabel} از سیستم حذف شد`,
        `سند #${oldTx.transactionNumber} حذف و موجودی صندوق‌ها و حساب‌ها اصلاح گردید.`
      );

      // 1. Revert party balance
      if (oldTx.partyId) {
        setParties(prevParties =>
          prevParties.map(party => {
            if (party.id !== oldTx.partyId) return party;
            let p = { ...party };
            if (oldTx.type === 'receive_payment') {
              if (oldTx.currency === 'AFN') {
                const nb = p.balanceAFN - oldTx.amount;
                p.balanceAFN = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
              } else {
                const nb = p.balanceUSD - oldTx.amount;
                p.balanceUSD = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
              }
            } else if (oldTx.type === 'make_payment') {
              if (oldTx.currency === 'AFN') {
                const nb = p.balanceAFN + oldTx.amount;
                p.balanceAFN = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
              } else {
                const nb = p.balanceUSD + oldTx.amount;
                p.balanceUSD = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
              }
            }
            return p;
          })
        );
      }

      // 2. Revert cash registers and accounts
      const oldCashVal = oldTx.isExchange && oldTx.cashAmount ? oldTx.cashAmount : oldTx.amount;
      setCashRegister(prev => {
        const next = { ...prev };
        const applyVal = (reg: any, val: number) => {
          if (reg === 'afn_cash') next.afnBalance = (next.afnBalance || 0) + val;
          else if (reg === 'usd_cash') next.usdBalance = (next.usdBalance || 0) + val;
          else if (reg === 'exchange_usd_cash') next.exchangeUsdBalance = (next.exchangeUsdBalance || 0) + val;
        };

        if (oldTx.type === 'receive_payment') applyVal(oldTx.cashRegister, -oldCashVal);
        else if (oldTx.type === 'make_payment' || oldTx.type === 'expense') applyVal(oldTx.cashRegister, oldCashVal);
        else if (oldTx.type === 'currency_exchange') {
          const fromReg = oldTx.fromCashRegister || (oldTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
          const toReg = oldTx.toCashRegister || (oldTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
          applyVal(fromReg, oldTx.amount);
          applyVal(toReg, -(oldTx.targetAmount || 0));
        } else if (oldTx.type === 'cash_transfer' && oldTx.fromCashRegister && oldTx.toCashRegister) {
          applyVal(oldTx.fromCashRegister, oldTx.amount);
          const oldTargetAmount = oldTx.isExchange && oldTx.targetAmount ? oldTx.targetAmount : oldTx.amount;
          applyVal(oldTx.toCashRegister, -oldTargetAmount);
        }

        return next;
      });

      setCashAccounts(prev =>
        prev.map(acc => {
          let b = acc.balance;
          if (oldTx.type === 'receive_payment' && acc.id === oldTx.cashRegister) b -= oldCashVal;
          else if ((oldTx.type === 'make_payment' || oldTx.type === 'expense') && acc.id === oldTx.cashRegister) b += oldCashVal;
          else if (oldTx.type === 'currency_exchange') {
            const fromReg = oldTx.fromCashRegister || (oldTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
            const toReg = oldTx.toCashRegister || (oldTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
            if (acc.id === fromReg) b += oldTx.amount;
            if (acc.id === toReg) b -= (oldTx.targetAmount || 0);
          } else if (oldTx.type === 'cash_transfer') {
            if (acc.id === oldTx.fromCashRegister) b += oldTx.amount;
            if (acc.id === oldTx.toCashRegister) {
              const oldTargetAmount = oldTx.isExchange && oldTx.targetAmount ? oldTx.targetAmount : oldTx.amount;
              b -= oldTargetAmount;
            }
          }
          return { ...acc, balance: b };
        })
      );
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Update Financial Transaction
  const updateTransaction = (updatedTx: FinancialTransaction) => {
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    // 1. Revert old party balance, apply new party balance
    setParties(prevParties =>
      prevParties.map(party => {
        let p = { ...party };
        // revert old
        if (party.id === oldTx.partyId) {
          if (oldTx.type === 'receive_payment') {
            if (oldTx.currency === 'AFN') p.balanceAFN -= oldTx.amount;
            else p.balanceUSD -= oldTx.amount;
          } else if (oldTx.type === 'make_payment') {
            if (oldTx.currency === 'AFN') p.balanceAFN += oldTx.amount;
            else p.balanceUSD += oldTx.amount;
          }
        }
        // apply new
        if (party.id === updatedTx.partyId) {
          if (updatedTx.type === 'receive_payment') {
            if (updatedTx.currency === 'AFN') {
              const nb = p.balanceAFN + updatedTx.amount;
              p.balanceAFN = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
            } else {
              const nb = p.balanceUSD + updatedTx.amount;
              p.balanceUSD = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
            }
          } else if (updatedTx.type === 'make_payment') {
            if (updatedTx.currency === 'AFN') {
              const nb = p.balanceAFN - updatedTx.amount;
              p.balanceAFN = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
            } else {
              const nb = p.balanceUSD - updatedTx.amount;
              p.balanceUSD = Math.abs(nb) < 0.0001 ? 0 : Number(nb.toFixed(4));
            }
          }
        }
        return p;
      })
    );

    // 2. Revert old cash registers & accounts, apply new
    const oldCashVal = oldTx.isExchange && oldTx.cashAmount ? oldTx.cashAmount : oldTx.amount;
    const newCashVal = updatedTx.isExchange && updatedTx.cashAmount ? updatedTx.cashAmount : updatedTx.amount;

    setCashRegister(prev => {
      const next = { ...prev };
      const applyVal = (reg: any, val: number) => {
        if (reg === 'afn_cash') next.afnBalance = (next.afnBalance || 0) + val;
        else if (reg === 'usd_cash') next.usdBalance = (next.usdBalance || 0) + val;
        else if (reg === 'exchange_usd_cash') next.exchangeUsdBalance = (next.exchangeUsdBalance || 0) + val;
      };

      // revert old
      if (oldTx.type === 'receive_payment') applyVal(oldTx.cashRegister, -oldCashVal);
      else if (oldTx.type === 'make_payment' || oldTx.type === 'expense') applyVal(oldTx.cashRegister, oldCashVal);
      else if (oldTx.type === 'currency_exchange') {
        const fromReg = oldTx.fromCashRegister || (oldTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
        const toReg = oldTx.toCashRegister || (oldTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
        applyVal(fromReg, oldTx.amount);
        applyVal(toReg, -(oldTx.targetAmount || 0));
      } else if (oldTx.type === 'cash_transfer' && oldTx.fromCashRegister && oldTx.toCashRegister) {
        applyVal(oldTx.fromCashRegister, oldTx.amount);
        const oldTargetAmount = oldTx.isExchange && oldTx.targetAmount ? oldTx.targetAmount : oldTx.amount;
        applyVal(oldTx.toCashRegister, -oldTargetAmount);
      }

      // apply new
      if (updatedTx.type === 'receive_payment') applyVal(updatedTx.cashRegister, newCashVal);
      else if (updatedTx.type === 'make_payment' || updatedTx.type === 'expense') applyVal(updatedTx.cashRegister, -newCashVal);
      else if (updatedTx.type === 'currency_exchange') {
        const fromReg = updatedTx.fromCashRegister || (updatedTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
        const toReg = updatedTx.toCashRegister || (updatedTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
        applyVal(fromReg, -updatedTx.amount);
        applyVal(toReg, updatedTx.targetAmount || 0);
      } else if (updatedTx.type === 'cash_transfer' && updatedTx.fromCashRegister && updatedTx.toCashRegister) {
        applyVal(updatedTx.fromCashRegister, -updatedTx.amount);
        const newTargetAmount = updatedTx.isExchange && updatedTx.targetAmount ? updatedTx.targetAmount : updatedTx.amount;
        applyVal(updatedTx.toCashRegister, newTargetAmount);
      }

      return next;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        let b = acc.balance;
        // revert old
        if (oldTx.type === 'receive_payment' && acc.id === oldTx.cashRegister) b -= oldCashVal;
        else if ((oldTx.type === 'make_payment' || oldTx.type === 'expense') && acc.id === oldTx.cashRegister) b += oldCashVal;
        else if (oldTx.type === 'currency_exchange') {
          const fromReg = oldTx.fromCashRegister || (oldTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
          const toReg = oldTx.toCashRegister || (oldTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
          if (acc.id === fromReg) b += oldTx.amount;
          if (acc.id === toReg) b -= (oldTx.targetAmount || 0);
        } else if (oldTx.type === 'cash_transfer') {
          if (acc.id === oldTx.fromCashRegister) b += oldTx.amount;
          if (acc.id === oldTx.toCashRegister) {
            const oldTargetAmount = oldTx.isExchange && oldTx.targetAmount ? oldTx.targetAmount : oldTx.amount;
            b -= oldTargetAmount;
          }
        }

        // apply new
        if (updatedTx.type === 'receive_payment' && acc.id === updatedTx.cashRegister) b += newCashVal;
        else if ((updatedTx.type === 'make_payment' || updatedTx.type === 'expense') && acc.id === updatedTx.cashRegister) b -= newCashVal;
        else if (updatedTx.type === 'currency_exchange') {
          const fromReg = updatedTx.fromCashRegister || (updatedTx.currency === 'USD' ? 'usd_cash' : 'afn_cash');
          const toReg = updatedTx.toCashRegister || (updatedTx.targetCurrency === 'USD' ? 'usd_cash' : 'afn_cash');
          if (acc.id === fromReg) b -= updatedTx.amount;
          if (acc.id === toReg) b += (updatedTx.targetAmount || 0);
        } else if (updatedTx.type === 'cash_transfer') {
          if (acc.id === updatedTx.fromCashRegister) b -= updatedTx.amount;
          if (acc.id === updatedTx.toCashRegister) {
            const newTargetAmount = updatedTx.isExchange && updatedTx.targetAmount ? updatedTx.targetAmount : updatedTx.amount;
            b += newTargetAmount;
          }
        }

        return { ...acc, balance: b };
      })
    );

    setTransactions(prev => prev.map(t => (t.id === updatedTx.id ? updatedTx : t)));

    // Add Audit Log
    const txLabelMap: Record<string, string> = {
      receive_payment: 'دریافت وجه',
      make_payment: 'پرداخت وجه',
      currency_exchange: 'تبادله اسعار',
      cash_transfer: 'انتقال صندوق به صندوق',
      expense: 'هزینه و مصارف',
    };
    const txLabel = txLabelMap[updatedTx.type] || 'سند مالی';

    addAuditLog({
      action: 'update',
      actionLabel: `ویرایش ${txLabel}`,
      category: 'transaction',
      entityId: updatedTx.id,
      entityNumber: updatedTx.transactionNumber,
      entityTitle: `${txLabel} #${updatedTx.transactionNumber}`,
      details: `ویرایش ${txLabel} شماره #${updatedTx.transactionNumber}. مبلغ قبل: ${oldTx.amount.toLocaleString()} ${oldTx.currency} -> مبلغ جدید: ${updatedTx.amount.toLocaleString()} ${updatedTx.currency}`,
      previousValue: JSON.stringify(oldTx, null, 2),
      newValue: JSON.stringify(updatedTx, null, 2),
    });

    notify(
      'success',
      `${txLabel} با موفقیت اصلاح گردید`,
      `سند شماره #${updatedTx.transactionNumber} به‌روزرسانی شد.`
    );
  };

  // Stock Transfer between warehouses
  const createStockTransfer = (transferData: Omit<StockTransfer, 'id' | 'createdAt'>): StockTransfer => {
    const newId = 'trf-' + Date.now();
    const resolvedTransferNumber = transferData.transferNumber || getNextTransferNumber();
    const newTransfer: StockTransfer = {
      ...transferData,
      id: newId,
      transferNumber: resolvedTransferNumber,
      createdAt: new Date().toISOString(),
    };

    setTransfers(prev => [newTransfer, ...prev]);

    // Update stocks
    setStocks(prevStocks => {
      let updated = [...prevStocks];

      // Decrease from source warehouse
      const sourceIdx = updated.findIndex(
        s => s.warehouseId === newTransfer.fromWarehouseId && s.productId === newTransfer.productId
      );
      if (sourceIdx >= 0) {
        const cur = updated[sourceIdx];
        updated[sourceIdx] = {
          ...cur,
          quantityTons: Math.max(0, cur.quantityTons - newTransfer.tonsCount),
          quantityBags: Math.max(0, cur.quantityBags - newTransfer.bagsCount),
        };
      }

      // Increase in target warehouse
      const targetIdx = updated.findIndex(
        s => s.warehouseId === newTransfer.toWarehouseId && s.productId === newTransfer.productId
      );
      if (targetIdx >= 0) {
        const cur = updated[targetIdx];
        updated[targetIdx] = {
          ...cur,
          quantityTons: cur.quantityTons + newTransfer.tonsCount,
          quantityBags: cur.quantityBags + newTransfer.bagsCount,
        };
      } else {
        updated.push({
          warehouseId: newTransfer.toWarehouseId,
          productId: newTransfer.productId,
          quantityTons: newTransfer.tonsCount,
          quantityBags: newTransfer.bagsCount,
        });
      }

      return updated;
    });

    return newTransfer;
  };

  const updateStockTransfer = (updatedTransfer: StockTransfer) => {
    const oldTransfer = transfers.find(t => t.id === updatedTransfer.id);
    if (!oldTransfer) return;

    setStocks(prevStocks => {
      let updated = [...prevStocks];
      // Revert old
      const oldSrcIdx = updated.findIndex(s => s.warehouseId === oldTransfer.fromWarehouseId && s.productId === oldTransfer.productId);
      if (oldSrcIdx >= 0) {
        updated[oldSrcIdx] = {
          ...updated[oldSrcIdx],
          quantityTons: updated[oldSrcIdx].quantityTons + oldTransfer.tonsCount,
          quantityBags: updated[oldSrcIdx].quantityBags + oldTransfer.bagsCount,
        };
      }
      const oldDstIdx = updated.findIndex(s => s.warehouseId === oldTransfer.toWarehouseId && s.productId === oldTransfer.productId);
      if (oldDstIdx >= 0) {
        updated[oldDstIdx] = {
          ...updated[oldDstIdx],
          quantityTons: Math.max(0, updated[oldDstIdx].quantityTons - oldTransfer.tonsCount),
          quantityBags: Math.max(0, updated[oldDstIdx].quantityBags - oldTransfer.bagsCount),
        };
      }

      // Apply new
      const newSrcIdx = updated.findIndex(s => s.warehouseId === updatedTransfer.fromWarehouseId && s.productId === updatedTransfer.productId);
      if (newSrcIdx >= 0) {
        updated[newSrcIdx] = {
          ...updated[newSrcIdx],
          quantityTons: Math.max(0, updated[newSrcIdx].quantityTons - updatedTransfer.tonsCount),
          quantityBags: Math.max(0, updated[newSrcIdx].quantityBags - updatedTransfer.bagsCount),
        };
      }
      const newDstIdx = updated.findIndex(s => s.warehouseId === updatedTransfer.toWarehouseId && s.productId === updatedTransfer.productId);
      if (newDstIdx >= 0) {
        updated[newDstIdx] = {
          ...updated[newDstIdx],
          quantityTons: updated[newDstIdx].quantityTons + updatedTransfer.tonsCount,
          quantityBags: updated[newDstIdx].quantityBags + updatedTransfer.bagsCount,
        };
      } else {
        updated.push({
          warehouseId: updatedTransfer.toWarehouseId,
          productId: updatedTransfer.productId,
          quantityTons: updatedTransfer.tonsCount,
          quantityBags: updatedTransfer.bagsCount,
        });
      }
      return updated;
    });

    setTransfers(prev => prev.map(t => (t.id === updatedTransfer.id ? updatedTransfer : t)));
  };

  const deleteStockTransfer = (id: string) => {
    const oldTransfer = transfers.find(t => t.id === id);
    if (oldTransfer) {
      setStocks(prevStocks => {
        let updated = [...prevStocks];
        // Revert source warehouse (add back transferred stock)
        const srcIdx = updated.findIndex(
          s => s.warehouseId === oldTransfer.fromWarehouseId && s.productId === oldTransfer.productId
        );
        if (srcIdx >= 0) {
          updated[srcIdx] = {
            ...updated[srcIdx],
            quantityTons: updated[srcIdx].quantityTons + oldTransfer.tonsCount,
            quantityBags: updated[srcIdx].quantityBags + oldTransfer.bagsCount,
          };
        }
        // Revert target warehouse (subtract transferred stock)
        const dstIdx = updated.findIndex(
          s => s.warehouseId === oldTransfer.toWarehouseId && s.productId === oldTransfer.productId
        );
        if (dstIdx >= 0) {
          updated[dstIdx] = {
            ...updated[dstIdx],
            quantityTons: Math.max(0, updated[dstIdx].quantityTons - oldTransfer.tonsCount),
            quantityBags: Math.max(0, updated[dstIdx].quantityBags - oldTransfer.bagsCount),
          };
        }
        return updated;
      });
    }
    setTransfers(prev => prev.filter(t => t.id !== id));
  };

  // ================= CONSIGNMENT MOVEMENTS & CUSTOMER LEDGER =================
  const createConsignmentMovement = (data: Omit<ConsignmentMovement, 'id' | 'createdAt'>): ConsignmentMovement => {
    const newId = 'csg-' + Date.now();
    const resolvedDocNumber = (data.documentNumber || '').trim() || getNextConsignmentDocNumber();
    
    // Calculate running balance after this movement for this customer & product
    const existingForCustomer = consignmentMovements.filter(
      m => (m.partyId === data.partyId || m.partyName === data.partyName) && m.productId === data.productId
    );
    let currentTons = 0;
    let currentBags = 0;
    existingForCustomer.forEach(m => {
      if (m.type === 'deposit') {
        currentTons += m.quantityTons;
        currentBags += m.quantityBags;
      } else {
        currentTons -= m.quantityTons;
        currentBags -= m.quantityBags;
      }
    });

    const isWithdrawal = data.type === 'withdrawal';
    const remainingTonsAfter = isWithdrawal ? Math.max(0, currentTons - data.quantityTons) : (currentTons + data.quantityTons);
    const remainingBagsAfter = isWithdrawal ? Math.max(0, currentBags - data.quantityBags) : (currentBags + data.quantityBags);

    const newMovement: ConsignmentMovement = {
      ...data,
      id: newId,
      documentNumber: resolvedDocNumber,
      remainingTonsAfter: Number(remainingTonsAfter.toFixed(3)),
      remainingBagsAfter: Math.round(remainingBagsAfter),
      createdAt: new Date().toISOString(),
    };

    // If withdrawal: deduct stock from warehouse
    if (isWithdrawal) {
      setStocks(prev => {
        let updated = [...prev];
        const idx = updated.findIndex(
          s => s.warehouseId === newMovement.warehouseId && s.productId === newMovement.productId
        );
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: Math.max(0, updated[idx].quantityTons - newMovement.quantityTons),
            quantityBags: Math.max(0, updated[idx].quantityBags - newMovement.quantityBags),
          };
        }
        return updated;
      });

      // Also create a StockTransfer record for company transfer audit
      const transferRecord: StockTransfer = {
        id: `trf-csg-out-${newId}`,
        transferNumber: `TRF-${resolvedDocNumber}`,
        date: newMovement.date,
        issueTime: newMovement.issueTime || getCurrentTime(),
        productId: newMovement.productId,
        productName: newMovement.productName,
        fromWarehouseId: newMovement.warehouseId,
        fromWarehouseName: newMovement.warehouseName || 'گدام امانی',
        toWarehouseId: 'customer-release',
        toWarehouseName: `تحویل به مشتری (${newMovement.partyName})`,
        quantity: newMovement.quantityTons,
        unit: 'ton',
        tonsCount: newMovement.quantityTons,
        bagsCount: newMovement.quantityBags,
        driverName: newMovement.driverName || 'تحویل‌گیرنده مشتری',
        carPlate: newMovement.carPlate || '',
        description: `سند خروجی و تحویل بار امانی #${resolvedDocNumber} به مشتری «${newMovement.partyName}» - موتروان: ${newMovement.driverName || '---'} (پلاک: ${newMovement.carPlate || '---'})`,
        notes: newMovement.notes,
        createdAt: new Date().toISOString(),
      };
      setTransfers(prev => [transferRecord, ...prev]);
    } else if (data.type === 'deposit') {
      // Deposit: increase warehouse stock if added manually
      setStocks(prev => {
        let updated = [...prev];
        const idx = updated.findIndex(
          s => s.warehouseId === newMovement.warehouseId && s.productId === newMovement.productId
        );
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: updated[idx].quantityTons + newMovement.quantityTons,
            quantityBags: updated[idx].quantityBags + newMovement.quantityBags,
          };
        } else {
          updated.push({
            warehouseId: newMovement.warehouseId,
            productId: newMovement.productId,
            quantityTons: newMovement.quantityTons,
            quantityBags: newMovement.quantityBags,
          });
        }
        return updated;
      });
    }

    setConsignmentMovements(prev => [newMovement, ...prev]);

    addAuditLog({
      action: isWithdrawal ? 'transfer' : 'create',
      actionLabel: isWithdrawal ? 'خروج کالای امانی' : 'ورود کالای امانی',
      category: 'transaction',
      entityId: newId,
      entityNumber: resolvedDocNumber,
      entityTitle: `${newMovement.partyName} - ${newMovement.productName}`,
      details: `${isWithdrawal ? 'سند خروجی و تحویل بار' : 'واریز کالای امانی'} #${resolvedDocNumber}: ${newMovement.quantityTons} تن (${newMovement.quantityBags} کیسه) مربوط به مشتری «${newMovement.partyName}»`,
      newValue: JSON.stringify(newMovement, null, 2),
    });

    notify(
      'success',
      isWithdrawal ? 'سند خروجی بار امانی با موفقیت ثبت شد' : 'کالای امانی با موفقیت در گدام ثبت شد',
      `سند #${resolvedDocNumber} - مقدار: ${newMovement.quantityTons} تن تحویل ${newMovement.partyName}`
    );

    return newMovement;
  };

  const deleteConsignmentMovement = (id: string) => {
    const item = consignmentMovements.find(m => m.id === id);
    if (!item) return;

    if (item.type === 'withdrawal') {
      // Restore stock
      setStocks(prev => {
        let updated = [...prev];
        const idx = updated.findIndex(s => s.warehouseId === item.warehouseId && s.productId === item.productId);
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: updated[idx].quantityTons + item.quantityTons,
            quantityBags: updated[idx].quantityBags + item.quantityBags,
          };
        }
        return updated;
      });
      setTransfers(prev => prev.filter(t => t.id !== `trf-csg-out-${id}`));
    } else if (item.type === 'deposit') {
      // Deduct stock
      setStocks(prev => {
        let updated = [...prev];
        const idx = updated.findIndex(s => s.warehouseId === item.warehouseId && s.productId === item.productId);
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            quantityTons: Math.max(0, updated[idx].quantityTons - item.quantityTons),
            quantityBags: Math.max(0, updated[idx].quantityBags - item.quantityBags),
          };
        }
        return updated;
      });
    }

    setConsignmentMovements(prev => prev.filter(m => m.id !== id));
    notify('warning', 'سند امانی حذف گردید', `سند #${item.documentNumber}`);
  };

  const updateConsignmentMovement = (id: string, updatedFields: Partial<ConsignmentMovement>) => {
    const oldMovement = consignmentMovements.find(m => m.id === id);
    if (!oldMovement) return;

    const newMovement: ConsignmentMovement = { ...oldMovement, ...updatedFields };

    // Adjust stocks if quantities or warehouse/product/type changed
    setStocks(prev => {
      let updated = [...prev];

      // Revert old movement stock impact
      const oldIdx = updated.findIndex(s => s.warehouseId === oldMovement.warehouseId && s.productId === oldMovement.productId);
      if (oldIdx >= 0) {
        const oldDeltaTons = oldMovement.type === 'deposit' ? -oldMovement.quantityTons : oldMovement.quantityTons;
        const oldDeltaBags = oldMovement.type === 'deposit' ? -oldMovement.quantityBags : oldMovement.quantityBags;
        updated[oldIdx] = {
          ...updated[oldIdx],
          quantityTons: Math.max(0, updated[oldIdx].quantityTons + oldDeltaTons),
          quantityBags: Math.max(0, updated[oldIdx].quantityBags + oldDeltaBags),
        };
      }

      // Apply new movement stock impact
      const newIdx = updated.findIndex(s => s.warehouseId === newMovement.warehouseId && s.productId === newMovement.productId);
      const newDeltaTons = newMovement.type === 'deposit' ? newMovement.quantityTons : -newMovement.quantityTons;
      const newDeltaBags = newMovement.type === 'deposit' ? newMovement.quantityBags : -newMovement.quantityBags;
      if (newIdx >= 0) {
        updated[newIdx] = {
          ...updated[newIdx],
          quantityTons: Math.max(0, updated[newIdx].quantityTons + newDeltaTons),
          quantityBags: Math.max(0, updated[newIdx].quantityBags + newDeltaBags),
        };
      } else {
        updated.push({
          warehouseId: newMovement.warehouseId,
          productId: newMovement.productId,
          quantityTons: Math.max(0, newDeltaTons),
          quantityBags: Math.max(0, newDeltaBags),
        });
      }

      return updated;
    });

    setConsignmentMovements(prev => prev.map(m => (m.id === id ? newMovement : m)));
    notify('success', 'سند امانی ویرایش شد', `سند #${newMovement.documentNumber} با موفقیت به‌روزرسانی شد.`);
  };

  const getCustomerConsignmentBalances = (warehouseId?: string) => {
    const relevantMovements = consignmentMovements.filter(m =>
      !warehouseId ? true : m.warehouseId === warehouseId
    );

    const customerMap = new Map<string, {
      partyId: string;
      partyName: string;
      partyPhone?: string;
      totalInTons: number;
      totalInBags: number;
      totalOutTons: number;
      totalOutBags: number;
      remainingTons: number;
      remainingBags: number;
      productsMap: Map<string, {
        productId: string;
        productName: string;
        totalInTons: number;
        totalInBags: number;
        totalOutTons: number;
        totalOutBags: number;
        remainingTons: number;
        remainingBags: number;
      }>;
    }>();

    relevantMovements.forEach(m => {
      const key = m.partyId || m.partyName;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          partyId: m.partyId || key,
          partyName: m.partyName || key,
          partyPhone: m.partyPhone,
          totalInTons: 0,
          totalInBags: 0,
          totalOutTons: 0,
          totalOutBags: 0,
          remainingTons: 0,
          remainingBags: 0,
          productsMap: new Map(),
        });
      }

      const cData = customerMap.get(key)!;
      if (!cData.partyPhone && m.partyPhone) cData.partyPhone = m.partyPhone;

      const isIn = m.type === 'deposit';
      if (isIn) {
        cData.totalInTons += m.quantityTons;
        cData.totalInBags += m.quantityBags;
        cData.remainingTons += m.quantityTons;
        cData.remainingBags += m.quantityBags;
      } else {
        cData.totalOutTons += m.quantityTons;
        cData.totalOutBags += m.quantityBags;
        cData.remainingTons = Math.max(0, cData.remainingTons - m.quantityTons);
        cData.remainingBags = Math.max(0, cData.remainingBags - m.quantityBags);
      }

      if (!cData.productsMap.has(m.productId)) {
        cData.productsMap.set(m.productId, {
          productId: m.productId,
          productName: m.productName,
          totalInTons: 0,
          totalInBags: 0,
          totalOutTons: 0,
          totalOutBags: 0,
          remainingTons: 0,
          remainingBags: 0,
        });
      }
      const prod = cData.productsMap.get(m.productId)!;
      if (isIn) {
        prod.totalInTons += m.quantityTons;
        prod.totalInBags += m.quantityBags;
        prod.remainingTons += m.quantityTons;
        prod.remainingBags += m.quantityBags;
      } else {
        prod.totalOutTons += m.quantityTons;
        prod.totalOutBags += m.quantityBags;
        prod.remainingTons = Math.max(0, prod.remainingTons - m.quantityTons);
        prod.remainingBags = Math.max(0, prod.remainingBags - m.quantityBags);
      }
    });

    return Array.from(customerMap.values()).map(c => ({
      partyId: c.partyId,
      partyName: c.partyName,
      partyPhone: c.partyPhone,
      totalInTons: Number(c.totalInTons.toFixed(3)),
      totalInBags: Math.round(c.totalInBags),
      totalOutTons: Number(c.totalOutTons.toFixed(3)),
      totalOutBags: Math.round(c.totalOutBags),
      remainingTons: Number(c.remainingTons.toFixed(3)),
      remainingBags: Math.round(c.remainingBags),
      products: Array.from(c.productsMap.values()).map(p => ({
        productId: p.productId,
        productName: p.productName,
        totalInTons: Number(p.totalInTons.toFixed(3)),
        totalInBags: Math.round(p.totalInBags),
        totalOutTons: Number(p.totalOutTons.toFixed(3)),
        totalOutBags: Math.round(p.totalOutBags),
        remainingTons: Number(p.remainingTons.toFixed(3)),
        remainingBags: Math.round(p.remainingBags),
      })),
    }));
  };

  // Products CRUD (with Opening Stock support)
  const addProduct = (productData: Omit<Product, 'id' | 'bagsPerTon'>): Product => {
    const bagsPerTon = 1000 / (productData.bagWeightKg || 50);
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      bagsPerTon,
    };
    setProducts(prev => [...prev, newProduct]);

    // Handle initial opening stock if specified
    if (newProduct.initialStockTons && newProduct.initialStockTons > 0 && newProduct.initialWarehouseId) {
      setStocks(prev => {
        const existingIdx = prev.findIndex(s => s.warehouseId === newProduct.initialWarehouseId && s.productId === newProduct.id);
        const tons = newProduct.initialStockTons || 0;
        const bags = newProduct.initialStockBags || Math.round(tons * bagsPerTon);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantityTons: updated[existingIdx].quantityTons + tons,
            quantityBags: updated[existingIdx].quantityBags + bags,
          };
          return updated;
        }
        return [...prev, {
          warehouseId: newProduct.initialWarehouseId!,
          productId: newProduct.id,
          quantityTons: tons,
          quantityBags: bags,
        }];
      });
    }

    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...productData };
        if (productData.bagWeightKg) {
          updated.bagsPerTon = 1000 / productData.bagWeightKg;
        }
        return updated;
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setStocks(prev => prev.filter(s => s.productId !== id));
  };

  // Expenses & Categories CRUD
  const addExpenseCategory = (categoryData: Omit<ExpenseCategory, 'id' | 'createdAt'>): ExpenseCategory => {
    const newCat: ExpenseCategory = {
      ...categoryData,
      id: 'exp-cat-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setExpenseCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateExpenseCategory = (id: string, categoryData: Partial<ExpenseCategory>) => {
    setExpenseCategories(prev => prev.map(c => (c.id === id ? { ...c, ...categoryData } : c)));
    if (categoryData.name) {
      setExpenses(prev => prev.map(e => (e.categoryId === id ? { ...e, categoryName: categoryData.name! } : e)));
    }
  };

  const deleteExpenseCategory = (id: string) => {
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
  };

  const addExpenseDefinition = (definitionData: Omit<ExpenseDefinition, 'id'>): ExpenseDefinition => {
    const newDef: ExpenseDefinition = {
      ...definitionData,
      id: 'ed-' + Date.now(),
    };
    setExpenseDefinitions(prev => [...prev, newDef]);
    return newDef;
  };

  const updateExpenseDefinition = (id: string, definitionData: Partial<ExpenseDefinition>) => {
    setExpenseDefinitions(prev => prev.map(d => (d.id === id ? { ...d, ...definitionData } : d)));
  };

  const deleteExpenseDefinition = (id: string) => {
    setExpenseDefinitions(prev => prev.filter(d => d.id !== id));
  };

  const createExpense = (expData: Omit<ExpenseItem, 'id' | 'createdAt' | 'expenseNumber'> & { expenseNumber?: string }): ExpenseItem => {
    const resolvedExpNumber = (expData.expenseNumber || '').trim() || getNextExpenseNumber();

    // Prevent duplicate document creation on repeated submit clicks
    const existingSameExpense = expenses.find(
      e => e.expenseNumber && e.expenseNumber.trim() === resolvedExpNumber
    );
    if (existingSameExpense) {
      updateExpense(existingSameExpense.id, {
        ...expData,
        expenseNumber: resolvedExpNumber,
      });
      return existingSameExpense;
    }

    const numMatch = resolvedExpNumber.match(/(?:Exp|EXP)?[-_]?(\d+)$/i);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      if (!isNaN(val)) issuedExpenseNumbersRef.current = Math.max(issuedExpenseNumbersRef.current, val);
    }

    const newId = 'exp-' + Date.now();
    const cat = expenseCategories.find(c => c.id === expData.categoryId);
    const cashAcc = cashAccounts.find(a => a.id === expData.cashRegisterId);

    const newExp: ExpenseItem = {
      ...expData,
      id: newId,
      expenseNumber: resolvedExpNumber,
      categoryName: expData.categoryName || cat?.name || 'مصارف عمومی',
      cashRegisterName: cashAcc?.name || (expData.cashRegisterId === 'usd_cash' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
      createdAt: new Date().toISOString(),
    };

    setExpenses(prev => [newExp, ...prev]);

    // Automatically deduct from cash register
    const reg = newExp.cashRegisterId || (newExp.currency === 'USD' ? 'usd_cash' : 'afn_cash');
    setCashRegister(prev => {
      if (reg === 'afn_cash') return { ...prev, afnBalance: Math.max(0, prev.afnBalance - newExp.amount) };
      if (reg === 'usd_cash') return { ...prev, usdBalance: Math.max(0, prev.usdBalance - newExp.amount) };
      if (reg === 'exchange_usd_cash') return { ...prev, exchangeUsdBalance: Math.max(0, (prev.exchangeUsdBalance || 0) - newExp.amount) };
      return prev;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        if (acc.id === reg) {
          return { ...acc, balance: Math.max(0, acc.balance - newExp.amount) };
        }
        return acc;
      })
    );

    return newExp;
  };

  const updateExpense = (id: string, expData: Partial<ExpenseItem>) => {
    const oldExp = expenses.find(e => e.id === id);
    if (!oldExp) return;

    const updatedExp: ExpenseItem = { ...oldExp, ...expData };

    // Revert old cash deduction and apply new cash deduction
    const oldReg = oldExp.cashRegisterId || (oldExp.currency === 'USD' ? 'usd_cash' : 'afn_cash');
    const newReg = updatedExp.cashRegisterId || (updatedExp.currency === 'USD' ? 'usd_cash' : 'afn_cash');

    setCashRegister(prev => {
      const next = { ...prev };
      // revert old
      if (oldReg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance + oldExp.amount);
      else if (oldReg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance + oldExp.amount);
      else if (oldReg === 'exchange_usd_cash') next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) + oldExp.amount);
      // apply new
      if (newReg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance - updatedExp.amount);
      else if (newReg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance - updatedExp.amount);
      else if (newReg === 'exchange_usd_cash') next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) - updatedExp.amount);
      return next;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        let b = acc.balance;
        if (acc.id === oldReg) b += oldExp.amount;
        if (acc.id === newReg) b -= updatedExp.amount;
        return { ...acc, balance: Math.max(0, b) };
      })
    );

    setExpenses(prev => prev.map(e => (e.id === id ? updatedExp : e)));
  };

  const deleteExpense = (id: string) => {
    const oldExp = expenses.find(e => e.id === id);
    if (oldExp) {
      const reg = oldExp.cashRegisterId || (oldExp.currency === 'USD' ? 'usd_cash' : 'afn_cash');
      setCashRegister(prev => {
        if (reg === 'afn_cash') return { ...prev, afnBalance: prev.afnBalance + oldExp.amount };
        if (reg === 'usd_cash') return { ...prev, usdBalance: prev.usdBalance + oldExp.amount };
        if (reg === 'exchange_usd_cash') return { ...prev, exchangeUsdBalance: (prev.exchangeUsdBalance || 0) + oldExp.amount };
        return prev;
      });
      setCashAccounts(prev =>
        prev.map(acc => {
          if (acc.id === reg) return { ...acc, balance: acc.balance + oldExp.amount };
          return acc;
        })
      );
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Incomes & Secondary Revenues CRUD (ثبت و مدیریت عواید، فروش کیسه سیمان، پالت و ...)
  const getNextIncomeNumber = (): string => {
    const prefix = 'INC';
    let maxSequence = 0;

    incomes.forEach(inc => {
      const match = (inc.incomeNumber || '').match(/(?:INC|Inc)?[-_]?(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSequence) {
          maxSequence = val;
        }
      } else {
        const allDigits = (inc.incomeNumber || '').replace(/\D/g, '');
        if (allDigits) {
          const val = parseInt(allDigits.slice(-4), 10);
          if (!isNaN(val) && val > maxSequence) {
            maxSequence = val;
          }
        }
      }
    });

    const nextVal = maxSequence + 1;
    return `${prefix}-${String(nextVal).padStart(3, '0')}`;
  };

  const addIncomeCategory = (categoryData: Omit<IncomeCategory, 'id' | 'createdAt'>): IncomeCategory => {
    const newCat: IncomeCategory = {
      ...categoryData,
      id: 'inc-cat-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setIncomeCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateIncomeCategory = (id: string, categoryData: Partial<IncomeCategory>) => {
    setIncomeCategories(prev => prev.map(c => (c.id === id ? { ...c, ...categoryData } : c)));
    if (categoryData.name) {
      setIncomes(prev =>
        prev.map(i => (i.categoryId === id ? { ...i, categoryName: categoryData.name! } : i))
      );
    }
  };

  const deleteIncomeCategory = (id: string) => {
    setIncomeCategories(prev => prev.filter(c => c.id !== id));
  };

  const createIncome = (incomeData: Omit<IncomeItem, 'id' | 'createdAt' | 'incomeNumber'>): IncomeItem => {
    const newId = 'inc-' + Date.now();
    const incNum = getNextIncomeNumber();
    const cat = incomeCategories.find(c => c.id === incomeData.categoryId);
    const cashAcc = cashAccounts.find(a => a.id === incomeData.cashRegisterId);

    const newIncome: IncomeItem = {
      ...incomeData,
      id: newId,
      incomeNumber: incNum,
      categoryName: incomeData.categoryName || cat?.name || 'عواید متفرقه',
      cashRegisterName:
        cashAcc?.name ||
        (incomeData.cashRegisterId === 'usd_cash'
          ? 'صندوق شرکت دالری'
          : incomeData.cashRegisterId === 'exchange_usd_cash'
          ? 'صندوق صرافی دالری'
          : 'صندوق پولی افغانی'),
      createdAt: new Date().toISOString(),
    };

    setIncomes(prev => [newIncome, ...prev]);

    // Automatically deposit into cash register and cash accounts
    const reg = newIncome.cashRegisterId || (newIncome.currency === 'USD' ? 'usd_cash' : 'afn_cash');
    setCashRegister(prev => {
      if (reg === 'afn_cash') return { ...prev, afnBalance: prev.afnBalance + newIncome.amount };
      if (reg === 'usd_cash') return { ...prev, usdBalance: prev.usdBalance + newIncome.amount };
      if (reg === 'exchange_usd_cash')
        return { ...prev, exchangeUsdBalance: (prev.exchangeUsdBalance || 0) + newIncome.amount };
      return prev;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        if (acc.id === reg) {
          return { ...acc, balance: acc.balance + newIncome.amount };
        }
        return acc;
      })
    );

    // Also record a FinancialTransaction for full cash register transparency & ledger visibility
    const incTx: FinancialTransaction = {
      id: 'tx-inc-' + newIncome.id,
      transactionNumber: 'TRX-INC-' + (newIncome.incomeNumber || '').replace(/[^0-9]/g, ''),
      type: 'receive_payment',
      date: newIncome.date,
      amount: newIncome.amount,
      currency: newIncome.currency,
      cashRegister: reg,
      partyName: newIncome.payer || ('عاید شرکت: ' + newIncome.title),
      description: `ثبت عاید شرکت: ${newIncome.title} (${newIncome.categoryName})` + (newIncome.notes ? ` - ${newIncome.notes}` : ''),
      createdAt: newIncome.createdAt,
    };
    setTransactions(prev => [incTx, ...prev]);

    // Add Audit Log
    addAuditLog({
      action: 'create',
      actionLabel: 'ثبت عاید شرکت',
      category: 'income',
      entityId: newIncome.id,
      entityNumber: newIncome.incomeNumber,
      entityTitle: `${newIncome.title} (${newIncome.incomeNumber})`,
      details: `ثبت عاید جدید شرکت به مبلغ ${newIncome.amount.toLocaleString()} ${newIncome.currency} در ${newIncome.cashRegisterName}`,
      newValue: JSON.stringify(newIncome, null, 2),
    });

    notify(
      'success',
      'عاید با موفقیت ثبت و به صندوق اضافه شد',
      `${newIncome.title} • ${newIncome.amount.toLocaleString()} ${newIncome.currency}`
    );

    return newIncome;
  };

  const updateIncome = (id: string, incData: Partial<IncomeItem>) => {
    const oldInc = incomes.find(i => i.id === id);
    if (!oldInc) return;

    const updatedInc: IncomeItem = { ...oldInc, ...incData };

    // Revert old cash addition and apply new cash addition
    const oldReg = oldInc.cashRegisterId || (oldInc.currency === 'USD' ? 'usd_cash' : 'afn_cash');
    const newReg = updatedInc.cashRegisterId || (updatedInc.currency === 'USD' ? 'usd_cash' : 'afn_cash');

    setCashRegister(prev => {
      const next = { ...prev };
      // revert old addition
      if (oldReg === 'afn_cash') next.afnBalance = Math.max(0, next.afnBalance - oldInc.amount);
      else if (oldReg === 'usd_cash') next.usdBalance = Math.max(0, next.usdBalance - oldInc.amount);
      else if (oldReg === 'exchange_usd_cash')
        next.exchangeUsdBalance = Math.max(0, (next.exchangeUsdBalance || 0) - oldInc.amount);

      // apply new addition
      if (newReg === 'afn_cash') next.afnBalance += updatedInc.amount;
      else if (newReg === 'usd_cash') next.usdBalance += updatedInc.amount;
      else if (newReg === 'exchange_usd_cash')
        next.exchangeUsdBalance = (next.exchangeUsdBalance || 0) + updatedInc.amount;

      return next;
    });

    setCashAccounts(prev =>
      prev.map(acc => {
        let b = acc.balance;
        if (acc.id === oldReg) b -= oldInc.amount;
        if (acc.id === newReg) b += updatedInc.amount;
        return { ...acc, balance: Math.max(0, b) };
      })
    );

    // Update synced transaction
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === 'tx-inc-' + id) {
          return {
            ...t,
            date: updatedInc.date,
            amount: updatedInc.amount,
            currency: updatedInc.currency,
            cashRegister: newReg,
            partyName: updatedInc.payer || ('عاید شرکت: ' + updatedInc.title),
            description: `ثبت عاید شرکت: ${updatedInc.title} (${updatedInc.categoryName})` + (updatedInc.notes ? ` - ${updatedInc.notes}` : ''),
          };
        }
        return t;
      })
    );

    setIncomes(prev => prev.map(i => (i.id === id ? updatedInc : i)));

    // Add Audit Log
    addAuditLog({
      action: 'update',
      actionLabel: 'ویرایش عاید شرکت',
      category: 'income',
      entityId: id,
      entityNumber: updatedInc.incomeNumber,
      entityTitle: `${updatedInc.title} (${updatedInc.incomeNumber})`,
      details: `ویرایش عاید شماره #${updatedInc.incomeNumber}. مبلغ قبل: ${oldInc.amount.toLocaleString()} ${oldInc.currency} -> مبلغ جدید: ${updatedInc.amount.toLocaleString()} ${updatedInc.currency}`,
      previousValue: JSON.stringify(oldInc, null, 2),
      newValue: JSON.stringify(updatedInc, null, 2),
    });

    notify('success', 'عاید با موفقیت اصلاح شد', updatedInc.title);
  };

  const deleteIncome = (id: string) => {
    const oldInc = incomes.find(i => i.id === id);
    if (oldInc) {
      addAuditLog({
        action: 'delete',
        actionLabel: 'حذف عاید شرکت',
        category: 'income',
        entityId: id,
        entityNumber: oldInc.incomeNumber,
        entityTitle: `${oldInc.title} (${oldInc.incomeNumber})`,
        details: `حذف عاید شماره #${oldInc.incomeNumber} به مبلغ ${oldInc.amount.toLocaleString()} ${oldInc.currency} و کسر خودکار از موجودی صندوق`,
        previousValue: JSON.stringify(oldInc, null, 2),
      });

      notify('warning', 'عاید از سیستم حذف شد', `${oldInc.title} (${oldInc.incomeNumber})`);

      const reg = oldInc.cashRegisterId || (oldInc.currency === 'USD' ? 'usd_cash' : 'afn_cash');
      setCashRegister(prev => {
        if (reg === 'afn_cash') return { ...prev, afnBalance: Math.max(0, prev.afnBalance - oldInc.amount) };
        if (reg === 'usd_cash') return { ...prev, usdBalance: Math.max(0, prev.usdBalance - oldInc.amount) };
        if (reg === 'exchange_usd_cash')
          return { ...prev, exchangeUsdBalance: Math.max(0, (prev.exchangeUsdBalance || 0) - oldInc.amount) };
        return prev;
      });
      setCashAccounts(prev =>
        prev.map(acc => {
          if (acc.id === reg) return { ...acc, balance: Math.max(0, acc.balance - oldInc.amount) };
          return acc;
        })
      );
      // Remove synced transaction
      setTransactions(prev => prev.filter(t => t.id !== 'tx-inc-' + id));
    }
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  // Warehouses CRUD
  const addWarehouse = (whData: Omit<Warehouse, 'id'>): Warehouse => {
    const newWh: Warehouse = {
      ...whData,
      id: 'wh-' + Date.now(),
    };
    setWarehouses(prev => [...prev, newWh]);
    return newWh;
  };

  const updateWarehouse = (id: string, whData: Partial<Warehouse>) => {
    setWarehouses(prev => prev.map(w => (w.id === id ? { ...w, ...whData } : w)));
  };

  const deleteWarehouse = (id: string) => {
    setWarehouses(prev => prev.filter(w => w.id !== id));
    // Also remove stock inventory records associated with this warehouse
    setStocks(prev => prev.filter(s => s.warehouseId !== id));
  };

  // Parties & Groups CRUD
  const addPartyGroup = (groupData: Omit<PartyGroup, 'id' | 'createdAt'>): PartyGroup => {
    const newGroup: PartyGroup = {
      ...groupData,
      id: 'grp-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setPartyGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updatePartyGroup = (id: string, groupData: Partial<PartyGroup>) => {
    setPartyGroups(prev => prev.map(g => (g.id === id ? { ...g, ...groupData } : g)));
    // Also sync party names if group name changed
    if (groupData.name) {
      setParties(prev =>
        prev.map(p => (p.groupId === id ? { ...p, groupName: groupData.name } : p))
      );
    }
  };

  const deletePartyGroup = (id: string) => {
    setPartyGroups(prev => prev.filter(g => g.id !== id));
    // Remove group association from parties
    setParties(prev =>
      prev.map(p => (p.groupId === id ? { ...p, groupId: undefined, groupName: undefined } : p))
    );
  };

  const addParty = (partyData: Omit<Party, 'id' | 'createdAt'>): Party => {
    let resolvedGroupName = partyData.groupName;
    if (partyData.groupId && !resolvedGroupName) {
      const grp = partyGroups.find(g => g.id === partyData.groupId);
      if (grp) resolvedGroupName = grp.name;
    }
    const requestedCode = (partyData.code || '').trim();
    // Prevent duplicate party codes: if code is empty or already taken by an existing party, auto-advance to next sequential code
    const isCodeTaken = requestedCode ? parties.some(p => p.code && p.code.trim() === requestedCode) : false;
    const resolvedCode = requestedCode && !isCodeTaken ? requestedCode : getNextPartyCode();
    const numVal = parseInt(resolvedCode.replace(/\D/g, ''), 10);
    if (!isNaN(numVal)) {
      issuedPartyCodeRef.current = Math.max(issuedPartyCodeRef.current, numVal);
    }
    const newParty: Party = {
      ...partyData,
      code: resolvedCode,
      groupName: resolvedGroupName,
      id: 'pty-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setParties(prev => [...prev, newParty]);

    addAuditLog({
      action: 'create',
      actionLabel: 'تعریف طرف حساب جدید',
      category: 'party',
      entityId: newParty.id,
      entityNumber: newParty.code,
      entityTitle: `${newParty.name} (${newParty.code})`,
      details: `ثبت طرف حساب جدید: ${newParty.name} با مانده ابتدایی ${newParty.balanceAFN.toLocaleString()} افغانی / ${newParty.balanceUSD.toLocaleString()} دالر`,
      newValue: JSON.stringify(newParty, null, 2),
    });

    notify('success', 'طرف حساب جدید با موفقیت ثبت شد', `${newParty.name} (${newParty.code})`);

    return newParty;
  };

  const updateParty = (id: string, partyData: Partial<Party>) => {
    const oldParty = parties.find(p => p.id === id);
    setParties(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        let resolvedGroupName = partyData.groupName ?? p.groupName;
        if (partyData.groupId !== undefined) {
          if (partyData.groupId) {
            const grp = partyGroups.find(g => g.id === partyData.groupId);
            resolvedGroupName = grp ? grp.name : undefined;
          } else {
            resolvedGroupName = undefined;
          }
        }
        return {
          ...p,
          ...partyData,
          groupName: resolvedGroupName,
        };
      })
    );

    if (oldParty) {
      addAuditLog({
        action: 'update',
        actionLabel: 'ویرایش طرف حساب',
        category: 'party',
        entityId: id,
        entityNumber: oldParty.code,
        entityTitle: `${partyData.name || oldParty.name} (${oldParty.code})`,
        details: `ویرایش مشخصات طرف حساب ${oldParty.name}`,
        previousValue: JSON.stringify(oldParty, null, 2),
        newValue: JSON.stringify({ ...oldParty, ...partyData }, null, 2),
      });

      notify('success', 'مشخصات طرف حساب به‌روزرسانی شد', partyData.name || oldParty.name);
    }
  };

  const deleteParty = (id: string) => {
    const p = parties.find(party => party.id === id);
    if (p) {
      addAuditLog({
        action: 'delete',
        actionLabel: 'حذف طرف حساب',
        category: 'party',
        entityId: id,
        entityNumber: p.code,
        entityTitle: `${p.name} (${p.code})`,
        details: `حذف طرف حساب ${p.name} با مانده حساب ${p.balanceAFN.toLocaleString()} افغانی و ${p.balanceUSD.toLocaleString()} دالر`,
        previousValue: JSON.stringify(p, null, 2),
      });

      notify('warning', 'طرف حساب از سیستم حذف شد', `${p.name} (${p.code})`);
    }
    setParties(prev => prev.filter(p => p.id !== id));
  };

  const updateExchangeRate = (newRate: number) => {
    setCashRegister(prev => ({ ...prev, usdToAfnRate: newRate }));
    setCurrencies(prev =>
      prev.map(c => (c.code === 'USD' ? { ...c, exchangeRateToAFN: newRate } : c))
    );
  };

  // Currencies CRUD
  const addCurrency = (currData: Omit<CurrencyDefinition, 'id' | 'createdAt'>): CurrencyDefinition => {
    const newCurr: CurrencyDefinition = {
      ...currData,
      id: 'curr-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setCurrencies(prev => [...prev, newCurr]);
    return newCurr;
  };

  const updateCurrency = (id: string, currData: Partial<CurrencyDefinition>) => {
    setCurrencies(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        const updated = { ...c, ...currData };
        if (c.code === 'USD' && currData.exchangeRateToAFN !== undefined) {
          setCashRegister(cr => ({ ...cr, usdToAfnRate: currData.exchangeRateToAFN! }));
        }
        return updated;
      })
    );
  };

  const deleteCurrency = (id: string) => {
    const target = currencies.find(c => c.id === id);
    if (!target) return;
    if (target.isDefault || target.isBase) {
      notify('error', 'خطا در حذف ارز', 'ارزهای پیش‌فرض سیستم و ارز پایه قابل حذف نمی‌باشند.');
      return;
    }
    setCurrencies(prev => prev.filter(c => c.id !== id));
    notify('info', 'ارز حذف شد', `ارز «${target.name} (${target.code})» با موفقیت حذف گردید.`);
  };

  const getCurrencyByCode = (code: string): CurrencyDefinition | undefined => {
    return currencies.find(c => c.code.toUpperCase() === code.toUpperCase());
  };

  const baseCurrency = useMemo<CurrencyDefinition>(() => {
    const explicit = currencies.find(c => c.isBase);
    if (explicit) return explicit;
    const afn = currencies.find(c => c.code === 'AFN');
    if (afn) return afn;
    return currencies[0] || {
      id: 'curr-1',
      code: 'AFN',
      name: 'افغانی افغانستان',
      symbol: '؋',
      exchangeRateToAFN: 1,
      isBase: true,
    };
  }, [currencies]);

  const setBaseCurrency = (currencyIdOrCode: string) => {
    const target = currencies.find(
      c => c.id === currencyIdOrCode || c.code.toUpperCase() === currencyIdOrCode.toUpperCase()
    );
    if (!target) return;

    setCurrencies(prev =>
      prev.map(c => ({
        ...c,
        isBase: c.id === target.id,
      }))
    );
    notify('info', 'ارز اصلی محاسبات تغییر یافت', `ارز پایه سیستم: «${target.name} (${target.code})» به عنوان مبنای محاسبه سود و زیان تنظیم گردید.`);
  };

  const convertToBase = (amount: number, fromCurrencyCode: string): number => {
    if (!amount) return 0;
    const fromCode = (fromCurrencyCode || 'AFN').toUpperCase();
    const baseCode = (baseCurrency.code || 'AFN').toUpperCase();
    if (fromCode === baseCode) return amount;

    const fromDef = currencies.find(c => c.code.toUpperCase() === fromCode);
    const fromRateToAFN = fromDef?.exchangeRateToAFN ?? (fromCode === 'USD' ? (cashRegister.usdToAfnRate || 65) : 1);
    const baseRateToAFN = baseCurrency.exchangeRateToAFN ?? 1;

    if (baseRateToAFN <= 0) return amount;
    return (amount * fromRateToAFN) / baseRateToAFN;
  };

  const updateCashBalances = (afn: number, usd: number, exchangeUsd?: number) => {
    setCashRegister(prev => ({
      ...prev,
      afnBalance: afn,
      usdBalance: usd,
      exchangeUsdBalance: exchangeUsd !== undefined ? exchangeUsd : prev.exchangeUsdBalance,
    }));
  };

  // Helpers
  const getProductStock = (productId: string, warehouseId?: string) => {
    const relevant = stocks.filter(
      s => s.productId === productId && (!warehouseId || s.warehouseId === warehouseId)
    );
    const tons = relevant.reduce((acc, curr) => acc + curr.quantityTons, 0);
    const bags = relevant.reduce((acc, curr) => acc + curr.quantityBags, 0);
    return { tons, bags };
  };

  const getWarehouseStockDetails = (warehouseId: string) => {
    // Map all products to ensure we capture In-Stock (> 0), Out-of-Stock (=== 0), and Negative (< 0) items
    return products.map(prod => {
      const s = stocks.find(stk => stk.warehouseId === warehouseId && stk.productId === prod.id);
      const tons = s ? s.quantityTons : 0;
      const bags = s ? s.quantityBags : 0;
      return {
        product: prod,
        tons,
        bags,
      };
    });
  };

  const getPartySummary = (partyId: string) => {
    const party = parties.find(p => p.id === partyId);
    const partyInvoices = invoices.filter(inv => inv.partyId === partyId);
    const partyTxs = transactions.filter(tx => tx.partyId === partyId);
    return {
      party,
      invoices: partyInvoices,
      transactions: partyTxs,
    };
  };

  const calculateTotalStockValue = () => {
    let afnValue = 0;
    let usdValue = 0;
    let totalTons = 0;
    let totalBags = 0;

    stocks.forEach(s => {
      const prod = products.find(p => p.id === s.productId);
      if (prod) {
        totalTons += s.quantityTons;
        totalBags += s.quantityBags;
        afnValue += s.quantityTons * prod.buyPriceAFN;
        usdValue += s.quantityTons * prod.buyPriceUSD;
      }
    });

    return { afnValue, usdValue, totalTons, totalBags };
  };

  const getLowStockAlerts = (): LowStockAlertItem[] => {
    return products
      .map(prod => {
        const minThreshold =
          prod.minStockTons !== undefined && prod.minStockTons !== null
            ? prod.minStockTons
            : 5;
        const total = getProductStock(prod.id);
        const warehouseBreakdown = warehouses.map(w => {
          const wStock = getProductStock(prod.id, w.id);
          return {
            warehouseId: w.id,
            warehouseName: w.name,
            tons: wStock.tons,
            bags: wStock.bags,
          };
        });

        const isOutOfStock = total.tons <= 0;
        const isCritical = !isOutOfStock && total.tons <= minThreshold / 2;
        const isLow = !isOutOfStock && !isCritical && total.tons <= minThreshold;

        if (!isOutOfStock && !isCritical && !isLow) {
          return null;
        }

        const deficitTons = Math.max(0, parseFloat((minThreshold - total.tons).toFixed(3)));
        const bagsPerTon = prod.bagsPerTon || (1000 / (prod.bagWeightKg || 50));
        const deficitBags = Math.round(deficitTons * bagsPerTon);

        return {
          product: prod,
          currentStockTons: total.tons,
          currentStockBags: total.bags,
          minStockTons: minThreshold,
          deficitTons,
          deficitBags,
          status: isOutOfStock ? 'out_of_stock' : isCritical ? 'critical' : 'low',
          warehouseBreakdown,
        };
      })
      .filter((item): item is LowStockAlertItem => item !== null);
  };

  // Cash Accounts CRUD
  const addCashAccount = (accData: Omit<CashRegisterAccount, 'id' | 'createdAt'>): CashRegisterAccount => {
    const newAcc: CashRegisterAccount = {
      ...accData,
      id: 'csh-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setCashAccounts(prev => [...prev, newAcc]);
    return newAcc;
  };

  const updateCashAccount = (id: string, accData: Partial<CashRegisterAccount>) => {
    setCashAccounts(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const updated = { ...a, ...accData };
        // If balance changed on default accounts, also reflect in cashRegister
        if (accData.balance !== undefined) {
          if (id === 'afn_cash') setCashRegister(cr => ({ ...cr, afnBalance: accData.balance! }));
          if (id === 'usd_cash') setCashRegister(cr => ({ ...cr, usdBalance: accData.balance! }));
          if (id === 'exchange_usd_cash') setCashRegister(cr => ({ ...cr, exchangeUsdBalance: accData.balance! }));
        }
        return updated;
      })
    );
  };

  const deleteCashAccount = (id: string) => {
    setCashAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Asset Groups CRUD
  const addAssetGroup = (groupData: Omit<AssetGroup, 'id' | 'createdAt'>): AssetGroup => {
    const newGroup: AssetGroup = {
      ...groupData,
      id: 'ag-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setAssetGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateAssetGroup = (id: string, groupData: Partial<AssetGroup>) => {
    setAssetGroups(prev => prev.map(g => (g.id === id ? { ...g, ...groupData } : g)));
    if (groupData.name) {
      setFixedAssets(prev =>
        prev.map(a => (a.groupId === id ? { ...a, groupName: groupData.name! } : a))
      );
    }
  };

  const deleteAssetGroup = (id: string) => {
    setAssetGroups(prev => prev.filter(g => g.id !== id));
  };

  // Fixed Assets CRUD
  const addFixedAsset = (assetData: Omit<FixedAsset, 'id' | 'createdAt'>): FixedAsset => {
    let resolvedGroupName = assetData.groupName;
    if (assetData.groupId && !resolvedGroupName) {
      const grp = assetGroups.find(g => g.id === assetData.groupId);
      if (grp) resolvedGroupName = grp.name;
    }
    const newAsset: FixedAsset = {
      ...assetData,
      groupName: resolvedGroupName || 'عمومی',
      id: 'fa-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setFixedAssets(prev => [...prev, newAsset]);
    return newAsset;
  };

  const updateFixedAsset = (id: string, assetData: Partial<FixedAsset>) => {
    setFixedAssets(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        let resolvedGroupName = assetData.groupName ?? a.groupName;
        if (assetData.groupId !== undefined) {
          const grp = assetGroups.find(g => g.id === assetData.groupId);
          resolvedGroupName = grp ? grp.name : 'عمومی';
        }
        return {
          ...a,
          ...assetData,
          groupName: resolvedGroupName,
        };
      })
    );
  };

  const deleteFixedAsset = (id: string) => {
    setFixedAssets(prev => prev.filter(a => a.id !== id));
  };

  // Shareholders CRUD with automatic percentage calculation
  const recalculateSharePercentages = (list: Shareholder[]): Shareholder[] => {
    const rate = cashRegister.usdToAfnRate || 65;
    const totalUSD = list.reduce((acc, sh) => {
      const capUSD = sh.capitalUSD || 0;
      const capAFN = (sh.capitalAFN || 0) / rate;
      return acc + capUSD + capAFN;
    }, 0);

    return list.map(sh => {
      const shEquiv = (sh.capitalUSD || 0) + ((sh.capitalAFN || 0) / rate);
      const sharePercentage = totalUSD > 0 ? Number(((shEquiv / totalUSD) * 100).toFixed(2)) : 0;
      return { ...sh, sharePercentage };
    });
  };

  const addShareholder = (shData: Omit<Shareholder, 'id' | 'createdAt' | 'sharePercentage'>): Shareholder => {
    const newSh: Shareholder = {
      ...shData,
      id: 'sh-' + Date.now(),
      createdAt: new Date().toLocaleDateString('fa-AF'),
    };
    setShareholders(prev => recalculateSharePercentages([...prev, newSh]));
    return newSh;
  };

  const updateShareholder = (id: string, shData: Partial<Shareholder>) => {
    setShareholders(prev => {
      const updated = prev.map(sh => (sh.id === id ? { ...sh, ...shData } : sh));
      return recalculateSharePercentages(updated);
    });
  };

  const deleteShareholder = (id: string) => {
    setShareholders(prev => recalculateSharePercentages(prev.filter(sh => sh.id !== id)));
  };

  // User Management CRUD & Security (مدیریت کاربران و امنیت سیستم)
  const login = (usernameOrId: string, passwordAttempt: string): { success: boolean; message?: string } => {
    const trimmedInput = usernameOrId.trim();
    const foundUser = users.find(
      u => u.id === trimmedInput || u.username.toLowerCase() === trimmedInput.toLowerCase() || u.name === trimmedInput
    );
    if (!foundUser) {
      return { success: false, message: 'کاربری با این نام کاربری یافت نشد.' };
    }
    const expectedPassword = foundUser.password || '123';
    if (passwordAttempt.trim() !== expectedPassword.trim()) {
      return { success: false, message: 'رمز عبور وارد شده نادرست است.' };
    }
    setCurrentUser(foundUser);
    setIsAuthenticated(true);
    sessionStorage.setItem(LOCAL_STORAGE_KEY + '_auth_session', 'true');
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY + '_is_authenticated');
    } catch {}
    localStorage.setItem(LOCAL_STORAGE_KEY + '_current_user', JSON.stringify(foundUser));
    notify('success', `خوش آمدید، جناب ${foundUser.name}`, `ورود به سیستم با سطح دسترسی ${foundUser.roleTitle} تأیید شد.`);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(LOCAL_STORAGE_KEY + '_auth_session');
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY + '_is_authenticated');
    } catch {}
    notify('info', 'سیستم قفل شد', 'برای دسترسی مجدد، لطفاً نام کاربری و رمز عبور خود را وارد نمایید.');
  };

  const addUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): AppUser => {
    const newUser: AppUser = {
      ...userData,
      password: userData.password?.trim() || '123',
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    notify('success', 'کاربر جدید ثبت شد', `کاربر «${newUser.name}» با رمز عبور تعیین‌شده ایجاد گردید.`);
    return newUser;
  };

  const updateUser = (id: string, userData: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...userData } : u)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...userData }));
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser.id === id) {
      const fallback = users.find(u => u.id !== id) || initialUsers[0];
      setCurrentUser(fallback);
    }
  };

  // Document Printing Modal Helpers
  const openPrintModal = (docOrType: any, maybeData?: any) => {
    if (!docOrType) return;

    // 0. If docOrType itself is a React element
    if (React.isValidElement(docOrType) || (docOrType && (docOrType as any).$$typeof)) {
      setActivePrintDoc({
        type: 'custom',
        customContent: docOrType,
      });
      return;
    }

    // 1. If called with 2 arguments:
    // Case A: (titleString, jsxElement) or (titleString, { customContent })
    if (typeof docOrType === 'string') {
      if (React.isValidElement(maybeData) || (maybeData && (maybeData as any).$$typeof)) {
        setActivePrintDoc({
          type: 'custom',
          title: docOrType,
          customContent: maybeData,
        });
        return;
      }
      if (maybeData && maybeData.customContent) {
        setActivePrintDoc({
          type: 'custom',
          title: docOrType,
          ...maybeData,
        });
        return;
      }

      const typeStr = docOrType.toLowerCase();
      if (typeStr === 'invoice' || typeStr === 'buy' || typeStr === 'sell') {
        setActivePrintDoc({
          type: 'invoice',
          invoice: maybeData || {},
        });
        return;
      }
      if (typeStr === 'receipt' || typeStr === 'payment' || typeStr === 'transaction' || typeStr === 'payment_receipt' || typeStr === 'receive_payment' || typeStr === 'make_payment') {
        setActivePrintDoc({
          type: 'payment_receipt',
          transaction: maybeData || {},
        });
        return;
      }
      if (typeStr === 'stock_transfer') {
        setActivePrintDoc({
          type: 'stock_transfer',
          stockTransfer: maybeData || {},
        });
        return;
      }
      if (typeStr === 'consignment_delivery_slip' || typeStr === 'consignment' || typeStr === 'delivery_slip') {
        setActivePrintDoc({
          type: 'consignment_delivery_slip',
          consignmentDelivery: maybeData || {},
        });
        return;
      }
      if (typeStr === 'financial_report' || typeStr === 'report') {
        setActivePrintDoc({
          type: 'financial_report',
          ...(maybeData || {}),
        });
        return;
      }
      setActivePrintDoc({
        type: typeStr as any,
        title: docOrType,
        ...(maybeData || {}),
      });
      return;
    }

    // 2. If docOrType has customContent
    if (docOrType.customContent) {
      setActivePrintDoc({
        type: docOrType.type || (docOrType.documentType as any) || 'custom',
        ...docOrType,
      });
      return;
    }

    // 3. If passed an invoice object directly or wrapped
    if (docOrType.invoice || docOrType.invoiceNumber || docOrType.type === 'buy' || docOrType.type === 'sell' || docOrType.type === 'invoice') {
      const inv = docOrType.invoice || docOrType;
      setActivePrintDoc({
        type: 'invoice',
        invoice: inv,
        ...docOrType,
      });
      return;
    }

    // 4. If passed a transaction object directly or wrapped
    if (
      docOrType.transaction ||
      docOrType.transactionNumber ||
      docOrType.type === 'receive_payment' ||
      docOrType.type === 'make_payment' ||
      docOrType.type === 'transaction' ||
      docOrType.type === 'receipt' ||
      docOrType.type === 'payment' ||
      docOrType.type === 'payment_receipt' ||
      docOrType.type === 'cash_transfer'
    ) {
      const tx = docOrType.transaction || docOrType;
      setActivePrintDoc({
        type: 'payment_receipt',
        transaction: tx,
        ...docOrType,
      });
      return;
    }

    // 5. If passed a stock transfer directly or wrapped
    if (docOrType.stockTransfer || docOrType.transferNumber || docOrType.type === 'stock_transfer') {
      const trf = docOrType.stockTransfer || docOrType;
      setActivePrintDoc({
        type: 'stock_transfer',
        stockTransfer: trf,
        ...docOrType,
      });
      return;
    }

    // 5.5 If passed a consignment delivery slip directly or wrapped
    if (docOrType.consignmentDelivery || docOrType.type === 'consignment_delivery_slip') {
      const csg = docOrType.consignmentDelivery || docOrType;
      setActivePrintDoc({
        type: 'consignment_delivery_slip',
        consignmentDelivery: csg,
        ...docOrType,
      });
      return;
    }

    // 6. Default / Reports / Tables
    setActivePrintDoc({
      type: docOrType.type || (docOrType.documentType as any) || 'financial_report',
      ...docOrType,
    });
  };

  const closePrintModal = () => {
    setActivePrintDoc(null);
  };

  // Reset Strategies
  // 1. Reset completely to Initial Afghan Demo Business dataset
  const resetToDemoData = () => {
    setCompanySettings(initialCompanySettings);
    setProductCategories(initialProductCategories);
    setProducts(initialProducts);
    setWarehouses(initialWarehouses);
    setStocks(initialStocks);
    setParties(initialParties);
    setPartyGroups(initialPartyGroups);
    setInvoices(initialInvoices);
    setTransactions(initialTransactions);
    setTransfers(initialTransfers);
    setCurrencies(initialCurrencies);
    setCashAccounts(initialCashAccounts);
    setAssetGroups(initialAssetGroups);
    setFixedAssets(initialFixedAssets);
    setShareholders(initialShareholders);
    setCashRegister(initialCashRegister);
    setExpenseCategories(initialExpenseCategories);
    setExpenseDefinitions(initialExpenseDefinitions);
    setExpenses(initialExpenses);
    setIncomeCategories(initialIncomeCategories);
    setIncomes(initialIncomes);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    localStorage.clear();
  };

  // 2. Start a New Financial Year: Clears all invoices, transactions, transfers, resets customer balance to 0, preserves warehouse stock structure and products
  const resetNewFinancialYear = () => {
    setInvoices([]);
    setTransactions([]);
    setTransfers([]);
    setExpenses([]);
    setIncomes([]);
    setParties(prev => prev.map(p => ({ ...p, balanceAFN: 0, balanceUSD: 0 })));
    setCashAccounts(prev => prev.map(a => ({ ...a, balance: 0 })));
    setCashRegister(prev => ({
      ...prev,
      afnBalance: 0,
      usdBalance: 0,
      exchangeUsdBalance: 0,
    }));
  };

  // 3. Complete Blank Wipe: Fresh blank slate for a brand new enterprise
  const resetWipeCleanAll = () => {
    setProductCategories(initialProductCategories);
    setProducts([]);
    setWarehouses([
      {
        id: 'wh-main',
        code: '1',
        name: 'گدام اصلی تجارتی',
        location: 'هرات',
        type: 'standard',
        notes: 'گدام پیش‌فرض سیستم',
      },
    ]);
    setStocks([]);
    setParties([]);
    setPartyGroups([
      {
        id: 'grp-1',
        name: 'مشتریان عمومی',
        description: 'گروه پیش‌فرض طرف‌های حساب',
        color: 'emerald',
      },
    ]);
    setInvoices([]);
    setTransactions([]);
    setTransfers([]);
    setExpenseCategories(initialExpenseCategories);
    setExpenses([]);
    setIncomeCategories(initialIncomeCategories);
    setIncomes([]);
    setCurrencies(initialCurrencies);
    setCashAccounts([
      {
        id: 'usd_cash',
        name: 'صندوق شرکت دالری $',
        currency: 'USD',
        balance: 0,
        initialBalance: 0,
        isDefault: true,
        type: 'cash',
        accountNumber: 'CSH-USD-01',
      },
      {
        id: 'exchange_usd_cash',
        name: 'صندوق صرافی دالری $',
        currency: 'USD',
        balance: 0,
        initialBalance: 0,
        isDefault: true,
        type: 'exchange',
        accountNumber: 'EXC-USD-02',
      },
      {
        id: 'afn_cash',
        name: 'صندوق شرکت افغانی AFN',
        currency: 'AFN',
        balance: 0,
        initialBalance: 0,
        isDefault: true,
        type: 'cash',
        accountNumber: 'CSH-AFN-01',
      },
    ]);
    setAssetGroups([]);
    setFixedAssets([]);
    setShareholders([]);
    setCashRegister({
      afnBalance: 0,
      usdBalance: 0,
      exchangeUsdBalance: 0,
      usdToAfnRate: 65,
    });

    // Clear saved localStorage data so everything opens completely clean and blank
    const keysToWipe = [
      LOCAL_STORAGE_KEY + '_products',
      LOCAL_STORAGE_KEY + '_stocks',
      LOCAL_STORAGE_KEY + '_parties',
      LOCAL_STORAGE_KEY + '_invoices',
      LOCAL_STORAGE_KEY + '_transactions',
      LOCAL_STORAGE_KEY + '_transfers',
      LOCAL_STORAGE_KEY + '_expenses',
      LOCAL_STORAGE_KEY + '_incomes',
      LOCAL_STORAGE_KEY + '_cash_accounts',
      LOCAL_STORAGE_KEY + '_cash',
      LOCAL_STORAGE_KEY + '_fixed_assets',
      LOCAL_STORAGE_KEY + '_shareholders',
      LOCAL_STORAGE_KEY + '_warehouses',
    ];
    keysToWipe.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (err) {
        // ignore
      }
    });
  };

  const exportJSON = () => {
    const payload = {
      companySettings,
      users,
      currentUser,
      productCategories,
      products,
      warehouses,
      stocks,
      parties,
      partyGroups,
      invoices,
      transactions,
      transfers,
      consignmentMovements,
      expenseCategories,
      expenseDefinitions,
      expenses,
      incomeCategories,
      incomes,
      currencies,
      cashAccounts,
      assetGroups,
      fixedAssets,
      shareholders,
      cashRegister,
      exportDate: new Date().toISOString(),
      systemVersion: '2.5',
    };
    return JSON.stringify(payload, null, 2);
  };

  const importJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && data.warehouses) {
        if (data.companySettings) {
          setCompanySettings(data.companySettings);
        }
        if (data.productCategories) setProductCategories(data.productCategories);
        setProducts(data.products || []);
        setWarehouses(data.warehouses || []);
        setStocks(data.stocks || []);
        setParties(data.parties || []);
        setPartyGroups(data.partyGroups || initialPartyGroups);
        setInvoices(data.invoices || []);
        setTransactions(data.transactions || []);
        setTransfers(data.transfers || []);
        if (data.consignmentMovements) setConsignmentMovements(data.consignmentMovements);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        if (data.expenseDefinitions) setExpenseDefinitions(data.expenseDefinitions);
        if (data.expenses) setExpenses(data.expenses);
        if (data.incomeCategories) setIncomeCategories(data.incomeCategories);
        if (data.incomes) setIncomes(data.incomes);
        setCurrencies(data.currencies || initialCurrencies);
        setCashAccounts(data.cashAccounts || initialCashAccounts);
        setAssetGroups(data.assetGroups || initialAssetGroups);
        setFixedAssets(data.fixedAssets || initialFixedAssets);
        setShareholders(data.shareholders || initialShareholders);
        setCashRegister(data.cashRegister || initialCashRegister);
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
          setCurrentUser(data.currentUser || data.users[0]);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AccountingContext.Provider
      value={{
        companySettings,
        updateCompanySettings,
        resetCompanySettings,
        appFontSize,
        setAppFontSize,
        fontSizeNumber,
        setFontSizeNumber,
        products,
        productCategories,
        addProductCategory,
        updateProductCategory,
        deleteProductCategory,
        getNextProductCode,
        warehouses,
        stocks,
        parties,
        partyGroups,
        getNextPartyCode,
        invoices,
        transactions,
        transfers,
        cashRegister,
        expenses,
        expenseCategories,
        expenseDefinitions,
        createExpense,
        updateExpense,
        deleteExpense,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        addExpenseDefinition,
        updateExpenseDefinition,
        deleteExpenseDefinition,
        incomes,
        incomeCategories,
        createIncome,
        updateIncome,
        deleteIncome,
        addIncomeCategory,
        updateIncomeCategory,
        deleteIncomeCategory,
        getNextIncomeNumber,
        currencies,
        baseCurrency,
        setBaseCurrency,
        convertToBase,
        addCurrency,
        updateCurrency,
        deleteCurrency,
        getCurrencyByCode,
        cashAccounts,
        addCashAccount,
        updateCashAccount,
        deleteCashAccount,
        assetGroups,
        addAssetGroup,
        updateAssetGroup,
        deleteAssetGroup,
        fixedAssets,
        addFixedAsset,
        updateFixedAsset,
        deleteFixedAsset,
        shareholders,
        addShareholder,
        updateShareholder,
        deleteShareholder,
        users,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        isAuthenticated,
        login,
        logout,
        addPartyGroup,
        updatePartyGroup,
        deletePartyGroup,
        activePrintDoc,
        openPrintModal,
        closePrintModal,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        notifications,
        notify,
        removeNotification,
        getNextInvoiceNumber,
        getNextTransactionNumber,
        getNextTransferNumber,
        getNextExpenseNumber,
        getNextConsignmentDocNumber,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        createStockTransfer,
        updateStockTransfer,
        deleteStockTransfer,
        consignmentMovements,
        createConsignmentMovement,
        updateConsignmentMovement,
        deleteConsignmentMovement,
        getCustomerConsignmentBalances,
        addProduct,
        updateProduct,
        deleteProduct,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        addParty,
        updateParty,
        deleteParty,
        updateExchangeRate,
        updateCashBalances,
        getProductStock,
        getWarehouseStockDetails,
        getPartySummary,
        calculateTotalStockValue,
        getLowStockAlerts,
        resetToDemoData,
        resetNewFinancialYear,
        resetWipeCleanAll,
        exportJSON,
        importJSON,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
