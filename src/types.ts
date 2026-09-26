import type { ReactNode } from 'react';

export type Currency = 'AFN' | 'USD' | 'EUR' | 'PKR' | 'IRR' | 'AED' | 'CNY' | string;
export type Unit = 'ton' | 'bag';

export interface CurrencyDefinition {
  id: string;
  code: string;             // کد ایزو یا اختصاری ارز (مثلا: AFN, USD, EUR, PKR, IRR, AED, CNY)
  name: string;             // نام کامل ارز (مثلا: افغانی افغانستان، دلار آمریکا، یورو، کلدار، تومان، درهم، یوان)
  symbol: string;           // علامت و نماد ارز (مثلا: ؋, $, €, ₨, تومان, د.إ, ¥)
  exchangeRateToAFN: number;// نرخ برابری هر ۱ واحد از این ارز به افغانی (مثلا 1 دلار = 65 افغانی)
  exchangeRateToUSD?: number;// نرخ برابری هر ۱ واحد از این ارز به دلار آمریکا
  isBase?: boolean;         // آیا ارز پایه محاسبات سیستم است (افغانی = true)
  isDefault?: boolean;      // ارز پیش‌فرض سیستمی غیرقابل حذف
  notes?: string;           // توضیحات و کاربرد ارز در معاملات
  createdAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string; // نام گروه کالا (مثلاً: گروه سیمان، گروه گچ روی کار، گروه گچ زیرکار، گروه سیمان سفید، گروه پودر سنگ)
  code?: string;
  description?: string;
  color?: string; // emerald, blue, amber, purple, rose, slate, teal, indigo, orange
  createdAt?: string;
}

export interface ProductSubUnit {
  name: string; // e.g. کیسه (50Kg)
  ratioToBase: number; // ضریب تبدیل نسبت به واحد پایه (مثلا 0.050)
}

export interface Product {
  id: string;
  name: string; // نام کالا (مثلا: سیمان غرب آسیا، گچ سوپر طلایی)
  code: string;
  numericCode?: number | string;
  category: string;
  categoryId?: string; // شناسه گروه کالا
  baseUnit?: string; // واحد پایه (مثلا: تُن (1000 KG) یا کیسه (22Kg))
  subUnits?: ProductSubUnit[]; // واحدهای فرعی
  bagWeightKg: number; // وزن هر کیسه به کیلوگرم (مثلاً 50 کیلوگرم = هر 20 کیسه یک تن)
  bagsPerTon: number; // تعداد کیسه در یک تن (محاسبه خودکار: 1000 / bagWeightKg)
  buyPriceAFN: number; // نرخ خرید تقریبی به افغانی
  buyPriceUSD: number; // نرخ خرید تقریبی به دلار
  sellPriceAFN: number; // نرخ فروش به افغانی
  sellPriceUSD: number; // نرخ فروش به دلار
  priceAFN?: number; // سازگاری با نمایش سریع نرخ افغانی
  priceUSD?: number; // سازگاری با نمایش سریع نرخ دلار
  minStockTons: number; // حداقل موجودی هشدار (به تن)
  // ثبت اول دوره (Opening Stock)
  initialStockTons?: number; // موجودی اول دوره به تن
  initialStockBags?: number; // موجودی اول دوره به کیسه
  initialWarehouseId?: string; // گدام موجودی اول دوره
  initialCostPrice?: number; // نرخ خرید اول دوره
  initialCostCurrency?: Currency; // ارز خرید اول دوره
}

export interface LowStockAlertItem {
  product: Product;
  currentStockTons: number;
  currentStockBags: number;
  minStockTons: number;
  deficitTons: number;
  deficitBags: number;
  status: 'out_of_stock' | 'critical' | 'low';
  warehouseBreakdown: {
    warehouseId: string;
    warehouseName: string;
    tons: number;
    bags: number;
  }[];
}

export interface ExpenseCategory {
  id: string;
  name: string; // نام دسته‌بندی هزینه (مثلا: هزینه‌های معاشات کارمندان، هزینه‌ها و مصارف آشپزخانه)
  code?: string;
  description?: string;
  color?: string; // emerald, blue, amber, purple, rose, slate
  createdAt?: string;
}

