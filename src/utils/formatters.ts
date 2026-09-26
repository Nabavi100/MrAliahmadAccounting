import { Currency, Unit } from '../types';

export const formatNumber = (num: number, maximumFractionDigits = 2): string => {
  if (isNaN(num)) return '۰';
  return new Intl.NumberFormat('fa-AF', {
    maximumFractionDigits,
  }).format(num);
};

export const formatNumberEn = (num: number, maximumFractionDigits = 2): string => {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(num);
};

export const formatCurrency = (amount: number, currency: Currency | string): string => {
  const formatted = formatNumber(Math.abs(amount));
  if (currency === 'USD') {
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  }
  if (currency === 'AFN') {
    return amount < 0 ? `-${formatted} ؋` : `${formatted} ؋`;
  }
  if (currency === 'EUR') {
    return amount < 0 ? `-€${formatted}` : `€${formatted}`;
  }
  if (currency === 'PKR') {
    return amount < 0 ? `-${formatted} ₨` : `${formatted} ₨`;
  }
  if (currency === 'IRR') {
    return amount < 0 ? `-${formatted} تومان` : `${formatted} تومان`;
  }
  if (currency === 'AED') {
    return amount < 0 ? `-${formatted} د.إ` : `${formatted} د.إ`;
  }
  if (currency === 'CNY') {
    return amount < 0 ? `-¥${formatted}` : `¥${formatted}`;
  }
  return amount < 0 ? `-${formatted} ${currency}` : `${formatted} ${currency}`;
};

export const formatCurrencyEn = (amount: number, currency: Currency | string): string => {
  const formatted = formatNumberEn(Math.abs(amount));
  if (currency === 'USD') {
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  }
  if (currency === 'AFN') {
    return amount < 0 ? `-${formatted} AFN` : `${formatted} AFN`;
  }
  return amount < 0 ? `-${formatted} ${currency}` : `${formatted} ${currency}`;
};

