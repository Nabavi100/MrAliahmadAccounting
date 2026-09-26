import { FixedAsset, Currency } from '../types';

/**
 * Converts Jalali (Shamsi) date components to Gregorian [year, month, day]
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + (365 * jy) + Math.floor((8 * jy + 21) / 33) + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > sal_a[gm]) {
    gd -= sal_a[gm];
    gm++;
  }
  return [gy, gm, gd];
}

/**
 * Parses a date string (Persian e.g. 1402/06/15 or Gregorian 2023-09-06) into a JS Date
 */
export function parseAnyDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Clean separators
  const parts = dateStr.trim().replace(/-/g, '/').split('/').map(p => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }

  const [y, m, d] = parts;
  // If year is in Shamsi range (e.g. 1300 - 1500)
  if (y >= 1300 && y <= 1500) {
    const [gy, gm, gd] = jalaliToGregorian(y, m, d);
    return new Date(gy, gm - 1, gd);
  }
  
  // Standard Gregorian
  return new Date(y, m - 1, d);
}

export interface AssetDepreciationReport {
  asset: FixedAsset;
  totalLifeDays: number;
  elapsedDays: number;
  remainingDays: number;
  dailyDepreciation: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationPercentage: number;
  isFullyDepreciated: boolean;
}

/**
 * Calculates day-based depreciation for any fixed asset
 * Formula:
 * Total Days = UsefulLifeYears * 365
 * Depreciable Cost = Cost - SalvageValue
 * Daily Depreciation Rate = Depreciable Cost / Total Days
 * Elapsed Days = Days between Buy Date and Today
 * Accumulated Depreciation = Daily Rate * Elapsed Days (capped at Depreciable Cost)
 * Current Book Value = Cost - Accumulated Depreciation (never below Salvage Value)
 */
export function calculateAssetDepreciation(
  asset: FixedAsset,
  targetDate: Date = new Date()
): AssetDepreciationReport {
  const usefulYears = Math.max(0.1, asset.usefulLifeYears || 1);
  const totalLifeDays = Math.round(usefulYears * 365);
  const salvageValue = Math.max(0, asset.salvageValue || 0);
  const depreciableCost = Math.max(0, asset.cost - salvageValue);

  const buyDate = parseAnyDate(asset.buyDate);
  const diffTime = targetDate.getTime() - buyDate.getTime();
  const rawElapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(totalLifeDays, rawElapsedDays);
  const remainingDays = Math.max(0, totalLifeDays - elapsedDays);

  const dailyDepreciation = totalLifeDays > 0 ? depreciableCost / totalLifeDays : 0;
  const accumulatedDepreciation = Math.min(depreciableCost, Number((dailyDepreciation * elapsedDays).toFixed(2)));
  const currentBookValue = Math.max(salvageValue, Number((asset.cost - accumulatedDepreciation).toFixed(2)));
  const depreciationPercentage = depreciableCost > 0 ? Math.min(100, (accumulatedDepreciation / depreciableCost) * 100) : 0;
  const isFullyDepreciated = elapsedDays >= totalLifeDays;

  return {
    asset,
    totalLifeDays,
    elapsedDays,
    remainingDays,
    dailyDepreciation: Number(dailyDepreciation.toFixed(4)),
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercentage: Number(depreciationPercentage.toFixed(1)),
    isFullyDepreciated,
  };
}
