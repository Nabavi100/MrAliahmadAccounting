import React from 'react';
import { Invoice } from '../types';
import { DocumentPrintModal } from './DocumentPrintModal';

interface InvoicePrintModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <DocumentPrintModal
      document={{
        type: 'invoice',
        invoice,
      }}
      onClose={onClose}
    />
  );
};
