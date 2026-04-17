'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VehicleAutocomplete } from '@/components/ui/VehicleAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { partiesApi } from '@/modules/parties/api';
import { Party } from '@/modules/parties/types';
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

function buildVendorSubmissionSchema(forAdmin: boolean) {
  return z
    .object({
      vendorId: z.string().optional(),
      date: z.string().min(1, 'Date is required'),
      partyName: z.string().min(1, 'Party name is required'),
      fromLocation: z.string().min(1, 'From location is required'),
      toLocation: z.string().min(1, 'To location is required'),
      vehicleNumber: z.string().min(1, 'Vehicle number is required'),
      initialExpense: optionalNumber,
      advance: optionalNumber,
      freight: optionalNumber,
      remarks: z.string().optional(),
      ewayBillNumber: z.string().optional(),
      ewayDate: z.string().optional(),
    })
    .superRefine((_data, _ctx) => {
      // Vendor is auto-assigned for admin submissions.
    });
}

type VendorSubmissionData = z.infer<ReturnType<typeof buildVendorSubmissionSchema>>;

interface VendorOption {
  id: string;
  name: string;
}

interface VendorSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    tripId: string;
    tripNo: string;
    status: string;
  };
}

interface VendorSubmissionFormProps {
  onSave: (response?: VendorSubmissionResponse) => void;
  onCancel: () => void;
  /** Admin: show vendor dropdown and send vendorId to the API. */
  forAdmin?: boolean;
  /** Use inside a modal: drop outer card max-width/padding wrapper. */
  embedded?: boolean;
}

