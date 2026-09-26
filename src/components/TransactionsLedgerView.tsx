import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Invoice,
  FinancialTransaction,
  ExpenseItem,
  IncomeItem,
  StockTransfer,
  Currency,
  InvoiceType,
} from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { EditInvoiceModal } from './EditInvoiceModal';
import { PaymentModal } from './PaymentModal';
import { StockTransferModal } from './StockTransferModal';
import {
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Building,
  Package,
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  Plus,
  Landmark,
  X,
  AlertTriangle,
  FileText,
  Truck,
  Coins,
  Check,
} from 'lucide-react';

export type OperationKind =
  | 'invoice_sell'
  | 'invoice_buy'
  | 'receive_payment'
  | 'make_payment'
  | 'cash_transfer'
  | 'currency_exchange'
  | 'expense'
  | 'income'
  | 'stock_transfer';

export interface UnifiedOperation {
  id: string;
  kind: OperationKind;
  kindLabel: string;
  docNumber: string;
  date: string;
  issueTime?: string;
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  description: string;
  primaryAmount: number;
  currency: Currency | 'TON' | 'BAG';
  secondaryDetail?: string;
  sourceAccount?: string;
  targetAccount?: string;
  status?: string;
  rawRecord: Invoice | FinancialTransaction | ExpenseItem | IncomeItem | StockTransfer;
}

interface TransactionsLedgerViewProps {
  onViewInvoice: (id: string) => void;
  onOpenNewInvoice?: (type: 'buy' | 'sell') => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange') => void;
  onOpenTransferModal?: () => void;
}

