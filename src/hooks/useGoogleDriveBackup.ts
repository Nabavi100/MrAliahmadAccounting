import { useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithGoogleDrive,
  signInWithDemoGoogleAccount,
  signOutGoogleDrive,
  getDriveAccessToken,
  getCurrentDriveUser,
  uploadBackupToDrive,
  listDriveBackups,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  pruneOldAutoBackups,
  getAutoBackupSettings,
  saveAutoBackupSettings,
  initDriveAuth,
  isRunningInIframe,
  openInNewTab,
  AutoBackupSettings,
  DriveBackupFile,
  DriveUser,
} from '../services/googleDriveService';
import { useAccounting } from '../context/AccountingContext';

export interface UseGoogleDriveBackupReturn {
  user: DriveUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  isBackingUp: boolean;
  isRestoring: boolean;
  backups: DriveBackupFile[];
  isLoadingBackups: boolean;
  autoSettings: AutoBackupSettings;
  updateAutoSettings: (newSettings: Partial<AutoBackupSettings>) => void;
  connectDrive: () => Promise<boolean>;
  connectDriveDemo: () => Promise<boolean>;
  disconnectDrive: () => Promise<void>;
  performBackup: (isAuto?: boolean) => Promise<boolean>;
  restoreBackup: (fileId: string) => Promise<boolean>;
  deleteBackup: (fileId: string) => Promise<boolean>;
  refreshBackupsList: () => Promise<void>;
  authErrorMessage: string | null;
  clearAuthError: () => void;
  isIframe: boolean;
  openInNewTab: () => void;
}

