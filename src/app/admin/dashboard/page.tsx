'use client';

import { useState, useEffect, Suspense, useCallback, useMemo, useRef, type ComponentType } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Loader2,
  LayoutDashboard,
  ClipboardList,
  FileText,
  WalletCards,
  Building2,
  Settings,
  CarFront,
  Bell,
  User,
  LogOut,
  X,
  AlertTriangle,
  BellRing,
  MessageSquare,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { AdminTripTable } from '@/components/trips/AdminTripTable';
import { VehicleDashboard } from '@/modules/analytics/VehicleDashboard';
import InvoiceManagement from '@/modules/invoices/InvoiceManagement';
import MoneyReceiptPage from '@/modules/money-receipt/MoneyReceiptPage';
import PartyManagement from '@/modules/parties/PartyManagement';
import { AdminDashboardOverview, type DashboardAlert } from '@/components/admin/AdminDashboardOverview';
import { Button } from '@/components/ui/Button';
import { VendorSubmissionForm } from '@/components/trips/VendorSubmissionForm';
import { BulkTripUploadPanel } from '@/components/trips/BulkTripUploadPanel';
import {
  AdminSettingsPanel,
  type SettingsSubTab,
} from '@/components/admin/AdminSettingsPanel';
import { daysUntilEwayExpiry, ewayCalendarDay } from '@/lib/calendar-date';

const DASHBOARD_TAB_KEYS = new Set([
  'overview',
  'manage',
  'invoices',
  'moneyReceipt',
  'parties',
  'vehicles',
  'settings',
]);

type DashboardTab =
  | 'overview'
  | 'manage'
  | 'invoices'
  | 'moneyReceipt'
  | 'parties'
  | 'vehicles'
  | 'settings';

type AdminTrip = {
  id: string;
  vendorId?: string;
  tripNo: string;
  date: string;
  vendorName: string;
  partyName: string;
  grLrNo?: string;
  grReceivedDate?: string;
  ewayDate?: string;
  ewayBillNumber?: string | null;
  ewayAlertDismissed?: boolean;
  podReceivedDate?: string;
  vehicleNumber: string;
  billNo?: string;
  billDate?: string;
  branchName?: string;
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
  remarks?: string;
  invoiceId?: string | null;
  moneyReceiptId?: string | null;
  status: string;
  createdAt: string;
  fromLocation: string;
  toLocation: string;
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
};

