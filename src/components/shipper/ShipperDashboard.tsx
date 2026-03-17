'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { tripsApi, goodsReceiptApi } from '@/lib/api-client';
import GoodsReceiptForm from './GoodsReceiptForm';

interface Trip {
  id: string;
  tripNo: string;
  vehicleNumber: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  partyName: string;
  hasGR?: boolean;
}

export default function ShipperDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getShipperTrips();
      
      // Check GR submission status for each trip
      const tripsWithGRStatus = await Promise.all(
        data.map(async (trip: Trip) => {
          try {
            const grData = await goodsReceiptApi.getByTripId(trip.id);
            return { ...trip, hasGR: grData.length > 0 };
          } catch (error) {
            return { ...trip, hasGR: false };
          }
        })
      );
      
      setTrips(tripsWithGRStatus);
    } catch (error) {
      console.error('Failed to load trips:', error);
      alert('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const handleFormComplete = () => {
    setSelectedTrip(null);
    alert('Goods Receipt submitted successfully!');
    // Reload trips to update GR status
    loadTrips();
  };

  if (selectedTrip) {
    return (
      <div>
        <Button onClick={() => setSelectedTrip(null)} className="mb-4">
          ← Back to Trips
        </Button>
        <GoodsReceiptForm trip={selectedTrip} onComplete={handleFormComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Select a Trip</h2>

      {loading ? (
        <div className="text-center py-8">Loading trips...</div>
      ) : (
        <div className="grid gap-4">
          {trips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No trips available
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Trip No</div>
                    <div className="font-semibold">{trip.tripNo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Vehicle Number</div>
                    <div className="font-semibold">{trip.vehicleNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div className="font-semibold">
                      {new Date(trip.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Party</div>
                    <div className="font-semibold">{trip.partyName}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">From</div>
                    <div className="font-medium">{trip.fromLocation}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">To</div>
                    <div className="font-medium">{trip.toLocation}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {trip.hasGR ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">GR Submitted</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-700">GR Pending</span>
                    </div>
                  )}
                  <Button 
                    onClick={() => handleSelectTrip(trip)} 
                    className={trip.hasGR ? "bg-gray-500 hover:bg-gray-600" : ""}
                    disabled={trip.hasGR}
                  >
                    {trip.hasGR ? 'GR Completed' : 'Fill GR Form'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
