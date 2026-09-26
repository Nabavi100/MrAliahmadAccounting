import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { AppUser, UserRole, CompanySettings } from '../types';
import { CompanyStampSeal } from './CompanyStampSeal';
import { SignatureAndSealModal } from './SignatureAndSealModal';
import { GoogleDriveBackupPanel } from './GoogleDriveBackupPanel';
import { SecretLicenseModal } from './SecretLicenseModal';
import { TelegramBotModal } from './TelegramBotModal';
import { verifyProtectionLockPassword, verifyMasterSecurityPassword } from '../utils/securityMaster';
import {
  Shield,
  RotateCcw,
  Users,
  KeyRound,
  Lock,
  Unlock,
  ShieldAlert,
  Eye,
  EyeOff,
  Download,
  Upload,
  HardDrive,
  Cloud,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  UserCheck,
  ShieldCheck,
  Building,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  X,
  Image as ImageIcon,
  Phone,
  MapPin,
  Mail,
  FileText,
  Printer,
  Sparkles,
  Calendar,
  Stamp,
  PenTool,
  Send,
  Bot,
  Activity,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  TelegramSettings,
  TelegramSubscriber,
  TelegramLogEntry,
  getTelegramSettings,
  saveTelegramSettings,
  getSubscribersList,
  getTelegramLogs,
  clearTelegramLogs,
  isTelegramListenerRunning,
  sanitizeTelegramBotToken,
} from '../services/telegramBotService';
import { testTelegramBotConnection, saveTelegramConfig } from '../services/telegramApiService';
import { verifyLicenseMasterPin } from '../utils/securityMaster';
import { verifyLicense } from '../utils/licenseSecurity';

interface AccessAndResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'company' | 'roles' | 'reset' | 'backup' | 'telegram';
}

