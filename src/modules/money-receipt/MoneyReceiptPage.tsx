'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HeaderActions } from './HeaderActions';
import { ReceiptForm } from './ReceiptForm';
import { PartySection } from './PartySection';
import { InvoiceAccordion } from './InvoiceAccordion';
import { SummaryFooter } from './SummaryFooter';
import { partiesApi } from '../parties/api';
import { invoicesApi } from '../invoices/api';
import { moneyReceiptApi } from './api';
import type { Party } from '../parties/types';
import type { Invoice } from '../invoices/types';
import type { InvoiceGrLinesResponse, SettlementLine } from './types';
import { lineKey as makeLineKey } from './lineKey';

function computeTds(received: number, pct: number, round: boolean): number {
  if (!pct || received <= 0) return 0;
  const raw = (received * pct) / 100;
  return round ? Math.round(raw) : Math.round(raw * 100) / 100;
}

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export default function MoneyReceiptPage() {
  const searchParams = useSearchParams();
  const prePartyId = searchParams.get('partyId') ?? '';

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState(prePartyId);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lineDataByInvoice, setLineDataByInvoice] = useState<Record<string, InvoiceGrLinesResponse>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lineVals, setLineVals] = useState<Record<string, { received: string; tds: string; deduction: string }>>(
    {},
  );

  const [branches, setBranches] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; isActive: boolean }[]>([]);

  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [bankId, setBankId] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [tdsPercent, setTdsPercent] = useState('0');
  const [tdsRound, setTdsRound] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

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
      setInvoices([]);
      setLineDataByInvoice({});
      setLineVals({});
      setExpandedIds(new Set());
      return;
    }
    setLoadingInvoices(true);
    setError(null);
    try {
      const invs = await invoicesApi.getInvoices({ partyId: pid, pendingOnly: true });
      setInvoices(invs);
      const lines = await Promise.all(invs.map((i) => moneyReceiptApi.getInvoiceLines(i.id)));
      const map: Record<string, InvoiceGrLinesResponse> = {};
      const initVals: Record<string, { received: string; tds: string; deduction: string }> = {};
      for (let j = 0; j < invs.length; j++) {
        map[invs[j].id] = lines[j];
        for (const line of lines[j].lines) {
          const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
          initVals[k] = { received: '', tds: '', deduction: '' };
        }
      }
      setLineDataByInvoice(map);
      setLineVals(initVals);
      setExpandedIds(new Set(invs.map((i) => i.id)));
    } catch {
      setError('Failed to load invoices / GR lines');
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    if (partyId) {
      loadPartyInvoices(partyId);
    }
  }, [partyId, loadPartyInvoices]);

  useEffect(() => {
    if (prePartyId && prePartyId !== partyId) {
      setPartyId(prePartyId);
    }
  }, [prePartyId, partyId]);

  const pct = parseNum(tdsPercent);

  const updateLineTdsFromReceived = useCallback(
    (line: SettlementLine, receivedStr: string) => {
      const received = parseNum(receivedStr);
      const tds = computeTds(received, pct, tdsRound);
      const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
      setLineVals((prev) => ({
        ...prev,
        [k]: {
          received: receivedStr,
          tds: tds.toFixed(2),
          deduction: prev[k]?.deduction ?? '',
        },
      }));
    },
    [pct, tdsRound],
  );

  const onLineReceivedChange = (line: SettlementLine, raw: string) => {
    updateLineTdsFromReceived(line, raw);
  };

  const onLineTdsChange = (line: SettlementLine, raw: string) => {
    const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
    setLineVals((prev) => ({
      ...prev,
      [k]: { ...prev[k], received: prev[k]?.received ?? '', tds: raw, deduction: prev[k]?.deduction ?? '' },
    }));
  };

  const onLineDeductionChange = (line: SettlementLine, raw: string) => {
    const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
    setLineVals((prev) => ({
      ...prev,
      [k]: { ...prev[k], received: prev[k]?.received ?? '', tds: prev[k]?.tds ?? '', deduction: raw },
    }));
  };

  const totals = useMemo(() => {
    let totalReceived = 0;
    let totalTds = 0;
    let totalDed = 0;
    for (const inv of invoices) {
      const data = lineDataByInvoice[inv.id];
      if (!data) continue;
      for (const line of data.lines) {
        const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
        const v = lineVals[k];
        if (!v) continue;
        totalReceived += parseNum(v.received);
        totalTds += parseNum(v.tds);
        totalDed += parseNum(v.deduction);
      }
    }
    const finalNet = totalReceived - totalTds - totalDed;
    const totalInvoiceAmount = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPendingBefore = invoices.reduce((s, i) => s + (i.remaining ?? 0), 0);
    const balanceRemaining = Math.max(0, Math.round((totalPendingBefore - finalNet) * 100) / 100);
    return {
      totalInvoiceAmount,
      totalReceived,
      totalTds,
      totalDeduction: totalDed,
      finalNet,
      balanceRemaining,
    };
  }, [invoices, lineDataByInvoice, lineVals]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const onAutoAllocate = (invoiceId: string) => {
    const data = lineDataByInvoice[invoiceId];
    if (!data) return;
    setLineVals((prev) => {
      const next = { ...prev };
      for (const line of data.lines) {
        const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
        const received = line.pendingAmount.toFixed(2);
        const receivedN = parseFloat(received);
        const tds = computeTds(receivedN, pct, tdsRound).toFixed(2);
        next[k] = { received, tds, deduction: '0' };
      }
      return next;
    });
  };

  const validateAndBuildPayload = () => {
    const lines: {
      invoiceId: string;
      tripId: string;
      goodsReceiptId?: string | null;
      freightAmount: number;
      receivedAmount: number;
      tdsAmount: number;
      deduction: number;
    }[] = [];

    for (const inv of invoices) {
      const data = lineDataByInvoice[inv.id];
      if (!data) continue;
      for (const line of data.lines) {
        const k = makeLineKey(line.invoiceId, line.tripId, line.goodsReceiptId);
        const v = lineVals[k];
        if (!v) continue;
        const received = parseNum(v.received);
        if (received <= 0) continue;
        const tds = parseNum(v.tds);
        const ded = parseNum(v.deduction);
        if (received > line.pendingAmount + 0.01) {
          throw new Error(`Received exceeds pending for GR ${line.grNo}`);
        }
        if (received < 0 || tds < 0 || ded < 0) {
          throw new Error('Amounts cannot be negative');
        }
        lines.push({
          invoiceId: line.invoiceId,
          tripId: line.tripId,
          goodsReceiptId: line.goodsReceiptId,
          freightAmount: line.freightAmount,
          receivedAmount: Math.round(received * 100) / 100,
          tdsAmount: Math.round(tds * 100) / 100,
          deduction: Math.round(ded * 100) / 100,
        });
      }
    }
    if (!partyId) throw new Error('Select a party');
    if (lines.length === 0) throw new Error('Enter at least one line with received amount');
    return lines;
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
        notes: notes || undefined,
        status: 'POSTED',
        lines,
      });
      setLastSavedId(res.id);
      setSuccess(`Saved ${res.receiptNo ?? res.id}`);
      await loadPartyInvoices(partyId);
      setLineVals({});
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Money receipt</h2>
          <p className="text-sm text-slate-600">GR-level settlement against pending invoices</p>
        </div>
        <HeaderActions
          onSave={handleSave}
          onDelete={handleDelete}
          onPrint={handlePrint}
          onFind={handleFind}
          saving={saving}
          disabledSave={loadingInvoices || !partyId}
          disabledDelete={!lastSavedId}
        />
      </div>

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

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_288px] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Receipt details</CardTitle>
              <CardDescription>Header fields apply to the whole voucher</CardDescription>
            </CardHeader>
            <CardContent>
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
                referenceNo={referenceNo}
                onReferenceNoChange={setReferenceNo}
                notes={notes}
                onNotesChange={setNotes}
                branches={branches}
                banks={banks}
              />
            </CardContent>
          </Card>

          <PartySection
            parties={parties}
            partyId={partyId}
            onPartyIdChange={setPartyId}
            loading={loading}
          />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Invoices & GR lines</h3>
            {loadingInvoices ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (
              <InvoiceAccordion
                invoices={invoices}
                lineDataByInvoice={lineDataByInvoice}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                lineVals={lineVals}
                onLineReceivedChange={onLineReceivedChange}
                onLineTdsChange={onLineTdsChange}
                onLineDeductionChange={onLineDeductionChange}
                onAutoAllocate={onAutoAllocate}
              />
            )}
          </div>
        </div>

        <aside className="mt-6 min-w-0 lg:mt-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <SummaryFooter
            totalInvoiceAmount={totals.totalInvoiceAmount}
            totalReceived={totals.totalReceived}
            totalTds={totals.totalTds}
            totalDeduction={totals.totalDeduction}
            finalNet={totals.finalNet}
            balanceRemaining={totals.balanceRemaining}
          />
        </aside>
      </div>
    </div>
  );
}
