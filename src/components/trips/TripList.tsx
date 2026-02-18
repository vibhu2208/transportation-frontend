'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface Trip {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  distance: number;
  fare: number;
  expense: number;
  party: string;
  notes?: string;
  status: string;
  tripNo: string;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface TripListProps {
  refreshTrigger?: number;
}

export function TripList({ refreshTrigger }: TripListProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger]);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await api.get('/trips', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setTrips(response.data);
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.message?.includes('not properly configured')) {
        toast.error('Vendor account setup required. Please contact admin to assign your vendor ID.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch trips');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    setDeletingId(tripId);
    try {
      const token = localStorage.getItem('auth_token');
      await api.delete(`/trips/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      toast.success('Trip deleted successfully');
      setTrips(trips.filter(trip => trip.id !== tripId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete trip');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Trips ({trips.length})
        </h3>
      </div>

      {trips.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No trips found</div>
          <p className="text-sm mb-4">
            {localStorage.getItem('user_data') && JSON.parse(localStorage.getItem('user_data') || '{}').role === 'VENDOR' 
              ? 'Create your first trip to get started. Make sure your vendor account is properly configured.'
              : 'Create your first trip to get started.'
            }
          </p>
          <div className="text-xs text-gray-400">
            Vendors: If you're seeing this message but have created trips, please contact your admin to ensure your vendor ID is properly assigned.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {trip.tripNo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trip.vehicleNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trip.driverName} ({trip.driverPhone})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {trip.vendor?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trip.vendor?.email || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trip.vendor?.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {trip.startLocation} → {trip.endLocation}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(trip.startTime)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trip.distance} km
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Fare: ₹{trip.fare.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expense: ₹{trip.expense.toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        Profit: ₹{(trip.fare - trip.expense).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            toast('Edit functionality coming soon');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(trip.id)}
                          disabled={deletingId === trip.id}
                        >
                          {deletingId === trip.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
