import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Party, PartyType, PartyGroup } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { PartyCardexModal } from './PartyCardexModal';
import {
  Users,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  MapPin,
  FileText,
  Trash2,
  Edit2,
  DollarSign,
  Printer,
  FolderPlus,
  Tag,
  Settings,
  Building,
  Layers,
  X,
  Send,
  Bot,
} from 'lucide-react';
import { sendCustomerAccountStatement, getTelegramSettings } from '../services/telegramBotService';

interface CustomersViewProps {
  onOpenPaymentModal: (type: 'receive_payment' | 'make_payment', partyId?: string) => void;
  onViewInvoice: (id: string) => void;
  initialGroupId?: string;
}

const GROUP_COLOR_MAP: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', pill: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', pill: 'bg-amber-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', pill: 'bg-purple-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', pill: 'bg-rose-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', pill: 'bg-cyan-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', pill: 'bg-indigo-500' },
};

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenPaymentModal,
  onViewInvoice,
  initialGroupId,
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
    getPartySummary,
    cashRegister,
    invoices,
    transactions,
    openPrintModal,
    companySettings,
    notify,
  } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || 'all');
  const [filterType, setFilterType] = useState<
    'all' | 'debtors_all' | 'debtors_afn' | 'debtors_usd' | 'creditors_all' | 'creditors_afn' | 'creditors_usd' | 'settled'
  >('all');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);

  // New Party Form Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [address, setAddress] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [groupId, setGroupId] = useState<string>('');
  const [initialBalanceAFN, setInitialBalanceAFN] = useState(0);
  const [afnType, setAfnType] = useState<'debtor' | 'creditor'>('debtor');
  const [initialBalanceUSD, setInitialBalanceUSD] = useState(0);
  const [usdType, setUsdType] = useState<'debtor' | 'creditor'>('debtor');
  const [notes, setNotes] = useState('');

  const handleSendCustomerTelegramStatement = async (party: Party) => {
    const settings = getTelegramSettings();
    if (!settings.botToken) {
      notify('warning', 'تنظیمات تلگرام', 'لطفاً ابتدا توکن ربات تلگرام را در تنظیمات وارد و فعال کنید.');
      return;
    }

    const targetChatId = party.telegramChatId || settings.defaultChatId;
    if (!targetChatId) {
      notify(
        'info',
        'مشتری هنوز به ربات وصل نشده است',
        `این مشتری (${party.name}) باید ابتدا در ربات تلگرام دکمه Start را بزند و شماره تماس خود (${party.phone}) را ارسال کند تا هویت او تایید و متصل گردد.`
      );
      return;
    }

    notify('info', 'در حال ارسال...', `ارسال جمله حساب به تلگرام ${party.name}`);
    const success = await sendCustomerAccountStatement(
      targetChatId,
      party,
      invoices,
      companySettings,
      settings
    );

    if (success) {
      notify('success', 'ارسال موفق به تلگرام', `جمله حساب اختصاصی برای محترم ${party.name} ارسال شد.`);
    } else {
      notify('error', 'خطا در ارسال', 'ارسال پیام به تلگرام مشتری با خطا مواجه شد. لطفاً توکن و اینترنت را بررسی نمایید.');
    }
  };

  // Group Management Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PartyGroup | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupColorInput, setGroupColorInput] = useState('emerald');

  // Escape key handler for add/group modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isGroupModalOpen) setIsGroupModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isGroupModalOpen]);

  // Sync initialGroupId prop
  useEffect(() => {
    if (initialGroupId !== undefined) {
      setSelectedGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  const openAddModal = () => {
    setEditingParty(null);
    setName('');
    setCompany('');
    setPhone('');
    setTelegramChatId('');
    setAddress('');
    setPartyType('customer');
    setGroupId(selectedGroupId !== 'all' ? selectedGroupId : partyGroups[0]?.id || '');
    setInitialBalanceAFN(0);
    setAfnType('debtor');
    setInitialBalanceUSD(0);
    setUsdType('debtor');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (party: Party) => {
    setEditingParty(party);
    setName(party.name);
    setCompany(party.company || '');
    setPhone(party.phone);
    setTelegramChatId(party.telegramChatId || '');
    setAddress(party.address || '');
    setPartyType(party.type);
    setGroupId(party.groupId || '');

    const initAfn = party.initialBalanceAFN !== undefined ? party.initialBalanceAFN : party.balanceAFN;
    if (initAfn < 0) {
      setAfnType('debtor');
      setInitialBalanceAFN(Math.abs(initAfn));
    } else if (initAfn > 0) {
      setAfnType('creditor');
      setInitialBalanceAFN(initAfn);
    } else {
      setAfnType('debtor');
      setInitialBalanceAFN(0);
    }

    const initUsd = party.initialBalanceUSD !== undefined ? party.initialBalanceUSD : party.balanceUSD;
    if (initUsd < 0) {
      setUsdType('debtor');
      setInitialBalanceUSD(Math.abs(initUsd));
    } else if (initUsd > 0) {
      setUsdType('creditor');
      setInitialBalanceUSD(initUsd);
    } else {
      setUsdType('debtor');
      setInitialBalanceUSD(0);
    }

    setNotes(party.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const matchedGroup = partyGroups.find(g => g.id === groupId);

    const finalAfn = initialBalanceAFN === 0 ? 0 : afnType === 'debtor' ? -Math.abs(initialBalanceAFN) : Math.abs(initialBalanceAFN);
    const finalUsd = initialBalanceUSD === 0 ? 0 : usdType === 'debtor' ? -Math.abs(initialBalanceUSD) : Math.abs(initialBalanceUSD);

    if (editingParty) {
      const oldInitAfn = editingParty.initialBalanceAFN !== undefined ? editingParty.initialBalanceAFN : editingParty.balanceAFN;
      const deltaAfn = finalAfn - oldInitAfn;
      const newRunningAfn = editingParty.balanceAFN + deltaAfn;

      const oldInitUsd = editingParty.initialBalanceUSD !== undefined ? editingParty.initialBalanceUSD : editingParty.balanceUSD;
      const deltaUsd = finalUsd - oldInitUsd;
      const newRunningUsd = editingParty.balanceUSD + deltaUsd;

      updateParty(editingParty.id, {
        name,
        company,
        phone,
        telegramChatId: telegramChatId.trim() || undefined,
        address,
        type: partyType,
        groupId: groupId || undefined,
        groupName: matchedGroup?.name || undefined,
        initialBalanceAFN: finalAfn,
        balanceAFN: newRunningAfn,
        initialBalanceUSD: finalUsd,
        balanceUSD: newRunningUsd,
        notes,
      });
    } else {
      addParty({
        name,
        company,
        phone,
        telegramChatId: telegramChatId.trim() || undefined,
        address,
        type: partyType,
        groupId: groupId || undefined,
        groupName: matchedGroup?.name || undefined,
        initialBalanceAFN: finalAfn,
        balanceAFN: finalAfn,
        initialBalanceUSD: finalUsd,
        balanceUSD: finalUsd,
        notes,
      });
    }
    setIsAddModalOpen(false);
  };

  // Group Management Actions
  const openNewGroupForm = () => {
    setEditingGroup(null);
    setGroupNameInput('');
    setGroupDescInput('');
    setGroupColorInput('emerald');
  };

  const openEditGroupForm = (grp: PartyGroup) => {
    setEditingGroup(grp);
    setGroupNameInput(grp.name);
    setGroupDescInput(grp.description || '');
    setGroupColorInput(grp.color || 'emerald');
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    if (editingGroup) {
      updatePartyGroup(editingGroup.id, {
        name: groupNameInput.trim(),
        description: groupDescInput.trim(),
        color: groupColorInput,
      });
    } else {
      const created = addPartyGroup({
        name: groupNameInput.trim(),
        description: groupDescInput.trim(),
        color: groupColorInput,
      });
      setSelectedGroupId(created.id);
    }
    setEditingGroup(null);
    setGroupNameInput('');
    setGroupDescInput('');
  };

  const handleDeleteGroup = (id: string, groupName: string) => {
    const partyCount = parties.filter(p => p.groupId === id).length;
    const msg = partyCount > 0
      ? `آیا از حذف گروه «${groupName}» اطمینان دارید؟ (${partyCount} طرف حساب از این گروه خارج می‌شوند اما حذف نخواهند شد).`
      : `آیا از حذف گروه «${groupName}» اطمینان دارید؟`;

    if (confirm(msg)) {
      deletePartyGroup(id);
      if (selectedGroupId === id) {
        setSelectedGroupId('all');
      }
    }
  };

  // Filtered parties
  const filteredParties = parties.filter(p => {
    // Group filter
    if (selectedGroupId !== 'all') {
      if (selectedGroupId === 'ungrouped') {
        if (p.groupId) return false;
      } else if (p.groupId !== selectedGroupId) {
        return false;
      }
    }

    // Debt/Credit Filter
    if (filterType === 'debtors_all' && !(p.balanceAFN < 0 || p.balanceUSD < 0)) return false;
    if (filterType === 'debtors_afn' && !(p.balanceAFN < 0)) return false;
    if (filterType === 'debtors_usd' && !(p.balanceUSD < 0)) return false;
    if (filterType === 'creditors_all' && !(p.balanceAFN > 0 || p.balanceUSD > 0)) return false;
    if (filterType === 'creditors_afn' && !(p.balanceAFN > 0)) return false;
    if (filterType === 'creditors_usd' && !(p.balanceUSD > 0)) return false;
    if (filterType === 'settled' && (p.balanceAFN !== 0 || p.balanceUSD !== 0)) return false;

    if (selectedPartyId && p.id !== selectedPartyId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        p.phone.includes(q) ||
        (p.groupName && p.groupName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate totals for active filtered set
  const totalDebtorsAFN = filteredParties
    .filter(p => p.balanceAFN < 0)
    .reduce((sum, p) => sum + Math.abs(p.balanceAFN), 0);

  const totalDebtorsUSD = filteredParties
    .filter(p => p.balanceUSD < 0)
    .reduce((sum, p) => sum + Math.abs(p.balanceUSD), 0);

  const totalCreditorsAFN = filteredParties
    .filter(p => p.balanceAFN > 0)
    .reduce((sum, p) => sum + p.balanceAFN, 0);

  const totalCreditorsUSD = filteredParties
    .filter(p => p.balanceUSD > 0)
    .reduce((sum, p) => sum + p.balanceUSD, 0);

  const inspectedParty = selectedPartyId ? parties.find(p => p.id === selectedPartyId) : null;
  const activeGroup = partyGroups.find(g => g.id === selectedGroupId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900">
              مدیریت اشخاص و طرف‌های حساب
            </h1>
            <p className="text-xs text-slate-500">
              تفکیک گروه‌ها، مدیریت طلبات و بدهی‌ها با قابلیت ثبت و پیگیری آنی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف شخص جدید</span>
          </button>

          <button
            onClick={() => onOpenPaymentModal('receive_payment')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>دریافت پول</span>
          </button>

          <button
            onClick={() => onOpenPaymentModal('make_payment')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>پرداخت پول</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Vertical Group ListBox (Right) + Parties Table & Details (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Right Column: Customer Groups Vertical ListBox (گروه مشتریان لیست ان بصورت عمودی) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-black text-slate-900">گروه‌های مشتریان (عمودی)</h2>
            </div>
            <button
              onClick={() => {
                openNewGroupForm();
                setIsGroupModalOpen(true);
              }}
              className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition"
              title="ایجاد گروه جدید"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
            {/* All Groups Option */}
            <button
              onClick={() => setSelectedGroupId('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer ${
                selectedGroupId === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>همه گروه‌ها</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${selectedGroupId === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {parties.length}
              </span>
            </button>

            {/* Vertical list of groups */}
            {partyGroups.map(grp => {
              const count = parties.filter(p => p.groupId === grp.id).length;
              const isSelected = selectedGroupId === grp.id;
              const colorMeta = GROUP_COLOR_MAP[grp.color || 'emerald'] || GROUP_COLOR_MAP.emerald;

              return (
                <div
                  key={grp.id}
                  onClick={() => setSelectedGroupId(grp.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorMeta.pill} shrink-0`} />
                    <span className="truncate">{grp.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditGroupForm(grp);
                        setIsGroupModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-600 text-slate-400 transition"
                      title="ویرایش گروه"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {partyGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(grp.id, grp.name);
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

            {/* Ungrouped */}
            {parties.some(p => !p.groupId) && (
              <button
                onClick={() => setSelectedGroupId('ungrouped')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-right cursor-pointer border ${
                  selectedGroupId === 'ungrouped'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-dashed border-slate-200'
                }`}
              >
                <span>بدون دسته‌بندی</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  {parties.filter(p => !p.groupId).length}
                </span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                openNewGroupForm();
                setIsGroupModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200/60 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ تعریف گروه جدید</span>
            </button>
          </div>
        </div>

        {/* Left Column: Search & Filters + Parties Table + Group Totals Footer */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی نام شخص، تلفن، شرکت..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="all">همه وضعیت‌ها ({filteredParties.length})</option>
                <option value="debtors_all">همه قرضداران (بدهکاران به ما)</option>
                <option value="debtors_afn">قرضداران افغانی</option>
                <option value="debtors_usd">قرضداران دالری</option>
                <option value="creditors_all">همه طلبکاران از ما</option>
                <option value="creditors_afn">طلبکاران افغانی</option>
                <option value="creditors_usd">طلبکاران دالری</option>
                <option value="settled">حساب‌های تصفیه شده</option>
              </select>
            </div>
          </div>

          {/* Parties Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">نام طرف حساب</th>
                    <th className="px-4 py-3.5">گروه</th>
                    <th className="px-4 py-3.5">تماس / شرکت</th>
                    <th className="px-4 py-3.5">مانده افغانی</th>
                    <th className="px-4 py-3.5">مانده دالر</th>
                    <th className="px-4 py-3.5">وضعیت</th>
                    <th className="px-4 py-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                        هیچ حسابی در این دسته یا فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map(party => {
                      const isDebtorAFN = party.balanceAFN < 0;
                      const isCreditorAFN = party.balanceAFN > 0;
                      const isDebtorUSD = party.balanceUSD < 0;
                      const isCreditorUSD = party.balanceUSD > 0;

                      const grp = partyGroups.find(g => g.id === party.groupId);
                      const colorMeta = grp ? (GROUP_COLOR_MAP[grp.color || 'emerald'] || GROUP_COLOR_MAP.emerald) : null;

                      return (
                        <tr key={party.id} className="hover:bg-slate-50/80 transition group">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 text-xs">{party.name}</div>
                            {party.company && (
                              <div className="text-[10px] text-slate-500">{party.company}</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {grp ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorMeta?.bg} ${colorMeta?.text} ${colorMeta?.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${colorMeta?.pill}`} />
                                <span>{grp.name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">عمومی</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-mono text-slate-700">{party.phone}</div>
                            {party.telegramChatId ? (
                              <span
                                className="inline-flex items-center gap-1 text-[9.5px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-full mt-0.5"
                                title={`متصل به ربات تلگرام (شناسه چت: ${party.telegramChatId})`}
                              >
                                <Send className="w-2.5 h-2.5 -rotate-45" />
                                <span>وصل تلگرام</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                تلگرام: غیرمتصل
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold">
                            {party.balanceAFN === 0 ? (
                              <span className="text-slate-400">۰ ؋</span>
                            ) : (
                              <span className={isDebtorAFN ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                                {formatCurrency(Math.abs(party.balanceAFN), 'AFN')}{' '}
                                <span className="text-[10px] font-sans font-normal">
                                  {isDebtorAFN ? '(قرضدار)' : '(طلبکار)'}
                                </span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold">
                            {party.balanceUSD === 0 ? (
                              <span className="text-slate-400">$۰</span>
                            ) : (
                              <span className={isDebtorUSD ? 'text-rose-600 font-black' : 'text-blue-600 font-black'}>
                                {formatCurrency(Math.abs(party.balanceUSD), 'USD')}{' '}
                                <span className="text-[10px] font-sans font-normal">
                                  {isDebtorUSD ? '(قرضدار)' : '(طلبکار)'}
                                </span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {isDebtorAFN || isDebtorUSD ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                قرضدار ما
                              </span>
                            ) : isCreditorAFN || isCreditorUSD ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                طلبکار از ما
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                تصفیه
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onOpenPaymentModal('receive_payment', party.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition"
                                title="دریافت وجه"
                              >
                                دریافت
                              </button>
                              <button
                                onClick={() => onOpenPaymentModal('make_payment', party.id)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition"
                                title="پرداخت وجه"
                              >
                                پرداخت
                              </button>
                              <button
                                onClick={() => setSelectedPartyForLedger(party)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="صورت‌حساب و کاردکس"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSendCustomerTelegramStatement(party)}
                                className={`p-1 rounded-lg transition cursor-pointer ${
                                  party.telegramChatId
                                    ? 'text-sky-600 hover:bg-sky-50 hover:text-sky-700'
                                    : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'
                                }`}
                                title={
                                  party.telegramChatId
                                    ? `ارسال مستقیم جمله حساب به تلگرام ${party.name}`
                                    : `ارسال جمله حساب به تلگرام (مشتری هنوز به ربات متصل نشده است)`
                                }
                              >
                                <Send className="w-3.5 h-3.5 -rotate-45" />
                              </button>
                              <button
                                onClick={() => openEditModal(party)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="ویرایش"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`آیا از حذف حساب ${party.name} اطمینان دارید؟`)) {
                                    deleteParty(party.id);
                                  }
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Bottom Group Totals Footer (لیست طلبکاران و بدهکاران مجموع مبالغ گروهی افغانی و دالر در پایین فرم) */}
            <div className="p-4 bg-slate-50/95 border-t border-slate-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600 font-bold">
                  <span>تعداد اشخاص: {filteredParties.length} نفر</span>
                  {activeGroup && (
                    <span className="mr-2 text-blue-700 font-black">
                      (گروه فعال: {activeGroup.name})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto text-xs">
                  {/* Total Debtors AFN */}
                  <div className="bg-white p-2 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-600 font-bold block">طلب ما (قرضداران AFN):</span>
                    <span className="font-mono font-black text-rose-700 text-xs">
                      {formatNumber(totalDebtorsAFN)} ؋
                    </span>
                  </div>

                  {/* Total Debtors USD */}
                  <div className="bg-white p-2 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-600 font-bold block">طلب ما (قرضداران USD):</span>
                    <span className="font-mono font-black text-rose-700 text-xs">
                      ${formatNumber(totalDebtorsUSD)}
                    </span>
                  </div>

                  {/* Total Creditors AFN */}
                  <div className="bg-white p-2 rounded-xl border border-blue-200 shadow-2xs">
                    <span className="text-[10px] text-blue-600 font-bold block">بدهی ما (طلبکاران AFN):</span>
                    <span className="font-mono font-black text-blue-700 text-xs">
                      {formatNumber(totalCreditorsAFN)} ؋
                    </span>
                  </div>

                  {/* Total Creditors USD */}
                  <div className="bg-white p-2 rounded-xl border border-blue-200 shadow-2xs">
                    <span className="text-[10px] text-blue-600 font-bold block">بدهی ما (طلبکاران USD):</span>
                    <span className="font-mono font-black text-blue-700 text-xs">
                      ${formatNumber(totalCreditorsUSD)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. DETAILED PARTY CARDEX / LEDGER MODAL */}
      <PartyCardexModal
        party={selectedPartyForLedger}
        isOpen={!!selectedPartyForLedger}
        onClose={() => setSelectedPartyForLedger(null)}
        onViewInvoice={onViewInvoice}
        onOpenPaymentModal={onOpenPaymentModal}
      />

      {/* 7. ADD / EDIT PARTY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveParty}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingParty ? 'ویرایش حساب مشتری / فروشنده' : 'تعریف مشتری یا فروشنده جدید'}
              </h3>
              <button
                id="party-form-modal-close-btn"
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                title="بستن فرم (ESC)"
              >
                <X className="w-4 h-4" />
                <span>بستن (ESC)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام و تخلص شخص *</label>
              <input
                type="text"
                placeholder="مثلاً: حاجی احمد صبور"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
                required
              />
            </div>

            {/* Group assignment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">دسته و گروه مشتری *</label>
                <button
                  type="button"
                  onClick={() => {
                    openNewGroupForm();
                    setIsGroupModalOpen(true);
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                >
                  + ایجاد گروه جدید
                </button>
              </div>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="">بدون گروه (عمومی)</option>
                {partyGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.description ? `(${g.description})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام شرکت / دکان</label>
                <input
                  type="text"
                  placeholder="شرکت تجارتی برکت"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره تماس (کلید اتصال ربات تلگرام) *
                </label>
                <input
                  type="text"
                  placeholder="۰۷۹۹۱۲۳۴۵۶"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Telegram Chat ID linking */}
            <div className="p-2.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-600 -rotate-45" />
                  <span>شناسه چت تلگرام (Chat ID):</span>
                  {telegramChatId ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                      ✓ متصل به ربات
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      (با ارسال شماره توسط مشتری در ربات، خودکار وصل می‌شود)
                    </span>
                  )}
                </div>
              </div>
              <input
                type="text"
                placeholder="ثبت خودکار یا دستی"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                className="w-40 px-2.5 py-1.5 bg-white border border-sky-300 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع رابطه تجاری</label>
                <select
                  value={partyType}
                  onChange={e => setPartyType(e.target.value as PartyType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                >
                  <option value="customer">مشتری (خریدار)</option>
                  <option value="supplier">فروشنده (تأمین‌کننده)</option>
                  <option value="both">مشتری و فروشنده (دوطرفه)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">آدرس / موقعیت</label>
                <input
                  type="text"
                  placeholder="کابل، سرای شهزاده یا شهر نو"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Starting Balances */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                تعیین مانده حساب اولیه (اول دوره):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* AFN */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700">افغانی (AFN)</label>
                    <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAfnType('debtor')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          afnType === 'debtor'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        بدهکار
                      </button>
                      <button
                        type="button"
                        onClick={() => setAfnType('creditor')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          afnType === 'creditor'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        طلبکار
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={initialBalanceAFN || ''}
                    onChange={e => setInitialBalanceAFN(Math.abs(parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 text-left focus:bg-white focus:outline-none"
                  />
                </div>

                {/* USD */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700">دلاری (USD) $</label>
                    <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setUsdType('debtor')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          usdType === 'debtor'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        بدهکار
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsdType('creditor')}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          usdType === 'creditor'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        طلبکار
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={initialBalanceUSD || ''}
                    onChange={e => setInitialBalanceUSD(Math.abs(parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 text-left focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="توضیحات تکمیلی یا شرایط اعتبار..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {editingParty ? 'ذخیره تغییرات' : 'افزودن حساب'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. GROUP MANAGEMENT MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">مدیریت گروه‌ها و دسته‌بندی مشتریان</h3>
                  <p className="text-xs text-slate-500">تعریف گروه‌های جغرافیایی یا صنفی (مثلاً مشتریان شهر نو، ولایات و...)</p>
                </div>
              </div>
              <button
                id="group-form-modal-close-btn"
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                title="بستن فرم (ESC)"
              >
                <X className="w-4 h-4" />
                <span>بستن (ESC)</span>
              </button>
            </div>

            {/* Create/Edit Form */}
            <form onSubmit={handleSaveGroup} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>{editingGroup ? `ویرایش گروه: ${editingGroup.name}` : 'تعریف گروه جدید'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نام گروه *</label>
                  <input
                    type="text"
                    placeholder="مثلاً: مشتریان شهر نو"
                    value={groupNameInput}
                    onChange={e => setGroupNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رنگ نشان (Badge)</label>
                  <select
                    value={groupColorInput}
                    onChange={e => setGroupColorInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="emerald">سبز زمردی (Emerald)</option>
                    <option value="blue">آبی (Blue)</option>
                    <option value="amber">طلایی / خردلی (Amber)</option>
                    <option value="purple">بنفش (Purple)</option>
                    <option value="rose">گلبهی / سرخ (Rose)</option>
                    <option value="cyan">فیروزه‌ای (Cyan)</option>
                    <option value="indigo">نیلی (Indigo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">توضیحات یا منطقه جغرافیایی</label>
                <input
                  type="text"
                  placeholder="توضیح کوتاه درباره این گروه..."
                  value={groupDescInput}
                  onChange={e => setGroupDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingGroup && (
                  <button
                    type="button"
                    onClick={openNewGroupForm}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    انصراف از ویرایش
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {editingGroup ? 'ذخیره تغییرات گروه' : '+ افزودن این گروه'}
                </button>
              </div>
            </form>

            {/* Existing Groups List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="text-xs font-bold text-slate-700">گروه‌های موجود در سیستم ({partyGroups.length}):</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {partyGroups.map(grp => {
                  const partyCount = parties.filter(p => p.groupId === grp.id).length;
                  const colorMeta = GROUP_COLOR_MAP[grp.color || 'emerald'] || GROUP_COLOR_MAP.emerald;

                  return (
                    <div key={grp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${colorMeta.pill} shrink-0`}></span>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>{grp.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                              {partyCount} نفر
                            </span>
                          </div>
                          {grp.description && <div className="text-[11px] text-slate-400 mt-0.5">{grp.description}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditGroupForm(grp)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="ویرایش نام گروه"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteGroup(grp.id, grp.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="حذف گروه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                تأیید و بازگشت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