export interface ExpenseDefinition {
  id: string;
  code: string; // کد هزینه (مثلا EXP-101, Kitchen-EXP, Municipality-EXP)
  numericCode?: string; // کد عددی هزینه (مثلاً 1، 2، 3 طبق عکس نرم‌افزار)
  name: string; // نام هزینه
  title?: string; // عنوان هزینه (همسان با name برای سازگاری کامل)
  type?: string; // نوع هزینه (عمومی، جاری، سرمایه‌ای)
  categoryId: string; // شناسه گروه مادر
  categoryName?: string; // نام گروه مادر
  description?: string; // توضیحات
  notes?: string;
  createdAt?: string;
}

export interface ExpenseItem {
  id: string;
  expenseNumber?: string; // شماره سند هزینه (مثلا: EXP-1001)
  title: string; // عنوان و بابت هزینه (مثلا: کرایه حمل موتر از بندر تورغندی)
  categoryId: string; // شناسه دسته‌بندی
  categoryName?: string; // نام دسته‌بندی
  amount: number; // مبلغ هزینه
  currency: Currency; // ارز هزینه (AFN یا USD)
  date: string; // تاریخ سند
  recipient?: string; // دریافت‌کننده وجه / راننده / شخص
  payee?: string;
  receiptNumber?: string;
  cashRegisterId?: string; // صندوق پرداختی
  cashRegisterName?: string;
  notes?: string; // توضیحات و بارنامه
  createdAt: string;
}

export interface IncomeCategory {
  id: string;
  name: string; // نام دسته‌بندی عاید (مثلا: فروش بوجی و کیسه خالی، فروش پالت و ضایعات، عواید خدمات بارگیری، اجاره فضای گدام، کمیسیون)
  code?: string;
  description?: string;
  color?: string; // emerald, blue, amber, purple, rose, slate, teal, indigo
  createdAt?: string;
}

export interface IncomeItem {
  id: string;
  incomeNumber?: string; // شماره سند عاید (مثلا: Inc0001)
  title: string; // عنوان و شرح عاید (مثلا: عاید از فروش ۲۵۰ عدد بوجی کیسه خالی سیمان غوری)
  categoryId: string; // شناسه دسته‌بندی عاید
  categoryName?: string; // نام دسته‌بندی
  amount: number; // مبلغ کل عاید دریافتی
  currency: Currency; // ارز عاید (AFN یا USD)
  date: string; // تاریخ ثبت سند
  quantity?: number; // تعداد اقلام فروخته شده (مثلا ۲۵۰ عدد کیسه یا ۳۰ عدد پالت)
  unitPrice?: number; // قیمت فی واحد (مثلا ۲۰ افغانی)
  payer?: string; // خریدار / پرداخت‌کننده وجه / شخص طرف معامله
  receiptNumber?: string; // شماره قبض یا رسید
  cashRegisterId?: string; // صندوق واریزی (صندوق افغانی، صندوق دالری و...)
  cashRegisterName?: string;
  notes?: string; // توضیحات تکمیلی
  createdAt: string;
}

export type WarehouseType = 'standard' | 'consignment' | 'consignment_in' | 'consignment_out';

export interface Warehouse {
  id: string;
  code?: string; // کد انبار (مانند 1، consignment، 2، ...)
  name: string; // نام گدام (مثلا گدام مرکزی، انبار قندهار)
  location: string; // آدرس / موقعیت (مثلا: نقطه هشت، چهارراهی گمرک)
  type: WarehouseType; // standard = ملکی تجارتی, consignment_in = امانی دیگران نزد ما, consignment_out = امانی ما نزد دیگران
  ownerName?: string; // صاحب امانت (در صورت امانی بودن)
  contactPhone?: string;
  notes?: string;
}

export interface StockInventory {
  warehouseId: string;
  productId: string;
  quantityTons: number; // موجودی به تن
  quantityBags: number; // موجودی به کیسه
}

export type PartyType = 'customer' | 'supplier' | 'both';

export interface PartyGroup {
  id: string;
  name: string; // نام گروه (مثلاً: مشتریان شهر نو، مشتریان ولایات، تأمین‌کنندگان، صرافان)
  description?: string;
  color?: string; // e.g. emerald, blue, amber, purple, rose, indigo
  createdAt?: string;
}

