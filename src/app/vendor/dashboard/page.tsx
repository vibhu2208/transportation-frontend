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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your trips and vehicles</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Create Trip
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">My Trips</div>
                  <div className="text-3xl font-bold text-blue-600 mt-2">{stats.totalTrips}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Active Vehicles</div>
                  <div className="text-3xl font-bold text-green-600 mt-2">{stats.myVehicles}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Pending</div>
                  <div className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingTrips}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">My Revenue</div>
                  <div className="text-3xl font-bold text-yellow-600 mt-2">₹{stats.totalRevenue.toLocaleString()}</div>
                </div>
              </div>

              {/* Recent Trips and Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completed Trips</span>
                      <span className="font-semibold text-green-600">{stats.completedTrips}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Pending Trips</span>
                      <span className="font-semibold text-orange-600">{stats.pendingTrips}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${stats.totalTrips > 0 ? (stats.completedTrips / stats.totalTrips) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      Completion Rate: {stats.totalTrips > 0 ? Math.round((stats.completedTrips / stats.totalTrips) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('create')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create New Trip
                    </button>
                    <button 
                      onClick={() => setActiveTab('manage')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View My Trips
                    </button>
                    <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
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
