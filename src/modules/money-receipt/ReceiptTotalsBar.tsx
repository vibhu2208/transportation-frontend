'use client';

type Props = {
  /** Sum of invoice amounts (grand totals) for lines on this receipt */
  totalInvoiceAmount: number;
  totalReceived: number;
  totalTds: number;
  totalDeduction: number;
  /** Received + TDS (applied toward invoices) */
  totalApplied: number;
  balanceRemaining: number;
};

function Cell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: 'emerald' | 'amber' | 'slate';
}) {
  const cls =
    emphasize === 'emerald'
      ? 'text-emerald-800'
      : emphasize === 'amber'
        ? 'text-amber-900'
        : 'text-slate-900';
  return (
    <div className="min-w-[100px] flex-1 rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

export function ReceiptTotalsBar({
  totalInvoiceAmount,
  totalReceived,
  totalTds,
  totalDeduction,
  totalApplied,
  balanceRemaining,
}: Props) {
  const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-slate-100/80 p-3 shadow-inner">
      <div className="mb-2 text-xs font-semibold text-slate-700">Totals</div>
      <div className="flex flex-wrap gap-2">
        <Cell label="Inv. amount" value={fmt(totalInvoiceAmount)} />
        <Cell label="Cash / bank (received)" value={fmt(totalReceived)} emphasize="emerald" />
        <Cell label="TDS" value={fmt(totalTds)} />
        <Cell label="Deduction" value={fmt(totalDeduction)} />
        <Cell label="Total applied (R + TDS)" value={fmt(totalApplied)} emphasize="emerald" />
        <Cell label="Balance" value={fmt(balanceRemaining)} emphasize="amber" />
      </div>
    </div>
  );
}