export interface Party {
  id: string;
  code?: string; // کد عددی طرف حساب (مانند 101، 102، ...)
  name: string; // نام مشتری / فروشنده
  company?: string;
  phone: string;
  address?: string;
  type: PartyType;
  groupId?: string; // شناسه گروه مشتری
  groupName?: string; // نام گروه جهت نمایش سریع
  balanceAFN: number; // مثبت = طلبکار (ما بدهکاریم), منفی = قرضدار (او به ما بدهکار است)
  balanceUSD: number; // مثبت = طلبکار, منفی = قرضدار
  initialBalanceAFN?: number; // مانده حساب اولیه افغانی
  initialBalanceUSD?: number; // مانده حساب اولیه دلاری
  telegramChatId?: string; // شناسه چت تلگرام مشتری جهت احراز هویت و ارسال اختصاصی حساب
  telegramUserId?: string; // شناسه عددی کاربر تلگرام
  telegramUsername?: string; // نام کاربری تلگرام (@username)
  telegramConnectionCode?: string; // کد اتصال یکتای اختصاصی (AC-XXXXXX)
  telegramLinkedAt?: string; // تاریخ و زمان احراز هویت و اتصال ربات تلگرام
  telegramLastInquiry?: string; // آخرین زمان استعلام حساب توسط مشتری
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName?: string; // نام گدام مربوط به این قلم کالا
  description?: string; // توضیحات هر قلم فروش (شماره موتر، بارنامه، مشخصات بسته)
  unit: Unit; // واحد مبنای صدور فاکتور (تن یا کیسه)
  quantity: number; // تعداد بر اساس واحد انتخاب شده
  bagsCount: number; // تعداد معادل کیسه
  tonsCount: number; // تعداد معادل تن
  unitPrice: number; // قیمت فی واحد (بر اساس واحد و ارز انتخابی)
  buyPrice?: number; // قیمت خرید برای محاسبه سود ناخالص
  currency: Currency;
  totalPrice: number; // مبلغ کل آیتم
}

export interface CompanySettings {
  name: string; // نام شرکت (تنظیم شده از بخش تنظیمات شرکت)
  nameFa?: string; // نام شرکت به فارسی
  descriptionFa?: string; // توضیحات شرکت
  commercialCode?: string; // کد تجاری صادرکننده (مثلاً: 1)
  logoUrl?: string; // تصویر لوگوی شرکت (Base64 یا URL)
  logoIconText?: string; // حرف اختصاری آیکون لوگو (مثلاً ن)
  stampUrl?: string; // تصویر مهر شرکت (Base64 یا URL)
  signatureUrl?: string; // تصویر امضای دیجیتال مسئول (Base64 یا URL)
  stampType?: 'custom' | 'system_seal'; // نوع مهر: تصویر آپلود شده یا مهر رسمی سیستمی
  stampColor?: 'blue' | 'red' | 'navy'; // رنگ جوهر مهر در صورت استفاده از مهر سیستمی
  showStampOnInvoice?: boolean; // نمایش پیش‌فرض مهر روی فاکتورها هنگام پرینت
  showSignatureOnInvoice?: boolean; // نمایش پیش‌فرض امضا روی فاکتورها هنگام پرینت
  stampSize?: number; // اندازه قطر مهر رسمی بر حسب پیکسل (پیش‌فرض: 56)
  signatureSize?: number; // اندازه ارتفاع امضای دیجیتال بر حسب پیکسل (پیش‌فرض: 48)
  phone: string; // شماره تماس اصلی
  phoneSecondary?: string; // شماره تماس فرعی یا واتساپ
  address: string; // آدرس دقیق دفتر و گدام
  email?: string;
  tagline?: string; // شعار تجارتی
  invoiceFooterNote?: string; // متن پاورقی فاکتورها و شرایط تسویه
  invoiceConditions?: string; // قوانین و شرایط عمومی معامله
  calendarType?: 'jalali' | 'gregorian'; // نوع تقویم پیش‌فرض (هجری شمسی یا میلادی)
  fontSizeNumber?: number; // اندازه فونت بر حسب عدد (10, 11, 12, 13, 14, 15, 16, 18, 20)
  defaultPrintFormat?: 'a4' | 'continuous'; // فرمت چاپ پیش‌فرض (A4 استاندارد یا کاغذهای سوزنی/پیوسته)
  autoLockMinutes?: number; // زمان قفل خودکار برنامه بر حسب دقیقه در صورت عدم فعالیت (0 = غیرفعال)
  requirePasswordOnOpen?: boolean; // الزام به ورود با رمز عبور در هر بار باز کردن مجدد برنامه
  isProtected?: boolean; // قفل حفاظتی تغییر نام، لوگو و مشخصات شرکت با رمز عبور مدیریت
  protectionPassword?: string; // رمز عبور حفاظتی برای تغییر نام و لوگوی شرکت
}

