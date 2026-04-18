'use client';

import { cn } from '@/lib/utils';

type Props = {
  /** Sum of invoice amounts (grand totals) for lines on this receipt */
  totalInvoiceAmount: number;
  totalReceived: number;
  totalTds: number;
  totalDeduction: number;
  /** Received + TDS (applied toward invoices) */
  totalApplied: number;
  balanceRemaining: number;
  /** `wrap` = full-width chip row; `stack` = narrow sidebar list beside entry form */
  layout?: 'wrap' | 'stack';
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
    <div className="min-w-[100px] flex-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function StackRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: 'emerald' | 'amber' | 'slate';
}) {
  const valCls =
    emphasize === 'emerald'
      ? 'text-emerald-800'
      : emphasize === 'amber'
        ? 'text-amber-900'
        : 'text-slate-900';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 py-1.5 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-[11px] leading-tight text-slate-600">{label}</span>
      <span className={cn('text-right font-mono text-sm font-semibold tabular-nums', valCls)}>{value}</span>
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
  layout = 'wrap',
}: Props) {
  const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (layout === 'stack') {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-slate-100/80 p-3 shadow-inner ring-1 ring-slate-200/40">
        <div className="mb-2 shrink-0 border-b border-slate-200/80 pb-2 text-xs font-semibold text-slate-700">
          Totals
        </div>
        <div className="flex min-h-0 flex-1 flex-col text-xs">
          <StackRow label="Inv. amount" value={fmt(totalInvoiceAmount)} />
          <StackRow label="Cash / bank (received)" value={fmt(totalReceived)} emphasize="emerald" />
          <StackRow label="TDS" value={fmt(totalTds)} />
          <StackRow label="Deduction" value={fmt(totalDeduction)} />
          <StackRow label="Total applied (R + TDS)" value={fmt(totalApplied)} emphasize="emerald" />
          <StackRow label="Balance" value={fmt(balanceRemaining)} emphasize="amber" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-slate-100/80 p-2 shadow-inner">
      <div className="mb-1.5 text-xs font-semibold text-slate-700">Totals</div>
      <div className="flex flex-wrap gap-1.5">
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
