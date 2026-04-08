'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { AdminTripTable } from '@/components/trips/AdminTripTable';
import WhatsAppTestDashboard from '@/components/whatsapp/WhatsAppTestDashboard';
import { ExportButton } from '@/components/admin/ExportButton';
import { VehicleDashboard } from '@/modules/analytics/VehicleDashboard';
import InvoiceManagement from '@/modules/invoices/InvoiceManagement';
import MoneyReceiptPage from '@/modules/money-receipt/MoneyReceiptPage';
import PartyManagement from '@/modules/parties/PartyManagement';
import { AdminDashboardOverview } from '@/components/admin/AdminDashboardOverview';
import { Button } from '@/components/ui/Button';
import { VendorSubmissionForm } from '@/components/trips/VendorSubmissionForm';
import { BulkTripUploadPanel } from '@/components/trips/BulkTripUploadPanel';
import {
  AdminSettingsPanel,
  type SettingsSubTab,
} from '@/components/admin/AdminSettingsPanel';

const DASHBOARD_TAB_KEYS = new Set([
  'overview',
  'manage',
  'invoices',
  'moneyReceipt',
  'parties',
  'vehicles',
  'whatsapp',
  'settings',
]);

type DashboardTab =
  | 'overview'
  | 'manage'
  | 'invoices'
  | 'moneyReceipt'
  | 'parties'
  | 'vehicles'
  | 'whatsapp'
  | 'settings';

function AdminDashboardInner() {
  const [adminTrips, setAdminTrips] = useState([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('vendors');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    // Fetch admin dashboard stats and trips
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        // Fetch admin trips with all fields
        const tripsResponse = await api.get('/trips/admin-view', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (tripsResponse.data) {
          setAdminTrips(tripsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };

    fetchAdminData();
  }, [refreshTrigger]);


  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-slate-50/80">
        {/* Header */}
        <div className="bg-white border-b border-slate-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Administrative Dashboard</h1>
                <p className="text-sm text-slate-600 mt-1">Transportation management overview</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto shrink-0 justify-center bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium inline-flex items-center gap-2 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Navigation Tabs */}
          <div className="bg-white border border-slate-200/80 rounded-xl mb-6 sm:mb-8 shadow-md overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
            <nav className="flex min-w-max sm:flex-wrap gap-1 p-1.5">
              {(
                [
                  'overview',
                  'manage',
                  'invoices',
                  'moneyReceipt',
                  'parties',
                  'settings',
                  'vehicles',
                  'whatsapp',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => selectTab(tab)}
                  className={`shrink-0 py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'invoices'
                    ? 'Invoice Mgmt'
                    : tab === 'moneyReceipt'
                      ? 'Money receipt'
                      : tab === 'parties'
                        ? 'Parties'
                        : tab === 'settings'
                          ? 'Settings'
                          : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Export Section */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Data Export Center</h2>
                <p className="text-sm text-slate-600 mt-1">Generate detailed reports in Excel format for business analysis</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <ExportButton type="trips" />
                <ExportButton type="vendors" />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <AdminDashboardOverview
              refreshTrigger={refreshTrigger}
              onOpenTrips={() => selectTab('manage')}
              onOpenVendors={() => {
                setSettingsSubTab('vendors');
                selectTab('settings');
              }}
              onOpenParties={() => selectTab('parties')}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsPanel subTab={settingsSubTab} onSubTabChange={setSettingsSubTab} />
          )}


          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/80 rounded-xl p-4 shadow-md">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">Manage Trips</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Create a new trip or update operational/accounting details.
                  </p>
                </div>
                <Button
                  onClick={() => setShowCreateTrip(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto shrink-0"
                >
                  New Trip
                </Button>
              </div>

              {showCreateTrip && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto px-safe pt-safe pb-safe">
                  <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto mx-auto">
                      <button
                        onClick={() => setShowCreateTrip(false)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 text-gray-400 hover:text-gray-500 p-2"
                        aria-label="Close"
                      >
                        ×
                      </button>

                      <div className="p-4 pt-9 sm:p-6 sm:pt-10">
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

              <BulkTripUploadPanel onTripsCreated={() => setRefreshTrigger((prev) => prev + 1)} />

              <AdminTripTable trips={adminTrips} onRefresh={() => setRefreshTrigger((prev) => prev + 1)} />
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

          {activeTab === 'whatsapp' && (
            <WhatsAppTestDashboard />
          )}
        </div>
      </div>
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
