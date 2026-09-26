import React from 'react';

interface InvoiceBarcodeQRProps {
  invoiceNumber: string;
  date?: string;
  totalAmount?: number;
  currency?: string;
  partyName?: string;
  size?: number;
  type?: 'qr' | 'barcode' | 'both';
  className?: string;
}

export const InvoiceBarcodeQR: React.FC<InvoiceBarcodeQRProps> = ({
  invoiceNumber,
  date,
  totalAmount,
  currency = 'AFN',
  partyName,
  size = 56,
  type = 'qr',
  className = '',
}) => {
  // Deterministic pattern generator for authentic SVG QR Code look
  const qrMatrix = React.useMemo(() => {
    const seedStr = `${invoiceNumber}-${date || ''}-${totalAmount || 0}-${partyName || ''}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }

    const gridSize = 21; // standard Version 1 QR code size
    const matrix: boolean[][] = Array(gridSize)
      .fill(false)
      .map(() => Array(gridSize).fill(false));

    // Helper: Mark finder pattern (top-left, top-right, bottom-left)
    const setFinderPattern = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[r0 + r][c0 + c] = true;
          }
        }
      }
    };

    setFinderPattern(0, 0); // Top-left
    setFinderPattern(0, 14); // Top-right
    setFinderPattern(14, 0); // Bottom-left

    // Timing patterns
    for (let i = 8; i < 13; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Pseudo-random data modules seeded by invoice data
    let currentHash = Math.abs(hash) || 123456789;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder areas
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= 13;
        const inBottomLeft = r >= 13 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        // Skip timing lines
        if (r === 6 || c === 6) continue;

        currentHash = (currentHash * 9301 + 49297) % 233280;
        matrix[r][c] = currentHash % 3 !== 0;
      }
    }

    return matrix;
  }, [invoiceNumber, date, totalAmount, partyName]);

  // Deterministic bar widths for Code128 style Barcode
  const barcodeBars = React.useMemo(() => {
    const raw = `${invoiceNumber}${totalAmount ? Math.round(totalAmount) : ''}`;
    const bars: { width: number; isBlack: boolean }[] = [];
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    for (let i = 0; i < 32; i++) {
      const charCode = (raw.charCodeAt(i % raw.length) || 48) + i * 7;
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode >> 2) % 3) + 1;
      bars.push({ width: w1, isBlack: true });
      bars.push({ width: w2, isBlack: false });
    }

    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    return bars;
  }, [invoiceNumber, totalAmount]);

  if (type === 'barcode') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <svg
          width="130"
          height="32"
          viewBox="0 0 130 32"
          className="overflow-visible"
        >
          {(() => {
            let currentX = 5;
            return barcodeBars.map((bar, idx) => {
              const x = currentX;
              currentX += bar.width * 1.5;
              if (!bar.isBlack) return null;
              return (
                <rect
                  key={idx}
                  x={x}
                  y="2"
                  width={bar.width * 1.5}
                  height="26"
                  fill="#0f172a"
                />
              );
            });
          })()}
        </svg>
        <span className="font-mono text-[8px] font-bold text-slate-600 tracking-widest mt-0.5">
          *INV-{invoiceNumber}*
        </span>
      </div>
    );
  }

  // Default: QR Code
  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shadow-2xs select-none ${className}`}
      style={{ width: size + 8, height: size + 8 }}
      title={`کد امنیتی رهگیری فاکتور #${invoiceNumber}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 21 21"
        className="w-full h-full text-slate-900"
      >
        {qrMatrix.map((row, r) =>
          row.map((isBlack, c) =>
            isBlack ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width="1"
                height="1"
                fill="currentColor"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
