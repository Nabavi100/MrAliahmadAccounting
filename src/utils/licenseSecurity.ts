/**
 * Security, Anti-Tamper & License Management Engine
 * Provides cryptographic tamper-resistance, expiration tracking,
 * trial limitations, anti-rollback checks, and secret access management.
 */

import { verifyMasterSecurityPassword } from './securityMaster';

export type LicenseMode = 'unlimited' | 'trial_1m' | 'trial_3m' | 'trial_6m' | 'trial_1y' | 'custom';

export interface AppLicenseData {
  id: string;
  mode: LicenseMode;
  clientName: string;
  startDate: string; // ISO String
  expiryDate: string | null; // ISO String or null for unlimited
  machineCode: string;
  masterPin: string; // Secret PIN to access hidden menu
  lastKnownTimestamp: number;
  lastDailyAlertDate?: string; // YYYY-MM-DD
  lastHourlyAlertTimestamp?: number; // epoch ms
  signature: string; // Tamper-proof cryptographic checksum
}

export interface LicenseStatusResult {
  isValid: boolean;
  isExpired: boolean;
  isTampered: boolean;
  isClockRolledBack: boolean;
  isUnlimited: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  statusText: string;
  shouldShowDailyAlert: boolean;
  shouldShowHourlyAlert: boolean;
  expiryDateFormatted: string;
  license: AppLicenseData;
}

const STORAGE_KEY = 'hesabdar_sys_lic_v2';
const SIG_STORAGE_KEY = '_hesabdar_sec_sig_vault';
const MASTER_SALT = 'HESABDAR_AF_SECURE_VAULT_2026_!@#$%^&*()_NABAVI_HASH';

// Simple robust offline SHA-256 implementation
async function sha256(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }
  // Synchronous bitwise fallback hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  let hash2 = 0x5bd1e995;
  for (let i = 0; i < str.length; i++) {
    hash2 = (hash2 ^ str.charCodeAt(i)) * 16777619;
  }
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  return `${hex1}${hex2}${hex1.split('').reverse().join('')}${hex2}`;
}

// Generate machine fingerprint based on browser / canvas / screen specs
export function getMachineFingerprint(): string {
  try {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const navInfo = `${navigator.language}_${navigator.platform}_${navigator.hardwareConcurrency || 4}`;
    const raw = `${screenInfo}#${navInfo}#HESABDAR_APP`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, 'X');
    return `AFG-${code.substring(0, 4)}-${code.substring(4, 8)}`;
  } catch {
    return 'AFG-9900-NAB7';
  }
}

// Create signature for license payload
export async function calculateLicenseSignature(data: Omit<AppLicenseData, 'signature'>): Promise<string> {
  const payload = [
    data.id,
    data.mode,
    data.clientName,
    data.startDate,
    data.expiryDate || 'PERPETUAL',
    data.machineCode,
    data.masterPin,
    MASTER_SALT,
  ].join(':::');
  return sha256(payload);
}

// Default license: 1 month trial by default or configured
export async function createDefaultLicense(): Promise<AppLicenseData> {
  const machineCode = getMachineFingerprint();
  const now = new Date();
  const startDate = now.toISOString();
  
  // Default: 30 days trial
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const baseData: Omit<AppLicenseData, 'signature'> = {
    id: 'LIC-' + Date.now().toString(36).toUpperCase(),
    mode: 'trial_1m',
    clientName: 'نسخه آزمایشی سیستم',
    startDate,
    expiryDate,
    machineCode,
    masterPin: '', // Confidential master key verified via secure cryptographic digest
    lastKnownTimestamp: now.getTime(),
    lastDailyAlertDate: '',
    lastHourlyAlertTimestamp: 0,
  };

  const signature = await calculateLicenseSignature(baseData);
  const fullLicense: AppLicenseData = { ...baseData, signature };
  saveLicenseToStorage(fullLicense);
  return fullLicense;
}

export function getStoredLicenseRaw(): AppLicenseData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLicenseToStorage(lic: AppLicenseData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lic));
    localStorage.setItem(SIG_STORAGE_KEY, lic.signature);
  } catch (e) {
    console.error('Failed to persist license:', e);
  }
}

/**
 * Validate the license, anti-tamper signature, clock status, and calculate expiration metrics.
 */
