'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';
import axios from 'axios';

const grSchema = z.object({
  branchName: z.string().optional(),
  billedAtBranch: z.string().optional(),
  cnType: z.string().optional(),
  deliveryAt: z.string().optional(),
  cnNo: z.string().optional(),
  cnDate: z.string().optional(),
  cnTime: z.string().optional(),
  consignor: z.string().optional(),
  chargedParty: z.string().optional(),
  consigneeName: z.string().optional(),
  fromStation: z.string().optional(),
  toStation: z.string().optional(),
  partySlab: z.string().optional(),
  distanceKm: z.string().optional(),
  partyBillNo: z.string().optional(),
  partyBillDate: z.string().optional(),
  netInvValue: z.string().optional(),
  truckLorryNo: z.string().optional(),
  agentTruck: z.string().optional(),
  capacity: z.string().optional(),
  vehicleType: z.string().optional(),
  comm: z.string().optional(),
  rate: z.string().optional(),
  freight: z.string().optional(),
  package: z.string().optional(),
  typeOfPkg: z.string().optional(),
  goodsDescription: z.string().optional(),
  actualWt: z.string().optional(),
  chargedWt: z.string().optional(),
  unit: z.string().optional(),
  loadingChg: z.string().optional(),
  unloadingChg: z.string().optional(),
  pMarkaAwbGr: z.string().optional(),
  gstPaidBy: z.string().optional(),
  account: z.string().optional(),
  basicFreight: z.string().optional(),
  totalFreight: z.string().optional(),
  gst: z.string().optional(),
  advanceDate: z.string().optional(),
  ewayDate: z.string().optional(),
  netPayable: z.string().optional(),
  fromStationUp: z.string().optional(),
  toStationUp: z.string().optional(),
  driverName: z.string().optional(),
  poNo: z.string().optional(),
  shipmentId: z.string().optional(),
  grPhotoUrl: z.string().optional(),
}).transform((data) => {
  console.log('Form validation data:', data);
  return data;
});

type GRData = z.infer<typeof grSchema>;

interface GREditModalProps {
  trip: any;
  existingGR?: any;
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export function GREditModal({ trip, existingGR, onSave, onCancel, onBack }: GREditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [grBiltyImages, setGrBiltyImages] = useState<string[]>(existingGR?.grBiltyImages || []);
  const isEditing = !!existingGR;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GRData>({
    resolver: zodResolver(grSchema),
    defaultValues: existingGR || {
      cnNo: trip.tripNo,
      cnDate: new Date().toISOString().split('T')[0],
      cnTime: new Date().toLocaleTimeString(),
      truckLorryNo: trip.vehicleNumber,
      agentTruck: trip.vehicleNumber,
      fromStation: trip.fromLocation,
      toStation: trip.toLocation,
      gstPaidBy: 'Consignor',
    },
  });

  const onSubmit = async (data: GRData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      // Get user info from token to determine shipperId
      let shipperId = null;
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        shipperId = tokenPayload.sub; // This should be the user ID
      } catch (e) {
        console.error('Error parsing token:', e);
        toast.error('Invalid authentication token. Please login again.');
        return;
      }

      const submitData = {
        ...data,
        grBiltyImages: grBiltyImages,
        tripId: trip.id,
        shipperId: shipperId,
      };

      if (isEditing) {
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${existingGR.id}`,
          submitData,
          { headers }
        );
        toast.success('GR details updated successfully!');
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt`,
          submitData,
          { headers }
        );
        toast.success('GR details added successfully!');
      }
      