export const AccessAndResetModal: React.FC<AccessAndResetModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'company',
}) => {
  const {
    companySettings,
    updateCompanySettings,
    resetCompanySettings,
    appFontSize,
    setAppFontSize,
    fontSizeNumber,
    setFontSizeNumber,
    users,
    currentUser,
    setCurrentUser,
    addUser,
    updateUser,
    deleteUser,
    resetToDemoData,
    resetNewFinancialYear,
    resetWipeCleanAll,
    exportJSON,
    importJSON,
    logout,
  } = useAccounting();

  const [activeSubTab, setActiveSubTab] = useState<'company' | 'roles' | 'reset' | 'backup' | 'telegram'>(initialTab);

  // Telegram Bot Secret Settings State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isTgTabUnlocked, setIsTgTabUnlocked] = useState(false);
  const [tgPinInput, setTgPinInput] = useState('');
  const [tgPinError, setTgPinError] = useState('');
  const [showTgPin, setShowTgPin] = useState(false);
  const [showTgToken, setShowTgToken] = useState(false);
  const [tgSettings, setTgSettings] = useState<TelegramSettings>(getTelegramSettings());
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{
    success?: boolean;
    botName?: string;
    username?: string;
    error?: string;
  } | null>(null);
  const [tgSavedSuccess, setTgSavedSuccess] = useState(false);
  const [tgSubscribers, setTgSubscribers] = useState<TelegramSubscriber[]>([]);
  const [tgLogs, setTgLogs] = useState<TelegramLogEntry[]>([]);
  const [configuredMasterPin, setConfiguredMasterPin] = useState<string | undefined>();

  // Company Settings Form State
  const [compForm, setCompForm] = useState<CompanySettings>(companySettings);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSecretLicenseModalOpen, setIsSecretLicenseModalOpen] = useState(false);

  // Security Protection & Lock State for Company Branding / Settings
  const [isCompanyUnlocked, setIsCompanyUnlocked] = useState<boolean>(() => !companySettings.isProtected);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isChangingProtectionPassword, setIsChangingProtectionPassword] = useState(false);
  const [currentMasterPasswordInput, setCurrentMasterPasswordInput] = useState('');
  const [newProtectionPassword, setNewProtectionPassword] = useState('');
  const [confirmProtectionPassword, setConfirmProtectionPassword] = useState('');
  const [protectionPasswordError, setProtectionPasswordError] = useState('');
  const [showCurrentMasterPassword, setShowCurrentMasterPassword] = useState(false);
  const [showNewProtectionPassword, setShowNewProtectionPassword] = useState(false);

  // When modal is opened or protection status changes, lock accordingly
  useEffect(() => {
    if (companySettings.isProtected) {
      setIsCompanyUnlocked(false);
      setUnlockPasswordInput('');
      setUnlockError('');
    } else {
      setIsCompanyUnlocked(true);
    }
  }, [isOpen, companySettings.isProtected]);

  useEffect(() => {
    if (isOpen) {
      setTgSettings(getTelegramSettings());
      setTgSubscribers(getSubscribersList());
      setTgLogs(getTelegramLogs());
      setTgPinInput('');
      setTgPinError('');
      setTgTestResult(null);
      setTgSavedSuccess(false);
      verifyLicense()
        .then(res => {
          setConfiguredMasterPin(res.license?.masterPin);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const isCompanyLocked = Boolean(compForm.isProtected && !isCompanyUnlocked);

  const handleUnlockCompanySettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const adminUser = users.find(u => u.role === 'admin');
    const customPassword = compForm.protectionPassword || companySettings.protectionPassword;

    if (verifyProtectionLockPassword(unlockPasswordInput, customPassword, adminUser?.password)) {
      setIsCompanyUnlocked(true);
      setUnlockError('');
      setSaveSuccessMessage('قفل امنیتی با موفقیت باز شد. اکنون مجاز به ویرایش مشخصات، نام و لوگوی شرکت هستید.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } else {
      setUnlockError('رمز عبور امنیتی اشتباه است! لطفاً رمز صحیح حفاظتی را وارد نمایید.');
    }
  };

  const handleLockCompanyImmediately = () => {
    setIsCompanyUnlocked(false);
    setUnlockPasswordInput('');
    setUnlockError('');
    setIsChangingProtectionPassword(false);
    setCurrentMasterPasswordInput('');
    setNewProtectionPassword('');
    setConfirmProtectionPassword('');
    setProtectionPasswordError('');
    setSaveSuccessMessage('مشخصات شرکت مجدداً با رمز عبور قفل گردید.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleToggleProtection = () => {
    if (compForm.isProtected) {
      if (!isCompanyUnlocked) {
        setUnlockError('برای غیرفعال کردن حفاظت، ابتدا باید قفل را با وارد کردن رمز باز کنید.');
        return;
      }
      const updated: CompanySettings = {
        ...compForm,
        isProtected: false,
      };
      setCompForm(updated);
      updateCompanySettings(updated);
      setIsCompanyUnlocked(true);
      setSaveSuccessMessage('قفل حفاظتی غیرفعال شد. اکنون تغییر مشخصات شرکت بدون رمز انجام می‌شود.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } else {
      const updated: CompanySettings = {
        ...compForm,
        isProtected: true,
        protectionPassword: compForm.protectionPassword || '',
      };
      setCompForm(updated);
      updateCompanySettings(updated);
      setIsCompanyUnlocked(true);
      setSaveSuccessMessage('دکمه حفاظتی با موفقیت فعال شد.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
  };

  const handleSaveNewProtectionPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setProtectionPasswordError('');

    // Step 1: Master authorization check - Strictly requires the Master Password of the program manager
    if (!currentMasterPasswordInput.trim()) {
      setProtectionPasswordError('ابتدا باید رمز اصلی مدیر برنامه وارد شود. بدون اجازه مدیر تغییری اعمال نمی‌شود.');
      return;
    }

    // Verify against the confidential master key of the program manager
    const isMasterAuthorized = verifyMasterSecurityPassword(currentMasterPasswordInput.trim());

    if (!isMasterAuthorized) {
      setProtectionPasswordError('رمز اصلی مدیر برنامه اشتباه است! بدون اجازه مدیر برنامه، ورود هرگونه تغییر در رمز حفاظتی مسدود است.');
      return;
    }

    // Step 2: New password validation
    if (!newProtectionPassword.trim()) {
      setProtectionPasswordError('لطفاً رمز عبور جدید را وارد فرمایید.');
      return;
    }

    if (newProtectionPassword.trim().length < 3) {
      setProtectionPasswordError('رمز عبور جدید باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    if (newProtectionPassword !== confirmProtectionPassword) {
      setProtectionPasswordError('تکرار رمز عبور جدید با آن همخوانی ندارد.');
      return;
    }

    const updated: CompanySettings = {
      ...compForm,
      isProtected: true,
      protectionPassword: newProtectionPassword.trim(),
    };
    setCompForm(updated);
    updateCompanySettings(updated);
    setIsChangingProtectionPassword(false);
    setCurrentMasterPasswordInput('');
    setNewProtectionPassword('');
    setConfirmProtectionPassword('');
    setProtectionPasswordError('');
    setIsCompanyUnlocked(true);
    setSaveSuccessMessage('رمز عبور حفاظتی با موفقیت و با تایید رمز اصلی مدیر برنامه ذخیره شد.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  useEffect(() => {
    setCompForm(companySettings);
  }, [companySettings]);

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Logo Upload to Base64
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompanyLocked) {
      alert('مشخصات شرکت قفل است. لطفاً ابتدا رمز عبور حفاظتی را در کادر بالای صفحه وارد کنید.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (1.5MB max)
    if (file.size > 1.5 * 1024 * 1024) {
      alert('حجم تصویر نباید بیشتر از ۱.۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setCompForm(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Stamp & Signature Upload and Dialog Handlers
  const [isDrawSignatureModalOpen, setIsDrawSignatureModalOpen] = useState(false);

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompanyLocked) {
      alert('مشخصات شرکت قفل است. لطفاً ابتدا رمز عبور حفاظتی را وارد کنید.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل مهر نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setCompForm(prev => ({ ...prev, stampUrl: base64, stampType: 'custom' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompanyLocked) {
      alert('مشخصات شرکت قفل است. لطفاً ابتدا رمز عبور حفاظتی را وارد کنید.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل امضا نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setCompForm(prev => ({ ...prev, signatureUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompanyLocked) {
      setUnlockError('مشخصات شرکت قفل است! برای ثبت هرگونه تغییر، ابتدا رمز حفاظتی را وارد فرمایید.');
      return;
    }
    updateCompanySettings(compForm);
    setSaveSuccessMessage('مشخصات شرکت و قالب چاپ فاکتورها با موفقیت ذخیره و در کل سیستم اعمال شد.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleResetCompanyToDefault = () => {
    if (isCompanyLocked) {
      setUnlockError('مشخصات شرکت قفل است. برای بازگردانی به پیش‌فرض، ابتدا قفل امنیتی را باز کنید.');
      return;
    }
    if (window.confirm('آیا مایلید مشخصات شرکت به مشخصات اصلی برادران نبوی بازگردد؟')) {
      resetCompanySettings();
      setSaveSuccessMessage('مشخصات شرکت به پیش‌فرض نبوی بازگردانده شد.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
  };

  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<UserRole>('accountant');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Password Management & User Switching
  const [changePasswordUser, setChangePasswordUser] = useState<AppUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showChangePasswordInput, setShowChangePasswordInput] = useState(false);
  const [switchUserTarget, setSwitchUserTarget] = useState<AppUser | null>(null);
  const [switchPasswordInput, setSwitchPasswordInput] = useState('');
  const [switchPasswordError, setSwitchPasswordError] = useState('');

  // Confirmation Modal for Resets
  const [confirmResetType, setConfirmResetType] = useState<
    'demo' | 'new_year' | 'wipe_clean' | null
  >(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [backupFileContent, setBackupFileContent] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const roleTitles: Record<UserRole, string> = {
      admin: 'مدیر کل و صاحب تجارت',
      accountant: 'مدیر مالی و حسابدار',
      warehouse_keeper: 'مدیر گدام و تحویل‌دار بار',
      cashier: 'صندوق‌دار و مسئول صرافی',
    };

    const avatarColors = [
      'bg-emerald-600',
      'bg-blue-600',
      'bg-purple-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-indigo-600',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    addUser({
      name: newUserName.trim(),
      username: newUserUsername.trim() || newUserName.trim().toLowerCase().replace(/\s+/g, '_'),
      password: newUserPassword.trim() || '123',
      role: newUserRole,
      roleTitle: roleTitles[newUserRole],
      phone: newUserPhone.trim() || '0799000000',
      avatarColor: randomColor,
      canResetData: newUserRole === 'admin',
      canDeleteRecords: newUserRole === 'admin',
      canChangeRates: newUserRole === 'admin' || newUserRole === 'accountant',
      canViewReports: newUserRole === 'admin' || newUserRole === 'accountant',
      canManageUsers: newUserRole === 'admin',
    });

    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserPhone('');
    setIsAddingUser(false);
  };

  const handleExecuteReset = () => {
    if (confirmResetType === 'demo') {
      resetToDemoData();
    } else if (confirmResetType === 'new_year') {
      resetNewFinancialYear();
    } else if (confirmResetType === 'wipe_clean') {
      resetWipeCleanAll();
    }
    setConfirmResetType(null);
    setConfirmInput('');
    onClose();
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hesabdar_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportFileDirect(file);
  };

  const handleImportFileDirect = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importJSON(content);
      if (success) {
        setImportStatusMessage({
          type: 'success',
          text: 'اطلاعات پشتیبان با موفقیت در سیستم بارگذاری شد.',
        });
      } else {
        setImportStatusMessage({
          type: 'error',
          text: 'فایل نامعتبر است یا ساختار داده‌های حسابداری مطابقت ندارد.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleUnlockTgTab = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tgPinInput.trim()) {
      setTgPinError('لطفاً رمز عبور مدیر را وارد نمایید.');
      return;
    }
    const isValid = verifyLicenseMasterPin(tgPinInput.trim(), configuredMasterPin);
    if (isValid) {
      setIsTgTabUnlocked(true);
      setTgPinError('');
      setTgPinInput('');
    } else {
      setTgPinError('رمز عبور وارد شده نادرست می‌باشد.');
    }
  };

  const handleTestTgConnection = async () => {
    const rawToken = tgSettings.botToken || '';
    const cleanToken = sanitizeTelegramBotToken(rawToken);
    if (!cleanToken) {
      setTgTestResult({ error: 'لطفاً ابتدا توکن ربات تلگرام را وارد فرمایید.' });
      return;
    }
    // Update state with cleaned token
    setTgSettings(prev => ({ ...prev, botToken: cleanToken }));
    setTgTesting(true);
    setTgTestResult(null);
    try {
      const res = await testTelegramBotConnection(cleanToken);
      setTgTestResult(res);
      if (res.success) {
        saveTelegramConfig({
          botToken: cleanToken,
          defaultChatId: tgSettings.defaultChatId,
          autoPolling: tgSettings.autoListenerEnabled !== false,
        }).catch(() => {});
      }
    } catch (err: any) {
      setTgTestResult({ error: err.message || 'خطا در برقراری ارتباط با سرور تلگرام' });
    } finally {
      setTgTesting(false);
    }
  };

  const handleSaveTgSettings = async () => {
    const cleanToken = sanitizeTelegramBotToken(tgSettings.botToken || '');
    const updated = { ...tgSettings, botToken: cleanToken };
    setTgSettings(updated);
    saveTelegramSettings(updated);
    try {
      await saveTelegramConfig({
        botToken: cleanToken,
        defaultChatId: tgSettings.defaultChatId,
        autoPolling: tgSettings.autoListenerEnabled !== false,
      });
    } catch (e) {
      console.warn('Backend telegram config sync notice:', e);
    }
    setTgSavedSuccess(true);
    setTimeout(() => setTgSavedSuccess(false), 3000);
  };

  return (
    <div
      id="access-modal-backdrop"
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-200 bg-white shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center shadow-xs shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  تنظیمات سیستم، مشخصات شرکت و امنیت
                </h2>
                <p className="text-xs text-slate-500">
                  مشخصات برند، سربرگ فاکتور، اندازه قلم، نقش‌های کاربری، بستن سال مالی و بکاپ
                </p>
              </div>
            </div>

            <button
              id="access-modal-close-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-2xs"
              title="بستن فرم (ESC)"
            >
              <X className="w-4 h-4" />
              <span>بستن (ESC)</span>
            </button>
          </div>

          {/* Sub-Tabs Nav */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('company')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer ${
                activeSubTab === 'company'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4 text-emerald-600" />
              <span>مشخصات شرکت و لوگو (چاپ)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer ${
                activeSubTab === 'roles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>پرسنل و امنیت ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('reset')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer ${
                activeSubTab === 'reset'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>ریست سال مالی و داده‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('backup')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer ${
                activeSubTab === 'backup'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>پشتیبان‌گیری محلی و گوگل درایو</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('telegram')}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-xl transition cursor-pointer ${
                activeSubTab === 'telegram'
                  ? 'bg-slate-900 text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4 text-sky-500 -rotate-45" />
              <span>تنظیمات محرمانه تلگرام</span>
              <Lock className="w-3 h-3 text-amber-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {saveSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

        {/* ================= TAB 0: COMPANY SETTINGS & PRINT CUSTOMIZATION ================= */}
        {activeSubTab === 'company' && (
          <div className="space-y-6">
            {/* Security Protection Control Card */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                compForm.isProtected
                  ? isCompanyUnlocked
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-amber-50/90 border-amber-300 shadow-sm'
                  : 'bg-slate-50/90 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      compForm.isProtected
                        ? isCompanyUnlocked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {compForm.isProtected ? (
                      isCompanyUnlocked ? (
                        <Unlock className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        دکمه حفاظتی و قفل امنیتی مشخصات و لوگوی شرکت
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          compForm.isProtected
                            ? isCompanyUnlocked
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-950 font-black'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {compForm.isProtected
                          ? isCompanyUnlocked
                            ? 'قفل باز است (مجاز به ویرایش)'
                            : 'حفاظت فعال است (قفل شده)'
                          : 'حفاظت غیرفعال (بدون رمز)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {compForm.isProtected
                        ? isCompanyUnlocked
                          ? 'قفل امنیتی باز است. تغییرات شما تا زمان بستن پنجره یا فشردن دکمه قفل مجدد آزاد است.'
                          : 'برای جلوگیری از تغییرات ناخواسته در نام و لوگوی شرکت، قبل از هر تغییری وارد کردن رمز عبور الزامی است.'
                        : 'جهت محافظت از مشخصات شرکت و لوگو در برابر تغییرات از پنل مدیریتی، دکمه حفاظت را فعال کنید.'}
                    </p>
                  </div>
                </div>

                {/* Protection Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {compForm.isProtected && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingProtectionPassword(!isChangingProtectionPassword);
                        setProtectionPasswordError('');
                      }}
                      className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="تغییر رمز عبور دکمه حفاظتی شرکت (الزام به ورود رمز اصلی مدیر برنامه)"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                      <span>تغییر رمز حفاظتی (با تایید مدیر)</span>
                    </button>
                  )}

                  {compForm.isProtected && isCompanyUnlocked && (
                    <button
                      type="button"
                      onClick={handleLockCompanyImmediately}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>قفل کردن مجدد</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleProtection}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs ${
                      compForm.isProtected
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {compForm.isProtected
                        ? 'غیرفعال‌سازی قفل حفاظتی'
                        : 'فعال‌سازی دکمه حفاظتی (رمزدار)'}
                    </span>
                  </button>

                  {/* Quick Local Offline Backup & Restore Button */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('backup')}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    title="ذخیره‌سازی دستی بکاپ روی حافظه محلی (Export) و بازیابی از فایل (Import)"
                  >
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>بکاپ و بازیابی محلی آفلاین</span>
                  </button>

                  {/* Secret License & Expiration Management Button */}
                  <button
                    type="button"
                    onClick={() => setIsSecretLicenseModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    title="تنظیم لیمیت زمانی، دوره آزمایشی و لایسنس برنامه (فوق‌محرمانه)"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>تعریف لیمیت و لایسنس برنامه</span>
                  </button>

                  {/* Secret Telegram Bot Management Button */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('telegram')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    title="تنظیمات محرمانه ربات تلگرام و ارسال حسابات مشتریان (محافظت‌شده با رمز مدیر)"
                  >
                    <Send className="w-4 h-4 text-sky-400 -rotate-45" />
                    <span>تنظیمات محرمانه ربات تلگرام</span>
                  </button>
                </div>
              </div>

              {/* Challenge password box if locked */}
              {isCompanyLocked && !isChangingProtectionPassword && (
                <div className="mt-4 pt-4 border-t border-amber-200 bg-amber-100/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-2.5">
                  <div className="text-xs text-amber-950 font-bold flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>برای ویرایش نام شرکت، لوگو و سربرگ، ابتدا رمز عبور حفاظتی را وارد فرمایید:</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingProtectionPassword(true);
                        setProtectionPasswordError('');
                      }}
                      className="text-[11px] text-indigo-700 hover:text-indigo-900 underline font-bold cursor-pointer"
                    >
                      فراموشی یا تغییر رمز حفاظتی با رمز اصلی مدیر
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showUnlockPassword ? 'text' : 'password'}
                        value={unlockPasswordInput}
                        onChange={e => {
                          setUnlockPasswordInput(e.target.value);
                          if (unlockError) setUnlockError('');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUnlockCompanySettings();
                          }
                        }}
                        placeholder="رمز عبور حفاظتی را وارد فرمایید..."
                        className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showUnlockPassword ? 'مخفی کردن' : 'نمایش رمز'}
                      >
                        {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleUnlockCompanySettings}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>تأیید و باز کردن قفل</span>
                    </button>
                  </div>

                  {unlockError && (
                    <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{unlockError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Changing protection password panel - Strictly requires Master Password */}
              {isChangingProtectionPassword && (
                <div className="mt-4 pt-4 border-t border-indigo-200 bg-indigo-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-3.5 text-right">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
                      <Shield className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span>تغییر رمز حفاظتی با تایید هویت مدیر ارشد برنامه</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-200/70 text-indigo-900 font-bold rounded-full">
                      نیازمند اجازه مدیر اصلی
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    برای تغییر یا بازیابی رمز حفاظتی، وارد کردن <strong className="text-indigo-900">رمز اصلی مدیر برنامه</strong> الزامی است و بدون اجازه و تایید مدیر، هیچ تغییری وارد و ذخیره نمی‌شود.
                  </p>

                  <div className="space-y-3">
                    {/* Master Password Input */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-800 mb-1">
                        ۱. رمز اصلی مدیر برنامه (احراز هویت مدیر) <span className="text-rose-600">*</span>:
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentMasterPassword ? 'text' : 'password'}
                          value={currentMasterPasswordInput}
                          onChange={e => {
                            setCurrentMasterPasswordInput(e.target.value);
                            if (protectionPasswordError) setProtectionPasswordError('');
                          }}
                          placeholder="رمز اصلی مدیر برنامه را وارد فرمایید..."
                          className="w-full px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 pl-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentMasterPassword(!showCurrentMasterPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showCurrentMasterPassword ? 'مخفی کردن' : 'نمایش رمز'}
                        >
                          {showCurrentMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* New Protection Password */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-800 mb-1">
                          ۲. رمز عبور حفاظتی جدید: <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewProtectionPassword ? 'text' : 'password'}
                            value={newProtectionPassword}
                            onChange={e => {
                              setNewProtectionPassword(e.target.value);
                              if (protectionPasswordError) setProtectionPasswordError('');
                            }}
                            placeholder="رمز جدید دلخواه..."
                            className="w-full px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 pl-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewProtectionPassword(!showNewProtectionPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title={showNewProtectionPassword ? 'مخفی کردن' : 'نمایش رمز'}
                          >
                            {showNewProtectionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Protection Password */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-800 mb-1">
                          ۳. تکرار رمز عبور جدید: <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type={showNewProtectionPassword ? 'text' : 'password'}
                          value={confirmProtectionPassword}
                          onChange={e => {
                            setConfirmProtectionPassword(e.target.value);
                            if (protectionPasswordError) setProtectionPasswordError('');
                          }}
                          placeholder="تکرار مجدد رمز جدید..."
                          className="w-full px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {protectionPasswordError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{protectionPasswordError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end pt-2 border-t border-indigo-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingProtectionPassword(false);
                        setCurrentMasterPasswordInput('');
                        setNewProtectionPassword('');
                        setConfirmProtectionPassword('');
                        setProtectionPasswordError('');
                      }}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewProtectionPassword}
                      className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تایید مدیر و ذخیره رمز جدید</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed">
                <strong className="font-black text-emerald-900 block mb-0.5">
                  سفارشی‌سازی کامل برند، لوگو و سربرگ اسناد چاپی
                </strong>
                تمامی اطلاعات ثبت شده در این بخش به صورت زنده و استاندارد در تمام فاکتورهای چاپی
                A4 (فروش سرخ، خرید آبی)، رسیدهای دریافت و پرداخت، حواله‌های انبار و صورت‌حساب‌های
                مشتریان اعمال خواهد شد.
              </div>
            </div>

            <form onSubmit={handleSaveCompanySettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Fields Column */}
                <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-xs font-black text-slate-800 pb-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>مشخصات سازمانی و شماره‌های تماس</span>
                    </span>
                    {isCompanyLocked && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>قفل شده</span>
                      </span>
                    )}
                  </h3>

                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      نام شرکت یا تجارتخانه <span className="text-rose-500">*</span>
                      {isCompanyLocked && <span className="text-amber-600 text-[10px] mr-1">(جهت تغییر، ابتدا رمز را وارد کنید)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isCompanyLocked}
                      value={compForm.name}
                      onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="مثلاً: شرکت تجارتی برادران نبوی"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none transition ${
                        isCompanyLocked
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                          : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      شعار تجارتی یا زمینه فعالیت
                    </label>
                    <input
                      type="text"
                      disabled={isCompanyLocked}
                      value={compForm.tagline || ''}
                      onChange={e => setCompForm(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="مثلاً: واردات، ترانزیت و پخش عمده آرد، برنج، روغن و شکر"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none transition ${
                        isCompanyLocked
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                          : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Phones Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>شماره تماس اصلی</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isCompanyLocked}
                        value={compForm.phone}
                        onChange={e => setCompForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="0794006460"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>شماره فرعی / واتساپ</span>
                      </label>
                      <input
                        type="text"
                        disabled={isCompanyLocked}
                        value={compForm.phoneSecondary || ''}
                        onChange={e =>
                          setCompForm(prev => ({ ...prev, phoneSecondary: e.target.value }))
                        }
                        placeholder="0780000000"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Email & Logo Letter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>ایمیل شرکت</span>
                      </label>
                      <input
                        type="email"
                        disabled={isCompanyLocked}
                        value={compForm.email || ''}
                        onChange={e => setCompForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="nabavi100@gmail.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        حرف اختصاری نشان و مونوگرام
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        disabled={isCompanyLocked}
                        value={compForm.logoIconText || 'ن'}
                        onChange={e =>
                          setCompForm(prev => ({ ...prev, logoIconText: e.target.value }))
                        }
                        placeholder="ن"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-center font-bold outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Calendar Type & Commercial Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>سیستم تاریخ و تقویم</span>
                      </label>
                      <select
                        disabled={isCompanyLocked}
                        value={compForm.calendarType || 'jalali'}
                        onChange={e => setCompForm(prev => ({ ...prev, calendarType: e.target.value as 'jalali' | 'gregorian' }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      >
                        <option value="jalali">تقویم هجری شمسی (مثلاً: ۱۴۰۳/۰۶/۱۱)</option>
                        <option value="gregorian">تقویم میلادی Gregorian (مثلاً: 2026-09-01)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                        <span>کد اقتصادی یا جواز تجارتی (TIN)</span>
                      </label>
                      <input
                        type="text"
                        disabled={isCompanyLocked}
                        value={compForm.commercialCode || ''}
                        onChange={e => setCompForm(prev => ({ ...prev, commercialCode: e.target.value }))}
                        placeholder="مثلاً: 900-452-110"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>آدرس دقیق دفتر مرکزی و محل گدام‌ها</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      disabled={isCompanyLocked}
                      value={compForm.address}
                      onChange={e => setCompForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="کابل، سرای شهزاده، مارکیت رحیم‌داد، منزل ۲، دفتر شماره ۱۲"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none transition resize-none ${
                        isCompanyLocked
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                          : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Invoice Footer Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>شرایط و یادداشت پاورقی فاکتورها</span>
                    </label>
                    <textarea
                      rows={2}
                      disabled={isCompanyLocked}
                      value={compForm.invoiceFooterNote || ''}
                      onChange={e =>
                        setCompForm(prev => ({ ...prev, invoiceFooterNote: e.target.value }))
                      }
                      placeholder="کالای فروخته شده تا ۲۴ ساعت با ارائه فاکتور قابل بازبینی است..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none transition resize-none ${
                        isCompanyLocked
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                          : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Logo & Live Preview Column */}
                <div className="space-y-4 flex flex-col justify-between">
                  {/* Logo Management */}
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-black text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>لوگو و نشان تجارتی</span>
                    </h3>

                    <div className="flex items-center gap-4">
                      {compForm.logoUrl ? (
                        <div className="relative group">
                          <img
                            src={compForm.logoUrl}
                            alt="Logo"
                            className="w-20 h-20 object-contain rounded-2xl bg-white border border-slate-200 p-1 shadow-xs"
                          />
                          {!isCompanyLocked && (
                            <button
                              type="button"
                              onClick={() => setCompForm(prev => ({ ...prev, logoUrl: '' }))}
                              className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition"
                              title="حذف لوگو"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-3xl shadow-xs">
                          {compForm.logoIconText || compForm.name.slice(0, 1) || 'ن'}
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <label className="block">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                              isCompanyLocked
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                            }`}
                          >
                            <Upload className="w-4 h-4" />
                            <span>{isCompanyLocked ? 'لوگو قفل است' : 'آپلود فایل عکس لوگو'}</span>
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isCompanyLocked}
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-500">
                          {isCompanyLocked
                            ? 'برای آپلود لوگوی جدید، ابتدا قفل امنیتی بالا را باز کنید.'
                            : 'فرمت‌های PNG، JPG، WebP یا SVG (حداکثر ۱.۵ مگابایت)'}
                        </p>
                      </div>
                    </div>

                    {/* Or URL input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        یا درج لینک اینترنتی لوگو (URL):
                      </label>
                      <input
                        type="url"
                        disabled={isCompanyLocked}
                        value={compForm.logoUrl || ''}
                        onChange={e => setCompForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none transition ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Live Header Preview Card */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-emerald-300 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>پیش‌نمایش زنده سربرگ اسناد و فاکتور A4:</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        سربرگ واقعی
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                      {/* Logo side */}
                      <div className="flex items-center gap-3">
                        {compForm.logoUrl ? (
                          <img
                            src={compForm.logoUrl}
                            alt="Logo preview"
                            className="w-12 h-12 object-contain rounded-xl bg-white border border-slate-200 p-0.5"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                            {compForm.logoIconText || 'ن'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{compForm.name}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{compForm.tagline}</p>
                          <div className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                            تماس: {compForm.phone} {compForm.phoneSecondary ? `| ${compForm.phoneSecondary}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Doc sample tag */}
                      <div className="text-left shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 font-mono">
                          نمونه سند فاکتور
                        </div>
                        <div className="text-xs font-mono font-black text-slate-800">
                          № INV-1403-089
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp & Digital Signature Management Card (مهر شرکت و امضای دیجیتال فاکتورها) */}
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <Stamp className="w-4 h-4 text-amber-600" />
                        <span>مهر شرکت و امضای دیجیتال (پایین فاکتورها)</span>
                      </h3>
                      <button
                        type="button"
                        disabled={isCompanyLocked}
                        onClick={() => {
                          if (isCompanyLocked) return;
                          setIsDrawSignatureModalOpen(true);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border ${
                          isCompanyLocked
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>ترسیم یا انتخاب امضای آماده</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Company Stamp Box */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Stamp className="w-3.5 h-3.5 text-amber-600" />
                            <span>مهر رسمی شرکت</span>
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            {compForm.stampUrl ? 'عکس اختصاصی' : 'مهر سیستمی'}
                          </span>
                        </div>

                        {/* Stamp Preview & Switcher */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shadow-2xs shrink-0 overflow-hidden">
                            <CompanyStampSeal
                              size={52}
                              stampUrl={compForm.stampUrl}
                              color={compForm.stampColor || 'navy'}
                              companyName={compForm.name}
                              tilt={true}
                            />
                          </div>

                          <div className="space-y-2 flex-1">
                            <label className="block">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-2xs ${
                                  isCompanyLocked
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                                }`}
                              >
                                <Upload className="w-3 h-3" />
                                <span>آپلود عکس مهر</span>
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isCompanyLocked}
                                onChange={handleStampUpload}
                                className="hidden"
                              />
                            </label>

                            {compForm.stampUrl ? (
                              !isCompanyLocked && (
                                <button
                                  type="button"
                                  onClick={() => setCompForm(prev => ({ ...prev, stampUrl: '' }))}
                                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>بازگشت به مهر سیستمی</span>
                                </button>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-500 font-bold">رنگ مهر:</span>
                                <button
                                  type="button"
                                  disabled={isCompanyLocked}
                                  onClick={() => setCompForm(prev => ({ ...prev, stampColor: 'navy' }))}
                                  className={`w-4 h-4 rounded-full bg-blue-900 border ${
                                    compForm.stampColor === 'navy' || !compForm.stampColor
                                      ? 'ring-2 ring-amber-400'
                                      : ''
                                  } ${isCompanyLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                  title="سرمه‌ای"
                                />
                                <button
                                  type="button"
                                  disabled={isCompanyLocked}
                                  onClick={() => setCompForm(prev => ({ ...prev, stampColor: 'red' }))}
                                  className={`w-4 h-4 rounded-full bg-rose-700 border ${
                                    compForm.stampColor === 'red' ? 'ring-2 ring-amber-400' : ''
                                  } ${isCompanyLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                  title="قرمز"
                                />
                                <button
                                  type="button"
                                  disabled={isCompanyLocked}
                                  onClick={() => setCompForm(prev => ({ ...prev, stampColor: 'blue' }))}
                                  className={`w-4 h-4 rounded-full bg-sky-600 border ${
                                    compForm.stampColor === 'blue' ? 'ring-2 ring-amber-400' : ''
                                  } ${isCompanyLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                  title="آبی"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <label className={`flex items-center gap-2 text-[11px] font-bold pt-1 border-t border-slate-100 ${
                          isCompanyLocked ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'
                        }`}>
                          <input
                            type="checkbox"
                            disabled={isCompanyLocked}
                            checked={compForm.showStampOnInvoice !== false}
                            onChange={e =>
                              setCompForm(prev => ({
                                ...prev,
                                showStampOnInvoice: e.target.checked,
                              }))
                            }
                            className="w-3.5 h-3.5 rounded text-amber-600 accent-amber-600 cursor-pointer"
                          />
                          <span>چاپ پیش‌فرض مهر روی فاکتورها</span>
                        </label>
                      </div>

                      {/* Digital Signature Box */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-blue-600" />
                            <span>امضای دیجیتال صادرکننده</span>
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            {compForm.signatureUrl ? 'فعال' : 'ثبت نشده'}
                          </span>
                        </div>

                        {/* Signature Preview & Controls */}
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shadow-2xs shrink-0 overflow-hidden">
                            {compForm.signatureUrl ? (
                              <img
                                src={compForm.signatureUrl}
                                alt="امضا"
                                className="max-h-full max-w-full object-contain filter contrast-125"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium text-center">
                                بدون امضا
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <label className="block">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs ${
                                  isCompanyLocked
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                }`}
                              >
                                <Upload className="w-3 h-3" />
                                <span>آپلود فایل عکس</span>
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isCompanyLocked}
                                onChange={handleSignatureUpload}
                                className="hidden"
                              />
                            </label>

                            {compForm.signatureUrl && !isCompanyLocked && (
                              <button
                                type="button"
                                onClick={() => setCompForm(prev => ({ ...prev, signatureUrl: '' }))}
                                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف این امضا</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <label className={`flex items-center gap-2 text-[11px] font-bold pt-1 border-t border-slate-100 ${
                          isCompanyLocked ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'
                        }`}>
                          <input
                            type="checkbox"
                            disabled={isCompanyLocked}
                            checked={compForm.showSignatureOnInvoice !== false}
                            onChange={e =>
                              setCompForm(prev => ({
                                ...prev,
                                showSignatureOnInvoice: e.target.checked,
                              }))
                            }
                            className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span>چاپ پیش‌فرض امضا روی فاکتورها</span>
                        </label>
                      </div>
                    </div>

                    {/* Bottom Invoice Simulation Box */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] font-bold text-slate-600 block mb-2">
                        پیش‌نمایش کادر امضا و مهر در پایین فاکتور:
                      </span>
                      <div className="relative border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50 flex flex-col items-center justify-between h-20">
                        <span className="text-[9.5px] text-slate-400 font-bold">امضا و مهر صادرکننده فاکتور</span>
                        <div className="relative h-10 w-full flex items-center justify-center">
                          {compForm.signatureUrl && (
                            <img
                              src={compForm.signatureUrl}
                              alt="امضا"
                              className="max-h-10 max-w-[120px] object-contain select-none z-10 filter contrast-125 pointer-events-none"
                            />
                          )}
                          <div
                            className={`absolute select-none pointer-events-none ${
                              compForm.signatureUrl ? 'right-6 -top-1 opacity-85' : 'opacity-90'
                            }`}
                          >
                            <CompanyStampSeal
                              size={46}
                              stampUrl={compForm.stampUrl}
                              color={compForm.stampColor || 'navy'}
                              companyName={compForm.name}
                              tilt={true}
                            />
                          </div>
                        </div>
                        <div className="border-t border-dashed border-slate-400 w-3/4 text-center pt-0.5 text-[10px] text-slate-800 font-bold">
                          مدیریت شرکت: {compForm.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Font Size Scaling Settings (تنظیم سایز فونت بر حسب شماره) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>اندازه فونت و مقیاس متن برنامه بر حسب شماره (Font Size)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          انتخاب سایز دقیق قلم به شماره (۱۰، ۱۲، ۱۴، ۱۶، ۱۸، ۲۰، ۲۲ پینتس/پیکسل)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg border border-blue-200">
                          سایز جاری: {fontSizeNumber}px
                        </span>
                      </div>
                    </div>

                    {/* Numeric buttons bar */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setFontSizeNumber(num);
                            if (num <= 12) setAppFontSize('sm');
                            else if (num <= 14) setAppFontSize('md');
                            else if (num <= 17) setAppFontSize('lg');
                            else setAppFontSize('xl');
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition border cursor-pointer text-center ${
                            fontSizeNumber === num
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {/* Slider & manual input */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[11px] text-slate-600 font-bold whitespace-nowrap">تنظیم دلخواه:</span>
                      <input
                        type="range"
                        min="9"
                        max="24"
                        step="1"
                        value={fontSizeNumber}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFontSizeNumber(val);
                          if (val <= 12) setAppFontSize('sm');
                          else if (val <= 14) setAppFontSize('md');
                          else if (val <= 17) setAppFontSize('lg');
                          else setAppFontSize('xl');
                        }}
                        className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                      <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md min-w-[36px] text-center">
                        {fontSizeNumber}
                      </span>
                    </div>
                  </div>

                  {/* Security & Auto-Lock Settings (تنظیم قفل خودکار برنامه بر اساس تایم تعیین شده) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span>تنظیم قفل خودکار سیستم بر اساس زمان عدم فعالیت (Auto-Lock)</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          اگر کاربر در مدت تعیین شده هیچ فعالیتی نداشته باشد، برنامه جهت حفظ امنیت اطلاعات مالی خودکار قفل می‌شود.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                          (compForm.autoLockMinutes || 0) > 0
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}>
                          {(compForm.autoLockMinutes || 0) > 0 ? `${compForm.autoLockMinutes} دقیقه` : 'غیرفعال (قفل نشود)'}
                        </span>
                      </div>
                    </div>

                    {/* Quick timeout preset options */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                      {[
                        { label: 'غیرفعال', value: 0 },
                        { label: '۱ دقیقه (تست)', value: 1 },
                        { label: '۲ دقیقه', value: 2 },
                        { label: '۵ دقیقه', value: 5 },
                        { label: '۱۰ دقیقه', value: 10 },
                        { label: '۱۵ دقیقه', value: 15 },
                        { label: '۳۰ دقیقه', value: 30 },
                        { label: '۱ ساعت', value: 60 },
                      ].map(item => {
                        const isSelected = (compForm.autoLockMinutes || 0) === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setCompForm(prev => ({ ...prev, autoLockMinutes: item.value }))}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>تشخیص فعالیت کاربر از طریق ماوس، کیبورد، اسکرول و کلیک انجام می‌پذیرد.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          logout();
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>قفل کردن فوری سیستم هم‌اکنون</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isCompanyLocked}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                        isCompanyLocked
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      {isCompanyLocked ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>تنظیمات قفل است — برای ذخیره تغییرات، ابتدا قفل بالا را باز کنید</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ذخیره و اعمال در کل سیستم و فاکتورها</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isCompanyLocked}
                      onClick={handleResetCompanyToDefault}
                      className={`py-3 px-4 rounded-2xl text-xs font-bold transition ${
                        isCompanyLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                      }`}
                    >
                      بازگردانی پیش‌فرض
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 1: ROLES & USER MANAGEMENT ================= */}
        {activeSubTab === 'roles' && (
          <div className="space-y-6">
            {/* Active User Switcher Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 ${currentUser.avatarColor} text-white rounded-xl flex items-center justify-center font-black text-lg`}
                >
                  {currentUser.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-[11px] text-emerald-400 font-bold">
                    کاربر فعال و وارد شده هم‌اکنون:
                  </div>
                  <div className="text-base font-black text-white">{currentUser.name}</div>
                  <div className="text-xs text-slate-300">
                    نقش: {currentUser.roleTitle} ({currentUser.role})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-300">تغییر کاربر سریع:</span>
                <select
                  value={currentUser.id}
                  onChange={e => {
                    const u = users.find(usr => usr.id === e.target.value);
                    if (u) setCurrentUser(u);
                  }}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleTitle})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Permissions Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>مدیر کل (Admin)</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  دسترسی نامحدود، ریست داده‌ها، حذف اسناد، تعیین نرخ صرافی و مدیریت پرسنل.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  <span>حسابدار (Accountant)</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  ثبت فاکتورها، دریافت/پرداخت، عملیات صرافی و مشاهده گزارشات و دفاتر کل.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>مدیر گدام (Warehouse)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  مشاهده موجودی تن/کیسه، ثبت انتقال بین گدام‌ها و صدور حواله خروج بار.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-4 h-4 text-purple-700" />
                  <span>صندوق‌دار (Cashier)</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  ثبت دریافت و پرداخت نقد، مشاهده مانده ۳ صندوق و صدور فاکتور فروش.
                </p>
              </div>
            </div>

            {/* Users List & Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  فهرست پرسنل و کاربران سیستم
                </h3>
                {!isAddingUser && (
                  <button
                    onClick={() => setIsAddingUser(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن کاربر جدید</span>
                  </button>
                )}
              </div>

              {/* Add User Inline Form */}
              {isAddingUser && (
                <form
                  onSubmit={handleAddUserSubmit}
                  className="bg-slate-50 border border-slate-300 p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <span>تعریف کاربر جدید به همراه رمز عبور ورود به برنامه:</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      رمز عبور پیش‌فرض: <strong className="font-mono">123</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        نام و تخلص: *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثلاً: محمد داوود کریمی"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        نام کاربری جهت ورود:
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="مثلاً: karimi"
                        value={newUserUsername}
                        onChange={e => setNewUserUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center justify-between">
                        <span>رمز عبور ورود (پسورد): *</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          required
                          dir="ltr"
                          placeholder="رمز عبور (مثلاً: 123)"
                          value={newUserPassword}
                          onChange={e => setNewUserPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none pr-3 pl-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        نقش و سطح دسترسی:
                      </label>
                      <select
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                      >
                        <option value="admin">مدیر کل (Admin - دسترسی نامحدود)</option>
                        <option value="accountant">مدیر مالی و حسابدار (Accountant)</option>
                        <option value="warehouse_keeper">مدیر گدام (Warehouse Keeper)</option>
                        <option value="cashier">صندوق‌دار و صراف (Cashier)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        شماره تماس:
                      </label>
                      <input
                        type="text"
                        placeholder="0799000000"
                        value={newUserPhone}
                        onChange={e => setNewUserPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ذخیره کاربر با رمز عبور</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Users Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">کاربر</th>
                      <th className="p-3">نام کاربری</th>
                      <th className="p-3">نقش و سطح</th>
                      <th className="p-3 text-center">رمز عبور</th>
                      <th className="p-3">شماره تماس</th>
                      <th className="p-3 text-center">وضعیت دسترسی</th>
                      <th className="p-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className={u.id === currentUser.id ? 'bg-emerald-50/50' : ''}>
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg ${u.avatarColor || 'bg-slate-700'} text-white flex items-center justify-center text-xs font-black`}
                          >
                            {u.name.slice(0, 1)}
                          </span>
                          <div>
                            <div>{u.name}</div>
                            {u.id === currentUser.id && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                کاربر جاری
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {u.username || '---'}
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{u.roleTitle}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setChangePasswordUser(u);
                              setNewPasswordInput(u.password || '123');
                              setShowChangePasswordInput(false);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="تغییر رمز عبور این کاربر"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                            <span>تغییر رمز</span>
                          </button>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{u.phone || '---'}</td>
                        <td className="p-3 text-center">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                            {u.canResetData ? 'کامل (مدیر)' : u.canViewReports ? 'مالی و گزارشات' : 'محدود به بخش'}
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => {
                                  setSwitchUserTarget(u);
                                  setSwitchPasswordInput('');
                                  setSwitchPasswordError('');
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" />
                                <span>ورود به این حساب</span>
                              </button>
                            )}
                            {users.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`آیا از حذف کاربر «${u.name}» اطمینان دارید؟`)) {
                                    deleteUser(u.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="حذف کاربر"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Offline & Local Data Backup Card in Security Tab */}
            <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">
                      پشتیبان‌گیری دستی روی حافظه محلی کامپیوتر (آفلاین / بدون نیاز به اینترنت)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      جهت تضمین کامل امنیت داده‌های مالی و حسابداری، می‌توانید همیشه نسخه پشتیبان کامل (JSON) را در درایو کامپیوتر یا فلش‌مموری ذخیره و در مواقع لزوم بازیابی نمایید.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs"
                    title="دانلود فایل خروجی کامل JSON روی حافظه دستگاه"
                  >
                    <Download className="w-4 h-4" />
                    <span>ذخیره دستی بکاپ (Export JSON)</span>
                  </button>

                  <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>بازیابی از فایل (Import JSON)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {importStatusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    importStatusMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {importStatusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{importStatusMessage.text}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: DATA RESET STRATEGIES ================= */}
        {activeSubTab === 'reset' && (
          <div className="space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-rose-900">توجه مهم در خصوص ریست کردن اطلاعات:</div>
                <p className="text-rose-800 leading-relaxed">
                  عملیات ریست غیرقابل بازگشت است. توصیه می‌شود قبل از هرگونه ریست، ابتدا از زبانه
                  «پشتیبان‌گیری» یک فایل نسخه پشتیبان JSON دانلود و ذخیره نمایید.
                </p>
              </div>
            </div>

            {/* 3 Reset Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Demo Data */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-400 transition shadow-xs">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    ریست به داده‌های نمونه تجارتی
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    بازگرداندن کلیه فاکتورها، گدام‌ها، محصولات و مشتریان به داده‌های اولیه پیش‌فرض
                    شرکت بازرگان افغانستان.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setConfirmResetType('demo');
                    setConfirmInput('');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  ریست به دمو اولیه
                </button>
              </div>

              {/* Option 2: New Financial Year */}
              <div className="bg-white border border-amber-300 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-400 transition shadow-xs">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    شروع سال / دوره مالی جدید
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    پاکسازی کلیه فاکتورها و تراکنش‌ها و صفر کردن مانده طلبات و بدهی‌ها، با حفظ
                    محصولات و مشخصات گدام‌ها.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setConfirmResetType('new_year');
                    setConfirmInput('');
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  بستن دوره و شروع سال جدید
                </button>
              </div>

              {/* Option 3: Wipe Clean All */}
              <div className="bg-white border border-rose-300 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-rose-400 transition shadow-xs">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-rose-100 text-rose-800 rounded-xl flex items-center justify-center font-bold">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    پاکسازی کامل کلیه اطلاعات
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    تخلیه کامل دیتابیس، پاک کردن همه فاکتورها، حساب‌ها، کالاها و صندوق‌ها جهت شروع
                    یک تجارت کاملاً جدید از صفر.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setConfirmResetType('wipe_clean');
                    setConfirmInput('');
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  پاکسازی کامل (Blank Slate)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BACKUP & RESTORE & GOOGLE DRIVE ================= */}
        {activeSubTab === 'backup' && (
          <div className="space-y-4">
            {importStatusMessage && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  importStatusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {importStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{importStatusMessage.text}</span>
              </div>
            )}

            <GoogleDriveBackupPanel
              onLocalExport={handleDownloadBackup}
              onLocalImport={handleImportFileDirect}
            />
          </div>
        )}

        {/* ================= TAB 4: CONFIDENTIAL TELEGRAM BOT SETTINGS ================= */}
        {activeSubTab === 'telegram' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {!isTgTabUnlocked ? (
              /* Security Lock Gate for Telegram Confidential Settings */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-2xl space-y-5 my-6">
                <div className="w-16 h-16 bg-slate-800 text-sky-400 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sky-400 font-bold text-xs">
                    <Send className="w-3.5 h-3.5 -rotate-45" />
                    <span>بخش فوق‌محرمانه سیستم</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تنظیمات محرمانه ربات تلگرام
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    این بخش حاوی توکن محرمانه ربات تلگرام، لاگ‌های ارتباطی و اطلاعات استعلام حساب مشتریان می‌باشد.
                    جهت جلوگیری از دسترسی کارمندان و افراد غیرمجاز، لطفاً رمز عبور مدیر برنامه را وارد فرمایید:
                  </p>
                </div>

                <form onSubmit={handleUnlockTgTab} className="space-y-4 max-w-xs mx-auto">
                  <div className="relative">
                    <input
                      type={showTgPin ? 'text' : 'password'}
                      dir="ltr"
                      value={tgPinInput}
                      onChange={e => {
                        setTgPinInput(e.target.value);
                        setTgPinError('');
                      }}
                      placeholder="رمز عبور مدیر را بنویسید..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-2xl text-center text-sm font-mono font-bold text-white outline-none transition placeholder:text-slate-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowTgPin(!showTgPin)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showTgPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {tgPinError && (
                    <div className="p-2.5 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 font-bold flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{tgPinError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-2xl transition shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>تأیید و ورود به تنظیمات تلگرام</span>
                  </button>

                  <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>رمز پیش‌فرض مدیر برنامه: </span>
                    <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      nabavi2026
                    </code>
                  </div>
                </form>
              </div>
            ) : (
              /* Unlocked Confidential Telegram Panel */
              <div className="space-y-5">
                {/* Header Status Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/30 shrink-0">
                      <Send className="w-5 h-5 -rotate-45" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">
                          میز کار محرمانه ربات تلگرام حسابداری
                        </h3>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>رمزدار (محرمانه)</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        استعلام خودکار صورت‌حساب تفکیک‌شده مشتریان بر اساس شماره تماس تلگرام
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Listener Status Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isTelegramListenerRunning() && tgSettings.botToken
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-slate-300 text-[11px]">
                        {isTelegramListenerRunning() && tgSettings.botToken
                          ? 'ربات فعال و آماده دریافت'
                          : 'ربات خاموش یا منتظر توکن'}
                      </span>
                    </div>

                    {/* Open Full Dedicated Window */}
                    <button
                      type="button"
                      onClick={() => setIsTelegramModalOpen(true)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="مشاهده میز کار جامع با لیست کامل مشتریان، ارسال پیام تست و لاگ‌های زنده"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>میز کار پیشرفته تلگرام</span>
                    </button>

                    {/* Lock Tab Button */}
                    <button
                      type="button"
                      onClick={() => setIsTgTabUnlocked(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="قفل مجدد این بخش محرمانه"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      <span>قفل مجدد</span>
                    </button>
                  </div>
                </div>

                {/* Save feedback banner */}
                {tgSavedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تنظیمات ربات تلگرام با موفقیت ذخیره گردید. شنود پیام‌های ربات فعال است.</span>
                  </div>
                )}

                {/* Main Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Bot Token & Test */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                        <KeyRound className="w-4 h-4 text-sky-600" />
                        <span>توکن اختصاصی ربات تلگرام (API Token)</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        محرمانه
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        توکن دریافتی از BotFather@ تلگرام:
                      </label>
                      <div className="relative">
                        <input
                          type={showTgToken ? 'text' : 'password'}
                          dir="ltr"
                          value={tgSettings.botToken}
                          onChange={e => setTgSettings({ ...tgSettings, botToken: e.target.value.trim() })}
                          placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs font-mono text-slate-900 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTgToken(!showTgToken)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showTgToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        برای ساخت ربات رایگان در تلگرام به ربات رسمی <strong>BotFather@</strong> پیام داده و دستور{' '}
                        <code>/newbot</code> را ارسال کنید.
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleTestTgConnection}
                        disabled={tgTesting || !tgSettings.botToken?.trim()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
                      >
                        {tgTesting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                            <span>در حال تست اتصال...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-sky-400" />
                            <span>تست زنده اتصال به تلگرام</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTgSettings}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ذخیره تنظیمات</span>
                      </button>
                    </div>

                    {/* Test result feedback */}
                    {tgTestResult && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                          tgTestResult.success
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-800'
                        }`}
                      >
                        {tgTestResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black">اتصال موفقیت‌آمیز بود!</p>
                              <p className="text-[11px] font-normal mt-0.5">
                                نام ربات: <strong>{tgTestResult.botName}</strong> (
                                <span dir="ltr">@{tgTestResult.username}</span>)
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black">خطا در اتصال به ربات:</p>
                              <p className="text-[11px] font-normal mt-0.5">{tgTestResult.error}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Messages & Automatic Features Settings */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                        <Bot className="w-4 h-4 text-sky-600" />
                        <span>تنظیمات پاسخگویی خودکار و ارسال</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between cursor-pointer gap-2 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-900 block">
                            شنود خودکار و پاسخ فوری به استعلام‌ها (Polling)
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            دریافت درخواست استعلام حساب و ارسال خودکار صورت‌حساب به مشتری
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={tgSettings.autoListenerEnabled}
                          onChange={e =>
                            setTgSettings({
                              ...tgSettings,
                              autoListenerEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600 shrink-0"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer gap-2 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-900 block">
                            ارسال خودکار فاکتور به مشتری هنگام ثبت فاکتور جدید
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            بلافاصله پس از ذخیره فاکتور فروش برای مشتری متصل ارسال گردد
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={tgSettings.autoSendOnSave}
                          onChange={e =>
                            setTgSettings({
                              ...tgSettings,
                              autoSendOnSave: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600 shrink-0"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={tgSettings.sendPhoto}
                            onChange={e =>
                              setTgSettings({
                                ...tgSettings,
                                sendPhoto: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-sky-600 rounded accent-sky-600"
                          />
                          <span className="text-slate-800 font-bold">ارسال عکس برگه</span>
                        </label>

                        <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={tgSettings.sendText}
                            onChange={e =>
                              setTgSettings({
                                ...tgSettings,
                                sendText: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-sky-600 rounded accent-sky-600"
                          />
                          <span className="text-slate-800 font-bold">ارسال متن خلاصه</span>
                        </label>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-[11.5px] font-bold text-slate-700 block">
                          شناسه چت تلگرام مدیر (جهت دریافت کپی اعلان‌ها - اختیاری):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={tgSettings.defaultChatId}
                          onChange={e => setTgSettings({ ...tgSettings, defaultChatId: e.target.value })}
                          placeholder="مثال: 987654321"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl text-xs font-mono text-slate-900 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Account Segregation Guarantee Banner */}
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-sky-900 font-black text-xs sm:text-sm">
                    <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
                    <span>تضمین عدم تداخل حساب‌ها و حفظ امنیت ۱۰۰٪ مشتریان</span>
                  </div>
                  <ul className="text-xs text-sky-950 space-y-1.5 leading-relaxed pr-2 list-disc list-inside">
                    <li>
                      <strong>احراز هویت اجباری با شماره:</strong> مشتری با ارسال دستور <code>/start</code>، ملزم به اشتراک‌گذاری شماره موبایل خود تلگرام می‌شود.
                    </li>
                    <li>
                      <strong>کنترل مالکیت کارت مخاطب:</strong> ربات تأیید می‌کند که شماره کارت ارسالی حتماً متعلق به اکانت خود ارسال‌کننده باشد تا امکان جعل شماره وجود نداشته باشد.
                    </li>
                    <li>
                      <strong>تفکیک مطلق حساب‌ها:</strong> سیستم شماره مشتری را در دیتابیس اشخاص جستجو نموده و <u>فقط و فقط صورت‌حساب شخص مربوطه</u> را بازمی‌گرداند. حتی اگر صدها مشتری به طور همزمان به ربات متصل شوند، هیچ مشتری دیگری به بدهی، طلب یا فاکتورهای دیگران دسترسی نخواهد داشت.
                    </li>
                  </ul>
                </div>

                {/* Subscribers & Log Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Connected Customers */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                        <Users className="w-4 h-4 text-sky-600" />
                        <span>مشتریان متصل شده به ربات ({tgSubscribers.length} نفر)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTgSubscribers(getSubscribersList())}
                        className="text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                      >
                        بروزرسانی
                      </button>
                    </div>

                    {tgSubscribers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        هنوز هیچ مشتری به ربات متصل نشده است.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                        {tgSubscribers.map(sub => (
                          <div
                            key={sub.chatId}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{sub.partyName}</p>
                              <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                {sub.phone}
                              </p>
                            </div>
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                              متصل
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Logs Preview */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span>رویدادها و لاگ‌های اخیر تلگرام</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTgLogs(getTelegramLogs())}
                        className="text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                      >
                        بروزرسانی
                      </button>
                    </div>

                    {tgLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        هنوز هیچ لاگ رویدادی ثبت نشده است.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                        {tgLogs.slice(0, 6).map(log => (
                          <div
                            key={log.id}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold ${
                                  log.type === 'auth_success' || log.type === 'inquiry'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.type === 'auth_failed' || log.type === 'error'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {log.type}
                              </span>
                            </div>
                            <p className="text-slate-800 text-[11px] leading-tight font-medium">
                              {log.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telegram Bot Modal launched from confidential section with initiallyUnlocked */}
        <TelegramBotModal
          isOpen={isTelegramModalOpen}
          onClose={() => {
            setIsTelegramModalOpen(false);
            setTgSettings(getTelegramSettings());
            setTgSubscribers(getSubscribersList());
            setTgLogs(getTelegramLogs());
          }}
          initiallyUnlocked={true}
        />

        {/* ================= CONFIRMATION MODAL OVERLAY ================= */}
        {confirmResetType && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h4 className="text-base font-black text-slate-900">تأیید نهایی عملیات ریست</h4>
                  <p className="text-xs text-slate-500">
                    {confirmResetType === 'demo'
                      ? 'ریست کامل به داده‌های پیش‌فرض دمو'
                      : confirmResetType === 'new_year'
                      ? 'بستن سال مالی و پاکسازی فاکتورها'
                      : 'تخلیه کامل کلیه داده‌های سیستم'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                آیا کاملاً مطمئن هستید؟ برای تأیید و اجرای عملیات، لطفاً کلمه{' '}
                <strong className="text-rose-600 font-black">«ریست»</strong> یا{' '}
                <strong className="text-rose-600 font-black">«RESET»</strong> را در کادر زیر وارد
                کنید:
              </p>

              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="کلمه «ریست» را بنویسید"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-rose-300 rounded-xl text-center text-sm font-black text-rose-700 outline-none"
                autoFocus
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmResetType(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف و بازگشت
                </button>
                <button
                  type="button"
                  disabled={confirmInput.trim() !== 'ریست' && confirmInput.trim().toUpperCase() !== 'RESET'}
                  onClick={handleExecuteReset}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition text-white ${
                    confirmInput.trim() === 'ریست' || confirmInput.trim().toUpperCase() === 'RESET'
                      ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed text-slate-500'
                  }`}
                >
                  تأیید و اجرای ریست
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ================= CHANGE PASSWORD MODAL ================= */}
        {changePasswordUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-70">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-300 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3 text-blue-600">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">تغییر رمز عبور کاربر</h4>
                  <p className="text-xs text-slate-500">{changePasswordUser.name} ({changePasswordUser.roleTitle})</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  رمز عبور جدید را وارد نمایید:
                </label>
                <div className="relative">
                  <input
                    type={showChangePasswordInput ? 'text' : 'password'}
                    dir="ltr"
                    required
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    placeholder="رمز جدید..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none pr-3 pl-8"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordInput(!showChangePasswordInput)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showChangePasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPasswordInput.trim()) return;
                    updateUser(changePasswordUser.id, { password: newPasswordInput.trim() });
                    setChangePasswordUser(null);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ذخیره رمز عبور
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SWITCH USER MODAL ================= */}
        {switchUserTarget && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-70">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-300 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3 text-slate-800">
                <span className={`w-10 h-10 rounded-xl ${switchUserTarget.avatarColor || 'bg-slate-800'} text-white flex items-center justify-center text-sm font-black shrink-0`}>
                  {switchUserTarget.name.slice(0, 1)}
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">ورود به حساب {switchUserTarget.name}</h4>
                  <p className="text-xs text-slate-500">نقش: {switchUserTarget.roleTitle}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  لطفاً رمز عبور حساب ({switchUserTarget.name}) را وارد نمایید:
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={switchPasswordInput}
                  onChange={e => {
                    setSwitchPasswordInput(e.target.value);
                    setSwitchPasswordError('');
                  }}
                  placeholder="رمز عبور..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const expected = switchUserTarget.password || '123';
                      if (switchPasswordInput.trim() === expected.trim()) {
                        setCurrentUser(switchUserTarget);
                        setSwitchUserTarget(null);
                      } else {
                        setSwitchPasswordError('رمز عبور وارد شده نادرست است.');
                      }
                    }
                  }}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>رمز پیش‌فرض: 123</span>
                  <button
                    type="button"
                    onClick={() => setSwitchPasswordInput('123')}
                    className="text-blue-600 hover:underline cursor-pointer font-bold"
                  >
                    درج ۱۲۳
                  </button>
                </div>
              </div>

              {switchPasswordError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg text-center">
                  {switchPasswordError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSwitchUserTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const expected = switchUserTarget.password || '123';
                    if (switchPasswordInput.trim() === expected.trim()) {
                      setCurrentUser(switchUserTarget);
                      setSwitchUserTarget(null);
                    } else {
                      setSwitchPasswordError('رمز عبور وارد شده نادرست است.');
                    }
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ورود به حساب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature & Seal Canvas Drawing / Settings Modal */}
      <SignatureAndSealModal
        isOpen={isDrawSignatureModalOpen}
        onClose={() => setIsDrawSignatureModalOpen(false)}
        onApply={newSettings => {
          setCompForm(prev => ({
            ...prev,
            showStampOnInvoice: newSettings.showStamp,
            showSignatureOnInvoice: newSettings.showSignature,
            stampUrl: newSettings.stampUrl !== undefined ? newSettings.stampUrl : prev.stampUrl,
            signatureUrl:
              newSettings.signatureUrl !== undefined ? newSettings.signatureUrl : prev.signatureUrl,
            stampColor: newSettings.stampColor || prev.stampColor,
          }));
        }}
      />

      {/* Secret License & Expiration Management Modal */}
      <SecretLicenseModal
        isOpen={isSecretLicenseModalOpen}
        onClose={() => setIsSecretLicenseModalOpen(false)}
      />
    </div>
  </div>
);
};