export async function verifyLicense(): Promise<LicenseStatusResult> {
  let lic = getStoredLicenseRaw();
  if (!lic) {
    lic = await createDefaultLicense();
  }

  // Clear legacy plaintext PINs to ensure master cryptographic hash is used
  if (lic.masterPin === '140399' || verifyMasterSecurityPassword(lic.masterPin)) {
    lic.masterPin = '';
    lic.signature = await calculateLicenseSignature({
      id: lic.id,
      mode: lic.mode,
      clientName: lic.clientName,
      startDate: lic.startDate,
      expiryDate: lic.expiryDate,
      machineCode: lic.machineCode,
      masterPin: lic.masterPin,
      lastKnownTimestamp: lic.lastKnownTimestamp,
      lastDailyAlertDate: lic.lastDailyAlertDate,
      lastHourlyAlertTimestamp: lic.lastHourlyAlertTimestamp,
    });
    saveLicenseToStorage(lic);
  }

  const machineCode = getMachineFingerprint();
  const nowMs = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Anti-Tamper signature verification
  const expectedSig = await calculateLicenseSignature({
    id: lic.id,
    mode: lic.mode,
    clientName: lic.clientName,
    startDate: lic.startDate,
    expiryDate: lic.expiryDate,
    machineCode: lic.machineCode,
    masterPin: lic.masterPin,
    lastKnownTimestamp: lic.lastKnownTimestamp,
    lastDailyAlertDate: lic.lastDailyAlertDate,
    lastHourlyAlertTimestamp: lic.lastHourlyAlertTimestamp,
  });

  const secondaryVaultSig = localStorage.getItem(SIG_STORAGE_KEY);
  const isTampered = lic.signature !== expectedSig || (secondaryVaultSig !== null && secondaryVaultSig !== lic.signature);

  // 2. Anti-Clock-Rollback check (prevent user turning back computer clock by > 1 hour)
  const isClockRolledBack = lic.lastKnownTimestamp && nowMs < (lic.lastKnownTimestamp - 3600000);

  // Update last known timestamp if current clock is moving forward
  if (!isClockRolledBack && nowMs > (lic.lastKnownTimestamp || 0)) {
    lic.lastKnownTimestamp = nowMs;
    // We update timestamp in storage without breaking signature
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lic));
    } catch {}
  }

  // 3. Unlimited mode check
  if (lic.mode === 'unlimited' || !lic.expiryDate) {
    return {
      isValid: !isTampered && !isClockRolledBack,
      isExpired: false,
      isTampered,
      isClockRolledBack,
      isUnlimited: true,
      daysRemaining: 9999,
      hoursRemaining: 999999,
      statusText: 'لایسنس دائمی و بدون محدودیت زمانی',
      shouldShowDailyAlert: false,
      shouldShowHourlyAlert: false,
      expiryDateFormatted: 'نامحدود (دائمی)',
      license: lic,
    };
  }

  // 4. Calculate expiration
  const expiryMs = new Date(lic.expiryDate).getTime();
  const diffMs = expiryMs - nowMs;
  const isExpired = diffMs <= 0;

  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  // Format Persian/Jalali date display
  let expiryDateFormatted = lic.expiryDate;
  try {
    const d = new Date(lic.expiryDate);
    expiryDateFormatted = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {}

  // 5. Alert Trigger Rules:
  // - Week before expiry (<= 7 days and > 1 day): Show once on first app open of the day
  // - Final day (<= 24 hours): Show every 1 hour
  let shouldShowDailyAlert = false;
  let shouldShowHourlyAlert = false;

  if (!isExpired && !isTampered && !isClockRolledBack) {
    if (daysRemaining <= 7 && daysRemaining > 1) {
      if (lic.lastDailyAlertDate !== todayStr) {
        shouldShowDailyAlert = true;
      }
    } else if (daysRemaining <= 1 || hoursRemaining <= 24) {
      const lastHourly = lic.lastHourlyAlertTimestamp || 0;
      // 1 hour = 3600000 ms
      if (nowMs - lastHourly >= 3600000) {
        shouldShowHourlyAlert = true;
      }
    }
  }

  let statusText = 'فعال';
  if (isTampered) {
    statusText = 'مخدوش / دستکاری شناسایی شد';
  } else if (isClockRolledBack) {
    statusText = 'خطای تغییر تاریخ سیستم (ساعت به عقب کشیده شده)';
  } else if (isExpired) {
    statusText = 'مهلت استفاده منقضی گردیده است';
  } else if (daysRemaining <= 1) {
    statusText = `روز پایانی مهلت (${hoursRemaining} ساعت باقی‌مانده)`;
  } else if (daysRemaining <= 7) {
    statusText = `هفته پایانی مهلت (${daysRemaining} روز باقی‌مانده)`;
  } else {
    statusText = `${daysRemaining} روز از مهلت لایسنس باقی مانده است`;
  }

  return {
    isValid: !isExpired && !isTampered && !isClockRolledBack,
    isExpired,
    isTampered,
    isClockRolledBack,
    isUnlimited: false,
    daysRemaining,
    hoursRemaining,
    statusText,
    shouldShowDailyAlert,
    shouldShowHourlyAlert,
    expiryDateFormatted,
    license: lic,
  };
}