export type InvoiceType = 'buy' | 'sell' | 'return_buy' | 'return_sell';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType; // 'buy' = خرید, 'sell' = فروش, 'return_buy' = برگشت از خرید, 'return_sell' = برگشت از فروش
  date: string; // تاریخ شمسی یا میلادی YYYY/MM/DD
  issueTime?: string; // ساعت دقیق صدور (مثلاً 14:30)
  partyId: string; // شناسه مشتری / فروشنده
  partyName: string;
  partyPhone?: string; // شماره تماس مشتری
  partyAddress?: string; // آدرس مشتری
  partyGroupName?: string; // دسته مشتری
  warehouseId: string; // گدام پیش‌فرض فاکتور
  currency: Currency; // ارز اصلی فاکتور
  items: InvoiceItem[];
  subtotal: number;
  subtotalAmount?: number; // سازگاری با فرمت چاپ فاکتور
  discount: number;
  totalAmount: number; // مبلغ قابل پرداخت
  finalAmount?: number; // مبلغ نهایی قابل پرداخت
  paidAmount: number; // مبلغ پرداخت شده نقدی
  balanceAmount: number; // باقیمانده (قرضه)
  paymentStatus: PaymentStatus;
  dealType?: 'regular' | 'consignment' | 'pre_order' | string; // نوع معامله: فروش/خرید قطعی (عادی)، ارسال/دریافت امانی، پیش‌فروش/پیش‌خرید
  dealTypeLabel?: string; // عنوان نمایشی نوع معامله
  consignmentWarehouseId?: string; // گدام مقصد امانی در معاملات امانی
  consignmentWarehouseName?: string; // نام گدام مقصد امانی
  exchangeRate?: number; // نرخ تسعیر نسبت به ارز پایه
  shippingCost?: number; // کرایه خروجی (+)
  extraExpenses?: Array<{
    id: string;
    partyId?: string;
    partyName: string;
    title: string;
    currency: Currency;
    amount: number;
  }>;
  extraExpensesTotal?: number; // مجموع هزینه‌های جانبی
  paymentType?: 'cash' | 'credit' | 'hybrid' | string; // نوع پرداخت: نقدی، قرضه، ترکیبی
  cashRegister?: CashRegisterType; // صندوق واریز/برداشت نقدی
  cashRegisterId?: string; // شناسه صندوق واریز نقدی در فاکتورهای نقدی
  driverName?: string; // نام راننده یا متصدی تحویل بار
  carPlate?: string; // شماره پلاک موتر
  driverPhone?: string; // شماره تماس راننده
  notes?: string;
  createdAt: string;
}

export type TransactionType = 
  | 'receive_payment'   // دریافت پول از مشتری (کاهش طلب ما / کاهش قرضداری او)
  | 'make_payment'      // پرداخت پول به فروشنده/مشتری (کاهش بدهی ما / بابت خرید جنس)
  | 'currency_exchange' // صرافی و تبدیل ارز
  | 'cash_transfer'     // انتقال بین صندوق‌ها (مثلا انتقال از صندوق دالری به صندوق دالری صرافی)
  | 'expense'           // مصارف عمومی
  | 'capital';          // افزایش/کاهش سرمایه

export type CashRegisterType = 
  | 'afn_cash'            // صندوق افغانی
  | 'usd_cash'            // صندوق دالری
  | 'exchange_usd_cash'   // صندوق دالری صرافی
  | string;               // پشتیبانی از صندوق‌های جدید تعریف شده توسط کاربر

