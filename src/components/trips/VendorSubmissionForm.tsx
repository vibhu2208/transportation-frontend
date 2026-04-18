'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VehicleAutocomplete } from '@/components/ui/VehicleAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { partiesApi } from '@/modules/parties/api';
import { Party, PartyBranch } from '@/modules/parties/types';
import { Search, X } from 'lucide-react';
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
      partyBranchId: z.string().optional(),
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
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const partyComboboxRef = useRef<HTMLDivElement>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [partyBranches, setPartyBranches] = useState<PartyBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

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
      partyBranchId: '',
    },
  });
  const partyNameValue = watch('partyName') ?? '';
  const selectedPartyName = partyNameValue.trim();
  const isMarketParty = selectedPartyName.toLowerCase().includes('market');

  const partySuggestions = useMemo(() => {
    if (parties.length === 0) return [];
    const q = partyNameValue.trim().toLowerCase();
    const sorted = [...parties].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted.slice(0, 40);
    return sorted.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [parties, partyNameValue]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (partyComboboxRef.current && !partyComboboxRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!selectedPartyId) {
      setPartyBranches([]);
      setValue('partyBranchId', '', { shouldValidate: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBranches(true);
      try {
        const branches = await partiesApi.listPartyBranches(selectedPartyId);
        if (cancelled) return;
        const active = branches.filter((b) => b.isActive);
        setPartyBranches(active);
        if (active.length === 1) {
          setValue('partyBranchId', active[0].id, { shouldValidate: true });
        } else {
          setValue('partyBranchId', '', { shouldValidate: false });
        }
      } catch (e) {
        console.error('VendorSubmissionForm: branches load failed', e);
        setPartyBranches([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPartyId, setValue]);
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
      if (selectedPartyId && partyBranches.length > 1 && !(data.partyBranchId ?? '').trim()) {
        toast.error('Select a billing branch for this party');
        setIsLoading(false);
        return;
      }
      const payload: Record<string, unknown> = { ...data };
      if (!data.partyBranchId?.trim()) {
        delete payload.partyBranchId;
      }
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
      reset({
        date: new Date().toISOString().split('T')[0],
        vendorId: forAdmin ? defaultVendor?.id ?? '' : '',
        partyName: '',
        partyBranchId: '',
        fromLocation: '',
        toLocation: '',
        vehicleNumber: '',
        initialExpense: undefined,
        advance: undefined,
        freight: undefined,
        remarks: '',
        ewayBillNumber: '',
        ewayDate: '',
      });
      setSelectedPartyId(null);
      setPartyBranches([]);
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
            <div ref={partyComboboxRef} className="relative min-w-0">
              <Controller
                name="partyName"
                control={control}
                render={({ field }) => (
                  <>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-center text-muted-foreground"
                        aria-hidden
                      >
                        <Search className="h-4 w-4 shrink-0" />
                      </span>
                      <Input
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v);
                          setPartyDropdownOpen(true);
                          const match = selectedPartyId
                            ? parties.find((p) => p.id === selectedPartyId)
                            : undefined;
                          if (match && v.trim() !== match.name) {
                            setSelectedPartyId(null);
                            setValue('partyBranchId', '', { shouldValidate: false });
                          }
                        }}
                        onBlur={() => {
                          field.onBlur();
                          const t = (field.value ?? '').trim();
                          const exact = parties.find((p) => p.name === t);
                          if (exact) {
                            setSelectedPartyId(exact.id);
                          } else if (!t) {
                            setSelectedPartyId(null);
                            setValue('partyBranchId', '', { shouldValidate: false });
                          }
                          setPartyDropdownOpen(false);
                        }}
                        onFocus={() => setPartyDropdownOpen(true)}
                        placeholder={
                          parties.length > 0
                            ? 'Type to search or pick from the list…'
                            : 'Type party name'
                        }
                        autoComplete="off"
                        className={`${controlClass} pl-9 pr-10 ${errors.partyName ? 'border-destructive' : ''}`}
                      />
                      {(field.value ?? '').trim() ? (
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                          aria-label="Clear party"
                          onClick={() => {
                            field.onChange('');
                            setSelectedPartyId(null);
                            setValue('partyBranchId', '', { shouldValidate: false });
                            setPartyDropdownOpen(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                      {partyDropdownOpen && parties.length > 0 && (
                        <ul
                          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-slate-900 shadow-lg ring-1 ring-black/5"
                          role="listbox"
                        >
                          {partySuggestions.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm text-slate-500">No matching parties.</li>
                          ) : (
                            partySuggestions.map((party) => (
                              <li key={party.id} role="option">
                                <button
                                  type="button"
                                  className="flex w-full px-3 py-2.5 text-left text-sm text-slate-900 transition-colors hover:bg-emerald-50/90"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    field.onChange(party.name);
                                    setSelectedPartyId(party.id);
                                    setPartyDropdownOpen(false);
                                  }}
                                >
                                  {party.name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              />
              {errors.partyName && (
                <p className="mt-1 text-sm text-destructive">{errors.partyName.message}</p>
              )}
              {parties.length === 0 && !isLoading && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No parties in master. Type the name manually; it will still be saved on the trip.
                </p>
              )}
              {parties.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Search by typing; click a row to select a master party.</p>
              )}
            </div>
          </div>

          {selectedPartyId && (
            <div>
              <label className={labelClass}>
                Billing branch {partyBranches.length > 1 ? '*' : ''}
              </label>
              {loadingBranches ? (
                <p className={`text-sm text-muted-foreground ${controlClass}`}>Loading branches…</p>
              ) : partyBranches.length === 0 ? (
                <p className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                  No active billing branches for this party yet. Trip will use party name only until a branch is added.
                </p>
              ) : partyBranches.length === 1 ? (
                <>
                  <p className={`rounded-md border border-input bg-muted/40 px-3 py-2 text-sm ${controlClass}`}>
                    {partyBranches[0].locationLabel?.trim()
                      ? `${partyBranches[0].locationLabel.trim()} — ${partyBranches[0].fullLedgerName}`
                      : partyBranches[0].fullLedgerName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Single branch — linked automatically for invoicing.
                  </p>
                </>
              ) : (
                <>
                  <Controller
                    name="partyBranchId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <SelectTrigger
                          className={`${controlClass} ${errors.partyBranchId ? 'border-destructive' : ''}`}
                        >
                          <SelectValue placeholder="Select billing branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {partyBranches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.locationLabel?.trim()
                                ? `${b.locationLabel.trim()} — ${b.fullLedgerName}`
                                : b.fullLedgerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose the ledger branch for invoices and GST.
                  </p>
                </>
              )}
            </div>
          )}

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
