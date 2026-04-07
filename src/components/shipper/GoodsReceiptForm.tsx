'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import { goodsReceiptApi } from '@/lib/api-client';
import { CreateGoodsReceiptDto } from '@/types/goods-receipt';

interface Trip {
  id: string;
  tripNo: string;
  vehicleNumber: string;
  date: string;
  fromLocation: string;
  toLocation: string;
}

interface Props {
  trip: Trip;
  onComplete: () => void;
}

export default function GoodsReceiptForm({ trip, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [grBiltyImages, setGrBiltyImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<CreateGoodsReceiptDto>>({
    tripId: trip.id,
    cnNo: trip.tripNo,
    cnDate: new Date().toISOString().split('T')[0],
    cnTime: new Date().toLocaleTimeString(),
    // Shipper-side UI should match Admin's "Essential Invoice Fields"
    // (detention + labour/other charges are mandatory for creating GR)
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
      const submitData: CreateGoodsReceiptDto = {
        ...formData,
        shipperId: user.id,
        grBiltyImages: grBiltyImages,
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

      {/* Consignment Basic Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Consignment Basic Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch Name *</label>
            <Input
              value={formData.branchName || ''}
              onChange={(e) => handleInputChange('branchName', e.target.value)}
              required
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

      {/* Party / Consignor Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Party / Consignor Details</h3>
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

      {/* Transport Route Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Transport Route Details</h3>
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

      {/* Invoice / Billing Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Invoice / Billing Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Party Bill No / Date *</label>
            <Input
              value={formData.partyBillNo || ''}
              onChange={(e) => handleInputChange('partyBillNo', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Party Bill Date</label>
            <Input
              type="date"
              value={formData.partyBillDate || ''}
              onChange={(e) => handleInputChange('partyBillDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Net Inv. Value</label>
            <Input
              value={formData.netInvValue || ''}
              onChange={(e) => handleInputChange('netInvValue', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Vehicle / Transport Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Vehicle / Transport Details</h3>
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
            <label className="block text-sm font-medium mb-1">Freight *</label>
            <Input
              value={formData.freight || ''}
              onChange={(e) => handleInputChange('freight', e.target.value)}
              required
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

      {/* Package / Goods Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Package / Goods Details</h3>
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

      {/* Charges Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Charges Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Loading Chg</label>
            <Input
              value={formData.loadingChg || ''}
              onChange={(e) => handleInputChange('loadingChg', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">UnLoading Chg</label>
            <Input
              value={formData.unloadingChg || ''}
              onChange={(e) => handleInputChange('unloadingChg', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">P. Marka / AWB / GR</label>
            <Input
              value={formData.pMarkaAwbGr || ''}
              onChange={(e) => handleInputChange('pMarkaAwbGr', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* GST Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">GST Details</h3>
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

      {/* Accounts / Payment */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Accounts / Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">A/C *</label>
            <Input
              value={formData.account || ''}
              onChange={(e) => handleInputChange('account', e.target.value)}
              placeholder="e.g., CASH"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Basic Freight</label>
            <Input
              value={formData.basicFreight || ''}
              onChange={(e) => handleInputChange('basicFreight', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Freight</label>
            <Input
              value={formData.totalFreight || ''}
              onChange={(e) => handleInputChange('totalFreight', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GST</label>
            <Input
              value={formData.gst || ''}
              onChange={(e) => handleInputChange('gst', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Advance Date</label>
            <Input
              type="date"
              value={formData.advanceDate || ''}
              onChange={(e) => handleInputChange('advanceDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">EWAY Date</label>
            <Input
              type="date"
              value={formData.ewayDate || ''}
              onChange={(e) => handleInputChange('ewayDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Net Payable</label>
            <Input
              value={formData.netPayable || ''}
              onChange={(e) => handleInputChange('netPayable', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Additional Fields */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Additional Fields</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Station UP</label>
            <Input
              value={formData.fromStationUp || ''}
              onChange={(e) => handleInputChange('fromStationUp', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Station UP</label>
            <Input
              value={formData.toStationUp || ''}
              onChange={(e) => handleInputChange('toStationUp', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Driver Name</label>
            <Input
              value={formData.driverName || ''}
              onChange={(e) => handleInputChange('driverName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PO No.</label>
            <Input
              value={formData.poNo || ''}
              onChange={(e) => handleInputChange('poNo', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shipment ID</label>
            <Input
              value={formData.shipmentId || ''}
              onChange={(e) => handleInputChange('shipmentId', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GR Photo URL</label>
            <Input
              value={formData.grPhotoUrl || ''}
              onChange={(e) => handleInputChange('grPhotoUrl', e.target.value)}
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

      <div className="flex gap-4 pt-6">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Submitting...' : 'Submit Goods Receipt'}
        </Button>
      </div>
    </form>
  );
}
