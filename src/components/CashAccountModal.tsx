import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { CashRegisterAccount, Currency } from '../types';
import { X, Save, Wallet, Building, DollarSign } from 'lucide-react';

interface CashAccountModalProps {
  accountToEdit?: CashRegisterAccount | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CashAccountModal: React.FC<CashAccountModalProps> = ({
  accountToEdit,
  isOpen,
  onClose,
}) => {
  const { addCashAccount, updateCashAccount } = useAccounting();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [type, setType] = useState<'cash' | 'exchange' | 'bank' | 'other'>('cash');
  const [balance, setBalance] = useState<number>(0);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState('');
  const [location, setLocation] = useState('دفتر کابل');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setCurrency(accountToEdit.currency);
      setType(accountToEdit.type || 'cash');
      setBalance(accountToEdit.balance);
      setInitialBalance(accountToEdit.initialBalance !== undefined ? accountToEdit.initialBalance : accountToEdit.balance);
      setAccountNumber(accountToEdit.accountNumber || '');
      setLocation(accountToEdit.location || 'دفتر کابل');
      setNotes(accountToEdit.notes || '');
    } else {
      setName('');
      setCurrency('USD');
      setType('cash');
      setBalance(0);
      setInitialBalance(0);
      setAccountNumber('');
      setLocation('دفتر کابل');
      setNotes('');
    }
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (accountToEdit) {
      updateCashAccount(accountToEdit.id, {
        name: name.trim(),
        currency,
        type,
        balance,
        initialBalance,
        accountNumber: accountNumber.trim(),
        location: location.trim(),
        notes: notes.trim(),
      });
    } else {
      addCashAccount({
        name: name.trim(),
        currency,
        type,
        balance,
        initialBalance,
        accountNumber: accountNumber.trim() || `CR-${Math.floor(100 + Math.random() * 900)}`,
        location: location.trim(),
        notes: notes.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">
                {accountToEdit ? 'ویرایش اطلاعات صندوق' : 'تعریف صندوق / حساب نقدی جدید'}
              </h2>
              <p className="text-xs text-slate-400">ثبت مشخصات صندوق، ارز پایه و موجودی نقدی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نام صندوق یا حساب نقدی <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثلاً: صندوق شعبه مزار، صندوق ارزی هرات، گاوصندوق اصلی..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">واحد پولی صندوق</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="USD">دالر آمریکا ($ - USD)</option>
                <option value="AFN">افغانی (؋ - AFN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوعیت کاربری</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="cash">صندوق نقدی شرکت</option>
                <option value="exchange">صندوق صرافی و تبادله</option>
                <option value="bank">حساب بانکی / حواله</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                موجودی اولیه (افتتاحیه واقعی)
              </label>
              <input
                type="number"
                step="any"
                value={initialBalance}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setInitialBalance(val);
                  if (!accountToEdit) setBalance(val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">مانده زمان شروع دوره مالی</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                موجودی فعلی (مانده جاری صندوق)
              </label>
              <input
                type="number"
                step="any"
                value={balance}
                onChange={e => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">مانده نقدی زنده موجود در گاوصندوق</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره حساب / کد گاوصندوق</label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="مثلاً: SAFE-01, AIB-984..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 text-left outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">موقعیت فیزیکی / شعبه</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="مثلاً: سرای شهزاده کابل، گدام مرکزی..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و یادداشت</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی پیرامون دسترسی، صندوق‌دار و غیره..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{accountToEdit ? 'ذخیره تغییرات' : 'ثبت و ایجاد صندوق'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
