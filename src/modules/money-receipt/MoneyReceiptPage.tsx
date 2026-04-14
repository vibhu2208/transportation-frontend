'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HeaderActions } from './HeaderActions';
import { ReceiptForm } from './ReceiptForm';
import { ReceiptTotalsBar } from './ReceiptTotalsBar';
import { partiesApi } from '../parties/api';
import { invoicesApi } from '../invoices/api';
import { moneyReceiptApi } from './api';
import type { Party } from '../parties/types';
import type { Invoice } from '../invoices/types';
import type { InvoiceLookupResponse, ReceiptMappingRow } from './types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, Plus, Trash2, ListTree, ChevronDown, ChevronUp } from 'lucide-react';
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

function mapLookupToInvoice(r: InvoiceLookupResponse): Invoice {
  const i = r.invoice;
  const now = new Date().toISOString();
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    invoiceDate: typeof i.invoiceDate === 'string' ? i.invoiceDate : String(i.invoiceDate),
    partyName: i.partyName,
    partyId: i.partyId,
    subTotal: 0,
    gstRate: 0,
    gstAmount: 0,
    grandTotal: i.grandTotal,
    status: i.status,
    trips: [],
    paidTotal: r.paidTotal,
    remaining: r.remaining,
    createdAt: now,
    updatedAt: now,
  };
}

