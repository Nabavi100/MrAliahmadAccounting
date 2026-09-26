import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  ShieldAlert,
  Search,
  Filter,
  FileText,
  Trash2,
  Edit3,
  PlusCircle,
  ArrowRightLeft,
  Calendar,
  UserCheck,
  Eye,
  X,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { AuditLogEntry, AuditCategory, AuditActionType } from '../types';
import { getPersianDate, formatNumber } from '../utils/formatters';

export const AuditLogView: React.FC = () => {
  const { auditLogs, clearAuditLogs, openPrintModal, companySettings, notify } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all');
  const [inspectingEntry, setInspectingEntry] = useState<AuditLogEntry | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const creates = auditLogs.filter(l => l.action === 'create').length;
    const updates = auditLogs.filter(l => l.action === 'update').length;
    const deletes = auditLogs.filter(l => l.action === 'delete').length;
    const transfers = auditLogs.filter(l => l.action === 'transfer').length;
    return { total, creates, updates, deletes, transfers };
  }, [auditLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const today = getPersianDate();

    return auditLogs.filter(log => {
      // Category filter
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false;
      }

      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      // Time filter
      if (selectedTimeFilter === 'today') {
        if (!log.timestamp.includes(today)) return false;
      }

      // Search keyword filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = (log.entityNumber || '').toLowerCase().includes(term);
        const matchTitle = (log.entityTitle || '').toLowerCase().includes(term);
        const matchDetails = (log.details || '').toLowerCase().includes(term);
        const matchUser = (log.user || '').toLowerCase().includes(term);
        const matchAction = (log.actionLabel || '').toLowerCase().includes(term);
        if (!matchNumber && !matchTitle && !matchDetails && !matchUser && !matchAction) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, selectedCategory, selectedAction, selectedTimeFilter, searchTerm]);

  // Handle Print Audit Report
  const handlePrintAuditTrail = () => {
    const tableHeaders = ['ردیف', 'تاریخ و زمان', 'اقدام', 'شماره سند / موضوع', 'شرح عملیات', 'کاربر'];
    const tableRows = filteredLogs.slice(0, 100).map((l, index) => [
      (index + 1).toString(),
      l.timestamp,
      l.actionLabel,
      l.entityTitle,
      l.details,
      l.user,
    ]);

    openPrintModal({
      type: 'financial_report',
      title: 'دفتر رسمی ثبت رویدادها و ممیزی سیستم (Audit Log)',
      subtitle: `گزارش ثبت تغییرات، اصلاحات و حذفیات سیستم • تاریخ گزارش: ${getPersianDate()} • شرکت: ${companySettings.name}`,
      tableHeaders,
      tableRows,
      summaryCards: [
        { label: 'کل رویدادهای ثبت‌شده', value: stats.total.toString(), color: 'blue' },
        { label: 'عملیات‌های ایجاد', value: stats.creates.toString(), color: 'emerald' },
        { label: 'ویرایش‌ها و اصلاحات', value: stats.updates.toString(), color: 'amber' },
        { label: 'حذفیات امنیتی', value: stats.deletes.toString(), color: 'rose' },
      ],
      metadata: [
        { label: 'شرکت', value: companySettings.name },
        { label: 'تعداد کل لاگ‌ها', value: filteredLogs.length.toString() },
        { label: 'فیلتر دسته‌بندی', value: selectedCategory === 'all' ? 'همه بخش‌ها' : selectedCategory },
      ],
    });
  };

  const getActionBadge = (action: AuditActionType, label: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <PlusCircle className="w-3 h-3" />
            {label}
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Edit3 className="w-3 h-3" />
            {label}
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <Trash2 className="w-3 h-3" />
            {label}
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <ArrowRightLeft className="w-3 h-3" />
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            {label}
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: AuditCategory) => {
    const map: Record<AuditCategory, { label: string; color: string }> = {
      invoice: { label: 'فاکتورها', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
      transaction: { label: 'دریافت و پرداخت', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300' },
      income: { label: 'عواید و درآمد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
      party: { label: 'اشخاص و مشتریان', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300' },
      cash: { label: 'صندوق و بانک', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
      asset: { label: 'دارایی‌های ثابت', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
      system: { label: 'تنظیمات سیستم', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
    };
    const c = map[cat] || { label: cat, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Title */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                دفتر ثبت رویدادها و ممیزی امنیتی (Audit Log)
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                ردیابی تغییرات و حذفیات
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ثبت تمام فعالیت‌های کاربران شامل ایجاد، ویرایش و حذف اسناد، فاکتورها، دریافت‌ها و پرداخت‌ها همراه با مقادیر قبل و بعد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrintAuditTrail}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ رسمی ممیزی</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاکسازی لاگ‌ها</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">کل رویدادهای ثبت‌شده</span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">عملیات‌های ایجاد جدید</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.creates}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">ویرایش‌ها و تغییرات</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{stats.updates}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">حذفیات امنیتی</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{stats.deletes}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در شماره سند، نام طرف حساب، نام کاربر یا شرح عملیات..."
              className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="all">همه بخش‌ها (کل سیستم)</option>
              <option value="invoice">فاکتورها (خرید/فروش)</option>
              <option value="transaction">دریافت و پرداخت</option>
              <option value="income">عواید و درآمدها</option>
              <option value="party">طرف‌های حساب / اشخاص</option>
              <option value="cash">صندوق‌ها و بانک‌ها</option>
              <option value="asset">دارایی‌های ثابت</option>
              <option value="system">تنظیمات سیستم</option>
            </select>

            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="all">همه اقدام‌ها</option>
              <option value="create">ثبت جدید (ایجاد)</option>
              <option value="update">ویرایش و تغییرات</option>
              <option value="delete">حذف اسناد</option>
              <option value="transfer">انتقال وجه / کالا</option>
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedTimeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                تمام زمان‌ها
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeFilter('today')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedTimeFilter === 'today'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                امروز
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              رویدادهای ثبت‌شده ({filteredLogs.length} رویداد)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            مرتب‌سازی بر اساس تازه‌ترین رویدادها
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">هیچ رویدادی مطابق با فیلتر یافت نشد</h3>
            <p className="text-xs text-slate-400 mt-1">با ثبت فاکتورها، دریافت‌ها، ویرایش یا حذف، رویدادها در این بخش به طور خودکار ثبت می‌گردند.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">تاریخ و زمان</th>
                  <th className="py-3 px-4">نوع اقدام</th>
                  <th className="py-3 px-4">بخش سیستم</th>
                  <th className="py-3 px-4">موضوع / شماره سند</th>
                  <th className="py-3 px-4">شرح رویداد</th>
                  <th className="py-3 px-4">کاربر اقدام‌کننده</th>
                  <th className="py-3 px-4 text-center">جزئیات ممیزی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11.5px] text-slate-600 dark:text-slate-400 shrink-0">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action, log.actionLabel)}
                    </td>
                    <td className="py-3 px-4">
                      {getCategoryBadge(log.category)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {log.entityTitle}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-[11.5px]">{log.user}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setInspectingEntry(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/40 dark:text-slate-300 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="مشاهده مقادیر قبل و بعد"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>بررسی</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Diff Modal */}
      {inspectingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    جزئیات ممیزی و تاریخچه مقادیر سند
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    شناسه لاگ: {inspectingEntry.id} • {inspectingEntry.timestamp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">اقدام انجام‌شده:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{inspectingEntry.actionLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">کاربر مسئول:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{inspectingEntry.user}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تاریخ و ساعت:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{inspectingEntry.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">موضوع سند:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{inspectingEntry.entityTitle}</span>
                </div>
              </div>

              {/* Action Description */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">شرح تغییرات و رویداد:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{inspectingEntry.details}</p>
              </div>

              {/* Values Comparison (Previous vs New) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous Value */}
                <div className="border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5 bg-rose-50/30 dark:bg-rose-950/10 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      مقدار قبلی (قبل از تغییر / حذف)
                    </span>
                  </div>
                  {inspectingEntry.previousValue ? (
                    <pre className="text-[11px] font-mono bg-white dark:bg-slate-950 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 text-slate-800 dark:text-slate-200 overflow-x-auto max-h-56 leading-relaxed">
                      {inspectingEntry.previousValue}
                    </pre>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400 border border-dashed border-rose-200 dark:border-rose-900/30 rounded-xl">
                      (سند جدید بوده و مقدار قبلی نداشته است)
                    </div>
                  )}
                </div>

                {/* New Value */}
                <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-3.5 bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      مقدار جدید (پس از تغییر یا ایجاد)
                    </span>
                  </div>
                  {inspectingEntry.newValue ? (
                    <pre className="text-[11px] font-mono bg-white dark:bg-slate-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200 overflow-x-auto max-h-56 leading-relaxed">
                      {inspectingEntry.newValue}
                    </pre>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400 border border-dashed border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                      (سند حذف شده و مقدار جدید ندارد)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              آیا از پاکسازی تمام لاگ‌های ممیزی اطمینان دارید؟
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              این عملیات تمام لاگ‌های تاریخی را پاک می‌کند. این کار تنها برای دوره‌های جدید مالی یا تست توصیه می‌شود.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                  notify('info', 'لاگ‌های ممیزی با موفقیت پاکسازی شدند');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
              >
                بله، پاکسازی شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