// Mark alert as shown
export function markDailyAlertShown(): void {
  const lic = getStoredLicenseRaw();
  if (lic) {
    lic.lastDailyAlertDate = new Date().toISOString().split('T')[0];
    saveLicenseToStorage(lic);
  }
}

export function markHourlyAlertShown(): void {
  const lic = getStoredLicenseRaw();
  if (lic) {
    lic.lastHourlyAlertTimestamp = Date.now();
    saveLicenseToStorage(lic);
  }
}

// Update license settings securely
export async function updateLicenseSettings(
  mode: LicenseMode,
  clientName: string,
  customDays?: number,
  customExpiryDate?: string,
  newMasterPin?: string
): Promise<AppLicenseData> {
  const lic = getStoredLicenseRaw() || (await createDefaultLicense());
  const now = new Date();
  let expiryDate: string | null = null;

  if (mode === 'unlimited') {
    expiryDate = null;
  } else if (mode === 'trial_1m') {
    expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'trial_3m') {
    expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'trial_6m') {
    expiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'trial_1y') {
    expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'custom') {
    if (customExpiryDate) {
      expiryDate = new Date(customExpiryDate).toISOString();
    } else if (customDays && customDays > 0) {
      expiryDate = new Date(now.getTime() + customDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const updatedBase: Omit<AppLicenseData, 'signature'> = {
    ...lic,
    mode,
    clientName: clientName || lic.clientName,
    startDate: now.toISOString(),
    expiryDate,
    masterPin: newMasterPin && newMasterPin.trim() ? newMasterPin.trim() : lic.masterPin,
    lastKnownTimestamp: now.getTime(),
    lastDailyAlertDate: '',
    lastHourlyAlertTimestamp: 0,
  };

  const signature = await calculateLicenseSignature(updatedBase);
  const completeLic: AppLicenseData = { ...updatedBase, signature };
  saveLicenseToStorage(completeLic);
  return completeLic;
}

// Generate offline activation code for this machine
export async function generateActivationCode(machineCode: string, days: number): Promise<string> {
  const hash = await sha256(`KEY_${machineCode}_DAYS_${days}_${MASTER_SALT}`);
  const segment1 = hash.substring(0, 4).toUpperCase();
  const segment2 = hash.substring(4, 8).toUpperCase();
  const segment3 = hash.substring(8, 12).toUpperCase();
  return `LIC-${days}-${segment1}-${segment2}-${segment3}`;
}

// Validate and apply an offline activation code
export async function applyActivationCode(code: string): Promise<{ success: boolean; message: string }> {
  const cleaned = code.trim().toUpperCase();
  const machineCode = getMachineFingerprint();

  // Check valid presets: 30, 90, 180, 365, 9999 (unlimited)
  const presets = [30, 90, 180, 365, 9999];
  for (const p of presets) {
    const expected = await generateActivationCode(machineCode, p);
    if (cleaned === expected) {
      if (p === 9999) {
        await updateLicenseSettings('unlimited', 'لایسنس دائمی فعال‌شده');
        return { success: true, message: 'نرم‌افزار با موفقیت به لایسنس دائمی و بدون محدودیت ارتقا یافت!' };
      } else {
        await updateLicenseSettings('custom', `لایسنس تمدید شده (${p} روز)`, p);
        return { success: true, message: `نرم‌افزار با موفقیت برای مدت ${p} روز فعال گردید!` };
      }
    }
  }

  return { success: false, message: 'کد فعال‌سازی نامعتبر است یا با شناسه این رایانه تطابق ندارد.' };
}
