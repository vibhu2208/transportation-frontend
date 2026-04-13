'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend 
} from 'recharts';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Truck, Calendar, 
  Package, IndianRupee, History, BarChart3 
} from 'lucide-react';

interface VehicleStats {
  summary: {
    totalTrips: number;
    totalProfit: number;
    averageProfit: number;
  };
  trends: Array<{
    month: string;
    profit: number;
    trips: number;
  }>;
}

interface TripHistory {
  id: string;
  tripNo: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  partyName: string;
  freight: number;
  totalExpense: number;
  profitLoss: number;
  status: string;
  vendor: {
    name: string;
  };
}

interface VehicleDetailViewProps {
  vehicleNumber: string;
  onBack: () => void;
}

export function VehicleDetailView({ vehicleNumber, onBack }: VehicleDetailViewProps) {
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [history, setHistory] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, historyRes] = await Promise.all([
          api.get(`/vehicles/${vehicleNumber}/stats`),
          api.get(`/vehicles/${vehicleNumber}/history`)
        ]);
        setStats(statsRes.data);
        setHistory(historyRes.data);
      } catch (error) {
        console.error('Error fetching vehicle details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-light text-gray-900 flex flex-wrap items-center gap-2">
              <Truck className="w-6 h-6 text-green-600 shrink-0" />
              <span>Vehicle: <span className="font-medium break-all">{vehicleNumber}</span></span>
            </h2>
            <p className="text-sm text-gray-500">Comprehensive performance and history analysis</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-6">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Profit</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-3xl font-light ${(stats?.summary.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{(stats?.summary.totalProfit ?? 0).toLocaleString()}
            </p>
            {(stats?.summary.totalProfit ?? 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">Lifetime cumulative earnings</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-6">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">Average Profit/Trip</p>
          <p className="text-3xl font-light text-gray-900 mt-2">
            ₹{Math.round(stats?.summary.averageProfit || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Efficiency per operation</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-6">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Trips</p>
          <p className="text-3xl font-light text-gray-900 mt-2">
            {stats?.summary.totalTrips}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Service frequency</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500 shrink-0" />
            Monthly Profit Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    const [year, month] = val.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
                  }}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Profit']}
                  labelFormatter={(label) => {
                    const [year, month] = label.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                  }}
                />
                <Bar dataKey="profit" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500 shrink-0" />
            Trip Volume Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    const [year, month] = val.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
                  }}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Trips']}
                />
                <Line type="monotone" dataKey="trips" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500 shrink-0" />
            Trip History
          </h3>
          <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full w-fit">
            {history.length} Trips Found
          </span>
        </div>
        <div className="table-scroll-bleed overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Route</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor/Party</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Freight</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Expense</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Profit/Loss</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(trip.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                    <div className="font-medium">{trip.fromLocation}</div>
                    <div className="text-xs text-gray-500">to {trip.toLocation}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                    <div className="font-medium">{trip.vendor.name}</div>
                    <div className="text-xs text-gray-500">{trip.partyName}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 text-right font-medium">
                    ₹{(trip.freight ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 text-right">
                    ₹{(trip.totalExpense ?? 0).toLocaleString()}
                  </td>
                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-sm text-right font-semibold ${(trip.profitLoss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(trip.profitLoss ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      trip.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {trip.status}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                    No trip history available for this vehicle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
