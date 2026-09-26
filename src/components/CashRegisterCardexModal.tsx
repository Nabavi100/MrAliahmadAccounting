import React from 'react';
import { CashRegisterAccount } from '../types';
import { CashRegisterLedgerView } from './CashRegisterLedgerView';

interface CashRegisterCardexModalProps {
  account: CashRegisterAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPaymentModal?: (type: 'receive_payment' | 'make_payment') => void;
}

export const CashRegisterCardexModal: React.FC<CashRegisterCardexModalProps> = ({
  account,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-y-auto p-6 md:p-8">
        <CashRegisterLedgerView
          account={account}
          onBack={onClose}
        />
      </div>
    </div>
  );
};
