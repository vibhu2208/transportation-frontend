'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ImageUpload from '@/components/ui/ImageUpload';
import { goodsReceiptApi } from '@/lib/api-client';
import type { CreateGoodsReceiptDto } from '@/types/goods-receipt';
import { GR_INVOICE_UI_UNLOCK_PASSCODE } from '@/lib/gr-invoice-ui-lock';
import { GrInvoiceUnlockOverlay } from '@/components/trips/GrInvoiceUnlockOverlay';

interface Trip {
  id: string;
  tripNo: string;
  vehicleNumber: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  freight?: number | null;
  ewayBillNumber?: string | null;
  ewayDate?: string | null;
  /** When set, GR form is UI-locked until passcode is entered */
  invoiceId?: string | null;
}

interface Props {
  trip: Trip;
  onComplete: () => void;
  /** Called when user leaves the unlock dialog without entering the passcode (optional) */
  onCancel?: () => void;
}

/** UI-only e-way fields; submitted as `tripEwaySync`, not as GR columns. */
type GoodsReceiptFormState = Partial<CreateGoodsReceiptDto> & {
  ewayBillNumber?: string;
  ewayDate?: string;
};

const toIsoDate = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const ddmmyyyyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!ddmmyyyyMatch) return '';

  const [, dd, mm, yyyy] = ddmmyyyyMatch;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const parsed = new Date(year, month - 1, day);
  const isValid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isValid ? `${yyyy}-${mm}-${dd}` : '';
};

const toEwayDateInput = (value: string | null | undefined): string => {
  if (!value) return '';
  const day = String(value).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

export default function GoodsReceiptForm({ trip, onComplete, onCancel }: Props) {
  const draftStorageKey = useMemo(() => `gr_draft_goods_receipt_form_${trip.id}`, [trip.id]);
  const tripInvoiced = Boolean(trip.invoiceId);
  const [invoiceLockPasscode, setInvoiceLockPasscode] = useState('');
  const [invoiceLockUnlocked, setInvoiceLockUnlocked] = useState(false);
  const formLockedByInvoice = tripInvoiced && !invoiceLockUnlocked;

  useEffect(() => {
    setInvoiceLockUnlocked(false);
    setInvoiceLockPasscode('');
  }, [trip.id, trip.invoiceId]);

  const [loading, setLoading] = useState(false);
  const [grBiltyImages, setGrBiltyImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<GoodsReceiptFormState>({
    tripId: trip.id,
    branchId: '',
    grDate: '',
    cnTime: '',
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
    ewayBillNumber: trip.ewayBillNumber?.trim() || '',
    ewayDate: toEwayDateInput(trip.ewayDate ?? undefined),
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (!rawDraft) return;
      const parsedDraft = JSON.parse(rawDraft) as {
        formData?: GoodsReceiptFormState;
        grBiltyImages?: string[];
      };
      if (parsedDraft.formData) {
        setFormData((prev) => ({ ...prev, ...parsedDraft.formData, tripId: trip.id }));
      }
      if (Array.isArray(parsedDraft.grBiltyImages)) {
        setGrBiltyImages(parsedDraft.grBiltyImages);
      }
    } catch {
      // Ignore malformed local drafts.
    }
  }, [draftStorageKey, trip.id]);

  useEffect(() => {
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          formData,
          grBiltyImages,
        }),
      );
    } catch {
      // Ignore storage errors to avoid blocking form usage.
    }
  }, [draftStorageKey, formData, grBiltyImages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formLockedByInvoice) {
      toast.error('This trip is invoiced. Unlock with the passcode dialog to submit a GR.');
      return;
    }

    const userData = localStorage.getItem('user_data');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      alert('User not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const normalizedGrDate = toIsoDate(String(formData.grDate || ''));
      const ewayDay = String(formData.ewayDate || '').trim();
      const { ewayBillNumber: _eBill, ewayDate: _eDate, ...formRest } = formData as Record<string, unknown>;
      const submitData = {
        ...formRest,
        grDate: normalizedGrDate || undefined,
        shipperId: user.id,
        grBiltyImages,
        tripEwaySync: {
          billNumber: (formData.ewayBillNumber || '').trim(),
          date: ewayDay || '',
        },
      } as CreateGoodsReceiptDto;

      await goodsReceiptApi.create(submitData);
      localStorage.removeItem(draftStorageKey);
      onComplete();
    } catch (error: any) {
      console.error('Failed to submit GR:', error);
      alert(error.response?.data?.message || 'Failed to submit Goods Receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GrInvoiceUnlockOverlay
        open={tripInvoiced && !invoiceLockUnlocked}
        passcode={invoiceLockPasscode}
        onPasscodeChange={setInvoiceLockPasscode}
        onUnlock={() => {
          if (invoiceLockPasscode.trim() === GR_INVOICE_UI_UNLOCK_PASSCODE) {
            setInvoiceLockUnlocked(true);
            setInvoiceLockPasscode('');
            toast.success('GR entry unlocked');
          } else {
            toast.error('Incorrect passcode');
          }
        }}
        onCancel={() => onCancel?.()}
        unlockButtonLabel="Unlock form"
        cancelButtonLabel="Cancel"
        subtitle="This trip already has an invoice. Enter the passcode to fill and submit this goods receipt."
      />

      <form onSubmit={handleSubmit} className="relative space-y-6 rounded-lg bg-white p-6 shadow">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Goods Receipt Form</h2>
          <p className="mt-1 text-sm text-gray-600">Trip prefill is optional. All fields are editable.</p>
        </div>
        {tripInvoiced && invoiceLockUnlocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/90">
            Editing unlocked
          </span>
        )}
        </div>

        <fieldset disabled={formLockedByInvoice} className="m-0 space-y-6 border-0 p-0">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Consignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch *</label>
            <Input
              value={formData.branchId || ''}
              onChange={(e) => handleInputChange('branchId', e.target.value)}
              placeholder="Enter branch id"
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
              type="text"
              value={formData.grDate || ''}
              onChange={(e) => handleInputChange('grDate', e.target.value)}
              placeholder="dd/mm/yyyy"
              pattern="\d{2}/\d{2}/\d{4}"
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
          <div>
            <label className="block text-sm font-medium mb-1">E-way bill number (optional)</label>
            <Input
              value={formData.ewayBillNumber || ''}
              onChange={(e) => handleInputChange('ewayBillNumber', e.target.value)}
              placeholder="Prefilled from trip when available"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-way date (optional)</label>
            <Input
              type="date"
              value={formData.ewayDate || ''}
              onChange={(e) => handleInputChange('ewayDate', e.target.value)}
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
        <Button type="submit" disabled={loading || formLockedByInvoice} className="flex-1">
          {loading ? 'Submitting...' : 'Submit Goods Receipt'}
        </Button>
      </div>
      </fieldset>
    </form>
    </>
  );
}