export interface CashRegisterAccount {
  id: string;             // شناسه یکتا (afn_cash, usd_cash, exchange_usd_cash یا box_xxx)
  name: string;           // نام صندوق (مثلاً: صندوق پولی افغانی، صندوق شرکت دالری، صندوق صرافی دالری، صندوق هرات)
  currency: Currency;     // ارز صندوق (AFN یا USD)
  balance: number;        // موجودی فعلی
  initialBalance: number; // موجودی اولیه در بدو تاسیس
  isDefault?: boolean;    // آیا صندوق سیستمی است (غیرقابل حذف یا با هشدار)
  type?: 'cash' | 'exchange' | 'bank' | 'other'; // نوع صندوق
  accountNumber?: string; // شماره حساب یا شماره گاوصندوق
  location?: string;      // موقعیت فیزیکی یا شعبه
  notes?: string;
  createdAt?: string;
}

// ================= FIXED ASSETS & EQUIPMENT =================
export interface AssetGroup {
  id: string;
  name: string;           // نام گروه (مثلاً: وسایط نقلیه و موترها، تجهیزات گدام، لوازم اداری و کامپیوتر، موبایل و ارتباطات)
  description?: string;
  color?: string;
  createdAt?: string;
}

export interface FixedAsset {
  id: string;
  name: string;           // نام جنس/لوازم (مثلاً: موبایل هوشمند، موتر لاری بنز، باسکول ۶۰ تن)
  code: string;           // کد اموال
  groupId: string;        // شناسه گروه
  groupName: string;      // نام گروه جهت نمایش سریع
  buyDate: string;        // تاریخ خرید (مثلاً: 1402/06/15)
  cost: number;           // قیمت خرید اولیه
  currency: Currency;     // ارز خرید (AFN یا USD)
  usefulLifeYears: number; // عمر مفید به سال (مثلاً 6 سال)
  salvageValue?: number;  // ارزش اسقاط یا بازیافت (پیش‌فرض 0)
  location?: string;      // محل استقرار (مثلاً دفتر کابل، گدام حیرتان)
  inCharge?: string;      // تحویل‌گیرنده یا مسئول
  status?: 'active' | 'under_maintenance' | 'scrap' | 'sold'; // وضعیت
  notes?: string;
  createdAt?: string;
}

// ================= SHAREHOLDERS & EQUITY =================
export interface Shareholder {
  id: string;
  name: string;           // نام سهامدار یا شریک
  role: string;           // سمت سازمانی (مثلاً رئیس هیئت مدیره، شریک سرمایه‌گذار)
  phone?: string;
  address?: string;
  capitalUSD: number;     // سرمایه / آورده به دلار
  capitalAFN?: number;    // سرمایه / آورده به افغانی
  // فیصدی سهام بصورت خودکار از تقسیم آورده شخص بر کل سرمایه شرکت محاسبه می‌شود
  sharePercentage?: number; 
  profitShareAFN?: number; // سود نقدی تخصیص‌یافته به افغانی
  profitShareUSD?: number; // سود نقدی تخصیص‌یافته به دلار
  withdrawalsAFN?: number; // برداشت‌های شریک به افغانی
  withdrawalsUSD?: number; // برداشت‌های شریک به دلار
  nationalId?: string;    // شماره تذکره یا پاسپورت
  notes?: string;
  createdAt?: string;
}

