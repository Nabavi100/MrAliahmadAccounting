import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  RefreshCw,
  Sparkles,
  Save,
  X,
  Laptop,
} from 'lucide-react';
import {
  AppLicenseData,
  LicenseMode,
  LicenseStatusResult,
  verifyLicense,
  updateLicenseSettings,
  generateActivationCode,
  getMachineFingerprint,
} from '../utils/licenseSecurity';
import { verifyLicenseMasterPin } from '../utils/securityMaster';

interface SecretLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseUpdated?: () => void;
}

export const SecretLicenseModal: React.FC<SecretLicenseModalProps> = ({
  isOpen,
  onClose,
  onLicenseUpdated,
}) => {
  // Authentication gate inside modal
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Form states
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<LicenseMode>('trial_1m');
  const [customDays, setCustomDays] = useState<number>(30);
  const [clientName, setClientName] = useState<string>('');
  const [newMasterPin, setNewMasterPin] = useState<string>('');
  const [confirmMasterPin, setConfirmMasterPin] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Key generator helper state
  const [genDays, setGenDays] = useState<number>(30);
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMachine, setCopiedMachine] = useState(false);

  const loadStatus = async () => {
    const res = await verifyLicense();
    setLicenseStatus(res);
    setSelectedMode(res.license.mode);
    setClientName(res.license.clientName);
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setPinInput('');
      setPinError('');
      setActionSuccessMsg('');
      setIsUnlocked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!licenseStatus) return;

    if (verifyLicenseMasterPin(pinInput, licenseStatus.license.masterPin)) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('رمز عبور فوق محرمانه اشتباه است!');
    }
  };

  const handleSaveLicenseSettings = async () => {
    setIsSaving(true);
    setActionSuccessMsg('');
    try {
      if (newMasterPin && newMasterPin !== confirmMasterPin) {
        alert('تکرار رمز محرمانه جدید مطابقت ندارد.');
        setIsSaving(false);
        return;
      }

      await updateLicenseSettings(
        selectedMode,
        clientName,
        selectedMode === 'custom' ? customDays : undefined,
        undefined,
        newMasterPin ? newMasterPin.trim() : undefined
      );

      await loadStatus();
      setActionSuccessMsg('تنظیمات لایسنس و محدودیت زمانی با موفقیت ثبت و امضای امنیتی صادر شد.');
      if (onLicenseUpdated) onLicenseUpdated();
      setNewMasterPin('');
      setConfirmMasterPin('');
    } catch (err: any) {
      alert('خطا در ذخیره لایسنس: ' + err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    const machine = getMachineFingerprint();
    const key = await generateActivationCode(machine, genDays);
    setGeneratedKey(key);
  };

  const handleCopy = (text: string, type: 'key' | 'machine') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedMachine(true);
      setTimeout(() => setCopiedMachine(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div
        className="bg-white border-2 border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-right flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <span>پنل فوق‌محرمانه مدیریت لایسنس و محدودیت زمانی برنامه</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  ضد دستکاری (Tamper-Proof)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تعریف مهلت کارکرد، نسخه آزمایشی، لایسنس سالانه و تنظیم هشدارهای انقضا
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          {!isUnlocked ? (
            /* PIN GATE VIEW */
            <div className="py-8 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 mb-1">
                  ورود به بخش محرمانه سازنده نرم‌افزار
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  این بخش مختص مالک اصلی و سازنده نرم‌افزار است تا محدودیت استفاده را اعمال نماید.
                  برای ورود لطفاً رمز عبور فوق‌محرمانه را وارد نمایید.
                </p>
              </div>

              <form onSubmit={handleVerifyPin} className="space-y-3 pt-2">
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    value={pinInput}
                    onChange={e => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    placeholder="رمز فوق‌محرمانه..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-sm font-mono font-bold text-slate-900 tracking-widest outline-none focus:ring-2 focus:ring-slate-800 focus:bg-white"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {pinError && (
                  <p className="text-rose-600 text-xs font-bold flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}

                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>تأیید و ورود</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* UNLOCKED MANAGEMENT DASHBOARD */
            <div className="space-y-5">
              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Current Status Box */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span>وضعیت فعلی لایسنس:</span>
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      licenseStatus?.isUnlimited
                        ? 'bg-emerald-100 text-emerald-800'
                        : licenseStatus?.isExpired
                        ? 'bg-rose-100 text-rose-800'
                        : licenseStatus?.daysRemaining && licenseStatus.daysRemaining <= 7
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {licenseStatus?.statusText}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11.5px]">
                  <div>
                    <span className="text-slate-500">تاریخ انقضا: </span>
                    <strong className="text-slate-800 font-bold">
                      {licenseStatus?.expiryDateFormatted}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">روزهای باقی‌مانده: </span>
                    <strong className="text-slate-800 font-bold">
                      {licenseStatus?.isUnlimited ? 'نامحدود' : `${licenseStatus?.daysRemaining} روز`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">یکپارچگی و ضد دستکاری: </span>
                    <strong
                      className={`font-bold ${
                        licenseStatus?.isTampered ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {licenseStatus?.isTampered ? '⚠️ مخدوش (دستکاری شده)' : '✓ تایید شده و رمزنگاری‌شده'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">کنترل ساعت سیستم: </span>
                    <strong
                      className={`font-bold ${
                        licenseStatus?.isClockRolledBack ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {licenseStatus?.isClockRolledBack ? '⚠️ ساعت دستکاری شده' : '✓ نرمال'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Machine Fingerprint Box */}
              <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-700 shrink-0" />
                  <div>
                    <span className="text-[11px] text-blue-900 font-bold block">
                      شناسه اختصاصی این کامپیوتر (Machine Code):
                    </span>
                    <span className="font-mono font-black text-xs text-blue-950">
                      {getMachineFingerprint()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(getMachineFingerprint(), 'machine')}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedMachine ? 'کپی شد' : 'کپی شناسه'}</span>
                </button>
              </div>

              {/* License Limitation Mode Selection */}
              <div className="space-y-3">
                <label className="font-bold text-slate-900 text-xs block">
                  انتخاب نوع و مهلت کارکرد برنامه (تعریف لیمیت):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('trial_1m')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'trial_1m'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">۱ ماه آزمایشی</span>
                    <span className="text-[10px] opacity-80 mt-1">۳۰ روز مهلت استفاده</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('trial_3m')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'trial_3m'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">۳ ماه مهلت</span>
                    <span className="text-[10px] opacity-80 mt-1">۹۰ روز کارکرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('trial_6m')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'trial_6m'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">۶ ماه مهلت</span>
                    <span className="text-[10px] opacity-80 mt-1">۱۸۰ روز کارکرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('trial_1y')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'trial_1y'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">۱ سال اعتبار</span>
                    <span className="text-[10px] opacity-80 mt-1">۳۶۵ روز کارکرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('custom')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'custom'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">مهلت دلخواه</span>
                    <span className="text-[10px] opacity-80 mt-1">تعداد روز سفارشی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('unlimited')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedMode === 'unlimited'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    <span className="font-bold text-xs">دائمی (نامحدود)</span>
                    <span className="text-[10px] opacity-80 mt-1">بدون قفل و تاریخ انقضا</span>
                  </button>
                </div>

                {selectedMode === 'custom' && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-950">تعداد روز مهلت:</span>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={customDays}
                      onChange={e => setCustomDays(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-bold font-mono text-center outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs text-amber-900">روز از زمان ذخیره</span>
                  </div>
                )}
              </div>

              {/* Rules Description (Exactly matching user requirement) */}
              <div className="bg-slate-100 p-3.5 rounded-2xl space-y-1.5 text-[11px] text-slate-600 leading-relaxed border border-slate-200">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>قوانین رفتاری هوشمند سیستم لایسنس:</span>
                </span>
                <ul className="list-disc list-inside space-y-1 pr-1 text-slate-600">
                  <li>
                    <strong>هفته پایانی مهلت:</strong> در ۷ روز آخر، صرفاً در <strong>اولین مرتبه باز کردن برنامه در روز</strong> پیغام فعال‌سازی و تعداد روز باقی‌مانده نمایش می‌یابد تا مزاحم کار نشود.
                  </li>
                  <li>
                    <strong>روز آخر مهلت (۲۴ ساعت پایانی):</strong> در روز پایانی، هشدار فعال‌سازی <strong>هر یک ساعت یک‌بار</strong> تکرار می‌شود.
                  </li>
                  <li>
                    <strong>پایان مهلت:</strong> پس از اتمام تاریخ، کلیه بخش‌ها مسدود شده و صفحه قفل لایسنس نمایان می‌شود.
                  </li>
                  <li>
                    <strong>حفاظت در برابر برنامه‌نویس/دستکاری:</strong> دیتای لایسنس به همراه هش رمزنگاری‌شده ذخیره می‌شود و در صورت تغییر مستقیم مقادیر در مرورگر، لایسنس مخدوش شده و اجازه عبور نخواهد داد.
                  </li>
                </ul>
              </div>

              {/* Client Name & Master PIN Change Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    نام صاحب لایسنس / مشتری:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="مثلاً: شرکت بازرگانی نبوی"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    تغییر رمز فوق‌محرمانه این پنل:
                  </label>
                  <input
                    type="password"
                    value={newMasterPin}
                    onChange={e => setNewMasterPin(e.target.value)}
                    placeholder="در صورت تمایل به تغییر رمز وارد کنید..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 font-mono"
                  />
                </div>
              </div>

              {newMasterPin && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    تکرار رمز فوق‌محرمانه جدید:
                  </label>
                  <input
                    type="password"
                    value={confirmMasterPin}
                    onChange={e => setConfirmMasterPin(e.target.value)}
                    placeholder="تکرار رمز جدید..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 font-mono"
                  />
                </div>
              )}

              {/* Offline Key Generator for Super Admin */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  تولید کلید فعال‌سازی آفلاین برای این سیستم (ویژه سازنده نرم‌افزار):
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={genDays}
                    onChange={e => setGenDays(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value={30}>۳۰ روزه (۱ ماه)</option>
                    <option value={90}>۹۰ روزه (۳ ماه)</option>
                    <option value={180}>۱۸۰ روزه (۶ ماه)</option>
                    <option value={365}>۳۶۵ روزه (۱ سال)</option>
                    <option value={9999}>دائمی و نامحدود</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>تولید کد فعال‌سازی</span>
                  </button>
                </div>

                {generatedKey && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between gap-2 mt-2">
                    <span className="font-mono font-black text-xs text-emerald-900 select-all">
                      {generatedKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedKey, 'key')}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey ? 'کپی شد' : 'کپی کد'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {isUnlocked && (
          <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-xl transition cursor-pointer"
            >
              بستن پنجره
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveLicenseSettings}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'در حال ثبت و صدور امضا...' : 'ثبت و اعمال فوری لایسنس'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