type AdminTripsResponse = {
  data: AdminTrip[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const DASHBOARD_TABS: Array<{
  key: DashboardTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'manage', label: 'Manage trips', icon: ClipboardList },
  { key: 'invoices', label: 'Invoice mgmt', icon: FileText },
  { key: 'moneyReceipt', label: 'Money receipt', icon: WalletCards },
  { key: 'parties', label: 'Parties', icon: Building2 },
  { key: 'vehicles', label: 'Vehicles', icon: CarFront },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function AdminDashboardInner() {
  const [adminTrips, setAdminTrips] = useState<AdminTrip[]>([]);
  const [adminTripsLoading, setAdminTripsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('vendors');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [manageSearch, setManageSearch] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchAdminTrips = useCallback(async () => {
    setAdminTripsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const tripsResponse = await api.get('/trips/admin-view', {
        params: {
          page: 1,
          pageSize: 300,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = tripsResponse.data as AdminTrip[] | AdminTripsResponse | null | undefined;
      if (Array.isArray(payload)) {
        setAdminTrips(payload);
      } else if (payload?.data && Array.isArray(payload.data)) {
        setAdminTrips(payload.data);
      } else {
        setAdminTrips([]);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setAdminTripsLoading(false);
    }
  }, []);

  const selectTab = useCallback(
    (tab: DashboardTab) => {
      setActiveTab(tab);
      router.replace(`/admin/dashboard?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && DASHBOARD_TAB_KEYS.has(t)) {
      setActiveTab(t as DashboardTab);
    }
  }, [searchParams]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/');
  };

  const tripAlerts = useMemo<DashboardAlert[]>(() => {
    const now = new Date();
    const fourDaysAgo = new Date(now);
    fourDaysAgo.setHours(0, 0, 0, 0);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const alerts = adminTrips.flatMap((trip) => {
      const base = {
        id: trip.id,
        tripNo: trip.tripNo,
        vehicleNumber: trip.vehicleNumber,
        route: `${trip.fromLocation || 'NA'} → ${trip.toLocation || 'NA'}`,
      };
      const eway = ewayCalendarDay(trip.ewayDate);
      const daysLeft = daysUntilEwayExpiry(trip.ewayDate);
      const tripDate = trip.date ? new Date(trip.date) : null;
      const isPodOverdue = !trip.podReceivedDate && tripDate && tripDate <= fourDaysAgo;
      const isEwayAlertEligible = !trip.podReceivedDate && !trip.ewayAlertDismissed;

      const ewaySoonMessage =
        daysLeft === 0
          ? 'E-way bill expires today'
          : daysLeft === 1
            ? 'E-way bill expires tomorrow'
            : daysLeft === 2
              ? 'E-way bill expires in 2 days'
              : null;

      return [
        ...(isPodOverdue
          ? [{ ...base, type: 'critical' as const, kind: 'pod_overdue' as const, message: 'POD not received after 4 days' }]
          : []),
        ...(isEwayAlertEligible &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= 2 &&
        ewaySoonMessage
          ? [
              {
                ...base,
                type: 'warning' as const,
                kind: 'eway_expiring' as const,
                dismissable: true,
                message: ewaySoonMessage,
              },
            ]
          : []),
        ...(isEwayAlertEligible && !!trip.ewayBillNumber && !eway
          ? [{ ...base, type: 'warning' as const, kind: 'eway_missing_expiry' as const, dismissable: true, message: 'E-way expiry date is missing' }]
          : []),
      ];
    });

    return alerts.sort((a, b) => (a.type === b.type ? 0 : a.type === 'critical' ? -1 : 1));
  }, [adminTrips]);

  const recentAlerts = useMemo(() => tripAlerts.slice(0, 5), [tripAlerts]);

  const dismissAlert = async (alert: DashboardAlert) => {
    if (alert.kind !== 'eway_expiring' && alert.kind !== 'eway_missing_expiry') return;
    try {
      await api.patch(`/trips/${alert.id}/accounts`, { ewayAlertDismissed: true });
      setAdminTrips((prev) =>
        prev.map((trip) =>
          trip.id === alert.id ? { ...trip, ewayAlertDismissed: true } : trip,
        ),
      );
      toast.success('E-way alert dismissed');
    } catch (error) {
      console.error('Failed to dismiss e-way alert:', error);
      toast.error('Could not dismiss alert');
    }
  };

  const submitIssue = async () => {
    const title = issueTitle.trim();
    const message = issueMessage.trim();
    if (title.length < 3 || message.length < 10) {
      toast.error('Please add a clear title and issue details.');
      return;
    }
    setIssueSubmitting(true);
    try {
      await api.post('/notifications/report-issue', { title, message });
      toast.success('Issue sent to developer successfully.');
      setIssueModalOpen(false);
      setIssueTitle('');
      setIssueMessage('');
    } catch (error) {
      console.error('Issue submission failed:', error);
      toast.error('Could not send issue right now. Please check email settings.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  useEffect(() => {
    // Always fetch on first mount and when refresh trigger changes.
    fetchAdminTrips();
  }, [fetchAdminTrips, refreshTrigger]);

  useEffect(() => {
    // Ensure direct refresh on ?tab=manage reliably loads rows.
    if (activeTab === 'manage' && adminTrips.length === 0) {
      fetchAdminTrips();
    }
  }, [activeTab, adminTrips.length, fetchAdminTrips]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);


  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-slate-50/80">
        {/* Header */}
        <div className="bg-white border-b border-slate-200/80 shadow-sm">
          <div className="max-w-[92rem] mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  Fleetzi
                </h1>
                <p className="text-xs text-slate-600">Admin Dashboard</p>
              </div>
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div ref={notificationRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen((prev) => !prev);
                      setProfileOpen(false);
                    }}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {tripAlerts.length > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {tripAlerts.length > 99 ? '99+' : tripAlerts.length}
                      </span>
                    )}
                  </button>
                  {notificationOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Recent alerts</h3>
                        <span className="text-xs text-slate-500">{tripAlerts.length} total</span>
                      </div>
                      <div className="space-y-2">
                        {recentAlerts.length === 0 ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                            No alerts right now
                          </p>
                        ) : (
                          recentAlerts.map((alert, idx) => (
                            <div
                              key={`${alert.id}-${alert.type}-${idx}`}
                              className={`rounded-lg border px-2.5 py-2 ${
                                alert.type === 'critical'
                                  ? 'border-red-200 bg-red-50'
                                  : 'border-amber-200 bg-amber-50'
                              }`}
                            >
                              <p className="text-xs font-semibold text-slate-900">{alert.message}</p>
                              <p className="text-xs text-slate-700">
                                {alert.tripNo} · {alert.vehicleNumber}
                              </p>
                              {alert.dismissable && (
                                <button
                                  type="button"
                                  onClick={() => dismissAlert(alert)}
                                  className="mt-1 text-[11px] font-semibold text-slate-700 underline hover:text-slate-900"
                                >
                                  Dismiss
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-3 w-full"
                        onClick={() => {
                          setNotificationOpen(false);
                          setAlertsModalOpen(true);
                        }}
                      >
                        See all alerts
                      </Button>
                    </div>
                  )}
                </div>

                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((prev) => !prev);
                      setNotificationOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setIssueModalOpen(true);
                        }}
                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Raise issue
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Navigation Tabs */}
          <div className="mb-4 sm:mb-5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-md">
            <nav className="flex min-w-max flex-nowrap gap-1.5 overflow-x-auto rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-50 p-1 overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible">
              {DASHBOARD_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => selectTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-100'
                      : 'border-transparent bg-white/80 text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <AdminDashboardOverview
              refreshTrigger={refreshTrigger}
              onOpenTrips={() => selectTab('manage')}
              onOpenParties={() => selectTab('parties')}
              onOpenSettings={() => selectTab('settings')}
              alerts={tripAlerts}
              onOpenAlerts={() => setAlertsModalOpen(true)}
              onDismissAlert={dismissAlert}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsPanel subTab={settingsSubTab} onSubTabChange={setSettingsSubTab} />
          )}


          {activeTab === 'manage' && (
            <div className="space-y-6">
              {showCreateTrip && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto px-safe pt-safe pb-safe">
                  <div className="flex min-h-full items-center justify-center p-2 sm:p-3">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[88dvh] sm:max-h-[88vh] overflow-y-auto mx-auto">
                      <button
                        onClick={() => setShowCreateTrip(false)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-gray-400 hover:text-gray-500 p-2"
                        aria-label="Close"
                      >
                        ×
                      </button>

                      <div className="p-3 pt-8 sm:p-4 sm:pt-9">
                        <VendorSubmissionForm
                          forAdmin
                          embedded
                          onSave={() => {
                            setShowCreateTrip(false);
                            setRefreshTrigger((prev) => prev + 1);
                          }}
                          onCancel={() => setShowCreateTrip(false)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bulkUploadOpen && (
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900">Bulk upload (Excel)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBulkUploadOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                      aria-label="Close bulk upload"
                    >
                      <ChevronDown className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                  <div className="bg-slate-50/40 px-4 py-4 sm:px-6">
                    <BulkTripUploadPanel
                      embedded
                      onTripsCreated={() => setRefreshTrigger((prev) => prev + 1)}
                    />
                  </div>
                </div>
              )}

              <AdminTripTable
                trips={adminTrips}
                loading={adminTripsLoading}
                unifiedSearch={manageSearch}
                onUnifiedSearchChange={setManageSearch}
                onOpenCreateTrip={() => setShowCreateTrip(true)}
                onToggleBulkUpload={() => setBulkUploadOpen((o) => !o)}
                bulkUploadOpen={bulkUploadOpen}
                onRefresh={() => {
                  setRefreshTrigger((prev) => prev + 1);
                }}
                onTripLocalPatch={(tripId, patch) => {
                  setAdminTrips((prev) =>
                    prev.map((t) => (t.id === tripId ? { ...t, ...patch } : t)),
                  );
                }}
              />
            </div>
          )}

          {activeTab === 'vehicles' && (
            <VehicleDashboard />
          )}

          {activeTab === 'invoices' && (
            <InvoiceManagement />
          )}

          {activeTab === 'moneyReceipt' && (
            <Suspense fallback={<div className="py-10 text-center text-slate-600">Loading…</div>}>
              <MoneyReceiptPage />
            </Suspense>
          )}

          {activeTab === 'parties' && (
            <PartyManagement />
          )}
        </div>
      </div>

      {alertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 sm:p-6">
          <div className="mx-auto h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">All alerts</h3>
                <p className="text-xs text-slate-500">Critical alerts are shown first</p>
              </div>
              <button
                type="button"
                onClick={() => setAlertsModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close alerts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-68px)] overflow-y-auto p-4 sm:p-5">
              {tripAlerts.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  No alerts available
                </p>
              ) : (
                <div className="space-y-3">
                  {tripAlerts.map((alert, idx) => (
                    <div
                      key={`${alert.id}-${alert.type}-${idx}`}
                      className={`rounded-lg border px-3 py-2.5 ${
                        alert.type === 'critical'
                          ? 'border-red-200 bg-red-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {alert.type === 'critical' ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        ) : (
                          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        )}
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              alert.type === 'critical' ? 'text-red-900' : 'text-amber-900'
                            }`}
                          >
                            {alert.message}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-700">
                            {alert.tripNo} · {alert.vehicleNumber}
                          </p>
                          <p className="text-xs text-slate-600">{alert.route}</p>
                          {alert.dismissable ? (
                            <button
                              type="button"
                              onClick={() => dismissAlert(alert)}
                              className="mt-1 text-[11px] font-semibold text-slate-700 underline hover:text-slate-900"
                            >
                              Dismiss alert
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 sm:p-6">
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Contact developer</h3>
                <p className="text-xs text-slate-500">Raise an issue with full details</p>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close issue modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <label className="text-xs font-medium text-slate-600">Issue title</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 focus:ring-2"
                  placeholder="Example: Alerts not loading in dashboard"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Issue details</label>
                <textarea
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 focus:ring-2"
                  placeholder="Describe what happened, expected behavior, and steps to reproduce."
                  value={issueMessage}
                  onChange={(e) => setIssueMessage(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIssueModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={submitIssue} disabled={issueSubmitting}>
                  {issueSubmitting ? 'Sending...' : 'Send issue'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50/80">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AdminDashboardInner />
    </Suspense>
  );
}
