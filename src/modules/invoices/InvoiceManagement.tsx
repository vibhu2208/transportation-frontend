'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Truck,
  Calendar,
  MapPin,
  FileText,
  Download,
  Loader2,
  Receipt,
  RefreshCw,
  IndianRupee,
  Search,
  X,
} from 'lucide-react';
import { invoicesApi } from './api';
import { partiesApi } from '../parties/api';
import {
  PendingTripsByParty,
  CreateInvoiceRequest,
  Invoice,
  InvoiceTemplate,
} from './types';
import { Party, PartyBranch } from '../parties/types';

function todayIsoDate(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export default function InvoiceManagement() {
  const [pendingTrips, setPendingTrips] = useState<PendingTripsByParty[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate);
  const [dueDate, setDueDate] = useState('');
  const [delivered, setDelivered] = useState(false);
  const [partyInput, setPartyInput] = useState('');
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyComboboxRef = useRef<HTMLDivElement>(null);
  /** Filters pending trips by origin when creating an invoice */
  const [tripOriginFilter, setTripOriginFilter] = useState('');
  /** Filters saved invoices: any trip whose fromLocation matches */
  const [invoiceFromLocationFilter, setInvoiceFromLocationFilter] = useState('');
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [customTemplateHtml, setCustomTemplateHtml] = useState<string>('');
  const [moneyReceiptOpenFor, setMoneyReceiptOpenFor] = useState<string | null>(null);
  const [mrPaymentType, setMrPaymentType] = useState<'PARTIAL' | 'FULL'>('PARTIAL');
  const [mrAmount, setMrAmount] = useState('');
  const [mrPaymentMode, setMrPaymentMode] = useState('');
  const [mrReferenceNo, setMrReferenceNo] = useState('');
  const [mrNotes, setMrNotes] = useState('');
  const [mrPaymentDate, setMrPaymentDate] = useState('');
  const [creatingMr, setCreatingMr] = useState(false);
  const [downloadingMr, setDownloadingMr] = useState<string | null>(null);

  const [partyGstIn, setPartyGstIn] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [gstRate, setGstRate] = useState('12');
  const [notes, setNotes] = useState('');
  const [billingBranches, setBillingBranches] = useState<PartyBranch[]>([]);
  const [selectedPartyBranchId, setSelectedPartyBranchId] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingTripsData, invoicesData, partiesData] = await Promise.all([
        invoicesApi.getPendingTripsByParty(),
        invoicesApi.getInvoices(),
        partiesApi.getParties(),
      ]);
      const templateData = await invoicesApi.getInvoiceTemplates();
      setPendingTrips(pendingTripsData);
      setInvoices(invoicesData);
      setParties(partiesData);
      setTemplates(templateData);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        partyComboboxRef.current &&
        !partyComboboxRef.current.contains(e.target as Node)
      ) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pendingTotalCount = pendingTrips.reduce((sum, p) => sum + p.tripCount, 0);

  const handlePartySelect = async (partyName: string) => {
    setPartyInput(partyName);
    setPartyDropdownOpen(false);
    setSelectedParty(partyName);
    setSelectedTrips([]);
    setSelectedPartyBranchId('');
    setBillingBranches([]);

    const partyMaster = parties.find((p) => p.name === partyName);
    if (partyMaster) {
      setPartyGstIn(partyMaster.gstIn || '');
      setPartyAddress(partyMaster.address || '');
      setLoadingBranches(true);
      try {
        const brs = await partiesApi.listPartyBranches(partyMaster.id);
        setBillingBranches(brs);
        if (brs.length === 1) {
          setSelectedPartyBranchId(brs[0].id);
          setPartyAddress(brs[0].address || partyMaster.address || '');
        }
      } catch {
        setBillingBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    } else {
      setPartyGstIn('');
      setPartyAddress('');
    }
  };

  const clearPartySelection = () => {
    setPartyInput('');
    setSelectedParty('');
    setSelectedTrips([]);
    setSelectedPartyBranchId('');
    setBillingBranches([]);
    setPartyGstIn('');
    setPartyAddress('');
  };

  const handleBillingBranchChange = (branchId: string) => {
    setSelectedPartyBranchId(branchId);
    setSelectedTrips([]);
    const b = billingBranches.find((x) => x.id === branchId);
    const pm = parties.find((p) => p.name === selectedParty);
    if (b && pm) {
      setPartyAddress(b.address || pm.address || '');
      setPartyGstIn(pm.gstIn || '');
    }
  };

  const handleTripToggle = (tripId: string) => {
    setSelectedTrips((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId],
    );
  };

  const handleCreateInvoice = async () => {
    if (!invoiceNo.trim()) {
      setError('Enter an invoice number');
      return;
    }
    if (!selectedParty || selectedTrips.length === 0) {
      setError('Please select a party and at least one trip');
      return;
    }

    const partyMaster = parties.find((p) => p.name === selectedParty);
    const resolvedBranchId =
      billingBranches.length === 1
        ? billingBranches[0].id
        : selectedPartyBranchId;
    if (billingBranches.length > 1 && !resolvedBranchId) {
      setError('Select a billing branch before creating the invoice');
      return;
    }

    setCreatingInvoice(true);
    setError(null);

    try {
      const invoiceData: CreateInvoiceRequest = {
        invoiceNo: invoiceNo.trim(),
        invoiceDate: invoiceDate ? `${invoiceDate}T12:00:00.000Z` : undefined,
        dueDate: dueDate.trim() ? `${dueDate.trim()}T12:00:00.000Z` : null,
        delivered,
        tripIds: selectedTrips,
        partyId: partyMaster?.id,
        partyBranchId: resolvedBranchId || undefined,
        partyName: selectedParty,
        partyGstIn: partyGstIn || undefined,
        partyAddress: partyAddress || undefined,
        gstRate: parseFloat(gstRate) || 12,
        notes: notes || undefined,
      };

      const invoice = await invoicesApi.createInvoice(invoiceData);
      setSuccess(`Invoice ${invoice.invoiceNo} created successfully!`);

      setSelectedParty('');
      setSelectedTrips([]);
      setPartyGstIn('');
      setPartyAddress('');
      setGstRate('12');
      setNotes('');
      setBillingBranches([]);
      setSelectedPartyBranchId('');
      setInvoiceNo('');
      setInvoiceDate(todayIsoDate());
      setDueDate('');
      setDelivered(false);
      setPartyInput('');
      setTripOriginFilter('');
      setPartyDropdownOpen(false);

      await loadInitialData();
      setShowCreateInvoiceDialog(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create invoice',
      );
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getPaidTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + r.amount, 0);

  const getRemaining = (inv: Invoice) =>
    Math.max(0, Math.round((inv.grandTotal - getPaidTotal(inv)) * 100) / 100);

  const getInvoicePaymentTag = (inv: Invoice) =>
    getRemaining(inv) <= 0.01 ? 'PAID' : 'UNPAID';

  const toggleMoneyReceiptSection = (invoiceId: string) => {
    if (moneyReceiptOpenFor === invoiceId) {
      setMoneyReceiptOpenFor(null);
      return;
    }
    setMoneyReceiptOpenFor(invoiceId);
    setMrPaymentType('PARTIAL');
    setMrAmount('');
    setMrPaymentMode('');
    setMrReferenceNo('');
    setMrNotes('');
    setMrPaymentDate('');
  };

  const handleCreateMoneyReceipt = async (invoiceId: string) => {
    if (mrPaymentType === 'PARTIAL' && (!mrAmount || parseFloat(mrAmount) <= 0)) {
      setError('Enter a valid amount for partial payment');
      return;
    }
    setCreatingMr(true);
    setError(null);
    try {
      await invoicesApi.createMoneyReceipt(invoiceId, {
        paymentType: mrPaymentType,
        amount: mrPaymentType === 'PARTIAL' ? parseFloat(mrAmount) : undefined,
        paymentMode: mrPaymentMode || undefined,
        referenceNo: mrReferenceNo || undefined,
        notes: mrNotes || undefined,
        paymentDate: mrPaymentDate || undefined,
      });
      setSuccess('Money receipt recorded successfully');
      setMoneyReceiptOpenFor(null);
      await loadInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create money receipt');
    } finally {
      setCreatingMr(false);
    }
  };

  const handleDownloadMoneyReceipt = async (
    invoiceId: string,
    receiptId: string,
    receiptNo: string,
  ) => {
    const key = `${invoiceId}:${receiptId}`;
    setDownloadingMr(key);
    try {
      const blob = await invoicesApi.downloadMoneyReceiptPdf(invoiceId, receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download money receipt');
    } finally {
      setDownloadingMr(null);
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNo: string) => {
    setDownloadingPdf(invoiceId);
    try {
      const blob = await invoicesApi.downloadInvoicePdf(invoiceId, {
        templateKey: selectedTemplate,
        customHtmlTemplate: selectedTemplate === 'custom' ? customTemplateHtml : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const selectedPartyData = pendingTrips.find((p) => p.partyName === selectedParty);
  const resolvedBranchId =
    billingBranches.length === 1 ? billingBranches[0].id : selectedPartyBranchId;

  const tripsForBranch = useMemo(() => {
    if (!selectedPartyData) return [];
    if (billingBranches.length <= 1) return selectedPartyData.trips;
    if (!resolvedBranchId) return [];
    return selectedPartyData.trips.filter((trip) => trip.partyBranchId === resolvedBranchId);
  }, [selectedPartyData, billingBranches.length, resolvedBranchId]);

  const tripsForBranchFiltered = useMemo(() => {
    const q = tripOriginFilter.trim().toLowerCase();
    if (!q) return tripsForBranch;
    return tripsForBranch.filter((t) => (t.fromLocation || '').toLowerCase().includes(q));
  }, [tripsForBranch, tripOriginFilter]);

  const eligiblePendingParties = useMemo(
    () =>
      pendingTrips.filter((party) => parties.some((p) => p.name === party.partyName)),
    [pendingTrips, parties],
  );

  const partySuggestions = useMemo(() => {
    const q = partyInput.trim().toLowerCase();
    if (!q) return eligiblePendingParties;
    return eligiblePendingParties.filter((p) => p.partyName.toLowerCase().includes(q));
  }, [eligiblePendingParties, partyInput]);

  const filteredInvoices = useMemo(() => {
    const loc = invoiceFromLocationFilter.trim().toLowerCase();
    if (!loc) return invoices;
    return invoices.filter((inv) =>
      (inv.trips || []).some((t) => (t.fromLocation || '').toLowerCase().includes(loc)),
    );
  }, [invoices, invoiceFromLocationFilter]);

  const selectedTripsData =
    tripsForBranchFiltered.filter((trip) => selectedTrips.includes(trip.id)) || [];
  const getTripAmount = (trip: { effectiveFreight?: number; freight?: number | null }) =>
    trip.effectiveFreight ?? trip.freight ?? 0;
  const totalFreight = selectedTripsData.reduce((sum, trip) => sum + getTripAmount(trip), 0);
  const gstAmount = (totalFreight * parseFloat(gstRate || '0')) / 100;
  const grandTotal = totalFreight + gstAmount;

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-slate-200/80 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoice management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select pending trips, create invoices, record payments, and download PDFs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => setShowCreateInvoiceDialog(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Create invoice
          </Button>
          <Badge variant="outline" className="h-9 rounded-lg px-3 text-sm font-medium">
            {pendingTotalCount} pending trip{pendingTotalCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="h-9 rounded-lg px-3 text-sm font-medium">
            {invoiceFromLocationFilter.trim()
              ? `${filteredInvoices.length} of ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`
              : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => {
              setError(null);
              setSuccess(null);
              loadInitialData();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-xl border-emerald-200 bg-emerald-50/80 text-emerald-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {showCreateInvoiceDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 sm:p-6">
          <div className="mx-auto h-full w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Create invoice</h3>
                <p className="text-xs text-slate-500">Fill details and select trips to generate a new invoice.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceDialog(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close create invoice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <section className="min-w-0 space-y-6" aria-label="Create invoice">
        <Card className="rounded-xl border-slate-200/80 shadow-md">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  Create invoice
                </CardTitle>
                <CardDescription className="mt-1">
                  Enter invoice details, pick a party from the search field, filter trips by origin, select billing
                  branch (same ledger as GR billing), choose trips (GR/LR shown), then create.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {pendingTrips.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No pending trips for invoicing. Move trips to <strong>INVOICING</strong> status first.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="inv-no">
                      Invoice number <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="inv-no"
                      className="mt-1.5 rounded-lg"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Enter document number"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-date">Invoice date</Label>
                    <Input
                      id="inv-date"
                      type="date"
                      className="mt-1.5 rounded-lg"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due-date">Due date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      className="mt-1.5 rounded-lg"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <Checkbox checked={delivered} onCheckedChange={(v) => setDelivered(v === true)} />
                      Delivered
                    </label>
                  </div>
                </div>

                <div ref={partyComboboxRef} className="relative space-y-2">
                  <div className="flex items-end justify-between gap-2">
                    <Label htmlFor="party-combo" className="text-slate-700">
                      Party <span className="text-red-600">*</span>
                    </Label>
                    <span className="text-xs text-slate-500">Search and select in one field</span>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="party-combo"
                      className="h-11 rounded-lg pl-9 pr-10"
                      value={partyInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPartyInput(v);
                        setPartyDropdownOpen(true);
                        if (selectedParty && v.trim() !== selectedParty) {
                          setSelectedParty('');
                          setSelectedTrips([]);
                          setSelectedPartyBranchId('');
                          setBillingBranches([]);
                          setPartyGstIn('');
                          setPartyAddress('');
                        }
                      }}
                      onFocus={() => setPartyDropdownOpen(true)}
                      placeholder="Type a name, then choose from the list…"
                      autoComplete="off"
                    />
                    {partyInput ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Clear party"
                        onClick={() => {
                          clearPartySelection();
                          setPartyDropdownOpen(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {partyDropdownOpen && (
                    <ul
                      className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
                      role="listbox"
                    >
                      {partySuggestions.length === 0 ? (
                        <li className="px-3 py-3 text-sm text-slate-500">No matching parties with pending trips.</li>
                      ) : (
                        partySuggestions.map((party) => (
                          <li key={party.partyName} role="option">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50/80"
                              onClick={() => handlePartySelect(party.partyName)}
                            >
                              <span className="font-medium text-slate-900">{party.partyName}</span>
                              <Badge variant="secondary" className="shrink-0 font-normal">
                                {party.tripCount} trip{party.tripCount !== 1 ? 's' : ''}
                              </Badge>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                  {loadingBranches && selectedParty && (
                    <p className="text-xs text-slate-500">Loading billing branches…</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="trip-origin-filter" className="inline-flex items-center gap-1.5 text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    Trips: filter by from location
                  </Label>
                  <Input
                    id="trip-origin-filter"
                    className="mt-1.5 rounded-lg"
                    value={tripOriginFilter}
                    onChange={(e) => setTripOriginFilter(e.target.value)}
                    placeholder="e.g. city or loading point — applies to trip list below"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Narrows which pending trips you can tick for this invoice (does not affect the invoice list on the
                    right).
                  </p>
                </div>

                {selectedParty && selectedPartyData && billingBranches.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="branch-select" className="text-slate-700">
                      Billing branch / ledger
                    </Label>
                    <Select
                      value={selectedPartyBranchId}
                      onValueChange={handleBillingBranchChange}
                    >
                      <SelectTrigger id="branch-select" className="h-11 rounded-lg">
                        <SelectValue placeholder="Select ledger / location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {billingBranches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.locationLabel ? `${b.locationLabel} — ` : ''}
                            {b.fullLedgerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Matches trip billing branch tagging (same idea as GR branch / bill-to ledger).
                    </p>
                  </div>
                )}

                {selectedParty && selectedPartyData && billingBranches.length === 1 && (
                  <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-3 py-2 text-sm text-slate-800">
                    <span className="font-medium text-emerald-900">Billing branch / ledger: </span>
                    {billingBranches[0].fullLedgerName}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>PDF template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="mt-1.5 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.key} value={template.key}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-500">
                      {templates.find((t) => t.key === selectedTemplate)?.description}
                    </p>
                  </div>
                  {selectedTemplate === 'custom' && (
                    <div className="md:col-span-2">
                      <Label>Custom HTML</Label>
                      <Textarea
                        className="mt-1.5 rounded-lg font-mono text-xs"
                        value={customTemplateHtml}
                        onChange={(e) => setCustomTemplateHtml(e.target.value)}
                        placeholder="<html>…</html>"
                        rows={4}
                      />
                    </div>
                  )}
                </div>

                {selectedParty && selectedPartyData && (
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Select trips · {tripsForBranchFiltered.length} shown
                      {tripOriginFilter.trim() ? ' (filtered by from location)' : ''}
                    </p>
                    {billingBranches.length > 1 && !resolvedBranchId ? (
                      <p className="text-sm text-amber-800">Select a billing branch above to load trips.</p>
                    ) : tripsForBranchFiltered.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No trips match. Adjust dispatch filter or branch, or assign trips in trip details.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tripsForBranchFiltered.map((trip) => (
                          <label
                            key={trip.id}
                            htmlFor={`trip-${trip.id}`}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm"
                          >
                            <Checkbox
                              id={`trip-${trip.id}`}
                              checked={selectedTrips.includes(trip.id)}
                              onCheckedChange={() => handleTripToggle(trip.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{trip.tripNo}</span>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  GR/LR: {trip.grLrNo?.trim() || '—'}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                  ₹{getTripAmount(trip).toLocaleString('en-IN')}
                                </Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(trip.date).toLocaleDateString('en-IN')}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {trip.fromLocation} → {trip.toLocation}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Truck className="h-3.5 w-3.5" />
                                  {trip.vehicleNumber}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="gstIn">GSTIN (optional)</Label>
                    <Input
                      id="gstIn"
                      className="mt-1.5 rounded-lg"
                      value={partyGstIn}
                      onChange={(e) => setPartyGstIn(e.target.value)}
                      placeholder="27AAAPL1234C1ZV"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstRate">GST rate</Label>
                    <Select value={gstRate} onValueChange={setGstRate}>
                      <SelectTrigger id="gstRate" className="mt-1.5 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Party address (optional)</Label>
                    <Textarea
                      id="address"
                      className="mt-1.5 rounded-lg"
                      value={partyAddress}
                      onChange={(e) => setPartyAddress(e.target.value)}
                      placeholder="Billing address"
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      className="mt-1.5 rounded-lg"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Shown on invoice"
                      rows={2}
                    />
                  </div>
                </div>

                {selectedParty && selectedTrips.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-slate-900">
                        Selected trips ({selectedTrips.length})
                      </h4>
                      <ul className="space-y-2">
                        {selectedTripsData.map((trip) => (
                          <li
                            key={trip.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 text-slate-700">
                              <span className="font-medium">{trip.tripNo}</span>
                              <span className="text-slate-500">
                                {' '}
                                · GR/LR {trip.grLrNo?.trim() || '—'} · {trip.fromLocation} → {trip.toLocation}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              ₹{getTripAmount(trip).toLocaleString('en-IN')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="tabular-nums font-medium">
                            ₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">GST @ {gstRate}%</span>
                          <span className="tabular-nums font-medium">
                            ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-base font-semibold text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" />
                            Grand total
                          </span>
                          <span className="tabular-nums">
                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        className="rounded-lg"
                        onClick={handleCreateInvoice}
                        disabled={creatingInvoice || !invoiceNo.trim()}
                      >
                        {creatingInvoice ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          'Create invoice'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
            </div>
          </div>
        </div>
      )}

      <section
        className="min-w-0"
        aria-label="Recent invoices"
      >
        <Card className="rounded-xl border-slate-200/80 shadow-md ring-1 ring-slate-200/60">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900">Invoices & collections</CardTitle>
                <CardDescription className="mt-1">
                  {invoiceFromLocationFilter.trim()
                    ? `${filteredInvoices.length} of ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} match · PDFs and payments`
                    : 'Download invoice PDFs, record money receipts, and track balance due.'}
                </CardDescription>
              </div>
            </div>
            {invoices.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="invoice-from-filter" className="inline-flex items-center gap-1.5 text-slate-700">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  From location (trips on invoice)
                </Label>
                <Input
                  id="invoice-from-filter"
                  className="rounded-lg"
                  value={invoiceFromLocationFilter}
                  onChange={(e) => setInvoiceFromLocationFilter(e.target.value)}
                  placeholder="Type to filter invoices by any trip’s origin…"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-500">
                  Keeps invoices where at least one line has a matching <strong>from</strong> location.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {invoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No invoices yet.</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No invoices match this from-location filter.{' '}
                <button
                  type="button"
                  className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                  onClick={() => setInvoiceFromLocationFilter('')}
                >
                  Clear filter
                </button>
              </p>
            ) : (
              <div className="table-scroll-bleed overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-3 py-2 font-semibold text-slate-700">Invoice</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Party</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">GR/LR</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Trips</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Total</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Paid</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Due</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredInvoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                        <tr className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{invoice.invoiceNo}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-slate-800">{invoice.partyName}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {(() => {
                              const grNumbers = Array.from(
                                new Set(
                                  (invoice.trips || [])
                                    .map((trip) => (trip.grLrNo || '').trim())
                                    .filter(Boolean),
                                ),
                              );
                              if (!grNumbers.length) return '—';
                              const shown = grNumbers.slice(0, 2);
                              const more = grNumbers.length - shown.length;
                              return `${shown.join(', ')}${more > 0 ? ` +${more}` : ''}`;
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{invoice.trips.length}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{getPaidTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{getRemaining(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge
                              variant={getInvoicePaymentTag(invoice) === 'PAID' ? 'default' : 'secondary'}
                              className="rounded-md"
                            >
                              {getInvoicePaymentTag(invoice)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-2">
                              {invoice.partyId && (
                                <Link
                                  href={`/admin/dashboard/money-receipts?partyId=${encodeURIComponent(invoice.partyId)}`}
                                  className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                                >
                                  GR settlement
                                </Link>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md px-2.5 text-xs"
                                onClick={() => toggleMoneyReceiptSection(invoice.id)}
                              >
                                Money receipts
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-md px-2.5 text-xs"
                                onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNo)}
                                disabled={downloadingPdf === invoice.id}
                              >
                                {downloadingPdf === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {moneyReceiptOpenFor === invoice.id && (
                          <tr>
                            <td colSpan={10} className="bg-slate-50 p-3">
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">Record payment</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Payment type</Label>
                            <Select
                              value={mrPaymentType}
                              onValueChange={(v) => setMrPaymentType(v as 'PARTIAL' | 'FULL')}
                            >
                              <SelectTrigger className="mt-1.5 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                                <SelectItem value="FULL">Full (remaining)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {mrPaymentType === 'PARTIAL' && (
                            <div>
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="mt-1.5 rounded-lg"
                                value={mrAmount}
                                onChange={(e) => setMrAmount(e.target.value)}
                                placeholder="Amount"
                              />
                            </div>
                          )}
                          <div>
                            <Label>Payment date (optional)</Label>
                            <Input
                              type="date"
                              className="mt-1.5 rounded-lg"
                              value={mrPaymentDate}
                              onChange={(e) => setMrPaymentDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Mode</Label>
                            <Input
                              className="mt-1.5 rounded-lg"
                              value={mrPaymentMode}
                              onChange={(e) => setMrPaymentMode(e.target.value)}
                              placeholder="Cash / Bank / UPI"
                            />
                          </div>
                          <div>
                            <Label>Reference no.</Label>
                            <Input
                              className="mt-1.5 rounded-lg"
                              value={mrReferenceNo}
                              onChange={(e) => setMrReferenceNo(e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              className="mt-1.5 rounded-lg"
                              value={mrNotes}
                              onChange={(e) => setMrNotes(e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="mt-4 rounded-lg"
                          onClick={() => handleCreateMoneyReceipt(invoice.id)}
                          disabled={creatingMr || getRemaining(invoice) <= 0}
                        >
                          {creatingMr ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            'Save money receipt'
                          )}
                        </Button>

                        {(invoice.moneyReceipts?.length ?? 0) === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">No money receipts yet.</p>
                        ) : (
                          <>
                            <div className="mt-4 md:hidden space-y-3">
                              {(invoice.moneyReceipts || []).map((r) => (
                                <div
                                  key={r.id}
                                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-mono text-xs text-slate-800">{r.receiptNo}</span>
                                    <span className="text-xs text-slate-500">{r.paymentType}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-600">
                                    {new Date(r.paymentDate).toLocaleDateString('en-IN')}
                                  </p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="tabular-nums font-medium">
                                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg px-2"
                                      disabled={downloadingMr === `${invoice.id}:${r.id}`}
                                      onClick={() =>
                                        handleDownloadMoneyReceipt(invoice.id, r.id, r.receiptNo)
                                      }
                                    >
                                      {downloadingMr === `${invoice.id}:${r.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white table-scroll-bleed">
                              <table className="w-full min-w-[480px] text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50 text-left sticky top-0 z-10">
                                    <th className="px-3 py-2 font-medium text-slate-700">Receipt</th>
                                    <th className="px-3 py-2 font-medium text-slate-700">Date</th>
                                    <th className="px-3 py-2 font-medium text-slate-700">Type</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-700">Amount</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-700">PDF</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(invoice.moneyReceipts || []).map((r) => (
                                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                                      <td className="px-3 py-2 font-mono text-xs">{r.receiptNo}</td>
                                      <td className="px-3 py-2">
                                        {new Date(r.paymentDate).toLocaleDateString('en-IN')}
                                      </td>
                                      <td className="px-3 py-2">{r.paymentType}</td>
                                      <td className="px-3 py-2 text-right tabular-nums">
                                        ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 rounded-lg px-2"
                                          disabled={downloadingMr === `${invoice.id}:${r.id}`}
                                          onClick={() =>
                                            handleDownloadMoneyReceipt(invoice.id, r.id, r.receiptNo)
                                          }
                                        >
                                          {downloadingMr === `${invoice.id}:${r.id}` ? (
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
                          </>
                        )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="PDF template help">
        <p className="text-center text-xs text-slate-500">
          Custom templates support{' '}
          <code className="rounded bg-slate-100 px-1">{`{{invoiceNo}} {{invoiceDate}} {{dueDate}} {{delivered}}`}</code>
          , party, GST, totals, <code className="rounded bg-slate-100 px-1">{`{{tripsRows}}`}</code>, etc.
        </p>
      </section>
    </div>
  );
}
