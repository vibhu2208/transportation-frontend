'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Phone, Mail, MapPin, IndianRupee, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { partiesApi } from './api';
import type { PartyDetailResponse } from './types';

type Tab = 'overview' | 'trips' | 'invoices' | 'grs' | 'receipts';

type Props =
  | {
      mode: 'page';
      partyId: string;
      backHref?: string;
    }
  | {
      mode: 'overlay';
      partyId: string;
      onClose: () => void;
    };

export function PartyDetailView(props: Props) {
  const { partyId, mode } = props;
  const backHref = mode === 'page' ? props.backHref ?? '/admin/dashboard?tab=parties' : undefined;
  const onClose = mode === 'overlay' ? props.onClose : undefined;

  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<PartyDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTab('overview');
      try {
        const res = await partiesApi.getPartyDetail(partyId);
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setError('Failed to load party details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  const fmtMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtNum = (n: number | null | undefined) =>
    n == null || Number.isNaN(Number(n))
      ? '—'
      : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const headerActions = (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Link
        href={`/admin/dashboard/money-receipts?partyId=${encodeURIComponent(partyId)}`}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50"
      >
        <IndianRupee className="mr-1.5 h-4 w-4" />
        Record payment
      </Link>
      {mode === 'overlay' && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  const titleBlock = (
    <div className="min-w-0">
      {mode === 'page' && backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to parties
        </Link>
      )}
      <h1 id="party-detail-title" className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">
        {data?.party.name ?? 'Party'}
      </h1>
      <p className="text-sm text-slate-500">Party details & activity</p>
    </div>
  );

  const tabNav = data && (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
      {(
        [
          ['overview', 'Overview'],
          ['trips', `Trips (${data.trips.length})`],
          ['invoices', `Invoices (${data.invoices.length})`],
          ['grs', `GRs (${data.goodsReceipts.length})`],
          ['receipts', `Money receipts (${data.moneyReceipts.length})`],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setTab(key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const body = (
    <>
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        </div>
      )}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {!loading && data && (
        <>
          {tabNav}

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">Remaining</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-amber-800">
                    {fmtMoney(data.summary.remainingBalance)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">Trips</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{data.summary.totalTrips}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">Invoices</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{data.summary.totalInvoices}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase text-slate-500">GR records</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{data.summary.goodsReceiptCount}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Contact</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  {data.party.gstIn && (
                    <div>
                      <Badge variant="outline">GST {data.party.gstIn}</Badge>
                    </div>
                  )}
                  {data.party.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {data.party.phone}
                    </div>
                  )}
                  {data.party.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {data.party.email}
                    </div>
                  )}
                  {data.party.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{data.party.address}</span>
                    </div>
                  )}
                  {!data.party.phone && !data.party.email && !data.party.address && !data.party.gstIn && (
                    <p className="text-slate-500">No contact details on file.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'trips' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">Trip no.</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Route</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Vehicle</th>
                    <th className="px-3 py-2 font-medium text-slate-700">GR/LR</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Vendor</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Freight</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Advance</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Expense</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">P/L</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Invoice</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">GRs</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Driver</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trips.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-3 py-8 text-center text-slate-500">
                        No trips for this party.
                      </td>
                    </tr>
                  ) : (
                    data.trips.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{tr.tripNo}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {new Date(tr.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="max-w-[200px] px-3 py-2 text-xs text-slate-700">
                          <span className="line-clamp-3">
                            {(tr.fromLocation || '—') + ' → ' + (tr.toLocation || '—')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{tr.vehicleNumber}</td>
                        <td className="max-w-[100px] px-3 py-2 font-mono text-[11px] text-slate-600">
                          {tr.grLrNo ?? '—'}
                        </td>
                        <td className="max-w-[120px] px-3 py-2 text-xs">{tr.vendorName}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {tr.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtNum(tr.freight)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtNum(tr.advance)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtNum(tr.totalExpense)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-800">{fmtNum(tr.profitLoss)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{tr.invoiceNo ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{tr.goodsReceiptCount}</td>
                        <td className="max-w-[140px] px-3 py-2 text-xs text-slate-600">
                          {tr.driverName || '—'}
                          {tr.driverPhone ? (
                            <span className="block text-[11px] text-slate-500">{tr.driverPhone}</span>
                          ) : null}
                        </td>
                        <td className="max-w-[200px] px-3 py-2 text-xs text-slate-600">
                          <span className="line-clamp-4 whitespace-pre-wrap break-words">{tr.remarks || '—'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">Invoice</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Grand total</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Paid</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Due</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Trips</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No invoices for this party.
                      </td>
                    </tr>
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNo}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(inv.grandTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {fmtMoney(inv.paidTotal)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-800">
                          {fmtMoney(inv.remaining)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{inv.tripCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'grs' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">GR / CN</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Route</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Trip</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Invoice</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Freight</th>
                  </tr>
                </thead>
                <tbody>
                  {data.goodsReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No goods receipts for this party&apos;s trips.
                      </td>
                    </tr>
                  ) : (
                    data.goodsReceipts.map((gr) => (
                      <tr key={gr.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{gr.grNo || gr.cnNo || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {gr.cnDate ? new Date(gr.cnDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="max-w-[200px] px-3 py-2 text-xs text-slate-700">
                          {(gr.fromStation || '—') + ' → ' + (gr.toStation || '—')}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{gr.tripNo}</td>
                        <td className="px-3 py-2 font-mono text-xs">{gr.invoiceNo ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-slate-600">
                          {gr.totalFreight || gr.freight || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'receipts' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">Receipt</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Amount</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Mode</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {data.moneyReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No money receipts recorded for this party.
                      </td>
                    </tr>
                  ) : (
                    data.moneyReceipts.map((mr) => (
                      <tr key={mr.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{mr.receiptNo}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {new Date(mr.receiptDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(mr.totalReceived)}</td>
                        <td className="px-3 py-2">{mr.paymentMode}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-xs">
                            {mr.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{mr.allocationCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );

  if (mode === 'page') {
    return (
      <div className="min-h-screen bg-slate-50/80">
        <div className="border-b border-slate-200/80 bg-white shadow-sm">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {titleBlock}
              {headerActions}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{body}</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="party-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="relative mt-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4">
          {titleBlock}
          {headerActions}
        </div>
        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 pb-6 pt-4">{body}</div>
      </div>
    </div>
  );
}
