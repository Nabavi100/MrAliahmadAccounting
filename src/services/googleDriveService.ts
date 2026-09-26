import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Defined OAuth scopes for Google Drive
export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Lazy Firebase App initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface DriveUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Cache the access token in memory (do not use localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let currentDriveUser: DriveUser | null = null;
let isSigningIn = false;

export const isRunningInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const openInNewTab = () => {
  window.open(window.location.href, '_blank');
};

export const parseAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'پنجره ورود گوگل توسط مرورگر یا محدودیت محیط تعبیه‌شده (iFrame) مسدود شد. برای استفاده از گوگل درایو واقعی برنامه را در برگهٔ جدید باز کنید یا از ورود شبیه‌ساز ابری استفاده نمایید.';
  }
  if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed')) {
    return 'پنجره ورود گوگل پیش از تکمیل توسط کاربر بسته شد.';
  }
  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain') || message.includes('origin_mismatch')) {
    return 'دامنه موقت پیش‌نمایش در لیست دامنه‌های مجاز کنسول گوگل ثبت نیست (سیاست امنیتی گوگل در محیط تست). می‌توانید برنامه را در برگهٔ جدید باز کنید یا از دکمه «اتصال ابری پیش‌نمایش» استفاده فرمایید.';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'خطای شبکه در ارتباط با سرورهای گوگل. لطفاً اتصال اینترنت یا پروکسی خود را بررسی نمایید.';
  }
  if (code === 'auth/cancelled-popup-request' || message.includes('cancelled-popup-request')) {
    return 'درخواست قبلی ورود لغو گردید. لطفاً مجدداً امتحان کنید.';
  }
  return message || 'اتصال به حساب گوگل با خطا مواجه شد. در محیط پیش‌نمایش، ورود با گوگل به علت محدودیت‌های امنیتی کراس-اوریجین رد می‌شود.';
};

// ================= SIMULATED CLOUD STORAGE FOR PREVIEW / DEMO =================
const SIM_STORAGE_KEY = 'HESABDAR_SIMULATED_GDRIVE_BACKUPS_STORE';

interface SimStoredFile {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  isAuto: boolean;
  content: string;
}

const getSimStoredFiles = (): SimStoredFile[] => {
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveSimStoredFiles = (files: SimStoredFile[]) => {
  try {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.warn('Failed to save sim drive files:', e);
  }
};

/**
 * Sign in with Demo / Simulated Google account (nabavi100@gmail.com)
 * Enables full cloud backup features without OAuth domain blocking in preview iframe
 */
export const signInWithDemoGoogleAccount = async (): Promise<{
  user: DriveUser;
  accessToken: string;
}> => {
  const demoUser: DriveUser = {
    uid: 'google-drive-nabavi-100',
    email: 'nabavi100@gmail.com',
    displayName: 'برادران نبوی (Google Drive)',
    photoURL: null,
  };
  const demoToken = 'demo-token-nabavi-' + Date.now();
  cachedAccessToken = demoToken;
  currentDriveUser = demoUser;
  return { user: demoUser, accessToken: demoToken };
};

/**
 * Sign in using Google Identity Services (GIS) Token Client
 */
export const signInWithGisTokenClient = (): Promise<{
  user: DriveUser;
  accessToken: string;
}> => {
  return new Promise((resolve, reject) => {
    const googleObj = (window as any).google;
    if (!googleObj?.accounts?.oauth2) {
      reject(new Error('کتابخانه Google Identity Services در دسترس نیست.'));
      return;
    }

    const clientId = firebaseConfig.oAuthClientId;
    if (!clientId) {
      reject(new Error('شناسه OAuth Client ID در تنظیمات برنامه یافت نشد.'));
      return;
    }

    const tokenClient = googleObj.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
      callback: async (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error || 'خطای احراز هویت با گوگل'));
          return;
        }
        if (!resp.access_token) {
          reject(new Error('توکن دسترسی از گوگل دریافت نگردید.'));
          return;
        }

        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          const profile = profileRes.ok ? await profileRes.json() : {};

          const driveUser: DriveUser = {
            uid: profile.sub || 'gis-' + Date.now(),
            email: profile.email || null,
            displayName: profile.name || (profile.email ? profile.email.split('@')[0] : 'کاربر گوگل'),
            photoURL: profile.picture || null,
          };

          resolve({
            user: driveUser,
            accessToken: resp.access_token,
          });
        } catch {
          resolve({
            user: {
              uid: 'gis-' + Date.now(),
              email: null,
              displayName: 'کاربر گوگل',
              photoURL: null,
            },
            accessToken: resp.access_token,
          });
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'پنجره انتخاب حساب گوگل باز نشد.'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  isAuto?: boolean;
}

export interface AutoBackupSettings {
  enabled: boolean;
  intervalMinutes: number; // 60 = 1 hour, 360 = 6 hours, 720 = 12 hours, 1440 = 24 hours
  lastBackupTime: string | null;
  lastBackupFileName: string | null;
  lastBackupStatus: 'success' | 'error' | null;
  lastErrorText?: string;
  keepMaxBackups: number; // e.g. 15
}

const SETTINGS_KEY = 'HESABDAR_GDRIVE_AUTO_BACKUP_CONFIG';

export const getAutoBackupSettings = (): AutoBackupSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse auto backup settings:', e);
  }
  return {
    enabled: true,
    intervalMinutes: 360, // Every 6 hours
    lastBackupTime: null,
    lastBackupFileName: null,
    lastBackupStatus: null,
    keepMaxBackups: 15,
  };
};

