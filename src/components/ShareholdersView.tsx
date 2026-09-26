import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Shareholder } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Printer,
  DollarSign,
  TrendingUp,
  Percent,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  X,
  Save,
  Building,
} from 'lucide-react';

export const ShareholdersView: React.FC = () => {
  const {
    shareholders,
    addShareholder,
    updateShareholder,
    deleteShareholder,
    cashRegister,
    openPrintModal,
    companySettings,
  } = useAccounting();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareholderToEdit, setShareholderToEdit] = useState<Shareholder | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('شریک و سهامدار اصلی');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [capitalUSD, setCapitalUSD] = useState<number>(10000);
  const [capitalAFN, setCapitalAFN] = useState<number>(0);
  const [profitShareAFN, setProfitShareAFN] = useState<number>(0);
  const [withdrawalsUSD, setWithdrawalsUSD] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const usdRate = cashRegister.usdToAfnRate || 65;

  // Calculate total company capital
  const totalCompanyCapitalUSD = shareholders.reduce((acc, sh) => {
    const capUSD = sh.capitalUSD || 0;
    const capAFN = (sh.capitalAFN || 0) / usdRate;
    return acc + capUSD + capAFN;
  }, 0);

  const totalCompanyCapitalAFN = totalCompanyCapitalUSD * usdRate;

  // Open modal
  const handleOpenModal = (sh?: Shareholder) => {
    if (sh) {
      setShareholderToEdit(sh);
      setName(sh.name);
      setRole(sh.role || 'شریک و سهامدار');
      setPhone(sh.phone || '');
      setAddress(sh.address || '');
      setNationalId(sh.nationalId || '');
      setCapitalUSD(sh.capitalUSD || 0);
      setCapitalAFN(sh.capitalAFN || 0);
      setProfitShareAFN(sh.profitShareAFN || 0);
      setWithdrawalsUSD(sh.withdrawalsUSD || 0);
      setNotes(sh.notes || '');
    } else {
      setShareholderToEdit(null);
      setName('');
      setRole('شریک و سهامدار اصلی');
      setPhone('');
      setAddress('کابل');
      setNationalId('');
      setCapitalUSD(10000);
      setCapitalAFN(0);
      setProfitShareAFN(0);
      setWithdrawalsUSD(0);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  // Submit shareholder
  const handleSaveShareholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (shareholderToEdit) {
      updateShareholder(shareholderToEdit.id, {
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        address: address.trim(),
        nationalId: nationalId.trim(),
        capitalUSD,
        capitalAFN,
        profitShareAFN,
        withdrawalsUSD,
        notes: notes.trim(),
      });
    } else {
      addShareholder({
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        address: address.trim(),
        nationalId: nationalId.trim(),
        capitalUSD,
        capitalAFN,
        profitShareAFN,
        withdrawalsUSD,
        notes: notes.trim(),
      });
    }

    setIsModalOpen(false);
  };

  // Filtered shareholders
  const filtered = shareholders.filter(sh => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sh.name.toLowerCase().includes(q) ||
        (sh.role && sh.role.toLowerCase().includes(q)) ||
        (sh.phone && sh.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Print Overall Shareholders & Equity Report
  const handlePrintShareholdersReport = () => {
    openPrintModal({
      title: 'جدول رسمی سهامداران، سرمایه ثبتی و فیصدی سهام شرکت',
      subtitle: `تاریخ تنظیم: ${getPersianDate()} | مجموع سرمایه ثبتی شرکت: $${formatNumber(totalCompanyCapitalUSD)} (${formatNumber(totalCompanyCapitalAFN)} ؋)`,
      summaryCards: [
        { label: 'تعداد کل شرکا و سهامداران', value: `${shareholders.length} نفر` },
        { label: 'سرمایه کل به دالر ($)', value: `$${formatNumber(totalCompanyCapitalUSD)}` },
        { label: 'سرمایه کل به افغانی (؋)', value: `${formatNumber(totalCompanyCapitalAFN)} ؋` },
        { label: 'نرخ روز تسعیر ارز', value: `۱$ = ${usdRate} AFN` },
      ],
      tableHeaders: ['ردیف', 'نام و تخلص سهامدار', 'سمت / مسئولیت', 'سرمایه دالری ($)', 'سرمایه افغانی (؋)', 'فیصدی سهام (%)', 'شماره تماس'],
      tableRows: shareholders.map((sh, idx) => [
        idx + 1,
        sh.name,
        sh.role || 'شریک',
        `$${formatNumber(sh.capitalUSD || 0)}`,
        `${formatNumber(sh.capitalAFN || 0)} ؋`,
        `%${sh.sharePercentage || 0}`,
        sh.phone || '-',
      ]),
      sections: [
        {
          title: 'خلاصه ساختار سهام و سرمایه شرکت',
          items: [
            { label: 'تعداد کل شرکا و سهامداران', value: `${shareholders.length} نفر` },
            { label: 'مجموع سرمایه کل شرکت به دالر ($)', value: `$${formatNumber(totalCompanyCapitalUSD)}`, isBold: true },
            { label: 'مجموع سرمایه کل شرکت به افغانی (؋)', value: `${formatNumber(totalCompanyCapitalAFN)} ؋`, isBold: true },
            { label: 'نرخ محاسبه تسعیر ارز', value: `۱$ = ${usdRate} AFN` },
          ],
        },
      ],
      table: {
        headers: ['نام و تخلص سهامدار', 'سمت / مسئولیت', 'سرمایه دالری ($)', 'سرمایه افغانی (؋)', 'فیصدی سهام (%)', 'شماره تماس'],
        rows: shareholders.map(sh => [
          sh.name,
          sh.role || 'شریک',
          `$${formatNumber(sh.capitalUSD || 0)}`,
          `${formatNumber(sh.capitalAFN || 0)} ؋`,
          `%${sh.sharePercentage || 0}`,
          sh.phone || '-',
        ]),
      },
      footerNote: `هیات مدیره و امور حقوقی شرکت ${companySettings.name}`,
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">امور سهامداران، سرمایه شرکا و فیصدی سهام</h2>
              <p className="text-xs text-slate-500">
                سنجش خودکار فیصدی سهام شرکا بر اساس میزان سرمایه و آورده، ثبت سود و برداشت‌ها
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>معرفی سهامدار جدید</span>
          </button>

          <button
            onClick={handlePrintShareholdersReport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>چاپ صورت سرمایه شرکا</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">تعداد شرکا و سهامداران</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {shareholders.length} <span className="text-xs font-sans text-slate-400">نفر</span>
          </div>
          <div className="text-[11px] text-cyan-700 mt-1 font-semibold">مجموع ۱۰۰٪ ساختار سهام</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">مجموع کل سرمایه شرکت ($ USD)</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            ${formatNumber(totalCompanyCapitalUSD)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">آورده نقدی شرکا به دلار</div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">ارزش معادل کل سرمایه به افغانی</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
              {formatNumber(totalCompanyCapitalAFN)} ؋
            </div>
            <div className="text-[11px] text-slate-400 mt-1">نرخ روز: ۱$ = {usdRate} AFN</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center">
            <PieChart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Equity Structure Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-800">توزیع گرافیکی درصد سهام بین شرکا:</span>
          <span className="text-cyan-800 font-mono">مجموع: ۱۰۰٪</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
          {shareholders.map((sh, idx) => {
            const colors = ['bg-cyan-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
            const clr = colors[idx % colors.length];
            return (
              <div
                key={sh.id}
                style={{ width: `${sh.sharePercentage || 0}%` }}
                className={`${clr} h-full transition-all`}
                title={`${sh.name}: %${sh.sharePercentage}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          {shareholders.map((sh, idx) => {
            const dotColors = ['bg-cyan-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
            const clr = dotColors[idx % dotColors.length];
            return (
              <div key={sh.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${clr}`} />
                <span className="text-slate-700 font-medium">{sh.name}:</span>
                <strong className="font-mono text-slate-900">%{sh.sharePercentage}</strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shareholders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((sh, idx) => {
          const capEquivUSD = (sh.capitalUSD || 0) + ((sh.capitalAFN || 0) / usdRate);

          return (
            <div
              key={sh.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-cyan-400 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-800 flex items-center justify-center font-black text-lg">
                      {sh.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-cyan-800 transition">
                        {sh.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sh.role || 'شریک تجارتی'}</p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="px-3 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full font-black text-xs block">
                      %{sh.sharePercentage} سهم
                    </span>
                  </div>
                </div>

                {/* Capital Metrics */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">سرمایه و آورده دلاری:</span>
                    <strong className="font-mono text-slate-900 font-bold">${formatNumber(sh.capitalUSD || 0)}</strong>
                  </div>

                  {sh.capitalAFN ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">سرمایه و آورده افغانی:</span>
                      <strong className="font-mono text-slate-900 font-bold">{formatNumber(sh.capitalAFN)} ؋</strong>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-cyan-900 font-bold">معادل کل سرمایه شخص:</span>
                    <strong className="font-mono text-cyan-800 font-black text-sm">${formatNumber(capEquivUSD)}</strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">سهم سود اختصاص‌یافته:</span>
                    <strong className="font-mono text-emerald-700 font-bold">{formatNumber(sh.profitShareAFN || 0)} ؋</strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">برداشت‌های شخصی شریک:</span>
                    <strong className="font-mono text-rose-600 font-bold">${formatNumber(sh.withdrawalsUSD || 0)}</strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>شماره تماس: <strong className="text-slate-800 font-mono">{sh.phone || '-'}</strong></span>
                  <span>محل: <strong className="text-slate-800">{sh.address || 'کابل'}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    openPrintModal({
                      title: `صورتحساب سرمایه و سهم شریک: ${sh.name}`,
                      subtitle: `سمت: ${sh.role || 'شریک'} | فیصدی سهام: %${sh.sharePercentage || 0} | تاریخ: ${getPersianDate()}`,
                      summaryCards: [
                        { label: 'نام سهامدار / شریک', value: sh.name },
                        { label: 'سمت در شرکت', value: sh.role || 'شریک' },
                        { label: 'سرمایه دالری ($)', value: `$${formatNumber(sh.capitalUSD || 0)}` },
                        { label: 'سهم از کل شرکت', value: `%${sh.sharePercentage || 0}` },
                      ],
                      tableHeaders: ['مشخصه / آیتم مالی', 'مقدار / وضعیت ثبت شده'],
                      tableRows: [
                        ['نام و تخلص سهامدار', sh.name],
                        ['سمت و مسئولیت در شرکت', sh.role || 'شریک و سهامدار'],
                        ['سرمایه دلاری ثبت شده ($)', `$${formatNumber(sh.capitalUSD || 0)}`],
                        ['سرمایه افغانی ثبت شده (؋)', `${formatNumber(sh.capitalAFN || 0)} ؋`],
                        ['فیصدی کل سهام از شرکت', `%${sh.sharePercentage || 0}`],
                        ['سود تخصیص یافته (افغانی)', `${formatNumber(sh.profitShareAFN || 0)} ؋`],
                        ['مجموع برداشتی‌ها ($)', `$${formatNumber(sh.withdrawalsUSD || 0)}`],
                        ['شماره تماس', sh.phone || '—'],
                        ['آدرس و محل سکونت', sh.address || '—'],
                        ['توضیحات و اسناد', sh.notes || '—'],
                      ],
                      sections: [
                        {
                          title: 'اطلاعات سرمایه‌گذاری و سهام',
                          items: [
                            { label: 'نام شریک / سهامدار', value: sh.name, isBold: true },
                            { label: 'سمت در شرکت', value: sh.role || 'سهامدار' },
                            { label: 'سرمایه دلاری ثبت شده', value: `$${formatNumber(sh.capitalUSD || 0)}`, isBold: true },
                            { label: 'سرمایه افغانی ثبت شده', value: `${formatNumber(sh.capitalAFN || 0)} ؋` },
                            { label: 'فیصدی کل سهام از شرکت', value: `%${sh.sharePercentage}`, isBold: true },
                            { label: 'سود تخصیص یافته', value: `${formatNumber(sh.profitShareAFN || 0)} ؋` },
                            { label: 'مجموع برداشتی‌ها', value: `$${formatNumber(sh.withdrawalsUSD || 0)}` },
                            { label: 'شماره تماس', value: sh.phone || '-' },
                          ],
                        },
                      ],
                      footerNote: `تاییدیه هیات مدیره و امور مالی شرکت ${companySettings.name}`,
                    });
                  }}
                  className="text-cyan-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ سند سهام</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(sh)}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                    title="ویرایش سهامدار"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`آیا از حذف سهامدار "${sh.name}" اطمینان دارید؟`)) {
                        deleteShareholder(sh.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                    title="حذف سهامدار"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SHAREHOLDER */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {shareholderToEdit ? 'ویرایش مشخصات سهامدار' : 'معرفی سهامدار جدید (با سنجش خودکار درصد سهام)'}
                  </h2>
                  <p className="text-xs text-slate-400">محاسبه آنی فیصدی سهم بر اساس کل سرمایه شرکت</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShareholder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام و تخلص سهامدار <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثلاً: حاجی احمد نبوی"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">سمت / عنوان</label>
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="مثلاً: رئیس هیات مدیره، شریک..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سرمایه / آورده به دلار ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={capitalUSD}
                    onChange={e => setCapitalUSD(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سرمایه / آورده به افغانی (؋)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={capitalAFN}
                    onChange={e => setCapitalAFN(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dynamic preview of share percentage */}
              {(() => {
                const shEquiv = (capitalUSD || 0) + ((capitalAFN || 0) / usdRate);
                const otherCapital = shareholders
                  .filter(s => !shareholderToEdit || s.id !== shareholderToEdit.id)
                  .reduce((acc, s) => acc + (s.capitalUSD || 0) + ((s.capitalAFN || 0) / usdRate), 0);
                const newTotal = otherCapital + shEquiv;
                const pct = newTotal > 0 ? ((shEquiv / newTotal) * 100).toFixed(2) : '0';

                return (
                  <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-cyan-900 block">فیصدی سهام محاسبه‌شده:</span>
                      <p className="text-[11px] text-cyan-700">بر مبنای مجموع کل سرمایه شرکت (${formatNumber(newTotal)})</p>
                    </div>
                    <div className="text-2xl font-black text-cyan-800 font-mono">
                      %{pct}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تماس</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0799000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 text-left outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تذکره / پاسپورت</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="کد ملی یا شماره پاسپورت"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 text-left outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس سکونت / محل کار</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="کابل، کارته ۴..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{shareholderToEdit ? 'ذخیره تغییرات' : 'ثبت سهامدار'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
