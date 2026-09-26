import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, FinancialTransaction } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Printer,
  Trash2,
  Wallet,
  AlertCircle,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  Building,
  Coins,
  Repeat,
  Edit3,
  X,
  Search,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';

interface CashToCashTransferViewProps {
  onBackToList?: () => void;
}

type MainTab = 'transfer' | 'exchange' | 'history';

export const CashToCashTransferView: React.FC<CashToCashTransferViewProps> = ({
  onBackToList,
}) => {
  const {
    cashRegister,
    cashAccounts,
    parties,
    transactions,
    createTransaction,
    updateTransaction,
    getNextTransactionNumber,
    deleteTransaction,
    openPrintModal,
  } = useAccounting();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<MainTab>('transfer');

  // Editing state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // TAB 1: CASH-TO-CASH TRANSFER STATE
  const [transferFromReg, setTransferFromReg] = useState<string>('afn_cash');
  const [transferToReg, setTransferToReg] = useState<string>('usd_cash');
  const [transferAmountInput, setTransferAmountInput] = useState<string>('');
  const [transferCrossRateInput, setTransferCrossRateInput] = useState<string>(() =>
    (cashRegister.usdToAfnRate || 68.5).toString()
  );
  const [transferDate, setTransferDate] = useState<string>(getPersianDate());
  const [transferTrackingNumber, setTransferTrackingNumber] = useState<string>(
    `TRF-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [transferDescription, setTransferDescription] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // TAB 2: CURRENCY EXCHANGE STATE
  // Direction: 'afn_to_usd' (Buy USD) or 'usd_to_afn' (Sell USD)
  const [exchangeDirection, setExchangeDirection] = useState<'afn_to_usd' | 'usd_to_afn'>('afn_to_usd');
  const [exchangeFromReg, setExchangeFromReg] = useState<string>('afn_cash');
  const [exchangeToReg, setExchangeToReg] = useState<string>('usd_cash');
  const [exchangeAmountInput, setExchangeAmountInput] = useState<string>('');
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(() =>
    (cashRegister.usdToAfnRate || 68.5).toString()
  );
  const [exchangeTargetAmountInput, setExchangeTargetAmountInput] = useState<string>('');
  const [selectedSarafiPartyId, setSelectedSarafiPartyId] = useState<string>('');
  const [sarafiSearchQuery, setSarafiSearchQuery] = useState<string>('');
  const [showSarafiSelector, setShowSarafiSelector] = useState<boolean>(false);
  const [exchangeDate, setExchangeDate] = useState<string>(getPersianDate());
  const [exchangeTrackingNumber, setExchangeTrackingNumber] = useState<string>(
    `EXC-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [exchangeDescription, setExchangeDescription] = useState<string>('');
  const [exchangeNotes, setExchangeNotes] = useState<string>('');

  // Notifications
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // History search and filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'transfer' | 'exchange' | 'sarafi'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Combined accounts list (from cashAccounts + defaults)
  const allRegisters = useMemo(() => {
    const list = [...cashAccounts];
    if (!list.some(a => a.id === 'afn_cash')) {
      list.push({
        id: 'afn_cash',
        name: 'صندوق اصلی افغانی',
        currency: 'AFN',
        balance: cashRegister.afnBalance || 0,
        initialBalance: 0,
        notes: 'صندوق نقدی افغانی شرکت',
        createdAt: '',
      });
    }
    if (!list.some(a => a.id === 'usd_cash')) {
      list.push({
        id: 'usd_cash',
        name: 'صندوق اصلی دلاری',
        currency: 'USD',
        balance: cashRegister.usdBalance || 0,
        initialBalance: 0,
        notes: 'صندوق نقدی دلاری شرکت',
        createdAt: '',
      });
    }
    if (!list.some(a => a.id === 'exchange_usd_cash')) {
      list.push({
        id: 'exchange_usd_cash',
        name: 'صندوق ارزی صرافی (دلار)',
        currency: 'USD',
        balance: cashRegister.exchangeUsdBalance || 0,
        initialBalance: 0,
        notes: 'صندوق تبادلات صرافی',
        createdAt: '',
      });
    }
    return list;
  }, [cashAccounts, cashRegister]);

  const getRegisterObj = (regId?: string) => {
    const found = allRegisters.find(r => r.id === regId);
    if (found) return found;
    return {
      id: regId || '',
      name: regId === 'afn_cash' ? 'صندوق اصلی افغانی' : regId === 'usd_cash' ? 'صندوق اصلی دلاری' : regId || 'صندوق نقدی',
      currency: (regId === 'afn_cash' ? 'AFN' : 'USD') as Currency,
      balance: regId === 'afn_cash' ? cashRegister.afnBalance || 0 : cashRegister.usdBalance || 0,
      initialBalance: 0,
      notes: '',
      createdAt: '',
    };
  };

  const getRegisterLabel = (regId?: string) => {
    return getRegisterObj(regId).name;
  };

  // Sync exchange rate on direction change or initial rate
  useEffect(() => {
    if (cashRegister.usdToAfnRate && !editingTxId) {
      setTransferCrossRateInput(cashRegister.usdToAfnRate.toString());
      setExchangeRateInput(cashRegister.usdToAfnRate.toString());
    }
  }, [cashRegister.usdToAfnRate, editingTxId]);

  // Adjust defaults when exchange direction toggles
  const handleExchangeDirectionChange = (dir: 'afn_to_usd' | 'usd_to_afn') => {
    setExchangeDirection(dir);
    setFormError('');
    if (dir === 'afn_to_usd') {
      setExchangeFromReg('afn_cash');
      setExchangeToReg('usd_cash');
    } else {
      setExchangeFromReg('usd_cash');
      setExchangeToReg('afn_cash');
    }
    // Recompute target amount with current source
    const numAmt = parseFloat(exchangeAmountInput.replace(/,/g, ''));
    const rate = parseFloat(exchangeRateInput) || cashRegister.usdToAfnRate || 68.5;
    if (!isNaN(numAmt) && numAmt > 0 && rate > 0) {
      if (dir === 'afn_to_usd') {
        setExchangeTargetAmountInput((numAmt / rate).toFixed(2));
      } else {
        setExchangeTargetAmountInput((numAmt * rate).toFixed(2));
      }
    } else {
      setExchangeTargetAmountInput('');
    }
  };

  // Exchange amount change handler
  const handleExchangeAmountChange = (val: string) => {
    setExchangeAmountInput(val);
    const num = parseFloat(val.replace(/,/g, ''));
    const rate = parseFloat(exchangeRateInput) || cashRegister.usdToAfnRate || 68.5;
    if (isNaN(num) || num <= 0 || rate <= 0) {
      setExchangeTargetAmountInput('');
      return;
    }
    if (exchangeDirection === 'afn_to_usd') {
      setExchangeTargetAmountInput((num / rate).toFixed(2));
    } else {
      setExchangeTargetAmountInput((num * rate).toFixed(2));
    }
  };

  // Exchange rate change handler
  const handleExchangeRateChange = (rateStr: string) => {
    setExchangeRateInput(rateStr);
    const rate = parseFloat(rateStr) || 0;
    const num = parseFloat(exchangeAmountInput.replace(/,/g, ''));
    if (isNaN(num) || num <= 0 || rate <= 0) {
      setExchangeTargetAmountInput('');
      return;
    }
    if (exchangeDirection === 'afn_to_usd') {
      setExchangeTargetAmountInput((num / rate).toFixed(2));
    } else {
      setExchangeTargetAmountInput((num * rate).toFixed(2));
    }
  };

  // Exchange target amount change handler
  const handleExchangeTargetAmountChange = (targetStr: string) => {
    setExchangeTargetAmountInput(targetStr);
    const targetNum = parseFloat(targetStr.replace(/,/g, ''));
    const num = parseFloat(exchangeAmountInput.replace(/,/g, ''));
    if (!isNaN(num) && num > 0 && !isNaN(targetNum) && targetNum > 0) {
      if (exchangeDirection === 'afn_to_usd') {
        setExchangeRateInput((num / targetNum).toFixed(2));
      } else {
        setExchangeRateInput((targetNum / num).toFixed(2));
      }
    }
  };

  // Swap registers for Tab 1 (Transfer)
  const handleSwapTransferRegisters = () => {
    const prevFrom = transferFromReg;
    const prevTo = transferToReg;
    setTransferFromReg(prevTo);
    setTransferToReg(prevFrom);
  };

  // Sarraf Parties list
  const sarrafParties = useMemo(() => {
    return parties.filter(
      p =>
        p.name.includes('صراف') ||
        p.name.includes('صرافی') ||
        p.groupName === 'صرافان' ||
        p.groupName?.includes('صراف')
    );
  }, [parties]);

  const filteredSarrafParties = useMemo(() => {
    if (!sarafiSearchQuery.trim()) {
      return [...sarrafParties, ...parties.filter(p => !sarrafParties.some(s => s.id === p.id))];
    }
    const q = sarafiSearchQuery.toLowerCase();
    return parties.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }, [parties, sarrafParties, sarafiSearchQuery]);

  const selectedSarafiParty = parties.find(p => p.id === selectedSarafiPartyId);

  // Tab 1 (Transfer) objects
  const transferSourceAcc = getRegisterObj(transferFromReg);
  const transferTargetAcc = getRegisterObj(transferToReg);
  const isTransferCrossCurrency = transferSourceAcc.currency !== transferTargetAcc.currency;

  const transferNumAmount = parseFloat(transferAmountInput.replace(/,/g, '')) || 0;
  const transferCrossRate = parseFloat(transferCrossRateInput) || cashRegister.usdToAfnRate || 68.5;

  const transferTargetCalculatedAmount = useMemo(() => {
    if (!isTransferCrossCurrency) return transferNumAmount;
    if (transferSourceAcc.currency === 'AFN' && transferTargetAcc.currency === 'USD') {
      return transferCrossRate > 0 ? Number((transferNumAmount / transferCrossRate).toFixed(2)) : 0;
    }
    if (transferSourceAcc.currency === 'USD' && transferTargetAcc.currency === 'AFN') {
      return Number((transferNumAmount * transferCrossRate).toFixed(2));
    }
    return transferNumAmount;
  }, [isTransferCrossCurrency, transferNumAmount, transferCrossRate, transferSourceAcc.currency, transferTargetAcc.currency]);

  // Tab 2 (Exchange) objects
  const exchangeSourceAcc = getRegisterObj(exchangeFromReg);
  const exchangeTargetAcc = getRegisterObj(exchangeToReg);
  const exchangeNumAmount = parseFloat(exchangeAmountInput.replace(/,/g, '')) || 0;
  const exchangeNumTarget = parseFloat(exchangeTargetAmountInput.replace(/,/g, '')) || 0;
  const exchangeNumRate = parseFloat(exchangeRateInput) || cashRegister.usdToAfnRate || 68.5;

  // Print voucher helper
  const handlePrintVoucher = (tx: FinancialTransaction) => {
    const isEx = tx.isExchange || tx.type === 'currency_exchange';
    openPrintModal({
      documentType: 'cash_transfer_voucher',
      transaction: tx,
      title: isEx ? 'حواله و سند تبادله اسعار و اکسچنج صرافی' : 'حواله رسمی انتقال وجه بین‌صندوقی',
      subtitle: `خزانه‌داری و صرافی • شماره پیگیری: ${tx.trackingNumber || tx.transactionNumber || tx.id.slice(-6)}`,
      metadata: [
        { label: 'شماره سند', value: tx.trackingNumber || tx.transactionNumber || tx.id.slice(-6) },
        { label: 'تاریخ صدور', value: tx.date },
        { label: 'صندوق مبدأ (برداشت)', value: getRegisterLabel(tx.fromCashRegister) },
        { label: 'صندوق مقصد (واریز)', value: getRegisterLabel(tx.toCashRegister) },
        { label: 'مبلغ پرداختی', value: `${formatNumber(tx.amount)} ${tx.currency}` },
        ...(tx.targetAmount && tx.targetCurrency
          ? [{ label: 'مبلغ دریافتی', value: `${formatNumber(tx.targetAmount)} ${tx.targetCurrency}` }]
          : []),
        ...(tx.partyName ? [{ label: 'صرافی / طرف‌حساب', value: tx.partyName }] : []),
        ...(tx.exchangeRate ? [{ label: 'نرخ تسعیر', value: formatNumber(tx.exchangeRate) }] : []),
      ],
      customContent: (
        <div className="space-y-4 text-xs text-slate-800 printable-content">
          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 block">صندوق مبدأ (فرستنده):</span>
              <span className="font-bold text-slate-900">{getRegisterLabel(tx.fromCashRegister)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">صندوق مقصد (گیرنده):</span>
              <span className="font-bold text-slate-900">{getRegisterLabel(tx.toCashRegister)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">مبلغ پرداختی:</span>
              <span className="font-bold text-rose-700 text-sm font-mono">
                {formatNumber(tx.amount)} {tx.currency}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">مبلغ دریافتی:</span>
              <span className="font-bold text-emerald-700 text-sm font-mono">
                {tx.targetAmount && tx.targetCurrency
                  ? `${formatNumber(tx.targetAmount)} ${tx.targetCurrency}`
                  : `${formatNumber(tx.amount)} ${tx.currency}`}
              </span>
            </div>
          </div>

          {(tx.exchangeRate || tx.partyName) && (
            <div className="border border-slate-200 rounded-xl p-3 bg-white grid grid-cols-3 gap-2">
              {tx.exchangeRate && (
                <div>
                  <span className="text-[10px] text-slate-400 block">نرخ تبدیل ارز:</span>
                  <span className="font-bold font-mono text-indigo-900 text-xs">
                    {formatNumber(tx.exchangeRate)}
                  </span>
                </div>
              )}
              {tx.partyName && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">صرافی طرف حساب:</span>
                  <span className="font-bold text-slate-800 text-xs">{tx.partyName}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <span className="text-[10px] text-slate-500 block mb-1">بابت و شرح عملیات:</span>
            <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed">
              {tx.description}
            </p>
          </div>

          {tx.notes && (
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">توضیحات تکمیلی و حواله:</span>
              <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950">
                {tx.notes}
              </p>
            </div>
          )}

          <div className="pt-8 grid grid-cols-3 text-center text-[11px] font-bold text-slate-700 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block mb-6 text-[10px]">تحویل‌دهنده وجه</span>
              <div className="border-t border-dashed border-slate-400 pt-1">
                مسئول {getRegisterLabel(tx.fromCashRegister)}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-6 text-[10px]">تحویل‌گیرنده / صراف</span>
              <div className="border-t border-dashed border-slate-400 pt-1">
                {tx.partyName || `مسئول ${getRegisterLabel(tx.toCashRegister)}`}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-6 text-[10px]">تأیید مدیریت مالی</span>
              <div className="border-t border-dashed border-slate-400 pt-1">مهر و امضاء خزانه</div>
            </div>
          </div>
        </div>
      ),
    });
  };

  // Submit Handler for Tab 1: Cash-to-Cash Transfer
  const handleTransferSubmit = (andPrint = false) => {
    setFormError('');
    setFormSuccess('');

    if (transferFromReg === transferToReg) {
      setFormError('صندوق مبدأ و صندوق مقصد نمی‌توانند یکسان باشند.');
      return;
    }

    if (isNaN(transferNumAmount) || transferNumAmount <= 0) {
      setFormError('لطفاً مبلغ انتقال معتبر و بزرگتر از صفر وارد نمایید.');
      return;
    }

    if (!editingTxId && transferNumAmount > transferSourceAcc.balance) {
      setFormError(
        `موجودی ${transferSourceAcc.name} (${formatCurrency(transferSourceAcc.balance, transferSourceAcc.currency)}) برای انتقال ${formatCurrency(transferNumAmount, transferSourceAcc.currency)} کافی نیست!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedDesc =
        transferDescription.trim() ||
        (isTransferCrossCurrency
          ? `انتقال ارزی از ${transferSourceAcc.name} به ${transferTargetAcc.name} (${formatNumber(transferNumAmount)} ${transferSourceAcc.currency} به نرخ ${transferCrossRate})`
          : `انتقال وجه نقد از ${transferSourceAcc.name} به ${transferTargetAcc.name}`);

      const txPayload: any = {
        transactionNumber: transferTrackingNumber || getNextTransactionNumber(isTransferCrossCurrency ? 'currency_exchange' : 'cash_transfer'),
        type: isTransferCrossCurrency ? 'currency_exchange' : 'cash_transfer',
        amount: transferNumAmount,
        currency: transferSourceAcc.currency,
        fromCashRegister: transferFromReg,
        toCashRegister: transferToReg,
        cashRegister: transferFromReg,
        isExchange: isTransferCrossCurrency,
        exchangeRate: isTransferCrossCurrency ? transferCrossRate : undefined,
        targetAmount: isTransferCrossCurrency ? transferTargetCalculatedAmount : undefined,
        targetCurrency: isTransferCrossCurrency ? transferTargetAcc.currency : undefined,
        date: transferDate || getPersianDate(),
        description: generatedDesc,
        notes: transferNotes.trim() || undefined,
        trackingNumber: transferTrackingNumber,
      };

      let savedTx: FinancialTransaction | undefined;

      if (editingTxId) {
        const updated = {
          ...txPayload,
          id: editingTxId,
          createdAt: '',
        } as FinancialTransaction;
        updateTransaction(updated);
        savedTx = updated;
        setFormSuccess('سند انتقال با موفقیت ویرایش و اعمال شد.');
        setEditingTxId(null);
      } else {
        savedTx = createTransaction(txPayload);
        setFormSuccess('انتقال وجه بین صندوق‌ها با موفقیت ثبت شد.');
      }

      if (andPrint && savedTx) {
        handlePrintVoucher(savedTx);
      }

      setTransferAmountInput('');
      setTransferDescription('');
      setTransferNotes('');
      setTransferTrackingNumber(`TRF-${Math.floor(10000 + Math.random() * 90000)}`);
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      setFormError(err?.message || 'خطا در ثبت انتقال صندوق به صندوق');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler for Tab 2: Currency Exchange (Sarafi)
  const handleExchangeSubmit = (andPrint = false) => {
    setFormError('');
    setFormSuccess('');

    if (exchangeFromReg === exchangeToReg) {
      setFormError('صندوق پرداخت و صندوق دریافت ارز نمی‌توانند یکسان باشند.');
      return;
    }

    if (isNaN(exchangeNumAmount) || exchangeNumAmount <= 0) {
      setFormError('لطفاً مبلغ پرداختی جهت تبادله را وارد نمایید.');
      return;
    }

    if (isNaN(exchangeNumTarget) || exchangeNumTarget <= 0) {
      setFormError('لطفاً مبلغ ارز دریافتی یا نرخ تسعیر را مشخص نمایید.');
      return;
    }

    if (!editingTxId && exchangeNumAmount > exchangeSourceAcc.balance) {
      setFormError(
        `موجودی ${exchangeSourceAcc.name} (${formatCurrency(exchangeSourceAcc.balance, exchangeSourceAcc.currency)}) برای پرداخت ${formatCurrency(exchangeNumAmount, exchangeSourceAcc.currency)} کافی نیست!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const sarafiParty = parties.find(p => p.id === selectedSarafiPartyId);
      const generatedDesc =
        exchangeDescription.trim() ||
        (exchangeDirection === 'afn_to_usd'
          ? `تبدیل ${formatNumber(exchangeNumAmount)} افغانی به ${formatNumber(exchangeNumTarget)} دالر با نرخ ${exchangeNumRate}${sarafiParty ? ` (صرافی ${sarafiParty.name})` : ''}`
          : `فروش ${formatNumber(exchangeNumAmount)} دالر به ارزش ${formatNumber(exchangeNumTarget)} افغانی با نرخ ${exchangeNumRate}${sarafiParty ? ` (صرافی ${sarafiParty.name})` : ''}`);

      const txPayload: any = {
        transactionNumber: exchangeTrackingNumber || getNextTransactionNumber('currency_exchange'),
        type: 'currency_exchange',
        amount: exchangeNumAmount,
        currency: exchangeSourceAcc.currency,
        fromCashRegister: exchangeFromReg,
        toCashRegister: exchangeToReg,
        cashRegister: exchangeFromReg,
        isExchange: true,
        exchangeRate: exchangeNumRate,
        targetAmount: exchangeNumTarget,
        targetCurrency: exchangeTargetAcc.currency,
        partyId: selectedSarafiPartyId || undefined,
        partyName: sarafiParty?.name || undefined,
        date: exchangeDate || getPersianDate(),
        description: generatedDesc,
        notes: exchangeNotes.trim() || undefined,
        trackingNumber: exchangeTrackingNumber,
      };

      let savedTx: FinancialTransaction | undefined;

      if (editingTxId) {
        const updated = {
          ...txPayload,
          id: editingTxId,
          createdAt: '',
        } as FinancialTransaction;
        updateTransaction(updated);
        savedTx = updated;
        setFormSuccess('سند اکسچنج با موفقیت ویرایش و موجودی‌ها به‌روزرسانی شد.');
        setEditingTxId(null);
      } else {
        savedTx = createTransaction(txPayload);
        setFormSuccess('سند تبدیل اسعار و اکسچنج با موفقیت ثبت شد.');
      }

      if (andPrint && savedTx) {
        handlePrintVoucher(savedTx);
      }

      setExchangeAmountInput('');
      setExchangeTargetAmountInput('');
      setExchangeDescription('');
      setExchangeNotes('');
      setSelectedSarafiPartyId('');
      setExchangeTrackingNumber(`EXC-${Math.floor(10000 + Math.random() * 90000)}`);
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      setFormError(err?.message || 'خطا در ثبت تبادله اسعار');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit an existing transaction
  const handleStartEdit = (tx: FinancialTransaction) => {
    setEditingTxId(tx.id);
    setFormError('');
    setFormSuccess('');

    const isEx = tx.isExchange || tx.type === 'currency_exchange';

    if (isEx) {
      setActiveTab('exchange');
      setExchangeTrackingNumber(tx.trackingNumber || tx.transactionNumber || `EXC-${tx.id.slice(-5)}`);
      setExchangeDate(tx.date || getPersianDate());
      setExchangeAmountInput(tx.amount.toString());
      if (tx.fromCashRegister) setExchangeFromReg(tx.fromCashRegister);
      if (tx.toCashRegister) setExchangeToReg(tx.toCashRegister);
      if (tx.targetAmount) setExchangeTargetAmountInput(tx.targetAmount.toString());
      if (tx.exchangeRate) setExchangeRateInput(tx.exchangeRate.toString());
      if (tx.partyId) setSelectedSarafiPartyId(tx.partyId);
      setExchangeDescription(tx.description || '');
      setExchangeNotes(tx.notes || '');

      if (tx.currency === 'AFN') {
        setExchangeDirection('afn_to_usd');
      } else {
        setExchangeDirection('usd_to_afn');
      }
    } else {
      setActiveTab('transfer');
      setTransferTrackingNumber(tx.trackingNumber || tx.transactionNumber || `TRF-${tx.id.slice(-5)}`);
      setTransferDate(tx.date || getPersianDate());
      setTransferAmountInput(tx.amount.toString());
      if (tx.fromCashRegister) setTransferFromReg(tx.fromCashRegister);
      if (tx.toCashRegister) setTransferToReg(tx.toCashRegister);
      if (tx.exchangeRate) setTransferCrossRateInput(tx.exchangeRate.toString());
      setTransferDescription(tx.description || '');
      setTransferNotes(tx.notes || '');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    setFormError('');
    setFormSuccess('');
    setTransferAmountInput('');
    setExchangeAmountInput('');
    setExchangeTargetAmountInput('');
  };

  const handleDeleteTransfer = (id: string) => {
    if (
      window.confirm(
        'آیا از ابطال و حذف این سند اطمینان دارید؟ موجودی صندوق‌ها و حساب‌های مربوطه به حالت اولیه بازخواهد گشت.'
      )
    ) {
      deleteTransaction(id);
    }
  };

  // Filtered transactions for the history ledger
  const relevantTransactions = useMemo(() => {
    return transactions.filter(t => {
      const isTrans = t.type === 'cash_transfer';
      const isExch = t.type === 'currency_exchange' || t.isExchange;
      const isSarafi =
        (t.type === 'make_payment' || t.type === 'receive_payment') &&
        (t.partyName?.includes('صراف') || t.partyName?.includes('صرافی'));

      if (!isTrans && !isExch && !isSarafi && !t.fromCashRegister) return false;

      if (historyFilter === 'transfer' && !isTrans) return false;
      if (historyFilter === 'exchange' && !isExch) return false;
      if (historyFilter === 'sarafi' && !t.partyId && !isSarafi) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesTrk = t.trackingNumber?.toLowerCase().includes(q);
        const matchesNum = t.transactionNumber?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesParty = t.partyName?.toLowerCase().includes(q);
        const matchesReg =
          getRegisterLabel(t.fromCashRegister).toLowerCase().includes(q) ||
          getRegisterLabel(t.toCashRegister).toLowerCase().includes(q);
        return matchesTrk || matchesNum || matchesDesc || matchesParty || matchesReg;
      }
      return true;
    });
  }, [transactions, historyFilter, historySearch, allRegisters]);

  const transferCount = transactions.filter(t => t.type === 'cash_transfer').length;
  const exchangeCount = transactions.filter(t => t.type === 'currency_exchange' || t.isExchange).length;

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header Card with Live Balances */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              عملیات صندوق به صندوق و تبدیل اسعار
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              انتقال مستقیم وجه بین صندوق‌های شرکت یا تبادله و تبدیل ارز (افغانی و دالر) با نرخ صرافی
            </p>
          </div>
        </div>

        {/* Live Balance Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-950">
            <span className="text-[10px] text-emerald-700 font-medium block">موجودی صندوق افغانی:</span>
            <span className="font-mono font-black text-sm text-emerald-800">
              {formatNumber(cashRegister.afnBalance || 0)} ؋
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-950">
            <span className="text-[10px] text-blue-700 font-medium block">موجودی صندوق دلاری:</span>
            <span className="font-mono font-black text-sm text-blue-800">
              ${formatNumber(cashRegister.usdBalance || 0)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-950">
            <span className="text-[10px] text-amber-700 font-medium block">نرخ روز صرافی:</span>
            <span className="font-mono font-black text-sm text-amber-900">
              $۱ = {formatNumber(cashRegister.usdToAfnRate || 68.5)} AFN
            </span>
          </div>
        </div>
      </div>

      {/* Editing Alert Banner */}
      {editingTxId && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Edit3 className="w-4 h-4 text-amber-600" />
            <span>در حال ویرایش سند شماره {editingTxId} — لطفاً تغییرات را اعمال کرده و دکمه ذخیره را بزنید.</span>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            انصراف از ویرایش
          </button>
        </div>
      )}

      {/* 2. Main Action Tabs */}
      <div className="flex items-center gap-2 bg-slate-200/80 p-1.5 rounded-2xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab('transfer');
            setFormError('');
          }}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'transfer'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          <span>انتقال بین صندوق‌ها (صندوق به صندوق)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('exchange');
            setFormError('');
          }}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'exchange'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4 text-indigo-600" />
          <span>تبدیل و اکسچنج اسعار (صرافی)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setFormError('');
          }}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-600" />
          <span>تاریخچه اسناد ({relevantTransactions.length})</span>
        </button>
      </div>

      {/* Global Form Alerts */}
      {formError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">{formError}</span>
        </div>
      )}
      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{formSuccess}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CASH-TO-CASH TRANSFER (انتقال بین صندوق‌ها) */}
      {/* ========================================================================= */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>انتقال مستقیم وجه بین صندوق‌های شرکت</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  برداشت از صندوق مبدا و واریز مستقیم به صندوق مقصد (با حفظ تراز دقیق صندوق‌ها)
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-200/60 font-bold self-start sm:self-auto">
                شماره حواله: {transferTrackingNumber}
              </span>
            </div>

            {/* Visual Box-to-Box Flow */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              {/* Box 1: Source */}
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 block">صندوق مبدأ (برداشت وجه):</span>
                <select
                  value={transferFromReg}
                  onChange={e => setTransferFromReg(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:border-blue-500 outline-none"
                >
                  {allRegisters.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.currency})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">موجودی فعلی:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(transferSourceAcc.balance, transferSourceAcc.currency)}
                  </span>
                </div>
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapTransferRegisters}
                  className="p-3 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-300 rounded-2xl shadow-xs transition cursor-pointer"
                  title="جابجایی مبدا و مقصد"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>

              {/* Box 2: Target */}
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 block">صندوق مقصد (واریز وجه):</span>
                <select
                  value={transferToReg}
                  onChange={e => setTransferToReg(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:border-blue-500 outline-none"
                >
                  {allRegisters.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.currency})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">موجودی فعلی:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(transferTargetAcc.balance, transferTargetAcc.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer Amount and Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    مبلغ انتقالی ({transferSourceAcc.currency}) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setTransferAmountInput(transferSourceAcc.balance.toString())}
                    className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    انتقال کل موجودی ({formatNumber(transferSourceAcc.balance)})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={transferAmountInput}
                    onChange={e => setTransferAmountInput(e.target.value)}
                    placeholder="مثال: 50,000"
                    className="w-full text-sm font-bold font-mono p-3 rounded-2xl border border-slate-300 bg-white focus:border-blue-500 outline-none text-left pl-14"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-slate-400">
                    {transferSourceAcc.currency}
                  </span>
                </div>
              </div>

              {/* Cross currency note or rate */}
              {isTransferCrossCurrency ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                    <span>نرخ تبدیل ارز روز (۱ دالر = چند افغانی)</span>
                    <span className="text-[10.5px] text-slate-500">ارز مبدا با مقصد متفاوت است</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={transferCrossRateInput}
                      onChange={e => setTransferCrossRateInput(e.target.value)}
                      placeholder="68.5"
                      className="w-full text-sm font-bold font-mono p-3 rounded-2xl border border-indigo-300 bg-indigo-50/40 focus:border-indigo-600 outline-none text-left pl-14"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-3 text-xs font-mono font-bold text-indigo-500">
                      AFN
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تاریخ عملیه (شمسی)</label>
                  <input
                    type="text"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    className="w-full text-xs font-bold font-mono p-3 rounded-2xl border border-slate-300 bg-white text-center outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Converted preview if cross currency */}
            {isTransferCrossCurrency && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-950 font-bold">
                <span>
                  مبلغ معادل جهت واریز به {transferTargetAcc.name}:
                </span>
                <span className="font-mono text-sm text-indigo-800">
                  {formatNumber(transferTargetCalculatedAmount)} {transferTargetAcc.currency}
                </span>
              </div>
            )}

            {/* Description and Reference Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">شرح سند انتقال</label>
                  <button
                    type="button"
                    onClick={() =>
                      setTransferDescription(
                        `انتقال وجه از ${transferSourceAcc.name} به ${transferTargetAcc.name} بابت تأمین نقدینگی`
                      )
                    }
                    className="text-[10.5px] text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>متن پیشنهادی</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={e => setTransferDescription(e.target.value)}
                  placeholder="مثال: انتقال وجه بابت تنخواه، تأمین نقدینگی خرید و..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">یادداشت تکمیلی / شماره فیش بانکی (اختیاری)</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="شماره چک، فیش واریزی یا توضیحات محرمانه..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Balance Impact Preview */}
            {transferNumAmount > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-black text-slate-700 block">پیش‌نمایش تغییرات مانده صندوق‌ها پس از انتقال:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">{transferSourceAcc.name}:</span>
                    <span className="font-mono font-bold text-rose-700">
                      -{formatNumber(transferNumAmount)} ➔ مانده جدید:{' '}
                      {formatNumber(transferSourceAcc.balance - transferNumAmount)} {transferSourceAcc.currency}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">{transferTargetAcc.name}:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{formatNumber(isTransferCrossCurrency ? transferTargetCalculatedAmount : transferNumAmount)} ➔ مانده جدید:{' '}
                      {formatNumber(transferTargetAcc.balance + (isTransferCrossCurrency ? transferTargetCalculatedAmount : transferNumAmount))} {transferTargetAcc.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransferSubmit(false)}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingTxId ? 'ذخیره ویرایش سند' : 'ثبت سند انتقال'}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTransferSubmit(true)}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>ثبت و چاپ حواله رسمی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CURRENCY EXCHANGE (تبدیل و اکسچنج اسعار با صرافی) */}
      {/* ========================================================================= */}
      {activeTab === 'exchange' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-indigo-600" />
                  <span>تبدیل اسعار، خرید و فروش ارز و عملیات صرافی</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تبدیل افغانی به دالر یا دالر به افغانی بر اساس نرخ روز صرافی و ثبت تسویه
                </p>
              </div>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200/60 font-bold self-start sm:self-auto">
                شماره سند: {exchangeTrackingNumber}
              </span>
            </div>

            {/* Exchange Direction Selector: Big Friendly Toggle Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">جهت تبدیل ارز را مشخص نمایید:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExchangeDirectionChange('afn_to_usd')}
                  className={`p-4 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between ${
                    exchangeDirection === 'afn_to_usd'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-900 block">
                      تبدیل افغانی به دالر (خرید دالر با افغانی)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      پرداخت از صندوق افغانی ➔ واریز به صندوق دالری
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                    AFN ➔ USD
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExchangeDirectionChange('usd_to_afn')}
                  className={`p-4 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between ${
                    exchangeDirection === 'usd_to_afn'
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-900 block">
                      تبدیل دالر به افغانی (فروش دالر و دریافت افغانی)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      پرداخت از صندوق دالری ➔ واریز به صندوق افغانی
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-xl">
                    USD ➔ AFN
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Core Fields: Paid Amount, Exchange Rate, Received Amount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Paid Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    مبلغ پرداختی ({exchangeSourceAcc.currency}) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    موجودی: {formatNumber(exchangeSourceAcc.balance)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={exchangeAmountInput}
                    onChange={e => handleExchangeAmountChange(e.target.value)}
                    placeholder={exchangeDirection === 'afn_to_usd' ? 'مثال: 68,500' : 'مثال: 1,000'}
                    className="w-full text-sm font-bold font-mono p-3 rounded-2xl border border-slate-300 bg-white focus:border-indigo-500 outline-none text-left pl-14"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-slate-400">
                    {exchangeSourceAcc.currency}
                  </span>
                </div>
              </div>

              {/* 2. Exchange Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    نرخ صرافی (هر ۱ دالر به افغانی) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleExchangeRateChange((cashRegister.usdToAfnRate || 68.5).toString())}
                    className="text-[10.5px] text-indigo-600 hover:underline cursor-pointer font-medium"
                  >
                    نرخ روز ({cashRegister.usdToAfnRate || 68.5})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={exchangeRateInput}
                    onChange={e => handleExchangeRateChange(e.target.value)}
                    placeholder="68.5"
                    className="w-full text-sm font-bold font-mono p-3 rounded-2xl border border-indigo-300 bg-indigo-50/30 focus:border-indigo-600 outline-none text-left pl-14"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-indigo-500">
                    AFN
                  </span>
                </div>
              </div>

              {/* 3. Received Target Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    مبلغ دریافتی ({exchangeTargetAcc.currency}) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-emerald-600 font-bold">محاسبه خودکار</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={exchangeTargetAmountInput}
                    onChange={e => handleExchangeTargetAmountChange(e.target.value)}
                    placeholder="محاسبه می‌شود..."
                    className="w-full text-sm font-bold font-mono p-3 rounded-2xl border border-emerald-300 bg-emerald-50/40 text-emerald-900 focus:border-emerald-600 outline-none text-left pl-14"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-emerald-600">
                    {exchangeTargetAcc.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Registers: From Box and To Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">صندوق پرداخت‌کننده (کسر وجه)</label>
                <select
                  value={exchangeFromReg}
                  onChange={e => setExchangeFromReg(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 outline-none"
                >
                  {allRegisters.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} (موجودی: {formatCurrency(reg.balance, reg.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">صندوق دریافت‌کننده (واریز وجه)</label>
                <select
                  value={exchangeToReg}
                  onChange={e => setExchangeToReg(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 outline-none"
                >
                  {allRegisters.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} (موجودی: {formatCurrency(reg.balance, reg.currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Sarafi Party Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-600" />
                    <span>انتخاب صراف یا طرف‌حساب معامله (اختیاری)</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    در صورتی که عملیات تبادله را با یک صراف مشخص یا در بازار صرافی انجام داده‌اید انتخاب نمایید.
                  </p>
                </div>
                {selectedSarafiParty && (
                  <button
                    type="button"
                    onClick={() => setSelectedSarafiPartyId('')}
                    className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    حذف صراف
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedSarafiPartyId}
                  onChange={e => setSelectedSarafiPartyId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="">بدون انتخاب صراف (عملیات داخلی شرکت)</option>
                  {filteredSarrafParties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ''} {p.phone ? `— ${p.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description, Date, Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">شرح و بابت عملیات اکسچنج</label>
                  <button
                    type="button"
                    onClick={() =>
                      setExchangeDescription(
                        exchangeDirection === 'afn_to_usd'
                          ? `تبدیل ${formatNumber(exchangeNumAmount)} افغانی به ${formatNumber(exchangeNumTarget)} دالر به نرخ ${exchangeNumRate}`
                          : `فروش ${formatNumber(exchangeNumAmount)} دالر به ارزش ${formatNumber(exchangeNumTarget)} افغانی به نرخ ${exchangeNumRate}`
                      )
                    }
                    className="text-[10.5px] text-indigo-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>متن خودکار</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={exchangeDescription}
                  onChange={e => setExchangeDescription(e.target.value)}
                  placeholder="مثال: بابت تبدیل ارز، تسویه حساب صرافی، تأمین دالر حواله و..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-300 bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">تاریخ عملیه (شمسی)</label>
                <input
                  type="text"
                  value={exchangeDate}
                  onChange={e => setExchangeDate(e.target.value)}
                  className="w-full text-xs font-bold font-mono p-3 rounded-2xl border border-slate-300 bg-white text-center outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Exchange Summary Banner */}
            {exchangeNumAmount > 0 && exchangeNumTarget > 0 && (
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-black text-indigo-950">خلاصه عملیات تبدیل ارز:</span>
                  <span className="font-mono text-indigo-800 font-bold">
                    نرخ محاسبه: ۱ دالر = {exchangeNumRate} افغانی
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="text-slate-600">برداشت از {exchangeSourceAcc.name}:</span>
                    <span className="font-mono font-bold text-rose-700">
                      -{formatNumber(exchangeNumAmount)} {exchangeSourceAcc.currency}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="text-slate-600">واریز به {exchangeTargetAcc.name}:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{formatNumber(exchangeNumTarget)} {exchangeTargetAcc.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExchangeSubmit(false)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingTxId ? 'ذخیره ویرایش سند' : 'ثبت سند تبادله اسعار'}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExchangeSubmit(true)}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>ثبت و چاپ رسید صرافی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMPLETE HISTORY & LEDGER (تاریخچه حواله‌ها و اسناد) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>تاریخچه و دفتر اسناد حواله‌ها و اکسچنج</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مشاهده، جستجو، چاپ حواله مجدد، ویرایش و ابطال اسناد قبلی
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl self-start sm:self-auto">
              {relevantTransactions.length} سند ثبت شده
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="جستجو در شرح، شماره پیگیری، صراف..."
                className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه اسناد ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('transfer')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  historyFilter === 'transfer'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                صندوق به صندوق ({transferCount})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('exchange')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  historyFilter === 'exchange'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اکسچنج اسعار ({exchangeCount})
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          {relevantTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Coins className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
              <p className="text-xs font-bold text-slate-600">هیچ سندی با معیارهای انتخابی یافت نشد.</p>
              <p className="text-[11px] text-slate-400">
                می‌توانید از زبانه‌های «انتقال بین صندوق‌ها» یا «تبدیل و اکسچنج» سند جدید ثبت فرمایید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-3.5">شماره و تاریخ</th>
                    <th className="py-3 px-3.5">نوع سند</th>
                    <th className="py-3 px-3.5">صندوق مبدأ ➔ مقصد</th>
                    <th className="py-3 px-3.5 text-center">مبالغ و نرخ تسعیر</th>
                    <th className="py-3 px-3.5">شرح و طرف‌حساب</th>
                    <th className="py-3 px-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantTransactions.map(tx => {
                    const isEx = tx.isExchange || tx.type === 'currency_exchange';
                    const hasParty = !!tx.partyName;

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          editingTxId === tx.id ? 'bg-amber-50/70 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-blue-700 block">
                            {tx.trackingNumber || tx.transactionNumber || tx.id.slice(-6)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{tx.date}</span>
                        </td>

                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              isEx
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {isEx ? 'اکسچنج اسعار' : 'انتقال صندوق'}
                          </span>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <span>{getRegisterLabel(tx.fromCashRegister)}</span>
                            <ArrowLeftRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{getRegisterLabel(tx.toCashRegister)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          <div className="font-mono font-bold">
                            <span className="text-rose-700 block">
                              -{formatNumber(tx.amount)} {tx.currency}
                            </span>
                            {tx.targetAmount && (
                              <span className="text-emerald-700 block text-[11px] mt-0.5">
                                +{formatNumber(tx.targetAmount)} {tx.targetCurrency}
                              </span>
                            )}
                            {tx.exchangeRate && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                                (نرخ: {tx.exchangeRate})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 max-w-[240px]">
                          <p className="text-xs text-slate-700 truncate" title={tx.description}>
                            {tx.description || '—'}
                          </p>
                          {hasParty && (
                            <span className="inline-block mt-0.5 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                              صرافی: {tx.partyName}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePrintVoucher(tx)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="چاپ حواله رسمی"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(tx)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="ویرایش سند"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTransfer(tx.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="ابطال / حذف سند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick 5-recent records preview under Tab 1 and Tab 2 */}
      {activeTab !== 'history' && relevantTransactions.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>آخرین اسناد ثبت‌شده اخیراً:</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>مشاهده همه در دفتر اسناد</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {relevantTransactions.slice(0, 4).map(tx => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700">{tx.trackingNumber || tx.transactionNumber}</span>
                  <span className="text-slate-400 text-[11px]">{tx.date}</span>
                  <span className="text-slate-700 font-medium">
                    {getRegisterLabel(tx.fromCashRegister)} ➔ {getRegisterLabel(tx.toCashRegister)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-slate-900">
                    {formatNumber(tx.amount)} {tx.currency}
                    {tx.targetAmount && ` ➔ ${formatNumber(tx.targetAmount)} ${tx.targetCurrency}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintVoucher(tx)}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-md transition cursor-pointer"
                    title="چاپ حواله"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