export const TransactionsLedgerView: React.FC<TransactionsLedgerViewProps> = ({
  onViewInvoice,
  onOpenNewInvoice,
  onOpenPaymentModal,
  onOpenTransferModal,
}) => {
  const {
    invoices,
    transactions,
    expenses,
    incomes,
    transfers,
    parties,
    warehouses,
    cashAccounts,
    expenseCategories,
    incomeCategories,
    deleteInvoice,
    deleteTransaction,
    deleteExpense,
    deleteIncome,
    deleteStockTransfer,
    updateExpense,
    updateIncome,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Filters & View Modes
  const [activeDomainTab, setActiveDomainTab] = useState<
    'all' | 'invoices' | 'payments' | 'transfers' | 'expenses_incomes' | 'stock_transfers' | 'itemized'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'AFN' | 'USD'>('all');
  const [filterPartyId, setFilterPartyId] = useState<string>('all');
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Edit Modals State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [editingTransfer, setEditingTransfer] = useState<StockTransfer | null>(null);
  const [isStockTransferModalOpen, setIsStockTransferModalOpen] = useState(false);

  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);

  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);

  // Expense Edit Form
  const [expTitle, setExpTitle] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expCurrency, setExpCurrency] = useState<Currency>('AFN');
  const [expPayee, setExpPayee] = useState('');
  const [expDate, setExpDate] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Income Edit Form
  const [incTitle, setIncTitle] = useState('');
  const [incCategoryId, setIncCategoryId] = useState('');
  const [incAmount, setIncAmount] = useState(0);
  const [incCurrency, setIncCurrency] = useState<Currency>('AFN');
  const [incPayer, setIncPayer] = useState('');
  const [incDate, setIncDate] = useState('');
  const [incNotes, setIncNotes] = useState('');

  // Delete Confirmation State
  const [deletingOp, setDeletingOp] = useState<UnifiedOperation | null>(null);

  // Printable Slip / Voucher Preview Modal
  const [printingOp, setPrintingOp] = useState<UnifiedOperation | null>(null);

  // 1. Build Master Unified Operations List
  const unifiedOperations: UnifiedOperation[] = useMemo(() => {
    const list: UnifiedOperation[] = [];

    // A. Invoices (Sell & Buy)
    invoices.forEach(inv => {
      const isSale = inv.type === 'sell';
      const wh = warehouses.find(w => w.id === inv.warehouseId);
      const totalBags = inv.items.reduce((s, it) => s + (it.bagsCount || 0), 0);
      const totalTons = inv.items.reduce((s, it) => s + (it.tonsCount || 0), 0);

      list.push({
        id: inv.id,
        kind: isSale ? 'invoice_sell' : 'invoice_buy',
        kindLabel: isSale ? 'فاکتور فروش' : 'فاکتور خرید',
        docNumber: inv.invoiceNumber,
        date: inv.date,
        issueTime: inv.issueTime,
        partyId: inv.partyId,
        partyName: inv.partyName,
        partyPhone: inv.partyPhone,
        description:
          inv.notes ||
          `${inv.items.map(it => `${it.productName} (${formatNumber(it.quantity)} ${it.unit === 'ton' ? 'تن' : 'کیسه'})`).join('، ')}`,
        primaryAmount: inv.totalAmount,
        currency: inv.currency,
        secondaryDetail: `${formatNumber(totalTons)} تن (${formatNumber(totalBags)} کیسه) • انبار: ${wh?.name || 'مرکزی'}`,
        sourceAccount: isSale ? wh?.name : inv.partyName,
        targetAccount: isSale ? inv.partyName : wh?.name,
        status:
          inv.paymentStatus === 'paid'
            ? 'تسویه کامل'
            : inv.paymentStatus === 'partial'
            ? `پرداخت جزئی (${formatCurrency(inv.paidAmount, inv.currency)})`
            : 'نسیه / باقیمانده',
        rawRecord: inv,
      });
    });

    // B. Financial Transactions (Payments, Receipts, Transfers, Exchanges)
    transactions.forEach(tx => {
      const fromAcc = cashAccounts.find(a => a.id === tx.fromCashRegister || a.id === tx.cashRegister);
      const toAcc = cashAccounts.find(a => a.id === tx.toCashRegister);

      if (tx.type === 'receive_payment') {
        list.push({
          id: tx.id,
          kind: 'receive_payment',
          kindLabel: 'رسید دریافت وجه',
          docNumber: tx.transactionNumber,
          date: tx.date,
          issueTime: tx.issueTime,
          partyId: tx.partyId,
          partyName: tx.partyName || 'مشتری / طرف حساب',
          description: tx.description || `دریافت وجه از ${tx.partyName || 'شخص'}`,
          primaryAmount: tx.amount,
          currency: tx.currency,
          secondaryDetail:
            tx.isExchange && tx.cashAmount
              ? `صندوق نقدی: ${formatCurrency(tx.cashAmount, tx.cashCurrency || 'AFN')} (نرخ: ${tx.exchangeRate})`
              : `صندوق: ${fromAcc?.name || 'صندوق نقدی'}`,
          sourceAccount: tx.partyName,
          targetAccount: fromAcc?.name || 'صندوق پولی',
          status: 'تایید و واریز شد',
          rawRecord: tx,
        });
      } else if (tx.type === 'make_payment') {
        list.push({
          id: tx.id,
          kind: 'make_payment',
          kindLabel: 'سند پرداخت وجه',
          docNumber: tx.transactionNumber,
          date: tx.date,
          issueTime: tx.issueTime,
          partyId: tx.partyId,
          partyName: tx.partyName || 'فروشنده / طرف حساب',
          description: tx.description || `پرداخت وجه به ${tx.partyName || 'شخص'}`,
          primaryAmount: tx.amount,
          currency: tx.currency,
          secondaryDetail:
            tx.isExchange && tx.cashAmount
              ? `برداشت نقدی: ${formatCurrency(tx.cashAmount, tx.cashCurrency || 'AFN')} (نرخ: ${tx.exchangeRate})`
              : `صندوق: ${fromAcc?.name || 'صندوق نقدی'}`,
          sourceAccount: fromAcc?.name || 'صندوق نقدی',
          targetAccount: tx.partyName,
          status: 'تایید و پرداخت شد',
          rawRecord: tx,
        });
      } else if (tx.type === 'cash_transfer') {
        list.push({
          id: tx.id,
          kind: 'cash_transfer',
          kindLabel: 'انتقال صندوق به صندوق',
          docNumber: tx.transactionNumber,
          date: tx.date,
          issueTime: tx.issueTime,
          partyName: `${fromAcc?.name || 'صندوق مبدا'} ⬅ ${toAcc?.name || 'صندوق مقصد'}`,
          description: tx.description || `جابجایی نقدینگی بین حساب‌ها`,
          primaryAmount: tx.amount,
          currency: tx.currency,
          secondaryDetail: `${fromAcc?.name || 'صندوق مبدا'} ⬅ ${toAcc?.name || 'صندوق مقصد'}`,
          sourceAccount: fromAcc?.name || 'صندوق مبدا',
          targetAccount: toAcc?.name || 'صندوق مقصد',
          status: 'تکمیل انتقال',
          rawRecord: tx,
        });
      } else if (tx.type === 'currency_exchange') {
        list.push({
          id: tx.id,
          kind: 'currency_exchange',
          kindLabel: 'صرافی و تبدیل اسعار',
          docNumber: tx.transactionNumber,
          date: tx.date,
          issueTime: tx.issueTime,
          partyName: tx.partyName || 'تبدیل ارزی و صرافی',
          description: tx.description || `تبدیل اسعار ارزی`,
          primaryAmount: tx.amount,
          currency: tx.currency,
          secondaryDetail: `معادل: ${formatCurrency(tx.targetAmount || 0, tx.targetCurrency || 'USD')} (نرخ: ${tx.exchangeRate})`,
          sourceAccount: fromAcc?.name,
          targetAccount: toAcc?.name,
          status: 'تبدیل شد',
          rawRecord: tx,
        });
      }
    });

    // C. Expenses
    expenses.forEach(exp => {
      const cat = expenseCategories.find(c => c.id === exp.categoryId);
      const acc = cashAccounts.find(a => a.id === exp.cashRegisterId);
      list.push({
        id: exp.id,
        kind: 'expense',
        kindLabel: 'سند هزینه و مصارف',
        docNumber: exp.receiptNumber || `EXP-${exp.id.slice(-4)}`,
        date: exp.date,
        partyName: exp.payee || cat?.name || 'هزینه جاری',
        description: `${exp.title} ${exp.notes ? `(${exp.notes})` : ''}`,
        primaryAmount: exp.amount,
        currency: exp.currency,
        secondaryDetail: `دسته‌بندی: ${cat?.name || 'عمومی'} • صندوق: ${acc?.name || 'صندوق نقدی'}`,
        sourceAccount: acc?.name || 'صندوق شرکت',
        targetAccount: exp.payee || cat?.name,
        status: 'پرداخت نقدی هزینه',
        rawRecord: exp,
      });
    });

    // D. Incomes
    incomes.forEach(inc => {
      const cat = incomeCategories.find(c => c.id === inc.categoryId);
      const acc = cashAccounts.find(a => a.id === inc.cashRegisterId);
      list.push({
        id: inc.id,
        kind: 'income',
        kindLabel: 'سند عواید متفرقه',
        docNumber: inc.receiptNumber || `INC-${inc.id.slice(-4)}`,
        date: inc.date,
        partyName: inc.payer || cat?.name || 'عاید متفرقه',
        description: `${inc.title} ${inc.notes ? `(${inc.notes})` : ''}`,
        primaryAmount: inc.amount,
        currency: inc.currency,
        secondaryDetail: `دسته‌بندی: ${cat?.name || 'درآمد'} • صندوق: ${acc?.name || 'صندوق نقدی'}`,
        sourceAccount: inc.payer || 'منبع درآمد',
        targetAccount: acc?.name || 'صندوق شرکت',
        status: 'دریافت نقدی عاید',
        rawRecord: inc,
      });
    });

    // E. Warehouse Stock Transfers
    transfers.forEach(tr => {
      list.push({
        id: tr.id,
        kind: 'stock_transfer',
        kindLabel: 'حواله انتقال گدام',
        docNumber: tr.transferNumber,
        date: tr.date,
        partyName: `${tr.fromWarehouseName} ⬅ ${tr.toWarehouseName}`,
        description: tr.description || `انتقال ${tr.productName}`,
        primaryAmount: tr.quantity,
        currency: tr.unit === 'ton' ? 'TON' : 'BAG',
        secondaryDetail: `${formatNumber(tr.tonsCount)} تن (${formatNumber(tr.bagsCount)} کیسه) • ${tr.productName}`,
        sourceAccount: tr.fromWarehouseName,
        targetAccount: tr.toWarehouseName,
        status: 'انتقال موفق کالا',
        rawRecord: tr,
      });
    });

    // Sort newest first (by date and docNumber)
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.docNumber.localeCompare(a.docNumber));
  }, [invoices, transactions, expenses, incomes, transfers, warehouses, cashAccounts, expenseCategories, incomeCategories]);

  // 2. Filter Operations
  const filteredOperations = useMemo(() => {
    return unifiedOperations.filter(op => {
      // Domain Tab Filter
      if (activeDomainTab === 'invoices') {
        if (op.kind !== 'invoice_sell' && op.kind !== 'invoice_buy') return false;
      } else if (activeDomainTab === 'payments') {
        if (op.kind !== 'receive_payment' && op.kind !== 'make_payment') return false;
      } else if (activeDomainTab === 'transfers') {
        if (op.kind !== 'cash_transfer' && op.kind !== 'currency_exchange') return false;
      } else if (activeDomainTab === 'expenses_incomes') {
        if (op.kind !== 'expense' && op.kind !== 'income') return false;
      } else if (activeDomainTab === 'stock_transfers') {
        if (op.kind !== 'stock_transfer') return false;
      }

      // Currency Filter
      if (filterCurrency !== 'all') {
        if (op.currency !== filterCurrency) return false;
      }

      // Party Filter
      if (filterPartyId !== 'all') {
        if (op.partyId !== filterPartyId) return false;
      }

      // Status Filter
      if (filterStatus !== 'all') {
        if (!op.status?.toLowerCase().includes(filterStatus.toLowerCase())) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          op.docNumber.toLowerCase().includes(q) ||
          op.partyName.toLowerCase().includes(q) ||
          op.description.toLowerCase().includes(q) ||
          (op.partyPhone && op.partyPhone.includes(q)) ||
          op.kindLabel.toLowerCase().includes(q) ||
          (op.secondaryDetail && op.secondaryDetail.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedOperations, activeDomainTab, filterCurrency, filterPartyId, filterStatus, searchQuery]);

  // 3. Metric Calculations for Filtered Set
  const stats = useMemo(() => {
    let totalReceiptsAFN = 0;
    let totalReceiptsUSD = 0;
    let totalPaymentsAFN = 0;
    let totalPaymentsUSD = 0;

    let totalSalesAFN = 0;
    let totalSalesUSD = 0;
    let totalPurchasesAFN = 0;
    let totalPurchasesUSD = 0;

    let totalExpensesAFN = 0;
    let totalExpensesUSD = 0;
    let totalIncomesAFN = 0;
    let totalIncomesUSD = 0;

    filteredOperations.forEach(op => {
      if (op.kind === 'invoice_sell') {
        if (op.currency === 'AFN') totalSalesAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalSalesUSD += op.primaryAmount;
      } else if (op.kind === 'invoice_buy') {
        if (op.currency === 'AFN') totalPurchasesAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalPurchasesUSD += op.primaryAmount;
      } else if (op.kind === 'receive_payment') {
        if (op.currency === 'AFN') totalReceiptsAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalReceiptsUSD += op.primaryAmount;
      } else if (op.kind === 'make_payment') {
        if (op.currency === 'AFN') totalPaymentsAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalPaymentsUSD += op.primaryAmount;
      } else if (op.kind === 'expense') {
        if (op.currency === 'AFN') totalExpensesAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalExpensesUSD += op.primaryAmount;
      } else if (op.kind === 'income') {
        if (op.currency === 'AFN') totalIncomesAFN += op.primaryAmount;
        else if (op.currency === 'USD') totalIncomesUSD += op.primaryAmount;
      }
    });

    return {
      totalReceiptsAFN,
      totalReceiptsUSD,
      totalPaymentsAFN,
      totalPaymentsUSD,
      totalSalesAFN,
      totalSalesUSD,
      totalPurchasesAFN,
      totalPurchasesUSD,
      totalExpensesAFN,
      totalExpensesUSD,
      totalIncomesAFN,
      totalIncomesUSD,
      count: filteredOperations.length,
    };
  }, [filteredOperations]);

  // 4. Action Handlers: Edit
  const handleEditOperation = (op: UnifiedOperation) => {
    if (op.kind === 'invoice_sell' || op.kind === 'invoice_buy') {
      setEditingInvoice(op.rawRecord as Invoice);
      setIsEditInvoiceModalOpen(true);
    } else if (
      op.kind === 'receive_payment' ||
      op.kind === 'make_payment' ||
      op.kind === 'cash_transfer' ||
      op.kind === 'currency_exchange'
    ) {
      setEditingTransaction(op.rawRecord as FinancialTransaction);
      setIsPaymentModalOpen(true);
    } else if (op.kind === 'stock_transfer') {
      setEditingTransfer(op.rawRecord as StockTransfer);
      setIsStockTransferModalOpen(true);
    } else if (op.kind === 'expense') {
      const exp = op.rawRecord as ExpenseItem;
      setEditingExpense(exp);
      setExpTitle(exp.title);
      setExpCategoryId(exp.categoryId);
      setExpAmount(exp.amount);
      setExpCurrency(exp.currency);
      setExpPayee(exp.payee || '');
      setExpDate(exp.date);
      setExpNotes(exp.notes || '');
      setIsEditExpenseModalOpen(true);
    } else if (op.kind === 'income') {
      const inc = op.rawRecord as IncomeItem;
      setEditingIncome(inc);
      setIncTitle(inc.title);
      setIncCategoryId(inc.categoryId);
      setIncAmount(inc.amount);
      setIncCurrency(inc.currency);
      setIncPayer(inc.payer || '');
      setIncDate(inc.date);
      setIncNotes(inc.notes || '');
      setIsEditIncomeModalOpen(true);
    }
  };

  // Save Expense Edit
  const handleSaveExpenseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || expAmount <= 0) return;
    updateExpense(editingExpense.id, {
      ...editingExpense,
      title: expTitle,
      categoryId: expCategoryId,
      amount: expAmount,
      currency: expCurrency,
      payee: expPayee,
      date: expDate,
      notes: expNotes,
    });
    setIsEditExpenseModalOpen(false);
  };

  // Save Income Edit
  const handleSaveIncomeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome || incAmount <= 0) return;
    updateIncome(editingIncome.id, {
      ...editingIncome,
      title: incTitle,
      categoryId: incCategoryId,
      amount: incAmount,
      currency: incCurrency,
      payer: incPayer,
      date: incDate,
      notes: incNotes,
    });
    setIsEditIncomeModalOpen(false);
  };

  // 5. Action Handlers: Delete
  const handleConfirmDelete = () => {
    if (!deletingOp) return;

    if (deletingOp.kind === 'invoice_sell' || deletingOp.kind === 'invoice_buy') {
      deleteInvoice(deletingOp.id);
    } else if (
      deletingOp.kind === 'receive_payment' ||
      deletingOp.kind === 'make_payment' ||
      deletingOp.kind === 'cash_transfer' ||
      deletingOp.kind === 'currency_exchange'
    ) {
      deleteTransaction(deletingOp.id);
    } else if (deletingOp.kind === 'expense') {
      deleteExpense(deletingOp.id);
    } else if (deletingOp.kind === 'income') {
      deleteIncome(deletingOp.id);
    } else if (deletingOp.kind === 'stock_transfer') {
      deleteStockTransfer(deletingOp.id);
    }

    setDeletingOp(null);
  };

  // 6. Action Handlers: Print & Export
  const handlePrintOperation = (op: UnifiedOperation) => {
    if (op.kind === 'invoice_sell' || op.kind === 'invoice_buy') {
      openPrintModal(op.rawRecord as Invoice);
    } else if (op.kind === 'receive_payment' || op.kind === 'make_payment') {
      openPrintModal({
        type: 'payment_receipt',
        transaction: op.rawRecord as FinancialTransaction,
      });
    } else if (op.kind === 'stock_transfer') {
      openPrintModal({
        type: 'stock_transfer',
        stockTransfer: op.rawRecord as StockTransfer,
      });
    } else if (op.kind === 'currency_exchange') {
      openPrintModal({
        type: 'currency_exchange',
        transaction: op.rawRecord as FinancialTransaction,
      });
    } else if (op.kind === 'cash_transfer') {
      openPrintModal({
        type: 'cash_transfer_voucher',
        transaction: op.rawRecord as FinancialTransaction,
      });
    } else {
      setPrintingOp(op);
    }
  };

  const handleExportCSV = () => {
    const headers = ['نوع عملیات', 'شماره سند', 'تاریخ', 'طرف حساب', 'شرح', 'مبلغ', 'ارز', 'وضعیت'];
    const rows = filteredOperations.map(op => [
      op.kindLabel,
      op.docNumber,
      op.date,
      op.partyName,
      `"${op.description.replace(/"/g, '""')}"`,
      op.primaryAmount,
      op.currency,
      op.status || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `دفتر_کل_تراکنش_ها_${getPersianDate().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintFullTable = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir="rtl">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                <Receipt className="w-6 h-6" />
              </span>
              <span>دفتر کل و ریز تمامی تراکنش‌ها و عملیات‌ها</span>
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {stats.count} سند
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            مدیریت یکپارچه، پیگیری لحظه‌ای، ویرایش مستقیم و حذف با بازگردانی خودکار انواع فاکتورها، رسید و پرداخت، صندوق به صندوق، صرافی، مصارف، عواید و حواله‌ها
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenNewInvoice && (
            <>
              <button
                type="button"
                onClick={() => onOpenNewInvoice('sell')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>فاکتور فروش</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenNewInvoice('buy')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>فاکتور خرید</span>
              </button>
            </>
          )}

          {onOpenPaymentModal && (
            <>
              <button
                type="button"
                onClick={() => onOpenPaymentModal('receive_payment')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>دریافت وجه</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenPaymentModal('make_payment')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>پرداخت وجه</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenPaymentModal('cash_transfer')}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title="انتقال صندوق به صندوق"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>صندوق به صندوق</span>
              </button>
            </>
          )}

          {onOpenTransferModal && (
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Truck className="w-4 h-4" />
              <span>حواله گدام</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 cursor-pointer"
            title="خروجی اکسل و CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">اکسل</span>
          </button>

          <button
            type="button"
            onClick={handlePrintFullTable}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 cursor-pointer"
            title="چاپ کل لیست"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">چاپ</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">کل فروش‌ها (فاکتور)</span>
          <div className="text-sm font-black text-rose-600 font-mono">
            {formatCurrency(stats.totalSalesUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalSalesAFN, 'AFN')}
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">کل خریدها (تأمین)</span>
          <div className="text-sm font-black text-blue-600 font-mono">
            {formatCurrency(stats.totalPurchasesUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalPurchasesAFN, 'AFN')}
          </div>
        </div>

        {/* Total Receipts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">دریافت‌های نقدی</span>
          <div className="text-sm font-black text-emerald-600 font-mono">
            {formatCurrency(stats.totalReceiptsUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalReceiptsAFN, 'AFN')}
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">پرداخت‌های نقدی</span>
          <div className="text-sm font-black text-amber-600 font-mono">
            {formatCurrency(stats.totalPaymentsUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalPaymentsAFN, 'AFN')}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">مصارف و هزینه‌ها</span>
          <div className="text-sm font-black text-purple-600 font-mono">
            {formatCurrency(stats.totalExpensesUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalExpensesAFN, 'AFN')}
          </div>
        </div>

        {/* Total Incomes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">عواید جانبی</span>
          <div className="text-sm font-black text-teal-600 font-mono">
            {formatCurrency(stats.totalIncomesUSD, 'USD')}
          </div>
          <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
            {formatCurrency(stats.totalIncomesAFN, 'AFN')}
          </div>
        </div>
      </div>

      {/* 3. Multi-Domain Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveDomainTab('all')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>همه عملیات‌ها و تراکنش‌ها ({unifiedOperations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab('invoices')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>فاکتورهای فروش و خرید ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab('payments')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'payments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>
              دریافت و پرداخت نقدی ({transactions.filter(t => t.type === 'receive_payment' || t.type === 'make_payment').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab('transfers')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'transfers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
            <span>
              صندوق به صندوق و صرافی ({transactions.filter(t => t.type === 'cash_transfer' || t.type === 'currency_exchange').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab('expenses_incomes')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'expenses_incomes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <span>مصارف و عواید ({expenses.length + incomes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab('stock_transfers')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeDomainTab === 'stock_transfers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4 text-indigo-500" />
            <span>حواله و انتقال گدام‌ها ({transfers.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجوی شماره سند، نام طرف حساب، کالا یا شرح..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Currency Filter */}
        <div>
          <select
            value={filterCurrency}
            onChange={e => setFilterCurrency(e.target.value as any)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">همه ارزها (AFN / USD)</option>
            <option value="AFN">فقط افغانی (AFN)</option>
            <option value="USD">فقط دالر (USD)</option>
          </select>
        </div>

        {/* Party Filter */}
        <div>
          <select
            value={filterPartyId}
            onChange={e => setFilterPartyId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">همه طرف حساب‌ها و اشخاص</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.groupName || 'شخص'})
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterCurrency('all');
              setFilterPartyId('all');
              setFilterStatus('all');
            }}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>پاکسازی فیلترها</span>
          </button>
        </div>
      </div>

      {/* 5. Master Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="p-3.5 text-center w-12">#</th>
                <th className="p-3.5">نوع عملیات</th>
                <th className="p-3.5">شماره سند</th>
                <th className="p-3.5">تاریخ و زمان</th>
                <th className="p-3.5">طرف حساب / شرح سند</th>
                <th className="p-3.5 text-center">مبلغ / مقدار</th>
                <th className="p-3.5">حساب مبدأ / مقصد</th>
                <th className="p-3.5 text-center">وضعیت مالی</th>
                <th className="p-3.5 text-center w-28">عملیات و اقدامات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOperations.length > 0 ? (
                filteredOperations.map((op, idx) => {
                  return (
                    <tr
                      key={`${op.kind}-${op.id}-${idx}`}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Index */}
                      <td className="p-3.5 text-center font-mono text-slate-500">{idx + 1}</td>

                      {/* Kind Badge */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                            op.kind === 'invoice_sell'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : op.kind === 'invoice_buy'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : op.kind === 'receive_payment'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : op.kind === 'make_payment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : op.kind === 'cash_transfer'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : op.kind === 'currency_exchange'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : op.kind === 'expense'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : op.kind === 'income'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {op.kind === 'invoice_sell' && <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                          {op.kind === 'invoice_buy' && <ArrowDownLeft className="w-3 h-3 text-blue-600" />}
                          {op.kind === 'receive_payment' && <ArrowDownLeft className="w-3 h-3 text-emerald-600" />}
                          {op.kind === 'make_payment' && <ArrowUpRight className="w-3 h-3 text-amber-600" />}
                          {op.kind === 'cash_transfer' && <ArrowRightLeft className="w-3 h-3 text-purple-600" />}
                          {op.kind === 'currency_exchange' && <Coins className="w-3 h-3 text-teal-600" />}
                          {op.kind === 'expense' && <TrendingDown className="w-3 h-3 text-orange-600" />}
                          {op.kind === 'income' && <TrendingUp className="w-3 h-3 text-cyan-600" />}
                          {op.kind === 'stock_transfer' && <Truck className="w-3 h-3 text-slate-600" />}
                          <span>{op.kindLabel}</span>
                        </span>
                      </td>

                      {/* Doc Number */}
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        #{op.docNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{op.date}</div>
                        {op.issueTime && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{op.issueTime}</span>
                          </div>
                        )}
                      </td>

                      {/* Party & Description */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-black text-slate-900">{op.partyName}</div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5" title={op.description}>
                          {op.description}
                        </div>
                        {op.secondaryDetail && (
                          <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                            {op.secondaryDetail}
                          </div>
                        )}
                      </td>

                      {/* Primary Amount */}
                      <td className="p-3.5 text-center">
                        <div
                          className={`font-black font-mono text-sm ${
                            op.kind === 'invoice_sell' || op.kind === 'receive_payment' || op.kind === 'income'
                              ? 'text-emerald-700'
                              : op.kind === 'invoice_buy' || op.kind === 'make_payment' || op.kind === 'expense'
                              ? 'text-rose-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {op.currency === 'TON'
                            ? `${formatNumber(op.primaryAmount)} تن`
                            : op.currency === 'BAG'
                            ? `${formatNumber(op.primaryAmount)} کیسه`
                            : formatCurrency(op.primaryAmount, op.currency as Currency)}
                        </div>
                      </td>

                      {/* Source & Target */}
                      <td className="p-3.5">
                        <div className="text-slate-700 font-medium">
                          {op.sourceAccount && <span>از: {op.sourceAccount}</span>}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-0.5">
                          {op.targetAccount && <span>به: {op.targetAccount}</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {op.status}
                        </span>
                      </td>

                      {/* Action Buttons: View, Edit, Delete */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View / Print */}
                          <button
                            type="button"
                            onClick={() => handlePrintOperation(op)}
                            className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition cursor-pointer shadow-2xs"
                            title="مشاهده و چاپ سند"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Direct */}
                          <button
                            type="button"
                            onClick={() => handleEditOperation(op)}
                            className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 rounded-lg transition cursor-pointer shadow-2xs"
                            title="ویرایش مستقیم سند"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Direct */}
                          <button
                            type="button"
                            onClick={() => setDeletingOp(op)}
                            className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition cursor-pointer shadow-2xs"
                            title="حذف سند و بازگردانی خودکار حساب‌ها"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    هیچ تراکنش یا سندی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditInvoiceModalOpen}
        invoice={editingInvoice}
        onClose={() => {
          setIsEditInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
      />

      {/* 7. Edit Financial Transaction Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        editingTransaction={editingTransaction}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setEditingTransaction(null);
        }}
      />

      {/* 8. Edit Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isStockTransferModalOpen}
        editingTransfer={editingTransfer}
        onClose={() => {
          setIsStockTransferModalOpen(false);
          setEditingTransfer(null);
        }}
      />

      {/* 9. Edit Expense Modal */}
      {isEditExpenseModalOpen && editingExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <form
            onSubmit={handleSaveExpenseEdit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">ویرایش سند مصرف و هزینه</h3>
              <button
                type="button"
                onClick={() => setIsEditExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان هزینه</label>
              <input
                type="text"
                value={expTitle}
                onChange={e => setExpTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ</label>
                <input
                  type="number"
                  min="1"
                  value={expAmount || ''}
                  onChange={e => setExpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ارز</label>
                <select
                  value={expCurrency}
                  onChange={e => setExpCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                >
                  <option value="AFN">افغانی (AFN)</option>
                  <option value="USD">دالر (USD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دریافت‌کننده / شخص</label>
                <input
                  type="text"
                  value={expPayee}
                  onChange={e => setExpPayee(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ</label>
                <input
                  type="text"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت و توضیحات</label>
              <input
                type="text"
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditExpenseModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs"
              >
                ذخیره تغییرات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10. Edit Income Modal */}
      {isEditIncomeModalOpen && editingIncome && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <form
            onSubmit={handleSaveIncomeEdit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">ویرایش سند عاید و درآمد متفرقه</h3>
              <button
                type="button"
                onClick={() => setIsEditIncomeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان عاید</label>
              <input
                type="text"
                value={incTitle}
                onChange={e => setIncTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ</label>
                <input
                  type="number"
                  min="1"
                  value={incAmount || ''}
                  onChange={e => setIncAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ارز</label>
                <select
                  value={incCurrency}
                  onChange={e => setIncCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                >
                  <option value="AFN">افغانی (AFN)</option>
                  <option value="USD">دالر (USD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پرداخت‌کننده / منبع</label>
                <input
                  type="text"
                  value={incPayer}
                  onChange={e => setIncPayer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ</label>
                <input
                  type="text"
                  value={incDate}
                  onChange={e => setIncDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت و توضیحات</label>
              <input
                type="text"
                value={incNotes}
                onChange={e => setIncNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditIncomeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs"
              >
                ذخیره تغییرات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 11. Delete Confirmation Dialog */}
      {deletingOp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                حذف {deletingOp.kindLabel} #{deletingOp.docNumber}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف کامل این سند اطمینان دارید؟
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">اثرات حذف بر سیستم:</div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-700">
                <li>مانده حساب طرف حساب به حالت قبل بازمی‌گردد.</li>
                <li>موجودی صندوق و دخل متناسب با مبلغ سند تنظیم می‌شود.</li>
                <li>موجودی انبار و گدام‌ها به صورت خودکار بازگردانی می‌شود.</li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOp(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
              >
                بله، حذف و بازگردانی شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Printable Voucher / Slip Modal */}
      {printingOp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            {/* Slip Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {companySettings.name || 'شرکت تجارتی برادران نبوی'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {companySettings.tagline || 'توزیع و پخش عمده سیمان، گچ ساختمانی، پودر سنگ، آرد و مصالح باکیفیت تجارتی'}
                </p>
              </div>
              <div className="text-left font-mono">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg mb-1">
                  {printingOp.kindLabel}
                </span>
                <div className="text-xs text-slate-600">شماره: #{printingOp.docNumber}</div>
                <div className="text-xs text-slate-600">تاریخ: {printingOp.date}</div>
              </div>
            </div>

            {/* Slip Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block mb-0.5">طرف حساب / تفصیل:</span>
                <span className="font-black text-slate-800 text-sm">{printingOp.partyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">مبلغ / ارزش سند:</span>
                <span className="font-black text-blue-700 font-mono text-base">
                  {printingOp.currency === 'TON'
                    ? `${formatNumber(printingOp.primaryAmount)} تن`
                    : printingOp.currency === 'BAG'
                    ? `${formatNumber(printingOp.primaryAmount)} کیسه`
                    : formatCurrency(printingOp.primaryAmount, printingOp.currency as Currency)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">شرح عملیات:</span>
                <span className="font-medium text-slate-700">{printingOp.description}</span>
              </div>
              {printingOp.secondaryDetail && (
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">جزئیات تکمیلی / انبار و تبدیل:</span>
                  <span className="font-medium text-slate-700">{printingOp.secondaryDetail}</span>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
              <div>
                <p className="font-bold text-slate-700 mb-8">تنظیم‌کننده</p>
                <div className="border-t border-dashed border-slate-300 pt-1">امضاء و مهر</div>
              </div>
              <div>
                <p className="font-bold text-slate-700 mb-8">حسابداری و مالی</p>
                <div className="border-t border-dashed border-slate-300 pt-1">امضاء و مهر</div>
              </div>
              <div>
                <p className="font-bold text-slate-700 mb-8">تحویل‌گیرنده / طرف حساب</p>
                <div className="border-t border-dashed border-slate-300 pt-1">امضاء و تاریخ</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintingOp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => {
                  const op = printingOp;
                  setPrintingOp(null);
                  if (op) {
                    if (op.kind === 'invoice_sell' || op.kind === 'invoice_buy') {
                      openPrintModal(op.rawRecord as Invoice);
                    } else if (op.kind === 'stock_transfer') {
                      openPrintModal({
                        type: 'stock_transfer',
                        stockTransfer: op.rawRecord as StockTransfer,
                      });
                    } else if (op.kind === 'currency_exchange') {
                      openPrintModal({
                        type: 'currency_exchange',
                        transaction: op.rawRecord as FinancialTransaction,
                      });
                    } else if (op.kind === 'cash_transfer') {
                      openPrintModal({
                        type: 'cash_transfer_voucher',
                        transaction: op.rawRecord as FinancialTransaction,
                      });
                    } else {
                      openPrintModal({
                        type: 'payment_receipt',
                        transaction: op.rawRecord as FinancialTransaction,
                      });
                    }
                  }
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسمی این سند</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