export const saveAutoBackupSettings = (settings: AutoBackupSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save auto backup settings:', e);
  }
};

/**
 * Initialize auth state listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: DriveUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (firebaseUser && cachedAccessToken) {
      currentDriveUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      if (onAuthSuccess) onAuthSuccess(currentDriveUser, cachedAccessToken);
    } else if (!isSigningIn && !currentDriveUser) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup and obtain access token
 * Tries Firebase Auth popup first, then falls back to GIS Token Client if popup blocked or domain restricted
 */
export const signInWithGoogleDrive = async (): Promise<{
  user: DriveUser;
  accessToken: string;
} | null> => {
  isSigningIn = true;
  let lastError: any = null;

  // 1. Try Firebase Auth Popup first
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      currentDriveUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      return { user: currentDriveUser, accessToken: cachedAccessToken };
    }
  } catch (error: any) {
    lastError = error;
    console.warn('Firebase signInWithPopup failed, attempting fallback...', error);
  }

  // 2. Try Google Identity Services (GIS) Token Client fallback
  try {
    if (typeof window !== 'undefined') {
      const gisResult = await signInWithGisTokenClient();
      cachedAccessToken = gisResult.accessToken;
      currentDriveUser = gisResult.user;
      return { user: currentDriveUser, accessToken: cachedAccessToken };
    }
  } catch (gisError: any) {
    console.warn('GIS fallback failed:', gisError);
  } finally {
    isSigningIn = false;
  }

  // If we reach here, throw a clear Persian error
  const friendlyMsg = parseAuthErrorMessage(lastError);
  throw new Error(friendlyMsg);
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogleDrive = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  cachedAccessToken = null;
  currentDriveUser = null;
};

export const getCurrentDriveUser = (): DriveUser | null => {
  if (currentDriveUser) return currentDriveUser;
  if (auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      photoURL: auth.currentUser.photoURL,
    };
  }
  return null;
};

/**
 * Find or create dedicated folder 'Hesabdar_Backups' in Google Drive
 */
