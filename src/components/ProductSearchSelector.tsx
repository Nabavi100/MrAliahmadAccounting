import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product, Currency, InvoiceType } from '../types';
import { useAccounting } from '../context/AccountingContext';
import { formatNumber } from '../utils/formatters';
import { Search, Package, Check, X, Boxes, Warehouse, Sparkles } from 'lucide-react';

export interface ProductSearchSelectorProps {
  products?: Product[];
  selectedProductId?: string;
  onSelectProduct: (product: Product) => void;
  onClear?: () => void;
  onAdvanceFocus?: () => void;
  warehouseId?: string;
  currency?: Currency;
  priceType?: 'sell' | 'buy' | InvoiceType;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
}

// Text normalization helper for seamless Persian/Arabic/English search
const normalizeText = (text: string = ''): string => {
  return text
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic accents
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728)) // Persian digits to English
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1584)) // Arabic digits to English
    .toLowerCase()
    .trim();
};

export const ProductSearchSelector: React.FC<ProductSearchSelectorProps> = ({
  products: propsProducts,
  selectedProductId,
  onSelectProduct,
  onClear,
  onAdvanceFocus,
  warehouseId,
  currency = 'AFN',
  priceType = 'sell',
  placeholder = 'تایپ نام، کد یا بارکد کالا...',
  disabled = false,
  compact = false,
  required = false,
  autoFocus = false,
  id,
  className = '',
}) => {
  const { products: contextProducts, getProductStock, warehouses } = useAccounting();
  const products = propsProducts && propsProducts.length > 0 ? propsProducts : contextProducts || [];

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(selectedProduct?.name || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 320,
    placeAbove: false,
  });

  // Keep input text in sync when selected product prop changes
  useEffect(() => {
    if (selectedProduct) {
      setInputValue(selectedProduct.name);
    } else {
      setInputValue('');
    }
  }, [selectedProductId, selectedProduct]);

  // Update floating dropdown coordinates
  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setCoords({
      top: placeAbove ? rect.top : rect.bottom,
      left: rect.left,
      width: Math.max(rect.width, 360),
      placeAbove,
    });
  };

  // Re-calculate position on open, scroll, resize
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScrollOrResize = () => updateCoords();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        // Revert input text to selected product name if any
        if (selectedProduct) {
          setInputValue(selectedProduct.name);
        } else {
          setInputValue('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, selectedProduct]);

  // Filter and score products by query
  const filteredProducts = useMemo(() => {
    const rawQuery = inputValue.trim();
    if (!rawQuery) {
      return products.slice(0, 40);
    }

    const normQuery = normalizeText(rawQuery);

    const scored = products
      .map(p => {
        const normName = normalizeText(p.name);
        const normCode = normalizeText(p.code || '');
        const normNumCode = String(p.numericCode || '');
        const normCat = normalizeText(p.category || '');
        const normBarcode = normalizeText((p as any).barcode || '');

        let score = 0;

        // Exact code/barcode match (critical for barcode scanner)
        if (normCode === normQuery || normBarcode === normQuery || normNumCode === normQuery) {
          score = 100;
        } else if (normName === normQuery) {
          score = 90;
        } else if (normName.startsWith(normQuery)) {
          score = 80;
        } else if (normCode.startsWith(normQuery) || normNumCode.startsWith(normQuery)) {
          score = 75;
        } else if (normName.includes(normQuery)) {
          score = 60;
        } else if (normCat.includes(normQuery)) {
          score = 40;
        } else if (normCode.includes(normQuery)) {
          score = 30;
        }

        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);

    return scored;
  }, [products, inputValue]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  // Ensure highlighted element is visible in scroll container
  useEffect(() => {
    if (!isOpen || !itemsContainerRef.current) return;
    const items = itemsContainerRef.current.children;
    if (items[highlightedIndex]) {
      (items[highlightedIndex] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product: Product) => {
    setInputValue(product.name);
    setIsOpen(false);
    onSelectProduct(product);
    if (onAdvanceFocus) {
      setTimeout(() => onAdvanceFocus(), 30);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInputValue('');
    if (onClear) {
      onClear();
    }
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!isOpen) {
      setIsOpen(true);
    }
    updateCoords();
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    updateCoords();
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        updateCoords();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < filteredProducts.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Tab') {
      // If user presses Tab while dropdown is open with matches, select highlighted product and advance
      if (filteredProducts[highlightedIndex] && inputValue.trim()) {
        handleSelect(filteredProducts[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      if (selectedProduct) {
        setInputValue(selectedProduct.name);
      }
    }
  };

  const selectedWarehouse = warehouses?.find(w => w.id === warehouseId);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Inline Direct Autocomplete Input */}
      <div
        className={`w-full flex items-center gap-1.5 transition rounded-xl border bg-white ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm font-bold'
        } ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : selectedProduct
            ? 'border-emerald-300/80 bg-emerald-50/20'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
      >
        <Search
          className={`shrink-0 transition-colors ${
            isOpen ? 'text-emerald-600' : 'text-slate-400'
          } ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
        />

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none truncate"
        />

        {/* Selected Product Code Tag (if available) */}
        {selectedProduct?.code && !isOpen && (
          <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded border border-slate-200">
            {selectedProduct.code}
          </span>
        )}

        {/* Clear Action Button */}
        {(inputValue || selectedProduct) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            title="پاک کردن انتخاب کالا (Escape)"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Dropdown using React Portal */}
      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top + 4}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top + 4}px` : 'auto',
              left: `${Math.max(8, Math.min(coords.left, window.innerWidth - coords.width - 12))}px`,
              width: `${Math.min(coords.width, window.innerWidth - 24)}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[380px]"
            dir="rtl"
          >
            {/* Quick Status Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {filteredProducts.length} کالا
                  {inputValue.trim() && ` منطبق با «${inputValue}»`}
                </span>
              </span>

              {selectedWarehouse && (
                <span className="flex items-center gap-1 text-slate-600 truncate max-w-[170px]">
                  <Warehouse className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedWarehouse.name}</span>
                </span>
              )}
            </div>

            {/* Products List */}
            <div ref={itemsContainerRef} className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1.5">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">کالایی با این مشخصات یا کد یافت نشد!</p>
                  <p className="text-[11px] text-slate-400">نام، کد یا بارکد کالا را دوباره بررسی نمایید.</p>
                </div>
              ) : (
                filteredProducts.map((p, index) => {
                  const isSelected = p.id === selectedProductId;
                  const isHighlighted = index === highlightedIndex;
                  const stock = getProductStock(p.id, warehouseId);
                  const isOutOfStock = stock.tons <= 0 && stock.bags <= 0;
                  const isSellType = priceType === 'sell' || priceType === 'return_sell';
                  const price = isSellType
                    ? currency === 'AFN'
                      ? p.sellPriceAFN || p.priceAFN || 0
                      : p.sellPriceUSD || p.priceUSD || 0
                    : currency === 'AFN'
                    ? p.buyPriceAFN || 0
                    : p.buyPriceUSD || 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-300'
                          : isHighlighted
                          ? 'bg-slate-100/90'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.code && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded font-bold border border-slate-200">
                                {p.code}
                              </span>
                            )}
                            {p.category && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded font-bold border border-emerald-200">
                                {p.category}
                              </span>
                            )}
                          </div>

                          {/* Secondary info: Stock & Approximate Price */}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                            <span
                              className={`font-mono font-bold flex items-center gap-1 ${
                                isOutOfStock ? 'text-rose-600' : 'text-slate-600'
                              }`}
                            >
                              <Boxes className="w-3 h-3 text-slate-400" />
                              <span>موجودی:</span>
                              <span>
                                {formatNumber(stock.tons)} تن ({formatNumber(stock.bags)} کیسه)
                              </span>
                            </span>

                            {price > 0 && (
                              <span className="text-slate-500 border-r border-slate-200 pr-2 font-mono font-bold">
                                {isSellType ? 'نرخ فروش:' : 'نرخ خرید:'}{' '}
                                <span className="text-emerald-700">{formatNumber(price)}</span>{' '}
                                {currency === 'AFN' ? '؋' : '$'}
                              </span>
                            )}

                            {isOutOfStock && (
                              <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                                اتمام موجودی
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Navigation Hint Bar */}
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>↑ و ↓: پیمایش اقلام • Enter: انتخاب سریع • Tab: تایید و ورود به تعداد</span>
              <span>Esc: بستن</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