export const getPersianDate = (): string => {
  const today = new Date();
  // Format as YYYY/MM/DD in Persian solar calendar
  return new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(today)
    .replace(/\//g, '/');
};

export const getGregorianDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export const getTodayDate = (calendarType?: 'jalali' | 'gregorian'): string => {
  if (calendarType === 'gregorian') {
    return getGregorianDate();
  }
  return getPersianDate();
};

export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getPersianDateTime = (calendarType?: 'jalali' | 'gregorian'): string => {
  return `${getTodayDate(calendarType)} - ${getCurrentTime()}`;
};

export const getUnitLabel = (unit?: Unit | string): string => {
  if (!unit) return 'کیسه';
  const u = String(unit).toLowerCase().trim();
  if (u === 'ton' || u === 'تن') return 'تن';
  if (u === 'bag' || u === 'کیسه' || u === 'بوجی') return 'کیسه';
  return unit;
};

export const getCurrencyLabel = (currency?: Currency | string): string => {
  if (!currency) return 'افغانی';
  const c = String(currency).toUpperCase().trim();
  if (c === 'USD' || c === 'دلار' || c === '$') return 'دلار';
  if (c === 'AFN' || c === 'افغانی' || c === '؋') return 'افغانی';
  if (c === 'EUR' || c === 'یورو' || c === '€') return 'یورو';
  if (c === 'PKR' || c === 'کلدار' || c === '₨') return 'کلدار';
  if (c === 'IRR' || c === 'تومان') return 'تومان';
  return currency;
};

/**
 * Formats a single invoice item line specifically for Telegram (HTML parse mode).
 * Guaranteed RTL-safe layout and order requested by user:
 * 1. نام کالا (Product name)
 * 2. تعداد کالا (Quantity)
 * 3. متن کیسه و یا تن (Unit: 'کیسه' or 'تن')
 * 4. قیمت فی (Unit price: 'قیمت فی: ...')
 * 5. قیمت مجموع (Total price: 'قیمت مجموع: ...')
 *
 * Example:
 *   ۱. <b>آرد گندم قزاقی</b>: ۵۰ کیسه | قیمت فی: ۲,۱۰۰ | قیمت مجموع: <b>۱۰۵,۰۰۰ افغانی</b>
 */
export const formatTelegramItemLine = (
  item: {
    productName: string;
    quantity: number;
    unit?: Unit | string;
    unitPrice: number;
    totalPrice: number;
    currency?: Currency | string;
    description?: string;
  },
  index: number,
  fallbackCurrency?: Currency | string
): string => {
  const num = formatNumber(index + 1);
  const name = item.productName || 'کالا';
  const qty = formatNumber(item.quantity);
  const unit = getUnitLabel(item.unit);
  const price = formatNumber(item.unitPrice);
  const total = formatNumber(item.totalPrice);
  const curr = getCurrencyLabel(item.currency || fallbackCurrency || 'AFN');
  const desc = item.description && item.description.trim() ? ` (${item.description.trim()})` : '';

  return `  ${num}. <b>${name}${desc}</b>: ${qty} ${unit} | قیمت فی: ${price} | قیمت مجموع: <b>${total} ${curr}</b>`;
};

/**
 * Formats a single invoice item line for plain text file exports.
 */
export const formatPlainTextItemLine = (
  item: {
    productName: string;
    quantity: number;
    unit?: Unit | string;
    unitPrice: number;
    totalPrice: number;
    currency?: Currency | string;
    description?: string;
  },
  index: number,
  fallbackCurrency?: Currency | string
): string => {
  const num = formatNumber(index + 1);
  const name = item.productName || 'کالا';
  const qty = formatNumber(item.quantity);
  const unit = getUnitLabel(item.unit);
  const price = formatNumber(item.unitPrice);
  const total = formatNumber(item.totalPrice);
  const curr = getCurrencyLabel(item.currency || fallbackCurrency || 'AFN');
  const desc = item.description && item.description.trim() ? ` (${item.description.trim()})` : '';

  return `${num}. ${name}${desc} | تعداد: ${qty} ${unit} | قیمت فی: ${price} | قیمت مجموع: ${total} ${curr}`;
};

export const calculateBagsAndTons = (
  quantity: number,
  unit: Unit,
  bagsPerTon: number
): { bags: number; tons: number } => {
  const safeBagsPerTon = bagsPerTon > 0 ? bagsPerTon : 20;
  if (unit === 'ton') {
    const tons = quantity;
    const bags = Math.round(quantity * safeBagsPerTon);
    return { bags, tons };
  } else {
    const bags = quantity;
    const tons = Number((quantity / safeBagsPerTon).toFixed(3));
    return { bags, tons };
  }
};

export const jalaliToGregorian = (jYear: number, jMonth: number, jDay: number): string => {
  const jy = jYear - 979;
  const jm = jMonth - 1;
  const jd = jDay - 1;

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += i < 6 ? 31 : 30;
  }
  j_day_no += jd;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const isLeapYear = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
  const monthLengths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && g_day_no >= monthLengths[gm]) {
    g_day_no -= monthLengths[gm];
    gm++;
  }
  const gd = g_day_no + 1;

  return `${gy}-${String(gm + 1).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
};

export const normalizePersianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = dateStr.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  faDigits.forEach((digit, idx) => {
    clean = clean.split(digit).join(idx.toString());
  });
  arDigits.forEach((digit, idx) => {
    clean = clean.split(digit).join(idx.toString());
  });

  // Handle hyphen or slash separators
  clean = clean.replace(/-/g, '/');
  const parts = clean.split('/').map(p => p.trim());
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return clean;
};

export const isDateInRange = (dateStr?: string, fromDateStr?: string, toDateStr?: string): boolean => {
  if (!dateStr || dateStr === '---') return true;
  const normalized = normalizePersianDate(dateStr);
  if (fromDateStr) {
    const fromNorm = normalizePersianDate(fromDateStr);
    if (fromNorm && normalized < fromNorm) return false;
  }
  if (toDateStr) {
    const toNorm = normalizePersianDate(toDateStr);
    if (toNorm && normalized > toNorm) return false;
  }
  return true;
};

export const getGregorianEquivalent = (persianDateStr: string): string => {
  try {
    if (!persianDateStr) return new Date().toISOString().slice(0, 10);
    const normalized = normalizePersianDate(persianDateStr);
    const parts = normalized.split('/').map(p => parseInt(p.trim(), 10));
    if (parts.length === 3 && parts[0] > 1300 && parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1) {
      return jalaliToGregorian(parts[0], parts[1], parts[2]);
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().slice(0, 10);
};

/**
 * پاک‌سازی و کوتاه‌سازی هوشمند شرح و توضیحات اسناد در کارتکس کالا و اشخاص
 * برای جلوگیری از به هم ریختن ستون‌ها و چاپ تمیز و خوانا
 */
export const cleanCardexDescription = (text?: string, maxLength = 32): string => {
  if (!text) return '-';
  let cleaned = text.trim();

  // حذف جملات سیستمی و توضیحات طولانی تکراری
  cleaned = cleaned.replace(/[|•]\s*ثبت خودکار[^|•\n]*/g, '').trim();
  cleaned = cleaned.replace(/ثبت خودکار[^|•\n]*/g, '').trim();
  cleaned = cleaned.replace(/\s*به طرف‌حساب\s+[^|•\n]+/g, '').trim();

  // فشرده‌سازی الگوهای متداول در نرم‌افزار
  cleaned = cleaned.replace(/ارسال امانی بابت فاکتور فروش/g, 'ارسال امانی فروش');
  cleaned = cleaned.replace(/برگشت کالای امانی بابت فاکتور مرجوعی/g, 'برگشت امانی');
  cleaned = cleaned.replace(/دریافت نقدی بابت فاکتور فروش/g, 'دریافت نقد');
  cleaned = cleaned.replace(/پرداخت نقدی بابت فاکتور خرید/g, 'پرداخت نقد');
  cleaned = cleaned.replace(/دریافت امانی یعنی به گدام امانی سپرده میشود/g, 'دریافت امانی');
  cleaned = cleaned.replace(/ارسال امانی یعنی به گدام امانی سپرده میشود/g, 'ارسال امانی');
  cleaned = cleaned.replace(/سند خروجی و تحویل بار امانی/g, 'تحویل بار امانی');

  // حذف فواصل اضافه و خطوط جداکننده انتهایی
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/[•|\-,]\s*$/, '').trim();

  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength - 1) + '…';
  }
  return cleaned || '-';
};

/**
 * استخراج شاخص ماه شمسی (از ۰ برای حمل تا ۱۱ برای حوت)
 * با پشتیبانی از ارقام فارسی، عربی، انگلیسی و تاریخ‌های میلادی
 */
export const extractSolarMonthIndex = (dateStr?: string): number => {
  if (!dateStr) return -1;
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = dateStr.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  faDigits.forEach((digit, idx) => {
    clean = clean.split(digit).join(idx.toString());
  });
  arDigits.forEach((digit, idx) => {
    clean = clean.split(digit).join(idx.toString());
  });
  clean = clean.replace(/-/g, '/');
  const parts = clean.split('/').map(p => p.trim());
  if (parts.length >= 2) {
    const firstNum = parseInt(parts[0], 10);
    // در صورتی که تاریخ میلادی مانند 2026/09/16 باشد
    if (firstNum > 1900 && firstNum < 2200 && parts.length === 3) {
      try {
        const gDate = new Date(firstNum, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const sm = parseInt(
          new Intl.DateTimeFormat('en-US-u-ca-persian', { month: 'numeric' }).format(gDate),
          10
        );
        if (sm >= 1 && sm <= 12) return sm - 1;
      } catch (e) {
        // نادیده‌گیری خطای احتمالی
      }
    }

    // تاریخ استاندارد شمسی: YYYY/MM/DD یا DD/MM/YYYY
    let m = -1;
    if (parts[0].length === 4) {
      m = parseInt(parts[1], 10);
    } else if (parts.length === 3 && parts[2].length === 4) {
      m = parseInt(parts[1], 10);
    } else {
      m = parseInt(parts[1], 10);
    }

    if (m >= 1 && m <= 12) {
      return m - 1;
    }
  }
  return -1;
};

/**
 * تبدیل اعداد به حروف فارسی (جهت درج در فاکتورهای رسمی و اسناد مالی)
 */
export const numberToPersianWords = (num: number, currencySuffix?: string): string => {
  if (isNaN(num) || num === 0) {
    const zeroStr = 'صفر';
    return currencySuffix ? `${zeroStr} ${currencySuffix}` : zeroStr;
  }

  const isNegative = num < 0;
  const absNum = Math.floor(Math.abs(num));

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahha = [
    'ده',
    'یازده',
    'دوازده',
    'سیزده',
    'چهارده',
    'پانزده',
    'شانزده',
    'هفده',
    'هجده',
    'نوزده',
  ];
  const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const sadgan = [
    '',
    'یکصد',
    'دویست',
    'سیصد',
    'چهارصد',
    'پانصد',
    'ششصد',
    'هفتصد',
    'هشتصد',
    'نهصد',
  ];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  const threeDigitsToWords = (n: number): string => {
    const s = Math.floor(n / 100);
    const remainder = n % 100;
    const parts: string[] = [];

    if (s > 0) {
      parts.push(sadgan[s]);
    }

    if (remainder >= 10 && remainder <= 19) {
      parts.push(dahha[remainder - 10]);
    } else {
      const d = Math.floor(remainder / 10);
      const y = remainder % 10;
      if (d > 0) parts.push(dahgan[d]);
      if (y > 0) parts.push(yekan[y]);
    }

    return parts.join(' و ');
  };

  const chunks: number[] = [];
  let temp = absNum;
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkWords = threeDigitsToWords(chunk);
      const scale = scales[i];
      words.push(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
  }

  let result = words.join(' و ');
  if (isNegative) {
    result = `منفی ${result}`;
  }

  if (currencySuffix) {
    result = `${result} ${currencySuffix}`;
  }

  return result;
};