export interface FinancialTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  issueTime?: string; // ساعت دقیق صدور
  type: TransactionType;
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  partyAddress?: string;
  
  // حساب شخص (مبلغ و ارزی که در حساب مشتری/فروشنده اعمال می‌شود)
  amount: number;
  currency: Currency;

  // قابلیت تبدیل ارز (اکسچنج در دریافت/پرداخت)
  isExchange?: boolean;
  exchangeRate?: number; // نرخ تسویه / تبدیل (مثلا 1 دلار = 65 افغانی)
  cashAmount?: number;   // مبلغ نقدی واقعی وارد شده به صندوق
  cashCurrency?: Currency; // ارز نقدی واقعی صندوق

  // صندوق انتخابی
  cashRegister?: CashRegisterType;
  cashRegisterName?: string;
  fromCashRegister?: CashRegisterType; // در انتقالات بین صندوق‌ها
  toCashRegister?: CashRegisterType;   // در انتقالات بین صندوق‌ها
  
  targetAmount?: number; // در تبدیل ارز صرافی
  targetCurrency?: Currency;
  description: string;
  notes?: string;
  trackingNumber?: string;
  invoiceId?: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  date: string;
  issueTime?: string; // ساعت صدور حواله
  productId: string;
  productName: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantity: number;
  unit: Unit;
  bagsCount: number;
  tonsCount: number;
  description?: string;
  driverName?: string; // نام راننده یا متصدی انتقال
  carPlate?: string;   // شماره پلاک موتر / بارگیر
  notes?: string;
  createdAt: string;
}

export interface CashFundTransfer {
  id: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  currency: Currency;
  description?: string;
  createdAt: string;
}

export interface CashRegisterState {
  afnBalance: number;          // صندوق افغانی
  usdBalance: number;          // صندوق دالری (نقدی)
  exchangeUsdBalance: number;  // صندوق دالری صرافی (سرای شهزاده)
  usdToAfnRate: number;        // نرخ پیش‌فرض روز (مثلاً 65)
}

// ================= USER ROLES & ACCESS CONTROL =================
export type UserRole = 
  | 'admin'             // مدیر کل / صاحب تجارت (دسترسی نامحدود و ریست سیستم)
  | 'accountant'        // مدیر مالی و حسابدار (اسناد مالی، دفاتر و گزارشات)
  | 'warehouse_keeper'  // مدیر گدام / انباردار (موجودی، حواله و انتقال بار)
  | 'cashier';          // صندوق‌دار و صراف (دریافت، پرداخت و صرافی)

export interface AppUser {
  id: string;
  name: string;
  username: string;
  password?: string;   // رمز عبور ورود به برنامه
  role: UserRole;
  roleTitle: string;
  phone?: string;
  avatarColor: string;
  canResetData: boolean;
  canDeleteRecords: boolean;
  canChangeRates: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  createdAt: string;
}

// ================= PRINT & DOCUMENT TYPES =================
export type AppFontSize = 'sm' | 'md' | 'lg' | 'xl';

export type PrintableDocumentType = 
  | 'invoice'           // فاکتور رسمی خرید و فروش
  | 'payment_receipt'   // رسید دریافت / پرداخت نقد و اکسچنج صرافی
  | 'income_receipt'    // رسید دریافت عواید و درآمدهای متفرقه
  | 'stock_transfer'    // حواله خروج / ورود و انتقال بین گدام‌ها
  | 'party_statement'   // صورت‌حساب دفتر کل طرف حساب (افغانی و دلار)
  | 'product_cardex'    // کارتکس گردش کالا
  | 'customer_consignment_cardex' // کارتکس امانات مشتریان و گدام امانی
  | 'products_inventory_report'   // گزارش جامع موجودی کالاها
  | 'cash_transfer_voucher'       // حواله انتقال و تبدیل بین‌صندوقی
  | 'currency_exchange'           // رسید و سند تبدیل ارز صرافی
  | 'trial_balance'     // تراز آزمایشی کل و معین
  | 'journal_voucher'   // سند حسابداری دوبل استاندارد
  | 'financial_report'  // گزارشات مالی و کاردکس صندوق
  | 'consignment_delivery_slip' // سند خروجی و رسید تحویل کالای امانی
  | 'expense_voucher'   // قبض و سند رسمی مصارف و هزینه‌ها
  | 'expense'
  | 'transaction'
  | 'receipt'
  | 'payment'
  | 'general'
  | 'custom';

export interface ConsignmentMovement {
  id: string;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  partyCode?: string;
  warehouseId: string;
  warehouseName?: string;
  productId: string;
  productName: string;
  date: string;
  issueTime?: string;
  type: 'deposit' | 'withdrawal' | 'return'; // ورودی امانی، تحویل/خروج به مشتری، برگشت
  documentType: 'invoice' | 'delivery_slip' | 'return_slip' | 'manual';
  documentNumber: string;
  quantityTons: number;
  quantityBags: number;
  driverName?: string;
  carPlate?: string;
  driverPhone?: string;
  receiverName?: string;
  destination?: string;
  remainingTonsAfter?: number;
  remainingBagsAfter?: number;
  notes?: string;
  createdAt: string;
}

