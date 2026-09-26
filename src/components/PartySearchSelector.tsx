import React, { useState, useRef, useEffect } from 'react';
import { Party, Currency } from '../types';
import { useAccounting } from '../context/AccountingContext';
import { formatCurrency } from '../utils/formatters';
import { Search, UserPlus, ChevronDown, Check, User, Building, Phone, X } from 'lucide-react';

interface PartySearchSelectorProps {
  parties?: Party[];
  selectedPartyId?: string;
  onSelect?: (partyId: string, party?: Party) => void;
  onSelectParty?: (partyOrId: any) => void;
  onSelectPartyId?: (partyId: string) => void;
  onAddNewParty?: () => void;
  label?: string;
  placeholder?: string;
  roleType?: 'customer' | 'supplier' | 'all';
  partyType?: 'customer' | 'supplier' | 'all';
  partyTypeFilter?: 'customer' | 'supplier' | 'all';
  activeCurrency?: Currency;
  required?: boolean;
}

export const PartySearchSelector: React.FC<PartySearchSelectorProps> = ({
  parties: propsParties,
  selectedPartyId,
  onSelect,
  onSelectParty,
  onSelectPartyId,
  onAddNewParty,
  label,
  placeholder = 'جستجو و انتخاب طرف حساب (نام، شرکت یا شماره تماس)...',
  roleType,
  partyType,
  partyTypeFilter,
  activeCurrency = 'AFN',
  required = true,
}) => {
  const { parties: contextParties } = useAccounting();
  const parties = propsParties && propsParties.length > 0 ? propsParties : (contextParties || []);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveRoleType = roleType || partyType || partyTypeFilter || 'all';
  const selectedParty = parties.find(p => p.id === selectedPartyId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter parties by search term and role
  const filteredParties = parties.filter(party => {
    if (effectiveRoleType === 'customer' && party.type === 'supplier') return false;
    if (effectiveRoleType === 'supplier' && party.type === 'customer') return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      party.name.toLowerCase().includes(term) ||
      (party.company && party.company.toLowerCase().includes(term)) ||
      (party.phone && party.phone.includes(term)) ||
      (party.groupName && party.groupName.toLowerCase().includes(term)) ||
      (party.address && party.address.toLowerCase().includes(term))
    );
  });

  const handleSelectPartyItem = (party: Party) => {
    if (onSelect) {
      onSelect(party.id, party);
    }
    if (onSelectPartyId) {
      onSelectPartyId(party.id);
    }
    if (onSelectParty) {
      const hybrid: any = Object.assign(String(party.id), party, {
        id: party.id,
        name: party.name,
        toString: () => party.id,
        valueOf: () => party.id,
      });
      onSelectParty(hybrid);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full text-xs" ref={wrapperRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {onAddNewParty && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onAddNewParty();
              }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ ثبت مشتری جدید</span>
            </button>
          )}
        </div>
      )}

      {/* Selected Box / Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-2 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition select-none ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selectedParty ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 truncate">{selectedParty.name}</span>
                  {selectedParty.company && (
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                      ({selectedParty.company})
                    </span>
                  )}
                  {selectedParty.groupName && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-medium">
                      {selectedParty.groupName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-left font-mono">
                <span
                  className={`text-[11px] font-bold ${
                    selectedParty.balanceAFN < 0
                      ? 'text-rose-600'
                      : selectedParty.balanceAFN > 0
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {formatCurrency(selectedParty.balanceAFN, 'AFN')}
                </span>
                {selectedParty.balanceUSD !== 0 && (
                  <span
                    className={`block text-[10px] font-bold ${
                      selectedParty.balanceUSD < 0 ? 'text-rose-600' : 'text-blue-600'
                    }`}
                  >
                    {formatCurrency(selectedParty.balanceUSD, 'USD')}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-400">
            <span>{placeholder}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>

      {/* Search Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="جستجوی سریع نام، شرکت، شماره تماس..."
                className="w-full pl-7 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-blue-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onAddNewParty && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewParty();
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 text-[11px] shrink-0 transition shadow-2xs cursor-pointer"
                title="ثبت مشتری یا طرف حساب جدید"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ ثبت جدید</span>
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-100">
            {filteredParties.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <p>مشتری یا طرف حسابی با عبارت «{searchTerm}» یافت نشد.</p>
                {onAddNewParty && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewParty();
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>ثبت این طرف حساب به عنوان مشتری جدید</span>
                  </button>
                )}
              </div>
            ) : (
              filteredParties.map(party => {
                const isSelected = party.id === selectedPartyId;
                return (
                  <div
                    key={party.id}
                    onClick={() => handleSelectPartyItem(party)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : party.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 font-bold truncate">{party.name}</span>
                          {party.company && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                              {party.company}
                            </span>
                          )}
                          {party.groupName && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-normal">
                              {party.groupName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          {party.phone && party.phone !== '---' && (
                            <span className="font-mono">{party.phone}</span>
                          )}
                          {party.address && <span className="truncate max-w-[160px]">{party.address}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono shrink-0 pl-1">
                      <div
                        className={`text-xs font-bold ${
                          party.balanceAFN < 0
                            ? 'text-rose-600'
                            : party.balanceAFN > 0
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(party.balanceAFN, 'AFN')}
                      </div>
                      {party.balanceUSD !== 0 && (
                        <div
                          className={`text-[10px] font-bold ${
                            party.balanceUSD < 0 ? 'text-rose-600' : 'text-blue-600'
                          }`}
                        >
                          {formatCurrency(party.balanceUSD, 'USD')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer quick counter */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>تعداد کل طرف حساب‌ها: {parties.length} نفر</span>
            {selectedParty && <span>انتخاب شده: {selectedParty.name}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
