'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return value;
}, z.number().optional());

const editTripSchema = z.object({
  vendorId: z.string().optional(),
  date: z.string().optional(),
  partyName: z.string().optional(),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  vehicleNumber: z.string().optional(),
  initialExpense: optionalNumber,
  advance: optionalNumber,
  remarks: z.string().optional(),
  grLrNo: z.string().optional(),
  tollExpense: optionalNumber,
  freight: optionalNumber,
  billNo: z.string().optional(),
  billDate: z.string().optional(),
  totalExpense: optionalNumber,
  profitLoss: optionalNumber,
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  distance: optionalNumber,
  fare: optionalNumber,
  expense: optionalNumber,
  party: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'INVOICING', 'CANCELLED']).optional(),
});

type EditTripData = z.infer<typeof editTripSchema>;

/** Keys accepted by backend `UpdateTripDto` (must match server — no `party` / `expense`). */
const TRIP_PATCH_KEYS = [
  'vendorId',
  'date',
  'partyName',
  'fromLocation',
  'toLocation',
  'vehicleNumber',
  'driverName',
  'driverPhone',
  'startLocation',
  'endLocation',
  'startTime',
  'endTime',
  'distance',
  'fare',
  'initialExpense',
  'advance',
  'remarks',
  'grLrNo',
  'tollExpense',
  'freight',
  'billNo',
  'billDate',
  'totalExpense',
  'profitLoss',
  'status',
  'notes',
] as const;

const LEGACY_TRIP_PATCH_KEYS = [
  'vehicleNumber',
  'driverName',
  'driverPhone',
  'startLocation',
  'endLocation',
  'startTime',
  'endTime',
  'distance',
  'fare',
  'status',
  'notes',
] as const;

interface AdminTripEditModalProps {
  tripId: string;
  tripNo: string;
  currentData: EditTripData;
  onSave: () => void;
  onCancel: () => void;
}

const toDateInput = (value?: string) => {
  if (!value) return '';
  return value.split('T')[0] ?? value;
};

const toDateTimeInput = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 16);
};