export interface PrintableDocumentPayload {
  type: PrintableDocumentType;
  invoice?: Invoice;
  transaction?: FinancialTransaction;
  income?: IncomeItem;
  expense?: ExpenseItem;
  stockTransfer?: StockTransfer;
  consignmentDelivery?: ConsignmentMovement;
  party?: Party;
  partyLedgerInvoices?: Invoice[];
  partyLedgerTransactions?: FinancialTransaction[];
  product?: Product;
  productMovements?: ProductCardexMovement[];
  consignmentMovements?: ConsignmentMovement[];
  consignmentBalance?: {
    totalInTons: number;
    totalInBags: number;
    totalOutTons: number;
    totalOutBags: number;
    remainingTons: number;
    remainingBags: number;
  };
  trialBalanceAccounts?: TrialBalanceAccount[];
  journalVoucher?: JournalVoucher;
  title?: string;
  subtitle?: string;
  summaryCards?: Array<{ label: string; value: string; color?: string }>;
  tableHeaders?: string[];
  tableRows?: (string | number)[][];
  notes?: string;
  documentType?: string;
  customContent?: ReactNode;
  metadata?: Array<{ label: string; value: string }>;
  [key: string]: any;
}

// ================= PRODUCT & STOCK CARDEX =================
export interface ProductCardexMovement {
  id: string;
  date: string;
  time?: string;
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out';
  typeLabel: string;
  documentNumber: string;
  invoiceId?: string;
  transferId?: string;
  partyName?: string;
  warehouseId: string;
  warehouseName: string;
  unit: Unit;
  inQuantity: number;
  inBags: number;
  inTons: number;
  outQuantity: number;
  outBags: number;
  outTons: number;
  unitPrice: number;
  currency?: Currency;
  totalPrice: number;
  balanceTons: number;
  balanceBags: number;
  notes?: string;
}

// ================= CUSTOMER / PARTY CARDEX =================
export interface PartyLedgerEntry {
  id: string;
  date: string;
  time?: string;
  type: 'invoice_sell' | 'invoice_buy' | 'payment_receive' | 'payment_make' | 'exchange';
  typeLabel: string;
  documentNumber: string;
  invoiceId?: string;
  transactionId?: string;
  description: string;
  currency: Currency;
  debit: number;   // بدهکار (ما از او طلبکار می‌شویم)
  credit: number;  // بستانکار (او به ما پرداخت می‌کند یا از ما طلبکار می‌شود)
  balanceAFN: number;
  balanceUSD: number;
  runningBalance?: number; // مانده جاری در تب ارز اختصاصی
  isExchange?: boolean;    // آیا با حالت اکسچنج ارزی ثبت شده است
  exchangeRate?: number;   // نرخ تسویه / تبدیل اکسچنج
  cashAmount?: number;     // مبلغ نقدی واقعی مبادله شده در صندوق
  cashCurrency?: Currency; // ارز نقدی واقعی صندوق
}

// ================= TRIAL BALANCE (تراز آزمایشی کل و معین) =================
export type AccountCategory = 
  | 'current_assets'      // دارایی‌های جاری (صندوق، بانک، صرافی، مطالبات تجاری، موجودی گدام)
  | 'non_current_assets'  // دارایی‌های غیرجاری و ثابت (اموال، تجهیزات و وسایط)
  | 'current_liabilities' // بدهی‌های جاری (بستانکاران تجاری و اسناد پرداختنی)
  | 'equity'              // حقوق صاحبان سهام و سرمایه
  | 'revenues'            // درآمدهای حاصل از فروش و ارائه خدمات
  | 'cogs'                // بهای تمام شده کالای فروش رفته (خرید و کرایه گدام)
  | 'operating_expenses'; // هزینه‌های عملیاتی و اداری

