import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Party, PartyType, Currency } from '../types';
import { X, UserPlus, Building, Phone, MapPin, DollarSign, Users, Check, AlertCircle } from 'lucide-react';

interface QuickAddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartyCreated?: (newParty: Party) => void;
  onPartyAdded?: (newParty: Party) => void;
  onSuccess?: (newParty: Party) => void;
  defaultType?: PartyType;
  initialType?: PartyType | string;
  defaultCurrency?: Currency;
}

export const QuickAddPartyModal: React.FC<QuickAddPartyModalProps> = ({
  isOpen,
  onClose,
  onPartyCreated,
  onPartyAdded,
  onSuccess,
  defaultType,
  initialType,
  defaultCurrency = 'AFN',
}) => {
  const effectiveType = (defaultType || initialType || 'customer') as PartyType;
  const { addParty, partyGroups, addPartyGroup } = useAccounting();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<PartyType>(effectiveType);
  const [groupId, setGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [balanceAFN, setBalanceAFN] = useState<number>(0);
  const [afnType, setAfnType] = useState<'debtor' | 'creditor'>('debtor');
  const [balanceUSD, setBalanceUSD] = useState<number>(0);
  const [usdType, setUsdType] = useState<'debtor' | 'creditor'>('debtor');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNotifyCreated = (p: Party) => {
    if (onPartyCreated) onPartyCreated(p);
    if (onPartyAdded) onPartyAdded(p);
    if (onSuccess) onSuccess(p);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('لطفاً نام شخص یا مشتری را وارد کنید');
      return;
    }

    let finalGroupId = groupId;
    let finalGroupName = '';

    if (isAddingNewGroup && newGroupName.trim()) {
      const createdGroup = addPartyGroup({
        name: newGroupName.trim(),
        description: 'ایجاد شده از ثبت سریع',
      });
      finalGroupId = createdGroup.id;
      finalGroupName = createdGroup.name;
    } else if (groupId) {
      const g = partyGroups.find(grp => grp.id === groupId);
      if (g) finalGroupName = g.name;
    }

    const finalAfn = balanceAFN === 0 ? 0 : afnType === 'debtor' ? -Math.abs(balanceAFN) : Math.abs(balanceAFN);
    const finalUsd = balanceUSD === 0 ? 0 : usdType === 'debtor' ? -Math.abs(balanceUSD) : Math.abs(balanceUSD);

    const createdParty = addParty({
      name: name.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || '---',
      address: address.trim() || undefined,
      type,
      groupId: finalGroupId || undefined,
      groupName: finalGroupName || undefined,
      balanceAFN: finalAfn,
      balanceUSD: finalUsd,
      initialBalanceAFN: finalAfn,
      initialBalanceUSD: finalUsd,
      notes: notes.trim() || undefined,
    });

    // Reset and notify parent
    setName('');
    setCompany('');
    setPhone('');
    setAddress('');
    setBalanceAFN(0);
    setAfnType('debtor');
    setBalanceUSD(0);
    setUsdType('debtor');
    setNotes('');
    setError('');
    handleNotifyCreated(createdParty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">ثبت سریع مشتری / طرف حساب جدید</h2>
              <p className="text-[11px] text-blue-150 text-blue-100">
                افزودن حساب بدون خروج از صفحه و انتخاب خودکار در فاکتور
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Party Type selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">نقش طرف حساب</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType('customer')}
                className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  type === 'customer'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                خریدار / مشتری
              </button>
              <button
                type="button"
                onClick={() => setType('supplier')}
                className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  type === 'supplier'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فروشنده / تأمین‌کننده
              </button>
              <button
                type="button"
                onClick={() => setType('both')}
                className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  type === 'both'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                هر دو (مشتری و تأمین‌کننده)
              </button>
            </div>
          </div>

          {/* Name & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                نام و شهرت طرف حساب <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثلاً حاجی نعیم الله غزنوی"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-900 font-bold outline-none"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">نام شرکت / حجره / دکان</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="مثلاً شرکت تجارتی برادران غزنوی"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Phone & Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">شماره تماس / واتساپ</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0799000000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 text-slate-900 font-mono outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">دسته‌بندی / گروه</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewGroup(!isAddingNewGroup)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >
                  {isAddingNewGroup ? 'انتخاب از لیست' : '+ گروه جدید'}
                </button>
              </div>

              {isAddingNewGroup ? (
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="نام گروه جدید (مثلاً مشتریان کابل)"
                  className="w-full px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl focus:bg-white text-slate-900 outline-none"
                />
              ) : (
                <select
                  value={groupId}
                  onChange={e => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none"
                >
                  <option value="">بدون گروه مشخص</option>
                  {partyGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Initial Balances (Opening Balances) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              تعیین مانده حساب اول دوره (قبل از فاکتور فعلی):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* AFN */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-slate-700 font-bold">
                    افغانی (AFN ؋)
                  </label>
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
                  value={balanceAFN || ''}
                  onChange={e => setBalanceAFN(Math.abs(parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-emerald-500 text-slate-900 font-mono font-bold text-left outline-none focus:bg-white"
                />
              </div>

              {/* USD */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-slate-700 font-bold">
                    دلاری (USD $)
                  </label>
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
                  value={balanceUSD || ''}
                  onChange={e => setBalanceUSD(Math.abs(parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 text-slate-900 font-mono font-bold text-left outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Address & City */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">آدرس / موقعیت دکان یا دفتر</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="مثلاً کابل، سرای شاهزاده یا هرات، چوک گلها"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">یادداشت و توضیحات اضافی</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثلاً معرف: حاجی احمد، شماره ثبت تجارتی و غیره"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ثبت و انتخاب طرف حساب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
