import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudCheck,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  FolderOpen,
  Clock,
  HardDrive,
  ShieldCheck,
  Loader2,
  FileText,
} from 'lucide-react';
import { useGoogleDriveBackup } from '../hooks/useGoogleDriveBackup';
import { DriveBackupFile } from '../services/googleDriveService';

interface GoogleDriveBackupPanelProps {
  onLocalExport?: () => void;
  onLocalImport?: (file: File) => void;
}

export const GoogleDriveBackupPanel: React.FC<GoogleDriveBackupPanelProps> = ({
  onLocalExport,
  onLocalImport,
}) => {
  const {
    user,
    isConnected,
    isConnecting,
    isBackingUp,
    isRestoring,
    backups,
    isLoadingBackups,
    autoSettings,
    updateAutoSettings,
    connectDrive,
    connectDriveDemo,
    disconnectDrive,
    performBackup,
    restoreBackup,
    deleteBackup,
    refreshBackupsList,
    authErrorMessage,
    clearAuthError,
    isIframe,
    openInNewTab,
  } = useGoogleDriveBackup();

  // State for modal confirmations (destructive actions)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveBackupFile | null>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<DriveBackupFile | null>(null);
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteFile) return;
    await deleteBackup(confirmDeleteFile.id);
    setConfirmDeleteFile(null);
  };

  const handleExecuteRestore = async () => {
    if (!confirmRestoreFile) return;
    await restoreBackup(confirmRestoreFile.id);
    setConfirmRestoreFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs for Backup types */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>پشتیبان‌گیری ابری در گوگل درایو</span>
            {isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'local'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>پشتیبان‌گیری محلی (دانلود/آپلود فایل)</span>
          </button>
        </div>

        {isConnected && activeTab === 'cloud' && (
          <button
            type="button"
            onClick={() => refreshBackupsList()}
            disabled={isLoadingBackups}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            title="بروزرسانی لیست نسخه‌ها"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin text-blue-600' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        )}
      </div>

      {/* ================= CLOUD / GOOGLE DRIVE TAB ================= */}
      {activeTab === 'cloud' && (
        <div className="space-y-5">
          {/* Connection Card */}
          {!isConnected ? (
            <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-200 rounded-3xl p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-md border border-blue-100 flex items-center justify-center text-blue-600">
                <Cloud className="w-7 h-7" />
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-black text-slate-900">
                  اتصال به حساب گوگل درایو (Google Drive)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  با اتصال حساب گوگل، نسخهٔ پشتیبان سیستم به‌صورت دوره‌ای و خودکار در پوشهٔ امن{' '}
                  <span className="font-mono font-bold text-blue-700">Hesabdar_Backups</span> در گوگل
                  درایو شما ذخیره شده و از هر دستگاهی در دسترس خواهد بود.
                </p>
              </div>

              {/* Informative advice for iframe environments */}
              {isIframe && (
                <div className="max-w-lg mx-auto bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-right flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>اگر پنجره گوگل در این کادر باز نشد، برنامه را در برگهٔ جدا باز کنید:</span>
                  </div>
                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>برگه جدید (New Tab)</span>
                  </button>
                </div>
              )}

              {/* Error message alert box */}
              {authErrorMessage && (
                <div className="max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-right space-y-2 text-xs text-rose-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold leading-relaxed block">{authErrorMessage}</span>
                        <p className="text-[11px] text-slate-600">
                          نکته: گوگل به دلایل امنیتی ورود پاپ‌آپ داخل فریم‌های پیش‌نمایش را مسدود می‌کند. می‌توانید برنامه را در برگهٔ جدید باز کنید یا از ورود فوری ابری پیش‌نمایش استفاده نمایید.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearAuthError}
                      className="text-rose-500 hover:text-rose-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                    <button
                      type="button"
                      onClick={() => connectDriveDemo()}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>اتصال فوری ابری (حالت پیش‌نمایش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={openInNewTab}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>تلاش در برگهٔ جدید</span>
                    </button>
                    <button
                      type="button"
                      onClick={connectDrive}
                      disabled={isConnecting}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                      <span>تلاش مجدد گوگل</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center justify-center gap-2.5 pt-2">
                {/* Official Sign In with Google styled button */}
                <button
                  type="button"
                  onClick={connectDrive}
                  disabled={isConnecting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold shadow-xs hover:shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  )}
                  <span>
                    {isConnecting ? 'در حال برقراری ارتباط با گوگل...' : 'ورود و اتصال با حساب گوگل (Sign in with Google)'}
                  </span>
                </button>

                {/* Instant Cloud Demo Button for iframe environment */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => connectDriveDemo()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="اتصال فوری ابری با اکانت بازرگانی برادران نبوی (مخصوص تست درون پیش‌نمایش بدون مسدودی پاپ‌آپ)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>اتصال فوری ابری (تست پیش‌نمایش • nabavi100@gmail.com)</span>
                  </button>

                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="باز کردن برنامه در برگه جداگانه برای دور زدن محدودیت پنجره ورود گوگل"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>باز کردن در برگه جدید مرورگر</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  دسترسی محدود امن: سیستم فقط به فایل‌های ساخته‌شده توسط خود برنامه دسترسی دارد.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              {/* Account Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Google User"
                      className="w-12 h-12 rounded-2xl border border-slate-200 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        {user.displayName || 'کاربر گوگل'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CloudCheck className="w-3 h-3" />
                        <span>متصل به گوگل درایو</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://drive.google.com/drive"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>باز کردن درایو</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={disconnectDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج از حساب</span>
                  </button>
                </div>
              </div>

              {/* Instant Backup & Auto-Backup Controls Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Manual Backup Action */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CloudUpload className="w-4 h-4 text-blue-600" />
                      <span>پشتیبان‌گیری دستی فوری در گوگل درایو</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      همین حالا تمام اسناد، موجودی گدام و فاکتورها را در یک فایل فشرده JSON در گوگل درایو
                      ذخیره کنید.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => performBackup(false)}
                    disabled={isBackingUp}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ارسال به گوگل درایو...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4" />
                        <span>ایجاد نسخه پشتیبان فوری</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 2. Auto-Backup Settings */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>بکاپ خودکار در گوگل درایو</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSettings.enabled}
                        onChange={e => updateAutoSettings({ enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="mr-2 text-xs font-bold text-slate-700">
                        {autoSettings.enabled ? 'فعال' : 'غیرفعال'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1">
                        دوره تکرار خودکار:
                      </label>
                      <select
                        disabled={!autoSettings.enabled}
                        value={autoSettings.intervalMinutes}
                        onChange={e =>
                          updateAutoSettings({ intervalMinutes: parseInt(e.target.value, 10) })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none disabled:opacity-50"
                      >
                        <option value={60}>هر ۱ ساعت</option>
                        <option value={360}>هر ۶ ساعت (پیشنهادی)</option>
                        <option value={720}>هر ۱۲ ساعت</option>
                        <option value={1440}>هر ۲۴ ساعت (روزانه)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1">
                        نگهداری نسخه‌ها:
                      </label>
                      <select
                        disabled={!autoSettings.enabled}
                        value={autoSettings.keepMaxBackups}
                        onChange={e =>
                          updateAutoSettings({ keepMaxBackups: parseInt(e.target.value, 10) })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none disabled:opacity-50"
                      >
                        <option value={5}>حداکثر ۵ نسخه اخیر</option>
                        <option value={10}>حداکثر ۱۰ نسخه اخیر</option>
                        <option value={15}>حداکثر ۱۵ نسخه اخیر</option>
                        <option value={30}>حداکثر ۳۰ نسخه اخیر</option>
                      </select>
                    </div>
                  </div>

                  {/* Last backup info */}
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span>آخرین بکاپ خودکار:</span>
                    <span className="font-bold text-slate-700">
                      {autoSettings.lastBackupTime ? formatDate(autoSettings.lastBackupTime) : 'هنوز انجام نشده'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Backups List in Google Drive */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-black text-slate-900">
                      نسخه‌های ذخیره‌شده در گوگل درایو ({backups.length} نسخه)
                    </h4>
                  </div>
                </div>

                {isLoadingBackups ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">در حال دریافت لیست نسخه‌ها از گوگل درایو...</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      هنوز هیچ نسخه پشتیبانی در حساب گوگل درایو شما ذخیره نشده است.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      روی دکمه «ایجاد نسخه پشتیبان فوری» بالا کلیک کنید یا منتظر بکاپ خودکار بمانید.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {backups.map(file => (
                      <div
                        key={file.id}
                        className="p-3 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </span>
                            {file.isAuto ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                خودکار
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                                دستی
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>تاریخ: {formatDate(file.createdTime || file.modifiedTime)}</span>
                            <span>•</span>
                            <span>حجم: {formatFileSize(file.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Restore action */}
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreFile(file)}
                            disabled={isRestoring}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition border border-emerald-200 cursor-pointer"
                            title="بازیابی سیستم به این نسخه"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>بازیابی</span>
                          </button>

                          {/* Open in Drive */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition cursor-pointer"
                              title="مشاهده در گوگل درایو"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete action */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(file)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs transition cursor-pointer border border-rose-200"
                            title="حذف از گوگل درایو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= LOCAL / OFFLINE BACKUP TAB ================= */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-950">
                امنیت کامل و ۱۰۰٪ آفلاین داده‌ها (عدم وابستگی به اینترنت)
              </div>
              <p className="text-emerald-800 leading-relaxed">
                حتی بدون دسترسی به اینترنت یا حساب جیمیل، می‌توانید فایل‌های پشتیبان را مستقیماً روی کامپیوتر یا فلش‌مموری ذخیره (Export) نموده و هر زمان که نیاز داشتید با فشردن یک دکمه بازگردانی (Import) فرمایید.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export Backup Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Download className="w-5 h-5 text-blue-600" />
                <span>ذخیره‌سازی دستی بکاپ روی حافظه محلی (Export JSON)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                یک نسخه کامل از تمام فاکتورها، تراکنش‌های مالی، موجودی گدام‌ها و حساب‌های مشتریان در قالب
                یک فایل استاندارد JSON در حافظهٔ دستگاه شما دانلود خواهد شد.
              </p>
              <button
                type="button"
                onClick={onLocalExport}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>دانلود و ذخیره فایل JSON در کامپیوتر</span>
              </button>
            </div>

            {/* Import Backup Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>بازیابی اطلاعات از فایل محلی (Import JSON)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                فایل پشتیبان JSON دانلود شده از قبل را انتخاب نمایید تا پایگاه داده به صورت کامل جایگزین
                و بازگردانی شود.
              </p>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>انتخاب و بازگردانی فایل JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && onLocalImport) {
                      onLocalImport(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM RESTORE ================= */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-slate-900">تأیید بازیابی اطلاعات از گوگل درایو</h4>
                <p className="text-xs text-slate-500">جایگزینی داده‌های فعلی سیستم با این نسخه</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200">
              آیا مطمئن هستید که می‌خواهید فایل{' '}
              <strong className="font-mono text-slate-900">{confirmRestoreFile.name}</strong> را
              بازیابی کنید؟ تمام داده‌های کنونی با اطلاعات موجود در این نسخه جایگزین خواهند شد.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreFile(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteRestore}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>تأیید و بازیابی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETION (Workspace Integration Requirement) ================= */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-slate-900">تأیید حذف فایل از گوگل درایو</h4>
                <p className="text-xs text-slate-500">عملیات غیرقابل بازگشت</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
              آیا از حذف فایل پشتیبان{' '}
              <strong className="font-mono text-slate-900">{confirmDeleteFile.name}</strong> از گوگل
              درایو اطمینان دارید؟ این فایل برای همیشه پاک خواهد شد.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف دائمی از درایو</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
