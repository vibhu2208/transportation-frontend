'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReceiptForm } from './ReceiptForm';
import { ReceiptTotalsBar } from './ReceiptTotalsBar';
import { partiesApi } from '../parties/api';
import { invoicesApi } from '../invoices/api';
import { moneyReceiptApi } from './api';
import type { Party } from '../parties/types';
import type { Invoice } from '../invoices/types';
import type { ReceiptMappingRow, MoneyReceiptListItem } from './types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Trash2,
  ListTree,
  ChevronDown,
  ChevronUp,
  WalletCards,
  RefreshCw,
  Download,
  Search,
  X,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function computeTds(received: number, pct: number, round: boolean): number {
  if (!pct || received <= 0) return 0;
  const raw = (received * pct) / 100;
  return round ? Math.round(raw) : Math.round(raw * 100) / 100;
}

function computeTdsOnInvoiceTotal(invoiceTotal: number, pct: number, round: boolean): number {
  if (!pct || invoiceTotal <= 0) return 0;
  const raw = (invoiceTotal * pct) / 100;
  return round ? Math.round(raw) : Math.round(raw * 100) / 100;
}

function uniqueTripStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = (v ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** GR numbers from linked GoodsReceipt rows; fallback to trip grLrNo. */
function invoiceGrDisplay(inv: Invoice): string {
  const trips = inv.trips ?? [];
  const fromGr = uniqueTripStrings(trips.flatMap((t) => (t.goodsReceipts ?? []).map((g) => g.grNo)));
  if (fromGr.length) return fromGr.join(' · ');
  const fallback = uniqueTripStrings(trips.map((t) => t.grLrNo));
  return fallback.length ? fallback.join(' · ') : '—';
}

/** MR receipt numbers already posted against this invoice (from API batch aggregate). */
function invoiceMrDisplay(inv: Invoice): string {
  const mrs = inv.moneyReceipts ?? [];
  const nos = uniqueTripStrings(mrs.map((m) => m.receiptNo));
  return nos.length ? nos.join(' · ') : '—';
}

/** Vehicle numbers from linked trips (for invoice picker). */
function invoiceTripLabels(inv: Invoice): { grLr: string; vehicles: string } {
  const trips = inv.trips ?? [];
  const vehs = uniqueTripStrings(trips.map((t) => t.vehicleNumber));
  return {
    grLr: invoiceGrDisplay(inv),
    vehicles: vehs.length ? vehs.join(' · ') : '—',
  };
}

export default function MoneyReceiptPage() {
  const searchParams = useSearchParams();
  const prePartyId = searchParams.get('partyId') ?? '';

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [mrListRows, setMrListRows] = useState<MoneyReceiptListItem[]>([]);
  const [mrListLoading, setMrListLoading] = useState(false);
  const [mrListSearch, setMrListSearch] = useState('');
  const [selectedMrDetail, setSelectedMrDetail] = useState<Awaited<
    ReturnType<typeof moneyReceiptApi.getOne>
  > | null>(null);
  const [mrDetailLoadingId, setMrDetailLoadingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState(prePartyId);
  const [partyLocked, setPartyLocked] = useState(false);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [extraInvoices, setExtraInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, { received: string; tds: string; deduction: string }>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({});

  const [entryInvoiceId, setEntryInvoiceId] = useState('');
  const [entryReceived, setEntryReceived] = useState('');
  const [entryTds, setEntryTds] = useState('');
  const [entryDeduction, setEntryDeduction] = useState('');
  const [entryLineRemark, setEntryLineRemark] = useState('');

  const [branches, setBranches] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; isActive: boolean }[]>([]);

  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [bankId, setBankId] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [tdsPercent, setTdsPercent] = useState('2');
  const [tdsRound, setTdsRound] = useState(false);
  const [defaultTds, setDefaultTds] = useState(true);
  const [paymentAgainst, setPaymentAgainst] = useState<'invoice' | 'on_account'>('invoice');
  const [referenceNo, setReferenceNo] = useState('');
  const [narration, setNarration] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ReceiptMappingRow[] | null>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);

  const invoiceById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of pendingInvoices) m.set(i.id, i);
    for (const i of extraInvoices) m.set(i.id, i);
    return m;
  }, [pendingInvoices, extraInvoices]);

  const selectedInvoices = useMemo(
    () => selectedIds.map((id) => invoiceById.get(id)).filter(Boolean) as Invoice[],
    [selectedIds, invoiceById],
  );

  const availableToAdd = useMemo(() => {
    const all = [...pendingInvoices, ...extraInvoices];
    const seen = new Set<string>();
    const list: Invoice[] = [];
    for (const i of all) {
      if (seen.has(i.id)) continue;
      seen.add(i.id);
      if (!selectedIds.includes(i.id)) list.push(i);
    }
    return list.sort((a, b) => a.invoiceNo.localeCompare(b.invoiceNo));
  }, [pendingInvoices, extraInvoices, selectedIds]);

  const pct = parseNum(tdsPercent);
  const entryInvoice = entryInvoiceId ? invoiceById.get(entryInvoiceId) : undefined;
  const entryInvoiceTotal = entryInvoice?.grandTotal ?? 0;
  const entryTdsPreview = computeTdsOnInvoiceTotal(entryInvoiceTotal, pct, tdsRound);
  const entryDeductionPreview = Math.max(
    0,
    Math.round((entryInvoiceTotal - entryTdsPreview - parseNum(entryReceived)) * 100) / 100,
  );

  const loadRefs = useCallback(async () => {
    const [p, b, br] = await Promise.all([
      partiesApi.getParties(),
      moneyReceiptApi.getBranches().catch(() => []),
      moneyReceiptApi.getBanks().catch(() => []),
    ]);
    setParties(p);
    setBranches(b);
    setBanks(br);
  }, []);

  const loadMrList = useCallback(async () => {
    setMrListLoading(true);
    try {
      const rows = await moneyReceiptApi.list({ limit: 400 });
      setMrListRows(rows);
    } catch {
      setError('Failed to load money receipts');
    } finally {
      setMrListLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadRefs(), loadMrList()]);
      } catch {
        setError('Failed to load parties');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRefs, loadMrList]);

  const filteredMrRows = useMemo(() => {
    const q = mrListSearch.trim().toLowerCase();
    if (!q) return mrListRows;
    return mrListRows.filter((row) => {
      const hay = [
        row.receiptNo,
        row.partyName,
        row.paymentMode,
        row.referenceNo ?? '',
        row.status,
        row.invoiceNosSummary ?? '',
        row.grNosSummary ?? '',
      ]
        .join(' ')
        .toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      return tokens.every((t) => hay.includes(t));
    });
  }, [mrListRows, mrListSearch]);

  const openMrDetail = async (id: string) => {
    setMrDetailLoadingId(id);
    setSelectedMrDetail(null);
    try {
      const r = await moneyReceiptApi.getOne(id);
      setSelectedMrDetail(r);
    } catch {
      setError('Could not load receipt details');
    } finally {
      setMrDetailLoadingId(null);
    }
  };

  const handleDownloadRowPdf = async (id: string, receiptNo: string) => {
    setDownloadingPdfId(id);
    try {
      const blob = await moneyReceiptApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-receipt-${receiptNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download PDF');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const loadPartyInvoices = useCallback(async (pid: string) => {
    if (!pid) {
      setPendingInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    setError(null);
    try {
      const invs = await invoicesApi.getInvoices({ partyId: pid, pendingOnly: true });
      setPendingInvoices(invs);
    } catch {
      setError('Failed to load pending invoices');
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    if (partyId) {
      loadPartyInvoices(partyId);
    } else {
      setPendingInvoices([]);
    }
  }, [partyId, loadPartyInvoices]);

  useEffect(() => {
    if (prePartyId && prePartyId !== partyId) {
      setPartyId(prePartyId);
    }
  }, [prePartyId, partyId]);

  useEffect(() => {
    if (!defaultTds || !entryReceived) return;
    const rN = parseNum(entryReceived);
    setEntryTds(computeTds(rN, pct, tdsRound).toFixed(2));
  }, [entryReceived, defaultTds, pct, tdsRound]);

  const onPartyChange = (id: string) => {
    setPartyId(id);
    setPartyLocked(false);
    setLockHint(null);
    setSelectedIds([]);
    setAmounts({});
    setLineRemarks({});
    setExtraInvoices([]);
    setMapping(null);
    setEntryInvoiceId('');
    setEntryReceived('');
    setEntryTds('');
    setEntryDeduction('');
    setEntryLineRemark('');
  };

  const unlockParty = () => {
    setPartyLocked(false);
    setLockHint(null);
  };

  const updateAmount = (invoiceId: string, field: 'received' | 'tds' | 'deduction', value: string) => {
    setAmounts((prev) => {
      const cur = prev[invoiceId] ?? { received: '', tds: '', deduction: '' };
      if (field === 'received') {
        const received = value;
        const rN = parseNum(received);
        const tds =
          pct > 0 && defaultTds
            ? computeTds(rN, pct, tdsRound).toFixed(2)
            : cur.tds;
        const deduction = cur.deduction || '';
        return { ...prev, [invoiceId]: { received, tds, deduction } };
      }
      return { ...prev, [invoiceId]: { ...cur, [field]: value } };
    });
  };

  const removeLine = (invoiceId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== invoiceId));
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
    setLineRemarks((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
  };

  const addLineFromEntry = () => {
    if (!entryInvoiceId || !entryInvoice) {
      setError('Select against bill no.');
      return;
    }
    const r = parseNum(entryReceived);
    const t = entryTdsPreview;
    const d = entryDeductionPreview;
    if (r <= 0) {
      setError('Enter received amount');
      return;
    }
    if (r < 0 || t < 0 || d < 0) {
      setError('Amounts cannot be negative');
      return;
    }
    if (r + t + d > entryInvoiceTotal + 0.01) {
      setError(`Received + TDS + Deduction cannot exceed invoice total (₹${entryInvoiceTotal.toFixed(2)})`);
      return;
    }
    setSelectedIds((prev) => (prev.includes(entryInvoiceId) ? prev : [...prev, entryInvoiceId]));
    setAmounts((prev) => ({
      ...prev,
      [entryInvoiceId]: { received: r.toFixed(2), tds: t.toFixed(2), deduction: d.toFixed(2) },
    }));
    if (entryLineRemark.trim()) {
      setLineRemarks((prev) => ({ ...prev, [entryInvoiceId]: entryLineRemark.trim() }));
    }
    setEntryInvoiceId('');
    setEntryReceived('');
    setEntryTds('');
    setEntryDeduction('');
    setEntryLineRemark('');
    setError(null);
  };

  const loadMapping = async () => {
    if (!partyId) return;
    setMappingLoading(true);
    setError(null);
    try {
      const rows = await moneyReceiptApi.getPartyMapping(partyId);
      setMapping(rows);
      setMappingOpen(true);
    } catch {
      setError('Could not load Trip → GR → Invoice → MR mapping');
    } finally {
      setMappingLoading(false);
    }
  };

  const totals = useMemo(() => {
    let sumInvAmt = 0;
    let totalPending = 0;
    let totalReceived = 0;
    let totalTds = 0;
    let totalDed = 0;
    for (const inv of selectedInvoices) {
      const g = inv.grandTotal ?? 0;
      sumInvAmt += g;
      totalPending += g;
      const v = amounts[inv.id] ?? { received: '', tds: '', deduction: '' };
      const r = parseNum(v.received);
      const t = computeTdsOnInvoiceTotal(g, pct, tdsRound);
      const d = Math.max(0, Math.round((g - t - r) * 100) / 100);
      totalReceived += r;
      totalTds += t;
      totalDed += d;
    }
    const applied = Math.round((totalReceived + totalTds + totalDed) * 100) / 100;
    const balanceRemaining = Math.max(0, Math.round((totalPending - applied) * 100) / 100);
    return {
      totalInvoiceAmount: sumInvAmt,
      totalOutstandingBase: totalPending,
      totalReceived,
      totalTds,
      totalDeduction: totalDed,
      finalNet: applied,
      balanceRemaining,
    };
  }, [selectedInvoices, amounts]);

  const validateAndBuildPayload = () => {
    const lines: { invoiceId: string; receivedAmount: number; tdsAmount: number; deductionAmount?: number }[] = [];
    if (!partyId) throw new Error('Select a party');
    if (paymentAgainst !== 'invoice') throw new Error('Save is only available for Invoice mode');
    for (const inv of selectedInvoices) {
      const v = amounts[inv.id] ?? { received: '', tds: '', deduction: '' };
      const r = parseNum(v.received);
      const rem = inv.grandTotal ?? 0;
      const t = computeTdsOnInvoiceTotal(rem, pct, tdsRound);
      const d = Math.max(0, Math.round((rem - t - r) * 100) / 100);
      if (r <= 0) continue;
      if (r < 0 || t < 0 || d < 0) throw new Error('Amounts cannot be negative');
      if (r + t + d > rem + 0.01) {
        throw new Error(`Received + TDS + Deduction exceeds invoice total for ${inv.invoiceNo}`);
      }
      lines.push({
        invoiceId: inv.id,
        receivedAmount: Math.round(r * 100) / 100,
        tdsAmount: Math.round(t * 100) / 100,
        deductionAmount: Math.round(d * 100) / 100,
      });
    }
    if (lines.length === 0) throw new Error('Add at least one invoice line with amounts');
    return lines;
  };

  const buildNotesPayload = () => {
    const remarkLines = Object.entries(lineRemarks)
      .filter(([, s]) => s?.trim())
      .map(([id, s]) => {
        const inv = invoiceById.get(id);
        return inv ? `[${inv.invoiceNo}] ${s.trim()}` : s.trim();
      });
    const parts = [narration.trim(), ...remarkLines].filter(Boolean);
    return parts.join('\n') || undefined;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const lines = validateAndBuildPayload();
      const res = await moneyReceiptApi.create({
        receiptNo: receiptNo.trim() || undefined,
        receiptDate: receiptDate || undefined,
        partyId,
        branchId: branchId || null,
        bankId: paymentMode === 'BANK' ? bankId || null : null,
        paymentMode,
        referenceNo: referenceNo || undefined,
        tdsPercent: pct,
        tdsRound,
        notes: buildNotesPayload(),
        status: 'POSTED',
        lines,
      });
      setSuccess(`Saved ${res.receiptNo ?? res.id}`);
      setSelectedIds([]);
      setAmounts({});
      setLineRemarks({});
      setNarration('');
      await loadPartyInvoices(partyId);
      setExtraInvoices([]);
      setMapping(null);
      await loadMrList();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message ?? ax?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled =
    loadingInvoices ||
    !partyId ||
    selectedIds.length === 0 ||
    paymentAgainst !== 'invoice';

  const createFormSection = (
    <>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {paymentAgainst === 'on_account' && (
          <Alert>
            <AlertDescription>
              On-account payments are not saved yet — switch to <strong>Invoice</strong> to post against bills.
            </AlertDescription>
          </Alert>
        )}

        <Card className="overflow-visible border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 px-4 py-1.5">
            <CardTitle className="text-sm font-semibold text-slate-900">Receipt header</CardTitle>
            {/* <CardDescription>
              {lockHint ?? 'Choose branch, party, and bank. TDS defaults apply to new lines.'}
            </CardDescription> */}
          </CardHeader>
          <CardContent className="overflow-visible px-4 pb-3 pt-3">
            <ReceiptForm
              receiptNo={receiptNo}
              onReceiptNoChange={setReceiptNo}
              receiptDate={receiptDate}
              onReceiptDateChange={setReceiptDate}
              branchId={branchId}
              onBranchIdChange={setBranchId}
              bankId={bankId}
              onBankIdChange={setBankId}
              paymentMode={paymentMode}
              tdsPercent={tdsPercent}
              onTdsPercentChange={setTdsPercent}
              tdsRound={tdsRound}
              onTdsRoundChange={setTdsRound}
              defaultTds={defaultTds}
              onDefaultTdsChange={setDefaultTds}
              paymentAgainst={paymentAgainst}
              onPaymentAgainstChange={setPaymentAgainst}
              referenceNo={referenceNo}
              onReferenceNoChange={setReferenceNo}
              narration={narration}
              onNarrationChange={setNarration}
              branches={branches}
              banks={banks}
              parties={parties}
              partyId={partyId}
              onPartyIdChange={onPartyChange}
              partyLocked={partyLocked}
              partyLoading={loading}
              onBranchCreated={(b) =>
                setBranches((prev) => {
                  if (prev.some((x) => x.id === b.id)) return prev;
                  return [...prev, b].sort((a, b2) => a.name.localeCompare(b2.name));
                })
              }
              onBankCreated={(bk) =>
                setBanks((prev) => {
                  if (prev.some((x) => x.id === bk.id)) return prev;
                  return [...prev, bk].sort((a, b2) => a.name.localeCompare(b2.name));
                })
              }
              onPaymentModeChange={(mode) => {
                setPaymentMode(mode);
                if (mode !== 'BANK') setBankId('');
              }}
            />
            {partyLocked ? (
              <button
                type="button"
                onClick={unlockParty}
                className="mt-1.5 text-xs font-medium text-emerald-700 underline hover:text-emerald-800"
              >
                Unlock party selection
              </button>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <Card className="min-w-0 flex-1 border-emerald-200/60 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-100/80">
          <CardHeader className="border-b border-emerald-100/80 px-4 py-1.5">
            <CardTitle className="text-sm font-semibold text-emerald-950">Add invoice line</CardTitle>
            {/* <CardDescription className="text-emerald-900/70">
              Against bill no. — then received & TDS (deduction is computed)
            </CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3 pt-3">
                <div className="flex w-full flex-nowrap items-end gap-2 sm:gap-3">
                  <div className="min-w-0 shrink flex-[2] basis-0">
                    <Label className="text-xs">Against bill no.</Label>
                    <Select
                      value={entryInvoiceId || '__none__'}
                      onValueChange={(v) => {
                        const id = v === '__none__' ? '' : v;
                        setEntryInvoiceId(id);
                        setEntryReceived('');
                        setEntryTds('');
                        setEntryDeduction('');
                      }}
                      disabled={!partyId || loadingInvoices}
                    >
                      <SelectTrigger className="mt-0.5 h-auto min-h-8 rounded-lg border-slate-200 bg-white px-2 py-1.5 text-left text-xs leading-snug shadow-sm [&>span]:line-clamp-2 [&>span]:text-left">
                        <SelectValue placeholder={partyId ? 'Select invoice' : 'Select party first'}>
                          {entryInvoiceId && entryInvoice
                            ? `${entryInvoice.invoiceNo} · Due ₹${(entryInvoice.remaining ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="max-h-[min(22rem,70vh)] w-[min(calc(100vw-1.5rem),28rem)] rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl ring-1 ring-slate-200/50"
                      >
                        <SelectItem value="__none__" className="cursor-pointer rounded-lg py-2 text-sm text-slate-600">
                          Choose an invoice…
                        </SelectItem>
                        {availableToAdd.map((inv) => {
                          const { grLr, vehicles } = invoiceTripLabels(inv);
                          const mrLine = invoiceMrDisplay(inv);
                          const due = (inv.remaining ?? 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          return (
                            <SelectItem
                              key={inv.id}
                              value={inv.id}
                              className="cursor-pointer items-start rounded-lg py-2.5 pl-8 pr-2 text-left focus:bg-emerald-50/90"
                            >
                              <div className="flex min-w-0 flex-col gap-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="font-mono text-sm font-semibold text-slate-900">{inv.invoiceNo}</span>
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 rounded-md px-1.5 py-0 text-[11px] font-normal tabular-nums text-emerald-900"
                                  >
                                    Due ₹{due}
                                  </Badge>
                                </div>
                                <div className="space-y-0.5 text-[11px] leading-snug text-slate-600">
                                  <p className="break-words">
                                    <span className="font-medium text-slate-500">MR </span>
                                    <span className="font-mono text-slate-800">{mrLine}</span>
                                  </p>
                                  <p className="break-words">
                                    <span className="font-medium text-slate-500">GR </span>
                                    <span className="font-mono text-slate-800">{grLr}</span>
                                  </p>
                                  <p className="break-words">
                                    <span className="font-medium text-slate-500">Vehicle </span>
                                    <span className="font-mono text-slate-800">{vehicles}</span>
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] leading-none text-slate-700">Invoice amount</Label>
                    <Input
                      readOnly
                      className="mt-0.5 h-8 rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs tabular-nums leading-none"
                      value={
                        entryInvoice
                          ? `₹${(entryInvoice.grandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] leading-none text-slate-700">Outstanding</Label>
                    <Input
                      readOnly
                      className="mt-0.5 h-8 rounded-lg bg-amber-50/80 px-2 py-1 font-mono text-xs tabular-nums leading-none text-amber-950"
                      value={
                        entryInvoice
                          ? `₹${entryInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'
                      }
                    />
                  </div>
                </div>
                <div className="flex w-full flex-nowrap items-end gap-1.5 sm:gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] leading-none text-slate-700">Received amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="mt-0.5 h-8 rounded-lg px-2 py-1 text-right text-xs tabular-nums leading-none"
                      value={entryReceived}
                      onChange={(e) => setEntryReceived(e.target.value)}
                      disabled={!entryInvoiceId}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] leading-none text-slate-700">TDS amount</Label>
                    <Input
                      readOnly
                      className="mt-0.5 h-8 rounded-lg bg-slate-100 px-2 py-1 text-right text-xs tabular-nums leading-none"
                      value={entryInvoiceId ? entryTdsPreview.toFixed(2) : ''}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-[11px] leading-none text-slate-700">Deduction (auto)</Label>
                    <Input
                      readOnly
                      className="mt-0.5 h-8 rounded-lg bg-slate-100 px-2 py-1 text-right text-xs tabular-nums leading-none"
                      value={entryInvoice ? entryDeductionPreview.toFixed(2) : ''}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-12 md:items-end md:gap-2">
                  <div className="md:col-span-7">
                    <Label className="text-[11px] leading-none text-slate-700">Remarks (this line)</Label>
                    <Input
                      className="mt-0.5 h-8 rounded-lg px-2 py-1 text-xs leading-none"
                      value={entryLineRemark}
                      onChange={(e) => setEntryLineRemark(e.target.value)}
                      placeholder="Optional"
                      disabled={!entryInvoiceId}
                    />
                  </div>
                  <div className="flex items-end md:col-span-5">
                    <Button
                      type="button"
                      className="!h-8 w-full gap-1.5 px-3 text-xs md:w-auto"
                      onClick={addLineFromEntry}
                      disabled={!entryInvoiceId || paymentAgainst !== 'invoice'}
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      Add to grid
                    </Button>
                  </div>
                </div>
          </CardContent>
          </Card>

          <aside className="flex h-full min-h-0 w-full shrink-0 flex-col lg:w-[min(100%,17.5rem)] xl:w-72">
            <ReceiptTotalsBar
              layout="stack"
              totalInvoiceAmount={totals.totalInvoiceAmount}
              totalReceived={totals.totalReceived}
              totalTds={totals.totalTds}
              totalDeduction={totals.totalDeduction}
              totalApplied={totals.finalNet}
              balanceRemaining={totals.balanceRemaining}
            />
          </aside>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 px-4 py-2">
            <CardTitle className="text-base">Invoice lines</CardTitle>
            <CardDescription>Outstanding amounts and settlement for each bill</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(52vh,520px)] overflow-auto">
              {selectedInvoices.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">
                  No invoice lines yet. Use <strong>Add invoice line</strong> above, then they appear here.
                </div>
              ) : (
                <table className="w-full min-w-[1040px] text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2.5">Invoice no.</th>
                      <th className="px-3 py-2.5">MR no.</th>
                      <th className="px-3 py-2.5">GR no.</th>
                      <th className="px-3 py-2.5 text-right">Inv. amount</th>
                      <th className="px-3 py-2.5 text-right">Outstanding</th>
                      <th className="px-3 py-2.5 text-right">Received</th>
                      <th className="px-3 py-2.5 text-right">TDS</th>
                      <th className="px-3 py-2.5 text-right">Deduction</th>
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoices.map((inv) => {
                      const rem = inv.grandTotal ?? 0;
                      const v = amounts[inv.id] ?? { received: '', tds: '', deduction: '' };
                      const r = parseNum(v.received);
                      const t = computeTdsOnInvoiceTotal(rem, pct, tdsRound);
                      const ded = Math.max(0, Math.round((rem - t - r) * 100) / 100);
                      const grDisp = invoiceGrDisplay(inv);
                      const mrDisp = invoiceMrDisplay(inv);
                      return (
                        <tr key={inv.id} className="border-b border-slate-100 bg-white hover:bg-slate-50/80">
                          <td className="px-3 py-2 align-middle">
                            <div className="font-mono text-xs font-medium text-slate-900">{inv.invoiceNo}</div>
                            {lineRemarks[inv.id] ? (
                              <div className="mt-0.5 text-[10px] text-slate-500">{lineRemarks[inv.id]}</div>
                            ) : null}
                          </td>
                          <td className="max-w-[120px] truncate px-3 py-2 align-middle font-mono text-xs text-slate-800" title={mrDisp}>
                            {mrDisp}
                          </td>
                          <td className="max-w-[140px] truncate px-3 py-2 align-middle font-mono text-xs text-slate-700" title={grDisp}>
                            {grDisp}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                            ₹{(inv.grandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-900">
                            ₹{rem.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right text-xs tabular-nums"
                              value={v.received}
                              onChange={(e) => updateAmount(inv.id, 'received', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <Input
                              readOnly
                              className="h-8 text-right text-xs tabular-nums bg-slate-100"
                              value={t.toFixed(2)}
                            />
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <Input
                              readOnly
                              className="h-8 text-right text-xs tabular-nums bg-slate-100"
                              value={ded.toFixed(2)}
                            />
                          </td>
                          <td className="px-1 py-1 align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                              onClick={() => removeLine(inv.id)}
                              aria-label="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setMappingOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <ListTree className="h-4 w-4 text-slate-500" />
              Trip → GR → Invoice → MR traceability
            </span>
            {mappingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {mappingOpen ? (
            <div className="border-t border-slate-100 px-4 pb-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={loadMapping}
                  disabled={!partyId || mappingLoading}
                >
                  {mappingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Load mapping
                </Button>
                {!partyId ? <span className="text-xs text-slate-500">Select a party first</span> : null}
              </div>
              {mapping && mapping.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-2">Trip no.</th>
                        <th className="px-2 py-2">GR no.</th>
                        <th className="px-2 py-2">Invoice no.</th>
                        <th className="px-2 py-2">MR no.</th>
                        <th className="px-2 py-2 text-right">Deduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapping.map((row, idx) => (
                        <tr key={`${row.receiptNo}-${idx}`} className="border-t border-slate-100">
                          <td className="px-2 py-1.5 font-mono">{row.tripNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.grNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.invoiceNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.receiptNo}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            ₹{(row.deductionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : mapping && mapping.length === 0 ? (
                <p className="text-xs text-slate-500">No allocation rows for this party.</p>
              ) : null}
            </div>
          ) : null}
        </div>
    </>
  );

  return (
    <div className="w-full min-w-0 space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Money receipt</h1>
          <p className="mt-1 text-sm text-slate-600">
            Record payments against invoices, view all receipts, and download PDFs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setShowCreateDialog(true);
            }}
          >
            <WalletCards className="mr-2 h-4 w-4" />
            Create money receipt
          </Button>
          <Badge variant="outline" className="h-9 rounded-lg px-3 text-sm font-medium">
            {mrListRows.length} receipt{mrListRows.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => {
              setError(null);
              setSuccess(null);
              loadMrList();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {!showCreateDialog && error && (
        <Alert variant="destructive" className="rounded-xl border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!showCreateDialog && success && (
        <Alert className="rounded-xl border-emerald-200 bg-emerald-50/80 text-emerald-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <section className="min-w-0" aria-label="Money receipts list">
        <Card className="rounded-xl border-slate-200/80 shadow-md ring-1 ring-slate-200/60">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <WalletCards className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Money receipts</CardTitle>
                <p className="text-xs text-slate-500">Click a row for details. Use Create money receipt to post a new MR.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 px-3 py-3 sm:px-4">
              <div className="min-w-[240px] flex-1">
                <Label className="text-[11px] text-slate-600">Search</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-9 rounded-md pl-10 pr-3 text-xs"
                    placeholder="Receipt no., party, invoice, GR, reference…"
                    value={mrListSearch}
                    onChange={(e) => setMrListSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {mrListLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredMrRows.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {mrListRows.length === 0 ? 'No money receipts yet.' : 'No receipts match your search.'}
              </p>
            ) : (
              <div className="table-scroll-bleed overflow-x-auto border-t border-slate-200">
                <table className="min-w-[1080px] w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-3 py-2 font-semibold text-slate-700">Receipt no.</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Party</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Invoice no.</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">GR no.</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Mode</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Reference</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Lines</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredMrRows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer hover:bg-slate-50/70"
                        onClick={() => openMrDetail(row.id)}
                      >
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{row.receiptNo}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {new Date(row.receiptDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-800" title={row.partyName}>
                          {row.partyName}
                        </td>
                        <td
                          className="max-w-[200px] truncate px-3 py-2.5 font-mono text-xs text-slate-800"
                          title={row.invoiceNosSummary ?? ''}
                        >
                          {row.invoiceNosSummary ?? '—'}
                        </td>
                        <td
                          className="max-w-[180px] truncate px-3 py-2.5 font-mono text-xs text-slate-800"
                          title={row.grNosSummary ?? ''}
                        >
                          {row.grNosSummary ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{row.paymentMode}</td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 font-mono text-xs text-slate-600">
                          {row.referenceNo ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                          ₹{row.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {row.allocationCount}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="rounded-md text-xs">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md px-2.5"
                            disabled={downloadingPdfId === row.id}
                            onClick={() => handleDownloadRowPdf(row.id, row.receiptNo)}
                          >
                            {downloadingPdfId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create money receipt</h3>
                <p className="text-xs text-slate-500">
                  Deduction = Outstanding − TDS − Received (per line). Add lines, then save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateDialog(false);
                  setError(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close create money receipt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/30 px-4 py-3 sm:px-5 lg:px-6">
              {createFormSection}
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
              <Button
                type="button"
                className="h-10 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 sm:w-auto sm:min-w-[12rem]"
                onClick={handleSave}
                disabled={saving || saveDisabled}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <WalletCards className="mr-2 h-4 w-4" />
                    Create money receipt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {(mrDetailLoadingId || selectedMrDetail) && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 p-3 sm:p-6"
          onClick={() => {
            setSelectedMrDetail(null);
            setMrDetailLoadingId(null);
          }}
        >
          <div
            className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Money receipt details</h3>
                <p className="text-xs text-slate-500">
                  {selectedMrDetail
                    ? `${selectedMrDetail.receiptNo} · ${selectedMrDetail.party?.name ?? 'Party'}`
                    : 'Loading…'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMrDetail(null);
                  setMrDetailLoadingId(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {mrDetailLoadingId && !selectedMrDetail ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : selectedMrDetail ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Receipt date</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {new Date(selectedMrDetail.receiptDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Payment mode</p>
                      <p className="mt-1 font-medium text-slate-900">{selectedMrDetail.paymentMode}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Total received</p>
                      <p className="mt-1 font-medium tabular-nums text-slate-900">
                        ₹{selectedMrDetail.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Reference</p>
                      <p className="mt-1 font-mono text-sm text-slate-900">
                        {selectedMrDetail.referenceNo ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-slate-50 text-left text-xs">
                        <tr>
                          <th className="px-3 py-2 font-medium text-slate-700">Invoice no.</th>
                          <th className="px-3 py-2 font-medium text-slate-700">GR no.</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Received</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">TDS</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedMrDetail.allocations ?? []).map(
                          (a: {
                            id: string;
                            receivedAmount: number;
                            tdsAmount: number;
                            deduction: number;
                            invoice?: { invoiceNo?: string } | null;
                            goodsReceipt?: { grNo?: string | null } | null;
                            grNoDisplay?: string | null;
                          }) => {
                            const grCell = a.grNoDisplay ?? a.goodsReceipt?.grNo ?? '—';
                            return (
                          <tr key={a.id}>
                            <td className="px-3 py-2 font-mono text-xs">
                              {a.invoice?.invoiceNo ?? '—'}
                            </td>
                            <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-slate-800" title={grCell}>
                              {grCell}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              ₹{a.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              ₹{a.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              ₹{a.deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={downloadingPdfId === selectedMrDetail.id}
                      onClick={() =>
                        handleDownloadRowPdf(selectedMrDetail.id, selectedMrDetail.receiptNo)
                      }
                    >
                      {downloadingPdfId === selectedMrDetail.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

