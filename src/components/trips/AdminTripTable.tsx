'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { GRDetailsModal } from './GRDetailsModal';
import { goodsReceiptApi } from '@/lib/api-client';
import { GoodsReceipt } from '@/types/goods-receipt';
import toast from 'react-hot-toast';
import { partiesApi } from '@/modules/parties/api';
import type { PartyBranch } from '@/modules/parties/types';

function todayInputMax(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isCalendarDateAfterToday(isoDay: string | null | undefined): boolean {
  if (!isoDay) return false;
  const day = isoDay.split('T')[0];
  return day > todayInputMax();
}

function calendarDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = iso.split('T')[0];
  return d || null;
}

/** Invalid when both set and POD is strictly before GR. */
function isPodDateBeforeGrDate(podDay: string | null | undefined, grDay: string | null | undefined): boolean {
  if (!podDay || !grDay) return false;
  return podDay < grDay;
}

interface AdminTripData {
  id: string;
  vendorId?: string;
  partyId?: string | null;
  partyBranchId?: string | null;
  tripNo: string;
  date: string;
  vendorName: string;
  partyName: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  grLrNo?: string;
  grReceivedDate?: string;
  podReceivedDate?: string;
  freight?: number;
  advance?: number;
  initialExpense?: number;
  tollExpense?: number;
  otherCharges?: number;
  labourCharges?: number;
  detentionLoading?: number;
  detentionUL?: number;
  totalExpense?: number;
  profitLoss?: number;
  billNo?: string;
  billDate?: string;
  branchName?: string;
  ewayDate?: string;
  driverName?: string;
  driverPhone?: string;
  startLocation?: string;
  endLocation?: string;
  startTime?: string;
  endTime?: string;
  distance?: number;
  fare?: number;
  expense?: number;
  party?: string;
  notes?: string;
  status: string;
  invoiceId?: string | null;
  moneyReceiptId?: string | null;
  createdAt: string;
  remarks?: string;
}

interface AdminTripTableProps {
  trips: AdminTripData[];
  onRefresh: () => void;
}

