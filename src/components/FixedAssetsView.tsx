import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { AssetGroup, FixedAsset, Currency } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { calculateAssetDepreciation } from '../utils/assetCalculations';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Printer,
  Calendar,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Truck,
  Box,
  Monitor,
  Building,
  ShieldCheck,
  FileText,
  X,
  Save,
  ChevronDown,
} from 'lucide-react';

export const FixedAssetsView: React.FC = () => {
  const {
    assetGroups,
    addAssetGroup,
    updateAssetGroup,
    deleteAssetGroup,
    fixedAssets,
    addFixedAsset,
    updateFixedAsset,
    deleteFixedAsset,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<FixedAsset | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<AssetGroup | null>(null);

  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<FixedAsset | null>(null);

  // Form states for Asset
  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [assetGroupId, setAssetGroupId] = useState('');
  const [assetCost, setAssetCost] = useState<number>(6000);
  const [assetCurrency, setAssetCurrency] = useState<Currency>('AFN');
  const [assetUsefulLifeYears, setAssetUsefulLifeYears] = useState<number>(6);
  const [assetPurchaseDate, setAssetPurchaseDate] = useState(getPersianDate());
  const [assetSalvageValue, setAssetSalvageValue] = useState<number>(0);
  const [assetLocation, setAssetLocation] = useState('دفتر مرکزی');
  const [assetInCharge, setAssetInCharge] = useState('مسئول اداری');
  const [assetNotes, setAssetNotes] = useState('');

  // Form states for Group
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('violet');
  const [groupDesc, setGroupDesc] = useState('');

  // Open asset modal helper
  const handleOpenAssetModal = (asset?: FixedAsset) => {
    if (asset) {
      setAssetToEdit(asset);
      setAssetName(asset.name);
      setAssetCode(asset.code);
      setAssetGroupId(asset.groupId || (assetGroups[0]?.id || ''));
      setAssetCost(asset.cost);
      setAssetCurrency(asset.currency || 'AFN');
      setAssetUsefulLifeYears(asset.usefulLifeYears || 5);
      setAssetPurchaseDate(asset.buyDate || getPersianDate());
      setAssetSalvageValue(asset.salvageValue || 0);
      setAssetLocation(asset.location || 'دفتر مرکزی');
      setAssetInCharge(asset.inCharge || '');
      setAssetNotes(asset.notes || '');
    } else {
      setAssetToEdit(null);
      setAssetName('');
      setAssetCode(`FA-${Math.floor(1000 + Math.random() * 9000)}`);
      setAssetGroupId(selectedGroupId !== 'all' ? selectedGroupId : (assetGroups[0]?.id || ''));
      setAssetCost(6000);
      setAssetCurrency('AFN');
      setAssetUsefulLifeYears(6);
      setAssetPurchaseDate(getPersianDate());
      setAssetSalvageValue(0);
      setAssetLocation('دفتر مرکزی');
      setAssetInCharge('');
      setAssetNotes('');
    }
    setIsAssetModalOpen(true);
  };

  // Submit asset
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    const matchedGroup = assetGroups.find(g => g.id === assetGroupId);
    const grpName = matchedGroup ? matchedGroup.name : 'عمومی';

    if (assetToEdit) {
      updateFixedAsset(assetToEdit.id, {
        name: assetName.trim(),
        code: assetCode.trim(),
        groupId: assetGroupId,
        groupName: grpName,
        cost: assetCost,
        currency: assetCurrency,
        usefulLifeYears: assetUsefulLifeYears,
        buyDate: assetPurchaseDate,
        salvageValue: assetSalvageValue,
        location: assetLocation.trim(),
        inCharge: assetInCharge.trim(),
        notes: assetNotes.trim(),
      });
    } else {
      addFixedAsset({
        name: assetName.trim(),
        code: assetCode.trim() || `FA-${Math.floor(1000 + Math.random() * 9000)}`,
        groupId: assetGroupId,
        groupName: grpName,
        cost: assetCost,
        currency: assetCurrency,
        usefulLifeYears: assetUsefulLifeYears,
        buyDate: assetPurchaseDate,
        salvageValue: assetSalvageValue,
        location: assetLocation.trim(),
        inCharge: assetInCharge.trim(),
        notes: assetNotes.trim(),
        status: 'active',
      });
    }

    setIsAssetModalOpen(false);
  };

  // Open group modal helper
  const handleOpenGroupModal = (group?: AssetGroup) => {
    if (group) {
      setGroupToEdit(group);
      setGroupName(group.name);
      setGroupColor(group.color || 'violet');
      setGroupDesc(group.description || '');
    } else {
      setGroupToEdit(null);
      setGroupName('');
      setGroupColor('violet');
      setGroupDesc('');
    }
    setIsGroupModalOpen(true);
  };

  // Submit group
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    if (groupToEdit) {
      updateAssetGroup(groupToEdit.id, {
        name: groupName.trim(),
        color: groupColor,
        description: groupDesc.trim(),
      });
    } else {
      addAssetGroup({
        name: groupName.trim(),
        color: groupColor,
        description: groupDesc.trim(),
      });
    }

    setIsGroupModalOpen(false);
  };

  // Filtered Assets
  const filteredAssets = fixedAssets.filter(asset => {
    if (selectedGroupId !== 'all' && asset.groupId !== selectedGroupId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.code.toLowerCase().includes(q) ||
        (asset.inCharge && asset.inCharge.toLowerCase().includes(q)) ||
        (asset.groupName && asset.groupName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate cumulative depreciation totals
  let totalCostAFN = 0;
  let totalCurrentBookValueAFN = 0;
  let totalAccumulatedDepreciationAFN = 0;

  fixedAssets.forEach(asset => {
    const dep = calculateAssetDepreciation(asset);
    if (asset.currency === 'USD') {
      // Keep USD or convert for overall AFN stat
      totalCostAFN += asset.cost * 65;
      totalCurrentBookValueAFN += dep.currentBookValue * 65;
      totalAccumulatedDepreciationAFN += dep.accumulatedDepreciation * 65;
    } else {
      totalCostAFN += asset.cost;
      totalCurrentBookValueAFN += dep.currentBookValue;
      totalAccumulatedDepreciationAFN += dep.accumulatedDepreciation;
    }
  });

  // Print Overall Fixed Assets Report
  const handlePrintAssetsReport = () => {
    openPrintModal({
      title: 'گزارش جامع دارایی‌های ثابت و جدول استهلاک روزانه تجهیزات',
      subtitle: `تاریخ گزارش: ${getPersianDate()} | تعداد کل اقلام: ${fixedAssets.length} قلم`,
      sections: [
        {
          title: 'خلاصه وضعیت دارایی‌های ثابت شرکت',
          items: [
            { label: 'تعداد کل اقلام اموال و تجهیزات', value: `${fixedAssets.length} قلم` },
            { label: 'مجموع بهای تمام شده خرید اولیه', value: `${formatNumber(totalCostAFN)} ؋`, isBold: true },
            { label: 'مجموع استهلاک مستهلک شده تا امروز', value: `${formatNumber(totalAccumulatedDepreciationAFN)} ؋` },
            { label: 'خالص ارزش دفتری روز دارایی‌ها', value: `${formatNumber(totalCurrentBookValueAFN)} ؋`, isBold: true },
          ],
        },
      ],
      table: {
        headers: ['کد اموال', 'نام جنس / لوازم', 'گروه‌بندی', 'تاریخ خرید', 'عمر مفید', 'قیمت خرید', 'استهلاک روزانه', 'ارزش دفتری فعلی'],
        rows: fixedAssets.map(asset => {
          const dep = calculateAssetDepreciation(asset);
          return [
            asset.code,
            asset.name,
            asset.groupName || 'عمومی',
            asset.buyDate,
            `${asset.usefulLifeYears || 5} سال`,
            formatCurrency(asset.cost, asset.currency || 'AFN'),
            formatCurrency(dep.dailyDepreciation, asset.currency || 'AFN'),
            formatCurrency(dep.currentBookValue, asset.currency || 'AFN'),
          ];
        }),
      },
      footerNote: `امور مالی و اموال شرکت ${companySettings.name}`,
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">تجهیزات، دارایی‌های ثابت و استهلاک روزانه</h2>
              <p className="text-xs text-slate-500">
                گروه‌بندی اموال، ثبت مشخصات، عمر مفید (سال/روز) و کسر استهلاک روزانه بر اساس استاندارد حسابداری
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenGroupModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
          >
            <Plus className="w-4 h-4 text-violet-600" />
            <span>ایجاد گروه جدید</span>
          </button>

          <button
            onClick={() => handleOpenAssetModal()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت جنس و لوازم جدید</span>
          </button>

          <button
            onClick={handlePrintAssetsReport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-violet-400" />
            <span>چاپ گزارش استهلاک</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">تعداد کل اقلام اموال و تجهیزات</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {fixedAssets.length} <span className="text-xs font-sans text-slate-400">قلم</span>
          </div>
          <div className="text-[11px] text-violet-600 mt-1 font-semibold">در {assetGroups.length} گروه دسته‌بندی</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">مجموع بهای خرید اولیه (AFN)</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {formatNumber(totalCostAFN)} ؋
          </div>
          <div className="text-[11px] text-slate-400 mt-1">سرمایه‌گذاری اولیه در تجهیزات</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-700 block">مجموع استهلاک کسر شده تا امروز</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {formatNumber(totalAccumulatedDepreciationAFN)} ؋
          </div>
          <div className="text-[11px] text-rose-500 mt-1">کسر روزانه بر اساس عمر مفید</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs bg-gradient-to-br from-emerald-50/30 to-white">
          <span className="text-xs font-bold text-emerald-800 block">خالص ارزش دفتری روز دارایی‌ها</span>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
            {formatNumber(totalCurrentBookValueAFN)} ؋
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">ارزش واقعی سرمایه‌ای در ترازنامه</div>
        </div>
      </div>

      {/* Asset Groups Badges Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 ml-2">گروه‌های اموال:</span>
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedGroupId === 'all'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            همه گروه‌ها ({fixedAssets.length})
          </button>

          {assetGroups.map(grp => {
            const count = fixedAssets.filter(a => a.groupId === grp.id).length;
            return (
              <div key={grp.id} className="flex items-center">
                <button
                  onClick={() => setSelectedGroupId(grp.id)}
                  className={`px-3.5 py-1.5 rounded-r-xl text-xs font-bold transition cursor-pointer ${
                    selectedGroupId === grp.id
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {grp.name} ({count})
                </button>
                <div className="flex bg-slate-100 rounded-l-xl px-1 py-1 border-r border-slate-200">
                  <button
                    onClick={() => handleOpenGroupModal(grp)}
                    className="p-1 hover:text-violet-600 text-slate-400 transition"
                    title="ویرایش گروه"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`آیا از حذف گروه "${grp.name}" مطمئن هستید؟`)) {
                        deleteAssetGroup(grp.id);
                      }
                    }}
                    className="p-1 hover:text-rose-600 text-slate-400 transition"
                    title="حذف گروه"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام جنس، کد، مسئول..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-violet-500"
          />
        </div>
      </div>

      {/* Fixed Assets Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => {
          const dep = calculateAssetDepreciation(asset);
          const percentUsed = Math.min(100, Math.round(dep.depreciationPercentage));

          return (
            <div
              key={asset.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-violet-700 transition">
                        {asset.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{asset.code}</span>
                      <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 text-[10px] font-bold border border-violet-200">
                        {asset.groupName || 'عمومی'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {asset.status === 'under_maintenance' ? 'در حال تعمیر' : asset.status === 'scrap' ? 'مستهلک' : 'فعال و دایر'}
                  </span>
                </div>

                {/* Pricing & Depreciation Math Highlight */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">قیمت خرید اولیه:</span>
                    <strong className="font-mono text-slate-900 text-sm">
                      {formatCurrency(asset.cost, asset.currency || 'AFN')}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">عمر مفید تعیین‌شده:</span>
                    <strong className="font-mono text-violet-700 font-bold">
                      {asset.usefulLifeYears || 5} سال ({dep.totalLifeDays} روز)
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">کسر استهلاک روزانه:</span>
                    <strong className="font-mono text-rose-600 font-bold">
                      {formatCurrency(dep.dailyDepreciation, asset.currency || 'AFN')} / روز
                    </strong>
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[11px] text-emerald-800 font-bold block">ارزش دفتری کارشناسی روز:</span>
                      <span className="text-[10px] text-slate-400">
                        پس از سپری‌شدن {dep.elapsedDays} روز
                      </span>
                    </div>
                    <strong className="text-base font-black text-emerald-700 font-mono">
                      {formatCurrency(dep.currentBookValue, asset.currency || 'AFN')}
                    </strong>
                  </div>
                </div>

                {/* Progress bar of Depreciation */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500">میزان استهلاک مصرف‌شده:</span>
                    <span className="text-rose-600 font-mono">%{percentUsed}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        percentUsed > 80 ? 'bg-rose-500' : percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>تاریخ خرید: {asset.buyDate}</span>
                    <span>باقیمانده: {dep.remainingDays} روز ({(dep.remainingDays / 365).toFixed(1)} سال)</span>
                  </div>
                </div>

                {/* In charge / location */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>تحویل‌گیرنده: <strong className="text-slate-800 font-medium">{asset.inCharge || 'مسئول اداری'}</strong></span>
                  <span>محل: <strong className="text-slate-800 font-medium">{asset.location || 'دفتر کابل'}</strong></span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    openPrintModal({
                      title: `کارت مشخصات و استهلاک دارایی: ${asset.name}`,
                      subtitle: `کد اموال: ${asset.code} | تاریخ خرید: ${asset.buyDate}`,
                      sections: [
                        {
                          title: 'مشخصات فنی و استهلاک دارایی',
                          items: [
                            { label: 'نام جنس / وسیله', value: asset.name, isBold: true },
                            { label: 'کد ثبت اموال', value: asset.code },
                            { label: 'گروه و دسته‌بندی', value: asset.groupName || 'عمومی' },
                            { label: 'قیمت خرید اولیه', value: formatCurrency(asset.cost, asset.currency || 'AFN'), isBold: true },
                            { label: 'عمر مفید برآورد شده', value: `${asset.usefulLifeYears || 5} سال (${dep.totalLifeDays} روز)` },
                            { label: 'نرخ کسر استهلاک روزانه', value: `${formatCurrency(dep.dailyDepreciation, asset.currency || 'AFN')} در هر روز` },
                            { label: 'مدت زمان سپری شده از خرید', value: `${dep.elapsedDays} روز` },
                            { label: 'مجموع استهلاک انباشته کسر شده', value: formatCurrency(dep.accumulatedDepreciation, asset.currency || 'AFN') },
                            { label: 'ارزش دفتری فعلی روز', value: formatCurrency(dep.currentBookValue, asset.currency || 'AFN'), isBold: true },
                            { label: 'محل استقرار فیزیکی', value: asset.location || 'دفتر مرکزی' },
                            { label: 'مسئول تحویل‌گیرنده', value: asset.inCharge || 'مسئول اداری' },
                          ],
                        },
                      ],
                      footerNote: `اموال و دارایی‌های ثابت شرکت ${companySettings.name}`,
                    });
                  }}
                  className="text-violet-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ کارت اموال</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAssetModal(asset)}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                    title="ویرایش دارایی"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`آیا از حذف دارایی "${asset.name}" اطمینان دارید؟`)) {
                        deleteFixedAsset(asset.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                    title="حذف دارایی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">هیچ دارایی یا تجهیزاتی در این گروه یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه "ثبت جنس و لوازم جدید" اقلام مورد نظر خود را اضافه نمایید.</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT FIXED ASSET */}
      {/* ========================================================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {assetToEdit ? 'ویرایش اطلاعات دارایی و تجهیزات' : 'ثبت جنس و تجهیزات جدید (با محاسبه استهلاک)'}
                  </h2>
                  <p className="text-xs text-slate-400">محاسبه خودکار کسر استهلاک روزانه بر اساس سال و قیمت خرید</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام جنس / وسیله / تجهیزات <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                    placeholder="مثلاً: موبایل هوشمند سامسونگ، موتر هایلوکس، لپ‌تاپ..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">کد اموال</label>
                  <input
                    type="text"
                    value={assetCode}
                    onChange={e => setAssetCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 text-left outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">گروه‌بندی دارایی</label>
                  <select
                    value={assetGroupId}
                    onChange={e => setAssetGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {assetGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ خرید</label>
                  <input
                    type="text"
                    value={assetPurchaseDate}
                    onChange={e => setAssetPurchaseDate(e.target.value)}
                    placeholder="1403/01/15"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 text-left outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    قیمت خرید اولیه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={assetCost}
                    onChange={e => setAssetCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">واحد پولی</label>
                  <select
                    value={assetCurrency}
                    onChange={e => setAssetCurrency(e.target.value as Currency)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="AFN">افغانی (AFN ؋)</option>
                    <option value="USD">دالر آمریکا (USD $)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عمر مفید (سال) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    value={assetUsefulLifeYears}
                    onChange={e => setAssetUsefulLifeYears(parseFloat(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-left outline-none focus:bg-white focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              {/* Real-time calculation preview box */}
              {(() => {
                const totalDays = Math.max(1, Math.round(assetUsefulLifeYears * 365));
                const dailyRate = assetCost / totalDays;
                return (
                  <div className="p-4 bg-violet-50 rounded-2xl border border-violet-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-violet-900 font-bold">محاسبه استهلاک روزانه:</span>
                      <strong className="font-mono text-violet-800 font-black text-sm">
                        {dailyRate.toFixed(2)} {assetCurrency} در هر روز
                      </strong>
                    </div>
                    <p className="text-[11px] text-violet-700">
                      فرمول: قیمت خرید ({formatNumber(assetCost)}) تقسیم بر مجموع روزهای عمر مفید ({formatNumber(totalDays)} روز = {assetUsefulLifeYears} سال)
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">محل استقرار</label>
                  <input
                    type="text"
                    value={assetLocation}
                    onChange={e => setAssetLocation(e.target.value)}
                    placeholder="مثلاً: دفتر کابل، گدام مرکزی، صرافی..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تحویل‌گیرنده / مسئول</label>
                  <input
                    type="text"
                    value={assetInCharge}
                    onChange={e => setAssetInCharge(e.target.value)}
                    placeholder="نام کارمند یا راننده..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و مشخصات تکمیلی</label>
                <textarea
                  rows={2}
                  value={assetNotes}
                  onChange={e => setAssetNotes(e.target.value)}
                  placeholder="شماره سریال، شماره پلاک، رنگ یا مشخصات فیزیکی..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{assetToEdit ? 'ذخیره تغییرات' : 'ثبت دارایی'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT ASSET GROUP */}
      {/* ========================================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {groupToEdit ? 'ویرایش گروه دارایی' : 'ایجاد گروه جدید تجهیزات'}
                  </h2>
                  <p className="text-xs text-slate-400">دسته‌بندی اموال و دارایی‌های ثابت شرکت</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام گروه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="مثلاً: وسایط نقلیه، موبایل و مخابرات، باسکول و گدام..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات گروه</label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="توضیحات کوتاه در مورد این دسته از اموال..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{groupToEdit ? 'ذخیره تغییرات' : 'ثبت گروه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