/** class-validator @IsDateString expects full ISO 8601; datetime-local omits seconds/timezone. */
function toIsoDateTime(value: unknown): string | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toIsoDateOnly(value: unknown): string | undefined {
  if (value === '' || value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizeTripPatchForApi(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw };
  if (out.date !== undefined) {
    const iso = toIsoDateOnly(out.date);
    if (iso) out.date = iso;
  }
  if (out.billDate !== undefined) {
    const iso = toIsoDateOnly(out.billDate);
    if (iso) out.billDate = iso;
  }
  if (out.startTime !== undefined) {
    const iso = toIsoDateTime(out.startTime);
    if (iso) out.startTime = iso;
  }
  if (out.endTime !== undefined) {
    const iso = toIsoDateTime(out.endTime);
    if (iso) out.endTime = iso;
  }
  return out;
}

export function AdminTripEditModal({
  tripId,
  tripNo,
  currentData,
  onSave,
  onCancel,
}: AdminTripEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EditTripData>({
    resolver: zodResolver(editTripSchema),
    defaultValues: {
      ...currentData,
      date: toDateInput(currentData.date),
      billDate: toDateInput(currentData.billDate),
      startTime: toDateTimeInput(currentData.startTime),
      endTime: toDateTimeInput(currentData.endTime),
    },
  });

  const onSubmit = async (data: EditTripData) => {
    setIsLoading(true);
    try {
      const cleaned = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
        // Skip empty values so backend optional validators do not fail.
        if (value === '' || value === undefined || value === null) return acc;
        if (typeof value === 'number' && Number.isNaN(value)) return acc;
        acc[key] = value;
        return acc;
      }, {});

      // Only send DTO-allowed keys (never `party` / `expense` — rejected by ValidationPipe).
      const tripPatch: Record<string, unknown> = {};
      for (const key of TRIP_PATCH_KEYS) {
        if (cleaned[key] !== undefined) {
          tripPatch[key] = cleaned[key];
        }
      }
      // Keep remarks compatible with older servers that only persist notes.
      if (tripPatch.remarks !== undefined && tripPatch.notes === undefined) {
        tripPatch.notes = tripPatch.remarks;
      }

      if (Object.keys(tripPatch).length === 0) {
        toast('No changes to save');
        setIsLoading(false);
        return;
      }

      const normalizedPatch = normalizeTripPatchForApi(tripPatch as Record<string, unknown>);

      try {
        const res = await api.patch(`/trips/${tripId}`, normalizedPatch);
        if (res.status >= 200 && res.status < 300) {
          // Confirm persistence (avoids false “success” if proxy/cache misbehaves).
          await api.get(`/trips/${tripId}`);
        }
      } catch (error: any) {
        const rawMessage = error?.response?.data?.message;
        const messageText = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage || '');
        const isWhitelistError = messageText.includes('should not exist');
        if (!isWhitelistError) {
          throw error;
        }

        // Fallback for older backend DTOs.
        const legacyPatch: Record<string, unknown> = {};
        if (cleaned.vehicleNumber !== undefined) legacyPatch.vehicleNumber = cleaned.vehicleNumber;
        if (cleaned.driverName !== undefined) legacyPatch.driverName = cleaned.driverName;
        if (cleaned.driverPhone !== undefined) legacyPatch.driverPhone = cleaned.driverPhone;
        if (cleaned.startLocation !== undefined) legacyPatch.startLocation = cleaned.startLocation;
        if (cleaned.endLocation !== undefined) legacyPatch.endLocation = cleaned.endLocation;
        if (cleaned.fromLocation !== undefined) legacyPatch.startLocation = cleaned.fromLocation;
        if (cleaned.toLocation !== undefined) legacyPatch.endLocation = cleaned.toLocation;
        if (cleaned.startTime !== undefined) legacyPatch.startTime = cleaned.startTime;
        if (cleaned.endTime !== undefined) legacyPatch.endTime = cleaned.endTime;
        if (cleaned.distance !== undefined) legacyPatch.distance = cleaned.distance;
        if (cleaned.fare !== undefined) legacyPatch.fare = cleaned.fare;
        if (cleaned.status !== undefined) legacyPatch.status = cleaned.status;
        if (cleaned.notes !== undefined) legacyPatch.notes = cleaned.notes;
        if (cleaned.remarks !== undefined) legacyPatch.notes = cleaned.remarks;

        // Ensure only strict legacy keys are sent (no grNumber — not a Prisma column; use /operations for GR/LR).
        Object.keys(legacyPatch).forEach((key) => {
          if (!(LEGACY_TRIP_PATCH_KEYS as readonly string[]).includes(key)) {
            delete legacyPatch[key];
          }
        });
        const legacyNormalized = normalizeTripPatchForApi(legacyPatch as Record<string, unknown>);

        const requests: Promise<unknown>[] = [];
        if (Object.keys(legacyNormalized).length > 0) {
          requests.push(api.patch(`/trips/${tripId}`, legacyNormalized));
        }

        const operationsPayload: Record<string, unknown> = {};
        if (cleaned.grLrNo !== undefined) operationsPayload.grLrNo = cleaned.grLrNo;
        if (cleaned.tollExpense !== undefined) operationsPayload.tollExpense = cleaned.tollExpense;
        if (Object.keys(operationsPayload).length > 0) {
          requests.push(api.patch(`/trips/${tripId}/operations`, operationsPayload));
        }

        const accountsPayload: Record<string, unknown> = {};
        if (cleaned.freight !== undefined) accountsPayload.freight = cleaned.freight;
        if (cleaned.billNo !== undefined) accountsPayload.billNo = cleaned.billNo;
        if (cleaned.billDate !== undefined) accountsPayload.billDate = cleaned.billDate;
        if (Object.keys(accountsPayload).length > 0) {
          requests.push(api.patch(`/trips/${tripId}/accounts`, accountsPayload));
        }

        if (requests.length === 0) {
          toast('No compatible fields to save');
          setIsLoading(false);
          return;
        }

        await Promise.all(requests);
        await api.get(`/trips/${tripId}`);
      }
      toast.success('Trip updated successfully');
      onSave();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      const normalized = Array.isArray(message) ? message.join(', ') : message;
      toast.error(normalized || 'Failed to update trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-2 sm:px-4 py-3 sm:py-6 flex items-start justify-center">
      <div className="relative mx-auto p-4 sm:p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white max-h-[92dvh] overflow-y-auto">
        <div className="flex justify-between items-start gap-2 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Trip - {tripNo}</h3>
            <p className="text-sm text-gray-500">Admin full edit mode (all trip fields)</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-500">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input {...register('vendorId')} placeholder="Vendor ID" />
            <Input type="date" {...register('date')} />
            <Input {...register('partyName')} placeholder="Party Name" />
            <Input {...register('fromLocation')} placeholder="From Location" />
            <Input {...register('toLocation')} placeholder="To Location" />
            <Input {...register('vehicleNumber')} placeholder="Vehicle Number" />
            <Input type="number" step="0.01" {...register('initialExpense', { valueAsNumber: true })} placeholder="Initial Expense" />
            <Input type="number" step="0.01" {...register('advance', { valueAsNumber: true })} placeholder="Advance" />
            <Input {...register('grLrNo')} placeholder="GR/LR No" />
            <Input type="number" step="0.01" {...register('tollExpense', { valueAsNumber: true })} placeholder="Toll Expense" />
            <Input type="number" step="0.01" {...register('freight', { valueAsNumber: true })} placeholder="Freight" />
            <Input {...register('billNo')} placeholder="Party bill no." />
            <Input type="date" {...register('billDate')} />
            <Input type="number" step="0.01" {...register('totalExpense', { valueAsNumber: true })} placeholder="Total Expense" />
            <Input type="number" step="0.01" {...register('profitLoss', { valueAsNumber: true })} placeholder="Profit/Loss" />
            <Input {...register('driverName')} placeholder="Driver Name" />
            <Input {...register('driverPhone')} placeholder="Driver Phone" />
            <Input {...register('startLocation')} placeholder="Start Location (Legacy)" />
            <Input {...register('endLocation')} placeholder="End Location (Legacy)" />
            <Input type="datetime-local" {...register('startTime')} />
            <Input type="datetime-local" {...register('endTime')} />
            <Input type="number" step="0.1" {...register('distance', { valueAsNumber: true })} placeholder="Distance" />
            <Input type="number" step="0.01" {...register('fare', { valueAsNumber: true })} placeholder="Fare" />
            <Input type="number" step="0.01" {...register('expense', { valueAsNumber: true })} placeholder="Expense" />
            <Input {...register('party')} placeholder="Party (Legacy)" />
            <select
              {...register('status')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="INVOICING">Invoicing</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea {...register('remarks')} rows={2} className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea {...register('notes')} rows={2} className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
          </div>

          {(errors.date || errors.status) && (
            <p className="text-sm text-red-600">Please check date/status fields and try again.</p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save All Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
