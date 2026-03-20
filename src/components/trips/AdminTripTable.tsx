'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { OperationsUpdateModal } from './OperationsUpdateModal';
import { AccountsUpdateModal } from './AccountsUpdateModal';
import { GRDetailsModal } from './GRDetailsModal';
import { goodsReceiptApi } from '@/lib/api-client';
import { GoodsReceipt } from '@/types/goods-receipt';

interface AdminTripData {
  id: string;
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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [grData, setGrData] = useState<Record<string, GoodsReceipt[]>>({});
  const [showTripModal, setShowTripModal] = useState<AdminTripData | null>(null);
  const [showGRModal, setShowGRModal] = useState<AdminTripData | null>(null);
  const [showOperationsModal, setShowOperationsModal] = useState<AdminTripData | null>(null);
  const [showAccountsModal, setShowAccountsModal] = useState<AdminTripData | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    to: '',
    from: '',
    vehicleNumber: '',
    party: '',
    date: ''
  });

  const handleOperationsUpdate = (trip: AdminTripData) => {
    setShowOperationsModal(trip);
    setShowTripModal(null); // Close trip modal when opening operations modal
  };

  const handleAccountsUpdate = (trip: AdminTripData) => {
    setShowAccountsModal(trip);
    setShowTripModal(null); // Close trip modal when opening accounts modal
  };

  const handleBackToTripDetails = (trip: AdminTripData) => {
    setShowTripModal(trip);
    setShowOperationsModal(null);
    setShowAccountsModal(null);
  };

  const handleUpdateComplete = () => {
    setShowOperationsModal(null);
    setShowAccountsModal(null);
    onRefresh();
  };

  const handleModalCancel = () => {
    setShowOperationsModal(null);
    setShowAccountsModal(null);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      to: '',
      from: '',
      vehicleNumber: '',
      party: '',
      date: ''
    });
  };

  const filteredTrips = trips.filter(trip => {
    return (
      (!filters.to || trip.toLocation.toLowerCase().includes(filters.to.toLowerCase())) &&
      (!filters.from || trip.fromLocation.toLowerCase().includes(filters.from.toLowerCase())) &&
      (!filters.vehicleNumber || trip.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase())) &&
      (!filters.party || trip.partyName.toLowerCase().includes(filters.party.toLowerCase())) &&
      (!filters.date || trip.date.includes(filters.date))
    );
  });

  const toggleExpand = async (trip: AdminTripData) => {
    // Set the GR modal trip
    setShowGRModal(trip);
    
    // Fetch GR data if not already loaded
    if (!grData[trip.tripNo]) {
      try {
        console.log('Fetching GR data for trip:', trip.id, 'tripNo:', trip.tripNo);
        const receipts = await goodsReceiptApi.getByTripId(trip.id);
        console.log('GR receipts received:', receipts);
        setGrData(prev => ({ ...prev, [trip.tripNo]: receipts }));
      } catch (error) {
        console.error('Error fetching GR data:', error);
      }
    }
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
      case 'invoicing': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Transit';
      case 'completed': return 'Completed';
      case 'invoicing': return 'Invoicing';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleStatusChange = async (tripId: string, newStatus: string) => {
    setUpdatingStatus(tripId);
    try {
      const token = localStorage.getItem('auth_token');
      await api.patch(`/trips/${tripId}`, { status: newStatus }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getProfitLossColor = (profitLoss?: number) => {
    if (profitLoss === undefined || profitLoss === null) return 'text-gray-500';
    return profitLoss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Transportation Operations Register</h3>
        <p className="mt-1 text-sm text-gray-500">Complete lifecycle view of all trips with operational and financial data</p>
      </div>

      {/* Filters Section */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Filter Trips</h4>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Location</label>
            <input
              type="text"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              placeholder="Search destination..."
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Location</label>
            <input
              type="text"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              placeholder="Search origin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Number</label>
            <input
              type="text"
              value={filters.vehicleNumber}
              onChange={(e) => handleFilterChange('vehicleNumber', e.target.value)}
              placeholder="Search vehicle..."
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
            <input
              type="text"
              value={filters.party}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              placeholder="Search party..."
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="text"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              placeholder="Search date..."
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        {filteredTrips.length !== trips.length && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredTrips.length} of {trips.length} trips
          </div>
        )}
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTrips.map((trip) => (
              <tr 
                key={trip.tripNo}
                className="hover:bg-gray-50 cursor-pointer" 
                onClick={() => setShowTripModal(trip)}
              >
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTrips.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {trips.length === 0 ? 'No trips found' : 'No trips match your filters'}
          </div>
          {trips.length > 0 && filteredTrips.length === 0 && (
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear filters to see all trips
            </button>
          )}
        </div>
      )}

      {/* Trip Detail Modal */}
      {showTripModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Trip Details - {showTripModal.tripNo}</h3>
                <button
                  onClick={() => setShowTripModal(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Basic Information */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Basic Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Trip No:</span>
                      <p className="text-sm text-gray-900">{showTripModal.tripNo}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Date:</span>
                      <p className="text-sm text-gray-900">{showTripModal.date}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Vendor:</span>
                      <p className="text-sm text-gray-900">{showTripModal.vendorName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Party:</span>
                      <p className="text-sm text-gray-900">{showTripModal.partyName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">From:</span>
                      <p className="text-sm text-gray-900">{showTripModal.fromLocation}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">To:</span>
                      <p className="text-sm text-gray-900">{showTripModal.toLocation}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Vehicle:</span>
                      <p className="text-sm text-gray-900">{showTripModal.vehicleNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">GR/LR No:</span>
                      <p className="text-sm text-gray-900">{showTripModal.grLrNo || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Financial Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Freight:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(showTripModal.freight)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Advance:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(showTripModal.advance)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Toll:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(showTripModal.tollExpense)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Initial:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(showTripModal.initialExpense)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Expense:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(showTripModal.totalExpense)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">P&L:</span>
                      <p className={`text-sm font-medium ${getProfitLossColor(showTripModal.profitLoss)}`}>
                        {formatCurrency(showTripModal.profitLoss)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Bill No:</span>
                      <p className="text-sm text-gray-900">{showTripModal.billNo || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Bill Date:</span>
                      <p className="text-sm text-gray-900">{showTripModal.billDate || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Status & Actions</h4>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Current Status:</span>
                      <div className="mt-1">
                        {updatingStatus === showTripModal.id ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            <span className="text-xs text-gray-500">Updating...</span>
                          </div>
                        ) : (
                          <select
                            value={showTripModal.status}
                            onChange={(e) => {
                              handleStatusChange(showTripModal.id, e.target.value);
                              setShowTripModal({...showTripModal, status: e.target.value});
                            }}
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${getStatusColor(showTripModal.status)}`}
                            disabled={updatingStatus !== null}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Transit</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="INVOICING">Invoicing</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        handleOperationsUpdate(showTripModal);
                        setShowTripModal(null);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Update Operations
                    </button>
                    <button
                      onClick={() => {
                        handleAccountsUpdate(showTripModal);
                        setShowTripModal(null);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-sm hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Update Accounts
                    </button>
                    <button
                      onClick={() => {
                        toggleExpand(showTripModal);
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      View GR Details
                    </button>
                  </div>
                </div>

                {/* Remarks */}
                {showTripModal.remarks && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Remarks</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-sm">{showTripModal.remarks}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowTripModal(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-sm hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GR Details Modal */}
      {showGRModal && (
        <GRDetailsModal
          trip={showGRModal}
          grData={grData[showGRModal.tripNo] || []}
          onClose={() => setShowGRModal(null)}
          onRefresh={onRefresh}
        />
      )}

      {/* Operations Update Modal */}
      {showOperationsModal && (
        <OperationsUpdateModal
          tripId={showOperationsModal.id}
          tripNo={showOperationsModal.tripNo}
          currentData={{
            grLrNo: showOperationsModal.grLrNo,
            tollExpense: showOperationsModal.tollExpense,
          }}
          onSave={handleUpdateComplete}
          onCancel={handleModalCancel}
          onBack={() => handleBackToTripDetails(showOperationsModal)}
        />
      )}

      {/* Accounts Update Modal */}
      {showAccountsModal && (
        <AccountsUpdateModal
          tripId={showAccountsModal.id}
          tripNo={showAccountsModal.tripNo}
          currentData={{
            freight: showAccountsModal.freight,
            billNo: showAccountsModal.billNo,
            billDate: showAccountsModal.billDate,
          }}
          onSave={handleUpdateComplete}
          onCancel={handleModalCancel}
          onBack={() => handleBackToTripDetails(showAccountsModal)}
        />
      )}
    </div>
  );
}
