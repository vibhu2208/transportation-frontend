'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { VendorSubmissionForm } from '@/components/trips/VendorSubmissionForm';
import { VendorTripTable } from '@/components/trips/VendorTripTable';

export default function VendorDashboard() {
  const [stats, setStats] = useState({
    totalTrips: 0,
    pendingTrips: 0,
    completedTrips: 0,
    totalRevenue: 0,
    myVehicles: 0,
  });
  const [vendorTrips, setVendorTrips] = useState([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'manage'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/');
  };

  useEffect(() => {
    // Fetch vendor dashboard stats and trips
    const fetchVendorData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        // Fetch vendor trips with limited fields
        const tripsResponse = await api.get('/trips/vendor-view', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (tripsResponse.data) {
          const trips = tripsResponse.data;
          setVendorTrips(trips);
          
          // Calculate stats from vendor trips
          setStats({
            totalTrips: trips.length,
            pendingTrips: trips.filter((t: any) => t.status === 'PENDING').length,
            completedTrips: trips.filter((t: any) => t.status === 'COMPLETED').length,
            totalRevenue: 0, // Vendors don't see revenue
            myVehicles: new Set(trips.map((t: any) => t.vehicleNumber)).size,
          });
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      }
    };

    fetchVendorData();
  }, [refreshTrigger]);

  const handleTripCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('manage');
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.VENDOR]}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vendor Dashboard</h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage your trips and vehicles</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto justify-center bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-red-600 transition-colors inline-flex items-center gap-2 shadow-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border bg-white rounded-t-lg shadow-sm mb-6 sm:mb-8 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
            <nav className="-mb-px flex min-w-max gap-6 sm:gap-8 px-4 sm:px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`shrink-0 py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`shrink-0 py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'create'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Create Trip
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`shrink-0 py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                My Trips
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Vendor Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">My Trips</div>
                      <div className="text-3xl font-bold text-primary mt-2">{stats.totalTrips}</div>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Active Vehicles</div>
                      <div className="text-3xl font-bold text-primary mt-2">{stats.myVehicles}</div>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Pending</div>
                      <div className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingTrips}</div>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Completed</div>
                      <div className="text-3xl font-bold text-primary mt-2">{stats.completedTrips}</div>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Trips and Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Trip Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Completed Trips</span>
                      <span className="font-semibold text-primary">{stats.completedTrips}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pending Trips</span>
                      <span className="font-semibold text-orange-600">{stats.pendingTrips}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${stats.totalTrips > 0 ? (stats.completedTrips / stats.totalTrips) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Completion Rate: {stats.totalTrips > 0 ? Math.round((stats.completedTrips / stats.totalTrips) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('create')}
                      className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                    >
                      Create New Trip
                    </button>
                    <button 
                      onClick={() => setActiveTab('manage')}
                      className="w-full bg-white text-foreground border border-border py-2 px-4 rounded-lg hover:bg-secondary transition-colors shadow-sm"
                    >
                      View My Trips
                    </button>
                    <button className="w-full bg-white text-foreground border border-border py-2 px-4 rounded-lg hover:bg-secondary transition-colors shadow-sm">
                      Manage Vehicles
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Isolation Notice */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Data Access Notice</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      As a vendor, you can only view and manage your own trips. The system ensures complete data isolation and security.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'create' && (
            <VendorSubmissionForm 
              onSave={() => {
                setRefreshTrigger(prev => prev + 1);
                setActiveTab('manage');
              }} 
              onCancel={() => setActiveTab('overview')}
            />
          )}

          {activeTab === 'manage' && (
            <VendorTripTable trips={vendorTrips} />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
