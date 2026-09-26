import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAccounting } from '../context/AccountingContext';
import { Party, PartyGroup, Currency } from '../types';
import { formatNumber, getPersianDate } from '../utils/formatters';
import { PartyCardexModal } from './PartyCardexModal';
import { ProductsView } from './ProductsView';
import { WarehousesView } from './WarehousesView';
import { CashAndExchangeView } from './CashAndExchangeView';
import { ExpensesView } from './ExpensesView';
import { IncomesView } from './IncomesView';
import { CurrenciesView } from './CurrenciesView';
import { FixedAssetsView } from './FixedAssetsView';
import { ShareholdersView } from './ShareholdersView';
import {
  Users,
  Package,
  Warehouse,
  Landmark,
  Receipt,
  TrendingUp,
  Coins,
  Shield,
  Briefcase,
  Search,
  Plus,
  Trash2,
  Edit2,
  Printer,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Building,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

export type DefinitionSubTab =
  | 'parties'
  | 'products'
  | 'warehouses'
  | 'cash'
  | 'expenses'
  | 'incomes'
  | 'currencies'
  | 'fixed_assets'
  | 'shareholders';

interface InitialDefinitionsViewProps {
  initialSubTab?: DefinitionSubTab;
  initialGroupId?: string;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment', partyId?: string) => void;
  onViewInvoice?: (id: string) => void;
  onOpenTransferModal?: () => void;
}

export const InitialDefinitionsView: React.FC<InitialDefinitionsViewProps> = ({
  initialSubTab = 'parties',
  initialGroupId = 'all',
  onOpenPaymentModal,
  onViewInvoice,
  onOpenTransferModal,
}) => {
  const {
    parties,
    partyGroups,
    addParty,
    updateParty,
    deleteParty,
    addPartyGroup,
    updatePartyGroup,
    deletePartyGroup,
    getNextPartyCode,
    cashRegister,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Active top sub-navigation tab
  const [activeSubTab, setActiveSubTab] = useState<DefinitionSubTab>(initialSubTab);

  // Filter & Search states for Parties table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtors' | 'creditors' | 'settled'>('all');

  // Selected party for Cardex Modal
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);

  // Table container ref for scrolling buttons
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ---------------- FORM STATE (ثبت طرف‌حساب جدید) ----------------
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [regDate, setRegDate] = useState(getPersianDate());
  const [address, setAddress] = useState('');
  
  // Balances by currency
  const [usdType, setUsdType] = useState<'debtor' | 'creditor'>('debtor');
  const [balanceUsdInput, setBalanceUsdInput] = useState<number | ''>('');
  
  const [afnType, setAfnType] = useState<'debtor' | 'creditor'>('debtor');
  const [balanceAfnInput, setBalanceAfnInput] = useState<number | ''>('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ---------------- GROUP MANAGEMENT STATE ----------------
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [groupDeleteConfirmId, setGroupDeleteConfirmId] = useState<string | null>(null);

  // Group section ref for quick focus
  const groupsSectionRef = useRef<HTMLDivElement>(null);

  // Update initial subtab if prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Set default group if available
  useEffect(() => {
    if (!selectedGroup && partyGroups.length > 0) {
      setSelectedGroup(partyGroups[0].id);
    }
  }, [partyGroups, selectedGroup]);

  // Set auto code when not editing
  useEffect(() => {
    if (!editingPartyId && !code) {
      setCode(getNextPartyCode());
    }
  }, [parties, editingPartyId, code, getNextPartyCode]);

  // Handle Edit Party
  const handleStartEditParty = (p: Party) => {
    setEditingPartyId(p.id);
    setCode(p.code || '');
    setName(p.name);
    setPhone(p.phone || '');
    setSelectedGroup(p.groupId || '');
    setRegDate(p.createdAt || getPersianDate());
    setAddress(p.address || p.notes || '');

    // USD balance
    const initUsd = p.initialBalanceUSD !== undefined ? p.initialBalanceUSD : p.balanceUSD;
    if (initUsd < 0) {
      setUsdType('debtor');
      setBalanceUsdInput(Math.abs(initUsd));
    } else if (initUsd > 0) {
      setUsdType('creditor');
      setBalanceUsdInput(initUsd);
    } else {
      setUsdType('debtor');
      setBalanceUsdInput('');
    }

    // AFN balance
    const initAfn = p.initialBalanceAFN !== undefined ? p.initialBalanceAFN : p.balanceAFN;
    if (initAfn < 0) {
      setAfnType('debtor');
      setBalanceAfnInput(Math.abs(initAfn));
    } else if (initAfn > 0) {
      setAfnType('creditor');
      setBalanceAfnInput(initAfn);
    } else {
      setAfnType('debtor');
      setBalanceAfnInput('');
    }

    setFormError('');
    setFormSuccess('');

    // Smooth scroll form into view on mobile
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPartyId(null);
    setCode(getNextPartyCode());
    setName('');
    setPhone('');
    setAddress('');
    setBalanceUsdInput('');
    setBalanceAfnInput('');
    setFormError('');
  };

  // Submit Party Form
  const handleSubmitParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('لطفاً نام و نام خانوادگی را وارد نمایید');
      return;
    }

    const usdVal = typeof balanceUsdInput === 'number' ? balanceUsdInput : 0;
    const finalUsd = usdVal === 0 ? 0 : usdType === 'debtor' ? -Math.abs(usdVal) : Math.abs(usdVal);

    const afnVal = typeof balanceAfnInput === 'number' ? balanceAfnInput : 0;
    const finalAfn = afnVal === 0 ? 0 : afnType === 'debtor' ? -Math.abs(afnVal) : Math.abs(afnVal);

    const grp = partyGroups.find(g => g.id === selectedGroup);

    if (editingPartyId) {
      const existing = parties.find(p => p.id === editingPartyId);
      const oldInitUsd = existing?.initialBalanceUSD !== undefined ? existing.initialBalanceUSD : (existing?.balanceUSD || 0);
      const deltaUsd = finalUsd - oldInitUsd;
      const newRunningUsd = (existing?.balanceUSD || 0) + deltaUsd;

      const oldInitAfn = existing?.initialBalanceAFN !== undefined ? existing.initialBalanceAFN : (existing?.balanceAFN || 0);
      const deltaAfn = finalAfn - oldInitAfn;
      const newRunningAfn = (existing?.balanceAFN || 0) + deltaAfn;

      // Update
      updateParty(editingPartyId, {
        code: code.trim() || undefined,
        name: name.trim(),
        phone: phone.trim(),
        groupId: selectedGroup || undefined,
        groupName: grp?.name,
        address: address.trim(),
        notes: address.trim(),
        initialBalanceUSD: finalUsd,
        balanceUSD: newRunningUsd,
        initialBalanceAFN: finalAfn,
        balanceAFN: newRunningAfn,
      });
      setFormSuccess('اطلاعات طرف‌حساب با موفقیت ویرایش شد');
      setTimeout(() => setFormSuccess(''), 3000);
      handleCancelEdit();
    } else {
      // Create new
      const codeToSend = code.trim() || getNextPartyCode();
      const created = addParty({
        code: codeToSend,
        name: name.trim(),
        phone: phone.trim(),
        type: 'customer',
        groupId: selectedGroup || undefined,
        groupName: grp?.name,
        address: address.trim(),
        notes: address.trim(),
        initialBalanceUSD: finalUsd,
        balanceUSD: finalUsd,
        initialBalanceAFN: finalAfn,
        balanceAFN: finalAfn,
      });
      setFormSuccess(`طرف‌حساب جدید با کد ${created.code} با موفقیت ثبت گردید`);
      setTimeout(() => setFormSuccess(''), 3000);

      // Reset form and immediately fetch next party code
      setName('');
      setPhone('');
      setAddress('');
      setBalanceUsdInput('');
      setBalanceAfnInput('');
      setCode(getNextPartyCode());
      setFormError('');
    }
  };

  // Delete Party
  const handleDeleteParty = (p: Party) => {
    if (window.confirm(`آیا از حذف طرف‌حساب "${p.name}" اطمینان دارید؟`)) {
      deleteParty(p.id);
      if (editingPartyId === p.id) {
        handleCancelEdit();
      }
    }
  };

  // Group Management Handlers
  const handleAddGroupSubmit = () => {
    if (!newGroupName.trim()) return;
    addPartyGroup({
      name: newGroupName.trim(),
      color: 'slate',
    });
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const handleUpdateGroupSubmit = (groupId: string) => {
    if (!editingGroupName.trim()) return;
    updatePartyGroup(groupId, { name: editingGroupName.trim() });
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    deletePartyGroup(groupId);
    setGroupDeleteConfirmId(null);
    if (selectedGroup === groupId) {
      setSelectedGroup(partyGroups[0]?.id || '');
    }
  };

  // Filter parties for table
  const filteredParties = parties.filter(p => {
    // Search query: name, phone, code
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchPhone = (p.phone || '').includes(q);
      const matchCode = (p.code || '').includes(q) || p.id.includes(q);
      if (!matchName && !matchPhone && !matchCode) return false;
    }

    // Group filter
    if (selectedGroupId !== 'all' && p.groupId !== selectedGroupId) {
      return false;
    }

    // Balance filter: 'all' | 'debtors' | 'creditors' | 'settled'
    const isDebtor = p.balanceAFN < -1 || p.balanceUSD < -0.01;
    const isCreditor = p.balanceAFN > 1 || p.balanceUSD > 0.01;
    const isSettled = Math.abs(p.balanceAFN) <= 1 && Math.abs(p.balanceUSD) <= 0.01;

    if (balanceFilter === 'debtors' && !isDebtor) return false;
    if (balanceFilter === 'creditors' && !isCreditor) return false;
    if (balanceFilter === 'settled' && !isSettled) return false;

    return true;
  });

  // Table scroll helper
  const scrollTable = (direction: 'up' | 'down') => {
    if (tableContainerRef.current) {
      const scrollAmount = direction === 'up' ? -250 : 250;
      tableContainerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  // Print report
  const handlePrintPartiesList = () => {
    openPrintModal({
      documentType: 'customer_balance_report',
      title: 'گزارش مانده حساب مشتریان و طرف‌های تجارتی',
      subtitle: `${companySettings.name || 'شرکت تجارتی برادران نبوی'} - تاریخ چاپ: ${getPersianDate()}`,
      metadata: [
        { label: 'تعداد کل طرف‌های حساب', value: `${parties.length} شخص / شرکت` },
        { label: 'تعداد نمایش داده شده', value: `${filteredParties.length} حساب` },
        { label: 'نرخ تسویه دلاری روز', value: `${cashRegister.usdToAfnRate || 65} افغانی` },
      ],
      customContent: (
        <div className="space-y-4 text-xs">
          <table className="w-full border-collapse border border-slate-300 text-right">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="border border-slate-300 p-2 text-center w-12">کد</th>
                <th className="border border-slate-300 p-2">نام و مشخصات</th>
                <th className="border border-slate-300 p-2 text-center">گروه</th>
                <th className="border border-slate-300 p-2 text-center">شماره تماس</th>
                <th className="border border-slate-300 p-2 text-center">مانده دلاری (USD)</th>
                <th className="border border-slate-300 p-2 text-center">مانده افغانی (AFN)</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map((p, idx) => {
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-2 text-center font-bold text-blue-600">
                      {p.code || idx + 101}
                    </td>
                    <td className="border border-slate-300 p-2 font-semibold text-slate-900">{p.name}</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">
                      {p.groupName || 'متفرقه'}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono">{p.phone || '-'}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono">
                      {p.balanceUSD !== 0 ? (
                        <span className={p.balanceUSD < 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {formatNumber(Math.abs(p.balanceUSD))} {p.balanceUSD < 0 ? 'بدهکار' : 'طلبکار'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono">
                      {p.balanceAFN !== 0 ? (
                        <span className={p.balanceAFN < 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {formatNumber(Math.abs(p.balanceAFN))} {p.balanceAFN < 0 ? 'بدهکار' : 'طلبکار'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1700px] mx-auto space-y-5" dir="rtl">
      {/* ---------------- 1. PAGE TITLE & SUBTITLE ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            تعاریف اولیه سیستم و امور مالی
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            مدیریت یکپارچه کالاها، انبارها، طرف‌حساب‌ها، صندوق‌ها و هزینه‌ها در یک صفحه
          </p>
        </div>

        {/* Brand Pill Badge matching company settings */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-amber-400 text-xs font-bold self-start sm:self-auto shadow-2xs">
          <Building className="w-3.5 h-3.5 text-blue-600 dark:text-amber-400" />
          <span>{companySettings.name || 'شرکت تجارتی برادران نبوی'}</span>
        </div>
      </div>

      {/* ---------------- 2. TOP SUB-NAVIGATION TABS (Exact order from screenshot) ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-2 sm:p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'parties', label: 'طرف حساب‌ها (مشتریان)', icon: Users, color: 'text-[#2563EB]' },
            { id: 'products', label: 'مدیریت کالاها', icon: Package, color: 'text-sky-600' },
            { id: 'warehouses', label: 'انبارها و گدام‌ها', icon: Warehouse, color: 'text-amber-600' },
            { id: 'cash', label: 'مدیریت صندوق‌ها و بانک', icon: Landmark, color: 'text-emerald-600' },
            { id: 'expenses', label: 'هزینه‌ها و امور مالی', icon: Receipt, color: 'text-rose-600' },
            { id: 'incomes', label: 'تعریف عواید و درآمدها', icon: TrendingUp, color: 'text-teal-600' },
            { id: 'currencies', label: 'مدیریت ارزها', icon: Coins, color: 'text-indigo-600' },
            { id: 'fixed_assets', label: 'تجهیزات و دارایی‌ها', icon: Shield, color: 'text-purple-600' },
            { id: 'shareholders', label: 'امور سهامداران', icon: Briefcase, color: 'text-amber-700' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`def-tab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id as DefinitionSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ease-out shrink-0 cursor-pointer active:scale-95 transform hover:-translate-y-0.5 select-none ${
                  isActive
                    ? 'bg-[#EBF1FF] text-[#2563EB] shadow-xs border border-blue-200 ring-2 ring-blue-400/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="min-h-[400px]"
        >
      {/* ---------------- 3. TAB 1: طرف حساب‌ها (مشتریان) [EXACT SCREENSHOT LAYOUT] ---------------- */}
      {activeSubTab === 'parties' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ================= RIGHT COLUMN (Form & Groups) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 order-2 lg:order-1">
            {/* CARD 1: ثبت طرف‌حساب جدید */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 relative">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-800">
                    {editingPartyId ? 'ویرایش اطلاعات طرف‌حساب' : 'ثبت طرف‌حساب جدید'}
                  </h2>
                </div>

                {/* Quick jump to group management */}
                <button
                  type="button"
                  id="btn-goto-groups"
                  onClick={() => {
                    groupsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  گروه بندی‌ها
                </button>
              </div>

              {formError && (
                <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitParty} className="space-y-3.5 text-xs">
                {/* 1. کد طرف حساب */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    کد طرف حساب
                  </label>
                  <input
                    type="text"
                    id="input-party-code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="اختیاری - خودکار تولید می‌شود"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                  />
                </div>

                {/* 2. نام و نام خانوادگی * */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-party-name"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: علی احمدی"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-right font-medium"
                  />
                </div>

                {/* 3. شماره تماس */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    شماره تماس
                  </label>
                  <input
                    type="text"
                    id="input-party-phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="077XXXXXXX"
                    dir="ltr"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-left font-mono"
                  />
                </div>

                {/* 4. گروه طرف‌حساب * */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    گروه طرف‌حساب <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="select-party-group"
                      value={selectedGroup}
                      onChange={e => setSelectedGroup(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-right pr-3 pl-8 cursor-pointer font-medium"
                    >
                      <option value="">انتخاب کنید...</option>
                      {partyGroups.map(grp => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. تاریخ ثبت طرف حساب (شمسی) * */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    تاریخ ثبت طرف حساب (شمسی) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-party-date"
                    value={regDate}
                    onChange={e => setRegDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-right font-medium"
                  />
                </div>

                {/* 6. تعیین مانده‌های اولیه به تفکیک ارزها */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <span className="block text-[11px] font-bold text-slate-700">
                    تعیین مانده‌های اولیه به تفکیک ارزها:
                  </span>

                  {/* USD Currency Row */}
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">دلاری (USD) $</span>
                      <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5 text-[10px]">
                        <button
                          type="button"
                          id="btn-usd-debtor"
                          onClick={() => setUsdType('debtor')}
                          className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            usdType === 'debtor'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          بدهکار
                        </button>
                        <button
                          type="button"
                          id="btn-usd-creditor"
                          onClick={() => setUsdType('creditor')}
                          className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            usdType === 'creditor'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          طلبکار
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      id="input-party-balance-usd"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={balanceUsdInput}
                      onChange={e =>
                        setBalanceUsdInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-left font-mono font-bold"
                    />
                  </div>

                  {/* AFN Currency Row */}
                  <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">افغانی (AFN)</span>
                      <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5 text-[10px]">
                        <button
                          type="button"
                          id="btn-afn-debtor"
                          onClick={() => setAfnType('debtor')}
                          className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            afnType === 'debtor'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          بدهکار
                        </button>
                        <button
                          type="button"
                          id="btn-afn-creditor"
                          onClick={() => setAfnType('creditor')}
                          className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            afnType === 'creditor'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          طلبکار
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      id="input-party-balance-afn"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={balanceAfnInput}
                      onChange={e =>
                        setBalanceAfnInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-left font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 7. آدرس و توضیحات */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    آدرس و توضیحات
                  </label>
                  <textarea
                    id="input-party-address"
                    rows={2}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="آدرس دقیق"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all text-right resize-y"
                  />
                </div>

                {/* Submit Action Buttons */}
                <div className="pt-2">
                  {editingPartyId ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        id="btn-submit-update-party"
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        بروزرسانی طرف‌حساب
                      </button>
                      <button
                        type="button"
                        id="btn-cancel-edit-party"
                        onClick={handleCancelEdit}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      id="btn-submit-new-party"
                      className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      ثبت طرف‌حساب جدید
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* CARD 2: مدیریت و ویرایش گروه‌ها (Below the form) */}
            <div
              ref={groupsSectionRef}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5"
            >
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-black text-slate-800">مدیریت و ویرایش گروه‌ها</h3>
                </div>

                {!isAddingGroup && (
                  <button
                    type="button"
                    id="btn-open-add-group"
                    onClick={() => setIsAddingGroup(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>گروه جدید</span>
                  </button>
                )}
              </div>

              {/* Inline Add Group Form */}
              {isAddingGroup && (
                <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <input
                    type="text"
                    id="input-new-group-name"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="نام گروه جدید (مثال: مشتریان سرک ۶۴ متره)"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      id="btn-confirm-add-group"
                      onClick={handleAddGroupSubmit}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      افزودن
                    </button>
                    <button
                      type="button"
                      id="btn-cancel-add-group"
                      onClick={() => {
                        setIsAddingGroup(false);
                        setNewGroupName('');
                      }}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* List of groups with dotted dividers matching screenshot */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {partyGroups.map(grp => (
                  <div
                    key={grp.id}
                    className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-200 text-xs"
                  >
                    {editingGroupId === grp.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={e => setEditingGroupName(e.target.value)}
                          className="px-2 py-0.5 border border-blue-400 rounded text-xs flex-1 text-right"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateGroupSubmit(grp.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700">{grp.name}</span>
                        <div className="flex items-center gap-1">
                          {groupDeleteConfirmId === grp.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-rose-600 font-bold">حذف؟</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(grp.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setGroupDeleteConfirmId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                title="ویرایش گروه"
                                onClick={() => {
                                  setEditingGroupId(grp.id);
                                  setEditingGroupName(grp.name);
                                }}
                                className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="حذف گروه"
                                onClick={() => setGroupDeleteConfirmId(grp.id)}
                                className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= LEFT COLUMN (Table & Filter Controls) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3 order-1 lg:order-2">
            {/* Top Table Controls Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Right side in RTL: Title & Balance filter segmented tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>لیست طرف‌حساب‌های فعال</span>
                  </div>

                  {/* Filter Pills: همه, بدهکاران, طلبکاران, بی‌حساب */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      id="filter-parties-all"
                      onClick={() => setBalanceFilter('all')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        balanceFilter === 'all'
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      همه
                    </button>
                    <button
                      type="button"
                      id="filter-parties-debtors"
                      onClick={() => setBalanceFilter('debtors')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        balanceFilter === 'debtors'
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      بدهکاران
                    </button>
                    <button
                      type="button"
                      id="filter-parties-creditors"
                      onClick={() => setBalanceFilter('creditors')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        balanceFilter === 'creditors'
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      طلبکاران
                    </button>
                    <button
                      type="button"
                      id="filter-parties-settled"
                      onClick={() => setBalanceFilter('settled')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        balanceFilter === 'settled'
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      بی‌حساب
                    </button>
                  </div>
                </div>

                {/* Left side in RTL: Search bar, Group selector, Print button */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <input
                      type="text"
                      id="input-search-parties"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="جستجو بر اساس نام، شماره یا کد..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Group Filter Dropdown */}
                  <div className="relative">
                    <select
                      id="filter-group-select"
                      value={selectedGroupId}
                      onChange={e => setSelectedGroupId(e.target.value)}
                      className="appearance-none pr-3 pl-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">همه گروه‌ها</option>
                      {partyGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Print Button */}
                  <button
                    type="button"
                    id="btn-print-parties"
                    onClick={handlePrintPartiesList}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>چاپ گزارش</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table Container with side scroll navigation */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Quick side scroll navigation buttons */}
              <div className="absolute left-2 top-2 z-10 hidden sm:flex flex-col gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  title="حرکت به بالا"
                  onClick={() => scrollTable('up')}
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="حرکت به پایین"
                  onClick={() => scrollTable('down')}
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Table Area */}
              <div
                ref={tableContainerRef}
                className="overflow-x-auto max-h-[750px] overflow-y-auto custom-scrollbar"
              >
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-50/90 sticky top-0 z-5 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-14">کد</th>
                      <th className="py-2.5 px-3 text-right min-w-[170px]">نام و مشخصات</th>
                      <th className="py-2.5 px-3 text-center min-w-[120px]">گروه</th>
                      <th className="py-2.5 px-3 text-center min-w-[110px]">شماره تماس</th>
                      <th className="py-2.5 px-3 text-center min-w-[110px]">مانده (USD)</th>
                      <th className="py-2.5 px-3 text-center min-w-[110px]">مانده (AFN)</th>
                      <th className="py-2.5 px-3 text-center min-w-[130px]">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredParties.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          هیچ طرف‌حسابی با فیلترهای انتخابی یافت نشد
                        </td>
                      </tr>
                    ) : (
                      filteredParties.map(party => {
                        const usdBalance = party.balanceUSD || 0;
                        const afnBalance = party.balanceAFN || 0;

                        return (
                          <tr
                            key={party.id}
                            className="hover:bg-blue-50/40 transition-colors group"
                          >
                            {/* کد (Blue pill badge from screenshot) */}
                            <td className="py-2.5 px-2 text-center">
                              <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-bold shadow-2xs font-mono">
                                {party.code || party.id.replace('pty-', '')}
                              </span>
                            </td>

                            {/* نام و مشخصات */}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedPartyForLedger(party)}
                                className="font-bold text-blue-600 hover:text-blue-800 text-right block hover:underline cursor-pointer"
                              >
                                {party.name}
                              </button>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                شناسه: {party.code || party.id.replace('pty-', '')}
                                {party.company ? ` • ${party.company}` : ''}
                              </span>
                            </td>

                            {/* گروه */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-medium">
                                {party.groupName || 'متفرقه'}
                              </span>
                            </td>

                            {/* شماره تماس */}
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                              <div>{party.phone || '—'}</div>
                              {party.telegramChatId ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-md mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>تلگرام متصل</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 block mt-0.5">بدون تلگرام</span>
                              )}
                            </td>

                            {/* مانده (USD) */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {usdBalance !== 0 ? (
                                <div>
                                  <span
                                    className={`font-bold block ${
                                      usdBalance < 0 ? 'text-rose-600' : 'text-emerald-600'
                                    }`}
                                  >
                                    {formatNumber(Math.abs(usdBalance))}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold block ${
                                      usdBalance < 0 ? 'text-rose-500' : 'text-emerald-500'
                                    }`}
                                  >
                                    {usdBalance < 0 ? 'بدهکار' : 'طلبکار'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* مانده (AFN) */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {afnBalance !== 0 ? (
                                <div>
                                  <span
                                    className={`font-bold block ${
                                      afnBalance < 0 ? 'text-rose-600' : 'text-emerald-600'
                                    }`}
                                  >
                                    {formatNumber(Math.abs(afnBalance))}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold block ${
                                      afnBalance < 0 ? 'text-rose-500' : 'text-emerald-500'
                                    }`}
                                  >
                                    {afnBalance < 0 ? 'بدهکار' : 'طلبکار'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* عملیات (ویرایش yellow, حذف red from screenshot) */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  id={`btn-edit-party-${party.id}`}
                                  onClick={() => handleStartEditParty(party)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>ویرایش</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-delete-party-${party.id}`}
                                  onClick={() => handleDeleteParty(party)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 4. TAB 2: مدیریت کالاها ---------------- */}
      {activeSubTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <ProductsView onViewInvoice={onViewInvoice} />
        </div>
      )}

      {/* ---------------- 5. TAB 3: انبارها و گدام‌ها ---------------- */}
      {activeSubTab === 'warehouses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <WarehousesView onOpenTransferModal={onOpenTransferModal} />
        </div>
      )}

      {/* ---------------- 6. TAB 4: مدیریت صندوق‌ها و بانک ---------------- */}
      {activeSubTab === 'cash' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <CashAndExchangeView onOpenPaymentModal={onOpenPaymentModal} />
        </div>
      )}

      {/* ---------------- 7. TAB 5: هزینه‌ها و امور مالی ---------------- */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <ExpensesView initialMode="definitions" onOpenPaymentModal={onOpenPaymentModal} />
        </div>
      )}

      {/* ---------------- TAB: تعریف و مدیریت عواید و درآمدهای شرکت ---------------- */}
      {activeSubTab === 'incomes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <IncomesView onOpenPaymentModal={onOpenPaymentModal} />
        </div>
      )}

      {/* ---------------- 8. TAB 6: مدیریت ارزها ---------------- */}
      {activeSubTab === 'currencies' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <CurrenciesView />
        </div>
      )}

      {/* ---------------- 9. TAB 7: تجهیزات و دارایی‌های ثابت ---------------- */}
      {activeSubTab === 'fixed_assets' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <FixedAssetsView />
        </div>
      )}

      {/* ---------------- 10. TAB 8: امور سهامداران و شرکا ---------------- */}
      {activeSubTab === 'shareholders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
          <ShareholdersView />
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Cardex Modal for Selected Party */}
      {selectedPartyForLedger && (
        <PartyCardexModal
          party={selectedPartyForLedger}
          isOpen={true}
          onClose={() => setSelectedPartyForLedger(null)}
          onViewInvoice={onViewInvoice}
          onOpenPaymentModal={onOpenPaymentModal}
        />
      )}
    </div>
  );
};