export const getOrCreateBackupFolder = async (token: string): Promise<string> => {
  const query = encodeURIComponent(
    "name = 'Hesabdar_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('توکن اتصال به گوگل منقضی شده است. لطفاً مجدداً دکمه ورود را بزنید.');
    }
    throw new Error(`خطای ارتباط با درایو (${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Hesabdar_Backups',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'پوشه نگهداری نسخه‌های پشتیبان نرم‌افزار حسابداری و گدام‌داری',
    }),
  });

  if (!createRes.ok) {
    throw new Error('امکان ایجاد پوشه در گوگل درایو میسر نشد.');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
};

/**
 * Upload JSON backup to Google Drive
 */
export const uploadBackupToDrive = async (
  token: string,
  jsonData: string,
  options?: {
    customName?: string;
    isAuto?: boolean;
    folderId?: string;
  }
): Promise<DriveBackupFile> => {
  const isAuto = !!options?.isAuto;
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName =
    options?.customName ||
    `Hesabdar_${isAuto ? 'AutoBackup' : 'Backup'}_${dateStr}.json`;

  // Demo token simulation
  if (token.startsWith('demo-')) {
    const existing = getSimStoredFiles();
    const newFile: SimStoredFile = {
      id: 'sim-drive-' + Date.now(),
      name: fileName,
      size: `${(jsonData.length / 1024).toFixed(1)} KB`,
      createdTime: now.toISOString(),
      modifiedTime: now.toISOString(),
      isAuto,
      content: jsonData,
    };
    saveSimStoredFiles([newFile, ...existing]);
    return {
      id: newFile.id,
      name: newFile.name,
      size: newFile.size,
      createdTime: newFile.createdTime,
      modifiedTime: newFile.modifiedTime,
      isAuto: newFile.isAuto,
    };
  }

  const folderId = options?.folderId || (await getOrCreateBackupFolder(token));

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
    description: isAuto
      ? 'نسخه پشتیبان خودکار سیستم حسابداری'
      : 'نسخه پشتیبان دستی سیستم حسابداری',
    properties: {
      app: 'hesabdar',
      type: isAuto ? 'auto' : 'manual',
    },
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    jsonData +
    closeDelim;

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,modifiedTime,webViewLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('توکن اتصال منقضی شده است. لطفاً مجدداً وارد شوید.');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'خطا در بارگذاری فایل در گوگل درایو.');
  }

  const fileData = await res.json();
  return {
    id: fileData.id,
    name: fileData.name,
    size: fileData.size,
    createdTime: fileData.createdTime,
    modifiedTime: fileData.modifiedTime,
    webViewLink: fileData.webViewLink,
    isAuto,
  };
};

/**
 * List backups from Google Drive folder
 */
export const listDriveBackups = async (
  token: string,
  folderId?: string
): Promise<DriveBackupFile[]> => {
  if (token.startsWith('demo-')) {
    const simFiles = getSimStoredFiles();
    return simFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      isAuto: f.isAuto,
    }));
  }

  const targetFolderId = folderId || (await getOrCreateBackupFolder(token));
  const query = encodeURIComponent(
    `'${targetFolderId}' in parents and trashed = false`
  );
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,size,createdTime,modifiedTime,webViewLink,properties)&pageSize=50`;

  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('نشست شما منقضی شده است. لطفاً مجدداً متصل شوید.');
    }
    throw new Error('دریافت لیست فایل‌های پشتیبان از گوگل درایو ناموفق بود.');
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    isAuto: f.name?.includes('AutoBackup') || f.properties?.type === 'auto',
  }));
};

/**
 * Download a backup file's raw JSON content
 */
export const downloadBackupFromDrive = async (
  fileId: string,
  token: string
): Promise<string> => {
  if (token.startsWith('demo-')) {
    const simFiles = getSimStoredFiles();
    const found = simFiles.find(f => f.id === fileId);
    if (!found) {
      throw new Error('فایل پشتیبان در حافظه ابری یافت نشد.');
    }
    return found.content;
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('نشست منقضی شده است. لطفاً مجدداً وارد شوید.');
    }
    throw new Error('دانلود فایل پشتیبان از درایو با خطا مواجه شد.');
  }

  return await res.text();
};

/**
 * Delete a backup file from Google Drive (MUST be preceded by user confirmation in UI)
 */
export const deleteBackupFromDrive = async (
  fileId: string,
  token: string
): Promise<boolean> => {
  if (token.startsWith('demo-')) {
    const simFiles = getSimStoredFiles();
    saveSimStoredFiles(simFiles.filter(f => f.id !== fileId));
    return true;
  }

  const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('نشست منقضی شده است.');
    }
    throw new Error('امکان حذف فایل از گوگل درایو وجود ندارد.');
  }

  return true;
};

/**
 * Prune old auto-backups beyond keepMaxBackups
 */
export const pruneOldAutoBackups = async (
  token: string,
  maxToKeep: number = 15
) => {
  try {
    const list = await listDriveBackups(token);
    const autoBackups = list.filter(f => f.isAuto);
    if (autoBackups.length > maxToKeep) {
      const toDelete = autoBackups.slice(maxToKeep);
      for (const item of toDelete) {
        await deleteBackupFromDrive(item.id, token).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Pruning old auto backups warning:', e);
  }
};
