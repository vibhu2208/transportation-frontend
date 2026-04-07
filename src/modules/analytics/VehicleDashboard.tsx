'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Truck, Search, Filter, ArrowRight, TrendingUp, 
  TrendingDown, AlertCircle, RefreshCcw
} from 'lucide-react';
import { VehicleDetailView } from './VehicleDetailView';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  _count?: {
    trips: number;
  };
}

export function VehicleDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(v => 
    v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedVehicle) {
    return (
      <VehicleDetailView 
        vehicleNumber={selectedVehicle} 
        onBack={() => setSelectedVehicle(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 border border-gray-200 rounded-sm">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Vehicle Fleet Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor your vehicle performance</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" />
            <input
              type="text"
              placeholder="Search vehicle number..."
              className="w-full md:min-w-[200px] md:max-w-xs pl-10 pr-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchVehicles}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors text-gray-500"
            title="Refresh List"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 p-6 rounded-sm animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-50 rounded w-3/4"></div>
            </div>
          ))
        ) : filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => setSelectedVehicle(vehicle.vehicleNumber)}
              className="group bg-white border border-gray-200 p-6 rounded-sm text-left hover:border-green-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-50 rounded-sm flex items-center justify-center group-hover:bg-green-50 transition-colors">
                  <Truck className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Asset</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                {vehicle.vehicleNumber}
              </h3>
              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Status</span>
                  <span className="text-xs font-medium text-green-600">Operational</span>
                </div>
                <div className="h-8 w-px bg-gray-100"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Analytics</span>
                  <span className="text-xs font-medium text-blue-600">View Details</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-full py-12 bg-white border border-dashed border-gray-300 rounded-sm flex flex-col items-center justify-center text-gray-500">
            <Truck className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No vehicles found</p>
            <p className="text-sm">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
