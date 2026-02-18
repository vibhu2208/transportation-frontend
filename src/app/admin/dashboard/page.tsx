'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { TripCreationForm } from '@/components/trips/TripCreationForm';
import { AdminTripTable } from '@/components/trips/AdminTripTable';
import { VendorManagement } from '@/modules/vendors/VendorManagement';
import { WhatsAppTestDashboard } from '@/components/whatsapp/WhatsAppTestDashboard';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalVendors: 0,
    totalUsers: 0,
    pendingTrips: 0,
    completedTrips: 0,
    totalRevenue: 0,
  });
  const [adminTrips, setAdminTrips] = useState([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'manage' | 'vendors' | 'whatsapp'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

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
        const tripsResponse = await fetch('http://localhost:3005/trips/admin-view', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (tripsResponse.ok) {
          const trips = await tripsResponse.json();
          setAdminTrips(trips);
          
          // Calculate stats from admin trips
          setStats({
            totalTrips: trips.length,
            totalVendors: 2, // Mock data
            totalUsers: 3, // Mock data
            pendingTrips: trips.filter((t: any) => t.status === 'PENDING').length,
            completedTrips: trips.filter((t: any) => t.status === 'COMPLETED').length,
            totalRevenue: trips.reduce((sum: number, t: any) => sum + (t.freight || 0), 0),
          });
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };

    fetchAdminData();
  }, [refreshTrigger]);

  const handleTripCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('manage');
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">System-wide overview and management</p>
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
                Manage Trips
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'vendors'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Vendors
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'whatsapp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                WhatsApp Test
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Trips</div>
                  <div className="text-3xl font-bold text-blue-600 mt-2">{stats.totalTrips}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Vendors</div>
                  <div className="text-3xl font-bold text-green-600 mt-2">{stats.totalVendors}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Users</div>
                  <div className="text-3xl font-bold text-purple-600 mt-2">{stats.totalUsers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                  <div className="text-3xl font-bold text-yellow-600 mt-2">₹{stats.totalRevenue.toLocaleString()}</div>
                </div>
              </div>

              {/* Trip Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Status</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Pending Trips</span>
                      <span className="font-semibold text-orange-600">{stats.pendingTrips}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completed Trips</span>
                      <span className="font-semibold text-green-600">{stats.completedTrips}</span>
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
                      View All Trips
                    </button>
                    <button 
                      onClick={() => setActiveTab('vendors')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Manage Vendors
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'create' && (
            <TripCreationForm onSuccess={handleTripCreated} />
          )}

          {activeTab === 'manage' && (
            <AdminTripTable 
              trips={adminTrips} 
              onRefresh={() => setRefreshTrigger(prev => prev + 1)} 
            />
          )}

          {activeTab === 'vendors' && (
            <VendorManagement onEdit={(vendor) => console.log('Edit vendor:', vendor)} />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppTestDashboard />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
