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
  grNo: z.string().optional(),
  cnDate: z.string().optional(),
  fromStation: z.string().optional(),
  toStation: z.string().optional(),
  truckLorryNo: z.string().optional(),
  package: z.string().optional(),
  detentionLoading: z.string().optional(),
  detentionUL: z.string().optional(),
  toll: z.string().optional(),
  labourCharges: z.string().optional(),
  otherCharges: z.string().optional(),
  branchName: z.string().optional(),
  ewayDate: z.string().optional(),
  billedAtBranch: z.string().optional(),
  cnType: z.string().optional(),
  deliveryAt: z.string().optional(),
  cnNo: z.string().optional(),
  cnTime: z.string().optional(),
  consignor: z.string().optional(),
  chargedParty: z.string().optional(),
  consigneeName: z.string().optional(),
  partySlab: z.string().optional(),
  distanceKm: z.string().optional(),
  netInvValue: z.string().optional(),
  agentTruck: z.string().optional(),
  capacity: z.string().optional(),
  vehicleType: z.string().optional(),
  comm: z.string().optional(),
  rate: z.string().optional(),
  typeOfPkg: z.string().optional(),
  goodsDescription: z.string().optional(),
  actualWt: z.string().optional(),
  chargedWt: z.string().optional(),
  unit: z.string().optional(),
  gstPaidBy: z.string().optional(),
});

type GRData = z.infer<typeof grSchema>;

interface GREditModalProps {
  trip: any;
  existingGR?: any;
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

const DATE_FIELDS: (keyof GRData)[] = ['cnDate', 'ewayDate'];

const toInputDateValue = (value: unknown): string => {
  if (!value || typeof value !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

const formatTripMoney = (n: unknown) => {
  if (n === null || n === undefined || n === '') return '—';
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatTripBillDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = iso.split('T')[0];
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return '—';
  return `${day}/${m}/${y}`;
};

const normalizeDefaultValues = (existingGR: any, trip: any): Partial<GRData> => {
  const branchEway: Partial<GRData> = {
    branchName: trip.branchName ?? '',
    ewayDate: toInputDateValue(trip.ewayDate),
  };

  if (!existingGR) {
    return {
      cnNo: trip.tripNo,
      cnDate: new Date().toISOString().split('T')[0],
      cnTime: new Date().toLocaleTimeString(),
      truckLorryNo: trip.vehicleNumber,
      agentTruck: trip.vehicleNumber,
      fromStation: trip.fromLocation,
      toStation: trip.toLocation,
      gstPaidBy: 'Consignor',
      ...branchEway,
    };
  }

  const normalized = Object.entries(existingGR).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key] = value ?? '';
    return acc;
  }, {});

  DATE_FIELDS.forEach((field) => {
    normalized[field] = toInputDateValue(normalized[field]);
  });