export default function MoneyReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePartyId = searchParams.get('partyId') ?? '';

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState(prePartyId);
  const [partyLocked, setPartyLocked] = useState(false);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [extraInvoices, setExtraInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, { received: string; tds: string }>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({});

  const [entryInvoiceId, setEntryInvoiceId] = useState('');
  const [entryReceived, setEntryReceived] = useState('');
  const [entryTds, setEntryTds] = useState('');
  const [entryLineRemark, setEntryLineRemark] = useState('');

  const [branches, setBranches] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; isActive: boolean }[]>([]);

  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [bankId, setBankId] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [tdsPercent, setTdsPercent] = useState('0');
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
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const [mapping, setMapping] = useState<ReceiptMappingRow[] | null>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [quickFindNo, setQuickFindNo] = useState('');

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

  const entryInvoice = entryInvoiceId ? invoiceById.get(entryInvoiceId) : undefined;
  const entryRemaining = entryInvoice?.remaining ?? 0;
  const entryDeductionPreview = Math.max(
    0,
    Math.round((entryRemaining - parseNum(entryTds) - parseNum(entryReceived)) * 100) / 100,
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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadRefs();
      } catch {
        setError('Failed to load parties');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRefs]);

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

  const pct = parseNum(tdsPercent);

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
    setEntryLineRemark('');
  };

  const unlockParty = () => {
    setPartyLocked(false);
    setLockHint(null);
  };

  const quickLookupAndLock = async (invoiceNo: string) => {
    const q = invoiceNo.trim();
    if (!q) return;
    setError(null);
    try {
      const res = await moneyReceiptApi.lookupInvoice(q);
      if (!res.lockPartyId) {
        setError('Invoice has no linked party; link party on the invoice first.');
        return;
      }
      setPartyId(res.lockPartyId);
      setPartyLocked(true);
      setLockHint(`Party locked: ${res.lockPartyName} (${res.invoice.invoiceNo})`);
      const inv = mapLookupToInvoice(res);
      setExtraInvoices((prev) => (prev.some((x) => x.id === inv.id) ? prev : [...prev, inv]));
      setEntryInvoiceId(inv.id);
      setEntryReceived('');
      setEntryTds('');
      setEntryLineRemark('');
    } catch {
      setError('Invoice not found');
    }
  };

  const updateAmount = (invoiceId: string, field: 'received' | 'tds', value: string) => {
    setAmounts((prev) => {
      const cur = prev[invoiceId] ?? { received: '', tds: '' };
      if (field === 'received') {
        const received = value;
        const rN = parseNum(received);
        const tds =
          pct > 0 && defaultTds
            ? computeTds(rN, pct, tdsRound).toFixed(2)
            : cur.tds;
        return { ...prev, [invoiceId]: { received, tds } };
      }
      return { ...prev, [invoiceId]: { ...cur, tds: value } };
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
    const t = parseNum(entryTds);
    if (r <= 0 && t <= 0) {
      setError('Enter received amount and/or TDS');
      return;
    }
    if (r < 0 || t < 0) {
      setError('Amounts cannot be negative');
      return;
    }
    if (r + t > entryRemaining + 0.01) {
      setError(`Received + TDS cannot exceed outstanding (₹${entryRemaining.toFixed(2)})`);
      return;
    }
    setSelectedIds((prev) => (prev.includes(entryInvoiceId) ? prev : [...prev, entryInvoiceId]));
    setAmounts((prev) => ({
      ...prev,
      [entryInvoiceId]: { received: r.toFixed(2), tds: t.toFixed(2) },
    }));
    if (entryLineRemark.trim()) {
      setLineRemarks((prev) => ({ ...prev, [entryInvoiceId]: entryLineRemark.trim() }));
    }
    setEntryInvoiceId('');
    setEntryReceived('');
    setEntryTds('');
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
      const rem = inv.remaining ?? 0;
      const g = inv.grandTotal ?? 0;
      sumInvAmt += g;
      totalPending += rem;
      const v = amounts[inv.id] ?? { received: '', tds: '' };
      const r = parseNum(v.received);
      const t = parseNum(v.tds);
      totalReceived += r;
      totalTds += t;
      totalDed += Math.max(0, Math.round((rem - t - r) * 100) / 100);
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
    const lines: { invoiceId: string; receivedAmount: number; tdsAmount: number }[] = [];
    if (!partyId) throw new Error('Select a party');
    if (paymentAgainst !== 'invoice') throw new Error('Save is only available for Invoice mode');
    for (const inv of selectedInvoices) {
      const v = amounts[inv.id] ?? { received: '', tds: '' };
      const r = parseNum(v.received);
      const t = parseNum(v.tds);
      if (r <= 0 && t <= 0) continue;
      const rem = inv.remaining ?? 0;
      if (r < 0 || t < 0) throw new Error('Amounts cannot be negative');
      if (r + t > rem + 0.01) {
        throw new Error(`Received + TDS exceeds pending for ${inv.invoiceNo}`);
      }
      lines.push({
        invoiceId: inv.id,
        receivedAmount: Math.round(r * 100) / 100,
        tdsAmount: Math.round(t * 100) / 100,
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
      setLastSavedId(res.id);
      setSuccess(`Saved ${res.receiptNo ?? res.id}`);
      setSelectedIds([]);
      setAmounts({});
      setLineRemarks({});
      setNarration('');
      await loadPartyInvoices(partyId);
      setExtraInvoices([]);
      setMapping(null);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setError(ax?.response?.data?.message ?? ax?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFind = async () => {
    const id = window.prompt('Money receipt ID');
    if (!id?.trim()) return;
    try {
      const r = await moneyReceiptApi.getOne(id.trim());
      window.alert(JSON.stringify(r, null, 2));
    } catch {
      setError('Receipt not found');
    }
  };

  const handlePrint = async () => {
    if (!lastSavedId) {
      setError('Save a receipt first to print');
      return;
    }
    try {
      const blob = await moneyReceiptApi.downloadPdf(lastSavedId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('Could not open PDF');
    }
  };

  const handleDelete = async () => {
    if (!lastSavedId) return;
    if (!window.confirm('Delete this draft receipt?')) return;
    try {
      await moneyReceiptApi.remove(lastSavedId);
      setLastSavedId(null);
      setSuccess('Deleted');
    } catch {
      setError('Delete only allowed for draft receipts');
    }
  };

  const saveDisabled =
    loadingInvoices ||
    !partyId ||
    selectedIds.length === 0 ||
    paymentAgainst !== 'invoice';

  return (
    <div className="flex min-h-0 flex-col bg-slate-50/30">
      <div className="border-b border-slate-200 bg-white px-4 pt-4 lg:px-6">
        <div className="mb-3 flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
            Money receipt — invoice wise
          </h1>
          <p className="text-xs text-slate-500 md:text-sm">
            Deduction = Outstanding − TDS − Received (per line). Add lines below, then save.
          </p>
        </div>
        <HeaderActions
          onSave={handleSave}
          onDelete={handleDelete}
          onPrint={handlePrint}
          onFind={handleFind}
          onExit={() => router.push('/admin/dashboard')}
          saving={saving}
          disabledSave={saveDisabled}
          disabledDelete={!lastSavedId}
        />
      </div>

      <div className="flex-1 space-y-4 px-4 py-4 lg:px-6">
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

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base">Receipt header</CardTitle>
            <CardDescription>
              {lockHint ?? 'Choose branch, party, and bank. TDS defaults apply to new lines.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
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
              onPaymentModeChange={setPaymentMode}
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
            />
            {partyLocked ? (
              <button
                type="button"
                onClick={unlockParty}
                className="mt-3 text-xs font-medium text-emerald-700 underline hover:text-emerald-800"
              >
                Unlock party selection
              </button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 py-3">
            <CardTitle className="text-base">Invoice lines</CardTitle>
            <CardDescription>Outstanding amounts and settlement for each bill</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(52vh,520px)] overflow-auto">
              {selectedInvoices.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">
                  No invoices added. Use <strong>Add invoice line</strong> below.
                </div>
              ) : (
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2.5">Invoice</th>
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
                      const rem = inv.remaining ?? 0;
                      const v = amounts[inv.id] ?? { received: '', tds: '' };
                      const r = parseNum(v.received);
                      const t = parseNum(v.tds);
                      const ded = Math.max(0, Math.round((rem - t - r) * 100) / 100);
                      return (
                        <tr key={inv.id} className="border-b border-slate-100 bg-white hover:bg-slate-50/80">
                          <td className="px-3 py-2 align-middle">
                            <div className="font-mono text-xs font-medium text-slate-900">{inv.invoiceNo}</div>
                            {lineRemarks[inv.id] ? (
                              <div className="mt-0.5 text-[10px] text-slate-500">{lineRemarks[inv.id]}</div>
                            ) : null}
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
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right text-xs tabular-nums"
                              value={v.tds}
                              onChange={(e) => updateAmount(inv.id, 'tds', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                            ₹{ded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

        <Card className="border-emerald-200/60 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-100/80">
          <CardHeader className="border-b border-emerald-100/80 py-3">
            <CardTitle className="text-base text-emerald-950">Add invoice line</CardTitle>
            <CardDescription className="text-emerald-900/70">
              Against bill no. — then received & TDS (deduction is computed)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-4">
                <Label className="text-xs">Against bill no.</Label>
                <Select
                  value={entryInvoiceId || '__none__'}
                  onValueChange={(v) => {
                    const id = v === '__none__' ? '' : v;
                    setEntryInvoiceId(id);
                    setEntryReceived('');
                    setEntryTds('');
                  }}
                  disabled={!partyId || loadingInvoices}
                >
                  <SelectTrigger className="mt-1.5 rounded-lg font-mono text-xs">
                    <SelectValue placeholder={partyId ? 'Select invoice' : 'Select party first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {availableToAdd.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNo} (due ₹{(inv.remaining ?? 0).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Invoice amount</Label>
                <Input
                  readOnly
                  className="mt-1.5 rounded-lg bg-slate-50 font-mono text-xs tabular-nums"
                  value={
                    entryInvoice
                      ? `₹${(entryInvoice.grandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '—'
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Outstanding</Label>
                <Input
                  readOnly
                  className="mt-1.5 rounded-lg bg-amber-50/80 font-mono text-xs tabular-nums text-amber-950"
                  value={
                    entryInvoice
                      ? `₹${entryRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '—'
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Received amount</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="mt-1.5 rounded-lg text-right text-xs tabular-nums"
                  value={entryReceived}
                  onChange={(e) => setEntryReceived(e.target.value)}
                  disabled={!entryInvoiceId}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">TDS amount</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="mt-1.5 rounded-lg text-right text-xs tabular-nums"
                  value={entryTds}
                  onChange={(e) => setEntryTds(e.target.value)}
                  disabled={!entryInvoiceId}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <Label className="text-xs">Deduction (computed)</Label>
                <Input
                  readOnly
                  className="mt-1.5 rounded-lg bg-slate-100 font-mono text-xs tabular-nums"
                  value={entryInvoice ? `₹${entryDeductionPreview.toFixed(2)}` : '—'}
                />
              </div>
              <div className="md:col-span-5">
                <Label className="text-xs">Remarks (this line)</Label>
                <Input
                  className="mt-1.5 rounded-lg text-sm"
                  value={entryLineRemark}
                  onChange={(e) => setEntryLineRemark(e.target.value)}
                  placeholder="Optional"
                  disabled={!entryInvoiceId}
                />
              </div>
              <div className="flex items-end md:col-span-5">
                <Button
                  type="button"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 md:w-auto"
                  onClick={addLineFromEntry}
                  disabled={!entryInvoiceId || paymentAgainst !== 'invoice'}
                >
                  <Plus className="h-4 w-4" />
                  Add to grid
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100/80 pt-3">
              <Label className="text-xs text-slate-600">Quick find by no.</Label>
              <Input
                className="h-8 max-w-[200px] rounded-md text-xs"
                placeholder="Invoice no."
                value={quickFindNo}
                onChange={(e) => setQuickFindNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    quickLookupAndLock(quickFindNo);
                    setQuickFindNo('');
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                onClick={() => {
                  quickLookupAndLock(quickFindNo);
                  setQuickFindNo('');
                }}
              >
                Find bill
              </Button>
            </div>
          </CardContent>
        </Card>

        <ReceiptTotalsBar
          totalInvoiceAmount={totals.totalInvoiceAmount}
          totalReceived={totals.totalReceived}
          totalTds={totals.totalTds}
          totalDeduction={totals.totalDeduction}
          totalApplied={totals.finalNet}
          balanceRemaining={totals.balanceRemaining}
        />

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
                      </tr>
                    </thead>
                    <tbody>
                      {mapping.map((row, idx) => (
                        <tr key={`${row.receiptNo}-${idx}`} className="border-t border-slate-100">
                          <td className="px-2 py-1.5 font-mono">{row.tripNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.grNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.invoiceNo}</td>
                          <td className="px-2 py-1.5 font-mono">{row.receiptNo}</td>
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
      </div>
    </div>
  );
}
