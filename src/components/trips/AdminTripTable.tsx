'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { OperationsUpdateForm } from './OperationsUpdateForm';
import { AccountsUpdateForm } from './AccountsUpdateForm';

interface AdminTripData {
  tripNo: string;
  date: string;
  vendorName: string;
  partyName: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  grLrNo?: string;
  freight?: number;
  advance?: number;
  initialExpense?: number;
  tollExpense?: number;
  totalExpense?: number;
  profitLoss?: number;
  billNo?: string;
  billDate?: string;
  status: string;
  createdAt: string;
  remarks?: string;
}

interface AdminTripTableProps {
  trips: AdminTripData[];
  onRefresh: () => void;
}

export function AdminTripTable({ trips, onRefresh }: AdminTripTableProps) {
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState<'operations' | 'accounts' | null>(null);

  const handleOperationsUpdate = (tripId: string) => {
    setSelectedTrip(tripId);
    setUpdateMode('operations');
  };

  const handleAccountsUpdate = (tripId: string) => {
    setSelectedTrip(tripId);
    setUpdateMode('accounts');
  };

  const handleUpdateComplete = () => {
    setSelectedTrip(null);
    setUpdateMode(null);
    onRefresh();
  };

  const handleCancel = () => {
    setSelectedTrip(null);
    setUpdateMode(null);
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProfitLossColor = (profitLoss?: number) => {
    if (profitLoss === undefined || profitLoss === null) return 'text-gray-500';
    return profitLoss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  if (updateMode && selectedTrip) {
    const trip = trips.find(t => t.tripNo === selectedTrip);
    if (!trip) return null;

    if (updateMode === 'operations') {
      return (
        <OperationsUpdateForm
          tripId={selectedTrip}
          currentData={{
            grLrNo: trip.grLrNo,
            tollExpense: trip.tollExpense,
          }}
          onSave={handleUpdateComplete}
          onCancel={handleCancel}
        />
      );
    }

    if (updateMode === 'accounts') {
      return (
        <AccountsUpdateForm
          tripId={selectedTrip}
          currentData={{
            freight: trip.freight,
            billNo: trip.billNo,
            billDate: trip.billDate,
          }}
          onSave={handleUpdateComplete}
          onCancel={handleCancel}
        />
      );
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Transportation Operations Register</h3>
        <p className="mt-1 text-sm text-gray-500">Complete lifecycle view of all trips with operational and financial data</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip No</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GR/LR No</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toll</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freight</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Exp</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trips.map((trip) => (
              <tr key={trip.tripNo} className="hover:bg-gray-50">
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {trip.tripNo}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                  {trip.date}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.vendorName}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.partyName}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.fromLocation}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.toLocation}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {trip.vehicleNumber}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.grLrNo || '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(trip.tollExpense)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(trip.freight)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(trip.advance)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(trip.initialExpense)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(trip.totalExpense)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.billNo || '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {trip.billDate || '-'}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                  <span className={getProfitLossColor(trip.profitLoss)}>
                    {formatCurrency(trip.profitLoss)}
                  </span>
                </td>
                <td className="px-2 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setSelectedTrip(trip.tripNo);
                        setUpdateMode('operations');
                      }}
                      className="text-blue-600 hover:text-blue-900 text-xs px-1"
                    >
                      Ops
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTrip(trip.tripNo);
                        setUpdateMode('accounts');
                      }}
                      className="text-green-600 hover:text-green-900 text-xs px-1"
                    >
                      Acc
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trips.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No trips found</div>
        </div>
      )}
    </div>
  );
}
