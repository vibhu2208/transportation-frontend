'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { OperationsUpdateForm } from './OperationsUpdateForm';
import { AccountsUpdateForm } from './AccountsUpdateForm';
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

  const toggleExpand = async (trip: AdminTripData) => {
    if (expandedTrip === trip.tripNo) {
      setExpandedTrip(null);
    } else {
      setExpandedTrip(trip.tripNo);
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
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Transit';
      case 'completed': return 'Completed';
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
              <React.Fragment key={trip.tripNo}>
              <tr className="hover:bg-gray-50">
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
                  {updatingStatus === trip.tripNo ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-xs text-gray-500">Updating...</span>
                    </div>
                  ) : (
                    <select
                      value={trip.status}
                      onChange={(e) => handleStatusChange(trip.tripNo, e.target.value)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${getStatusColor(trip.status)}`}
                      disabled={updatingStatus !== null}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Transit</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  )}
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
                    <button
                      onClick={() => toggleExpand(trip)}
                      className="text-purple-600 hover:text-purple-900 text-xs px-1"
                      title="View GR Details"
                    >
                      {expandedTrip === trip.tripNo ? '▼' : '▶'} GR
                    </button>
                  </div>
                </td>
              </tr>
              {expandedTrip === trip.tripNo && (
                <tr key={`${trip.tripNo}-gr`}>
                  <td colSpan={18} className="px-6 py-4 bg-gray-50">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 text-sm">Goods Receipt Details</h4>
                      {grData[trip.tripNo] && grData[trip.tripNo].length > 0 ? (
                        (() => {
                          console.log('Rendering GR data for trip:', trip.tripNo, 'GR count:', grData[trip.tripNo].length);
                          return grData[trip.tripNo].map((gr, index) => {
                            console.log('Rendering GR:', gr.id, 'grBiltyImages:', gr.grBiltyImages);
                            return (
                              <div key={gr.id} className="bg-white p-4 rounded border border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Branch:</span>
                                <p className="text-gray-900">{gr.branchName}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">CN No:</span>
                                <p className="text-gray-900">{gr.cnNo}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">CN Date:</span>
                                <p className="text-gray-900">{gr.cnDate}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Consignor:</span>
                                <p className="text-gray-900">{gr.consignor}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Consignee:</span>
                                <p className="text-gray-900">{gr.consigneeName}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Vehicle Type:</span>
                                <p className="text-gray-900">{gr.vehicleType}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Package:</span>
                                <p className="text-gray-900">{gr.package} {gr.typeOfPkg}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Goods:</span>
                                <p className="text-gray-900">{gr.goodsDescription}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Freight:</span>
                                <p className="text-gray-900">₹{gr.freight}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Total Freight:</span>
                                <p className="text-gray-900">₹{gr.totalFreight || '-'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">GST:</span>
                                <p className="text-gray-900">₹{gr.gst || '-'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Net Payable:</span>
                                <p className="text-gray-900 font-semibold">₹{gr.netPayable || '-'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Actual WT:</span>
                                <p className="text-gray-900">{gr.actualWt} {gr.unit}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Charged WT:</span>
                                <p className="text-gray-900">{gr.chargedWt} {gr.unit}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">GST Paid By:</span>
                                <p className="text-gray-900">{gr.gstPaidBy}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Account:</span>
                                <p className="text-gray-900">{gr.account}</p>
                              </div>
                            </div>
                            {gr.expenses && gr.expenses.length > 0 && (
                              <div className="mt-4">
                                <h5 className="font-medium text-gray-700 text-xs mb-2">Expenses:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {gr.expenses.map((exp: any, i: number) => (
                                    <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                                      <span className="font-medium">{exp.expense}:</span> ₹{exp.amount}
                                      {exp.narration && <span className="text-gray-600"> - {exp.narration}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {gr.grPhotoUrl && (
                              <div className="mt-4">
                                <a href={gr.grPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">
                                  📷 View GR Photo
                                </a>
                              </div>
                            )}
                            {gr.grBiltyImages && Array.isArray(gr.grBiltyImages) && gr.grBiltyImages.length > 0 && (
                              <div className="mt-4">
                                <h5 className="font-medium text-gray-700 text-xs mb-2">GR/Bilty Images:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {gr.grBiltyImages.map((imageUrl: string, i: number) => (
                                    <div key={i} className="relative group">
                                      <img
                                        src={imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`}
                                        alt={`GR/Bilty Image ${i + 1}`}
                                        className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-75"
                                        onClick={() => window.open(imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`, '_blank')}
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                        Image {i + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                            );
                          })
                        })()
                      ) : (
                        <p className="text-gray-500 text-sm">No GR data available for this trip</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
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
