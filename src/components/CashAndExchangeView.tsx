import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, CashRegisterAccount } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { CashRegisterCardexModal } from './CashRegisterCardexModal';
import { CashRegisterLedgerView } from './CashRegisterLedgerView';
import { CashAccountModal } from './CashAccountModal';
import { CashToCashTransferView } from './CashToCashTransferView';
import {
  Coins,
  TrendingUp,
  ArrowRightLeft,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Search,
  CheckCircle2,
  DollarSign,
  Wallet,
  Printer,
  Edit2,
  Trash2,
  History,
  Building,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

interface CashAndExchangeViewProps {
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange') => void;
  defaultActiveTab?: 'registers' | 'exchange_ops' | 'transactions_log';
  initialSelectedAccountId?: string;
}

export const CashAndExchangeView: React.FC<CashAndExchangeViewProps> = ({
  onOpenPaymentModal,
  defaultActiveTab = 'registers',
  initialSelectedAccountId,
}) => {
  const {
    cashRegister,
    cashAccounts,
    deleteCashAccount,
    transactions,
    createTransaction,
    updateExchangeRate,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Active view tab: 'registers' | 'exchange_ops' | 'transactions_log'
  const [activeTab, setActiveTab] = useState<'registers' | 'exchange_ops' | 'transactions_log'>(defaultActiveTab);

  // Modals state
  const [selectedAccountForCardex, setSelectedAccountForCardex] = useState<CashRegisterAccount | null>(() => {
    if (initialSelectedAccountId) {
      return cashAccounts.find(a => a.id === initialSelectedAccountId) || null;
    }
    return null;
  });

  // Watch for changes in initialSelectedAccountId
  React.useEffect(() => {
    if (initialSelectedAccountId) {
      const found = cashAccounts.find(a => a.id === initialSelectedAccountId);
      if (found) setSelectedAccountForCardex(found);
    }
  }, [initialSelectedAccountId, cashAccounts]);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<CashRegisterAccount | null>(null);

  // Filter for transactions log
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.transactionNumber.toLowerCase().includes(q) ||
        (t.partyName && t.partyName.toLowerCase().includes(q)) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate totals
  const totalAFN = cashAccounts
    .filter(a => a.currency === 'AFN')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalUSD = cashAccounts
    .filter(a => a.currency === 'USD')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalCombinedAFN = totalAFN + totalUSD * (cashRegister.usdToAfnRate || 65);

  // If a specific cash register is selected for its transaction ledger (کاردکس ریزتراکنش‌ها)
  if (selectedAccountForCardex) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto overflow-y-auto">
        <CashRegisterLedgerView
          account={selectedAccountForCardex}
          onBack={() => setSelectedAccountForCardex(null)}
          onSwitchAccount={acc => setSelectedAccountForCardex(acc)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner Navigation & Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">مدیریت صندوق‌ها، صرافی و عملیات ارزی</h2>
              <p className="text-xs text-slate-500">
                صندوق‌های نقدی افغانی، شرکت دالری، صرافی دالری، تبدیل ارز و تاریخچه تراکنش‌ها
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('registers')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'registers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>صندوق‌ها ({cashAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('exchange_ops')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'exchange_ops'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>عملیات تبدیل و انتقال ارز</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions_log')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'transactions_log'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>دفتر گردش وجوه</span>
          </button>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsAddAccountOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف صندوق جدید</span>
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total AFN */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">مجموع موجودی صندوق‌های افغانی</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatNumber(totalAFN)} ؋
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 font-semibold">ارز رایج محلی و فروشات داخلی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
            ؋
          </div>
        </div>

        {/* Total USD */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">مجموع موجودی صندوق‌های دالری ($)</span>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              ${formatNumber(totalUSD)}
            </h3>
            <p className="text-[11px] text-blue-600 mt-1 font-semibold">شامل صندوق شرکت و صندوق صرافی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
            $
          </div>
        </div>

        {/* Total Combined */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">مجموع کل ارزش نقدینگی (به افغانی)</span>
            <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatNumber(totalCombinedAFN)} ؋
            </h3>
            <p className="text-[11px] text-slate-300 mt-1">
              نرخ محاسبه روز: ۱$ = {cashRegister.usdToAfnRate} AFN
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: DYNAMIC CASH REGISTERS LIST */}
      {/* ========================================================================= */}
      {activeTab === 'registers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>صندوق‌های مالی فعال در شرکت (با کلیک وارد تراکنش‌های هر صندوق شوید)</span>
            </h3>
            <span className="text-xs text-slate-500">
              تعداد صندوق‌ها: <strong className="font-mono text-slate-900">{cashAccounts.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cashAccounts.map(account => {
              // Count transactions for this account
              const txCount = transactions.filter(
                t => t.cashRegister === account.id || t.fromCashRegister === account.id || t.toCashRegister === account.id
              ).length;

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedAccountForCardex(account)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                          account.currency === 'AFN'
                            ? 'bg-emerald-50 text-emerald-600'
                            : account.type === 'exchange'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {account.currency === 'AFN' ? '؋' : '$'}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition">
                            {account.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            کد: {account.accountNumber || account.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          account.type === 'exchange'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : account.currency === 'AFN'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {account.type === 'exchange' ? 'صرافی' : account.type === 'bank' ? 'بانک' : 'نقدی'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-emerald-50/40 transition">
                      <span className="text-[11px] font-bold text-slate-500 block">موجودی فعلی صندوق</span>
                      <div className="text-2xl font-black text-slate-900 font-mono mt-1 group-hover:text-emerald-700">
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                      {account.location && (
                        <div className="flex justify-between">
                          <span>موقعیت:</span>
                          <span className="font-medium text-slate-700">{account.location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>تعداد تراکنش‌های ثبت‌شده:</span>
                        <span className="font-mono font-bold text-slate-700">{txCount} سند</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedAccountForCardex(account)}
                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>مشاهده ریزتراکنش‌ها</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setAccountToEdit(account);
                          setIsAddAccountOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                        title="ویرایش صندوق"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`آیا از حذف صندوق "${account.name}" مطمئن هستید؟`)) {
                            deleteCashAccount(account.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                        title="حذف صندوق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: CURRENCY EXCHANGE & CASH TRANSFER SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'exchange_ops' && (
        <div className="pt-2">
          <CashToCashTransferView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: ALL TRANSACTIONS LOG */}
      {/* ========================================================================= */}
      {activeTab === 'transactions_log' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="جستجو در تمام اسناد مالی، شماره سند، طرف حساب..."
                  className="w-full pr-9 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه انواع تراکنش‌ها</option>
                <option value="receive_payment">دریافت‌های نقدی</option>
                <option value="make_payment">پرداخت‌های نقدی</option>
                <option value="currency_exchange">تبادله اسعار</option>
                <option value="cash_transfer">انتقال بین صندوق‌ها</option>
                <option value="expense">هزینه‌ها و مصارف</option>
              </select>

              <button
                onClick={() => {
                  openPrintModal({
                    title: 'دفتر کل گردش وجوه و نقدینگی شرکت',
                    subtitle: `تاریخ گزارش: ${getPersianDate()} | تعداد کل اسناد: ${filteredTransactions.length}`,
                    table: {
                      headers: ['شماره سند', 'تاریخ', 'نوع سند', 'صندوق', 'طرف حساب / شرح', 'مبلغ'],
                      rows: filteredTransactions.map(t => [
                        t.transactionNumber,
                        t.date,
                        t.type,
                        t.cashRegister || '-',
                        t.partyName ? `${t.partyName} - ${t.description}` : t.description,
                        formatCurrency(t.amount, t.currency),
                      ]),
                    },
                    footerNote: 'شرکت تجارتی و وارداتی برادران نبوی',
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>چاپ کل دفتر</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">شماره سند / تاریخ</th>
                  <th className="px-5 py-3.5">نوع سند مالی</th>
                  <th className="px-5 py-3.5">صندوق پولی مربوطه</th>
                  <th className="px-5 py-3.5">طرف حساب / شرح</th>
                  <th className="px-5 py-3.5 text-left">مبلغ و ارز</th>
                  <th className="px-5 py-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(t => {
                  const regObj = cashAccounts.find(a => a.id === t.cashRegister || a.id === t.fromCashRegister);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-mono">
                        <strong className="text-slate-900">{t.transactionNumber}</strong>
                        <div className="text-[10px] text-slate-400">{t.date} {t.issueTime || ''}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        {t.type === 'receive_payment' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>دریافت نقدی</span>
                          </span>
                        )}
                        {t.type === 'make_payment' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>پرداخت نقدی</span>
                          </span>
                        )}
                        {t.type === 'expense' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            <Coins className="w-3 h-3" />
                            <span>هزینه / مصارف</span>
                          </span>
                        )}
                        {t.type === 'currency_exchange' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>تبادله اسعار</span>
                          </span>
                        )}
                        {t.type === 'cash_transfer' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold text-[11px]">
                            <Wallet className="w-3 h-3" />
                            <span>انتقال وجه</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800">{regObj?.name || 'صندوق نقدی'}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        {t.partyName && <strong className="text-slate-900 block">{t.partyName}</strong>}
                        <span className="text-slate-500 text-[11px]">{t.description}</span>
                      </td>

                      <td className="px-5 py-3.5 text-left font-mono font-black text-slate-900">
                        {formatCurrency(t.amount, t.currency)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => {
                            openPrintModal({
                              title: `رسید سند مالی: ${t.transactionNumber}`,
                              subtitle: `تاریخ: ${t.date} ${t.issueTime || ''}`,
                              sections: [
                                {
                                  title: 'مشخصات سند',
                                  items: [
                                    { label: 'شماره سند', value: t.transactionNumber, isBold: true },
                                    { label: 'طرف حساب', value: t.partyName || 'عمومی' },
                                    { label: 'مبلغ سند', value: formatCurrency(t.amount, t.currency), isBold: true },
                                    { label: 'شرح سند', value: t.description },
                                  ],
                                },
                              ],
                              footerNote: 'شرکت تجارتی و وارداتی برادران نبوی',
                            });
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CASH REGISTER CARDEX MODAL (CLICK ON ANY CASH REGISTER) */}
      <CashRegisterCardexModal
        account={selectedAccountForCardex}
        isOpen={!!selectedAccountForCardex}
        onClose={() => setSelectedAccountForCardex(null)}
        onOpenPaymentModal={onOpenPaymentModal}
      />

      {/* ADD / EDIT CASH ACCOUNT MODAL */}
      <CashAccountModal
        accountToEdit={accountToEdit}
        isOpen={isAddAccountOpen}
        onClose={() => {
          setIsAddAccountOpen(false);
          setAccountToEdit(null);
        }}
      />
    </div>
  );
};
