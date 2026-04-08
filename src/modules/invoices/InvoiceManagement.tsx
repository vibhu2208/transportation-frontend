'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Users,
  FileText,
  Download,
  Loader2,
  Receipt,
  LayoutTemplate,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import { invoicesApi } from './api';
import { partiesApi } from '../parties/api';
import {
  PendingTripsByParty,
  CreateInvoiceRequest,
  Invoice,
  InvoiceTemplate,
} from './types';
import { Party } from '../parties/types';

export default function InvoiceManagement() {
  const [pendingTrips, setPendingTrips] = useState<PendingTripsByParty[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const pendingTotalCount = pendingTrips.reduce((sum, p) => sum + p.tripCount, 0);

  const handlePartySelect = (partyName: string) => {
    setSelectedParty(partyName);
    setSelectedTrips([]);
    setShowCreateForm(false);

    const partyMaster = parties.find((p) => p.name === partyName);
    if (partyMaster) {
      setPartyGstIn(partyMaster.gstIn || '');
      setPartyAddress(partyMaster.address || '');
    } else {
      setPartyGstIn('');
      setPartyAddress('');
    }
  };

  const handleTripToggle = (tripId: string) => {
    setSelectedTrips((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId],
    );
  };

  const handleCreateInvoice = async () => {
    if (!selectedParty || selectedTrips.length === 0) {
      setError('Please select a party and at least one trip');
      return;
    }

    setCreatingInvoice(true);
    setError(null);

    try {
      const partyMaster = parties.find((p) => p.name === selectedParty);
      const invoiceData: CreateInvoiceRequest = {
        tripIds: selectedTrips,
        partyId: partyMaster?.id,
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
      setShowCreateForm(false);

      await loadInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getPaidTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + r.amount, 0);

  const getRemaining = (inv: Invoice) =>
    Math.max(0, Math.round((inv.grandTotal - getPaidTotal(inv)) * 100) / 100);

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
  const selectedTripsData =
    selectedPartyData?.trips.filter((trip) => selectedTrips.includes(trip.id)) || [];
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-10 sm:px-0">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoice management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select pending trips, create invoices, record payments, and download PDFs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-9 rounded-lg px-3 text-sm font-medium">
            {pendingTotalCount} pending trip{pendingTotalCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="h-9 rounded-lg px-3 text-sm font-medium">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
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

      {/* Step 1–2: Create flow (single column, correct order) */}
      <section className="space-y-6" aria-label="Create invoice">
        <Card className="rounded-xl border-slate-200/80 shadow-md">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
                1
              </span>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5 text-emerald-700" />
                  Choose party & trips
                </CardTitle>
                <CardDescription className="mt-1">
                  Only parties linked in <strong>Parties</strong> appear here. Pick trips ready for invoicing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {pendingTrips.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No pending trips for invoicing. Move trips to <strong>INVOICING</strong> status first.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="party-select" className="text-slate-700">
                    Party
                  </Label>
                  <Select value={selectedParty} onValueChange={handlePartySelect}>
                    <SelectTrigger id="party-select" className="h-11 rounded-lg">
                      <SelectValue placeholder="Select a party…" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingTrips
                        .filter((party) => parties.some((p) => p.name === party.partyName))
                        .map((party) => (
                          <SelectItem key={party.partyName} value={party.partyName}>
                            {party.partyName} ({party.tripCount} trips)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedParty && selectedPartyData && (
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Trips for {selectedParty}
                    </p>
                    <div className="space-y-2">
                      {selectedPartyData.trips.map((trip) => (
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

                    {selectedTrips.length > 0 && !showCreateForm && (
                      <Button
                        type="button"
                        className="mt-2 w-full rounded-lg sm:w-auto"
                        onClick={() => setShowCreateForm(true)}
                      >
                        Continue to invoice details
                        <span className="ml-2 rounded-md bg-white/20 px-2 py-0.5 text-xs">
                          {selectedTrips.length} selected
                        </span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreateForm && selectedParty && (
          <Card className="rounded-xl border-emerald-200/60 shadow-md ring-1 ring-emerald-100">
            <CardHeader className="border-b border-emerald-100/80 bg-emerald-50/30 pb-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5 text-emerald-700" />
                    Invoice details & totals
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Review GST and address, then create the invoice.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Party name</Label>
                  <Input value={selectedParty} disabled className="mt-1.5 rounded-lg bg-slate-50" />
                </div>
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
                        {trip.tripNo}{' '}
                        <span className="text-slate-500">
                          · {trip.fromLocation} → {trip.toLocation}
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
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setShowCreateForm(false)}
                >
                  Back to trip selection
                </Button>
                <Button
                  type="button"
                  className="rounded-lg"
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
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
            </CardContent>
          </Card>
        )}
      </section>

      {/* Step 3: Existing invoices */}
      <section aria-label="Recent invoices">
        <Card className="rounded-xl border-slate-200/80 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-800">
                3
              </span>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Receipt className="h-5 w-5 text-slate-700" />
                  Invoices & collections
                </CardTitle>
                <CardDescription className="mt-1">
                  Download invoice PDFs, record money receipts, and track balance due.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {invoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{invoice.invoiceNo}</h3>
                          <Badge
                            variant={invoice.status === 'DRAFT' ? 'secondary' : 'default'}
                            className="rounded-md"
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {invoice.partyName} ·{' '}
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-sm text-slate-700">
                          {invoice.trips.length} trip{invoice.trips.length !== 1 ? 's' : ''} · Total ₹
                          {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-slate-600">
                          Paid ₹{getPaidTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Due
                          ₹{getRemaining(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
                        {invoice.partyId && (
                          <Link
                            href={`/admin/dashboard/money-receipts?partyId=${encodeURIComponent(invoice.partyId)}`}
                            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50"
                          >
                            GR settlement
                          </Link>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => toggleMoneyReceiptSection(invoice.id)}
                        >
                          Money receipts
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="rounded-lg"
                          onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNo)}
                          disabled={downloadingPdf === invoice.id}
                        >
                          {downloadingPdf === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Invoice PDF
                        </Button>
                      </div>
                    </div>

                    {moneyReceiptOpenFor === invoice.id && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* PDF template — last (applies to downloads only) */}
      <section aria-label="PDF template">
        <Card className="rounded-xl border-slate-200/80 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start gap-3">
              <LayoutTemplate className="mt-0.5 h-5 w-5 text-slate-600" />
              <div>
                <CardTitle className="text-lg font-semibold">PDF template (downloads)</CardTitle>
                <CardDescription className="mt-1">
                  Used when you click <strong>Invoice PDF</strong> above. Does not affect invoice totals.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Template</Label>
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
                <p className="mt-2 text-xs text-slate-500">
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
                    rows={8}
                  />
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Variables: <code className="rounded bg-white px-1">{`{{invoiceNo}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{invoiceDate}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{partyName}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{partyAddress}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{partyGstIn}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{subTotal}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{gstRate}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{gstAmount}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{grandTotal}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{notes}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{tripCount}}`}</code>,{' '}
              <code className="rounded bg-white px-1">{`{{tripsRows}}`}</code>.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
