'use client';

import React, { useState } from 'react';
import { GoodsReceipt } from '@/types/goods-receipt';
import { GREditModal } from './GREditModal';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';
import axios from 'axios';

interface GRDetailsModalProps {
  trip: any;
  grData: GoodsReceipt[];
  onClose: () => void;
  onRefresh?: () => void;
}

export function GRDetailsModal({ trip, grData, onClose, onRefresh }: GRDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGR, setEditingGR] = useState<any>(null);
  const [podImages, setPodImages] = useState<string[]>([]);
  const [isUploadingPOD, setIsUploadingPOD] = useState(false);

  const handleAddGR = () => {
    setEditingGR(null);
    setShowEditModal(true);
  };

  const handleEditGR = (gr: any) => {
    setEditingGR(gr);
    setShowEditModal(true);
  };

  const handleEditComplete = () => {
    setShowEditModal(false);
    setEditingGR(null);
    if (onRefresh) onRefresh();
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingGR(null);
  };

  const handleBackToGRDetails = () => {
    setShowEditModal(false);
    setEditingGR(null);
  };

  const handleUploadPOD = async () => {
    if (podImages.length === 0) {
      toast.error('Please upload at least one POD image');
      return;
    }

    setIsUploadingPOD(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${grData[0].id}/pod`,
        { podImages },
        { headers }
      );

      toast.success('POD uploaded successfully!');
      setPodImages([]);
      
      // Force refresh the GR data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error: any) {
      console.error('POD upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload POD');
    } finally {
      setIsUploadingPOD(false);
    }
  };

  const handleMarkPODReceived = async () => {
    setIsUploadingPOD(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${grData[0].id}/pod-received`,
        {},
        { headers }
      );

      toast.success('POD marked as received!');
      if (onRefresh) {
        await onRefresh();
      }
      onClose(); // Close the GR modal to show the updated status in the trip details/table
    } catch (error: any) {
      console.error('Mark POD received error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark POD as received');
    } finally {
      setIsUploadingPOD(false);
    }
  };

  const normalizeAmount = (value?: string | null) => {
    if (!value) return 0;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  if (showEditModal) {
    return (
      <GREditModal
        trip={trip}
        existingGR={editingGR}
        onSave={handleEditComplete}
        onCancel={handleEditCancel}
        onBack={handleBackToGRDetails}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-2 sm:px-4 py-4 sm:py-8 flex items-start justify-center">
      <div className="relative mx-auto p-4 sm:p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90dvh] overflow-y-auto">
        <div className="mt-0 sm:mt-1">
          <div className="flex justify-between items-start gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-2">GR Details - Trip {trip.tripNo}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Add GR Button when no GR data exists */}
          {(!grData || grData.length === 0) && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">No GR data available for this trip</div>
              <button
                onClick={handleAddGR}
                className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Add GR Details
              </button>
            </div>
          )}

          {/* Display GR data when available */}
          {grData && grData.length > 0 && (
            <div className="space-y-4">
              {/* Edit button for existing GR */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleEditGR(grData[0])}
                  className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Edit GR Details
                </button>
              </div>

              {grData.map((gr, index) => (
                <div key={gr.id} className="bg-white p-4 rounded border border-gray-200">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">Goods Receipt #{index + 1}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Branch:</span>
                      <p className="text-gray-900">{trip.branchName || '—'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">E-way date:</span>
                      <p className="text-gray-900">
                        {trip.ewayDate
                          ? new Date(trip.ewayDate).toLocaleDateString('en-IN')
                          : '—'}
                      </p>
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
                      <span className="font-medium text-gray-600">Freight (trip):</span>
                      <p className="text-gray-900">
                        {trip.freight != null && trip.freight !== undefined
                          ? `₹${Number(trip.freight).toLocaleString('en-IN')}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Bill date (trip):</span>
                      <p className="text-gray-900">
                        {trip.billDate
                          ? new Date(trip.billDate).toLocaleDateString('en-IN')
                          : '—'}
                      </p>
                    </div>
                    {gr.toll && normalizeAmount(gr.toll) > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Toll:</span>
                        <p className="text-gray-900">₹{gr.toll}</p>
                      </div>
                    )}
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
                      <span className="font-medium text-gray-600">GR No:</span>
                      <p className="text-gray-900">{gr.grNo || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Detention Loading:</span>
                      <p className="text-gray-900">{gr.detentionLoading || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Detention U/L:</span>
                      <p className="text-gray-900">{gr.detentionUL || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Labour Charges:</span>
                      <p className="text-gray-900">{gr.labourCharges || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Other Charges:</span>
                      <p className="text-gray-900">{gr.otherCharges || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR Created:</span>
                      <p className="text-gray-900">{new Date(gr.createdAt).toLocaleDateString()} {new Date(gr.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR Updated:</span>
                      <p className="text-gray-900">{new Date(gr.updatedAt).toLocaleDateString()} {new Date(gr.updatedAt).toLocaleTimeString()}</p>
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

                  {/* POD Section */}
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h5 className="font-medium text-gray-700 text-xs mb-2">Proof of Delivery (POD):</h5>
                    {gr.podImages && Array.isArray(gr.podImages) && gr.podImages.length > 0 ? (
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                          {gr.podImages.map((imageUrl: string, i: number) => (
                            <div key={i} className="relative group">
                              <img
                                src={imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`}
                                alt={`POD Image ${i + 1}`}
                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-75"
                                onClick={() => window.open(imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`, '_blank')}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                POD {i + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${gr.podReceived ? 'text-green-600' : 'text-orange-600'}`}>
                              {gr.podReceived ? '✓ POD Received' : '⏳ POD Pending'}
                            </span>
                            {!gr.podReceived && (
                              <button
                                onClick={handleMarkPODReceived}
                                disabled={isUploadingPOD}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                {isUploadingPOD ? 'Processing...' : 'Mark POD Received'}
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">POD Uploaded:</span> {gr.updatedAt && gr.updatedAt !== gr.createdAt ? new Date(gr.updatedAt).toLocaleDateString() + ' ' + new Date(gr.updatedAt).toLocaleTimeString() : 'N/A'}
                          </div>
                          {gr.podReceived && gr.podReceivedAt && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">POD Received:</span> {new Date(gr.podReceivedAt).toLocaleDateString()} {new Date(gr.podReceivedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">No POD images uploaded</p>
                        <div className="space-y-2">
                          <ImageUpload
                            images={podImages}
                            onImagesChange={setPodImages}
                            maxImages={3}
                            label="Upload POD Images"
                          />
                          <button
                            onClick={handleUploadPOD}
                            disabled={isUploadingPOD || podImages.length === 0}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 w-full"
                          >
                            {isUploadingPOD ? 'Uploading...' : 'Upload POD'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded-sm hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
