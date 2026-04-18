'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { GRDetailsModal } from './GRDetailsModal';
import { goodsReceiptApi } from '@/lib/api-client';
import { GoodsReceipt } from '@/types/goods-receipt';
import toast from 'react-hot-toast';
import { partiesApi } from '@/modules/parties/api';
import type { PartyBranch } from '@/modules/parties/types';
import { daysUntilEwayExpiry } from '@/lib/calendar-date';
import { ListFilter, Search, Upload } from 'lucide-react';

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

function formatDisplayDate(value: string | null | undefined): string {
  const day = calendarDay(value);
  if (!day) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-GB');
}

function parseDisplayDateToIso(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    const dt = new Date(yyyy, mm - 1, dd);
    if (dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd) {
      return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return '';
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (ymd) return v;
  return '';
}

/** Hide common TRP-YYYY- prefix in table cells to save horizontal space. */
function compactTripNoForTable(tripNo: string): string {
  const m = /^TRP-\d{4}-(.+)$/i.exec(tripNo.trim());
  return m?.[1] ? m[1] : tripNo;
}

function parseGrAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const mappedExpenseTypes = new Set([
  'loading charges',
  'unloading charges',
  'detention loading',
  'detention u/l',
  'toll charges',
  'labour charges',
  'other charges',
]);

function sumManualExpenseRows(expenses: Array<{ expenseType?: string; amount?: string }> | undefined): number {
  return (expenses || [])
    .filter((row) => !mappedExpenseTypes.has(String(row?.expenseType || '').trim().toLowerCase()))
    .reduce((sum, row) => sum + parseGrAmount(row?.amount), 0);
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
  profitLossWithoutDeduction?: number;
  deductionAmount?: number;
  profitLoss?: number;
  billNo?: string;
  billDate?: string;
  ewayBillNumber?: string | null;
  branchName?: string;
  ewayDate?: string;
  ewayAlertDismissed?: boolean;
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
  loading?: boolean;
  unifiedSearch?: string;
  onUnifiedSearchChange?: (value: string) => void;
  onOpenCreateTrip?: () => void;
  onToggleBulkUpload?: () => void;
  bulkUploadOpen?: boolean;
  onRefresh: () => void;
  /** Merge a partial trip update without refetching the full register (e.g. e-way inline save). */
  onTripLocalPatch?: (tripId: string, patch: Partial<AdminTripData>) => void;
}

type ColumnFilterKey =
  | 'tripNo'
  | 'date'
  | 'partyName'
  | 'fromLocation'
  | 'toLocation'
  | 'vehicleNumber'
  | 'grLrNo'
  | 'ewayBillNumber'
  | 'status';

export function AdminTripTable({
  trips,
  loading = false,
  unifiedSearch = '',
  onUnifiedSearchChange,
  onOpenCreateTrip,
  onToggleBulkUpload,
  bulkUploadOpen = false,
  onRefresh,
  onTripLocalPatch,
}: AdminTripTableProps) {
  const router = useRouter();
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [grData, setGrData] = useState<Record<string, GoodsReceipt[]>>({});
  const [grLoadingByTrip, setGrLoadingByTrip] = useState<Record<string, boolean>>({});
  const [showTripModal, setShowTripModal] = useState<AdminTripData | null>(null);
  const [showGRModal, setShowGRModal] = useState<AdminTripData | null>(null);
  const [grModalAutoOpenAddWhenEmpty, setGrModalAutoOpenAddWhenEmpty] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (!showGRModal) return;
    const next = trips.find((t) => t.id === showGRModal.id);
    if (next) setShowGRModal(next);
  }, [trips, showGRModal?.id]);
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
    status: '',
    grLrNo: '',
    billNo: '',
    ewayBillNumber: '',
  });
  const [columnFilters, setColumnFilters] = useState<Record<ColumnFilterKey, string[]>>({
    tripNo: [],
    date: [],
    partyName: [],
    fromLocation: [],
    toLocation: [],
    vehicleNumber: [],
    grLrNo: [],
    ewayBillNumber: [],
    status: [],
  });
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [columnFilterSearch, setColumnFilterSearch] = useState('');
  const [showAllFilterOptions, setShowAllFilterOptions] = useState(false);
  const [columnFilterMenuPos, setColumnFilterMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [debouncedUnifiedSearch, setDebouncedUnifiedSearch] = useState(unifiedSearch);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUnifiedSearch(unifiedSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [unifiedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  const getTripGrNo = (trip: AdminTripData): string => {
    const latestGr = (grData[trip.id] || [])[0] as any;
    return (trip.grLrNo || latestGr?.grNo || '').trim();
  };

  const clearFilters = () => {
    setFilters({
      to: '',
      from: '',
      vehicleNumber: '',
      party: '',
      date: '',
      status: '',
      grLrNo: '',
      billNo: '',
      ewayBillNumber: '',
    });
    setColumnFilters({
      tripNo: [],
      date: [],
      partyName: [],
      fromLocation: [],
      toLocation: [],
      vehicleNumber: [],
      grLrNo: [],
      ewayBillNumber: [],
      status: [],
    });
    setOpenColumnFilter(null);
    setColumnFilterSearch('');
    setShowAllFilterOptions(false);
    setColumnFilterMenuPos(null);
  };

  const getColumnValue = (trip: AdminTripData, key: ColumnFilterKey): string => {
    switch (key) {
      case 'tripNo':
        return compactTripNoForTable(trip.tripNo) || '';
      case 'date':
        return trip.date || '';
      case 'partyName':
        return trip.partyName || '';
      case 'fromLocation':
        return trip.fromLocation || '';
      case 'toLocation':
        return trip.toLocation || '';
      case 'vehicleNumber':
        return trip.vehicleNumber || '';
      case 'grLrNo':
        return getTripGrNo(trip) || '—';
      case 'ewayBillNumber':
        return trip.ewayBillNumber || '—';
      case 'status':
        switch (trip.status.toLowerCase()) {
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
            return trip.status.replace(/_/g, ' ');
        }
      default:
        return '';
    }
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

  const baseFilteredTrips = useMemo(() => trips.filter((trip) => {
    const gr = getTripGrNo(trip).toLowerCase();
    const bill = (trip.billNo || '').toLowerCase();
    const ewayBill = (trip.ewayBillNumber || '').toLowerCase();
    const unifiedQ = debouncedUnifiedSearch.trim().toLowerCase();
    const unifiedHaystack = [
      trip.toLocation,
      trip.fromLocation,
      trip.vehicleNumber,
      trip.partyName,
      trip.date,
      getTripGrNo(trip),
      trip.billNo || '',
      trip.ewayBillNumber || '',
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!unifiedQ || unifiedHaystack.includes(unifiedQ)) &&
      (!debouncedFilters.to || trip.toLocation.toLowerCase().includes(debouncedFilters.to.toLowerCase())) &&
      (!debouncedFilters.from || trip.fromLocation.toLowerCase().includes(debouncedFilters.from.toLowerCase())) &&
      (!debouncedFilters.vehicleNumber || trip.vehicleNumber.toLowerCase().includes(debouncedFilters.vehicleNumber.toLowerCase())) &&
      (!debouncedFilters.party || trip.partyName.toLowerCase().includes(debouncedFilters.party.toLowerCase())) &&
      (!debouncedFilters.date || trip.date.includes(debouncedFilters.date)) &&
      (!debouncedFilters.status || trip.status.toLowerCase() === debouncedFilters.status.toLowerCase()) &&
      (!debouncedFilters.grLrNo || gr.includes(debouncedFilters.grLrNo.toLowerCase().trim())) &&
      (!debouncedFilters.billNo || bill.includes(debouncedFilters.billNo.toLowerCase().trim())) &&
      (!debouncedFilters.ewayBillNumber ||
        ewayBill.includes(debouncedFilters.ewayBillNumber.toLowerCase().trim()))
    );
  }), [trips, debouncedUnifiedSearch, debouncedFilters, grData]);

  const getColumnOptionsForKey = (key: ColumnFilterKey): string[] =>
    Array.from(new Set(baseFilteredTrips.map((t) => getColumnValue(t, key).trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

  const activeColumnOptions = useMemo(() => {
    if (!openColumnFilter) return [];
    return getColumnOptionsForKey(openColumnFilter);
  }, [openColumnFilter, baseFilteredTrips]);

  const activeFilteredColumnOptions = useMemo(
    () =>
      activeColumnOptions.filter((opt) =>
        opt.toLowerCase().includes(columnFilterSearch.toLowerCase()),
      ),
    [activeColumnOptions, columnFilterSearch],
  );
  const visibleColumnOptions = useMemo(
    () => (showAllFilterOptions ? activeFilteredColumnOptions : activeFilteredColumnOptions.slice(0, 4)),
    [activeFilteredColumnOptions, showAllFilterOptions],
  );

  const filteredTrips = useMemo(() => baseFilteredTrips.filter((trip) => {
    const keys = Object.keys(columnFilters) as ColumnFilterKey[];
    for (const key of keys) {
      const selected = columnFilters[key];
      if (!selected.length) continue;
      if (!selected.includes(getColumnValue(trip, key))) return false;
    }
    return true;
  }), [baseFilteredTrips, columnFilters, grData]);

  const toggleColumnFilterValue = (key: ColumnFilterKey, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: existing.includes(value)
          ? existing.filter((item) => item !== value)
          : [...existing, value],
      };
    });
  };

  const setAllColumnFilterValues = (key: ColumnFilterKey, enabled: boolean, options: string[]) => {
    setColumnFilters((prev) => ({
      ...prev,
      [key]: enabled ? options : [],
    }));
  };

  const openColumnFilterMenu = (
    key: ColumnFilterKey,
    event: React.MouseEvent<HTMLButtonElement>,
    align: 'left' | 'right' = 'left',
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const margin = 8;
    const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.min(
      Math.max(rawLeft, margin),
      window.innerWidth - menuWidth - margin,
    );
    const top = rect.bottom + 6;
    setOpenColumnFilter((prev) => (prev === key ? null : key));
    setColumnFilterSearch('');
    setShowAllFilterOptions(false);
    setColumnFilterMenuPos({ left, top });
  };

  useEffect(() => {
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-col-filter-root="true"]')) {
        setOpenColumnFilter(null);
        setColumnFilterMenuPos(null);
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, []);

  const fetchTripGrData = async (trip: AdminTripData): Promise<GoodsReceipt[]> => {
    // Primary path: GR rows linked by trip UUID/id.
    const byTripId = await goodsReceiptApi.getByTripId(trip.id);
    if (byTripId.length > 0) return byTripId;

    // Legacy fallback: some older rows may have been linked by tripNo string.
    const byTripNo = await goodsReceiptApi.getByTripId(trip.tripNo);
    if (byTripNo.length > 0) return byTripNo;

    return [];
  };

  const toggleExpand = async (trip: AdminTripData) => {
    setGrModalAutoOpenAddWhenEmpty(!hasGrDetails(trip));
    // Set the GR modal trip
    setShowGRModal(trip);
    
    // Re-fetch when cache is empty; refresh when GR appears in row data.
    const cacheKey = trip.id;
    const cachedReceipts = grData[cacheKey];
    const shouldFetch = !cachedReceipts || cachedReceipts.length === 0 || hasGrDetails(trip);
    if (shouldFetch) {
      setGrLoadingByTrip((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        console.log('Fetching GR data for trip:', trip.id, 'tripNo:', trip.tripNo);
        const receipts = await fetchTripGrData(trip);
        console.log('GR receipts received:', receipts);
        setGrData(prev => ({ ...prev, [cacheKey]: receipts }));
      } catch (error) {
        console.error('Error fetching GR data:', error);
      } finally {
        setGrLoadingByTrip((prev) => ({ ...prev, [cacheKey]: false }));
      }
    }
  };

  const refreshTripsAndCurrentGr = async () => {
    await onRefresh();
    if (!showGRModal) return;
    setGrLoadingByTrip((prev) => ({ ...prev, [showGRModal.id]: true }));
    try {
      const receipts = await fetchTripGrData(showGRModal);
      setGrData((prev) => ({ ...prev, [showGRModal.id]: receipts }));
    } catch {
      // ignore gr refresh errors after trip refresh
    } finally {
      setGrLoadingByTrip((prev) => ({ ...prev, [showGRModal.id]: false }));
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

  const isPodPendingStatus = (status: string) => {
    const s = status.toLowerCase();
    return s === 'pod_pending' || s === 'pending';
  };

  const hasGrDetails = (trip: AdminTripData) => Boolean(getTripGrNo(trip));

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

  const ewayAlertLabel = (trip: AdminTripData): string | null => {
    if (trip.podReceivedDate || trip.ewayAlertDismissed) return null;
    const ewayDay = (trip.ewayDate || '').split('T')[0];
    if (trip.ewayBillNumber && !ewayDay) return 'E-way expiry missing';
    const daysLeft = daysUntilEwayExpiry(trip.ewayDate);
    if (daysLeft === null || daysLeft < 0 || daysLeft > 2) return null;
    if (daysLeft === 0) return 'E-way expires today';
    if (daysLeft === 1) return 'E-way expires tomorrow';
    return 'E-way expires in 2 days';
  };

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
          field === 'grReceivedDate' ? (v ? calendarDay(v) : null) : (v ? calendarDay(v) : calendarDay(trip.grReceivedDate));
        const podDay =
          field === 'podReceivedDate' ? (v ? calendarDay(v) : null) : (v ? calendarDay(v) : calendarDay(trip.podReceivedDate));
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
        field === 'ewayDate' ||
        field === 'ewayBillNumber'
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

      if (field === 'podReceivedDate') {
        payload = { podReceivedDate: value, grReceivedDate: value };
      }

      await api.patch(endpoint, payload);

      if (
        (field === 'ewayBillNumber' || field === 'ewayDate') &&
        onTripLocalPatch
      ) {
        const patch: Partial<AdminTripData> = { ewayAlertDismissed: false };
        if (field === 'ewayBillNumber') {
          patch.ewayBillNumber =
            value === null || value === undefined || value === '' ? null : String(value);
        } else {
          patch.ewayDate =
            value === null || value === undefined || value === '' ? undefined : String(value);
        }
        onTripLocalPatch(trip.id, patch);
      } else {
        await onRefresh();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Auto-save failed');
    } finally {
      setSavingField(null);
    }
  };

  useEffect(() => {
    if (!showTripModal) return;
    const cacheKey = showTripModal.id;
    if (grData[cacheKey]?.length) return;
    (async () => {
      setGrLoadingByTrip((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        const receipts = await fetchTripGrData(showTripModal);
        setGrData((prev) => ({ ...prev, [cacheKey]: receipts }));
      } catch {
        // ignore
      } finally {
        setGrLoadingByTrip((prev) => ({ ...prev, [cacheKey]: false }));
      }
    })();
  }, [showTripModal?.id]);

  return (
    <div className="overflow-visible rounded-xl border border-slate-200/80 bg-white shadow-md">
      <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Operations Register</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Search and open a trip for operations, GR/POD dates, and billing.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end justify-end gap-2 sm:w-auto">
            <div className="w-full sm:w-96">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">Search all trips</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <input
                  type="text"
                  value={unifiedSearch}
                  onChange={(e) => onUnifiedSearchChange?.(e.target.value)}
                  placeholder="Search all: to, from, vehicle, party, date, GR, bill, e-way"
                  className="w-full rounded-xl border border-emerald-200 bg-white pl-9 pr-14 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
                {unifiedSearch && (
                  <button
                    type="button"
                    onClick={() => onUnifiedSearchChange?.('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenCreateTrip}
              className="h-10 self-end bg-emerald-600 px-4 text-sm font-bold text-white shadow-md ring-1 ring-emerald-500/30 hover:bg-emerald-700"
            >
              New Trip
            </Button>
            <button
              type="button"
              onClick={onToggleBulkUpload}
              className="inline-flex h-10 w-10 self-end items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
              aria-expanded={bulkUploadOpen}
              aria-label="Toggle bulk upload"
              title="Bulk upload"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-3 py-3 sm:px-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            Search filters
          </h4>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
          >
            Clear all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-9">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">To</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                placeholder="Destination"
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">From</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                placeholder="Origin"
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">Vehicle</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.vehicleNumber}
                onChange={(e) => handleFilterChange('vehicleNumber', e.target.value)}
                placeholder="Vehicle no."
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">Party</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.party}
                onChange={(e) => handleFilterChange('party', e.target.value)}
                placeholder="Party"
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">Date</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All status</option>
              <option value="POD_PENDING">POD pending</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In transit</option>
              <option value="INVOICING">Invoicing</option>
              <option value="PAYMENT_PENDING">Payment pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">GR/LR</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.grLrNo}
                onChange={(e) => handleFilterChange('grLrNo', e.target.value)}
                placeholder="GR no."
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">Bill no.</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.billNo}
                onChange={(e) => handleFilterChange('billNo', e.target.value)}
                placeholder="Party bill no."
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">E-way bill</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.ewayBillNumber}
                onChange={(e) => handleFilterChange('ewayBillNumber', e.target.value)}
                placeholder="E-way bill no."
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
        {filteredTrips.length !== trips.length && (
          <div className="mt-2 text-xs text-slate-600">
            Showing <span className="font-medium text-slate-800">{filteredTrips.length}</span> of {trips.length}{' '}
            trips
          </div>
        )}
      </div>

      {loading && (
        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="h-8 w-full animate-pulse rounded-md border border-slate-100 bg-slate-100"
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filteredTrips.length > 0 && (
        <>
          <div className="md:hidden border-t border-slate-200 px-3 py-3 space-y-2.5 bg-white">
            {filteredTrips.map((trip) => (
              <div
                key={trip.tripNo}
                role="button"
                tabIndex={0}
                className="w-full text-left rounded-lg border border-slate-200 p-3 shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-colors"
                onClick={() => setShowTripModal(trip)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowTripModal(trip);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{compactTripNoForTable(trip.tripNo)}</span>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                    {getStatusDisplay(trip.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDisplayDate(trip.date)}</p>
                <p className="mt-1.5 text-sm text-slate-800 line-clamp-2">{trip.partyName}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {trip.fromLocation} → {trip.toLocation}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Vehicle:</span> {trip.vehicleNumber}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">GR:</span> {getTripGrNo(trip) || '—'}
                </p>
                {trip.ewayBillNumber && (
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">E-way:</span> {trip.ewayBillNumber}
                  </p>
                )}
                {(needsAdvanceAlert(trip) || needsPaymentPendingAlert(trip)) && (
                  <p className="mt-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {needsAdvanceAlert(trip) ? 'Advance pending (Market)' : 'Payment pending'}
                  </p>
                )}
                {ewayAlertLabel(trip) && (
                  <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {ewayAlertLabel(trip)}
                  </p>
                )}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(trip);
                    }}
                    className="inline-flex rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {hasGrDetails(trip) ? 'View GR details' : 'Add GR details'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block table-scroll-bleed border-t border-slate-200">
            <table className="min-w-[1120px] w-full divide-y divide-slate-200">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                <tr>
                  {([
                    ['Trip', 'tripNo'],
                    ['Date', 'date'],
                    ['Party', 'partyName'],
                    ['From', 'fromLocation'],
                    ['To', 'toLocation'],
                    ['Vehicle', 'vehicleNumber'],
                    ['GR/LR', 'grLrNo'],
                    ['E-way', 'ewayBillNumber'],
                  ] as Array<[string, ColumnFilterKey]>).map(([label, key]) => {
                    const isOpen = openColumnFilter === key;
                    const allOptions = isOpen ? activeColumnOptions : [];
                    const options = isOpen ? activeFilteredColumnOptions : [];
                    const selectedCount = columnFilters[key].length;
                    const allSelected = allOptions.length > 0 && selectedCount === allOptions.length;
                    return (
                      <th key={key} className="px-2.5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="relative inline-flex items-center gap-1" data-col-filter-root="true">
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openColumnFilterMenu(key, e, 'left');
                            }}
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                              selectedCount > 0
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
                            }`}
                            aria-label={`Filter ${label}`}
                          >
                            <ListFilter className="h-3 w-3" />
                          </button>
                          {isOpen && columnFilterMenuPos && (
                            <div
                              className="fixed z-[90] flex max-h-[60vh] w-56 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 normal-case shadow-xl"
                              style={{ left: columnFilterMenuPos.left, top: columnFilterMenuPos.top }}
                            >
                              <input
                                type="text"
                                value={columnFilterSearch}
                                onChange={(e) => setColumnFilterSearch(e.target.value)}
                                placeholder="Search values"
                                className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-400"
                              />
                              <div className="mb-2 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-1 py-1 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={(e) => setAllColumnFilterValues(key, e.target.checked, allOptions)}
                                />
                                <span className="font-semibold text-slate-700">All</span>
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto space-y-1 pr-0.5">
                                {visibleColumnOptions.map((value) => (
                                  <label key={value} className="flex items-center gap-2 rounded px-1 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50">
                                    <input
                                      type="checkbox"
                                      checked={columnFilters[key].includes(value)}
                                      onChange={() => toggleColumnFilterValue(key, value)}
                                    />
                                    <span className="truncate">{value}</span>
                                  </label>
                                ))}
                                {visibleColumnOptions.length === 0 && (
                                  <p className="px-1 py-1 text-[11px] text-slate-500">No matching values</p>
                                )}
                              </div>
                              {activeFilteredColumnOptions.length > 4 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllFilterOptions((prev) => !prev)}
                                  className="mt-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                                >
                                  {showAllFilterOptions ? 'Show less' : `View all (${activeFilteredColumnOptions.length})`}
                                </button>
                              )}
                              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setAllColumnFilterValues(key, true, allOptions)}
                                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAllColumnFilterValues(key, false, [])}
                                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="relative inline-flex items-center justify-end gap-1" data-col-filter-root="true">
                      <span>Status</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openColumnFilterMenu('status', e, 'right');
                        }}
                        className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                          columnFilters.status.length > 0
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
                        }`}
                        aria-label="Filter status"
                      >
                        <ListFilter className="h-3 w-3" />
                      </button>
                      {openColumnFilter === 'status' && columnFilterMenuPos && (
                        <div
                          className="fixed z-[90] flex max-h-[60vh] w-56 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 normal-case shadow-xl"
                          style={{ left: columnFilterMenuPos.left, top: columnFilterMenuPos.top }}
                        >
                          <input
                            type="text"
                            value={columnFilterSearch}
                            onChange={(e) => setColumnFilterSearch(e.target.value)}
                            placeholder="Search values"
                            className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-400"
                          />
                          <div className="mb-2 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-1 py-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={activeColumnOptions.length > 0 && columnFilters.status.length === activeColumnOptions.length}
                              onChange={(e) => setAllColumnFilterValues('status', e.target.checked, activeColumnOptions)}
                            />
                            <span className="font-semibold text-slate-700">All</span>
                          </div>
                          <div className="min-h-0 flex-1 overflow-y-auto space-y-1 pr-0.5">
                            {visibleColumnOptions.map((value) => (
                                <label key={value} className="flex items-center gap-2 rounded px-1 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={columnFilters.status.includes(value)}
                                    onChange={() => toggleColumnFilterValue('status', value)}
                                  />
                                  <span className="truncate">{value}</span>
                                </label>
                              ))}
                            {visibleColumnOptions.length === 0 && (
                              <p className="px-1 py-1 text-[11px] text-slate-500">No matching values</p>
                            )}
                          </div>
                          {activeFilteredColumnOptions.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setShowAllFilterOptions((prev) => !prev)}
                              className="mt-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              {showAllFilterOptions ? 'Show less' : `View all (${activeFilteredColumnOptions.length})`}
                            </button>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                            <button
                              type="button"
                              onClick={() => setAllColumnFilterValues('status', true, activeColumnOptions)}
                              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllColumnFilterValues('status', false, [])}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTrips.map((trip) => (
                  <tr
                    key={trip.tripNo}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setShowTripModal(trip)}
                  >
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm font-medium text-slate-900">
                      {compactTripNoForTable(trip.tripNo)}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-500">
                      {formatDisplayDate(trip.date)}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{trip.partyName}</span>
                        {(needsAdvanceAlert(trip) || needsPaymentPendingAlert(trip)) && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            {needsAdvanceAlert(trip) ? 'Advance pending' : 'Payment pending'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-900">
                      {trip.fromLocation}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-900">
                      {trip.toLocation}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm font-medium text-slate-900">
                      {trip.vehicleNumber}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-900">
                      {getTripGrNo(trip) || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-sm text-slate-900">
                      {trip.ewayBillNumber ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{trip.ewayBillNumber}</span>
                          {ewayAlertLabel(trip) ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                              {ewayAlertLabel(trip)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-right text-sm">
                      <span
                        className={`inline-flex max-w-[11rem] justify-end rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(trip.status)}`}
                      >
                        {getStatusDisplay(trip.status)}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap text-right text-sm">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(trip);
                        }}
                        className="inline-flex rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        {hasGrDetails(trip) ? 'View GR details' : 'Add GR details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && filteredTrips.length === 0 && (
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
            <div className="sticky top-0 z-30 flex flex-col gap-3 border-b border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Trip details</p>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">{showTripModal.tripNo}</h3>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {(() => {
                  const headerHasGr = hasGrDetails(showTripModal);
                  const headerCanInvoice = showTripModal.status.toLowerCase() === 'invoicing';
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(showTripModal)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                      >
                        {headerHasGr ? 'View GR details' : 'Add GR details'}
                      </button>
                      {headerCanInvoice && (
                        <button
                          type="button"
                          onClick={() => {
                            const q = new URLSearchParams();
                            q.set('tab', 'invoices');
                            if (showTripModal.partyId) q.set('partyId', showTripModal.partyId);
                            router.push(`/admin/dashboard?${q.toString()}`);
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                        >
                          Go to invoicing
                        </button>
                      )}
                    </>
                  );
                })()}
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
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {/* Basic + operations */}
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 shadow-sm">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-900">Trip &amp; operations</h4>
                  <p className="mt-0.5 text-xs text-gray-500">Reference data and GR/POD dates (max. today)</p>
                </div>
                <div className="space-y-6 p-4 sm:p-5">
                  {(() => {
                    const latestGr = (grData[showTripModal.id] || [])[0] as any;
                    const grDateFromGr = (latestGr?.grDate || '').split('T')[0] || '';
                    const effectiveGrDate = grDateFromGr || (showTripModal.podReceivedDate || '').split('T')[0] || '';
                    return (
                      <>
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Trip snapshot</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ['Trip no.', showTripModal.tripNo],
                        ['Date', formatDisplayDate(showTripModal.date)],
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
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Trip fields</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">GR / LR no. (maps to GR no.)</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {showTripModal.grLrNo || latestGr?.grNo || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">POD received date (GR date)</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {formatDisplayDate(effectiveGrDate)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Billed at branch</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {latestGr?.billedAtBranch || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">CN type</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {latestGr?.cnType || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Delivery at</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {latestGr?.deliveryAt || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Consignor</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {latestGr?.consignor || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Consignee</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {latestGr?.consigneeName || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                      </>
                    );
                  })()}
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
                <div className="space-y-4 p-4 sm:p-5">
                  {(() => {
                    const latestGr = (grData[showTripModal.id] || [])[0] as any;
                    const effectiveFreight =
                      latestGr?.basicFreight != null
                        ? parseGrAmount((latestGr as any).basicFreight)
                        : showTripModal.freight ?? 0;
                    const totalExpense =
                      (showTripModal.initialExpense ?? 0) +
                      (latestGr?.toll != null ? parseGrAmount((latestGr as any).toll) : showTripModal.tollExpense ?? 0) +
                      (latestGr?.loadingCharges != null ? parseGrAmount((latestGr as any).loadingCharges) : 0) +
                      (latestGr?.unloadingCharges != null ? parseGrAmount((latestGr as any).unloadingCharges) : 0) +
                      (latestGr?.labourCharges != null ? parseGrAmount((latestGr as any).labourCharges) : showTripModal.labourCharges ?? 0) +
                      (latestGr?.otherCharges != null ? parseGrAmount((latestGr as any).otherCharges) : showTripModal.otherCharges ?? 0) +
                      (latestGr?.detentionLoading != null ? parseGrAmount((latestGr as any).detentionLoading) : showTripModal.detentionLoading ?? 0) +
                      (latestGr?.detentionUL != null ? parseGrAmount((latestGr as any).detentionUL) : showTripModal.detentionUL ?? 0) +
                      sumManualExpenseRows((latestGr as any)?.expenses);
                    const profitLossWithoutDeduction = effectiveFreight - totalExpense;
                    const deductionAmount = showTripModal.deductionAmount ?? 0;
                    const profitLossWithDeduction = profitLossWithoutDeduction - deductionAmount;
                    return (
                      <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Freight</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-900">
                          {formatCurrency(effectiveFreight)}
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Advance</label>
                        <div className={`mt-1.5 rounded-lg border px-3 py-2 text-sm tabular-nums ${
                          (needsAdvanceAlert(showTripModal) || needsPaymentPendingAlert(showTripModal))
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-slate-200/90 bg-slate-50 text-slate-900'
                        }`}>
                          {formatCurrency(showTripModal.advance ?? 0)}
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Deduction</label>
                      <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-900">
                        {formatCurrency(showTripModal.deductionAmount ?? 0)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Expense</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-900">
                          {formatCurrency(totalExpense)}
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Initial</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-900">
                          {formatCurrency(showTripModal.initialExpense ?? 0)}
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Party bill no.</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {((grData[showTripModal.id] || [])[0] as any)?.partyBillNo || showTripModal.billNo || '—'}
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Bill date</label>
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {formatDisplayDate(showTripModal.billDate)}
                        </div>
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
                          <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                            {partyBranchOptions.find((b) => b.id === (showTripModal.partyBranchId ?? ''))?.fullLedgerName ||
                              showTripModal.branchName ||
                              '—'}
                          </div>
                        ) : (
                          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                            No branches for this party yet.
                          </p>
                        )
                      ) : canShowFreeTextBranch ? (
                        <div className="mt-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                          {showTripModal.branchName || '—'}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">E-way bill number</label>
                      <input
                        type="text"
                        defaultValue={showTripModal.ewayBillNumber || ''}
                        onBlur={(e) => {
                          const nextValue = e.target.value.trim() || null;
                          if ((showTripModal.ewayBillNumber || null) === nextValue) return;
                          updateLocalTripField('ewayBillNumber', nextValue || undefined);
                          saveTripInlineField(showTripModal, 'ewayBillNumber', nextValue);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Optional e-way bill no."
                      />
                      {savingField === `${showTripModal.id}:ewayBillNumber` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">E-way date</label>
                      <input
                        type="text"
                        defaultValue={showTripModal.ewayDate ? formatDisplayDate(showTripModal.ewayDate) : ''}
                        onBlur={(e) => {
                          const parsed = parseDisplayDateToIso(e.target.value);
                          if (parsed === '') {
                            toast.error('Use date format dd/mm/yyyy');
                            e.target.value = showTripModal.ewayDate ? formatDisplayDate(showTripModal.ewayDate) : '';
                            return;
                          }
                          const nextValue = parsed;
                          const cur = (showTripModal.ewayDate || '').split('T')[0] || null;
                          if (cur === nextValue) return;
                          updateLocalTripField('ewayDate', nextValue || undefined);
                          saveTripInlineField(showTripModal, 'ewayDate', nextValue);
                        }}
                        placeholder="dd/mm/yyyy"
                        className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {savingField === `${showTripModal.id}:ewayDate` && (
                        <p className="mt-1 text-xs text-blue-600">Saving…</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Expense breakdown</p>
                    <p className="mt-1 text-xs text-slate-500">
                      From latest GR charges and manual expense table rows.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(
                        [
                          ['Toll charges', latestGr?.toll != null ? parseGrAmount((latestGr as any).toll) : showTripModal.tollExpense],
                          ['Loading charges', latestGr?.loadingCharges != null ? parseGrAmount((latestGr as any).loadingCharges) : 0],
                          ['Unloading charges', latestGr?.unloadingCharges != null ? parseGrAmount((latestGr as any).unloadingCharges) : 0],
                          ['Labour charges', latestGr?.labourCharges != null ? parseGrAmount((latestGr as any).labourCharges) : showTripModal.labourCharges],
                          ['Other charges', latestGr?.otherCharges != null ? parseGrAmount((latestGr as any).otherCharges) : showTripModal.otherCharges],
                          ['Detention loading', latestGr?.detentionLoading != null ? parseGrAmount((latestGr as any).detentionLoading) : showTripModal.detentionLoading],
                          ['Detention U/L', latestGr?.detentionUL != null ? parseGrAmount((latestGr as any).detentionUL) : showTripModal.detentionUL],
                          ['Expense table amount', sumManualExpenseRows((latestGr as any)?.expenses)],
                        ] as const
                      ).map(([label, val]) => (
                        <div key={label}>
                          <span className="block text-xs font-medium text-slate-600">{label}</span>
                          <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900">
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
                        {formatCurrency(totalExpense)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Initial + toll + loading + unloading + labour + other charges + detention loading + detention U/L + manual expense table amount.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">P&amp;L (with deduction)</span>
                      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${getProfitLossColor(profitLossWithDeduction)}`}>
                        {formatCurrency(profitLossWithDeduction)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Freight - expense - deduction. (Deduction defaults to 0 when none exists.)
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                          <span>P&amp;L without deduction</span>
                          <span className={`tabular-nums ${getProfitLossColor(profitLossWithoutDeduction)}`}>
                            {formatCurrency(profitLossWithoutDeduction)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                          <span>Deduction used</span>
                          <span className="tabular-nums text-slate-900">{formatCurrency(deductionAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              </section>

              {/* Status + actions */}
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 shadow-sm">
                <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Trip stage</h4>
                    <p className="mt-0.5 text-xs text-gray-500">Current progress and the next useful action for this trip.</p>
                  </div>
                </div>
                {(() => {
                  const hasGr = hasGrDetails(showTripModal);
                  const statusKey = showTripModal.status.toLowerCase();
                  const canOpenInvoicing = statusKey === 'invoicing';
                  const canOpenMr =
                    statusKey === 'payment_pending' ||
                    statusKey === 'completed' ||
                    Boolean(showTripModal.invoiceId) ||
                    Boolean(showTripModal.moneyReceiptId);

                  return (
                    <div className="space-y-3 p-4 sm:p-5">
                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                          <div className="mt-1.5">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(showTripModal.status)}`}>
                              {getStatusDisplay(showTripModal.status)}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">GR</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{hasGr ? 'Available' : 'Not added yet'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {showTripModal.moneyReceiptId
                              ? 'Money receipt created'
                              : showTripModal.invoiceId || statusKey === 'payment_pending' || statusKey === 'completed'
                                ? 'Invoice created'
                                : canOpenInvoicing
                                  ? 'Ready for invoice'
                                  : 'Waiting for billing step'}
                          </p>
                        </div>
                      </div>

                      {canOpenMr ? (
                        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() => setShowTripModal(null)}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const q = new URLSearchParams();
                              q.set('tab', 'moneyReceipt');
                              if (showTripModal.partyId) q.set('partyId', showTripModal.partyId);
                              router.push(`/admin/dashboard?${q.toString()}`);
                            }}
                            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
                          >
                            Go to MR
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowTripModal(null)}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
          grData={grData[showGRModal.id] || []}
          isLoading={!!grLoadingByTrip[showGRModal.id]}
          onSavedGr={(savedGr) => {
            if (!savedGr || !showGRModal) return;
            setGrData((prev) => {
              const existing = prev[showGRModal.id] || [];
              const next = [savedGr, ...existing.filter((item) => item.id !== savedGr.id)];
              return { ...prev, [showGRModal.id]: next };
            });
          }}
          onClose={() => setShowGRModal(null)}
          onRefresh={refreshTripsAndCurrentGr}
          autoOpenAddWhenEmpty={grModalAutoOpenAddWhenEmpty}
        />
      )}
    </div>
  );
}
