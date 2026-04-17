'use client';

import React, { useState } from 'react';
import { GoodsReceipt } from '@/types/goods-receipt';
import { GREditModal } from './GREditModal';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';
import axios from 'axios';

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const day = value.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-GB');
}

interface GRDetailsModalProps {
  trip: any;
  grData: GoodsReceipt[];
  onClose: () => void;
  onRefresh?: () => void;
  autoOpenAddWhenEmpty?: boolean;
  isLoading?: boolean;
  onSavedGr?: (savedGr: any) => void;
}

export function GRDetailsModal({
  trip,
  grData,
  onClose,
  onRefresh,
  autoOpenAddWhenEmpty = false,
  isLoading = false,
  onSavedGr,
}: GRDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGR, setEditingGR] = useState<any>(null);
  const [podImages, setPodImages] = useState<string[]>([]);
  const [isUploadingPOD, setIsUploadingPOD] = useState(false);
  const noGrData = !grData || grData.length === 0;
  const openAddDirectly = autoOpenAddWhenEmpty && noGrData && !isLoading && !showEditModal;

  const handleAddGR = () => {
    setEditingGR(null);
    setShowEditModal(true);
  };

  const handleEditGR = (gr: any) => {
    setEditingGR(gr);
    setShowEditModal(true);
  };

  const handleEditComplete = async (savedGr?: any) => {
    if (savedGr && onSavedGr) onSavedGr(savedGr);
    setShowEditModal(false);
    setEditingGR(null);
    if (onRefresh) await onRefresh();
  };

  const handleEditCancel = () => {
    if (openAddDirectly) {
      onClose();
      return;
    }
    setShowEditModal(false);
    setEditingGR(null);
  };

  const handleBackToGRDetails = () => {
    if (openAddDirectly) {
      onClose();
      return;
    }
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

  const normalizeAmount = (value?: string | null) => {
    if (!value) return 0;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  if (showEditModal || openAddDirectly) {
    const effectiveExistingGR = showEditModal ? editingGR : null;
    return (
      <GREditModal
        trip={trip}
        existingGR={effectiveExistingGR}
        onSave={handleEditComplete}
        onCancel={handleEditCancel}
        onBack={openAddDirectly ? onClose : handleBackToGRDetails}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full items-start justify-center overflow-y-auto bg-slate-900/45 px-2 py-4 backdrop-blur-[1px] sm:px-4 sm:py-8">
      <div className="relative mx-auto w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl sm:p-5 max-h-[90dvh] [scrollbar-color:#10b981_#e2e8f0] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-500 [&::-webkit-scrollbar-thumb:hover]:bg-emerald-600">
        <div className="mt-0 sm:mt-1">
          <div className="mb-4 flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Goods Receipt</p>
              <h3 className="pr-2 text-base font-semibold text-slate-900 sm:text-lg">GR Details - Trip {trip.tripNo}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading && (
            <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Loading GR details...
            </div>
          )}

          {/* Display GR data when available */}
          {grData && grData.length > 0 && (
            <div className="space-y-4">
              {/* Edit button for existing GR */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleEditGR(grData[0])}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Edit GR Details
                </button>
              </div>

              {grData.map((gr, index) => (
                <div key={gr.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="mb-3 text-sm font-semibold text-slate-900">Goods Receipt #{index + 1}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Branch:</span>
                      <p className="text-gray-900">{(gr as any).branch?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">E-way bill no.:</span>
                      <p className="text-gray-900">{trip.ewayBillNumber?.trim() || '—'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">E-way date:</span>
                      <p className="text-gray-900">
                        {trip.ewayDate
                          ? formatDisplayDate(trip.ewayDate)
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR Date:</span>
                      <p className="text-gray-900">
                        {formatDisplayDate(gr.grDate)}
                      </p>
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
                      <span className="font-medium text-gray-600">Vehicle Number:</span>
                      <p className="text-gray-900">{gr.truckLorryNo || '—'}</p>
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
                        {((gr as any).basicFreight != null || (gr as any).freight != null)
                          ? `₹${Number((gr as any).basicFreight ?? (gr as any).freight).toLocaleString('en-IN')}`
                          : trip.freight != null && trip.freight !== undefined
                          ? `₹${Number(trip.freight).toLocaleString('en-IN')}`
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
                      <span className="font-medium text-gray-600">GST Amount:</span>
                      <p className="text-gray-900">
                        {(gr as any).gstAmount != null && (gr as any).gstAmount !== ''
                          ? `₹${Number((gr as any).gstAmount).toLocaleString('en-IN')}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Net Payable:</span>
                      <p className="text-gray-900">
                        {(gr as any).netPayable != null && (gr as any).netPayable !== ''
                          ? `₹${Number((gr as any).netPayable).toLocaleString('en-IN')}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR No. / CN No.:</span>
                      <p className="text-gray-900">{gr.grNo || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Party Bill No:</span>
                      <p className="text-gray-900">{(gr as any).partyBillNo || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR Created:</span>
                      <p className="text-gray-900">{formatDisplayDate(gr.createdAt)} {new Date(gr.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">GR Updated:</span>
                      <p className="text-gray-900">{formatDisplayDate(gr.updatedAt)} {new Date(gr.updatedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  {gr.expenses && gr.expenses.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h5 className="mb-2 text-xs font-semibold text-slate-700">Expenses</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {gr.expenses.map((exp: any, i: number) => (
                          <div key={i} className="rounded bg-white p-2 text-xs border border-slate-200">
                            <span className="font-medium">{exp.expenseType}:</span> ₹{exp.amount}
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
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h5 className="mb-2 text-xs font-semibold text-slate-700">Proof of Delivery (POD)</h5>
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
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">POD Uploaded:</span> {gr.updatedAt && gr.updatedAt !== gr.createdAt ? formatDisplayDate(gr.updatedAt) + ' ' + new Date(gr.updatedAt).toLocaleTimeString() : 'N/A'}
                          </div>
                          {gr.podReceived && gr.podReceivedAt && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">POD Received:</span> {formatDisplayDate(gr.podReceivedAt)} {new Date(gr.podReceivedAt).toLocaleTimeString()}
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
                            className="w-full rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
