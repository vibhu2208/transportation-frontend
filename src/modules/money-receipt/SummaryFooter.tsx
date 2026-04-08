'use client';

type Props = {
  totalInvoiceAmount: number;
  totalReceived: number;
  totalTds: number;
  totalDeduction: number;
  finalNet: number;
  balanceRemaining: number;
};

function Row({ label, value, valueClassName = 'text-slate-900' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="border-b border-emerald-100/80 py-2.5 last:border-b-0">
      <div className="text-xs font-medium leading-snug text-slate-600">{label}</div>
      <div className={`mt-1 font-mono text-sm font-semibold tabular-nums leading-normal ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function SummaryFooter({
  totalInvoiceAmount,
  totalReceived,
  totalTds,
  totalDeduction,
  finalNet,
  balanceRemaining,
}: Props) {
  const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/95 p-4 shadow-md">
      <h3 className="border-b border-emerald-200/80 pb-2 text-sm font-semibold text-emerald-900">Summary</h3>
      <div className="mt-2" role="region" aria-label="Totals">
        <Row label="Total invoice (loaded)" value={fmt(totalInvoiceAmount)} />
        <Row label="Total received" value={fmt(totalReceived)} />
        <Row label="Total TDS" value={fmt(totalTds)} />
        <Row label="Total deduction" value={fmt(totalDeduction)} />
        <Row label="Net to allocation" value={fmt(finalNet)} valueClassName="text-emerald-800" />
        <Row label="Balance remaining (party)" value={fmt(balanceRemaining)} valueClassName="text-amber-800" />
      </div>
    </div>
  );
}