export function VendorSubmissionForm({
  onSave,
  onCancel,
  forAdmin = false,
  embedded = false,
}: VendorSubmissionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        console.log('VendorSubmissionForm: Fetching parties...');
        let data = await partiesApi.getParties();
        console.log('VendorSubmissionForm: Parties received:', data);
        
        if (data.length === 0) {
          console.log('VendorSubmissionForm: No parties found, attempting sync...');
          try {
            await partiesApi.syncParties();
            data = await partiesApi.getParties();
            console.log('VendorSubmissionForm: Parties after sync:', data);
          } catch (syncError) {
            console.error('VendorSubmissionForm: Sync failed:', syncError);
          }
        }
        
        setParties(data);
      } catch (error: any) {
        console.error('VendorSubmissionForm: Error fetching parties:', error);
        if (error.response) {
          console.error('VendorSubmissionForm: Response data:', error.response.data);
          console.error('VendorSubmissionForm: Response status:', error.response.status);
        }
      }
    };
    fetchParties();
  }, []);

  useEffect(() => {
    if (!forAdmin) return;
    const loadVendors = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await api.get<VendorOption[]>('/vendors', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendors(res.data ?? []);
      } catch (e) {
        console.error('VendorSubmissionForm: failed to load vendors', e);
      }
    };
    loadVendors();
  }, [forAdmin]);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<VendorSubmissionData>({
    resolver: zodResolver(buildVendorSubmissionSchema(forAdmin)),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vendorId: '',
    },
  });
  const selectedPartyName = watch('partyName') || '';
  const isMarketParty = selectedPartyName.trim().toLowerCase().includes('market');
  const defaultVendor = vendors.find(
    (v) => v.name.trim().toLowerCase() === 'test transport vendor',
  );

  useEffect(() => {
    if (!forAdmin) return;
    if (defaultVendor?.id) {
      setValue('vendorId', defaultVendor.id, { shouldValidate: false });
    }
  }, [forAdmin, defaultVendor?.id, setValue]);

  const onSubmit = async (data: VendorSubmissionData) => {
    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (forAdmin) {
        const fallbackVendor =
          defaultVendor?.id || vendors.find((v) => v.name.trim().toLowerCase() === 'test transport vendor')?.id;
        if (!fallbackVendor) {
          toast.error('Default vendor "Test Transport Vendor" not found in vendor list');
          return;
        }
        payload.vendorId = fallbackVendor;
      }
      if (!isMarketParty) {
        delete payload.advance;
      }
      if (!forAdmin) {
        delete payload.vendorId;
      }

      const response = await api.post<VendorSubmissionResponse>(
        '/trips/vendor-submission',
        payload
      );
      
      const result = response.data;
      
      toast.success(
        `✅ Trip Submitted Successfully!\nTrip Number: ${result.data.tripNo}`,
        { duration: 4000 }
      );
      
      onSave(result);
      reset();
    } catch (error: any) {
      console.error('Vendor submission error:', error);
      const msg = error.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(detail || 'Failed to submit trip');
    } finally {
      setIsLoading(false);
    }
  };

  const shellClass = embedded
    ? ''
    : 'max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-sm border border-border';
  const wrapperGapClass = embedded ? 'mb-3' : 'mb-6';
  const titleClass = embedded ? 'text-lg font-bold text-foreground mb-0.5' : 'text-2xl font-bold text-foreground mb-2';
  const formGapClass = embedded ? 'space-y-3' : 'space-y-6';
  const gridGapClass = embedded ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-6';
  const labelClass = embedded
    ? 'block text-xs font-semibold text-foreground mb-1'
    : 'block text-sm font-medium text-foreground mb-2';
  const controlClass = embedded ? 'h-9 text-sm' : '';

  return (
    <div className={shellClass}>
      <div className={wrapperGapClass}>
        <h2 className={titleClass}>Submit Trip Booking</h2>
        {!embedded && (
          <p className="text-muted-foreground">Enter the basic trip details. Operations and billing information will be added later by the admin team.</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={formGapClass}>
        <div className={gridGapClass}>
          <div>
            <label className={labelClass}>
              Date *
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
              className={controlClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Party Name *
            </label>
            {parties.length > 0 ? (
              <Controller
                name="partyName"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className={`${controlClass} ${errors.partyName ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select a party" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.name}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input
                {...register('partyName')}
                error={errors.partyName?.message}
                placeholder="Type party name"
                className={controlClass}
              />
            )}
            {errors.partyName && (
              <p className="mt-1 text-sm text-destructive">{errors.partyName.message}</p>
            )}
            {parties.length === 0 && !isLoading && (
              <p className="mt-1 text-xs text-muted-foreground">No parties found. Please type the name manually.</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              From Location *
            </label>
            <Input
              {...register('fromLocation')}
              error={errors.fromLocation?.message}
              placeholder="Starting location"
              className={controlClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              To Location *
            </label>
            <Input
              {...register('toLocation')}
              error={errors.toLocation?.message}
              placeholder="Destination location"
              className={controlClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Vehicle Number *
            </label>
            <Controller
              name="vehicleNumber"
              control={control}
              render={({ field }) => (
                <VehicleAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search vehicle number..."
                  required
                />
              )}
            />
            {errors.vehicleNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicleNumber.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Initial Expense
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('initialExpense', { valueAsNumber: true })}
              error={errors.initialExpense?.message}
              placeholder="0.00"
              className={controlClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Freight
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('freight', { valueAsNumber: true })}
              error={errors.freight?.message}
              placeholder="0.00"
              className={controlClass}
            />
          </div>

          {isMarketParty && (
            <div>
              <label className={labelClass}>
                Advance (Market Party Only)
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('advance', { valueAsNumber: true })}
                error={errors.advance?.message}
                placeholder="0.00"
                className={controlClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              E-way Bill Number
            </label>
            <Input
              {...register('ewayBillNumber')}
              error={errors.ewayBillNumber?.message}
              placeholder="Optional e-way bill no."
              className={controlClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              E-way Expiry Date
            </label>
            <Input
              type="date"
              {...register('ewayDate')}
              error={errors.ewayDate?.message}
              className={controlClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              Remarks
            </label>
            <textarea
              {...register('remarks')}
              rows={embedded ? 2 : 3}
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none ${embedded ? 'h-14' : 'h-20'}`}
              placeholder="Any additional notes or remarks"
            />
            {errors.remarks && (
              <p className="mt-1 text-sm text-destructive">{errors.remarks.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Trip'}
          </Button>
          
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
