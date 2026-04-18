'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import * as XLSX from 'xlsx';
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
  Trip,
} from './types';
import { Party, PartyBranch } from '../parties/types';

function todayIsoDate(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function pendingTripMatchesSearch(trip: Trip, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;

  const d = new Date(trip.date);
  const invalid = Number.isNaN(d.getTime());
  const iso = typeof trip.date === 'string' ? trip.date.slice(0, 10) : '';
  const localeIn = invalid ? '' : d.toLocaleDateString('en-IN');
  const localeUs = invalid ? '' : d.toLocaleDateString('en-US');
  const dd = invalid ? '' : String(d.getDate()).padStart(2, '0');
  const mm = invalid ? '' : String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = invalid ? '' : String(d.getFullYear());
  const routeArrow = `${trip.fromLocation} → ${trip.toLocation}`;
  const routeDash = `${trip.fromLocation} - ${trip.toLocation}`;
  const routePipe = `${trip.fromLocation} | ${trip.toLocation}`;
  const grCompact = (trip.grLrNo ?? '').replace(/\s+/g, '');
  const vehCompact = (trip.vehicleNumber ?? '').replace(/\s+/g, '');

  const hay = [
    trip.tripNo,
    trip.grLrNo ?? '',
    grCompact,
    trip.fromLocation,
    trip.toLocation,
    routeArrow,
    routeDash,
    routePipe,
    `${trip.fromLocation}${trip.toLocation}`,
    trip.vehicleNumber,
    vehCompact,
    iso,
    localeIn,
    localeUs,
    `${dd}/${mm}/${yyyy}`,
    `${mm}/${dd}/${yyyy}`,
    `${yyyy}-${mm}-${dd}`,
    yyyy,
    mm,
    dd,
  ]
    .join(' ')
    .toLowerCase();

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
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
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('main-invoice');
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
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
  const [invoiceTdsDeduction, setInvoiceTdsDeduction] = useState<Record<string, { tds: number; deduction: number }>>({});
  const [invoiceTdsPercentLabel, setInvoiceTdsPercentLabel] = useState<Record<string, string>>({});
  const [invoiceMrSummary, setInvoiceMrSummary] = useState<
    Record<
      string,
      Array<{
        id: string;
        receiptNo: string;
        paymentDate: string;
        paymentType: string;
        receivedAmount: number;
        tdsAmount: number;
        deductionAmount: number;
        tdsPercent: number;
      }>
    >
  >({});

  const [partyGstIn, setPartyGstIn] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [gstMovementType, setGstMovementType] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');
  const [notes, setNotes] = useState('');
  const [billingBranches, setBillingBranches] = useState<PartyBranch[]>([]);
  const [selectedPartyBranchId, setSelectedPartyBranchId] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | '1d' | '7d' | '1m' | 'custom'>('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [universalSearch, setUniversalSearch] = useState('');
  const [tripFilterQuery, setTripFilterQuery] = useState('');

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
    setTripFilterQuery('');
    setGstMovementType('INTRA_STATE');
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
    setTripFilterQuery('');
    setGstMovementType('INTRA_STATE');
    setSelectedPartyBranchId('');
    setBillingBranches([]);
    setPartyGstIn('');
    setPartyAddress('');
  };

  const handleBillingBranchChange = (branchId: string) => {
    setSelectedPartyBranchId(branchId);
    setSelectedTrips([]);
    setTripFilterQuery('');
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
        gstRate: parseFloat(gstRate) || 18,
        gstMovementType,
        notes: notes || undefined,
      };

      const invoice = await invoicesApi.createInvoice(invoiceData);
      setSuccess(`Invoice ${invoice.invoiceNo} created successfully!`);

      setSelectedParty('');
      setSelectedTrips([]);
      setPartyGstIn('');
      setPartyAddress('');
      setGstRate('18');
      setGstMovementType('INTRA_STATE');
      setNotes('');
      setBillingBranches([]);
      setSelectedPartyBranchId('');
      setInvoiceNo('');
      setInvoiceDate(todayIsoDate());
      setDueDate('');
      setDelivered(false);
      setPartyInput('');
      setPartyDropdownOpen(false);
      setTripFilterQuery('');

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

  const getReceivedTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + (r.receivedAmount ?? r.amount), 0);
  const getTdsTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + (r.tdsAmount ?? 0), 0);
  const getDeductionTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + (r.deductionAmount ?? 0), 0);

  const getRemaining = (inv: Invoice) =>
    Math.max(0, Math.round((inv.grandTotal - getPaidTotal(inv)) * 100) / 100);

  const getInvoicePaymentTag = (inv: Invoice) =>
    getRemaining(inv) <= 0.01 ? 'PAID' : 'UNPAID';

  const invoiceHeaderStats = useMemo(() => {
    let paidInvoices = 0;
    let unpaidInvoices = 0;
    let totalPaidAmount = 0;
    let totalUnpaidAmount = 0;
    let totalInvoiceAmount = 0;
    let paymentCycleDaysTotal = 0;
    let paymentCycleCount = 0;
    const partyAgg = new Map<string, { paid: number; total: number }>();

    for (const inv of invoices) {
      const received = (inv.moneyReceipts || []).reduce((s, r) => s + (r.receivedAmount ?? r.amount), 0);
      const settled = (inv.moneyReceipts || []).reduce((s, r) => s + r.amount, 0);
      const due = Math.max(0, Math.round((inv.grandTotal - settled) * 100) / 100);
      totalInvoiceAmount += inv.grandTotal ?? 0;

      totalPaidAmount += received;
      totalUnpaidAmount += due;

      if (due <= 0.01) paidInvoices += 1;
      else unpaidInvoices += 1;

      const key = inv.partyName || 'Unknown';
      const prev = partyAgg.get(key) ?? { paid: 0, total: 0 };
      prev.paid += received;
      prev.total += inv.grandTotal ?? 0;
      partyAgg.set(key, prev);

      const mrDates = (inv.moneyReceipts || [])
        .map((r) => (r.paymentDate ? new Date(r.paymentDate) : null))
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
      if (mrDates.length > 0 && received > 0) {
        const latestMr = new Date(Math.max(...mrDates.map((d) => d.getTime())));
        const invDate = new Date(inv.invoiceDate);
        if (!Number.isNaN(invDate.getTime())) {
          const days = Math.max(
            0,
            Math.round((latestMr.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)),
          );
          paymentCycleDaysTotal += days;
          paymentCycleCount += 1;
        }
      }
    }

    let bestPaymentRatioParty = '—';
    let bestPaymentRatioPct = 0;
    partyAgg.forEach((agg, partyName) => {
      if (agg.total > 0) {
        const ratio = (agg.paid / agg.total) * 100;
        if (ratio > bestPaymentRatioPct) {
          bestPaymentRatioPct = ratio;
          bestPaymentRatioParty = partyName;
        }
      }
    });
    const collectionEfficiencyPct =
      totalInvoiceAmount > 0 ? Math.round((totalPaidAmount / totalInvoiceAmount) * 10000) / 100 : 0;
    const averagePaymentCycleDays =
      paymentCycleCount > 0 ? Math.round((paymentCycleDaysTotal / paymentCycleCount) * 10) / 10 : 0;

    return {
      paidInvoices,
      unpaidInvoices,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      totalUnpaidAmount: Math.round(totalUnpaidAmount * 100) / 100,
      bestPaymentRatioParty,
      bestPaymentRatioPct: Math.round(bestPaymentRatioPct * 100) / 100,
      collectionEfficiencyPct,
      averagePaymentCycleDays,
    };
  }, [invoices]);

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

  const handleDownloadFilteredReport = () => {
    const rows = filteredInvoices.map((invoice) => {
      const paidStatus = getInvoicePaymentTag(invoice);
      return {
        'Invoice No': invoice.invoiceNo,
        'Invoice Date': new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
        Party: invoice.partyName,
        'Trip Count': invoice.trips.length,
        Freight: Number(getInvoiceFreightTotal(invoice).toFixed(2)),
        GST: Number((invoice.gstAmount ?? 0).toFixed(2)),
        Expense: Number(getInvoiceExpenseTotal(invoice).toFixed(2)),
        Total: Number((invoice.grandTotal ?? 0).toFixed(2)),
        Paid: Number(getReceivedTotal(invoice).toFixed(2)),
        Status: paidStatus,
        'From Locations': getInvoiceFromLocationsLabel(invoice),
        'GR/LR': Array.from(
          new Set(
            (invoice.trips || [])
              .map((trip) => (trip.grLrNo || '').trim())
              .filter(Boolean),
          ),
        ).join(', '),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Report');

    const stamp = new Date();
    const yyyy = stamp.getFullYear();
    const mm = String(stamp.getMonth() + 1).padStart(2, '0');
    const dd = String(stamp.getDate()).padStart(2, '0');
    const hh = String(stamp.getHours()).padStart(2, '0');
    const min = String(stamp.getMinutes()).padStart(2, '0');
    const fileName = `invoice-report-${yyyy}${mm}${dd}-${hh}${min}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const selectedPartyData = pendingTrips.find((p) => p.partyName === selectedParty);
  const resolvedBranchId =
    billingBranches.length === 1 ? billingBranches[0].id : selectedPartyBranchId;

  const tripsForBranch = useMemo(() => {
    if (!selectedPartyData) return [];
    if (billingBranches.length <= 1) return selectedPartyData.trips;
    if (!resolvedBranchId) {
      // Keep trips visible before branch selection; branch acts as a filter, not a blocker.
      return selectedPartyData.trips;
    }
    const exactMatches = selectedPartyData.trips.filter((trip) => trip.partyBranchId === resolvedBranchId);
    // Legacy trips may not have partyBranchId; fall back to all so invoicing isn't blocked.
    return exactMatches.length > 0 ? exactMatches : selectedPartyData.trips;
  }, [selectedPartyData, billingBranches.length, resolvedBranchId]);

  const tripsForBranchFiltered = useMemo(() => {
    if (!tripFilterQuery.trim()) return tripsForBranch;
    return tripsForBranch.filter((trip) => pendingTripMatchesSearch(trip, tripFilterQuery));
  }, [tripsForBranch, tripFilterQuery]);

  useEffect(() => {
    if (selectedTrips.length === 0) return;
    const movements = selectedTrips
      .map((id) => {
        const t = tripsForBranch.find((x) => x.id === id);
        const m = t?.goodsReceipts?.[0]?.gstMovementType;
        return m === 'INTER_STATE' || m === 'INTRA_STATE' ? m : null;
      })
      .filter((m): m is 'INTRA_STATE' | 'INTER_STATE' => m != null);
    if (movements.length === 0) return;
    const first = movements[0];
    const allSame = movements.every((m) => m === first);
    if (allSame) {
      setGstMovementType(first);
      return;
    }
    const lead = tripsForBranch.find((x) => x.id === selectedTrips[0]);
    const m = lead?.goodsReceipts?.[0]?.gstMovementType;
    if (m === 'INTER_STATE' || m === 'INTRA_STATE') setGstMovementType(m);
  }, [selectedTrips, tripsForBranch]);

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

  const getInvoiceFromLocationsLabel = (invoice: Invoice) => {
    const locations = Array.from(
      new Set((invoice.trips || []).map((trip) => (trip.fromLocation || '').trim()).filter(Boolean)),
    );
    if (!locations.length) return '—';
    const shown = locations.slice(0, 2);
    const more = locations.length - shown.length;
    return `${shown.join(', ')}${more > 0 ? ` +${more}` : ''}`;
  };

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7Days = new Date(startOfToday);
    startOf7Days.setDate(startOf7Days.getDate() - 6);
    const startOf1Month = new Date(startOfToday);
    startOf1Month.setMonth(startOf1Month.getMonth() - 1);

    return invoices.filter((invoice) => {
      const paidTag = getInvoicePaymentTag(invoice);
      if (statusFilter === 'paid' && paidTag !== 'PAID') return false;
      if (statusFilter === 'unpaid' && paidTag !== 'UNPAID') return false;

      const q = universalSearch.trim().toLowerCase();
      if (q) {
        const tripFields = (invoice.trips || [])
          .flatMap((trip) => [
            trip.tripNo || '',
            trip.grLrNo || '',
            trip.fromLocation || '',
            trip.toLocation || '',
            trip.vehicleNumber || '',
          ])
          .join(' ')
          .toLowerCase();
        const haystack = [
          invoice.invoiceNo || '',
          invoice.partyName || '',
          new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
          paidTag,
          getInvoiceFromLocationsLabel(invoice),
          tripFields,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      const party = (invoice.partyName || '').toLowerCase();
      if (partyFilter.trim() && !party.includes(partyFilter.trim().toLowerCase())) return false;

      if (durationFilter === 'all') return true;
      const invDate = new Date(invoice.invoiceDate);
      if (Number.isNaN(invDate.getTime())) return false;
      const invDay = new Date(invDate.getFullYear(), invDate.getMonth(), invDate.getDate());

      if (durationFilter === '1d') return invDay.getTime() === startOfToday.getTime();
      if (durationFilter === '7d') return invDay >= startOf7Days && invDay <= startOfToday;
      if (durationFilter === '1m') return invDay >= startOf1Month && invDay <= startOfToday;

      // custom
      if (!customFromDate && !customToDate) return true;
      const from = customFromDate ? new Date(customFromDate) : null;
      const to = customToDate ? new Date(customToDate) : null;
      const fromDay = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
      const toDay = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : null;
      if (fromDay && invDay < fromDay) return false;
      if (toDay && invDay > toDay) return false;
      return true;
    });
  }, [invoices, statusFilter, durationFilter, customFromDate, customToDate, partyFilter, universalSearch]);

  const selectedTripsData =
    tripsForBranch.filter((trip) => selectedTrips.includes(trip.id)) || [];
  const getTripAmount = (trip: { effectiveFreight?: number; freight?: number | null }) =>
    trip.effectiveFreight ?? trip.freight ?? 0;
  const getTripExpenseAmount = (trip: Trip) => {
    const t = trip as Trip & {
      totalExpense?: number | null;
      expense?: number | null;
      initialExpense?: number | null;
      tollExpense?: number | null;
      labourCharges?: number | null;
      otherCharges?: number | null;
      detentionLoading?: number | null;
      detentionUL?: number | null;
    };
    if (typeof t.totalExpense === 'number') return t.totalExpense;
    if (typeof t.expense === 'number') return t.expense;
    return (
      (t.initialExpense ?? 0) +
      (t.tollExpense ?? 0) +
      (t.labourCharges ?? 0) +
      (t.otherCharges ?? 0) +
      (t.detentionLoading ?? 0) +
      (t.detentionUL ?? 0)
    );
  };
  const getInvoiceFreightTotal = (invoice: Invoice) =>
    (invoice.trips || []).reduce((sum, trip) => sum + getTripAmount(trip), 0);
  const getInvoiceExpenseTotal = (invoice: Invoice) =>
    (invoice.trips || []).reduce((sum, trip) => sum + getTripExpenseAmount(trip), 0);
  const getInvoiceExpenseBreakdown = (invoice: Invoice) =>
    (invoice.trips || []).reduce(
      (acc, trip) => {
        const t = trip as Trip & {
          initialExpense?: number | null;
          tollExpense?: number | null;
          labourCharges?: number | null;
          otherCharges?: number | null;
          detentionLoading?: number | null;
          detentionUL?: number | null;
        };
        acc.initial += t.initialExpense ?? 0;
        acc.toll += t.tollExpense ?? 0;
        acc.labour += t.labourCharges ?? 0;
        acc.other += t.otherCharges ?? 0;
        acc.detentionLoading += t.detentionLoading ?? 0;
        acc.detentionUL += t.detentionUL ?? 0;
        return acc;
      },
      {
        initial: 0,
        toll: 0,
        labour: 0,
        other: 0,
        detentionLoading: 0,
        detentionUL: 0,
      },
    );
  const getLatestMrDate = (inv: Invoice) => {
    const dates = (inv.moneyReceipts || [])
      .map((r) => (r.paymentDate ? new Date(r.paymentDate) : null))
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  };
  const openInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoiceDetails(invoice);
    const receipts = invoice.moneyReceipts || [];
    if (receipts.length === 0) {
      setInvoiceMrSummary((prev) => ({ ...prev, [invoice.id]: [] }));
      return;
    }
    try {
      const details = await Promise.all(receipts.map((r) => invoicesApi.getMoneyReceiptById(r.id)));
      let tds = 0;
      let deduction = 0;
      const tdsPercents = new Set<number>();
      const mrRows: Array<{
        id: string;
        receiptNo: string;
        paymentDate: string;
        paymentType: string;
        receivedAmount: number;
        tdsAmount: number;
        deductionAmount: number;
        tdsPercent: number;
      }> = [];
      for (const mr of details) {
        const mrPercent = typeof mr?.tdsPercent === 'number' ? Math.round(mr.tdsPercent * 100) / 100 : 0;
        tdsPercents.add(mrPercent);
        let mrReceived = 0;
        let mrTds = 0;
        let mrDeduction = 0;
        for (const alloc of mr?.allocations || []) {
          if (alloc?.invoiceId !== invoice.id) continue;
          const receivedVal = Number(alloc?.receivedAmount || 0);
          const tdsVal = Number(alloc?.tdsAmount || 0);
          const deductionVal = Number(alloc?.deduction || 0);
          mrReceived += receivedVal;
          mrTds += tdsVal;
          mrDeduction += deductionVal;
          tds += tdsVal;
          deduction += deductionVal;
        }
        mrRows.push({
          id: String(mr?.id || ''),
          receiptNo: String(mr?.receiptNo || '—'),
          paymentDate: mr?.receiptDate ? String(mr.receiptDate) : '',
          paymentType: String(mr?.status || 'POSTED'),
          receivedAmount: Math.round(mrReceived * 100) / 100,
          tdsAmount: Math.round(mrTds * 100) / 100,
          deductionAmount: Math.round(mrDeduction * 100) / 100,
          tdsPercent: mrPercent,
        });
      }
      setInvoiceTdsDeduction((prev) => ({
        ...prev,
        [invoice.id]: {
          tds: Math.round(tds * 100) / 100,
          deduction: Math.round(deduction * 100) / 100,
        },
      }));
      const sortedPercents = Array.from(tdsPercents).sort((a, b) => a - b);
      setInvoiceTdsPercentLabel((prev) => ({
        ...prev,
        [invoice.id]: sortedPercents.length ? sortedPercents.map((p) => `${p}%`).join(', ') : '—',
      }));
      setInvoiceMrSummary((prev) => ({
        ...prev,
        [invoice.id]: mrRows,
      }));
    } catch {
      // Keep table-level values if detail fetch fails.
    }
  };
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

      {showCreateInvoiceDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-3 sm:p-6">
          <div className="mx-auto w-full max-w-5xl max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
              <h3 className="text-sm font-semibold text-slate-900">Create invoice</h3>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceDialog(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close create invoice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              <section className="min-w-0 space-y-6" aria-label="Create invoice">
        <Card className="rounded-xl border-slate-200/80 shadow-md">
          <CardContent className="space-y-3 p-4 pt-3 sm:p-5">
            {pendingTrips.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No pending trips for invoicing. Move trips to <strong>INVOICING</strong> status first.
              </p>
            ) : (
              <>
                <div className="-mx-0.5 flex min-w-0 flex-nowrap items-end gap-1.5 overflow-x-auto px-0.5 pb-px sm:gap-2">
                  <div className="min-w-[9.5rem] flex-1 basis-0">
                    <Label htmlFor="inv-no" className="text-xs">
                      Invoice number <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="inv-no"
                      className="mt-1 h-8 rounded-md px-2.5 text-sm"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Enter document number"
                      autoComplete="off"
                    />
                  </div>
                  <div className="w-[8.75rem] shrink-0 sm:w-[9rem]">
                    <Label htmlFor="inv-date" className="text-xs">
                      Invoice date
                    </Label>
                    <Input
                      id="inv-date"
                      type="date"
                      className="mt-1 h-8 rounded-md px-2 text-sm"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="w-[8.75rem] shrink-0 sm:w-[9rem]">
                    <Label htmlFor="due-date" className="text-xs">
                      Due date
                    </Label>
                    <Input
                      id="due-date"
                      type="date"
                      className="mt-1 h-8 rounded-md px-2 text-sm"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="shrink-0">
                    <label className="flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-slate-700">
                      <Checkbox checked={delivered} onCheckedChange={(v) => setDelivered(v === true)} />
                      Delivered
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
                  <div ref={partyComboboxRef} className="relative min-w-0 space-y-1">
                    <Label htmlFor="party-combo" className="text-xs font-medium text-slate-700">
                      Party <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-center text-slate-400"
                        aria-hidden
                      >
                        <Search className="h-4 w-4 shrink-0" />
                      </span>
                      <Input
                        id="party-combo"
                        className="h-9 rounded-md pl-9 pr-10 text-sm"
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
                          className="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Clear party"
                          onClick={() => {
                            clearPartySelection();
                            setPartyDropdownOpen(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                      {partyDropdownOpen && (
                        <ul
                          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
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
                    </div>
                    <p className="text-xs leading-snug text-slate-500">
                      Search and select in one field.
                    </p>
                    {loadingBranches && selectedParty && (
                      <p className="text-xs text-slate-500">Loading billing branches…</p>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor="pdf-template-select" className="text-xs font-medium text-slate-700">
                      PDF template
                    </Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="pdf-template-select" className="h-9 rounded-md text-sm">
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
                    <p className="text-xs leading-snug text-slate-500">
                      {templates.find((t) => t.key === selectedTemplate)?.description}
                    </p>
                    {selectedTemplate === 'custom' && (
                      <div className="pt-1">
                        <Label htmlFor="custom-template-html">Custom HTML</Label>
                        <Textarea
                          id="custom-template-html"
                          className="mt-1.5 rounded-lg font-mono text-xs"
                          value={customTemplateHtml}
                          onChange={(e) => setCustomTemplateHtml(e.target.value)}
                          placeholder="<html>…</html>"
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {selectedParty && selectedPartyData && billingBranches.length > 1 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="branch-select" className="text-xs text-slate-700">
                      Billing branch / ledger
                    </Label>
                    <Select
                      value={selectedPartyBranchId}
                      onValueChange={handleBillingBranchChange}
                    >
                      <SelectTrigger id="branch-select" className="h-9 rounded-md text-sm">
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

                {selectedParty && selectedPartyData && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Select trips ·{' '}
                        {tripFilterQuery.trim()
                          ? `${tripsForBranchFiltered.length} match${tripsForBranchFiltered.length !== 1 ? 'es' : ''} · ${tripsForBranch.length} total`
                          : `${tripsForBranch.length} shown`}
                      </p>
                    </div>
                    {tripsForBranch.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No trips available. Select another branch, or assign trips in trip details.
                      </p>
                    ) : (
                      <>
                        <div className="relative">
                          <span
                            className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center text-slate-400"
                            aria-hidden
                          >
                            <Search className="h-3.5 w-3.5 shrink-0" />
                          </span>
                          <Input
                            id="trip-filter"
                            type="text"
                            enterKeyHint="search"
                            className="h-8 rounded-md pl-8 pr-8 text-sm"
                            value={tripFilterQuery}
                            onChange={(e) => setTripFilterQuery(e.target.value)}
                            placeholder="GR/LR, date, route, vehicle…"
                            autoComplete="off"
                            aria-label="Filter trips by GR/LR number, date, locations, or vehicle"
                          />
                          {tripFilterQuery.trim() ? (
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Clear trip filter"
                              onClick={() => setTripFilterQuery('')}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[11px] leading-snug text-slate-500">
                          Filter by GR/LR, trip no., date, from/to, route, or vehicle (spaces ignored in GR and vehicle).
                        </p>
                      </>
                    )}
                    {tripsForBranch.length > 0 && tripsForBranchFiltered.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No trips match &ldquo;{tripFilterQuery.trim()}&rdquo;. Try another GR no., date, route, or vehicle.
                      </p>
                    ) : tripsForBranch.length > 0 ? (
                      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {tripsForBranchFiltered.map((trip) => (
                          <label
                            key={trip.id}
                            htmlFor={`trip-${trip.id}`}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 transition-shadow hover:shadow-sm"
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
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:items-start">
                    <div className="min-w-0">
                      <Label htmlFor="gstIn" className="text-xs">
                        GSTIN (optional)
                      </Label>
                      <Input
                        id="gstIn"
                        className="mt-1 h-8 rounded-md px-2.5 text-sm"
                        value={partyGstIn}
                        onChange={(e) => setPartyGstIn(e.target.value)}
                        placeholder="27AAAPL1234C1ZV"
                      />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="gstMovement" className="text-xs">
                        GST movement
                      </Label>
                      <Select
                        value={gstMovementType}
                        onValueChange={(value) => setGstMovementType(value as 'INTRA_STATE' | 'INTER_STATE')}
                      >
                        <SelectTrigger id="gstMovement" className="mt-1 h-9 rounded-md text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTRA_STATE">Intra-State (Within Same State)</SelectItem>
                          <SelectItem value="INTER_STATE">Inter-State (Between States)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-slate-500">
                        {gstMovementType === 'INTRA_STATE'
                          ? 'Delhi to Delhi: CGST 9% + SGST 9% (Total GST 18%)'
                          : 'Delhi to Haryana: IGST 18% (Total GST 18%)'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="address" className="text-xs">
                        Party address (optional)
                      </Label>
                      <Textarea
                        id="address"
                        className="mt-1 min-h-[4.5rem] resize-y rounded-md px-2.5 py-1.5 text-sm"
                        value={partyAddress}
                        onChange={(e) => setPartyAddress(e.target.value)}
                        placeholder="Billing address"
                        rows={2}
                      />
                    </div>
                  </div>

                  {selectedParty && selectedTrips.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-slate-900">
                          Selected trips ({selectedTrips.length})
                        </h4>
                        <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                          {selectedTripsData.map((trip) => (
                            <li
                              key={trip.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
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

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="tabular-nums font-medium">
                              ₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              {gstMovementType === 'INTRA_STATE' ? 'GST (CGST 9% + SGST 9%)' : 'GST (IGST 18%)'}
                            </span>
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
                    </>
                  )}

                  <div>
                    <Label htmlFor="notes" className="text-xs">
                      Notes (optional)
                    </Label>
                    <Textarea
                      id="notes"
                      className="mt-1 rounded-md px-2.5 py-1.5 text-sm"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Shown on invoice"
                      rows={2}
                    />
                  </div>
                </div>

                {selectedParty && selectedTrips.length > 0 && (
                  <div className="flex flex-col-reverse gap-1.5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      className="h-9 rounded-md px-4 text-sm"
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
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-[220px] shrink-0">
                <CardTitle className="text-lg font-semibold text-slate-900">Invoices & collections</CardTitle>
              </div>
              <div className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto">
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Unpaid invoices</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">{invoiceHeaderStats.unpaidInvoices}</p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Paid invoices</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">{invoiceHeaderStats.paidInvoices}</p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Total paid amount</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    ₹{invoiceHeaderStats.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Total unpaid amount</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    ₹{invoiceHeaderStats.totalUnpaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Best payment ratio party</p>
                  <p className="truncate text-base font-semibold text-slate-900">{invoiceHeaderStats.bestPaymentRatioParty}</p>
                  <p className="text-[11px] tabular-nums text-slate-500">
                    {invoiceHeaderStats.bestPaymentRatioPct.toLocaleString('en-IN', { minimumFractionDigits: 2 })}%
                  </p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Collection efficiency</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {invoiceHeaderStats.collectionEfficiencyPct.toLocaleString('en-IN', { minimumFractionDigits: 2 })}%
                  </p>
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Avg payment cycle</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {invoiceHeaderStats.averagePaymentCycleDays.toLocaleString('en-IN', { minimumFractionDigits: 1 })} days
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 px-3 py-3 sm:px-4">
                  <div className="flex flex-col items-start gap-1">
                    <Label className="text-[11px] text-slate-600">Payment status</Label>
                    <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                      {([
                        ['all', 'All'],
                        ['paid', 'Paid'],
                        ['unpaid', 'Unpaid'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStatusFilter(value)}
                          className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
                            statusFilter === value
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <Label className="text-[11px] text-slate-600">Duration</Label>
                    <div className="mt-1 inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                      {([
                        ['all', 'All'],
                        ['1d', '1 day'],
                        ['7d', '7 days'],
                        ['1m', '1 month'],
                        ['custom', 'Custom'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDurationFilter(value)}
                          className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
                            durationFilter === value
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-[280px] flex-1">
                    <Label className="text-[11px] text-slate-600">Search</Label>
                    <div className="relative mt-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-9 rounded-md pl-10 pr-3 text-xs"
                        placeholder="Search invoice, party, GR/LR, from, to, vehicle..."
                        value={universalSearch}
                        onChange={(e) => setUniversalSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {durationFilter === 'custom' && (
                    <>
                      <div>
                        <Label className="text-[11px] text-slate-600">From</Label>
                        <Input
                          type="date"
                          className="mt-1 h-9 rounded-md text-xs"
                          value={customFromDate}
                          onChange={(e) => setCustomFromDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-600">To</Label>
                        <Input
                          type="date"
                          className="mt-1 h-9 rounded-md text-xs"
                          value={customToDate}
                          onChange={(e) => setCustomToDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="min-w-[200px] flex-1">
                    <Label className="text-[11px] text-slate-600">Party</Label>
                    <Input
                      className="mt-1 h-9 rounded-md text-xs"
                      placeholder="Filter by party name"
                      value={partyFilter}
                      onChange={(e) => setPartyFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-md"
                      onClick={() => {
                        setUniversalSearch('');
                        setStatusFilter('all');
                        setDurationFilter('all');
                        setCustomFromDate('');
                        setCustomToDate('');
                        setPartyFilter('');
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-md"
                      onClick={handleDownloadFilteredReport}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Download report
                    </Button>
                  </div>
                </div>
                <div className="table-scroll-bleed overflow-x-auto border-t border-slate-200">
                <table className="min-w-[1220px] w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-3 py-2 font-semibold text-slate-700">Invoice</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Party</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">From location</th>
                      <th className="w-[220px] px-3 py-2 font-semibold text-slate-700">GR/LR</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Trips</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Freight</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">GST applied</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Expense</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Total</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Paid</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredInvoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                        <tr
                          className="cursor-pointer hover:bg-slate-50/70"
                          onClick={() => openInvoiceDetails(invoice)}
                        >
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{invoice.invoiceNo}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-slate-800">{invoice.partyName}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {getInvoiceFromLocationsLabel(invoice)}
                          </td>
                          <td className="w-[220px] px-3 py-2.5 text-slate-700">
                            {(() => {
                              const grNumbers = Array.from(
                                new Set((invoice.trips || []).map((trip) => {
                                  const gr = (trip.grLrNo || '').trim();
                                  return gr || '';
                                }).filter(Boolean)),
                              );
                              if (!grNumbers.length) return '—';
                              const shown = grNumbers.slice(0, 2);
                              const more = grNumbers.length - shown.length;
                              const summary = `${shown.join(', ')}${more > 0 ? ` +${more}` : ''}`;
                              const fullList = grNumbers.join(', ');
                              return (
                                <span
                                  className="block max-w-[220px] truncate whitespace-nowrap"
                                  title={fullList}
                                >
                                  {summary}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{invoice.trips.length}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{getInvoiceFreightTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            <div>₹{(invoice.gstAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="text-[11px] text-slate-500">@{invoice.gstRate ?? 0}%</div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{getInvoiceExpenseTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                            ₹{getReceivedTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                  href={`/admin/dashboard?tab=moneyReceipt&partyId=${encodeURIComponent(invoice.partyId)}`}
                                  className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  GR settlement
                                </Link>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-md px-2.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(invoice.id, invoice.invoiceNo);
                                }}
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
                            <td colSpan={13} className="bg-slate-50 p-3">
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
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {selectedInvoiceDetails && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-3 sm:p-6"
          onClick={() => setSelectedInvoiceDetails(null)}
        >
          <div
            className="mx-auto flex w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Invoice details</h3>
                <p className="text-xs text-slate-500">
                  {selectedInvoiceDetails.invoiceNo} · {selectedInvoiceDetails.partyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetails(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close invoice details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {(() => {
                const inv = selectedInvoiceDetails;
                const freight = getInvoiceFreightTotal(inv);
                const expenses = getInvoiceExpenseTotal(inv);
                const tds = invoiceTdsDeduction[inv.id]?.tds ?? getTdsTotal(inv);
                const deduction = invoiceTdsDeduction[inv.id]?.deduction ?? getDeductionTotal(inv);
                const tdsPercentLabel = invoiceTdsPercentLabel[inv.id] ?? '—';
                const received = getReceivedTotal(inv);
                const profitLoss = freight - expenses - deduction;
                const mrDate = getLatestMrDate(inv);
                const exp = getInvoiceExpenseBreakdown(inv);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Invoice date</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Latest MR date</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {mrDate ? mrDate.toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Freight</p>
                        <p className="mt-1 font-medium tabular-nums text-slate-900">
                          ₹{freight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">GST</p>
                        <p className="mt-1 font-medium tabular-nums text-slate-900">
                          ₹{(inv.gstAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (@{inv.gstRate ?? 0}%)
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Financial summary</p>
                      <div className="w-full">
                        <div className="flex w-full flex-nowrap gap-2 overflow-x-auto">
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">Total expense</p>
                            <p className="tabular-nums text-sm font-semibold">₹{expenses.toFixed(2)}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">Received</p>
                            <p className="tabular-nums text-sm font-semibold">₹{received.toFixed(2)}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">TDS %</p>
                            <p className="tabular-nums text-sm font-semibold">{tdsPercentLabel}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">TDS</p>
                            <p className="tabular-nums text-sm font-semibold">₹{tds.toFixed(2)}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">Deduction</p>
                            <p className="tabular-nums text-sm font-semibold">₹{deduction.toFixed(2)}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">Invoice total</p>
                            <p className="tabular-nums text-sm font-semibold">₹{inv.grandTotal.toFixed(2)}</p>
                          </div>
                          <div className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5">
                            <p className="text-[10px] text-slate-500">Profit/Loss</p>
                            <p className={`tabular-nums text-sm font-semibold ${profitLoss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>₹{profitLoss.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Expense breakdown</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Initial</span><span className="tabular-nums">₹{exp.initial.toFixed(2)}</span></div>
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Toll</span><span className="tabular-nums">₹{exp.toll.toFixed(2)}</span></div>
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Labour</span><span className="tabular-nums">₹{exp.labour.toFixed(2)}</span></div>
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Other</span><span className="tabular-nums">₹{exp.other.toFixed(2)}</span></div>
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Detention Loading</span><span className="tabular-nums">₹{exp.detentionLoading.toFixed(2)}</span></div>
                        <div className="flex justify-between rounded bg-slate-50 px-2 py-1.5"><span>Detention U/L</span><span className="tabular-nums">₹{exp.detentionUL.toFixed(2)}</span></div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trips in this invoice</p>
                      {(inv.trips || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No trips linked.</p>
                      ) : (
                        <div className="table-scroll-bleed overflow-x-auto rounded border border-slate-200">
                          <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200 text-left">
                                <th className="px-2 py-2 font-medium text-slate-700">Trip no.</th>
                                <th className="px-2 py-2 font-medium text-slate-700">Date</th>
                                <th className="px-2 py-2 font-medium text-slate-700">From</th>
                                <th className="px-2 py-2 font-medium text-slate-700">To</th>
                                <th className="px-2 py-2 font-medium text-slate-700">Vehicle</th>
                                <th className="px-2 py-2 font-medium text-slate-700">GR/LR</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">Freight</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">Expense</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {(inv.trips || []).map((trip) => (
                                <tr key={trip.id}>
                                  <td className="px-2 py-2 font-medium text-slate-900">{trip.tripNo}</td>
                                  <td className="px-2 py-2 text-slate-700">{new Date(trip.date).toLocaleDateString('en-IN')}</td>
                                  <td className="px-2 py-2 text-slate-700">{trip.fromLocation}</td>
                                  <td className="px-2 py-2 text-slate-700">{trip.toLocation}</td>
                                  <td className="px-2 py-2 text-slate-700">{trip.vehicleNumber}</td>
                                  <td className="px-2 py-2 text-slate-700">{trip.grLrNo || '—'}</td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">
                                    ₹{(getTripAmount(trip) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">
                                    ₹{(getTripExpenseAmount(trip) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Money receipts for this invoice</p>
                      {(invoiceMrSummary[inv.id] || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No money receipts linked yet.</p>
                      ) : (
                        <div className="table-scroll-bleed overflow-x-auto rounded border border-slate-200">
                          <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200 text-left">
                                <th className="px-2 py-2 font-medium text-slate-700">MR no.</th>
                                <th className="px-2 py-2 font-medium text-slate-700">MR date</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">Received</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">TDS</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">TDS %</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">Deduction</th>
                                <th className="px-2 py-2 text-right font-medium text-slate-700">Download</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {(invoiceMrSummary[inv.id] || []).map((mr) => (
                                <tr key={mr.id}>
                                  <td className="px-2 py-2 font-mono text-xs text-slate-900">{mr.receiptNo}</td>
                                  <td className="px-2 py-2 text-slate-700">
                                    {mr.paymentDate ? new Date(mr.paymentDate).toLocaleDateString('en-IN') : '—'}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">₹{mr.receivedAmount.toFixed(2)}</td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">₹{mr.tdsAmount.toFixed(2)}</td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">{mr.tdsPercent}%</td>
                                  <td className="px-2 py-2 text-right tabular-nums text-slate-900">₹{mr.deductionAmount.toFixed(2)}</td>
                                  <td className="px-2 py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-md px-2"
                                      disabled={downloadingMr === `${inv.id}:${mr.id}`}
                                      onClick={() => handleDownloadMoneyReceipt(inv.id, mr.id, mr.receiptNo)}
                                    >
                                      {downloadingMr === `${inv.id}:${mr.id}` ? (
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
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <section aria-label="PDF template help">
        <p className="text-center text-xs text-slate-500">
          Custom templates support{' '}
          <code className="rounded bg-slate-100 px-1">{`{{invoiceNo}} {{invoiceDate}} {{dueDate}} {{delivered}}`}</code>
          , party, <code className="rounded bg-slate-100 px-1">{`{{subTotal}} {{gstLinesClassic}} {{grandTotal}}`}</code>
          , <code className="rounded bg-slate-100 px-1">{`{{tripsRows}}`}</code>, etc.
        </p>
      </section>
    </div>
  );
}
