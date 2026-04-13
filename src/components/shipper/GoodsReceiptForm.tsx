'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import { goodsReceiptApi } from '@/lib/api-client';
import type { CreateGoodsReceiptDto } from '@/types/goods-receipt';

interface Trip {
  id: string;
  tripNo: string;
  vehicleNumber: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  freight?: number | null;
  branchName?: string | null;
  billDate?: string | null;
  ewayDate?: string | null;
}

interface Props {
  trip: Trip;
  onComplete: () => void;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function GoodsReceiptForm({ trip, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [grBiltyImages, setGrBiltyImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<CreateGoodsReceiptDto>>({
    tripId: trip.id,
    cnNo: trip.tripNo,
    cnDate: new Date().toISOString().split('T')[0],
    cnTime: new Date().toLocaleTimeString(),
    branchName: trip.branchName || '',
    ewayDate: toDateInput(trip.ewayDate),
    grNo: '',
    truckLorryNo: trip.vehicleNumber,
    agentTruck: trip.vehicleNumber,
    fromStation: trip.fromLocation,
    toStation: trip.toLocation,
    detentionLoading: '',
    detentionUL: '',
    toll: '',
    labourCharges: '',
    otherCharges: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem('user_data');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      alert('User not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        shipperId: user.id,
        grBiltyImages,
      } as CreateGoodsReceiptDto;

      await goodsReceiptApi.create(submitData);
      onComplete();
    } catch (error: any) {
      console.error('Failed to submit GR:', error);
      alert(error.response?.data?.message || 'Failed to submit Goods Receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Goods Receipt Form</h2>
      <p className="text-sm text-gray-600 -mt-4 mb-2">
        Freight and bill date are on the trip. Branch and e-way here update the trip when you submit.
      </p>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Trip-linked (read-only)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Freight (trip)</label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {trip.freight != null && trip.freight !== undefined
                ? `₹${Number(trip.freight).toLocaleString('en-IN')}`
                : '—'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bill date (trip)</label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {trip.billDate
                ? new Date(trip.billDate).toLocaleDateString('en-IN')
                : '—'}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Consignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch *</label>
            <Input
              value={formData.branchName || ''}
              onChange={(e) => handleInputChange('branchName', e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-500">Stored on the trip.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-way date</label>
            <Input
              type="date"
              value={formData.ewayDate || ''}
              onChange={(e) => handleInputChange('ewayDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Billed At Branch *</label>
            <Input
              value={formData.billedAtBranch || ''}
              onChange={(e) => handleInputChange('billedAtBranch', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CN Type *</label>
            <Input
              value={formData.cnType || ''}
              onChange={(e) => handleInputChange('cnType', e.target.value)}
              placeholder="e.g., To Be Billed"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Delivery At *</label>
            <Input
              value={formData.deliveryAt || ''}
              onChange={(e) => handleInputChange('deliveryAt', e.target.value)}
              placeholder="e.g., Door Delivery"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GR No. *</label>
            <Input
              value={formData.grNo || ''}
              onChange={(e) => handleInputChange('grNo', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <Input
              type="date"
              value={formData.cnDate || ''}
              onChange={(e) => handleInputChange('cnDate', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time *</label>
            <Input
              type="time"
              value={formData.cnTime || ''}
              onChange={(e) => handleInputChange('cnTime', e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Party</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Consignor *</label>
            <Input
              value={formData.consignor || ''}
              onChange={(e) => handleInputChange('consignor', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Charged Party *</label>
            <Input
              value={formData.chargedParty || ''}
              onChange={(e) => handleInputChange('chargedParty', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Consignee Name *</label>
            <Input
              value={formData.consigneeName || ''}
              onChange={(e) => handleInputChange('consigneeName', e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Route</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Station *</label>
            <Input
              value={formData.fromStation || ''}
              onChange={(e) => handleInputChange('fromStation', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Station *</label>
            <Input
              value={formData.toStation || ''}
              onChange={(e) => handleInputChange('toStation', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Party Slab</label>
            <Input
              value={formData.partySlab || ''}
              onChange={(e) => handleInputChange('partySlab', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Distance/Km</label>
            <Input
              value={formData.distanceKm || ''}
              onChange={(e) => handleInputChange('distanceKm', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Invoice</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Net Inv. Value</label>
          <Input
            value={formData.netInvValue || ''}
            onChange={(e) => handleInputChange('netInvValue', e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Vehicle</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle No *</label>
            <Input
              value={formData.truckLorryNo || ''}
              onChange={(e) => handleInputChange('truckLorryNo', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agent Truck *</label>
            <Input
              value={formData.agentTruck || ''}
              onChange={(e) => handleInputChange('agentTruck', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Capacity</label>
            <Input
              value={formData.capacity || ''}
              onChange={(e) => handleInputChange('capacity', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <Input
              value={formData.vehicleType || ''}
              onChange={(e) => handleInputChange('vehicleType', e.target.value)}
              placeholder="e.g., 32 ft"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comm</label>
            <Input
              value={formData.comm || ''}
              onChange={(e) => handleInputChange('comm', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rate</label>
            <Input
              value={formData.rate || ''}
              onChange={(e) => handleInputChange('rate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Detention Loading *</label>
            <Input
              value={formData.detentionLoading || ''}
              onChange={(e) => handleInputChange('detentionLoading', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Detention U/L *</label>
            <Input
              value={formData.detentionUL || ''}
              onChange={(e) => handleInputChange('detentionUL', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Toll</label>
            <Input
              value={formData.toll || ''}
              onChange={(e) => handleInputChange('toll', e.target.value)}
              placeholder="Toll charges"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Labour Charges *</label>
            <Input
              value={formData.labourCharges || ''}
              onChange={(e) => handleInputChange('labourCharges', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Other Charges *</label>
            <Input
              value={formData.otherCharges || ''}
              onChange={(e) => handleInputChange('otherCharges', e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Package / goods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">No. of Boxes *</label>
            <Input
              value={formData.package || ''}
              onChange={(e) => handleInputChange('package', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type of Pkg *</label>
            <Input
              value={formData.typeOfPkg || ''}
              onChange={(e) => handleInputChange('typeOfPkg', e.target.value)}
              placeholder="e.g., BOX"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Goods Description *</label>
            <Input
              value={formData.goodsDescription || ''}
              onChange={(e) => handleInputChange('goodsDescription', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actual WT</label>
            <Input
              value={formData.actualWt || ''}
              onChange={(e) => handleInputChange('actualWt', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Charged WT</label>
            <Input
              value={formData.chargedWt || ''}
              onChange={(e) => handleInputChange('chargedWt', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <Input
              value={formData.unit || ''}
              onChange={(e) => handleInputChange('unit', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">GST</h3>
        <div>
          <label className="block text-sm font-medium mb-1">GST Paid By *</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={formData.gstPaidBy || ''}
            onChange={(e) => handleInputChange('gstPaidBy', e.target.value)}
            required
          >
            <option value="">Select...</option>
            <option value="Consignor">Consignor</option>
            <option value="Consignee">Consignee</option>
            <option value="Goods Transporter">Goods Transporter</option>
            <option value="None">None</option>
          </select>
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

      <div className="flex gap-4 pt-6">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Submitting...' : 'Submit Goods Receipt'}
        </Button>
      </div>
    </form>
  );
}
