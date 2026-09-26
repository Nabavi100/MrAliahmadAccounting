import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import { useAccounting } from '../context/AccountingContext';
import { formatNumber, formatCurrency } from '../utils/formatters';
import {
  X,
  Printer,
  Calendar,
  Clock,
  User,
  Building,
  DollarSign,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Edit2,
  Send,
} from 'lucide-react';
import { sendTelegramDirectMessage, buildInvoiceTelegramText } from '../services/telegramApiService';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (invoice: Invoice) => void;
  onOpenPayment?: (type: 'receive_payment' | 'make_payment', partyId: string) => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPrint,
  onOpenPayment,
  onEditInvoice,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { parties, companySettings, notify } = useAccounting();
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  if (!isOpen || !invoice) return null;

  const isSale = invoice.type === 'sell';
  const party = parties.find(p => p.id === invoice.partyId);
  const partyBal = party ? (invoice.currency === 'AFN' ? party.balanceAFN : party.balanceUSD) : 0;

  const handleSendTelegram = async () => {
    if (!party?.telegramChatId) {
      notify(
        'warning',
        'مشتری به ربات تلگرام متصل نیست',
        'جهت ارسال، از منوی «مدیریت تلگرام» کد اتصال یا شماره تماس مشتری را به این شخص پیوند دهید.'
      );
      return;
    }

    setIsSendingTelegram(true);
    try {
      const text = buildInvoiceTelegramText(invoice, party, companySettings);
      const res = await sendTelegramDirectMessage({
        chatId: party.telegramChatId,
        partyId: party.id,
        partyName: party.name,
        messageType: 'invoice',
        title: `فاکتور فروش #${invoice.invoiceNumber}`,
        textContent: text,
      });

      if (res.success) {
        notify('success', 'فاکتور با موفقیت به تلگرام ارسال شد', `فاکتور #${invoice.invoiceNumber} به تلگرام ${party.name} تحویل گردید.`);
      } else {
        notify('error', 'خطا در ارسال تلگرام', res.error || 'ارسال ناموفق بود');
      }
    } catch (e: any) {
      notify('error', 'خطای شبکه در ارسال', e?.message);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const totalBagsInInvoice = invoice.items.reduce((sum, item) => sum + (item.bagsCount || 0), 0);
  const totalTonsInInvoice = invoice.items.reduce((sum, item) => sum + (item.tonsCount || 0), 0);

  return (
    <div
      id="invoice-detail-modal-backdrop"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="invoice-detail-modal-container"
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-2"
        dir="rtl"
      >
        {/* Top Sticky Header with Fixed Action Buttons */}
        <div className="sticky top-0 z-50 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${
                isSale ? 'bg-rose-600' : 'bg-blue-600'
              }`}
            >
              {isSale ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {isSale ? 'مشاهده و جزئیات فاکتور فروش' : 'مشاهده و جزئیات فاکتور خرید'}
                </h3>
                <span className="text-xs font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-slate-200 border border-white/10">
                  #{invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                طرف حساب: <strong className="text-white font-bold">{invoice.partyName}</strong> • تاریخ: {invoice.date}
              </p>
            </div>
          </div>

          {/* Action buttons fixed at top */}
          <div className="flex flex-wrap items-center gap-2">
            {onPrint && (
              <>
                <button
                  type="button"
                  onClick={() => onPrint(invoice)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="چاپ مستقیم فاکتور"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ مستقیم</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrint(invoice)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="خروجی PDF و تنظیم چاپ"
                >
                  <Download className="w-4 h-4" />
                  <span>خروجی PDF / چاپ</span>
                </button>
              </>
            )}

            {/* Direct Telegram Send Button */}
            <button
              type="button"
              onClick={handleSendTelegram}
              disabled={isSendingTelegram}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title={party?.telegramChatId ? `ارسال مستقیم فاکتور به تلگرام ${party.name}` : 'ارسال به تلگرام (مشتری به ربات متصل نیست)'}
            >
              <Send className={`w-3.5 h-3.5 -rotate-45 ${isSendingTelegram ? 'animate-bounce' : ''}`} />
              <span>{isSendingTelegram ? 'در حال ارسال...' : 'ارسال به تلگرام'}</span>
              {party?.telegramChatId && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              )}
            </button>

            {onOpenPayment && invoice.balanceAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(isSale ? 'receive_payment' : 'make_payment', invoice.partyId);
                }}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title="ثبت سند پرداخت / دریافت وجه"
              >
                <DollarSign className="w-4 h-4" />
                <span>تسویه وجه</span>
              </button>
            )}

            {/* Close Button */}
            <button
              id="invoice-detail-modal-close-btn"
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl transition border border-white/15 hover:border-rose-500 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-xs active:scale-95"
              title="بستن فرم (ESC)"
            >
              <X className="w-4 h-4" />
              <span>بستن (ESC)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* Party & Metadata Summary Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>طرف حساب ({isSale ? 'مشتری / خریدار' : 'تأمین‌کننده / فروشنده'}):</span>
              </span>
              <div className="font-bold text-sm text-slate-900">{invoice.partyName}</div>
              {invoice.partyPhone && (
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{invoice.partyPhone}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاریخ و زمان صدور:</span>
              </span>
              <div className="font-bold text-sm text-slate-900 font-mono">{invoice.date}</div>
              {invoice.issueTime && (
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>ساعت {invoice.issueTime}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>ارز و نوع فاکتور:</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                    invoice.currency === 'USD'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {invoice.currency === 'USD' ? 'دلار آمریکا ($)' : 'افغانی (؋)'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    isSale ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {isSale ? 'فروش کالا' : 'خرید کالا'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>وضعیت تسویه مالی:</span>
              </span>
              <div className="mt-0.5">
                {invoice.balanceAmount <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    تسویه شده کامل (نقدی)
                  </span>
                ) : invoice.paidAmount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                    تسویه ناقص (بخشی نسیه)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                    کلاً نسیه / قرضه
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <span>لیست اقلام و کالاهای فاکتور</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-mono">
                  {invoice.items.length} قلم
                </span>
              </h4>
              <div className="text-xs text-slate-500 font-mono">
                جمع تناژ: <strong className="text-slate-800">{formatNumber(totalTonsInInvoice)} تن</strong> |{' '}
                جمع بوجی: <strong className="text-slate-800">{formatNumber(totalBagsInInvoice)} کیسه</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-4">شرح کالا</th>
                    <th className="py-3 px-3 text-center">مقدار</th>
                    <th className="py-3 px-3 text-center">واحد</th>
                    <th className="py-3 px-3 text-center">معادل تن / کیسه</th>
                    <th className="py-3 px-3 text-center">گدام</th>
                    <th className="py-3 px-4 text-left">قیمت فی ({invoice.currency})</th>
                    <th className="py-3 px-4 text-left">مجموع مبلغ ({invoice.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {item.unit === 'ton' ? 'تن' : item.unit === 'bag' ? 'کیسه/بوجی' : item.unit}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-600">
                        {formatNumber(item.tonsCount)} تن / {formatNumber(item.bagsCount)} کیسه
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {item.warehouseName || 'گدام اصلی'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-800">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalPrice, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notes / Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
              <h5 className="font-bold text-slate-800">یادداشت و توضیحات فاکتور</h5>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl min-h-[70px] leading-relaxed border border-slate-100">
                {invoice.notes || 'توضیحات یا شرط خاصی برای این فاکتور ثبت نشده است.'}
              </p>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>جمع کل اقلام (مبلغ ناخالص):</span>
                <span className="font-mono font-bold">
                  {formatCurrency(invoice.subtotal || invoice.totalAmount, invoice.currency)}
                </span>
              </div>

              {(invoice.discount || 0) > 0 && (
                <div className="flex justify-between items-center text-amber-700 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                  <span>تخفیف ویژه اعمال‌شده:</span>
                  <span className="font-mono font-bold">
                    - {formatCurrency(invoice.discount, invoice.currency)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">مبلغ نهایی قابل تسویه:</span>
                <span className="font-mono font-black text-base text-slate-900">
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="font-bold">مبلغ پرداخت / دریافت شده نقدی:</span>
                <span className="font-mono font-black text-sm">
                  {formatCurrency(invoice.paidAmount, invoice.currency)}
                </span>
              </div>

              <div
                className={`flex justify-between items-center p-2.5 rounded-xl border ${
                  invoice.balanceAmount > 0
                    ? 'bg-rose-50/80 text-rose-800 border-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span className="font-bold">
                  {invoice.balanceAmount > 0
                    ? isSale
                      ? 'باقیمانده طلب ما (قرضه مشتری):'
                      : 'باقیمانده بدهی ما به فروشنده:'
                    : 'مانده حساب:'}
                </span>
                <span className="font-mono font-black text-sm">
                  {formatCurrency(invoice.balanceAmount, invoice.currency)}
                </span>
              </div>

              {party && (
                <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-xs">
                  <span className="font-bold text-slate-700">الباقی کل حساب شخص در سیستم:</span>
                  <span className={`font-mono font-black ${partyBal < 0 ? 'text-rose-700' : partyBal > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                    {Math.abs(partyBal).toLocaleString()} {invoice.currency}{' '}
                    <span className="font-sans text-[10.5px]">
                      {partyBal < 0 ? '(قرضدار ما)' : partyBal > 0 ? '(طلبکار)' : '(تسویه کامل)'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onEditInvoice && (
              <button
                id="invoice-detail-re-edit-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onEditInvoice(invoice);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                title="ویرایش مجدد اقلام، مبالغ، انبار یا مشتری فاکتور"
              >
                <Edit2 className="w-4 h-4" />
                <span>ویرایش مجدد فاکتور</span>
              </button>
            )}

            {onPrint && (
              <button
                id="invoice-detail-print-btn"
                type="button"
                onClick={() => onPrint(invoice)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسمی فاکتور A4 و حواله گدام</span>
              </button>
            )}

            {onOpenPayment && invoice.balanceAmount > 0 && (
              <button
                id="invoice-detail-pay-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(isSale ? 'receive_payment' : 'make_payment', invoice.partyId);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>ثبت دریافت / پرداخت وجه برای این فاکتور</span>
              </button>
            )}
          </div>

          <button
            id="invoice-detail-footer-close-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
          >
            بستن فرم
          </button>
        </div>
      </div>
    </div>
  );
};