      onSave();
    } catch (error: any) {
      console.error('GR save error:', error);
      toast.error(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} GR details`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-5 mx-auto p-5 border w-11/12 shadow-lg rounded-md bg-white max-h-[95vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-400 hover:text-gray-600"
                  title="Back to GR details"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? 'Edit GR Details' : 'Add GR Details'} - Trip {trip.tripNo}
                </h3>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Update goods receipt information' : 'Enter goods receipt information'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Consignment Basic Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Consignment Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                  <Input
                    {...register('branchName')}
                    error={errors.branchName?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billed At Branch</label>
                  <Input
                    {...register('billedAtBranch')}
                    error={errors.billedAtBranch?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN Type</label>
                  <Input
                    {...register('cnType')}
                    error={errors.cnType?.message}
                    placeholder="e.g., To Be Billed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery At</label>
                  <Input
                    {...register('deliveryAt')}
                    error={errors.deliveryAt?.message}
                    placeholder="e.g., Door Delivery"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN No./TRIP NO</label>
                  <Input
                    {...register('cnNo')}
                    error={errors.cnNo?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN Date</label>
                  <Input
                    type="date"
                    {...register('cnDate')}
                    error={errors.cnDate?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN Time</label>
                  <Input
                    type="time"
                    {...register('cnTime')}
                    error={errors.cnTime?.message}
                  />
                </div>
              </div>
            </section>

            {/* Party / Consignor Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Party / Consignor Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consignor</label>
                  <Input
                    {...register('consignor')}
                    error={errors.consignor?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charged Party</label>
                  <Input
                    {...register('chargedParty')}
                    error={errors.chargedParty?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consignee Name</label>
                  <Input
                    {...register('consigneeName')}
                    error={errors.consigneeName?.message}
                  />
                </div>
              </div>
            </section>

            {/* Transport Route Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Transport Route Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Station</label>
                  <Input
                    {...register('fromStation')}
                    error={errors.fromStation?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Station</label>
                  <Input
                    {...register('toStation')}
                    error={errors.toStation?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Slab</label>
                  <Input
                    {...register('partySlab')}
                    error={errors.partySlab?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance/Km</label>
                  <Input
                    {...register('distanceKm')}
                    error={errors.distanceKm?.message}
                  />
                </div>
              </div>
            </section>

            {/* Invoice / Billing Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Invoice / Billing Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Bill No / Date</label>
                  <Input
                    {...register('partyBillNo')}
                    error={errors.partyBillNo?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Bill Date</label>
                  <Input
                    type="date"
                    {...register('partyBillDate')}
                    error={errors.partyBillDate?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Inv. Value</label>
                  <Input
                    {...register('netInvValue')}
                    error={errors.netInvValue?.message}
                  />
                </div>
              </div>
            </section>

            {/* Vehicle / Transport Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Vehicle / Transport Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Truck/Lorry No</label>
                  <Input
                    {...register('truckLorryNo')}
                    error={errors.truckLorryNo?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Truck</label>
                  <Input
                    {...register('agentTruck')}
                    error={errors.agentTruck?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <Input
                    {...register('capacity')}
                    error={errors.capacity?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Input
                    {...register('vehicleType')}
                    error={errors.vehicleType?.message}
                    placeholder="e.g., 32 ft"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comm</label>
                  <Input
                    {...register('comm')}
                    error={errors.comm?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                  <Input
                    {...register('rate')}
                    error={errors.rate?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Freight</label>
                  <Input
                    {...register('freight')}
                    error={errors.freight?.message}
                  />
                </div>
              </div>
            </section>

            {/* Package / Goods Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Package / Goods Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                  <Input
                    {...register('package')}
                    error={errors.package?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Pkg</label>
                  <Input
                    {...register('typeOfPkg')}
                    error={errors.typeOfPkg?.message}
                    placeholder="e.g., BOX"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goods Description</label>
                  <Input
                    {...register('goodsDescription')}
                    error={errors.goodsDescription?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual WT</label>
                  <Input
                    {...register('actualWt')}
                    error={errors.actualWt?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charged WT</label>
                  <Input
                    {...register('chargedWt')}
                    error={errors.chargedWt?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <Input
                    {...register('unit')}
                    error={errors.unit?.message}
                  />
                </div>
              </div>
            </section>

            {/* Charges Section */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Charges Section</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loading Chg</label>
                  <Input
                    {...register('loadingChg')}
                    error={errors.loadingChg?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UnLoading Chg</label>
                  <Input
                    {...register('unloadingChg')}
                    error={errors.unloadingChg?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">P. Marka / AWB / GR</label>
                  <Input
                    {...register('pMarkaAwbGr')}
                    error={errors.pMarkaAwbGr?.message}
                  />
                </div>
              </div>
            </section>

            {/* GST Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">GST Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Paid By</label>
                <select
                  {...register('gstPaidBy')}
                  className="w-full px-3 py-2 border rounded-md border-gray-300"
                >
                  <option value="">Select...</option>
                  <option value="Consignor">Consignor</option>
                  <option value="Consignee">Consignee</option>
                  <option value="Goods Transporter">Goods Transporter</option>
                  <option value="None">None</option>
                </select>
                {errors.gstPaidBy?.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.gstPaidBy?.message}</p>
                )}
              </div>
            </section>

            {/* Accounts / Payment */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Accounts / Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">A/C</label>
                  <Input
                    {...register('account')}
                    error={errors.account?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Freight</label>
                  <Input
                    {...register('basicFreight')}
                    error={errors.basicFreight?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Freight</label>
                  <Input
                    {...register('totalFreight')}
                    error={errors.totalFreight?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
                  <Input
                    {...register('gst')}
                    error={errors.gst?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Date</label>
                  <Input
                    type="date"
                    {...register('advanceDate')}
                    error={errors.advanceDate?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EWAY Date</label>
                  <Input
                    type="date"
                    {...register('ewayDate')}
                    error={errors.ewayDate?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Payable</label>
                  <Input
                    {...register('netPayable')}
                    error={errors.netPayable?.message}
                  />
                </div>
              </div>
            </section>

            {/* Additional Fields */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Additional Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Station UP</label>
                  <Input
                    {...register('fromStationUp')}
                    error={errors.fromStationUp?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Station UP</label>
                  <Input
                    {...register('toStationUp')}
                    error={errors.toStationUp?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <Input
                    {...register('driverName')}
                    error={errors.driverName?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO No.</label>
                  <Input
                    {...register('poNo')}
                    error={errors.poNo?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipment ID</label>
                  <Input
                    {...register('shipmentId')}
                    error={errors.shipmentId?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GR Photo URL</label>
                  <Input
                    {...register('grPhotoUrl')}
                    error={errors.grPhotoUrl?.message}
                    placeholder="Upload photo and paste URL"
                  />
                </div>
              </div>
            </section>

            {/* GR/Bilty Images Section */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">GR/Bilty Images</h3>
              <ImageUpload
                images={grBiltyImages}
                onImagesChange={setGrBiltyImages}
                maxImages={5}
                label="Upload GR/Bilty Images"
              />
            </section>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (isEditing ? 'Update GR' : 'Add GR')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
