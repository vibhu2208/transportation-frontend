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

function buildVendorSubmissionSchema(forAdmin: boolean) {
  return z
    .object({
      vendorId: z.string().optional(),
      date: z.string().min(1, 'Date is required'),
      partyName: z.string().min(1, 'Party name is required'),
      fromLocation: z.string().min(1, 'From location is required'),
      toLocation: z.string().min(1, 'To location is required'),
      vehicleNumber: z.string().min(1, 'Vehicle number is required'),
      initialExpense: z.number().optional(),
      advance: z.number().optional(),
      remarks: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (forAdmin && !data.vendorId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vendor is required',
          path: ['vendorId'],
        });
      }
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
  const [vendorsLoading, setVendorsLoading] = useState(false);

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
      setVendorsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await api.get<VendorOption[]>('/vendors', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendors(res.data ?? []);
      } catch (e) {
        console.error('VendorSubmissionForm: failed to load vendors', e);
      } finally {
        setVendorsLoading(false);
      }
    };
    loadVendors();
  }, [forAdmin]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<VendorSubmissionData>({
    resolver: zodResolver(buildVendorSubmissionSchema(forAdmin)),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vendorId: '',
    },
  });

  const onSubmit = async (data: VendorSubmissionData) => {
    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = { ...data };
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

  return (
    <div className={shellClass}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Submit Trip Booking</h2>
        <p className="text-muted-foreground">Enter the basic trip details. Operations and billing information will be added later by the admin team.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forAdmin && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Vendor *
              </label>
              {vendors.length > 0 ? (
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.vendorId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Input
                  {...register('vendorId')}
                  error={errors.vendorId?.message}
                  placeholder="Vendor ID"
                />
              )}
              {errors.vendorId && (
                <p className="mt-1 text-sm text-destructive">{errors.vendorId.message}</p>
              )}
              {vendors.length === 0 && !vendorsLoading && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No vendors loaded. Enter vendor ID manually or check Settings → Vendors.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date *
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Party Name *
            </label>
            {parties.length > 0 ? (
              <Controller
                name="partyName"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.partyName ? 'border-destructive' : ''}>
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
            <label className="block text-sm font-medium text-foreground mb-2">
              From Location *
            </label>
            <Input
              {...register('fromLocation')}
              error={errors.fromLocation?.message}
              placeholder="Starting location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              To Location *
            </label>
            <Input
              {...register('toLocation')}
              error={errors.toLocation?.message}
              placeholder="Destination location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Initial Expense
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('initialExpense', { valueAsNumber: true })}
              error={errors.initialExpense?.message}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Advance
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('advance', { valueAsNumber: true })}
              error={errors.advance?.message}
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Remarks
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Any additional notes or remarks"
            />
            {errors.remarks && (
              <p className="mt-1 text-sm text-destructive">{errors.remarks.message}</p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Information
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  After submission, the operations team will add BR No, GR/LR No, and toll expenses. 
                  The accounts team will then add freight and billing information to complete the trip record.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
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