export interface TrialBalanceAccount {
  id: string;
  code: string;               // کد حساب (مثلاً 10101 برای صندوق افغانی)
  name: string;               // نام حساب
  category: AccountCategory;  // سرگروه حسابداری
  categoryName: string;       // نام فارسی گروه (مثلاً دارایی‌های جاری)
  level: 'group' | 'general' | 'subsidiary'; // گروه، کل، معین
  debitTurnoverAFN: number;   // گردش بدهکار افغانی
  creditTurnoverAFN: number;  // گردش بستانکار افغانی
  debitBalanceAFN: number;    // مانده بدهکار افغانی
  creditBalanceAFN: number;   // مانده بستانکار افغانی
  
  debitTurnoverUSD: number;   // گردش بدهکار دلاری
  creditTurnoverUSD: number;  // گردش بستانکار دلاری
  debitBalanceUSD: number;    // مانده بدهکار دلاری
  creditBalanceUSD: number;   // مانده بستانکار دلاری

  netBalanceEquivalentAFN: number; // مانده معادل افغانی با احتساب نرخ روز
  balanceNature: 'debit' | 'credit' | 'balanced'; // ماهیت مانده (بدهکار یا بستانکار)
}

// ================= DOUBLE-ENTRY JOURNAL VOUCHER (سند حسابداری دوبل) =================
export interface JournalVoucherLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  currency: Currency;
  rate?: number;
  equivalentAFN?: number;
}

export interface JournalVoucher {
  id: string;
  voucherNo: string;        // شماره مسلسل سند (مانند Vou0001 یا Jrn0001)
  date: string;             // تاریخ سند (مثلاً 1403/05/20)
  time?: string;
  type: 'auto' | 'manual' | 'opening' | 'closing' | 'adjustment'; // خودکار، دستی، افتتاحیه، اختتامیه، تعدیلی
  referenceType?: 'invoice' | 'transaction' | 'transfer' | 'expense' | 'manual';
  referenceId?: string;
  title: string;            // شرح کلی سند
  description?: string;
  lines: JournalVoucherLine[];
  totalDebitAFN: number;
  totalCreditAFN: number;
  totalDebitUSD: number;
  totalCreditUSD: number;
  isBalanced: boolean;      // آیا سند تراز است؟ (جمع بدهکار = جمع بستانکار)
  createdBy?: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
}

// ================= COMMODITY PROFITABILITY ANALYSIS =================
export interface ProductProfitabilityAnalysis {
  productId: string;
  productName: string;
  category: string;
  tonsSold: number;
  bagsSold: number;
  avgSellPricePerTonAFN: number;
  avgBuyPricePerTonAFN: number;
  totalSalesRevenueAFN: number;
  totalCOGS_AFN: number;
  grossProfitAFN: number;
  profitMarginPercent: number;
  currentStockTons: number;
}

// ================= AUDIT LOG & SYSTEM ACCOUNTABILITY =================
export type AuditActionType = 'create' | 'update' | 'delete' | 'transfer' | 'system_reset' | 'settings_change';

export type AuditCategory = 'invoice' | 'transaction' | 'income' | 'party' | 'cash' | 'asset' | 'system';

export interface AuditLogEntry {
  id: string;
  timestamp: string;      // تاریخ و ساعت ثبت (شمسی و دقیقه:ثانیه)
  user?: string;          // نام کاربر اقدام‌کننده (مثلاً: محمد نذیر نبوی)
  userId?: string;
  userRole?: string;      // نقش کاربری (admin, manager, accountant)
  action: AuditActionType;
  actionLabel: string;    // عنوان فارسی عملیات (مانند: ثبت فاکتور فروش، حذف فاکتور، ویرایش سند دریافت)
  category: AuditCategory;
  entityId?: string;      // شناسه رکورد
  entityNumber?: string;  // شماره سند یا فاکتور (مانند: #102 یا #TRX-301)
  entityTitle: string;    // شرح عنوان موجودیت (مانند: فاکتور فروش - احمد رضایی)
  details: string;        // شرح عملیات انجام شده
  previousValue?: string; // اطلاعات قبلی (قبل از ویرایش یا حذف) به فرمت متنی یا JSON
  newValue?: string;      // اطلاعات جدید (پس از ویرایش یا ایجاد) به فرمت متنی یا JSON
}