  return {
    ...(normalized as Partial<GRData>),
    ...branchEway,
  };
};

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
    defaultValues: normalizeDefaultValues(existingGR, trip),
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

      let shipperId = null;
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        shipperId = tokenPayload.sub;
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
        delete (submitData as any).id;
        delete (submitData as any).createdAt;
        delete (submitData as any).updatedAt;
        delete (submitData as any).trip;
      }

      const cleanedSubmitData = Object.entries(submitData).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          if (value === undefined || value === null) return acc;
          if (typeof value === 'string' && value.trim() === '') return acc;
          if (Array.isArray(value) && value.length === 0) return acc;
          acc[key] = value;
          return acc;
        },
        {},
      );

      if (isEditing) {
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${existingGR.id}`,
          cleanedSubmitData,
          { headers },
        );
        toast.success('GR details updated successfully!');
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/goods-receipt`, cleanedSubmitData, { headers });
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-2 sm:px-4 py-3 sm:py-6 flex items-start justify-center">
      <div className="relative mx-auto p-4 sm:p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90dvh] sm:max-h-[95vh] overflow-y-auto">
        <div className="mt-0 sm:mt-1">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4 w-full">
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
                  title="Back to GR details"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                  {isEditing ? 'Edit GR Details' : 'Add GR Details'} - Trip {trip.tripNo}
                </h3>
                <p className="text-sm text-gray-500">
                  Freight and bill date are stored on the trip; branch and e-way update the trip when you save.
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-500 shrink-0 p-1">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-lg font-bold text-blue-900 border-b border-blue-200 pb-2">Essential fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Branch</label>
                  <Input
                    {...register('branchName')}
                    error={errors.branchName?.message}
                    className="border-blue-300 focus:ring-blue-500"
                    placeholder="Branch"
                  />
                  <p className="mt-1 text-xs text-blue-800/80">Saved on the trip (single source).</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">E-way date</label>
                  <Input
                    type="date"
                    {...register('ewayDate')}
                    error={errors.ewayDate?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-blue-800/80">Saved on the trip.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Freight (from trip)</label>
                  <div className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900">
                    {formatTripMoney(trip.freight)}
                  </div>
                  <p className="mt-1 text-xs text-blue-800/80">Edit under Trip details → Financial.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Bill date (from trip)</label>
                  <div className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900">
                    {formatTripBillDate(trip.billDate)}
                  </div>
                  <p className="mt-1 text-xs text-blue-800/80">Same as party bill date; edit on Trip details.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">GR No.</label>
                  <Input
                    {...register('grNo')}
                    error={errors.grNo?.message}
                    className="border-blue-300 focus:ring-blue-500"
                    placeholder="GR Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <Input
                    type="date"
                    {...register('cnDate')}
                    error={errors.cnDate?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">From Station</label>
                  <Input
                    {...register('fromStation')}
                    error={errors.fromStation?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">To Station</label>
                  <Input
                    {...register('toStation')}
                    error={errors.toStation?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle No</label>
                  <Input
                    {...register('truckLorryNo')}
                    error={errors.truckLorryNo?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">No. of Boxes</label>
                  <Input
                    {...register('package')}
                    error={errors.package?.message}
                    className="border-blue-300 focus:ring-blue-500"
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Detention Loading</label>
                  <Input
                    {...register('detentionLoading')}
                    error={errors.detentionLoading?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Detention U/L</label>
                  <Input
                    {...register('detentionUL')}
                    error={errors.detentionUL?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Toll</label>
                  <Input
                    {...register('toll')}
                    error={errors.toll?.message}
                    className="border-blue-300 focus:ring-blue-500"
                    placeholder="Toll charges"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Labour Charges</label>
                  <Input
                    {...register('labourCharges')}
                    error={errors.labourCharges?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Other Charges</label>
                  <Input
                    {...register('otherCharges')}
                    error={errors.otherCharges?.message}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Consignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billed At Branch</label>
                  <Input {...register('billedAtBranch')} error={errors.billedAtBranch?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN Type</label>
                  <Input {...register('cnType')} error={errors.cnType?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery At</label>
                  <Input {...register('deliveryAt')} error={errors.deliveryAt?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CN No</label>
                  <Input {...register('cnNo')} error={errors.cnNo?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <Input {...register('cnTime')} error={errors.cnTime?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Party / Consignor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consignor</label>
                  <Input {...register('consignor')} error={errors.consignor?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charged Party</label>
                  <Input {...register('chargedParty')} error={errors.chargedParty?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consignee Name</label>
                  <Input {...register('consigneeName')} error={errors.consigneeName?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Transport route</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Slab</label>
                  <Input {...register('partySlab')} error={errors.partySlab?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance/Km</label>
                  <Input {...register('distanceKm')} error={errors.distanceKm?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Invoice</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Inv. Value</label>
                  <Input {...register('netInvValue')} error={errors.netInvValue?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Vehicle / transport</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Truck</label>
                  <Input {...register('agentTruck')} error={errors.agentTruck?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <Input {...register('capacity')} error={errors.capacity?.message} />
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
                  <Input {...register('comm')} error={errors.comm?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                  <Input {...register('rate')} error={errors.rate?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Package / goods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Input {...register('goodsDescription')} error={errors.goodsDescription?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual WT</label>
                  <Input {...register('actualWt')} error={errors.actualWt?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charged WT</label>
                  <Input {...register('chargedWt')} error={errors.chargedWt?.message} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <Input {...register('unit')} error={errors.unit?.message} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">GST</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Paid By</label>
                <select {...register('gstPaidBy')} className="w-full px-3 py-2 border rounded-md border-gray-300">
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
                {isLoading ? 'Saving...' : isEditing ? 'Update GR' : 'Add GR'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
