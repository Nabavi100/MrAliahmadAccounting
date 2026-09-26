import React, { useMemo } from 'react';
import { Party, Invoice, FinancialTransaction, CompanySettings, Currency } from '../../types';
import { formatNumber, formatCurrency, getPersianDate, cleanCardexDescription } from '../../utils/formatters';

interface PrintPartyStatementProps {
  party: Party;
  partyInvoices?: Invoice[];
  partyTransactions?: FinancialTransaction[];
  companySettings: CompanySettings;
  showSignatures?: boolean;
  selectedCurrency?: string; // 'AFN' | 'USD' | 'all' or specific currency
}

interface StatementEntry {
  id: string;
  date: string;
  time?: string;
  docNumber: string;
  typeLabel: string;
  description: string;
  debit: number;   // بدهکار (فروش به مشتری یا پرداخت به تامین کننده)
  credit: number;  // بستانکار (دریافت از مشتری یا خرید از تامین کننده)
  currency: Currency;
  runningBalance?: number;
  runningBalanceAFN?: number;
  runningBalanceUSD?: number;
  isExchange?: boolean;
  exchangeRate?: number;
  cashAmount?: number;
  cashCurrency?: Currency;
}

export const PrintPartyStatement: React.FC<PrintPartyStatementProps> = ({
  party,
  partyInvoices = [],
  partyTransactions = [],
  companySettings,
  showSignatures = true,
  selectedCurrency = 'all',
}) => {
  const { entries, totalDebit, totalCredit, finalBalance, totalDebitAFN, totalCreditAFN, totalDebitUSD, totalCreditUSD, finalBalanceAFN, finalBalanceUSD } = useMemo(() => {
    const list: StatementEntry[] = [];

    // 1. Initial Opening Balance
    if (party.initialBalanceAFN && Math.abs(party.initialBalanceAFN) > 0.01) {
      const isPositive = party.initialBalanceAFN > 0;
      list.push({
        id: `opening-afn-${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : '1403/01/01',
        time: '08:00',
        docNumber: 'تراز افتتاحیه',
        typeLabel: 'مانده اولیه حساب',
        description: isPositive ? 'طلب اولیه ما از مشتری قبل از شروع دوره' : 'بستانکاری اولیه مشتری قبل از دوره',
        debit: isPositive ? party.initialBalanceAFN : 0,
        credit: !isPositive ? Math.abs(party.initialBalanceAFN) : 0,
        currency: 'AFN',
      });
    }

    if (party.initialBalanceUSD && Math.abs(party.initialBalanceUSD) > 0.01) {
      const isPositive = party.initialBalanceUSD > 0;
      list.push({
        id: `opening-usd-${party.id}`,
        date: party.createdAt ? party.createdAt.split('T')[0] : '1403/01/01',
        time: '08:00',
        docNumber: 'تراز افتتاحیه',
        typeLabel: 'مانده اولیه دلاری',
        description: isPositive ? 'طلب اولیه دلاری قبل از دوره' : 'بستانکاری اولیه دلاری قبل از دوره',
        debit: isPositive ? party.initialBalanceUSD : 0,
        credit: !isPositive ? Math.abs(party.initialBalanceUSD) : 0,
        currency: 'USD',
      });
    }

    // 2. Invoices
    partyInvoices.forEach(inv => {
      const isSale = inv.type === 'sell';
      const itemsSummary = inv.items?.map(i => `${i.productName} (${formatNumber(i.quantity)} ${i.unit === 'ton' ? 'تن' : 'کیسه'})`).join('، ') || 'فروش کالا';

      list.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        time: inv.issueTime,
        docNumber: `فاکتور ${inv.invoiceNumber}`,
        typeLabel: isSale ? 'فاکتور فروش' : 'فاکتور خرید',
        description: `${isSale ? 'فروش اقلام:' : 'خرید اقلام:'} ${itemsSummary}`,
        debit: isSale ? inv.totalAmount : 0,
        credit: !isSale ? inv.totalAmount : 0,
        currency: inv.currency,
      });

      // Upfront cash payment attached to invoice
      if (inv.paidAmount && inv.paidAmount > 0) {
        list.push({
          id: `inv-cash-${inv.id}`,
          date: inv.date,
          time: inv.issueTime,
          docNumber: `نقد-${inv.invoiceNumber}`,
          typeLabel: isSale ? 'پرداخت نقدی سر فاکتور' : 'پیش‌پرداخت نقدی خرید',
          description: `تسویه نقدی بابت فاکتور ${inv.invoiceNumber}`,
          debit: !isSale ? inv.paidAmount : 0,
          credit: isSale ? inv.paidAmount : 0,
          currency: inv.currency,
        });
      }
    });

    // 3. Transactions (payments & receipts not attached to invoice, including exchange mode)
    partyTransactions
      .filter(tx => !tx.invoiceId && !tx.id.startsWith('tx-inv-'))
      .forEach(tx => {
        const isReceive = tx.type === 'receive_payment';
        const isExch = !!tx.isExchange || tx.type === 'currency_exchange';
        let typeLbl = isReceive ? 'رسید دریافت وجه (صندوق)' : 'سند پرداخت وجه (صندوق)';
        if (isExch) {
          typeLbl = isReceive ? 'دریافت با تسویه اکسچنج' : 'پرداخت با تسویه اکسچنج';
        }

        let desc = tx.description || (isReceive ? 'دریافت وجه از طرف حساب' : 'پرداخت وجه به طرف حساب');
        if (isExch && tx.cashAmount && tx.cashCurrency && tx.cashCurrency !== tx.currency) {
          desc += ` [تبدیل نقدی: ${formatNumber(tx.cashAmount)} ${tx.cashCurrency === 'AFN' ? 'افغانی' : 'دالر'}${tx.exchangeRate ? ` به نرخ ${tx.exchangeRate}` : ''}]`;
        }

        list.push({
          id: `tx-${tx.id}`,
          date: tx.date,
          time: tx.issueTime,
          docNumber: `سند ${tx.transactionNumber}`,
          typeLabel: typeLbl,
          description: desc,
          debit: !isReceive ? tx.amount : 0,
          credit: isReceive ? tx.amount : 0,
          currency: tx.currency,
          isExchange: isExch,
          exchangeRate: tx.exchangeRate,
          cashAmount: tx.cashAmount,
          cashCurrency: tx.cashCurrency,
        });
      });

    // Sort chronologically
    list.sort((a, b) => {
      const dateA = `${a.date} ${a.time || '00:00'}`;
      const dateB = `${b.date} ${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    // Calculate running balance for all
    let runAFN = 0;
    let runUSD = 0;
    let debAFN = 0;
    let credAFN = 0;
    let debUSD = 0;
    let credUSD = 0;

    list.forEach(entry => {
      if (entry.currency === 'AFN') {
        debAFN += entry.debit;
        credAFN += entry.credit;
        runAFN += (entry.debit - entry.credit);
        entry.runningBalanceAFN = runAFN;
      } else {
        debUSD += entry.debit;
        credUSD += entry.credit;
        runUSD += (entry.debit - entry.credit);
        entry.runningBalanceUSD = runUSD;
      }
    });

    // If a specific currency was selected, filter and compute pure single-currency running balance
    if (selectedCurrency && selectedCurrency !== 'all') {
      const filtered = list.filter(e => e.currency === selectedCurrency);
      let curRun = 0;
      let curDeb = 0;
      let curCred = 0;
      filtered.forEach(entry => {
        curDeb += entry.debit;
        curCred += entry.credit;
        curRun += (entry.debit - entry.credit);
        entry.runningBalance = curRun;
      });

      return {
        entries: filtered,
        totalDebit: curDeb,
        totalCredit: curCred,
        finalBalance: curRun,
        totalDebitAFN: debAFN,
        totalCreditAFN: credAFN,
        totalDebitUSD: debUSD,
        totalCreditUSD: credUSD,
        finalBalanceAFN: runAFN,
        finalBalanceUSD: runUSD,
      };
    }

    return {
      entries: list,
      totalDebit: debAFN + debUSD,
      totalCredit: credAFN + credUSD,
      finalBalance: runAFN,
      totalDebitAFN: debAFN,
      totalCreditAFN: credAFN,
      totalDebitUSD: debUSD,
      totalCreditUSD: credUSD,
      finalBalanceAFN: runAFN,
      finalBalanceUSD: runUSD,
    };
  }, [party, partyInvoices, partyTransactions, selectedCurrency]);

  const isSingleCurrency = selectedCurrency && selectedCurrency !== 'all';
  const currencyLabel = isSingleCurrency
    ? selectedCurrency === 'AFN'
      ? 'افغانی (AFN)'
      : selectedCurrency === 'USD'
      ? 'دالر آمریکا (USD)'
      : selectedCurrency
    : 'کلیه ارزها (تجمیعی)';

  return (
    <div className="relative z-10 space-y-3 font-sans text-slate-900 printable-content">
      {/* 1. Official Header */}
      <div className="p-3.5 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name}
              className="w-14 h-14 object-contain rounded-lg bg-white border border-slate-300 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xs">
              {companySettings.logoIconText || 'ن'}
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {companySettings.name}
            </h1>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              صورت‌حساب و کارتکس مالی طرف حساب (دفتر معین / تفصیلی)
              {isSingleCurrency && (
                <span className="font-bold text-blue-800 mr-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  حساب ارزی: {currencyLabel}
                </span>
              )}
            </p>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              تلفن: {companySettings.phone || '---'} {companySettings.address ? `• آدرس: ${companySettings.address}` : ''}
            </div>
          </div>
        </div>

        <div className="text-left font-mono shrink-0 flex flex-col items-end">
          <span className="inline-block text-[11px] font-black px-3 py-1 rounded-lg bg-slate-900 text-white">
            صورت‌حساب مالی {isSingleCurrency ? selectedCurrency : ''}
          </span>
          <div className="text-xs font-black text-slate-900 mt-1">
            کد مشتری: #{party.code || party.id.slice(0, 6)}
          </div>
          <div className="text-[10px] text-slate-600 font-sans mt-0.5">
            تاریخ چاپ: {getPersianDate()}
          </div>
        </div>
      </div>

      {/* 2. Party Information Card */}
      <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-3.5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">نام طرف حساب / مشتری:</span>
            <strong className="text-sm font-black text-slate-900">{party.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">شماره تماس / موبایل:</span>
            <span className="font-bold text-slate-800 font-mono text-xs">{party.phone || '---'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">گروه طرف حساب:</span>
            <span className="font-bold text-slate-800">{party.groupName || 'مشتریان عادی'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10.5px] font-bold mb-0.5">آدرس / ولایت:</span>
            <span className="font-medium text-slate-700">{party.address || 'ثبت نشده'}</span>
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      {isSingleCurrency ? (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white border-2 border-slate-300 rounded-xl p-2.5 text-center shadow-2xs">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مانده نهایی {currencyLabel}:</span>
            <strong className={`text-base font-black font-mono ${finalBalance > 0 ? 'text-rose-700' : finalBalance < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {formatCurrency(Math.abs(finalBalance), selectedCurrency)}
            </strong>
            <span className="block text-[9.5px] font-bold text-slate-500 mt-0.5">
              {finalBalance > 0 ? '(بدهکار به ما)' : finalBalance < 0 ? '(بستانکار از ما)' : '(حساب تسویه)'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مجموع گردش بدهکار:</span>
            <strong className="text-sm font-black text-rose-700 font-mono block">
              {formatCurrency(totalDebit, selectedCurrency)}
            </strong>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مجموع گردش بستانکار:</span>
            <strong className="text-sm font-black text-emerald-700 font-mono block">
              {formatCurrency(totalCredit, selectedCurrency)}
            </strong>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white border-2 border-slate-300 rounded-xl p-2.5 text-center shadow-2xs">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مانده نهایی افغانی:</span>
            <strong className={`text-base font-black font-mono ${finalBalanceAFN > 0 ? 'text-rose-700' : finalBalanceAFN < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {formatCurrency(Math.abs(finalBalanceAFN), 'AFN')}
            </strong>
            <span className="block text-[9.5px] font-bold text-slate-500 mt-0.5">
              {finalBalanceAFN > 0 ? '(بدهکار به ما)' : finalBalanceAFN < 0 ? '(بستانکار از ما)' : '(حساب تسویه)'}
            </span>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-xl p-2.5 text-center shadow-2xs">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مانده نهایی دلاری:</span>
            <strong className={`text-base font-black font-mono ${finalBalanceUSD > 0 ? 'text-rose-700' : finalBalanceUSD < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {formatCurrency(Math.abs(finalBalanceUSD), 'USD')}
            </strong>
            <span className="block text-[9.5px] font-bold text-slate-500 mt-0.5">
              {finalBalanceUSD > 0 ? '(بدهکار به ما)' : finalBalanceUSD < 0 ? '(بستانکار از ما)' : '(حساب تسویه)'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مجموع گردش بدهکار:</span>
            <strong className="text-xs font-black text-rose-700 font-mono block">
              {formatCurrency(totalDebitAFN, 'AFN')}
            </strong>
            {totalDebitUSD > 0 && (
              <span className="text-xs font-bold text-rose-700 font-mono block">
                {formatCurrency(totalDebitUSD, 'USD')}
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center">
            <span className="text-[10.5px] text-slate-600 block font-bold mb-0.5">مجموع گردش بستانکار:</span>
            <strong className="text-xs font-black text-emerald-700 font-mono block">
              {formatCurrency(totalCreditAFN, 'AFN')}
            </strong>
            {totalCreditUSD > 0 && (
              <span className="text-xs font-bold text-emerald-700 font-mono block">
                {formatCurrency(totalCreditUSD, 'USD')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Complete Detailed Ledger Table */}
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-right border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-900 text-white font-black">
              <th className="p-2 border border-slate-700 text-center w-10">ردیف</th>
              <th className="p-2 border border-slate-700 text-center w-24">تاریخ</th>
              <th className="p-2 border border-slate-700 text-center w-28">نوع سند</th>
              <th className="p-2 border border-slate-700 text-center w-24">شماره سند</th>
              <th className="p-2 border border-slate-700 text-right">شرح عملیات / اقلام کالا</th>
              {!isSingleCurrency && (
                <th className="p-2 border border-slate-700 text-center w-14">ارز</th>
              )}
              <th className="p-2 border border-slate-700 text-center w-24">بدهکار (+)</th>
              <th className="p-2 border border-slate-700 text-center w-24">بستانکار (-)</th>
              <th className="p-2 border border-slate-700 text-center w-28">مانده ردیف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={isSingleCurrency ? 8 : 9} className="p-8 text-center text-slate-400 font-bold">
                  هیچ سابقه گردش حساب، فاکتور یا پرداختی برای این طرف حساب با ارز انتخابی ثبت نشده است.
                </td>
              </tr>
            ) : (
              entries.map((item, idx) => {
                const bal = isSingleCurrency
                  ? (item.runningBalance ?? 0)
                  : item.currency === 'AFN'
                  ? (item.runningBalanceAFN || 0)
                  : (item.runningBalanceUSD || 0);
                return (
                  <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap text-slate-800 font-bold">
                      {item.date}
                      {item.time && <div className="text-[9px] text-slate-400">{item.time}</div>}
                    </td>
                    <td className="p-2 border border-slate-200 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        item.isExchange
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        {item.typeLabel}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                      {item.docNumber}
                    </td>
                    <td className="p-2 border border-slate-200 text-slate-800 text-[10px] leading-tight font-medium max-w-[200px]" title={item.description}>
                      <div className="truncate">{cleanCardexDescription(item.description, 42)}</div>
                      {item.isExchange && item.cashAmount && item.cashCurrency && (
                        <div className="text-[9px] text-purple-700 font-mono mt-0.5">
                          تبدیل نقدی: {formatNumber(item.cashAmount)} {item.cashCurrency} {item.exchangeRate ? `(نرخ: ${item.exchangeRate})` : ''}
                        </div>
                      )}
                    </td>
                    {!isSingleCurrency && (
                      <td className="p-2 border border-slate-200 text-center font-mono font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] ${
                          item.currency === 'USD' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.currency}
                        </span>
                      </td>
                    )}
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                      {item.debit > 0 ? formatCurrency(item.debit, item.currency) : '-'}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {item.credit > 0 ? formatCurrency(item.credit, item.currency) : '-'}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-black whitespace-nowrap bg-slate-50/50">
                      <div className={bal > 0 ? 'text-rose-800' : bal < 0 ? 'text-emerald-800' : 'text-slate-700'}>
                        {formatCurrency(Math.abs(bal), item.currency)}
                      </div>
                      <span className="text-[8.5px] font-sans font-bold text-slate-400">
                        {bal > 0 ? '(بدهکار)' : bal < 0 ? '(بستانکار)' : '(تسویه)'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Signatures Block */}
      {showSignatures && (
        <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-slate-300 text-center text-[10.5px]">
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تنظیم‌کننده حسابداری</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              امور مالی و سیستم حسابداری
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید مدیریت مالی</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              مدیریت امور مالی {companySettings.name}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-8 font-bold">تأیید و امضای طرف حساب / مشتری</span>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-black">
              {party.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
