import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ExpenseItem, ExpenseCategory, Currency } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  DollarSign,
  Plus,
  Search,
  FolderPlus,
  Trash2,
  Edit2,
  Printer,
  Receipt,
  Layers,
  Calendar,
  Wallet,
  Building,
  Filter,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

import { ExpenseDefinitionsView } from './ExpenseDefinitionsView';

interface ExpensesViewProps {
  initialMode?: 'definitions' | 'payments';
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment') => void;
  autoOpenCreate?: boolean;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  initialMode = 'definitions',
  onOpenPaymentModal,
  autoOpenCreate = false,
}) => {
  const [expenseTab, setExpenseTab] = useState<'definitions' | 'payments'>(initialMode);

  const {
    expenses,
    expenseCategories,
    createExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    cashAccounts,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Selected Category filter for ListBox
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'USD' | 'AFN'>('ALL');

  // Modals
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormDesc, setCategoryFormDesc] = useState('');
  const [categoryFormColor, setCategoryFormColor] = useState('amber');

  // Form State for Expense Create / Edit
  const [expTitle, setExpTitle] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCurrency, setExpCurrency] = useState<Currency>('AFN');
  const [expCashRegisterId, setExpCashRegisterId] = useState('afn_cash');
  const [expPayee, setExpPayee] = useState('');
  const [expReceiptNumber, setExpReceiptNumber] = useState('');
  const [expDate, setExpDate] = useState(new Date().toLocaleDateString('fa-AF'));
  const [expNotes, setExpNotes] = useState('');

  // Open modal for new expense
  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    setExpTitle('');
    setExpCategoryId(expenseCategories[0]?.id || 'cat-1');
    setExpAmount(0);
    setExpCurrency('AFN');
    setExpCashRegisterId('afn_cash');
    setExpPayee('');
    setExpReceiptNumber('');
    setExpDate(new Date().toLocaleDateString('fa-AF'));
    setExpNotes('');
    setIsNewExpenseModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenNewExpense();
    }
  }, [autoOpenCreate]);

  // Open modal for editing expense
  const handleOpenEditExpense = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setExpTitle(expense.title);
    setExpCategoryId(expense.categoryId);
    setExpAmount(expense.amount);
    setExpCurrency(expense.currency);
    setExpCashRegisterId(expense.cashRegisterId || (expense.currency === 'USD' ? 'usd_cash' : 'afn_cash'));
    setExpPayee(expense.payee || '');
    setExpReceiptNumber(expense.receiptNumber || '');
    setExpDate(expense.date);
    setExpNotes(expense.notes || '');
    setIsNewExpenseModalOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) {
      alert('لطفاً عنوان هزینه و مبلغ معتبر را وارد نمایید.');
      return;
    }

    const cat = expenseCategories.find(c => c.id === expCategoryId);
    const cashAcc = cashAccounts.find(a => a.id === expCashRegisterId);

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        title: expTitle,
        categoryId: expCategoryId,
        categoryName: cat?.name || 'مصارف عمومی',
        amount: expAmount,
        currency: expCurrency,
        cashRegisterId: expCashRegisterId,
        cashRegisterName: cashAcc?.name || (expCashRegisterId === 'usd_cash' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
        payee: expPayee,
        receiptNumber: expReceiptNumber,
        date: expDate,
        notes: expNotes,
      });
    } else {
      createExpense({
        title: expTitle,
        categoryId: expCategoryId,
        categoryName: cat?.name || 'مصارف عمومی',
        amount: expAmount,
        currency: expCurrency,
        cashRegisterId: expCashRegisterId,
        cashRegisterName: cashAcc?.name || (expCashRegisterId === 'usd_cash' ? 'صندوق شرکت دالری' : 'صندوق پولی افغانی'),
        payee: expPayee,
        receiptNumber: expReceiptNumber,
        date: expDate,
        notes: expNotes,
      });
    }

    setIsNewExpenseModalOpen(false);
    setEditingExpense(null);
  };

  // Category save
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) return;

    if (editingCategory) {
      updateExpenseCategory(editingCategory.id, {
        name: categoryFormName,
        description: categoryFormDesc,
        color: categoryFormColor,
      });
    } else {
      addExpenseCategory({
        name: categoryFormName,
        description: categoryFormDesc,
        color: categoryFormColor,
      });
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchCat = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
      const matchCurr = currencyFilter === 'ALL' || item.currency === currencyFilter;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.expenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.payee && item.payee.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchCurr && matchQuery;
    });
  }, [expenses, selectedCategoryId, currencyFilter, searchQuery]);

  // Totals
  const totalAFN = useMemo(() => {
    return filteredExpenses
      .filter(e => e.currency === 'AFN')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const totalUSD = useMemo(() => {
    return filteredExpenses
      .filter(e => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
      {/* Sub-navigation Tabs: 1. تعریف هزینه‌ها (IMG-20260903-WA0006.jpg) | 2. اسناد پرداخت مصارف */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-expense-definitions"
            onClick={() => setExpenseTab('definitions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              expenseTab === 'definitions'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>تعریف انواع هزینه‌ها (کدینگ و سر‌فصل‌ها)</span>
          </button>

          <button
            type="button"
            id="tab-expense-payments"
            onClick={() => setExpenseTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              expenseTab === 'payments'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>ثبت و فهرست پرداخت مصارف روزانه</span>
          </button>
        </div>

        {expenseTab === 'payments' && (
          <div className="flex items-center gap-2">
            <button
              id="btn-add-expense-category"
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormName('');
                setCategoryFormDesc('');
                setCategoryFormColor('amber');
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
              <span>دسته‌بندی‌ها</span>
            </button>

            <button
              id="btn-new-expense"
              onClick={handleOpenNewExpense}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت پرداخت جدید</span>
            </button>
          </div>
        )}
      </div>

      {/* Render 1: تعریف هزینه‌ها (IMG-20260903-WA0006.jpg) */}
      {expenseTab === 'definitions' && (
        <ExpenseDefinitionsView />
      )}

      {/* Render 2: ثبت و فهرست اسناد مصارف */}
      {expenseTab === 'payments' && (
        <>
          {/* Top Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  اسناد پرداخت مصارف روزانه
                </h2>
                <p className="text-[11px] text-slate-500">
                  ثبت مبالغ پرداختی با کسر مستقیم از موجودی صندوق‌های شرکت
                </p>
              </div>
            </div>
          </div>

          {/* Main Content: Two Columns with Vertical ListBox on the Right */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Right Column: Categories Vertical ListBox (گروه‌های هزینه بصورت لیست‌باکس) */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <h2 className="text-xs font-bold text-slate-900">دسته‌بندی هزینه‌ها (لیست‌باکس)</h2>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                  {expenseCategories.length}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => setSelectedCategoryId('all')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer ${
                    selectedCategoryId === 'all'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>همه مصارف و هزینه‌ها</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${selectedCategoryId === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {expenses.length}
                  </span>
                </button>

                {expenseCategories.map(cat => {
                  const count = expenses.filter(e => e.categoryId === cat.id).length;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                      }`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setCategoryFormName(cat.name);
                            setCategoryFormDesc(cat.description || '');
                            setCategoryFormColor(cat.color || 'amber');
                            setIsCategoryModalOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-600 text-slate-400 transition"
                          title="ویرایش گروه"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {expenseCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`آیا از حذف دسته "${cat.name}" اطمینان دارید؟`)) {
                                deleteExpenseCategory(cat.id);
                                if (selectedCategoryId === cat.id) setSelectedCategoryId('all');
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 text-slate-400 transition"
                            title="حذف گروه"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormName('');
                    setCategoryFormDesc('');
                    setCategoryFormColor('amber');
                    setIsCategoryModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition border border-amber-200/60 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن دسته جدید</span>
                </button>
              </div>
            </div>

            {/* Left Column: Expenses Table with Search, Filter & Dual Currency Summary */}
            <div className="lg:col-span-3 space-y-4">
              {/* Filter Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="جستجو در عنوان، شماره سند، گیرنده..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCurrencyFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition ${currencyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      همه اسعار
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyFilter('AFN')}
                      className={`px-3 py-1.5 rounded-lg transition ${currencyFilter === 'AFN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
                    >
                      افغانی (AFN)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyFilter('USD')}
                      className={`px-3 py-1.5 rounded-lg transition ${currencyFilter === 'USD' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                    >
                      دالر (USD)
                    </button>
                  </div>
                </div>
              </div>

              {/* Expenses Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">شماره سند</th>
                        <th className="py-3 px-3.5">تاریخ</th>
                        <th className="py-3 px-3.5">شرح / عنوان هزینه</th>
                        <th className="py-3 px-3.5">دسته‌بندی</th>
                        <th className="py-3 px-3.5">صندوق پرداخت</th>
                        <th className="py-3 px-3.5">مبلغ</th>
                        <th className="py-3 px-3.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                            هیچ سند هزینه‌ای در این دسته‌بندی یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-slate-50/80 transition group">
                            <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                              {expense.expenseNumber}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-600">
                              {expense.date}
                            </td>
                            <td className="py-3 px-3.5 font-bold text-slate-900">
                              <div>{expense.title}</div>
                              {expense.payee && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  گیرنده: {expense.payee}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                                {expense.categoryName}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              {expense.cashRegisterName || 'صندوق'}
                            </td>
                            <td className="py-3 px-3.5 font-black text-slate-900 font-mono text-sm">
                              {formatNumber(expense.amount)}{' '}
                              <span className={expense.currency === 'USD' ? 'text-blue-600 text-xs' : 'text-emerald-600 text-xs'}>
                                {expense.currency}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditExpense(expense)}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                  title="ویرایش سند هزینه"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openPrintModal({
                                      type: 'transaction',
                                      transaction: {
                                        id: expense.id,
                                        transactionNumber: expense.expenseNumber,
                                        type: 'expense',
                                        partyId: '',
                                        partyName: expense.payee || expense.title,
                                        amount: expense.amount,
                                        currency: expense.currency,
                                        cashRegister: (expense.cashRegisterId as any) || 'afn_cash',
                                        date: expense.date,
                                        description: expense.title + ' (' + expense.categoryName + ')',
                                        createdAt: expense.createdAt,
                                      },
                                    });
                                  }}
                                  className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                                  title="چاپ سند هزینه"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`آیا از حذف سند "${expense.title}" به مبلغ ${formatCurrency(expense.amount, expense.currency)} اطمینان دارید؟ (مبلغ به صندوق بازگردانده می‌شود)`)) {
                                      deleteExpense(expense.id);
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                                  title="حذف سند"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Totals Footer */}
                <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-bold">
                    تعداد کل اسناد: {filteredExpenses.length} فقره
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-bold">مجموع افغانی:</span>
                      <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {formatNumber(totalAFN)} AFN
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-bold">مجموع دالر:</span>
                      <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        ${formatNumber(totalUSD)} USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* New / Edit Expense Modal (Fixed Window with Centered Display & Accessible Close Button) */}
      {isNewExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  {editingExpense ? 'ویرایش سند هزینه' : 'ثبت سند هزینه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewExpenseModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">شرح / عنوان هزینه *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: کرایه موتر، مصارف غذای کارگران، برق و اینترنت..."
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">دسته‌بندی هزینه *</label>
                  <select
                    value={expCategoryId}
                    onChange={e => setExpCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">تاریخ سند</label>
                  <input
                    type="text"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">مبلغ هزینه *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={expAmount || ''}
                    onChange={e => setExpAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">واحد پول (ارز) *</label>
                  <select
                    value={expCurrency}
                    onChange={e => {
                      const curr = e.target.value as 'AFN' | 'USD';
                      setExpCurrency(curr);
                      setExpCashRegisterId(curr === 'USD' ? 'usd_cash' : 'afn_cash');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  >
                    <option value="AFN">افغانی (AFN ؋)</option>
                    <option value="USD">دالر آمریکایی ($ USD)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">کسر مستقیم از صندوق / بانک *</label>
                <select
                  value={expCashRegisterId}
                  onChange={e => setExpCashRegisterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency}) - موجودی: {formatNumber(acc.balance)} {acc.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">شخص دریافت‌کننده / مأمور</label>
                  <input
                    type="text"
                    placeholder="مثلاً: احمد، درایور، رستورانت..."
                    value={expPayee}
                    onChange={e => setExpPayee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">شماره رسید / قبض دستی</label>
                  <input
                    type="text"
                    placeholder="مثلاً: 4521"
                    value={expReceiptNumber}
                    onChange={e => setExpReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">توضیحات و یادداشت</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات اختیاری..."
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  انصراف و بستن
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-sm"
                >
                  {editingExpense ? 'ثبت تغییرات سند' : 'تأیید و ثبت در سیستم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add / Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingCategory ? 'ویرایش دسته‌بندی هزینه' : 'تعریف دسته‌بندی جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded hover:bg-white/20 text-white/90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-4 space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">نام دسته‌بندی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: مصارف دفتری، کرایه و حمل، معاشات..."
                  value={categoryFormName}
                  onChange={e => setCategoryFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">توضیحات</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات اختیاری درباره این دسته..."
                  value={categoryFormDesc}
                  onChange={e => setCategoryFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  بستن
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-xs"
                >
                  ذخیره دسته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
