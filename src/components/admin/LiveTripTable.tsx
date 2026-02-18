'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import axios from 'axios';
import { format } from 'date-fns';

interface Trip {
  id: string;
  tripNo: string;
  vehicleNumber: string;
  vendor: {
    name: string;
    email: string;
  };
  startLocation: string;
  endLocation: string;
  status: string;
  duplicateFlag: boolean;
  party?: string;
  fare?: number;
  expense?: number;
  createdAt: string;
  startTime: string;
}

interface LiveTripTableProps {
  refreshInterval?: number; // in seconds
}

export function LiveTripTable({ refreshInterval = 30 }: LiveTripTableProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTrips = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get<{trips: Trip[], total: number}>(
        `${process.env.NEXT_PUBLIC_API_URL}/trips?take=50&orderBy=createdAt&order=desc`,
        { headers }
      );
      
      setTrips(response.data.trips);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch trips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchTrips();
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTrips();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'IN_PROGRESS':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Live Trip Dashboard</h2>
          <p className="text-sm text-gray-500">
            Last updated: {format(lastRefresh, 'HH:mm:ss')} • {trips.length} trips
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh ({refreshInterval}s)
          </label>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
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
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submission Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading trips...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No trips found
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id} className={trip.duplicateFlag ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {trip.duplicateFlag && (
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trip.tripNo}
                          </div>
                          {trip.party && (
                            <div className="text-sm text-gray-500">
                              Party: {trip.party}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{trip.vendor.name}</div>
                      <div className="text-sm text-gray-500">{trip.vendor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {trip.vehicleNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {trip.startLocation} → {trip.endLocation}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(trip.startTime), 'MMM dd, HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(trip.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                          {trip.status.replace('_', ' ')}
                        </span>
                      </div>
                      {trip.duplicateFlag && (
                        <div className="text-xs text-red-600 mt-1">
                          Duplicate Detected
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(trip.createdAt), 'MMM dd, HH:mm:ss')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Trips</div>
          <div className="text-2xl font-bold text-gray-900">{trips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {trips.filter(t => t.status === 'PENDING').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-blue-600">
            {trips.filter(t => t.status === 'IN_PROGRESS').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Duplicates</div>
          <div className="text-2xl font-bold text-red-600">
            {trips.filter(t => t.duplicateFlag).length}
          </div>
        </div>
      </div>
    </div>
  );
}