export const useGoogleDriveBackup = (): UseGoogleDriveBackupReturn => {
  const { exportJSON, importJSON, notify } = useAccounting();

  const [user, setUser] = useState<DriveUser | null>(getCurrentDriveUser());
  const [isConnecting, setIsConnecting] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [autoSettings, setAutoSettings] = useState<AutoBackupSettings>(getAutoBackupSettings());

  const isConnected = !!user && !!getDriveAccessToken();
  const autoBackupTimerRef = useRef<any>(null);
  const isIframe = isRunningInIframe();

  // Listen to drive auth state changes
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (u, token) => {
        setUser(u);
        listDriveBackups(token).then(list => setBackups(list)).catch(() => {});
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthErrorMessage(null);
  }, []);

  // Refresh backups list
  const refreshBackupsList = useCallback(async () => {
    const token = getDriveAccessToken();
    if (!token) return;

    setIsLoadingBackups(true);
    try {
      const list = await listDriveBackups(token);
      setBackups(list);
    } catch (err: any) {
      console.warn('Failed to load drive backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  // Update auto backup settings
  const updateAutoSettings = useCallback((newSettings: Partial<AutoBackupSettings>) => {
    setAutoSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveAutoBackupSettings(updated);
      return updated;
    });
  }, []);

  // Perform Backup to Google Drive
  const performBackup = useCallback(
    async (isAuto = false): Promise<boolean> => {
      const token = getDriveAccessToken();
      if (!token) {
        if (!isAuto) {
          notify('error', 'اتصال به گوگل درایو برقرار نیست', 'لطفاً ابتدا با حساب گوگل خود وارد شوید.');
        }
        return false;
      }

      setIsBackingUp(true);
      try {
        const jsonContent = exportJSON();
        const uploadedFile = await uploadBackupToDrive(token, jsonContent, { isAuto });

        // Update settings
        const now = new Date().toISOString();
        updateAutoSettings({
          lastBackupTime: now,
          lastBackupFileName: uploadedFile.name,
          lastBackupStatus: 'success',
          lastErrorText: undefined,
        });

        // Prune older auto backups if needed
        pruneOldAutoBackups(token, autoSettings.keepMaxBackups).catch(() => {});

        // Refresh list
        refreshBackupsList();

        if (isAuto) {
          notify('success', 'پشتیبان‌گیری خودکار در گوگل درایو', `نسخه جدید (${uploadedFile.name}) با موفقیت ذخیره شد.`);
        } else {
          notify('success', 'پشتیبان‌گیری موفق در گوگل درایو', `فایل ${uploadedFile.name} در پوشه Hesabdar_Backups ذخیره شد.`);
        }
        return true;
      } catch (err: any) {
        console.error('Backup error:', err);
        updateAutoSettings({
          lastBackupStatus: 'error',
          lastErrorText: err?.message || 'خطا در بارگذاری',
        });
        notify('error', 'خطا در پشتیبان‌گیری ابری', err?.message || 'بارگذاری فایل در گوگل درایو ناموفق بود.');
        return false;
      } finally {
        setIsBackingUp(false);
      }
    },
    [exportJSON, notify, updateAutoSettings, refreshBackupsList, autoSettings.keepMaxBackups]
  );

  // Restore backup from Google Drive
  const restoreBackup = useCallback(
    async (fileId: string): Promise<boolean> => {
      const token = getDriveAccessToken();
      if (!token) {
        notify('error', 'خطای دسترسی', 'لطفاً ابتدا به گوگل درایو متصل شوید.');
        return false;
      }

      setIsRestoring(true);
      try {
        const jsonString = await downloadBackupFromDrive(fileId, token);
        const success = importJSON(jsonString);
        if (success) {
          notify('success', 'بازیابی موفق اطلاعات', 'اطلاعات سیستم با موفقیت از فایل پشتیبان گوگل درایو بازیابی گردید.');
          return true;
        } else {
          notify('error', 'خطا در بازیابی', 'ساختار فایل پشتیبان نامعتبر است.');
          return false;
        }
      } catch (err: any) {
        console.error('Restore error:', err);
        notify('error', 'خطا در دانلود پشتیبان', err?.message || 'عدم امکان دریافت فایل از گوگل درایو.');
        return false;
      } finally {
        setIsRestoring(false);
      }
    },
    [importJSON, notify]
  );

  // Delete backup from Google Drive
  const deleteBackup = useCallback(
    async (fileId: string): Promise<boolean> => {
      const token = getDriveAccessToken();
      if (!token) return false;

      try {
        await deleteBackupFromDrive(fileId, token);
        setBackups(prev => prev.filter(b => b.id !== fileId));
        notify('info', 'حذف پشتیبان', 'فایل مورد نظر از گوگل درایو حذف شد.');
        return true;
      } catch (err: any) {
        notify('error', 'خطا در حذف فایل', err?.message || 'امکان حذف فایل وجود ندارد.');
        return false;
      }
    },
    [notify]
  );

  // Connect to Google Drive
  const connectDrive = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setAuthErrorMessage(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setAuthErrorMessage(null);
        notify('success', 'اتصال موفق به گوگل درایو', `خوش آمدید، ${res.user.displayName || res.user.email}`);
        // Fetch existing backups
        const list = await listDriveBackups(res.accessToken);
        setBackups(list);

        // If auto backup is enabled and never backed up, trigger first backup
        const currentSettings = getAutoBackupSettings();
        if (currentSettings.enabled && !currentSettings.lastBackupTime) {
          setTimeout(() => {
            performBackup(true);
          }, 1500);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Connect drive error:', err);
      const errMsg = err?.message || 'اتصال لغو شد یا با خطا مواجه گردید.';
      setAuthErrorMessage(errMsg);
      notify('error', 'خطا در اتصال به حساب گوگل', errMsg);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [notify, performBackup]);

  // Connect to Google Drive (Demo / Simulated mode for preview iframe)
  const connectDriveDemo = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setAuthErrorMessage(null);
    try {
      const res = await signInWithDemoGoogleAccount();
      if (res) {
        setUser(res.user);
        setAuthErrorMessage(null);
        notify('success', 'اتصال شبیه‌ساز ابری با موفقیت فعال شد', `خوش آمدید، ${res.user.displayName}`);
        const list = await listDriveBackups(res.accessToken);
        setBackups(list);

        const currentSettings = getAutoBackupSettings();
        if (currentSettings.enabled && !currentSettings.lastBackupTime) {
          setTimeout(() => {
            performBackup(true);
          }, 1000);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Demo connect error:', err);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [notify, performBackup]);

  // Disconnect from Google Drive
  const disconnectDrive = useCallback(async () => {
    try {
      await signOutGoogleDrive();
      setUser(null);
      setBackups([]);
      setAuthErrorMessage(null);
      notify('info', 'قطع اتصال از گوگل درایو', 'نشست گوگل درایو با موفقیت بسته شد.');
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }, [notify]);

  // Auto-backup interval runner
  useEffect(() => {
    if (!isConnected || !autoSettings.enabled) {
      if (autoBackupTimerRef.current) {
        clearInterval(autoBackupTimerRef.current);
        autoBackupTimerRef.current = null;
      }
      return;
    }

    const checkAndTriggerAutoBackup = () => {
      const token = getDriveAccessToken();
      if (!token) return;

      const currentSettings = getAutoBackupSettings();
      if (!currentSettings.enabled) return;

      const now = Date.now();
      const lastTime = currentSettings.lastBackupTime
        ? new Date(currentSettings.lastBackupTime).getTime()
        : 0;

      const intervalMs = (currentSettings.intervalMinutes || 360) * 60 * 1000;
      if (now - lastTime >= intervalMs) {
        console.log('[AutoBackup] Triggering scheduled backup to Google Drive...');
        performBackup(true);
      }
    };

    // Check once upon mount/connection
    checkAndTriggerAutoBackup();

    // Run check every 5 minutes
    autoBackupTimerRef.current = setInterval(checkAndTriggerAutoBackup, 5 * 60 * 1000);

    return () => {
      if (autoBackupTimerRef.current) {
        clearInterval(autoBackupTimerRef.current);
        autoBackupTimerRef.current = null;
      }
    };
  }, [isConnected, autoSettings.enabled, autoSettings.intervalMinutes, performBackup]);

  return {
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
  };
};
