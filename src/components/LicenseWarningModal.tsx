import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  KeyRound,
  ShieldAlert,
  X,
  Laptop,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import {
  LicenseStatusResult,
  applyActivationCode,
  markDailyAlertShown,
  markHourlyAlertShown,
  getMachineFingerprint,
} from '../utils/licenseSecurity';

interface LicenseWarningModalProps {
  status: LicenseStatusResult;
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  onOpenSecretModal: () => void;
}

export const LicenseWarningModal: React.FC<LicenseWarningModalProps> = ({
  status,
  isOpen,
  onClose,
  onActivated,
  onOpenSecretModal,
}) => {
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedMachine, setCopiedMachine] = useState(false);

  if (!isOpen) return null;

  const machineCode = getMachineFingerprint();
  const isFinalDay = status.daysRemaining <= 1 || status.hoursRemaining <= 24;

  const handleDismiss = () => {
    if (status.shouldShowDailyAlert) {
      markDailyAlertShown();
    }
    if (status.shouldShowHourlyAlert) {
      markHourlyAlertShown();
    }
    onClose();
  };

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
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در بررسی کد فعال‌سازی.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        className="bg-white border-2 border-amber-300 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right"
        dir="rtl"
      >
        {/* Header */}
        <div
          className={`px-6 py-4.5 text-white flex items-center justify-between ${
            isFinalDay ? 'bg-rose-700' : 'bg-amber-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {isFinalDay
                  ? 'هشدار فوری: پایان مهلت استفاده از برنامه امروز!'
                  : 'یادآوری فعال‌سازی و تمدید لایسنس نرم‌افزار'}
              </h3>
              <p className="text-[11px] text-white/90 mt-0.5">
                {isFinalDay
                  ? `تنها ${status.hoursRemaining} ساعت تا توقف کامل سیستم باقی مانده است.`
                  : `تنها ${status.daysRemaining} روز از دوره استفاده باقی مانده است.`}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-black/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                تاریخ انقضای نرم‌افزار: {status.expiryDateFormatted}
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11.5px]">
              برای جلوگیری از توقف کارکرد سیستم حسابداری و انسداد فرم‌ها، لطفاً در اسرع وقت نسبت به تمدید یا فعال‌سازی لایسنس دائمی اقدام فرمایید.
            </p>
          </div>

          {/* Machine Code Box */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-slate-600 shrink-0" />
              <div>
                <span className="text-[10.5px] text-slate-500 block font-bold">شناسه سیستم شما:</span>
                <span className="font-mono font-black text-xs text-slate-900">{machineCode}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyMachine}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedMachine ? 'کپی شد' : 'کپی شناسه'}</span>
            </button>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleApplyCode} className="space-y-2.5 pt-1">
            <label className="font-bold text-slate-800 block text-xs">
              کد فعال‌سازی دریافتی از پشتیبانی را اینجا وارد کنید:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={activationCodeInput}
                onChange={e => {
                  setActivationCodeInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="LIC-365-XXXX-YYYY-ZZZZ"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 text-center tracking-widest uppercase"
              />
              <button
                type="submit"
                disabled={isApplying || !activationCodeInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isApplying ? 'بررسی...' : 'فعال‌سازی'}</span>
              </button>
            </div>
          </form>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              onOpenSecretModal();
            }}
            className="text-slate-500 hover:text-slate-800 text-[11px] font-bold underline cursor-pointer"
          >
            ورود سازنده نرم‌افزار با رمز فوق‌محرمانه
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            متوجه شدم (ادامه کار با برنامه)
          </button>
        </div>
      </div>
    </div>
  );
};