export function AdminTripTable({ trips, onRefresh }: AdminTripTableProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [grData, setGrData] = useState<Record<string, GoodsReceipt[]>>({});
  const [showTripModal, setShowTripModal] = useState<AdminTripData | null>(null);
  const [showGRModal, setShowGRModal] = useState<AdminTripData | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [partyBranchOptions, setPartyBranchOptions] = useState<PartyBranch[]>([]);
  /** When trip has partyName but no partyId (legacy rows), resolve Party id for branch dropdown. */
  const [resolvedPartyIdFromName, setResolvedPartyIdFromName] = useState<string | null>(null);
  const [partyNameLookupStatus, setPartyNameLookupStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  // Filter states
  const [filters, setFilters] = useState({
    to: '',
    from: '',
    vehicleNumber: '',
    party: '',
    date: '',
    grLrNo: '',
    billNo: '',
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      to: '',
      from: '',
      vehicleNumber: '',
      party: '',
      date: '',
      grLrNo: '',
      billNo: '',
    });
  };

  useEffect(() => {
    if (!showTripModal) {
      setResolvedPartyIdFromName(null);
      setPartyNameLookupStatus('idle');
      return;
    }
    if (showTripModal.partyId) {
      setResolvedPartyIdFromName(null);
      setPartyNameLookupStatus('done');
      return;
    }
    const pn = showTripModal.partyName?.trim();
    if (!pn) {
      setResolvedPartyIdFromName(null);
      setPartyNameLookupStatus('done');
      return;
    }
    setPartyNameLookupStatus('loading');
    let cancelled = false;
    (async () => {
      try {
        const parties = await partiesApi.getParties();
        const hit = parties.find((p) => p.name.trim().toLowerCase() === pn.toLowerCase());
        if (!cancelled) {
          setResolvedPartyIdFromName(hit?.id ?? null);
          setPartyNameLookupStatus('done');
        }
      } catch {
        if (!cancelled) {
          setResolvedPartyIdFromName(null);
          setPartyNameLookupStatus('done');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showTripModal?.id, showTripModal?.partyId, showTripModal?.partyName]);

  const effectivePartyId = showTripModal?.partyId ?? resolvedPartyIdFromName ?? undefined;

  /** Until lookup finishes, legacy trips (name but no id) should not flash the free-text branch field. */
  const awaitingPartyResolve =
    !!showTripModal &&
    !showTripModal.partyId &&
    !!showTripModal.partyName?.trim() &&
    partyNameLookupStatus !== 'done';

  /** Show free-text branch when there is no party name, or lookup finished (avoids stale "loading" when switching trips). */
  const canShowFreeTextBranch =
    !showTripModal?.partyName?.trim() || partyNameLookupStatus === 'done';

  useEffect(() => {
    if (!effectivePartyId) {
      setPartyBranchOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const brs = await partiesApi.listPartyBranches(effectivePartyId);
        if (!cancelled) setPartyBranchOptions(brs);
      } catch {
        if (!cancelled) setPartyBranchOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectivePartyId]);

  useEffect(() => {
    if (!showTripModal) return;
    const fresh = trips.find((t) => t.id === showTripModal.id);
    if (fresh) {
      setShowTripModal(fresh);
    }
  }, [trips, showTripModal?.id]);

  const filteredTrips = trips.filter((trip) => {
    const gr = (trip.grLrNo || '').toLowerCase();
    const bill = (trip.billNo || '').toLowerCase();
    return (
      (!filters.to || trip.toLocation.toLowerCase().includes(filters.to.toLowerCase())) &&
      (!filters.from || trip.fromLocation.toLowerCase().includes(filters.from.toLowerCase())) &&
      (!filters.vehicleNumber || trip.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase())) &&
      (!filters.party || trip.partyName.toLowerCase().includes(filters.party.toLowerCase())) &&
      (!filters.date || trip.date.includes(filters.date)) &&
      (!filters.grLrNo || gr.includes(filters.grLrNo.toLowerCase().trim())) &&
      (!filters.billNo || bill.includes(filters.billNo.toLowerCase().trim()))
    );
  });

  const toggleExpand = async (trip: AdminTripData) => {
    // Set the GR modal trip
    setShowGRModal(trip);
    
    // Fetch GR data if not already loaded
    if (!grData[trip.tripNo]) {
      try {
        console.log('Fetching GR data for trip:', trip.id, 'tripNo:', trip.tripNo);
        const receipts = await goodsReceiptApi.getByTripId(trip.id);
        console.log('GR receipts received:', receipts);
        setGrData(prev => ({ ...prev, [trip.tripNo]: receipts }));
      } catch (error) {
        console.error('Error fetching GR data:', error);
      }
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${amount.toFixed(2)}`;
  };

  const tripExpenseTotal = (t: AdminTripData) =>
    (t.initialExpense ?? 0) +
    (t.tollExpense ?? 0) +
    (t.labourCharges ?? 0) +
    (t.otherCharges ?? 0) +
    (t.detentionLoading ?? 0) +
    (t.detentionUL ?? 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pod_pending':
      case 'pending':
        return 'bg-amber-100 text-amber-900';
      case 'invoicing':
        return 'bg-violet-100 text-violet-900';
      case 'payment_pending':
        return 'bg-sky-100 text-sky-900';
      case 'completed':
        return 'bg-emerald-100 text-emerald-900';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pod_pending':
      case 'pending':
        return 'POD pending';
      case 'invoicing':
        return 'Invoicing';
      case 'payment_pending':
        return 'Payment pending';
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In transit';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    if (!window.confirm('Mark this trip as cancelled?')) return;
    setUpdatingStatus(tripId);
    try {
      await api.patch(`/trips/${tripId}`, { status: 'CANCELLED' });
      onRefresh();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      toast.error('Could not cancel trip');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getProfitLossColor = (profitLoss?: number) => {
    if (profitLoss === undefined || profitLoss === null) return 'text-gray-500';
    return profitLoss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  const isMarketParty = (partyName?: string) =>
    (partyName || '').trim().toLowerCase().includes('market');

  const needsAdvanceAlert = (trip: AdminTripData) =>
    isMarketParty(trip.partyName) && (trip.advance === null || trip.advance === undefined);

  const needsPaymentPendingAlert = (trip: AdminTripData) =>
    isMarketParty(trip.partyName) &&
    (trip.freight ?? 0) > 0 &&
    (trip.advance ?? 0) < (trip.freight ?? 0);

  const parseNumberInput = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const updateLocalTripField = (field: keyof AdminTripData, value: any) => {
    setShowTripModal((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveTripInlineField = async (
    trip: AdminTripData,
    field: keyof AdminTripData,
    value: string | number | null | undefined,
  ) => {
    const key = `${trip.id}:${String(field)}`;
    setSavingField(key);
    try {
      if (field === 'grReceivedDate' || field === 'podReceivedDate') {
        const v = value as string | null | undefined;
        if (v && isCalendarDateAfterToday(v)) {
          toast.error('Date cannot be later than today');
          return;
        }
        const grDay =
          field === 'grReceivedDate' ? (v ? calendarDay(v) : null) : calendarDay(trip.grReceivedDate);
        const podDay =
          field === 'podReceivedDate' ? (v ? calendarDay(v) : null) : calendarDay(trip.podReceivedDate);
        if (isPodDateBeforeGrDate(podDay, grDay)) {
          toast.error('POD received date cannot be before GR received date');
          return;
        }
      }

      let endpoint = `/trips/${trip.id}`;
      let payload: Record<string, unknown> = { [field]: value };

      if (
        field === 'freight' ||
        field === 'billNo' ||
        field === 'billDate' ||
        field === 'branchName' ||
        field === 'ewayDate'
      ) {
        endpoint = `/trips/${trip.id}/accounts`;
      } else if (
        field === 'grLrNo' ||
        field === 'tollExpense' ||
        field === 'grReceivedDate' ||
        field === 'podReceivedDate'
      ) {
        endpoint = `/trips/${trip.id}/operations`;
      }

      await api.patch(endpoint, payload);
      await onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Auto-save failed');
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md">
      <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Transportation Operations Register</h3>
        <p className="mt-1 text-sm text-slate-600">
          Search and open a trip for operations, GR/POD dates, and billing.
        </p>
      </div>

      {/* Filters Section */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Filter trips</h4>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Clear all
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">To location</label>
            <input
              type="text"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              placeholder="Destination…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">From location</label>
            <input
              type="text"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              placeholder="Origin…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Vehicle number</label>
            <input
              type="text"
              value={filters.vehicleNumber}
              onChange={(e) => handleFilterChange('vehicleNumber', e.target.value)}
              placeholder="Vehicle…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Party name</label>
            <input
              type="text"
              value={filters.party}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              placeholder="Party…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Trip date</label>
            <input
              type="text"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              placeholder="e.g. 2026-04-09"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">GR / LR no.</label>
            <input
              type="text"
              value={filters.grLrNo}
              onChange={(e) => handleFilterChange('grLrNo', e.target.value)}
              placeholder="Match GR or LR…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Party bill no.</label>
            <input
              type="text"
              value={filters.billNo}
              onChange={(e) => handleFilterChange('billNo', e.target.value)}
              placeholder="Party bill…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
        {filteredTrips.length !== trips.length && (
          <div className="mt-3 text-sm text-slate-600">
            Showing <span className="font-medium text-slate-800">{filteredTrips.length}</span> of {trips.length}{' '}
            trips
          </div>
        )}
      </div>

      {filteredTrips.length > 0 && (
        <>
          <div className="md:hidden px-4 py-4 space-y-3 bg-white border-t border-gray-200">
            {filteredTrips.map((trip) => (
              <button
                key={trip.tripNo}
                type="button"
                className="w-full text-left rounded-lg border border-gray-200 p-4 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
                onClick={() => setShowTripModal(trip)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900">{trip.tripNo}</span>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                    {getStatusDisplay(trip.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{trip.date}</p>
                <p className="text-sm text-gray-800 mt-2 line-clamp-2">{trip.partyName}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {trip.fromLocation} → {trip.toLocation}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Vehicle:</span> {trip.vehicleNumber}
                </p>
                {(needsAdvanceAlert(trip) || needsPaymentPendingAlert(trip)) && (
                  <p className="mt-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {needsAdvanceAlert(trip) ? 'Advance pending (Market)' : 'Payment pending'}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:block table-scroll-bleed border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip No</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <tr
                    key={trip.tripNo}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setShowTripModal(trip)}
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.tripNo}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500">
                      {trip.date}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{trip.partyName}</span>
                        {(needsAdvanceAlert(trip) || needsPaymentPendingAlert(trip)) && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            {needsAdvanceAlert(trip) ? 'Advance pending' : 'Payment pending'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.fromLocation}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-900">
                      {trip.toLocation}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.vehicleNumber}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right text-sm">
                      <span
                        className={`inline-flex max-w-[11rem] justify-end rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(trip.status)}`}
                      >
                        {getStatusDisplay(trip.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filteredTrips.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {trips.length === 0 ? 'No trips found' : 'No trips match your filters'}
          </div>
          {trips.length > 0 && filteredTrips.length === 0 && (
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear filters to see all trips
            </button>
          )}
        </div>
      )}

      {/* Trip Detail Modal */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-3 py-6 backdrop-blur-[2px] sm:px-4 sm:py-10">
          <div className="relative w-full max-w-4xl rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-slate-200/50 max-h-[calc(100dvh-3rem)] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Trip details</p>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">{showTripModal.tripNo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTripModal(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              {/* Basic + operations */}
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 shadow-sm">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-900">Trip &amp; operations</h4>
                  <p className="mt-0.5 text-xs text-gray-500">Reference data and GR/POD dates (max. today)</p>
                </div>
                <div className="space-y-6 p-4 sm:p-5">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Trip snapshot</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ['Trip no.', showTripModal.tripNo],
                        ['Date', showTripModal.date],
                        ['Vendor', showTripModal.vendorName],
                        ['Party', showTripModal.partyName],
                        ['From', showTripModal.fromLocation],
                        ['To', showTripModal.toLocation],
                        ['Vehicle', showTripModal.vehicleNumber],
                      ].map(([k, v]) => (
                        <div key={String(k)}>
                          <span className="block text-xs font-medium text-gray-500">{k}</span>
                          <div className="mt-1 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Editable</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">GR / LR no.</label>
                        <input
                          type="text"
                          defaultValue={showTripModal.grLrNo || ''}
                          onBlur={(e) => {
                            const nextValue = e.target.value.trim() || null;
                            if ((showTripModal.grLrNo || null) === nextValue) return;
                            updateLocalTripField('grLrNo', nextValue || undefined);
                            saveTripInlineField(showTripModal, 'grLrNo', nextValue);
                          }}
                          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Enter number"
                        />
                        {savingField === `${showTripModal.id}:grLrNo` && (
                          <p className="mt-1 text-xs text-blue-600">Saving…</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">GR received date</label>
                        <input
                          type="date"
                          max={(() => {
                            const t = todayInputMax();
                            const p = calendarDay(showTripModal.podReceivedDate);
                            if (!p) return t;
                            return p < t ? p : t;
                          })()}
                          defaultValue={(showTripModal.grReceivedDate || '').split('T')[0]}
                          onBlur={(e) => {
                            const nextValue = e.target.value || null;
                            const current = (showTripModal.grReceivedDate || '').split('T')[0] || null;
                            if (current === nextValue) return;
                            if (nextValue && isCalendarDateAfterToday(nextValue)) {
                              toast.error('GR received date cannot be later than today');
                              e.target.value = current || '';
                              return;
                            }
                            const grDay = nextValue ? calendarDay(nextValue) : null;
                            const podDay = calendarDay(showTripModal.podReceivedDate);
                            if (grDay && podDay && grDay > podDay) {
                              toast.error('GR received date cannot be after POD received date');
                              e.target.value = current || '';
                              return;
                            }
                            updateLocalTripField('grReceivedDate', nextValue || undefined);
                            saveTripInlineField(showTripModal, 'grReceivedDate', nextValue);
                          }}
                          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        {savingField === `${showTripModal.id}:grReceivedDate` && (
                          <p className="mt-1 text-xs text-blue-600">Saving…</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">POD received date</label>
                        <input
                          type="date"
                          min={calendarDay(showTripModal.grReceivedDate) || undefined}
                          max={todayInputMax()}
                          defaultValue={(showTripModal.podReceivedDate || '').split('T')[0]}
                          onBlur={(e) => {
                            const nextValue = e.target.value || null;
                            const current = (showTripModal.podReceivedDate || '').split('T')[0] || null;
                            if (current === nextValue) return;
                            if (nextValue && isCalendarDateAfterToday(nextValue)) {
                              toast.error('POD received date cannot be later than today');
                              e.target.value = current || '';
                              return;
                            }
                            const podDay = nextValue ? calendarDay(nextValue) : null;
                            const grDay = calendarDay(showTripModal.grReceivedDate);
                            if (podDay && grDay && isPodDateBeforeGrDate(podDay, grDay)) {
                              toast.error('POD received date cannot be before GR received date');
                              e.target.value = current || '';
                              return;
                            }
                            updateLocalTripField('podReceivedDate', nextValue || undefined);
                            saveTripInlineField(showTripModal, 'podReceivedDate', nextValue);
                          }}
                          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        {savingField === `${showTripModal.id}:podReceivedDate` && (
                          <p className="mt-1 text-xs text-blue-600">Saving…</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financial */}
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 shadow-sm">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-900">Financial</h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Freight, bill date, branch, and e-way live on the trip; GR details sync charges from GR saves.
                  </p>
                </div>
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Freight</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={showTripModal.freight ?? ''}
                        onBlur={(e) => {
                          const nextValue = parseNumberInput(e.target.value);
                          const currentValue = showTripModal.freight ?? null;
                          if (currentValue === nextValue) return;
                          updateLocalTripField('freight', nextValue ?? undefined);
                          saveTripInlineField(showTripModal, 'freight', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                      {savingField === `${showTripModal.id}:freight` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Advance</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={showTripModal.advance ?? ''}
                        onBlur={(e) => {
                          const nextValue = parseNumberInput(e.target.value);
                          const currentValue = showTripModal.advance ?? null;
                          if (currentValue === nextValue) return;
                          updateLocalTripField('advance', nextValue ?? undefined);
                          saveTripInlineField(showTripModal, 'advance', nextValue);
                        }}
                        className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${(needsAdvanceAlert(showTripModal) || needsPaymentPendingAlert(showTripModal)) ? 'border-red-300 text-red-800 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                        placeholder="0.00"
                      />
                      {savingField === `${showTripModal.id}:advance` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Toll</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={showTripModal.tollExpense ?? ''}
                        onBlur={(e) => {
                          const nextValue = parseNumberInput(e.target.value);
                          const currentValue = showTripModal.tollExpense ?? null;
                          if (currentValue === nextValue) return;
                          updateLocalTripField('tollExpense', nextValue ?? undefined);
                          saveTripInlineField(showTripModal, 'tollExpense', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                      {savingField === `${showTripModal.id}:tollExpense` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Initial</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={showTripModal.initialExpense ?? ''}
                        onBlur={(e) => {
                          const nextValue = parseNumberInput(e.target.value);
                          const currentValue = showTripModal.initialExpense ?? null;
                          if (currentValue === nextValue) return;
                          updateLocalTripField('initialExpense', nextValue ?? undefined);
                          saveTripInlineField(showTripModal, 'initialExpense', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                      {savingField === `${showTripModal.id}:initialExpense` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Party bill no.</label>
                      <input
                        type="text"
                        defaultValue={showTripModal.billNo || ''}
                        onBlur={(e) => {
                          const nextValue = e.target.value.trim() || null;
                          if ((showTripModal.billNo || null) === nextValue) return;
                          updateLocalTripField('billNo', nextValue || undefined);
                          saveTripInlineField(showTripModal, 'billNo', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Enter party bill no."
                      />
                      {savingField === `${showTripModal.id}:billNo` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Bill date</label>
                      <input
                        type="date"
                        defaultValue={(showTripModal.billDate || '').split('T')[0]}
                        onBlur={(e) => {
                          const nextValue = e.target.value || null;
                          const currentDate = (showTripModal.billDate || '').split('T')[0] || null;
                          if (currentDate === nextValue) return;
                          updateLocalTripField('billDate', nextValue || undefined);
                          saveTripInlineField(showTripModal, 'billDate', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {savingField === `${showTripModal.id}:billDate` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600">Branch</label>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {effectivePartyId
                          ? 'Billing branch for this party (ledger name on invoices).'
                          : 'Free-text branch name when the trip is not linked to a party master.'}
                      </p>
                      {awaitingPartyResolve && !effectivePartyId ? (
                        <p className="mt-1.5 text-xs text-gray-500">Loading party branches…</p>
                      ) : effectivePartyId ? (
                        partyBranchOptions.length > 0 ? (
                          <>
                            <select
                              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              value={showTripModal.partyBranchId ?? ''}
                              onChange={(e) => {
                                const next = e.target.value.trim() || null;
                                updateLocalTripField('partyBranchId', next ?? undefined);
                                saveTripInlineField(showTripModal, 'partyBranchId', next);
                              }}
                            >
                              <option value="">— Select branch —</option>
                              {partyBranchOptions.map((b) => (
                                <option key={b.id} value={b.id} disabled={!b.isActive}>
                                  {b.locationLabel ? `${b.locationLabel} — ` : ''}
                                  {b.fullLedgerName}
                                  {!b.isActive ? ' (inactive)' : ''}
                                </option>
                              ))}
                            </select>
                            {savingField === `${showTripModal.id}:partyBranchId` && (
                              <p className="mt-1 text-xs text-blue-600">Saving…</p>
                            )}
                          </>
                        ) : (
                          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                            No branches for this party yet. Open{' '}
                            <span className="font-medium">Parties</span>, choose the party, and use{' '}
                            <span className="font-medium">Add branch</span> under Billing branches.
                          </p>
                        )
                      ) : canShowFreeTextBranch ? (
                        <>
                          <input
                            type="text"
                            defaultValue={showTripModal.branchName || ''}
                            onBlur={(e) => {
                              const nextValue = e.target.value.trim() || null;
                              if ((showTripModal.branchName || null) === nextValue) return;
                              updateLocalTripField('branchName', nextValue || undefined);
                              saveTripInlineField(showTripModal, 'branchName', nextValue);
                            }}
                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Branch"
                          />
                          {savingField === `${showTripModal.id}:branchName` && (
                            <p className="mt-1 text-xs text-blue-600">Saving…</p>
                          )}
                        </>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">E-way date</label>
                      <input
                        type="date"
                        defaultValue={(showTripModal.ewayDate || '').split('T')[0]}
                        onBlur={(e) => {
                          const nextValue = e.target.value || null;
                          const cur = (showTripModal.ewayDate || '').split('T')[0] || null;
                          if (cur === nextValue) return;
                          updateLocalTripField('ewayDate', nextValue || undefined);
                          saveTripInlineField(showTripModal, 'ewayDate', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {savingField === `${showTripModal.id}:ewayDate` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-violet-200/90 bg-violet-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-900/90">From goods receipt</p>
                    <p className="mt-1 text-xs text-violet-800/75">
                      Labour, other charges, and detention fields match the GR. Re-save <span className="font-medium">GR details</span> to sync.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(
                        [
                          ['Labour charges', showTripModal.labourCharges],
                          ['Other charges', showTripModal.otherCharges],
                          ['Detention loading', showTripModal.detentionLoading],
                          ['Detention U/L', showTripModal.detentionUL],
                        ] as const
                      ).map(([label, val]) => (
                        <div key={label}>
                          <span className="block text-xs font-medium text-violet-900/70">{label}</span>
                          <div className="mt-1.5 rounded-lg border border-violet-200/80 bg-white px-3 py-2 text-sm tabular-nums text-slate-900">
                            {formatCurrency(val ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total expense</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">Calculated</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {formatCurrency(tripExpenseTotal(showTripModal))}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Initial + toll + labour + other charges + detention loading + detention U/L. GR fields sync on save; toll and initial can be edited above.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">P&amp;L</span>
                      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${getProfitLossColor(showTripModal.profitLoss)}`}>
                        {formatCurrency(showTripModal.profitLoss)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Freight minus total expense (from server).</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Status + actions */}
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Status</h4>
                    <p className="mt-0.5 text-xs text-gray-500">
                      POD pending → Invoicing (POD received) → Payment pending (invoice) → Completed (money receipt).
                      You can only cancel a trip here.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {updatingStatus === showTripModal.id ? (
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <span className="text-sm text-gray-600">Updating…</span>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(showTripModal.status)}`}
                        >
                          {getStatusDisplay(showTripModal.status)}
                        </span>
                        {showTripModal.status !== 'CANCELLED' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            disabled={updatingStatus !== null}
                            onClick={() => handleCancelTrip(showTripModal.id)}
                          >
                            Cancel trip
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(showTripModal)}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 sm:w-auto"
                  >
                    View GR details
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTripModal(null)}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </section>

              {showTripModal.remarks && (
                <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5">
                  <h4 className="text-sm font-semibold text-amber-900">Remarks</h4>
                  <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{showTripModal.remarks}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GR Details Modal */}
      {showGRModal && (
        <GRDetailsModal
          trip={showGRModal}
          grData={grData[showGRModal.tripNo] || []}
          onClose={() => setShowGRModal(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
