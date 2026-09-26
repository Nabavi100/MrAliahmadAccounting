import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
  LicenseStatusResult,
  applyActivationCode,
  getMachineFingerprint,
} from '../utils/licenseSecurity';

interface LicenseLockScreenProps {
  status: LicenseStatusResult;
  onActivated: () => void;
  onOpenSecretModal: () => void;
}

export const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({
  status,
  onActivated,
  onOpenSecretModal,
}) => {
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedMachine, setCopiedMachine] = useState(false);

  const machineCode = getMachineFingerprint();

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCodeInput.trim()) return;

    setIsApplying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await applyActivationCode(activationCodeInput);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          onActivated();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در فعال‌سازی نرم‌افزار.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopyMachine = () => {
    navigator.clipboard.writeText(machineCode);
    setCopiedMachine(true);
    setTimeout(() => setCopiedMachine(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white flex items-center justify-center p-4 select-none overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-right space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {status.isTampered
                ? 'خطای امنیتی: دستکاری غیرمجاز در لایسنس سیستم'
                : status.isClockRolledBack
                ? 'خطای امنیتی: عدم تطابق ساعت و تاریخ رایانه'
                : 'مهلت استفاده از نرم‌افزار به پایان رسیده است'}
            </h2>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              {status.isTampered
                ? 'یکپارچگی فایل‌های امنیتی مخدوش گردیده است. سیستم جهت حفظ امنیت پایگاه داده قفل شد.'
                : status.isClockRolledBack
                ? 'ساعت یا تاریخ کامپیوتر به عقب کشیده شده است. لطفاً تاریخ صحیح را تنظیم فرمایید.'
                : 'دوره کارکرد آزمایشی یا مهلت سالانه این نرم‌افزار منقضی شده و دسترسی به اطلاعات موقتاً مسدود می‌باشد.'}
            </p>
          </div>
        </div>

        {/* Machine info */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <Laptop className="w-4 h-4 text-slate-300" />
              <span>شناسه اختصاصی این کامپیوتر:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyMachine}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedMachine ? 'کپی شد' : 'کپی شناسه'}</span>
            </button>
          </div>
          <div className="font-mono text-center text-sm font-black tracking-widest text-amber-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 select-all">
            {machineCode}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed text-center">
            شناسه فوق را به پشتیبان یا برنامه‌نویس ارسال کنید تا کد فعال‌سازی یا تمدید مهلت را دریافت نمایید.
          </p>
        </div>

        {/* Activation Key Form */}
        <form onSubmit={handleApplyCode} className="space-y-3">
          <label className="text-xs font-bold text-slate-200 block">
            ورود کد فعال‌سازی نرم‌افزار:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={activationCodeInput}
              onChange={e => {
                setActivationCodeInput(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="LIC-365-XXXX-YYYY-ZZZZ"
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs font-bold text-white outline-none focus:ring-2 focus:ring-rose-500 text-center tracking-widest uppercase"
            />
            <button
              type="submit"
              disabled={isApplying || !activationCodeInput.trim()}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isApplying ? 'در حال فعال‌سازی...' : 'فعال‌سازی نرم‌افزار'}</span>
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl font-bold text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Bottom secret unlock for super-admin/developer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onOpenSecretModal}
            className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ورود سازنده با رمز فوق‌محرمانه (تنظیم لیمیت یا لایسنس دائم)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
