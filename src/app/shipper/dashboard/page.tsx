'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import ShipperDashboard from '@/components/shipper/ShipperDashboard';

export default function ShipperDashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/');
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.SHIPPER]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-tight">Shipper Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">Select a trip and fill Goods Receipt form</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto justify-center bg-gray-900 text-white px-6 py-2.5 rounded-sm hover:bg-gray-800 transition-colors duration-200 text-sm font-medium tracking-wide inline-flex items-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <ShipperDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
}
