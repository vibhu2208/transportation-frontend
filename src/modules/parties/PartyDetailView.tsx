'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  X,
  GitBranch,
  Plus,
  BookOpenText,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { partiesApi } from './api';
import type { PartyDetailResponse, PartyLedgerStatement, PartyLedgerSummary } from './types';

type Tab = 'overview' | 'ledger' | 'trips' | 'invoices' | 'grs' | 'receipts';

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

  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);
  const [newBranchLedger, setNewBranchLedger] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [newBranchGstIn, setNewBranchGstIn] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchOpeningType, setNewBranchOpeningType] = useState<'debit' | 'credit'>('debit');
  const [newBranchOpeningAmount, setNewBranchOpeningAmount] = useState('');
  const [newBranchOpeningDate, setNewBranchOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newBranchOpeningDesc, setNewBranchOpeningDesc] = useState('');
  const [activeLedgerBranchId, setActiveLedgerBranchId] = useState('');
  const [ledgerSummary, setLedgerSummary] = useState<PartyLedgerSummary | null>(null);
  const [ledgerStatement, setLedgerStatement] = useState<PartyLedgerStatement | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');
  const [openingType, setOpeningType] = useState<'debit' | 'credit'>('debit');
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingDescription, setOpeningDescription] = useState('');
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [noteType, setNoteType] = useState<'credit_note' | 'debit_note'>('credit_note');
  const [noteAmount, setNoteAmount] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteNo, setNoteNo] = useState('');
  const [noteDescription, setNoteDescription] = useState('');

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

  useEffect(() => {
    if (!branchFormOpen) {
      setNewBranchLedger('');
      setNewBranchLocation('');
      setNewBranchGstIn('');
      setNewBranchAddress('');
      setNewBranchOpeningType('debit');
      setNewBranchOpeningAmount('');
      setNewBranchOpeningDate(new Date().toISOString().slice(0, 10));
      setNewBranchOpeningDesc('');
      setBranchFormError(null);
    }
  }, [branchFormOpen]);

  useEffect(() => {
    if (!data) return;
    const first = data.partyBranches?.[0]?.id ?? '';
    setActiveLedgerBranchId((prev) => prev || first);
  }, [data]);

  useEffect(() => {
    if (tab !== 'ledger' || !activeLedgerBranchId) return;
    loadLedger(activeLedgerBranchId, { from: ledgerFrom, to: ledgerTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeLedgerBranchId]);

  const fmtMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtNum = (n: number | null | undefined) =>
    n == null || Number.isNaN(Number(n))
      ? '—'
      : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  async function downloadLedgerDocument() {
    if (!data?.party.id || !activeLedgerBranchId) return;
    try {
      const blob = await partiesApi.downloadPartyLedgerStatementPdf({
        partyId: data.party.id,
        partyBranchId: activeLedgerBranchId,
        from: ledgerFrom || undefined,
        to: ledgerTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `vardhman-ledger-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setLedgerError('Failed to download ledger document');
    }
  }

  const prettyTxnType = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'Opening Balance';
      case 'PAYMENT_RECEIVED':
        return 'Payment Received';
      case 'CREDIT_NOTE':
        return 'Credit Note';
      case 'DEBIT_NOTE':
        return 'Debit Note';
      case 'INVOICE':
        return 'Invoice';
      default:
        return type;
    }
  };

  async function loadLedger(branchId: string, opts?: { from?: string; to?: string }) {
    if (!data?.party.id || !branchId) return;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const [summary, statement] = await Promise.all([
        partiesApi.getPartyLedgerSummary(data.party.id, branchId),
        partiesApi.getPartyLedgerStatement({
          partyId: data.party.id,
          partyBranchId: branchId,
          from: opts?.from || undefined,
          to: opts?.to || undefined,
          page: 1,
          limit: 200,
        }),
      ]);
      setLedgerSummary(summary);
      setLedgerStatement(statement);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m = ax.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : m ?? 'Ledger not created for this branch yet';
      setLedgerSummary(null);
      setLedgerStatement(null);
      setLedgerError(msg);
    } finally {
      setLedgerLoading(false);
    }
  }

  async function handleCreateLedger(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.party.id || !activeLedgerBranchId) return;
    const amount = Number(openingAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLedgerError('Opening amount must be greater than 0');
      return;
    }
    setLedgerSaving(true);
    setLedgerError(null);
    try {
      await partiesApi.createPartyLedger({
        partyId: data.party.id,
        partyBranchId: activeLedgerBranchId,
        openingDate,
        openingType,
        amount,
        description: openingDescription.trim() || undefined,
      });
      await loadLedger(activeLedgerBranchId, { from: ledgerFrom, to: ledgerTo });
      setOpeningAmount('');
      setOpeningDescription('');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m = ax.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : m ?? 'Failed to create ledger';
      setLedgerError(msg);
    } finally {
      setLedgerSaving(false);
    }
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!ledgerSummary?.ledgerId) return;
    const amount = Number(noteAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLedgerError('Note amount must be greater than 0');
      return;
    }
    if (!noteNo.trim()) {
      setLedgerError('Note No. is required');
      return;
    }
    setLedgerSaving(true);
    setLedgerError(null);
    try {
      await partiesApi.createPartyLedgerEntry(ledgerSummary.ledgerId, {
        type: noteType,
        txnDate: noteDate,
        noteNo: noteNo.trim(),
        amount,
        description: noteDescription.trim() || undefined,
      });
      await loadLedger(activeLedgerBranchId, { from: ledgerFrom, to: ledgerTo });
      setNoteAmount('');
      setNoteNo('');
      setNoteDescription('');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m = ax.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : m ?? 'Failed to post note entry';
      setLedgerError(msg);
    } finally {
      setLedgerSaving(false);
    }
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    const ledger = newBranchLedger.trim();
    if (!ledger) {
      setBranchFormError('Ledger name is required.');
      return;
    }
    setBranchSaving(true);
    setBranchFormError(null);
    try {
      const openingAmount = Number(newBranchOpeningAmount);
      const hasOpening = newBranchOpeningAmount.trim().length > 0;
      if (hasOpening && (!Number.isFinite(openingAmount) || openingAmount <= 0)) {
        setBranchFormError('Opening amount must be greater than 0');
        setBranchSaving(false);
        return;
      }
      await partiesApi.createPartyBranch(partyId, {
        fullLedgerName: ledger,
        locationLabel: newBranchLocation.trim() || undefined,
        gstIn: newBranchGstIn.trim() || undefined,
        address: newBranchAddress.trim() || undefined,
        openingType: hasOpening ? newBranchOpeningType : undefined,
        openingAmount: hasOpening ? openingAmount : undefined,
        openingDate: hasOpening ? newBranchOpeningDate : undefined,
        openingDescription: hasOpening ? newBranchOpeningDesc.trim() || undefined : undefined,
      });
      const res = await partiesApi.getPartyDetail(partyId);
      setData(res);
      setBranchFormOpen(false);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const m = ax.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : m ?? 'Could not add branch';
      setBranchFormError(msg);
    } finally {
      setBranchSaving(false);
    }
  }

  const headerActions = (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Link
        href={`/admin/dashboard?tab=moneyReceipt&partyId=${encodeURIComponent(partyId)}`}
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
          ['ledger', 'Ledger'],
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
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <GitBranch className="h-4 w-4 shrink-0 text-emerald-700" />
                      Billing branches
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Each branch has its own ledger name and address on invoices. You can set a GSTIN per branch; if
                      empty, the party-level GSTIN is used.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                    onClick={() => setBranchFormOpen((o) => !o)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add branch
                  </Button>
                </div>

                {branchFormOpen && (
                  <form
                    onSubmit={handleAddBranch}
                    className="mb-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="pb-ledger" className="text-slate-700">
                          Ledger name (on invoice) <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="pb-ledger"
                          value={newBranchLedger}
                          onChange={(e) => setNewBranchLedger(e.target.value)}
                          placeholder="e.g. AMUL — Rudrapur unit"
                          className="mt-1"
                          disabled={branchSaving}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pb-location" className="text-slate-700">
                          Location label
                        </Label>
                        <Input
                          id="pb-location"
                          value={newBranchLocation}
                          onChange={(e) => setNewBranchLocation(e.target.value)}
                          placeholder="e.g. RUDRAPUR"
                          className="mt-1"
                          disabled={branchSaving}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pb-gst" className="text-slate-700">
                          GSTIN (optional)
                        </Label>
                        <Input
                          id="pb-gst"
                          value={newBranchGstIn}
                          onChange={(e) => setNewBranchGstIn(e.target.value)}
                          placeholder="Branch GST number"
                          className="mt-1 font-mono text-sm"
                          disabled={branchSaving}
                          autoComplete="off"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="pb-address" className="text-slate-700">
                          Branch address
                        </Label>
                        <Textarea
                          id="pb-address"
                          value={newBranchAddress}
                          onChange={(e) => setNewBranchAddress(e.target.value)}
                          placeholder="Billing address for this ledger"
                          rows={2}
                          className="mt-1 min-h-[72px] resize-y bg-white"
                          disabled={branchSaving}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pb-open-type" className="text-slate-700">
                          Opening type
                        </Label>
                        <select
                          id="pb-open-type"
                          className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                          value={newBranchOpeningType}
                          onChange={(e) => setNewBranchOpeningType(e.target.value as 'debit' | 'credit')}
                          disabled={branchSaving}
                        >
                          <option value="debit">Debit (party owes us)</option>
                          <option value="credit">Credit (we owe party)</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="pb-open-amount" className="text-slate-700">
                          Opening amount (optional)
                        </Label>
                        <Input
                          id="pb-open-amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={newBranchOpeningAmount}
                          onChange={(e) => setNewBranchOpeningAmount(e.target.value)}
                          placeholder="e.g. 10000"
                          className="mt-1"
                          disabled={branchSaving}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pb-open-date" className="text-slate-700">
                          Opening date
                        </Label>
                        <Input
                          id="pb-open-date"
                          type="date"
                          value={newBranchOpeningDate}
                          onChange={(e) => setNewBranchOpeningDate(e.target.value)}
                          className="mt-1"
                          disabled={branchSaving}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="pb-open-desc" className="text-slate-700">
                          Opening description
                        </Label>
                        <Input
                          id="pb-open-desc"
                          value={newBranchOpeningDesc}
                          onChange={(e) => setNewBranchOpeningDesc(e.target.value)}
                          placeholder="Opening balance at branch creation"
                          className="mt-1"
                          disabled={branchSaving}
                        />
                      </div>
                    </div>
                    {branchFormError && <p className="text-sm text-red-600">{branchFormError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={branchSaving}>
                        {branchSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          'Save branch'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={branchSaving}
                        onClick={() => setBranchFormOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {(data.branchBreakdown ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No activity by branch yet. Add a branch above, then assign trips to it from the trip list.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(data.branchBreakdown ?? []).map((row, idx) => (
                      <div
                        key={row.branch?.id ?? `unassigned-${idx}`}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {row.unassigned
                                ? 'Unassigned (no billing branch on trip/invoice)'
                                : row.branch?.locationLabel || row.branch?.fullLedgerName}
                            </p>
                            {!row.unassigned && row.branch?.locationLabel && (
                              <p className="text-xs text-slate-600">{row.branch.fullLedgerName}</p>
                            )}
                            {!row.unassigned && row.branch?.gstIn && (
                              <p className="mt-1 text-xs text-slate-600">
                                <Badge variant="outline" className="font-mono text-[11px]">
                                  GST {row.branch.gstIn}
                                </Badge>
                              </p>
                            )}
                            {!row.unassigned && row.branch?.address && (
                              <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">{row.branch.address}</p>
                            )}
                          </div>
                          <div className="text-right text-xs tabular-nums">
                            <div className="text-slate-500">Due (this branch)</div>
                            <div className="font-semibold text-amber-800">{fmtMoney(row.remainingBalance)}</div>
                            <div className="mt-1 text-slate-500">
                              {row.tripCount} trip{row.tripCount !== 1 ? 's' : ''} · {row.invoices.length} invoice
                              {row.invoices.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    <th className="px-3 py-2 font-medium text-slate-700">Branch</th>
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
                      <td colSpan={16} className="px-3 py-8 text-center text-slate-500">
                        No trips for this party.
                      </td>
                    </tr>
                  ) : (
                    data.trips.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{tr.tripNo}</td>
                        <td className="max-w-[160px] px-3 py-2 text-xs text-slate-700">
                          <div>{tr.branchLocationLabel || tr.branchLedgerName || '—'}</div>
                          {tr.branchGstIn && (
                            <div className="mt-0.5 font-mono text-[10px] text-slate-500">GST {tr.branchGstIn}</div>
                          )}
                        </td>
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

          {tab === 'ledger' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Branch-wise ledger</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label className="text-slate-700">Billing branch</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      value={activeLedgerBranchId}
                      onChange={(e) => {
                        setActiveLedgerBranchId(e.target.value);
                        setLedgerSummary(null);
                        setLedgerStatement(null);
                        setLedgerError(null);
                      }}
                    >
                      <option value="">Select branch</option>
                      {(data.partyBranches ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.locationLabel || b.fullLedgerName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-700">From</Label>
                    <Input type="date" className="mt-1" value={ledgerFrom} onChange={(e) => setLedgerFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-slate-700">To</Label>
                    <Input type="date" className="mt-1" value={ledgerTo} onChange={(e) => setLedgerTo(e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!activeLedgerBranchId || ledgerLoading}
                      onClick={() => loadLedger(activeLedgerBranchId, { from: ledgerFrom, to: ledgerTo })}
                    >
                      {ledgerLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        'Load ledger'
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!ledgerStatement || ledgerLoading}
                      onClick={downloadLedgerDocument}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Document
                    </Button>
                  </div>
                </div>
              </div>

              {ledgerError && <p className="text-sm text-red-600">{ledgerError}</p>}

              {ledgerSummary ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase text-slate-500">Opening</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{ledgerSummary.openingBalanceLabel}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase text-slate-500">Current</div>
                      <div className="mt-1 text-lg font-semibold text-amber-800">{ledgerSummary.currentBalanceLabel}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase text-slate-500">Last txn</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {ledgerSummary.lastTransactionDate
                          ? new Date(ledgerSummary.lastTransactionDate).toLocaleDateString('en-IN')
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleCreateNote} className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Post Credit/Debit Note</h4>
                    <div className="grid gap-3 sm:grid-cols-6">
                      <div className="sm:col-span-2">
                        <Label>Type</Label>
                        <select
                          className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                          value={noteType}
                          onChange={(e) => setNoteType(e.target.value as 'credit_note' | 'debit_note')}
                        >
                          <option value="credit_note">Credit Note</option>
                          <option value="debit_note">Debit Note</option>
                        </select>
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input type="date" className="mt-1" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <Input type="number" min="0.01" step="0.01" className="mt-1" value={noteAmount} onChange={(e) => setNoteAmount(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Note No.</Label>
                        <Input className="mt-1" value={noteNo} onChange={(e) => setNoteNo(e.target.value)} />
                      </div>
                      <div className="sm:col-span-6">
                        <Label>Description</Label>
                        <Input className="mt-1" value={noteDescription} onChange={(e) => setNoteDescription(e.target.value)} />
                      </div>
                    </div>
                    <Button type="submit" size="sm" className="mt-3" disabled={ledgerSaving}>
                      {ledgerSaving ? 'Saving…' : 'Post note'}
                    </Button>
                  </form>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                          <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Type</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Note/Ref No.</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Description</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Debit</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Credit</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Running</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ledgerStatement?.rows ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                              No ledger entries found.
                            </td>
                          </tr>
                        ) : (
                          ledgerStatement!.rows.map((row) => (
                            <tr key={row.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-slate-600">
                                {new Date(row.txnDate).toLocaleDateString('en-IN')}
                              </td>
                              <td className="px-3 py-2">{prettyTxnType(row.type)}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.referenceNo ?? '—'}</td>
                              <td className="px-3 py-2 text-xs">{row.description ?? '—'}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                                ₹{Number(row.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                                ₹{Number(row.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-800">
                                {row.runningBalanceLabel}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={4} className="px-3 py-2 text-right font-medium text-slate-700">
                            Totals
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800">
                            ₹{Number(ledgerStatement?.totals.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800">
                            ₹{Number(ledgerStatement?.totals.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-800">
                            {ledgerStatement?.totals.closingBalanceLabel ?? '—'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <form onSubmit={handleCreateLedger} className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-900">Create Ledger with Opening Balance</h4>
                  <div className="grid gap-3 sm:grid-cols-5">
                    <div>
                      <Label>Opening type</Label>
                      <select
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                        value={openingType}
                        onChange={(e) => setOpeningType(e.target.value as 'debit' | 'credit')}
                      >
                        <option value="debit">Debit (Party owes us)</option>
                        <option value="credit">Credit (We owe party)</option>
                      </select>
                    </div>
                    <div>
                      <Label>Opening date</Label>
                      <Input type="date" className="mt-1" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input type="number" min="0.01" step="0.01" className="mt-1" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Description</Label>
                      <Input className="mt-1" value={openingDescription} onChange={(e) => setOpeningDescription(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="mt-3" disabled={!activeLedgerBranchId || ledgerSaving}>
                    {ledgerSaving ? 'Creating…' : 'Create ledger'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">Invoice</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Branch</th>
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
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        No invoices for this party.
                      </td>
                    </tr>
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNo}</td>
                        <td className="max-w-[160px] px-3 py-2 text-xs text-slate-700">
                          {(data.partyBranches ?? []).find((b) => b.id === inv.partyBranchId)?.locationLabel ||
                            (data.partyBranches ?? []).find((b) => b.id === inv.partyBranchId)?.fullLedgerName ||
                            '—'}
                        </td>
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">GR No. / CN No.</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Party Bill No.</th>
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
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No goods receipts for this party&apos;s trips.
                      </td>
                    </tr>
                  ) : (
                    data.goodsReceipts.map((gr) => (
                      <tr key={gr.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{gr.grNo || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{gr.partyBillNo || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {gr.grDate ? new Date(gr.grDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="max-w-[200px] px-3 py-2 text-xs text-slate-700">
                          {(gr.fromStation || '—') + ' → ' + (gr.toStation || '—')}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{gr.tripNo}</td>
                        <td className="px-3 py-2 font-mono text-xs">{gr.invoiceNo ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-slate-600">
                          {gr.freight != null && gr.freight !== undefined
                            ? `₹${Number(gr.freight).toLocaleString('en-IN')}`
                            : '—'}
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
