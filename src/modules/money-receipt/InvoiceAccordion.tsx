'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { InvoiceGrLinesResponse, SettlementLine } from './types';
import { lineKey as makeLineKey } from './lineKey';
import type { Invoice } from '../invoices/types';

type LineVals = { received: string; tds: string; deduction: string };

type Props = {
  invoices: Invoice[];
  lineDataByInvoice: Record<string, InvoiceGrLinesResponse | undefined>;
  expandedIds: Set<string>;
  onToggle: (invoiceId: string) => void;
  lineVals: Record<string, LineVals>;
  onLineReceivedChange: (line: SettlementLine, raw: string) => void;
  onLineTdsChange: (line: SettlementLine, raw: string) => void;
  onLineDeductionChange: (line: SettlementLine, raw: string) => void;
  onAutoAllocate: (invoiceId: string) => void;
};

export function InvoiceAccordion({
  invoices,
  lineDataByInvoice,
  expandedIds,
  onToggle,
  lineVals,
  onLineReceivedChange,
  onLineTdsChange,
  onLineDeductionChange,
  onAutoAllocate,
}: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
        No pending invoices for this party, or still loading.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const data = lineDataByInvoice[inv.id];
        const expanded = expandedIds.has(inv.id);
        const paid = inv.paidTotal ?? 0;
        const remaining = inv.remaining ?? Math.max(0, Math.round((inv.grandTotal - paid) * 100) / 100);

        return (
          <div
            key={inv.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onToggle(inv.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{inv.invoiceNo}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">
                  Total ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Due ₹
                  {remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAutoAllocate(inv.id);
                  }}
                >
                  Auto allocate
                </button>
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                )}
              </div>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-slate-100 px-2 pb-4 pt-1 sm:px-4">
                  {!data ? (
                    <p className="py-4 text-center text-sm text-slate-500">Loading lines…</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-600">
                            <th className="px-2 py-2 font-medium">GR No</th>
                            <th className="px-2 py-2 font-medium">Date</th>
                            <th className="px-2 py-2 font-medium">From → To</th>
                            <th className="px-2 py-2 text-right font-medium">Freight</th>
                            <th className="px-2 py-2 text-right font-medium">Pending</th>
                            <th className="px-2 py-2 text-right font-medium">Received</th>
                            <th className="px-2 py-2 text-right font-medium">TDS</th>
                            <th className="px-2 py-2 text-right font-medium">Deduction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.lines.map((line) => {
                            const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
                            const v = lineVals[k] ?? { received: '', tds: '', deduction: '' };
                            return (
                              <tr key={k} className="border-b border-slate-100 last:border-0">
                                <td className="px-2 py-2 font-mono text-xs">{line.grNo}</td>
                                <td className="px-2 py-2 text-xs text-slate-600">
                                  {line.date
                                    ? new Date(line.date).toLocaleDateString('en-IN')
                                    : '—'}
                                </td>
                                <td className="max-w-[200px] px-2 py-2 text-xs text-slate-700">
                                  {line.fromLocation} → {line.toLocation}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">
                                  ₹{line.freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-amber-800">
                                  ₹{line.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="h-8 rounded-md text-right tabular-nums"
                                    value={v.received}
                                    onChange={(e) => onLineReceivedChange(line, e.target.value)}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="h-8 rounded-md text-right tabular-nums"
                                    value={v.tds}
                                    onChange={(e) => onLineTdsChange(line, e.target.value)}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="h-8 rounded-md text-right tabular-nums"
                                    value={v.deduction}
                                    onChange={(e) => onLineDeductionChange(line, e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
