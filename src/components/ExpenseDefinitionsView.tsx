import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ExpenseDefinition } from '../types';
import {
  Plus,
  Save,
  Edit2,
  Trash2,
  Printer,
  Search,
  Receipt,
  FolderPlus,
  ChevronUp,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { getPersianDate } from '../utils/formatters';

export const ExpenseDefinitionsView: React.FC = () => {
  const {
    expenseDefinitions,
    addExpenseDefinition,
    updateExpenseDefinition,
    deleteExpenseDefinition,
    expenseCategories,
    addExpenseCategory,
    openPrintModal,
    companySettings,
  } = useAccounting();

  // Form State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');

  // Calculate next code
  const getNextCode = () => {
    if (!expenseDefinitions || expenseDefinitions.length === 0) return '1';
    const numericCodes = expenseDefinitions
      .map(d => parseInt(d.code || d.numericCode || '0', 10))
      .filter(n => !isNaN(n) && n > 0);
    const max = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(max + 1);
  };

  // Initialize form on mount
  useEffect(() => {
    if (!selectedId && !code) {
      setCode(getNextCode());
    }
    if (!selectedCategoryId && expenseCategories.length > 0) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  }, [expenseDefinitions, expenseCategories, selectedId, code, selectedCategoryId]);

  // Handle New (جدید)
  const handleNew = () => {
    setSelectedId(null);
    setCode(getNextCode());
    setName('');
    setDescription('');
    if (expenseCategories.length > 0) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  };

  // Handle Code Increment / Decrement
  const handleCodeStep = (step: number) => {
    const current = parseInt(code || '0', 10);
    const nextVal = Math.max(1, current + step);
    setCode(String(nextVal));
  };

  // Handle Select Row for Editing
  const handleSelectRow = (item: ExpenseDefinition) => {
    setSelectedId(item.id);
    setCode(item.code || item.numericCode || '');
    setName(item.name || item.title || '');
    setSelectedCategoryId(item.categoryId || expenseCategories[0]?.id || '');
    setDescription(item.description || item.notes || '');
  };

  // Handle Save / Register (ثبت)
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('لطفاً نام هزینه را وارد نمایید.');
      return;
    }

    const cat = expenseCategories.find(c => c.id === selectedCategoryId);
    const categoryName = cat?.name || 'مصارف متفرقه';

    if (selectedId) {
      updateExpenseDefinition(selectedId, {
        code: code.trim() || getNextCode(),
        numericCode: code.trim() || getNextCode(),
        title: name.trim(),
        name: name.trim(),
        categoryId: selectedCategoryId,
        categoryName,
        description: description.trim(),
        notes: description.trim(),
      });
    } else {
      addExpenseDefinition({
        code: code.trim() || getNextCode(),
        numericCode: code.trim() || getNextCode(),
        title: name.trim(),
        name: name.trim(),
        categoryId: selectedCategoryId,
        categoryName,
        description: description.trim(),
        notes: description.trim(),
      });
    }

    handleNew();
  };

  // Handle Delete (حذف)
  const handleDelete = (id?: string) => {
    const targetId = id || selectedId;
    if (!targetId) {
      alert('لطفاً یک ردیف را برای حذف انتخاب کنید.');
      return;
    }
    const item = expenseDefinitions.find(d => d.id === targetId);
    if (!item) return;

    if (confirm(`آیا از حذف تعریف هزینه "${item.name}" با کد ${item.code} اطمینان دارید؟`)) {
      deleteExpenseDefinition(targetId);
      if (selectedId === targetId) {
        handleNew();
      }
    }
  };

  // Filtered List
  const filteredDefinitions = expenseDefinitions.filter(item => {
    const matchCategory =
      filterCategory === 'all' || item.categoryId === filterCategory;
    const matchSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.includes(searchQuery)) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  // Handle Print
  const handlePrint = () => {
    openPrintModal({
      title: 'فهرست تعاریف انواع هزینه‌ها و مصارف شرکت',
      type: 'report',
      date: getPersianDate(),
      details: {
        'شرکت': companySettings.name,
        'تاریخ تهیه': getPersianDate(),
        'تعداد کل تعاریف': `${expenseDefinitions.length} قلم`,
      },
      customContent: (
        <div className="p-4 text-xs font-sans">
          <table className="w-full border-collapse border border-slate-300 text-right">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-2 text-center w-12">ردیف</th>
                <th className="border border-slate-300 p-2 text-center w-20">کد هزینه</th>
                <th className="border border-slate-300 p-2">نام و عنوان هزینه</th>
                <th className="border border-slate-300 p-2">نوع / گروه هزینه</th>
                <th className="border border-slate-300 p-2">توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefinitions.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 p-2 text-center font-mono">{index + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold text-blue-700">{item.code || index + 1}</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900">{item.name}</td>
                  <td className="border border-slate-300 p-2 text-slate-700">{item.categoryName || item.type || '-'}</td>
                  <td className="border border-slate-300 p-2 text-slate-500">{item.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    });
  };

  // Save new category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cat = addExpenseCategory({
      name: newCategoryName.trim(),
      code: newCategoryCode.trim() || `EXP-${Date.now().toString().slice(-3)}`,
      description: 'گروه هزینه جدید',
      color: 'blue',
    });
    setSelectedCategoryId(cat.id);
    setNewCategoryName('');
    setNewCategoryCode('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 select-none" dir="rtl">
      {/* ================= 1. FORM CARD (Exact layout from IMG-20260903-WA0006.jpg) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Card Header matching screenshot title */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">تعریف هزینه ها</h2>
              <span className="text-[11px] text-slate-500">
                فرم استاندارد تعریف سر‌فصل‌ها، کدها و انواع هزینه‌های جاری شرکت
              </span>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg border border-blue-200">
            {selectedId ? `در حال ویرایش کد: ${code}` : `ثبت کد جدید: ${code}`}
          </div>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Field 1: کد (Code with up/down spinner) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                کد هزینه:
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold text-center border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  placeholder="کد"
                />
                <div className="absolute left-1 flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleCodeStep(1)}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                    title="افزایش کد"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCodeStep(-1)}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                    title="کاهش کد"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Field 2: نام هزینه (Expense Name) */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نام هزینه: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثلاً: کرایه موترها، معاشات کارمندان، تیل جنراتور، مصارف آشپزخانه..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>

            {/* Field 3: نوع هزینه (Expense Category / Group) */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  نوع هزینه:
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>دسته جدید</span>
                </button>
              </div>
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              >
                {expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              توضیحات و یادداشت:
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="توضیحات اضافی، حساب‌های معین یا موارد مربوط به این هزینه..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
            />
          </div>

          {/* ================= BUTTONS TOOLBAR (جدید، ثبت، ویرایش، حذف، چاپ) ================= */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {/* Button: جدید (New) */}
            <button
              type="button"
              onClick={handleNew}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300/80 shadow-2xs"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>جدید (F2)</span>
            </button>

            {/* Button: ثبت (Save) */}
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{selectedId ? 'بروزرسانی تغییرات' : 'ثبت هزینه'}</span>
            </button>

            {/* Button: ویرایش (Edit selected) */}
            {selectedId && (
              <button
                type="button"
                onClick={handleNew}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition cursor-pointer border border-amber-300/80"
              >
                <X className="w-4 h-4 text-amber-600" />
                <span>لغو ویرایش</span>
              </button>
            )}

            {/* Button: حذف (Delete) */}
            <button
              type="button"
              disabled={!selectedId}
              onClick={() => handleDelete()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition border ${
                selectedId
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف</span>
            </button>

            {/* Button: چاپ (Print) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300/80 mr-auto"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>چاپ فهرست</span>
            </button>
          </div>
        </form>
      </div>

      {/* ================= 2. SEARCH & FILTER BAR ================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در نام، کد یا توضیحات هزینه..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-500 font-bold whitespace-nowrap">
            فیلتر نوع هزینه:
          </label>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none font-medium"
          >
            <option value="all">همه انواع هزینه‌ها</option>
            {expenseCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= 3. TABLE OF EXPENSE DEFINITIONS ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-slate-700 font-black border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 text-center w-14">رديف</th>
                <th className="py-3 px-3 text-center w-20">کد</th>
                <th className="py-3 px-4">نام هزینه</th>
                <th className="py-3 px-4">نوع هزینه</th>
                <th className="py-3 px-4">توضیحات</th>
                <th className="py-3 px-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefinitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    هیچ تعریف هزینه‌ای مطابق با جستجو یا فیلتر یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredDefinitions.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleSelectRow(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 font-bold text-blue-900'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-[#FAFCFF] hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                        {item.code || index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                          {item.categoryName || item.type || 'مصارف متفرقه'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                        {item.description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectRow(item)}
                            className="p-1 rounded-md text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                            title="ویرایش"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar: Row Count Footer matching typical Afghan accounting grid */}
        <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-bold">
          <div>
            <span>تعداد ردیف: </span>
            <span className="font-mono text-blue-700 font-black">{filteredDefinitions.length}</span>
            <span className="text-slate-400 font-normal mr-2">از مجموع {expenseDefinitions.length} رکورد</span>
          </div>

          <div className="text-[11px] text-slate-400">
            برای ویرایش یا تغییر، روی ردیف مربوطه در جدول کلیک نمایید.
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD EXPENSE CATEGORY ================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                <h3 className="font-black text-sm">افزودن دسته‌بندی جدید هزینه‌ها</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  نام دسته‌بندی جدید: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: هزینه‌های صادرات و ترخیص گمرکی"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کد دسته‌بندی (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="EXP-13"
                  value={newCategoryCode}
                  onChange={e => setNewCategoryCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  ثبت دسته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
