'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { AdminTripTable } from '@/components/trips/AdminTripTable';
import { VendorManagement } from '@/modules/vendors/VendorManagement';
import { WhatsAppTestDashboard } from '@/components/whatsapp/WhatsAppTestDashboard';
import { ExportButton } from '@/components/admin/ExportButton';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalVendors: 0,
    totalUsers: 0,
    pendingTrips: 0,
    inTransitTrips: 0,
    completedTrips: 0,
    totalRevenue: 0,
  });
  const [adminTrips, setAdminTrips] = useState([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'vendors' | 'whatsapp'>('overview');
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
        const tripsResponse = await api.get('/trips/admin-view', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (tripsResponse.data) {
          const trips = tripsResponse.data;
          setAdminTrips(trips);
          
          // Calculate stats from admin trips
          setStats({
            totalTrips: trips.length,
            totalVendors: 2, // Mock data
            totalUsers: 3, // Mock data
            pendingTrips: trips.filter((t: any) => t.status === 'PENDING').length,
            inTransitTrips: trips.filter((t: any) => t.status === 'IN_PROGRESS').length,
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


  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-light text-gray-900 tracking-tight">Administrative Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">Transportation Management System Overview</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-sm hover:bg-gray-800 transition-colors duration-200 text-sm font-medium tracking-wide flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Navigation Tabs */}
          <div className="bg-white border border-gray-200 rounded-sm mb-8">
            <nav className="flex space-x-1 p-1">
              {['overview', 'manage', 'vendors', 'whatsapp'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-sm transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Export Section */}
          <div className="bg-white border border-gray-200 rounded-sm p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Data Export Center</h2>
                <p className="text-sm text-gray-600 mt-1">Generate detailed reports in Excel format for business analysis</p>
              </div>
              <div className="flex gap-3">
                <ExportButton type="trips" />
                <ExportButton type="vendors" />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Trips</p>
                      <p className="text-3xl font-light text-gray-900 mt-2">{stats.totalTrips}</p>
                      <p className="text-xs text-gray-500 mt-2">All transportation records</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Vendors</p>
                      <p className="text-3xl font-light text-gray-900 mt-2">{stats.totalVendors}</p>
                      <p className="text-xs text-gray-500 mt-2">Registered transport companies</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">System Users</p>
                      <p className="text-3xl font-light text-gray-900 mt-2">{stats.totalUsers}</p>
                      <p className="text-xs text-gray-500 mt-2">Authorized personnel</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v2.25" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Revenue</p>
                      <p className="text-3xl font-light text-gray-900 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-2">Gross freight earnings</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Trip Status Breakdown */}
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Trip Status Analysis</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-400 rounded-sm mr-3"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Pending</p>
                          <p className="text-xs text-gray-500">Awaiting processing</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-light text-gray-900">{stats.pendingTrips}</p>
                        <p className="text-xs text-gray-500">trips</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-400 rounded-sm mr-3"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">In Transit</p>
                          <p className="text-xs text-gray-500">Currently active</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-light text-gray-900">{stats.inTransitTrips}</p>
                        <p className="text-xs text-gray-500">trips</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-sm mr-3"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Completed</p>
                          <p className="text-xs text-gray-500">Successfully delivered</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-light text-gray-900">{stats.completedTrips}</p>
                        <p className="text-xs text-gray-500">trips</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div className="py-3 border-b border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-900">Completion Rate</p>
                        <p className="text-sm text-gray-600">
                          {stats.totalTrips > 0 ? Math.round((stats.completedTrips / stats.totalTrips) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-sm h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-sm transition-all duration-300"
                          style={{ width: `${stats.totalTrips > 0 ? (stats.completedTrips / stats.totalTrips) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="py-3 border-b border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-900">Active Rate</p>
                        <p className="text-sm text-gray-600">
                          {stats.totalTrips > 0 ? Math.round((stats.inTransitTrips / stats.totalTrips) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-sm h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-sm transition-all duration-300"
                          style={{ width: `${stats.totalTrips > 0 ? (stats.inTransitTrips / stats.totalTrips) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="py-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-900">Pending Rate</p>
                        <p className="text-sm text-gray-600">
                          {stats.totalTrips > 0 ? Math.round((stats.pendingTrips / stats.totalTrips) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-sm h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-sm transition-all duration-300"
                          style={{ width: `${stats.totalTrips > 0 ? (stats.pendingTrips / stats.totalTrips) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('manage')}
                      className="w-full bg-gray-900 text-white py-3 px-4 rounded-sm hover:bg-gray-800 transition-colors duration-200 text-sm font-medium tracking-wide"
                    >
                      View All Trips
                    </button>
                    <button 
                      onClick={() => setActiveTab('vendors')}
                      className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-sm hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
                    >
                      Manage Vendors
                    </button>
                    <button 
                      onClick={() => setActiveTab('whatsapp')}
                      className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-sm hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
                    >
                      WhatsApp Testing
                    </button>
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center">
                        Last updated: {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
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
