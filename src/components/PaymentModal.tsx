import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Currency, TransactionType, CashRegisterType, FinancialTransaction } from '../types';
import { formatNumber, formatCurrency, getPersianDate } from '../utils/formatters';
import { PartySearchSelector } from './PartySearchSelector';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  X,
  Repeat,
  Wallet,
  Building,
  Coins,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Landmark,
  Building2,
  UserPlus,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'currency_exchange';
  initialPartyId?: string;
  editingTransaction?: FinancialTransaction | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  initialType = 'receive_payment',
  initialPartyId,
  editingTransaction,
}) => {
  const {
    parties,
    createTransaction,
    updateTransaction,
    cashRegister,
    cashAccounts,
    getNextTransactionNumber,
    updateExchangeRate,
  } = useAccounting();

  // Active Tab: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'exchange_remittance'
  const [activeTab, setActiveTab] = useState<'receive_payment' | 'make_payment' | 'cash_transfer' | 'exchange_remittance'>(
    initialType === 'cash_transfer'
      ? 'cash_transfer'
      : initialType === 'currency_exchange'
      ? 'exchange_remittance'
      : initialType
  );

  const [transactionNumber, setTransactionNumber] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || parties[0]?.id || '');
  const [date, setDate] = useState<string>(getPersianDate());
  const [description, setDescription] = useState<string>('');
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState<boolean>(false);

  // 1 & 2: Receive / Payment State
  const [partyAmount, setPartyAmount] = useState<number>(1000);
  const [partyCurrency, setPartyCurrency] = useState<Currency>('USD');
  const [isExchangeInPay, setIsExchangeInPay] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(cashRegister.usdToAfnRate || 65);
  const [cashAmount, setCashAmount] = useState<number>(65000);
  const [cashCurrency, setCashCurrency] = useState<Currency>('AFN');
  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegisterType>('afn_cash');

  // 3: Cash to Cash Transfer State & Sarrafi Exchange
  const [transferSubMode, setTransferSubMode] = useState<'box_to_box' | 'box_to_sarrafi' | 'sarrafi_to_box'>('box_to_box');
  const [transferFromReg, setTransferFromReg] = useState<string>('afn_cash');
  const [transferToReg, setTransferToReg] = useState<string>('usd_cash');
  const [transferFromAmount, setTransferFromAmount] = useState<number>(65000);
  const [transferToAmount, setTransferToAmount] = useState<number>(1000);
  const [transferRate, setTransferRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Sarrafi Box-to-Box Exchange State
  const defaultSarrafi = parties.find(p => p.groupName === 'صرافان' || p.company?.includes('صرافی')) || parties[0];
  const [sarrafiPartyId, setSarrafiPartyId] = useState<string>(defaultSarrafi?.id || '');
  const [sarrafiBoxReg, setSarrafiBoxReg] = useState<string>('afn_cash');
  const [sarrafiRate, setSarrafiRate] = useState<number>(cashRegister.usdToAfnRate || 65);
  const [sarrafiFromAmount, setSarrafiFromAmount] = useState<number>(6500);
  const [sarrafiToAmount, setSarrafiToAmount] = useState<number>(100);
  const [sarrafiFromCurrency, setSarrafiFromCurrency] = useState<Currency>('AFN');
  const [sarrafiToCurrency, setSarrafiToCurrency] = useState<Currency>('USD');

  // 4: Exchange & Remittance to Company/Sarrafi State
  const [remitFromReg, setRemitFromReg] = useState<string>('afn_cash');
  const [remitTargetPartyId, setRemitTargetPartyId] = useState<string>(
    parties.find(p => p.groupName === 'صرافان' || p.company?.includes('صرافی'))?.id || parties[0]?.id || ''
  );
  const [remitTargetCurrency, setRemitTargetCurrency] = useState<Currency>('USD');
  const [remitFromAmount, setRemitFromAmount] = useState<number>(65000);
  const [remitTargetAmount, setRemitTargetAmount] = useState<number>(1000);
  const [remitRate, setRemitRate] = useState<number>(cashRegister.usdToAfnRate || 65);

  // Initial tab and transaction number sync or populate from editingTransaction
  useEffect(() => {
    if (editingTransaction) {
      setTransactionNumber(editingTransaction.transactionNumber);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description || '');

      if (editingTransaction.type === 'receive_payment') {
        setActiveTab('receive_payment');
        setSelectedPartyId(editingTransaction.partyId || parties[0]?.id || '');
        setPartyAmount(editingTransaction.amount);
        setPartyCurrency(editingTransaction.currency);
        setIsExchangeInPay(!!editingTransaction.isExchange);
        if (editingTransaction.exchangeRate) setExchangeRate(editingTransaction.exchangeRate);
        if (editingTransaction.cashAmount) setCashAmount(editingTransaction.cashAmount);
        if (editingTransaction.cashCurrency) setCashCurrency(editingTransaction.cashCurrency);
        if (editingTransaction.cashRegister) setSelectedCashRegister(editingTransaction.cashRegister);
      } else if (editingTransaction.type === 'make_payment') {
        if (editingTransaction.isExchange && editingTransaction.partyId) {
          setActiveTab('exchange_remittance');
          setRemitTargetPartyId(editingTransaction.partyId);
          setRemitTargetAmount(editingTransaction.amount);
          setRemitTargetCurrency(editingTransaction.currency);
          setRemitFromAmount(editingTransaction.cashAmount || editingTransaction.amount);
          if (editingTransaction.exchangeRate) setRemitRate(editingTransaction.exchangeRate);
          if (editingTransaction.cashRegister) setRemitFromReg(editingTransaction.cashRegister);
        } else {
          setActiveTab('make_payment');
          setSelectedPartyId(editingTransaction.partyId || parties[0]?.id || '');
          setPartyAmount(editingTransaction.amount);
          setPartyCurrency(editingTransaction.currency);
          setIsExchangeInPay(!!editingTransaction.isExchange);
          if (editingTransaction.exchangeRate) setExchangeRate(editingTransaction.exchangeRate);
          if (editingTransaction.cashAmount) setCashAmount(editingTransaction.cashAmount);
          if (editingTransaction.cashCurrency) setCashCurrency(editingTransaction.cashCurrency);
          if (editingTransaction.cashRegister) setSelectedCashRegister(editingTransaction.cashRegister);
        }
      } else if (editingTransaction.type === 'cash_transfer' || editingTransaction.type === 'currency_exchange') {
        setActiveTab('cash_transfer');
        setTransferFromAmount(editingTransaction.amount);
        setTransferToAmount(editingTransaction.targetAmount || editingTransaction.amount);
        if (editingTransaction.fromCashRegister) setTransferFromReg(editingTransaction.fromCashRegister);
        if (editingTransaction.toCashRegister) setTransferToReg(editingTransaction.toCashRegister);
        if (editingTransaction.exchangeRate) setTransferRate(editingTransaction.exchangeRate);
      }
    } else {
      if (initialType === 'cash_transfer') {
        setActiveTab('cash_transfer');
        setTransactionNumber(getNextTransactionNumber('cash_transfer'));
      } else if (initialType === 'currency_exchange') {
        setActiveTab('exchange_remittance');
        setTransactionNumber(getNextTransactionNumber('currency_exchange'));
      } else if (initialType) {
        setActiveTab(initialType);
        setTransactionNumber(getNextTransactionNumber(initialType));
      }
      if (initialPartyId) setSelectedPartyId(initialPartyId);
    }
  }, [initialType, initialPartyId, isOpen, editingTransaction]);

  useEffect(() => {
    if (cashRegister.usdToAfnRate) {
      setExchangeRate(cashRegister.usdToAfnRate);
      setTransferRate(cashRegister.usdToAfnRate);
      setRemitRate(cashRegister.usdToAfnRate);
    }
  }, [cashRegister.usdToAfnRate]);

  // Tab change handler
  const handleTabChange = (
    tab: 'receive_payment' | 'make_payment' | 'cash_transfer' | 'exchange_remittance'
  ) => {
    setActiveTab(tab);
    if (tab === 'receive_payment' || tab === 'make_payment') {
      setTransactionNumber(getNextTransactionNumber(tab));
    } else if (tab === 'cash_transfer') {
      setTransactionNumber(getNextTransactionNumber('cash_transfer'));
    } else {
      setTransactionNumber(getNextTransactionNumber('currency_exchange'));
    }
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync cash to cash calculations
  const sourceAcc = cashAccounts.find(a => a.id === transferFromReg) || cashAccounts[0];
  const targetAcc = cashAccounts.find(a => a.id === transferToReg) || cashAccounts[1] || cashAccounts[0];
  const isCrossTransfer = sourceAcc?.currency !== targetAcc?.currency;

  const handleTransferFromAmountChange = (val: number) => {
    setTransferFromAmount(val);
    if (!isCrossTransfer) {
      setTransferToAmount(val);
      return;
    }
    if (sourceAcc?.currency === 'AFN' && targetAcc?.currency === 'USD') {
      setTransferToAmount(transferRate > 0 ? Number((val / transferRate).toFixed(2)) : 0);
    } else if (sourceAcc?.currency === 'USD' && targetAcc?.currency === 'AFN') {
      setTransferToAmount(Math.round(val * transferRate));
    } else {
      setTransferToAmount(val);
    }
  };

  const handleTransferToAmountChange = (val: number) => {
    setTransferToAmount(val);
    if (!isCrossTransfer) {
      setTransferFromAmount(val);
      return;
    }
    if (sourceAcc?.currency === 'AFN' && targetAcc?.currency === 'USD') {
      setTransferFromAmount(Math.round(val * transferRate));
    } else if (sourceAcc?.currency === 'USD' && targetAcc?.currency === 'AFN') {
      setTransferFromAmount(transferRate > 0 ? Number((val / transferRate).toFixed(2)) : 0);
    } else {
      setTransferFromAmount(val);
    }
  };

  const handleTransferRateChange = (rate: number) => {
    setTransferRate(rate);
    if (sourceAcc?.currency === 'AFN' && targetAcc?.currency === 'USD') {
      setTransferToAmount(rate > 0 ? Number((transferFromAmount / rate).toFixed(2)) : 0);
    } else if (sourceAcc?.currency === 'USD' && targetAcc?.currency === 'AFN') {
      setTransferToAmount(Math.round(transferFromAmount * rate));
    }
  };

  // Sync Remittance to Company / Sarrafi calculations
  const remitSourceAcc = cashAccounts.find(a => a.id === remitFromReg) || cashAccounts[0];
  const isRemitCross = remitSourceAcc?.currency !== remitTargetCurrency;

  const handleRemitFromAmountChange = (val: number) => {
    setRemitFromAmount(val);
    if (!isRemitCross) {
      setRemitTargetAmount(val);
      return;
    }
    if (remitSourceAcc?.currency === 'AFN' && remitTargetCurrency === 'USD') {
      setRemitTargetAmount(remitRate > 0 ? Number((val / remitRate).toFixed(2)) : 0);
    } else if (remitSourceAcc?.currency === 'USD' && remitTargetCurrency === 'AFN') {
      setRemitTargetAmount(Math.round(val * remitRate));
    } else {
      setRemitTargetAmount(val);
    }
  };

  const handleRemitTargetAmountChange = (val: number) => {
    setRemitTargetAmount(val);
    if (!isRemitCross) {
      setRemitFromAmount(val);
      return;
    }
    if (remitSourceAcc?.currency === 'AFN' && remitTargetCurrency === 'USD') {
      setRemitFromAmount(Math.round(val * remitRate));
    } else if (remitSourceAcc?.currency === 'USD' && remitTargetCurrency === 'AFN') {
      setRemitFromAmount(remitRate > 0 ? Number((val / remitRate).toFixed(2)) : 0);
    } else {
      setRemitFromAmount(val);
    }
  };

  const handleRemitRateChange = (rate: number) => {
    setRemitRate(rate);
    if (remitSourceAcc?.currency === 'AFN' && remitTargetCurrency === 'USD') {
      setRemitTargetAmount(rate > 0 ? Number((remitFromAmount / rate).toFixed(2)) : 0);
    } else if (remitSourceAcc?.currency === 'USD' && remitTargetCurrency === 'AFN') {
      setRemitTargetAmount(Math.round(remitFromAmount * rate));
    }
  };

  // Party Pay / Receive handlers
  const handlePartyAmountChange = (val: number) => {
    setPartyAmount(val);
    if (isExchangeInPay) {
      if (partyCurrency === 'USD' && cashCurrency === 'AFN') {
        setCashAmount(Math.round(val * exchangeRate));
      } else if (partyCurrency === 'AFN' && cashCurrency === 'USD') {
        setCashAmount(Number((val / (exchangeRate || 65)).toFixed(2)));
      }
    }
  };

  const handleExchangeRateInPayChange = (rate: number) => {
    setExchangeRate(rate);
    if (isExchangeInPay) {
      if (partyCurrency === 'USD' && cashCurrency === 'AFN') {
        setCashAmount(Math.round(partyAmount * rate));
      } else if (partyCurrency === 'AFN' && cashCurrency === 'USD') {
        setCashAmount(Number((partyAmount / (rate || 65)).toFixed(2)));
      }
    }
  };

  const handleCashAmountInPayChange = (val: number) => {
    setCashAmount(val);
    if (isExchangeInPay && exchangeRate > 0) {
      if (cashCurrency === 'AFN' && partyCurrency === 'USD') {
        setPartyAmount(Number((val / exchangeRate).toFixed(2)));
      } else if (cashCurrency === 'USD' && partyCurrency === 'AFN') {
        setPartyAmount(Math.round(val * exchangeRate));
      }
    }
  };

  // Sarrafi Box-to-Box Exchange handlers
  const handleSarrafiFromAmountChange = (val: number) => {
    setSarrafiFromAmount(val);
    if (sarrafiFromCurrency === 'AFN' && sarrafiToCurrency === 'USD') {
      setSarrafiToAmount(sarrafiRate > 0 ? Number((val / sarrafiRate).toFixed(2)) : 0);
    } else if (sarrafiFromCurrency === 'USD' && sarrafiToCurrency === 'AFN') {
      setSarrafiToAmount(Math.round(val * sarrafiRate));
    } else {
      setSarrafiToAmount(val);
    }
  };

  const handleSarrafiToAmountChange = (val: number) => {
    setSarrafiToAmount(val);
    if (sarrafiFromCurrency === 'AFN' && sarrafiToCurrency === 'USD') {
      setSarrafiFromAmount(Math.round(val * sarrafiRate));
    } else if (sarrafiFromCurrency === 'USD' && sarrafiToCurrency === 'AFN') {
      setSarrafiFromAmount(sarrafiRate > 0 ? Number((val / sarrafiRate).toFixed(2)) : 0);
    } else {
      setSarrafiFromAmount(val);
    }
  };

  const handleSarrafiRateChange = (rate: number) => {
    setSarrafiRate(rate);
    if (sarrafiFromCurrency === 'AFN' && sarrafiToCurrency === 'USD') {
      setSarrafiToAmount(rate > 0 ? Number((sarrafiFromAmount / rate).toFixed(2)) : 0);
    } else if (sarrafiFromCurrency === 'USD' && sarrafiToCurrency === 'AFN') {
      setSarrafiToAmount(Math.round(sarrafiFromAmount * rate));
    }
  };

  if (!isOpen) return null;

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const remitTargetParty = parties.find(p => p.id === remitTargetPartyId);
  const selectedSarrafiParty = parties.find(p => p.id === sarrafiPartyId) || defaultSarrafi;

  const partyBalUSD = selectedParty?.balanceUSD || 0;
  const partyBalAFN = selectedParty?.balanceAFN || 0;

  // Calculate prospective balance after this transaction
  const getProspectiveBalance = () => {
    if (!selectedParty) return { nextUSD: 0, nextAFN: 0 };
    let nUSD = partyBalUSD;
    let nAFN = partyBalAFN;
    if (activeTab === 'receive_payment') {
      if (partyCurrency === 'USD') nUSD += partyAmount;
      if (partyCurrency === 'AFN') nAFN += partyAmount;
    } else if (activeTab === 'make_payment') {
      if (partyCurrency === 'USD') nUSD -= partyAmount;
      if (partyCurrency === 'AFN') nAFN -= partyAmount;
    }
    const finalUSD = Math.abs(nUSD) < 0.0001 ? 0 : Number(nUSD.toFixed(4));
    const finalAFN = Math.abs(nAFN) < 0.0001 ? 0 : Number(nAFN.toFixed(4));
    return { nextUSD: finalUSD, nextAFN: finalAFN };
  };
  const { nextUSD, nextAFN } = getProspectiveBalance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'receive_payment' || activeTab === 'make_payment') {
      if (!selectedParty || partyAmount <= 0) return;

      const finalCashAmount = isExchangeInPay ? cashAmount : partyAmount;
      const finalCashCurrency = isExchangeInPay ? cashCurrency : partyCurrency;

      let autoDesc = description;
      if (!autoDesc) {
        if (isExchangeInPay) {
          autoDesc = `${activeTab === 'receive_payment' ? 'دریافت' : 'پرداخت'} ${formatNumber(finalCashAmount)} ${
            finalCashCurrency === 'AFN' ? 'افغانی' : 'دالر'
          } نقداً به نرخ ${exchangeRate} در بدل ${formatNumber(partyAmount)} ${
            partyCurrency === 'USD' ? 'دالر' : 'افغانی'
          } ${activeTab === 'receive_payment' ? 'از' : 'به'} حساب ${selectedParty.name}`;
        } else {
          autoDesc = `${activeTab === 'receive_payment' ? 'دریافت' : 'پرداخت'} نقدی ${formatNumber(
            partyAmount
          )} ${partyCurrency === 'USD' ? 'دالر' : 'افغانی'} ${
            activeTab === 'receive_payment' ? 'از' : 'به'
          } ${selectedParty.name} بابت تسویه حساب`;
        }
      }

      if (editingTransaction) {
        updateTransaction({
          ...editingTransaction,
          transactionNumber,
          date,
          type: activeTab as TransactionType,
          partyId: selectedParty.id,
          partyName: selectedParty.name,
          amount: partyAmount,
          currency: partyCurrency,
          isExchange: isExchangeInPay,
          exchangeRate: isExchangeInPay ? exchangeRate : undefined,
          cashAmount: finalCashAmount,
          cashCurrency: finalCashCurrency,
          cashRegister: selectedCashRegister,
          description: autoDesc,
        });
      } else {
        createTransaction({
          transactionNumber,
          date,
          type: activeTab,
          partyId: selectedParty.id,
          partyName: selectedParty.name,
          amount: partyAmount,
          currency: partyCurrency,
          isExchange: isExchangeInPay,
          exchangeRate: isExchangeInPay ? exchangeRate : undefined,
          cashAmount: finalCashAmount,
          cashCurrency: finalCashCurrency,
          cashRegister: selectedCashRegister,
          description: autoDesc,
        });
      }
    } else if (activeTab === 'cash_transfer') {
      if (transferSubMode === 'box_to_sarrafi') {
        const sarrafi = parties.find(p => p.id === sarrafiPartyId) || defaultSarrafi;
        if (!sarrafi || sarrafiFromAmount <= 0) return;
        const boxAccount = cashAccounts.find(a => a.id === sarrafiBoxReg) || cashAccounts[0];
        const autoDesc =
          description ||
          `پرداخت مبلغ ${formatNumber(sarrafiFromAmount)} ${sarrafiFromCurrency} از ${boxAccount?.name || 'صندوق'} به صرافی ${
            sarrafi.name
          } به نرخ ${sarrafiRate} در قبال ${formatNumber(sarrafiToAmount)} ${sarrafiToCurrency}`;

        if (editingTransaction) {
          updateTransaction({
            ...editingTransaction,
            transactionNumber,
            date,
            type: 'make_payment',
            partyId: sarrafi.id,
            partyName: sarrafi.name,
            amount: sarrafiToAmount,
            currency: sarrafiToCurrency,
            isExchange: true,
            exchangeRate: sarrafiRate,
            cashAmount: sarrafiFromAmount,
            cashCurrency: sarrafiFromCurrency,
            cashRegister: sarrafiBoxReg as CashRegisterType,
            description: autoDesc,
          });
        } else {
          createTransaction({
            transactionNumber,
            date,
            type: 'make_payment',
            partyId: sarrafi.id,
            partyName: sarrafi.name,
            amount: sarrafiToAmount,
            currency: sarrafiToCurrency,
            isExchange: true,
            exchangeRate: sarrafiRate,
            cashAmount: sarrafiFromAmount,
            cashCurrency: sarrafiFromCurrency,
            cashRegister: sarrafiBoxReg as CashRegisterType,
            description: autoDesc,
          });
        }
      } else if (transferSubMode === 'sarrafi_to_box') {
        const sarrafi = parties.find(p => p.id === sarrafiPartyId) || defaultSarrafi;
        if (!sarrafi || sarrafiToAmount <= 0) return;
        const boxAccount = cashAccounts.find(a => a.id === sarrafiBoxReg) || cashAccounts[0];
        const autoDesc =
          description ||
          `دریافت مبلغ ${formatNumber(sarrafiToAmount)} ${sarrafiToCurrency} از صرافی ${sarrafi.name} به ${
            boxAccount?.name || 'صندوق'
          } به نرخ ${sarrafiRate} در قبال ${formatNumber(sarrafiFromAmount)} ${sarrafiFromCurrency}`;

        if (editingTransaction) {
          updateTransaction({
            ...editingTransaction,
            transactionNumber,
            date,
            type: 'receive_payment',
            partyId: sarrafi.id,
            partyName: sarrafi.name,
            amount: sarrafiFromAmount,
            currency: sarrafiFromCurrency,
            isExchange: true,
            exchangeRate: sarrafiRate,
            cashAmount: sarrafiToAmount,
            cashCurrency: sarrafiToCurrency,
            cashRegister: sarrafiBoxReg as CashRegisterType,
            description: autoDesc,
          });
        } else {
          createTransaction({
            transactionNumber,
            date,
            type: 'receive_payment',
            partyId: sarrafi.id,
            partyName: sarrafi.name,
            amount: sarrafiFromAmount,
            currency: sarrafiFromCurrency,
            isExchange: true,
            exchangeRate: sarrafiRate,
            cashAmount: sarrafiToAmount,
            cashCurrency: sarrafiToCurrency,
            cashRegister: sarrafiBoxReg as CashRegisterType,
            description: autoDesc,
          });
        }
      } else {
        if (transferFromAmount <= 0 || !sourceAcc || !targetAcc) return;

        if (isCrossTransfer) {
          const autoDesc =
            description ||
            `انتقال و تبدیل مبلغ ${formatNumber(transferFromAmount)} ${sourceAcc.currency} از ${sourceAcc.name} به ${
              targetAcc.name
            } (معادل ${formatNumber(transferToAmount)} ${targetAcc.currency} با نرخ ${transferRate})`;

          if (editingTransaction) {
            updateTransaction({
              ...editingTransaction,
              transactionNumber,
              date,
              type: 'currency_exchange',
              amount: transferFromAmount,
              currency: sourceAcc.currency,
              targetAmount: transferToAmount,
              targetCurrency: targetAcc.currency,
              exchangeRate: transferRate,
              cashRegister: transferFromReg as CashRegisterType,
              fromCashRegister: transferFromReg as CashRegisterType,
              toCashRegister: transferToReg as CashRegisterType,
              description: autoDesc,
            });
          } else {
            createTransaction({
              transactionNumber,
              date,
              type: 'currency_exchange',
              amount: transferFromAmount,
              currency: sourceAcc.currency,
              targetAmount: transferToAmount,
              targetCurrency: targetAcc.currency,
              exchangeRate: transferRate,
              cashRegister: transferFromReg as CashRegisterType,
              fromCashRegister: transferFromReg as CashRegisterType,
              toCashRegister: transferToReg as CashRegisterType,
              description: autoDesc,
            });
          }
        } else {
          const autoDesc =
            description ||
            `انتقال مستقیم مبلغ ${formatNumber(transferFromAmount)} ${sourceAcc.currency} از ${sourceAcc.name} به ${
              targetAcc.name
            }`;

          if (editingTransaction) {
            updateTransaction({
              ...editingTransaction,
              transactionNumber,
              date,
              type: 'cash_transfer',
              amount: transferFromAmount,
              currency: sourceAcc.currency,
              cashRegister: transferFromReg as CashRegisterType,
              fromCashRegister: transferFromReg as CashRegisterType,
              toCashRegister: transferToReg as CashRegisterType,
              description: autoDesc,
            });
          } else {
            createTransaction({
              transactionNumber,
              date,
              type: 'cash_transfer',
              amount: transferFromAmount,
              currency: sourceAcc.currency,
              cashRegister: transferFromReg as CashRegisterType,
              fromCashRegister: transferFromReg as CashRegisterType,
              toCashRegister: transferToReg as CashRegisterType,
              description: autoDesc,
            });
          }
        }
      }
    } else if (activeTab === 'exchange_remittance') {
      if (!remitTargetParty || remitFromAmount <= 0 || !remitSourceAcc) return;

      const autoDesc =
        description ||
        `حواله و پرداخت ${formatNumber(remitFromAmount)} ${
          remitSourceAcc.currency === 'AFN' ? 'افغانی' : 'دالر'
        } از ${remitSourceAcc.name} به حساب ${remitTargetParty.name} (به ارزش ${formatNumber(
          remitTargetAmount
        )} ${remitTargetCurrency === 'USD' ? 'دالر' : 'افغانی'} با نرخ ${remitRate})`;

      if (editingTransaction) {
        updateTransaction({
          ...editingTransaction,
          transactionNumber,
          date,
          type: 'make_payment',
          partyId: remitTargetParty.id,
          partyName: remitTargetParty.name,
          amount: remitTargetAmount,
          currency: remitTargetCurrency,
          isExchange: true,
          exchangeRate: remitRate,
          cashAmount: remitFromAmount,
          cashCurrency: remitSourceAcc.currency,
          cashRegister: remitFromReg as CashRegisterType,
          description: autoDesc,
        });
      } else {
        createTransaction({
          transactionNumber,
          date,
          type: 'make_payment',
          partyId: remitTargetParty.id,
          partyName: remitTargetParty.name,
          amount: remitTargetAmount,
          currency: remitTargetCurrency,
          isExchange: true,
          exchangeRate: remitRate,
          cashAmount: remitFromAmount,
          cashCurrency: remitSourceAcc.currency,
          cashRegister: remitFromReg as CashRegisterType,
          description: autoDesc,
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[999] overflow-y-auto">
      {/* Floating Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[1000] bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-1.5 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer border-2 border-white"
        title="بستن فرم (ESC)"
      >
        <X className="w-5 h-5" />
        <span className="hidden sm:inline">بستن (ESC)</span>
      </button>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 my-4 sm:my-8 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${
                activeTab === 'receive_payment'
                  ? 'bg-blue-600'
                  : activeTab === 'make_payment'
                  ? 'bg-amber-600'
                  : activeTab === 'cash_transfer'
                  ? 'bg-emerald-600'
                  : 'bg-purple-600'
              }`}
            >
              {activeTab === 'receive_payment' && <ArrowDownLeft className="w-5 h-5" />}
              {activeTab === 'make_payment' && <ArrowUpRight className="w-5 h-5" />}
              {activeTab === 'cash_transfer' && <ArrowRightLeft className="w-5 h-5" />}
              {activeTab === 'exchange_remittance' && <Landmark className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {activeTab === 'receive_payment' && 'دریافت وجه نقدی از طرف حساب (کاهش طلب/بدهی)'}
                {activeTab === 'make_payment' && 'پرداخت وجه نقدی به طرف حساب / شرکت'}
                {activeTab === 'cash_transfer' && 'انتقال صندوق به صندوق (با تبدیل نرخ اسعار)'}
                {activeTab === 'exchange_remittance' && 'حواله و اکسچنج به صرافی / شرکت دلاری'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                سیستم چندمنظوره خزانه‌داری، تسویه ارزی و جابجایی نقدینگی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <X className="w-4 h-4" />
            <span>بستن</span>
          </button>
        </div>

        {/* 4 Multi-Mode Tab Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange('receive_payment')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'receive_payment'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>دریافت از شخص</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('make_payment')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'make_payment'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>پرداخت به شخص</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('cash_transfer')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cash_transfer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>صندوق به صندوق</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('exchange_remittance')}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'exchange_remittance'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>اکسچنج به صرافی/شرکت</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1 & 2: RECEIVE & PAYMENT FORM                                         */}
        {/* ========================================================================= */}
        {(activeTab === 'receive_payment' || activeTab === 'make_payment') && (
          <div className="space-y-4">
            {/* Number & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">شماره سند مسلسل</label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    اتوماتیک
                  </span>
                </div>
                <input
                  type="text"
                  value={transactionNumber}
                  readOnly
                  tabIndex={-1}
                  title="شماره سند به صورت خودکار توسط سیستم تولید می‌شود"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-800 cursor-not-allowed select-none shadow-inner"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ سند</label>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Party Selector with search and quick add */}
            <div>
              <PartySearchSelector
                parties={parties}
                selectedPartyId={selectedPartyId}
                onSelect={id => setSelectedPartyId(id)}
                onAddNewParty={() => setIsQuickPartyModalOpen(true)}
                label={activeTab === 'receive_payment' ? 'انتخاب مشتری / پرداخت‌کننده وجه' : 'انتخاب فروشنده / دریافت‌کننده وجه'}
                roleType={activeTab === 'receive_payment' ? 'customer' : 'supplier'}
                activeCurrency={partyCurrency}
                required
              />

              {/* Customer Current Balance Card & Quick Settlement */}
              {selectedParty && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-700">وضعیت فعلی الباقی حساب شخص:</span>
                    <span className="text-[11px] text-slate-500 font-mono">کد: {selectedParty.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600">مانده دالری:</span>
                      <div className="text-left">
                        <span className={`text-xs font-mono font-black ${
                          partyBalUSD < 0 ? 'text-rose-600' : partyBalUSD > 0 ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          ${formatNumber(Math.abs(partyBalUSD))}
                        </span>
                        <span className="text-[10px] text-slate-500 mr-1">
                          {partyBalUSD < 0 ? '(بدهکار)' : partyBalUSD > 0 ? '(طلبکار)' : '(تسویه)'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600">مانده افغانی:</span>
                      <div className="text-left">
                        <span className={`text-xs font-mono font-black ${
                          partyBalAFN < 0 ? 'text-rose-600' : partyBalAFN > 0 ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {formatNumber(Math.abs(partyBalAFN))} ؋
                        </span>
                        <span className="text-[10px] text-slate-500 mr-1">
                          {partyBalAFN < 0 ? '(بدهکار)' : partyBalAFN > 0 ? '(طلبکار)' : '(تسویه)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Settlement Shortcut Buttons */}
                  {(partyBalUSD !== 0 || partyBalAFN !== 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">تسویه سریع:</span>
                      {partyBalUSD < 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPartyCurrency('USD');
                            handlePartyAmountChange(Math.abs(partyBalUSD));
                          }}
                          className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          تسویه بدهی دالری (${formatNumber(Math.abs(partyBalUSD))})
                        </button>
                      )}
                      {partyBalAFN < 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPartyCurrency('AFN');
                            handlePartyAmountChange(Math.abs(partyBalAFN));
                          }}
                          className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          تسویه بدهی افغانی ({formatNumber(Math.abs(partyBalAFN))} ؋)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount from Party Account */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  {activeTab === 'receive_payment' ? 'مبلغ تسویه از حساب دفتری شخص:' : 'مبلغ کسر از بابت فاکتور/طلب شخص:'}
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {activeTab === 'receive_payment' ? 'کاهش بدهی مشتری در دفتر' : 'کاهش طلب فروشنده'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={partyAmount}
                    onChange={e => handlePartyAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none"
                    required
                  />
                </div>
                <div>
                  <select
                    value={partyCurrency}
                    onChange={e => {
                      const cur = e.target.value as Currency;
                      setPartyCurrency(cur);
                      if (!isExchangeInPay) {
                        setCashCurrency(cur);
                        setSelectedCashRegister(cur === 'AFN' ? 'afn_cash' : 'usd_cash');
                      } else {
                        const opp: Currency = cur === 'USD' ? 'AFN' : 'USD';
                        setCashCurrency(opp);
                        setSelectedCashRegister(opp === 'AFN' ? 'afn_cash' : 'usd_cash');
                        if (cur === 'USD') {
                          setCashAmount(Math.round(partyAmount * exchangeRate));
                        } else {
                          setCashAmount(Number((partyAmount / (exchangeRate || 65)).toFixed(2)));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="USD">دالر ($ USD)</option>
                    <option value="AFN">افغانی (؋ AFN)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exchange Toggle in Pay */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isExchangeInPay}
                    onChange={e => {
                      setIsExchangeInPay(e.target.checked);
                      if (e.target.checked) {
                        const opp: Currency = partyCurrency === 'USD' ? 'AFN' : 'USD';
                        setCashCurrency(opp);
                        setSelectedCashRegister(opp === 'AFN' ? 'afn_cash' : 'usd_cash');
                        if (opp === 'AFN') {
                          setCashAmount(Math.round(partyAmount * exchangeRate));
                        } else {
                          setCashAmount(Number((partyAmount / (exchangeRate || 65)).toFixed(2)));
                        }
                      } else {
                        setCashCurrency(partyCurrency);
                        setSelectedCashRegister(partyCurrency === 'AFN' ? 'afn_cash' : 'usd_cash');
                      }
                    }}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Repeat className="w-4 h-4 text-amber-700" />
                    <span>تسویه ساده با اکسچنج ارز (مثال: دریافت افغانی در قبال بدهی دالری)</span>
                  </span>
                </label>
              </div>

              {isExchangeInPay && (
                <div className="space-y-3 pt-2 border-t border-amber-200/70">
                  {/* Preset Fast Selection Modes */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPartyCurrency('USD');
                        setCashCurrency('AFN');
                        setSelectedCashRegister('afn_cash');
                        setCashAmount(Math.round(partyAmount * exchangeRate));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        partyCurrency === 'USD' && cashCurrency === 'AFN'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {activeTab === 'receive_payment' ? 'دریافت افغانی نقدی ⇐ در قبال بدهی دالری' : 'پرداخت افغانی نقدی ⇐ در قبال طلب دالری'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPartyCurrency('AFN');
                        setCashCurrency('USD');
                        setSelectedCashRegister('usd_cash');
                        setCashAmount(Number((partyAmount / (exchangeRate || 65)).toFixed(2)));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        partyCurrency === 'AFN' && cashCurrency === 'USD'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {activeTab === 'receive_payment' ? 'دریافت دالری نقدی ⇐ در قبال بدهی افغانی' : 'پرداخت دالری نقدی ⇐ در قبال طلب افغانی'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        نرخ تبدیل اسعار ($۱ به افغانی)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={exchangeRate}
                        onChange={e => handleExchangeRateInPayChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        مبلغ نقدی واقعی تحویلی صندوق ({cashCurrency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={cashAmount}
                        onChange={e => handleCashAmountInPayChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Clarification Formula Box */}
                  <div className="p-2.5 bg-amber-100/60 rounded-xl border border-amber-300/60 text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold flex items-center gap-1">
                      <span>✓ فرمول محاسبه:</span>
                      <span className="font-mono text-amber-950">
                        {partyCurrency === 'USD'
                          ? `${formatNumber(partyAmount)} USD × ${exchangeRate} = ${formatNumber(cashAmount)} AFN`
                          : `${formatNumber(partyAmount)} AFN ÷ ${exchangeRate} = ${formatNumber(cashAmount)} USD`}
                      </span>
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      {partyCurrency === 'USD'
                        ? `مشتری ${formatNumber(cashAmount)} افغانی نقداً تحویل می‌دهد و با نرخ ${exchangeRate}، مبلغ ${formatNumber(partyAmount)} دالر از حساب بدهی وی تصفیه می‌شود.`
                        : `مشتری ${formatNumber(cashAmount)} دالر نقداً تحویل می‌دهد و با نرخ ${exchangeRate}، مبلغ ${formatNumber(partyAmount)} افغانی از حساب بدهی وی تصفیه می‌شود.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Customer Remaining Balance Preview */}
            {selectedParty && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950 mb-1.5">
                  <span>الباقی نهایی حساب شخص در سیستم (پس از ثبت این سند):</span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded">پیش‌نمایش</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-600">الباقی دالری:</span>
                    <span className={`font-mono font-black ${
                      nextUSD < 0 ? 'text-rose-600' : nextUSD > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      ${formatNumber(Math.abs(nextUSD))} {nextUSD < 0 ? '(بدهکار)' : nextUSD > 0 ? '(طلبکار)' : '(تسویه کامل)'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-600">الباقی افغانی:</span>
                    <span className={`font-mono font-black ${
                      nextAFN < 0 ? 'text-rose-600' : nextAFN > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {formatNumber(Math.abs(nextAFN))} ؋ {nextAFN < 0 ? '(بدهکار)' : nextAFN > 0 ? '(طلبکار)' : '(تسویه کامل)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Cash Register */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {activeTab === 'receive_payment' ? 'واریز به کدام صندوق نقدی؟' : 'برداشت از کدام صندوق نقدی؟'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCashRegister('afn_cash')}
                  className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                    selectedCashRegister === 'afn_cash'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-900">
                    <span>صندوق افغانی</span>
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    {formatNumber(cashRegister.afnBalance)} ؋
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCashRegister('usd_cash')}
                  className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                    selectedCashRegister === 'usd_cash'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-900">
                    <span>صندوق دالری</span>
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    ${formatNumber(cashRegister.usdBalance)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCashRegister('exchange_usd_cash')}
                  className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                    selectedCashRegister === 'exchange_usd_cash'
                      ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-900">
                    <span>صندوق صرافی</span>
                    <Building className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    ${formatNumber(cashRegister.exchangeUsdBalance || 0)}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CASH TO CASH & SARRAFI EXCHANGE FORM                                */}
        {/* ========================================================================= */}
        {activeTab === 'cash_transfer' && (
          <div className="space-y-4">
            {/* Sub-Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTransferSubMode('box_to_box')}
                className={`flex-1 py-2 px-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferSubMode === 'box_to_box'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>انتقال بین صندوق‌های شرکت</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransferSubMode('box_to_sarrafi');
                  setSarrafiFromCurrency(sourceAcc?.currency || 'AFN');
                  setSarrafiToCurrency('USD');
                }}
                className={`flex-1 py-2 px-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferSubMode === 'box_to_sarrafi'
                    ? 'bg-white text-rose-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>پرداخت از صندوق به صرافی (اکسچنج)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransferSubMode('sarrafi_to_box');
                  setSarrafiToCurrency(targetAcc?.currency || 'USD');
                  setSarrafiFromCurrency('AFN');
                }}
                className={`flex-1 py-2 px-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferSubMode === 'sarrafi_to_box'
                    ? 'bg-white text-blue-800 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>دریافت از صرافی به صندوق (اکسچنج)</span>
              </button>
            </div>

            {/* Sub-Mode 1: BOX TO BOX */}
            {transferSubMode === 'box_to_box' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-emerald-900">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
                    <span>انتقال مستقیم نقدینگی بین صندوق‌ها و حساب‌های بانکی با تبدیل اسعار</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    انتقال پول از یک صندوق به صندوق دیگر؛ در صورت تفاوت واحد ارزی دو صندوق، نرخ برابری روز به صورت خودکار اعمال می‌شود.
                  </p>
                </div>

                {/* From & To Register Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صندوق مبدأ (برداشت وجه) *</label>
                    <select
                      value={transferFromReg}
                      onChange={e => {
                        setTransferFromReg(e.target.value);
                        const s = cashAccounts.find(a => a.id === e.target.value);
                        if (s?.currency === targetAcc?.currency) {
                          setTransferToAmount(transferFromAmount);
                        } else if (s?.currency === 'AFN' && targetAcc?.currency === 'USD') {
                          setTransferToAmount(transferRate > 0 ? Number((transferFromAmount / transferRate).toFixed(2)) : 0);
                        } else if (s?.currency === 'USD' && targetAcc?.currency === 'AFN') {
                          setTransferToAmount(Math.round(transferFromAmount * transferRate));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - [موجودی: {formatCurrency(acc.balance, acc.currency)}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صندوق مقصد (واریز وجه) *</label>
                    <select
                      value={transferToReg}
                      onChange={e => {
                        setTransferToReg(e.target.value);
                        const t = cashAccounts.find(a => a.id === e.target.value);
                        if (sourceAcc?.currency === t?.currency) {
                          setTransferToAmount(transferFromAmount);
                        } else if (sourceAcc?.currency === 'AFN' && t?.currency === 'USD') {
                          setTransferToAmount(transferRate > 0 ? Number((transferFromAmount / transferRate).toFixed(2)) : 0);
                        } else if (sourceAcc?.currency === 'USD' && t?.currency === 'AFN') {
                          setTransferToAmount(Math.round(transferFromAmount * transferRate));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - [موجودی: {formatCurrency(acc.balance, acc.currency)}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amounts & Rates */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مبلغ برداشتی از {sourceAcc?.name} ({sourceAcc?.currency})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={transferFromAmount}
                        onChange={e => handleTransferFromAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مبلغ واریزی به {targetAcc?.name} ({targetAcc?.currency})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={transferToAmount}
                        onChange={e => handleTransferToAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-emerald-800 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {isCrossTransfer && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        نرخ برابری و تبدیل اسعار ($۱ به افغانی):
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">$1 =</span>
                        <input
                          type="number"
                          step="any"
                          value={transferRate}
                          onChange={e => handleTransferRateChange(parseFloat(e.target.value) || 0)}
                          className="w-36 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                          required
                        />
                        <span className="text-xs font-bold text-slate-500">AFN</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Mode 2: BOX TO SARRAFI (PAYMENT WITH EXCHANGE) */}
            {transferSubMode === 'box_to_sarrafi' && (
              <div className="space-y-4">
                <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-rose-900">
                    <ArrowUpRight className="w-4 h-4 text-rose-700" />
                    <span>پرداخت نقدی از صندوق به صرافی (اکسچنج اسعار)</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    مثال: پرداخت ۶,۵۰۰ افغانی از صندوق نقدی به صرافی با نرخ ۶۵، در قبال ثبت معادل ۱۰۰ دالر در حساب صرافی.
                  </p>
                </div>

                {/* Box and Sarrafi Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صندوق مبدأ (برداشت نقدینگی) *</label>
                    <select
                      value={sarrafiBoxReg}
                      onChange={e => {
                        setSarrafiBoxReg(e.target.value);
                        const b = cashAccounts.find(a => a.id === e.target.value);
                        if (b) {
                          setSarrafiFromCurrency(b.currency);
                          const opp: Currency = b.currency === 'AFN' ? 'USD' : 'AFN';
                          setSarrafiToCurrency(opp);
                          if (b.currency === 'AFN') {
                            setSarrafiToAmount(sarrafiRate > 0 ? Number((sarrafiFromAmount / sarrafiRate).toFixed(2)) : 0);
                          } else {
                            setSarrafiToAmount(Math.round(sarrafiFromAmount * sarrafiRate));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - [موجودی: {formatCurrency(acc.balance, acc.currency)}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <PartySearchSelector
                      parties={parties}
                      selectedPartyId={sarrafiPartyId}
                      onSelect={id => setSarrafiPartyId(id)}
                      onAddNewParty={() => setIsQuickPartyModalOpen(true)}
                      label="طرف حساب صرافی / شرکت مقصد *"
                      roleType="all"
                      activeCurrency={sarrafiToCurrency}
                      required
                    />
                  </div>
                </div>

                {/* Sarrafi Balance Card */}
                {selectedSarrafiParty && (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">مانده فعلی صرافی ({selectedSarrafiParty.name}):</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">
                        دالر: ${formatNumber(selectedSarrafiParty.balanceUSD || 0)}
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        افغانی: {formatNumber(selectedSarrafiParty.balanceAFN || 0)} ؋
                      </span>
                    </div>
                  </div>
                )}

                {/* Amounts & Exchange Rate */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مبلغ پرداختی از صندوق ({sarrafiFromCurrency}) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={sarrafiFromAmount}
                        onChange={e => handleSarrafiFromAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-rose-700 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        نرخ اکسچنج ($۱ به افغانی) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={sarrafiRate}
                        onChange={e => handleSarrafiRateChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        معادل ثبت شده به صرافی ({sarrafiToCurrency}) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={sarrafiToAmount}
                        onChange={e => handleSarrafiToAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-emerald-700 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-rose-100/50 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed">
                    ✓ مبلغ <strong>{formatNumber(sarrafiFromAmount)} {sarrafiFromCurrency}</strong> نقداً از صندوق کسر می‌گردد و با نرخ <strong>{sarrafiRate}</strong>، معادل <strong>{formatNumber(sarrafiToAmount)} {sarrafiToCurrency}</strong> به حساب صرافی <strong>{selectedSarrafiParty?.name || ''}</strong> واریز و ثبت می‌شود.
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Mode 3: SARRAFI TO BOX (RECEIPT WITH EXCHANGE) */}
            {transferSubMode === 'sarrafi_to_box' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-blue-900">
                    <ArrowDownLeft className="w-4 h-4 text-blue-700" />
                    <span>دریافت از صرافی به صندوق نقدی (اکسچنج اسعار)</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    مثال: دریافت ۱۰۰ دالر نقدی در صندوق از صرافی با نرخ ۶۵، در قبال کسر ۶,۵۰۰ افغانی از حساب دفتری صرافی.
                  </p>
                </div>

                {/* Sarrafi and Box Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <PartySearchSelector
                      parties={parties}
                      selectedPartyId={sarrafiPartyId}
                      onSelect={id => setSarrafiPartyId(id)}
                      onAddNewParty={() => setIsQuickPartyModalOpen(true)}
                      label="طرف حساب صرافی مبدأ *"
                      roleType="all"
                      activeCurrency={sarrafiFromCurrency}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">صندوق مقصد (واریز نقدینگی) *</label>
                    <select
                      value={sarrafiBoxReg}
                      onChange={e => {
                        setSarrafiBoxReg(e.target.value);
                        const b = cashAccounts.find(a => a.id === e.target.value);
                        if (b) {
                          setSarrafiToCurrency(b.currency);
                          const opp: Currency = b.currency === 'USD' ? 'AFN' : 'USD';
                          setSarrafiFromCurrency(opp);
                          if (b.currency === 'USD') {
                            setSarrafiToAmount(sarrafiRate > 0 ? Number((sarrafiFromAmount / sarrafiRate).toFixed(2)) : 0);
                          } else {
                            setSarrafiToAmount(Math.round(sarrafiFromAmount * sarrafiRate));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - [موجودی: {formatCurrency(acc.balance, acc.currency)}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sarrafi Balance Card */}
                {selectedSarrafiParty && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">مانده فعلی صرافی ({selectedSarrafiParty.name}):</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">
                        دالر: ${formatNumber(selectedSarrafiParty.balanceUSD || 0)}
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        افغانی: {formatNumber(selectedSarrafiParty.balanceAFN || 0)} ؋
                      </span>
                    </div>
                  </div>
                )}

                {/* Amounts & Exchange Rate */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مبلغ کسر از صرافی ({sarrafiFromCurrency}) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={sarrafiFromAmount}
                        onChange={e => handleSarrafiFromAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-rose-700 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        نرخ اکسچنج ($۱ به افغانی) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={sarrafiRate}
                        onChange={e => handleSarrafiRateChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مبلغ واریزی به صندوق ({sarrafiToCurrency}) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={sarrafiToAmount}
                        onChange={e => handleSarrafiToAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-emerald-700 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-100/50 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                    ✓ مبلغ <strong>{formatNumber(sarrafiToAmount)} {sarrafiToCurrency}</strong> به صندوق واریز می‌گردد و با نرخ <strong>{sarrafiRate}</strong>، معادل <strong>{formatNumber(sarrafiFromAmount)} {sarrafiFromCurrency}</strong> از حساب صرافی <strong>{selectedSarrafiParty?.name || ''}</strong> کسر می‌شود.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXCHANGE & REMITTANCE TO COMPANY / SARRAFI                         */}
        {/* ========================================================================= */}
        {activeTab === 'exchange_remittance' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-1">
              <div className="font-black flex items-center gap-1.5 text-purple-900">
                <Landmark className="w-4 h-4 text-purple-700" />
                <span>تبدیل و حواله مستقیم از صندوق افغانی به صرافی دالری یا شرکت دالری</span>
              </div>
              <p className="text-[11px] text-purple-800">
                پول از صندوق شما کسر شده و معادل ارزی آن در دفتر حساب صرافی یا شرکت مقصد ثبت می‌شود.
              </p>
            </div>

            {/* Source Box & Target Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صندوق مبدأ (پرداخت وجه) *</label>
                <select
                  value={remitFromReg}
                  onChange={e => setRemitFromReg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                >
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} - [موجودی: {formatCurrency(acc.balance, acc.currency)}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <PartySearchSelector
                  parties={parties}
                  selectedPartyId={remitTargetPartyId}
                  onSelect={id => setRemitTargetPartyId(id)}
                  onAddNewParty={() => setIsQuickPartyModalOpen(true)}
                  label="صرافی / شرکت مقصد"
                  roleType="all"
                  activeCurrency="USD"
                  required
                />
              </div>
            </div>

            {/* Amount and Remittance Rate */}
            <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">
                    مبلغ برداشتی از {remitSourceAcc?.name} ({remitSourceAcc?.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={remitFromAmount}
                    onChange={e => handleRemitFromAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-mono font-black text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">
                    ارزش حواله شده به حساب شرکت / صرافی ({remitTargetCurrency}) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={remitTargetAmount}
                      onChange={e => handleRemitTargetAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-mono font-black text-purple-900 outline-none"
                      required
                    />
                    <select
                      value={remitTargetCurrency}
                      onChange={e => setRemitTargetCurrency(e.target.value as Currency)}
                      className="px-2 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="USD">دالر ($)</option>
                      <option value="AFN">افغانی (؋)</option>
                    </select>
                  </div>
                </div>
              </div>

              {isRemitCross && (
                <div className="pt-2 border-t border-purple-200 flex items-center justify-between">
                  <label className="text-[11px] font-bold text-purple-950">
                    نرخ محاسبه و تبدیل صرافی ($۱ به افغانی):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">$1 =</span>
                    <input
                      type="number"
                      step="any"
                      value={remitRate}
                      onChange={e => handleRemitRateChange(parseFloat(e.target.value) || 0)}
                      className="w-28 px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                      required
                    />
                    <span className="text-xs font-bold text-slate-500">AFN</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Common Description & Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">شرح و بابت سند</label>
          <input
            type="text"
            placeholder="توضیحات اختیاری (در صورت خالی بودن، شرح هوشمند خودکار تولید خواهد شد)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
          />
        </div>

        {/* Actions Bar */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="submit"
            className={`px-6 py-2.5 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer active:scale-95 ${
              activeTab === 'receive_payment'
                ? 'bg-blue-600 hover:bg-blue-700'
                : activeTab === 'make_payment'
                ? 'bg-amber-600 hover:bg-amber-700'
                : activeTab === 'cash_transfer'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {activeTab === 'receive_payment' && 'ثبت دریافت وجه'}
            {activeTab === 'make_payment' && 'ثبت پرداخت وجه'}
            {activeTab === 'cash_transfer' && 'ثبت انتقال بین صندوق‌ها'}
            {activeTab === 'exchange_remittance' && 'ثبت حواله و اکسچنج به صرافی/شرکت'}
          </button>
        </div>
      </form>

      {/* QUICK ADD PARTY MODAL */}
      <QuickAddPartyModal
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        onPartyCreated={newParty => {
          if (activeTab === 'exchange_remittance') {
            setRemitTargetPartyId(newParty.id);
          } else {
            setSelectedPartyId(newParty.id);
          }
        }}
        defaultType={activeTab === 'receive_payment' ? 'customer' : 'supplier'}
        defaultCurrency={partyCurrency}
      />
    </div>
  );
};
