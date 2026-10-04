import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  DatabaseBackup,
  Clock,
  HardDriveDownload,
  KeyRound,
  ShieldCheck,
  Power,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { formatBytes, formatTimestamp } from '../services/appDataService';

/**
 * Server data persistence panel.
 *
 * Makes the automatic server-side storage visible: whether the books are safely
 * saved on the server, when they were last saved and by whom, plus one-click
 * access to the rotating server backups.
 */
export const ServerSyncPanel: React.FC = () => {
  const {
    serverSyncState,
    serverSyncEnabled,
    serverSyncMessage,
    serverDataInfo,
    serverBackups,
    isServerSyncing,
    syncToServerNow,
    loadFromServer,
    restoreServerBackup,
    refreshServerBackups,
    setServerAccessKey,
    toggleServerSync,
    currentUser,
  } = useAccounting();

  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null);

  const runAction = async (label: string, action: () => Promise<{ ok: boolean; message: string }>) => {
    setActionMessage(null);
    const result = await action();
    setActionMessage({ type: result.ok ? 'success' : 'error', text: `${label}: ${result.message}` });
  };

  const statusConfig: Record<
    string,
    { label: string; description: string; tone: string; icon: React.ReactNode }
  > = {
    connected: {
      label: 'ذخیره‌سازی خودکار روی سرور فعال است',
      description: 'هر تغییری که در برنامه می‌دهید، به‌صورت خودکار روی سرور ذخیره می‌شود.',
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    },
    unknown: {
      label: 'در حال بررسی ارتباط با سرور…',
      description: 'لطفاً چند لحظه صبر کنید.',
      tone: 'bg-slate-50 border-slate-200 text-slate-700',
      icon: <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />,
    },
    unreachable: {
      label: 'ارتباط با سرور برقرار نشد',
      description: 'اطلاعات شما در همین مرورگر محفوظ است و به‌محض برقراری ارتباط، روی سرور ذخیره می‌شود.',
      tone: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    },
    unauthorized: {
      label: 'کلید دسترسی سرور نامعتبر است',
      description: 'برای ذخیره‌سازی روی سرور، کلید دسترسی صحیح را در کادر پائین وارد کنید.',
      tone: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
    },
    conflict: {
      label: 'تعارض: نسخه جدیدتری روی سرور وجود دارد',
      description: 'برای جلوگیری از از دست رفتن اطلاعات، ذخیره‌سازی خودکار موقتاً متوقف شده است.',
      tone: 'bg-orange-50 border-orange-200 text-orange-900',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    },
  };

  const status = statusConfig[serverSyncState] || statusConfig.unknown;

  return (
    <div className="space-y-4" dir="rtl">
      {/* ---------------- Status card ---------------- */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">ذخیره‌سازی خودکار روی سرور</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                اطلاعات حسابداری مستقیماً روی سرور نگهداری می‌شود، نه فقط در حافظه مرورگر
              </p>
            </div>
          </div>

          {/* master switch */}
          <button
            type="button"
            id="server-sync-toggle"
            onClick={() => toggleServerSync(!serverSyncEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer active:scale-95 ${
              serverSyncEnabled
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title={serverSyncEnabled ? 'توقف موقت ذخیره‌سازی خودکار' : 'فعال‌سازی ذخیره‌سازی خودکار'}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{serverSyncEnabled ? 'فعال' : 'غیرفعال'}</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* status banner */}
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2.5 ${status.tone}`}>
            <span className="shrink-0 mt-0.5">
              {isServerSyncing ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : status.icon}
            </span>
            <div className="space-y-1 min-w-0">
              <div>{isServerSyncing ? 'در حال همگام‌سازی با سرور…' : status.label}</div>
              <p className="font-medium opacity-90 leading-relaxed">{serverSyncMessage || status.description}</p>
              {!serverSyncEnabled && (
                <p className="font-medium opacity-90">
                  توجه: ذخیره‌سازی خودکار غیرفعال است؛ تا فعال‌سازی مجدد، تغییرات روی سرور ثبت نمی‌شود.
                </p>
              )}
            </div>
          </div>

          {/* details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5" /> آخرین ذخیره‌سازی روی سرور
              </div>
              <div className="text-xs font-black text-slate-800">{formatTimestamp(serverDataInfo.updatedAt)}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                <UserIcon className="w-3.5 h-3.5" /> آخرین ذخیره‌کننده
              </div>
              <div className="text-xs font-black text-slate-800">{serverDataInfo.updatedBy || '—'}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                <DatabaseBackup className="w-3.5 h-3.5" /> نسخه‌های پشتیبان روی سرور
              </div>
              <div className="text-xs font-black text-slate-800">
                {serverBackups.length ? `${serverBackups.length} نسخه` : 'بدون نسخه'}
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              id="server-sync-now"
              disabled={isServerSyncing}
              onClick={() => runAction('ذخیره روی سرور', syncToServerNow)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
            >
              <CloudUpload className="w-4 h-4" />
              <span>ذخیره فوری روی سرور</span>
            </button>

            <button
              type="button"
              id="server-load-now"
              disabled={isServerSyncing}
              onClick={() => runAction('بازخوانی از سرور', loadFromServer)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
            >
              <CloudDownload className="w-4 h-4" />
              <span>بازخوانی آخرین نسخه سرور</span>
            </button>

            <button
              type="button"
              id="server-refresh-backups"
              disabled={isServerSyncing}
              onClick={() => refreshServerBackups().catch(() => {})}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>بروزرسانی فهرست پشتیبان‌ها</span>
            </button>
          </div>

          {actionMessage && (
            <div
              className={`p-3 rounded-xl text-[11px] font-bold flex items-start gap-2 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Conflict resolution ---------------- */}
      {serverSyncState === 'conflict' && (
        <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-black text-orange-900">رفع تعارض اطلاعات</div>
              <p className="text-orange-800 leading-relaxed">
                اطلاعات روی سرور توسط کاربر یا دستگاه دیگری جدیدتر شده است. یکی از دو کار زیر را انتخاب کنید:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction('بازخوانی نسخه سرور', loadFromServer)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
            >
              نسخه سرور را بپذیر (اطلاعات سرور بارگذاری شود)
            </button>
            <button
              type="button"
              onClick={() => runAction('ذخیره اجباری', syncToServerNow)}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
            >
              نسخه این دستگاه را جایگزین کن (با گرفتن پشتیبان)
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Access key ---------------- */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-600" />
          <h4 className="text-xs font-black text-slate-900">کلید دسترسی سرور (APP_DATA_KEY)</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          اگر روی سرور متغیر محیطی <code className="font-mono bg-slate-100 px-1 rounded">APP_DATA_KEY</code> تنظیم شده باشد،
          فقط درخواست‌هایی که این کلید را همراه داشته باشند می‌توانند اطلاعات را بخوانند یا ذخیره کنند.
          کلید به‌صورت خوکار به برنامه تزریق می‌شود؛ تنها در صورت نیاز، می‌توانید آن را دستی وارد کنید.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={accessKeyInput}
            onChange={e => setAccessKeyInput(e.target.value)}
            placeholder="کلید دسترسی سرور را وارد کنید…"
            dir="ltr"
            className="flex-1 min-w-[220px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition"
          />
          <button
            type="button"
            onClick={() => {
              setServerAccessKey(accessKeyInput);
              setActionMessage({ type: 'info' as any, text: 'کلید دسترسی ذخیره شد؛ در حال تلاش مجدد برای اتصال…' });
              setTimeout(() => runAction('اتصال مجدد', loadFromServer), 200);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95"
          >
            ذخیره و اتصال مجدد
          </button>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            توصیه امنیتی: روی سرورِ متصل به اینترنت، حتماً <code className="font-mono">APP_DATA_KEY</code> را تنظیم کنید
            تا هیچ برنامه یا شخص ناشناسی نتواند اطلاعات دفتر را بخواند یا تغییر دهد.
          </span>
        </div>
      </div>

      {/* ---------------- Server backups ---------------- */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDriveDownload className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-black text-slate-900">نسخه‌های پشتیبان خودکار سرور</h4>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">
            {serverBackups.length ? `${serverBackups.length} نسخه` : '—'}
          </span>
        </div>

        {serverBackups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-1">
            <DatabaseBackup className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">هنوز نسخه پشتیبانی روی سرور ثبت نشده است</p>
            <p>با هر بار ذخیره‌سازی، نسخه قبلی به‌صورت خودکار در پوشه سرور نگهداری می‌شود.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
            {serverBackups.map(backup => (
              <div key={backup.file} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTimestamp(backup.createdAt)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5" dir="ltr">
                    {backup.file} • {formatBytes(backup.sizeBytes)}
                  </div>
                </div>

                {confirmRestoreFile === backup.file ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isRestoring === backup.file}
                      onClick={async () => {
                        setIsRestoring(backup.file);
                        await runAction('بازیابی نسخه پشتیبان', () => restoreServerBackup(backup.file));
                        setIsRestoring(null);
                        setConfirmRestoreFile(null);
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      {isRestoring === backup.file ? 'در حال بازیابی…' : 'تأیید بازیابی'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreFile(null)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRestoreFile(backup.file)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    بازیابی این نسخه
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
          مسیر نگهداری اطلاعات روی سرور:{' '}
          <code className="font-mono" dir="ltr">
            server_data/appdata/accounting-data.json
          </code>{' '}
          — نسخه‌های پشتیبان در پوشه{' '}
          <code className="font-mono" dir="ltr">
            server_data/appdata/backups/
          </code>{' '}
          نگهداری می‌شوند (حداکثر ۳۰ نسخه آخر).
        </div>
      </div>
    </div>
  );
};

export default ServerSyncPanel;
