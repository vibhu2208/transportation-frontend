'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VehicleAutocomplete } from '@/components/ui/VehicleAutocomplete';
import ImageUpload from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';
import axios from 'axios';
import { partiesApi } from '@/modules/parties/api';
import { GR_INVOICE_UI_UNLOCK_PASSCODE } from '@/lib/gr-invoice-ui-lock';
import { GrInvoiceUnlockOverlay } from '@/components/trips/GrInvoiceUnlockOverlay';

interface GREditModalProps {
  trip: any;
  existingGR?: any;
  onSave: (savedGr?: any) => void | Promise<void>;
  onCancel: () => void;
  onBack?: () => void;
}

const itemSchema = z.object({
  noOfBoxes: z.string().optional(),
  packageType: z.string().optional(),
  rate: z.string().optional(),
  description: z.string().optional(),
  actualWeight: z.string().optional(),
  chargedWeight: z.string().optional(),
  unit: z.string().optional(),
});

const expenseSchema = z.object({
  expenseType: z.string().optional(),
  amount: z.string().optional(),
  narration: z.string().optional(),
});

const createGrSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  grNo: z.string().min(1, 'GR No / CN No is required'),
  grDate: z.string().optional(),
  cnTime: z.string().optional(),
  fromStation: z.string().min(1, 'From Station is required'),
  toStation: z.string().min(1, 'To Station is required'),
  truckLorryNo: z.string().optional(),
  agentTruck: z.string().optional(),
  distanceKm: z.string().optional(),
  capacity: z.string().optional(),
  vehicleType: z.string().optional(),
  comm: z.string().optional(),
  billedAtBranch: z.string().optional(),
  cnType: z.string().optional(),
  deliveryAt: z.string().optional(),
  consignor: z.string().min(1, 'Consignor is required'),
  consigneeName: z.string().min(1, 'Consignee is required'),
  chargedParty: z.string().optional(),
  partySlab: z.string().optional(),
  transportRoute: z.string().optional(),
  consigneeGst: z.string().optional(),
  goods: z.array(itemSchema).default([{}]),
  freight: z.string().optional(),
  basicFreight: z.string().optional(),
  detentionLoading: z.string().optional(),
  detentionUL: z.string().optional(),
  toll: z.string().optional(),
  labourCharges: z.string().optional(),
  loadingCharges: z.string().optional(),
  unloadingCharges: z.string().optional(),
  otherCharges: z.string().optional(),
  gstPercent: z.string().optional(),
  gstAmount: z.number().optional(),
  advanceAmount: z.string().optional(),
  advanceDate: z.string().optional(),
  totalFreight: z.number().optional(),
  netPayable: z.number().optional(),
  gstPaidBy: z.enum(['Consignor', 'Consignee', 'Transport', 'None']).optional(),
  partyBillNo: z.string().optional(),
  expenses: z.array(expenseSchema).default([{}]),
  acType: z.enum(['Cash', 'Credit']).optional(),
  poNumber: z.string().optional(),
  shipmentId: z.string().optional(),
  cbm: z.string().optional(),
  remarks: z.string().optional(),
  consignorGst: z.string().optional(),
  ewayBillNumber: z.string().optional(),
  ewayDate: z.string().optional(),
});

type GRData = z.infer<typeof createGrSchema>;

const toDate = (value: unknown) => {
  if (!value || typeof value !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
};
const toIsoDate = (value: unknown) => {
  if (!value || typeof value !== 'string') return '';
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
const currentDateInput = () => new Date().toISOString().split('T')[0];
const currentTimeInput = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const getFileType = (url: string) => (url.split('.').pop() || '').toUpperCase();
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const formatInr = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fieldLabelClass = 'mb-1 block text-xs font-medium text-slate-700';
const mappedExpenseTypes = new Set([
  'loading charges',
  'unloading charges',
  'detention loading',
  'detention u/l',
  'toll charges',
  'labour charges',
  'other charges',
]);
const buildMappedChargeExpenses = (data: GRData) => {
  const mapped = [
    { expenseType: 'Loading Charges', amount: data.loadingCharges },
    { expenseType: 'Unloading Charges', amount: data.unloadingCharges },
    { expenseType: 'Detention Loading', amount: data.detentionLoading },
    { expenseType: 'Detention U/L', amount: data.detentionUL },
    { expenseType: 'Toll Charges', amount: data.toll },
    { expenseType: 'Labour Charges', amount: data.labourCharges },
    { expenseType: 'Other Charges', amount: data.otherCharges },
  ]
    .map((item) => ({ ...item, amount: item.amount?.trim() || '' }))
    .filter((item) => toNumber(item.amount) > 0);

  const manual = (data.expenses || [])
    .filter((item) => !mappedExpenseTypes.has((item.expenseType || '').trim().toLowerCase()))
    .filter((item) => (item.expenseType || '').trim() || (item.amount || '').trim() || (item.narration || '').trim())
    .map((item) => ({
      expenseType: (item.expenseType || '').trim(),
      amount: (item.amount || '').trim(),
      narration: (item.narration || '').trim() || undefined,
    }));

  return [...manual, ...mapped];
};

const sectionClass = 'space-y-1.5';
const sectionPanelClass = `${sectionClass} rounded-xl border border-slate-200 bg-white p-3 shadow-sm`;
const sectionTitleClass = 'mb-2 text-sm font-semibold text-slate-900';

export function GREditModal({ trip, existingGR, onSave, onCancel, onBack }: GREditModalProps) {
  const draftStorageKey = useMemo(
    () =>
      existingGR?.id
        ? `gr_draft_edit_${existingGR.id}`
        : `gr_draft_create_${trip?.id || 'no_trip'}`,
    [existingGR?.id, trip?.id],
  );
  const hasHydratedDraftRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [podImages, setPodImages] = useState<string[]>(
    existingGR?.podImages || [],
  );
  const [isUploadingPOD, setIsUploadingPOD] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [branchInput, setBranchInput] = useState('');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [activeBranchSuggestionIndex, setActiveBranchSuggestionIndex] = useState(-1);
  const [billedAtBranchInput, setBilledAtBranchInput] = useState('');
  const [cnTypeInput, setCnTypeInput] = useState('');
  const [deliveryAtInput, setDeliveryAtInput] = useState('');
  const [fieldOptions, setFieldOptions] = useState<Record<string, Array<{ id: string; value: string }>>>({
    billedAtBranch: [],
    cnType: [],
    deliveryAt: [],
  });
  const [showFieldSuggestions, setShowFieldSuggestions] = useState<Record<string, boolean>>({
    billedAtBranch: false,
    cnType: false,
    deliveryAt: false,
  });
  const [activeFieldSuggestionIndex, setActiveFieldSuggestionIndex] = useState<Record<string, number>>({
    billedAtBranch: -1,
    cnType: -1,
    deliveryAt: -1,
  });
  const [addingField, setAddingField] = useState<Record<string, boolean>>({
    billedAtBranch: false,
    cnType: false,
    deliveryAt: false,
  });
  const [gstMovementType, setGstMovementType] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');
  const branchBoxRef = useRef<HTMLDivElement | null>(null);
  const isEditing = !!existingGR;

  const tripInvoiced = Boolean(trip?.invoiceId);
  const [invoiceLockPasscode, setInvoiceLockPasscode] = useState('');
  const [invoiceLockUnlocked, setInvoiceLockUnlocked] = useState(false);
  const formLockedByInvoice = tripInvoiced && !invoiceLockUnlocked;

  useEffect(() => {
    setInvoiceLockUnlocked(false);
    setInvoiceLockPasscode('');
  }, [trip?.id, trip?.invoiceId]);

  const defaultValues = useMemo<Partial<GRData>>(() => {
    if (existingGR) {
      return {
        ...existingGR,
        branchId: existingGR.branchId || '',
        grDate: toDate(existingGR.grDate),
        advanceDate: toDate(existingGR.advanceDate),
        ewayBillNumber: (trip?.ewayBillNumber as string | undefined) || '',
        ewayDate: toDate(trip?.ewayDate),
        basicFreight: existingGR.basicFreight != null ? String(existingGR.basicFreight) : '',
        advanceAmount: existingGR.advanceAmount != null ? String(existingGR.advanceAmount) : '',
        gstPercent: existingGR.gstPercent != null ? String(existingGR.gstPercent) : '',
        expenses:
          existingGR.expenses?.filter(
            (item: any) =>
              !mappedExpenseTypes.has(String(item?.expenseType || '').trim().toLowerCase()),
          ) || [{}],
        goods:
          existingGR.goods?.length > 0
            ? existingGR.goods
            : [
                {
                  noOfBoxes: existingGR.package || '',
                  packageType: existingGR.typeOfPkg || '',
                  rate: existingGR.rate || '',
                  description: existingGR.goodsDescription || '',
                  actualWeight: existingGR.actualWt || '',
                  chargedWeight: existingGR.chargedWt || '',
                  unit: existingGR.unit || '',
                },
              ],
      };
    }

    if (!trip) {
      return {
        grDate: currentDateInput(),
        cnTime: currentTimeInput(),
        billedAtBranch: 'Ghaziabad',
        cnType: 'To be billed',
        deliveryAt: 'Door delivery',
        goods: [{}],
        expenses: [{}],
      };
    }
    return {
      branchId: '',
      grNo: '',
      grDate: currentDateInput(),
      cnTime: currentTimeInput(),
      billedAtBranch: 'Ghaziabad',
      cnType: 'To be billed',
      deliveryAt: 'Door delivery',
      fromStation: trip.fromLocation || '',
      toStation: trip.toLocation || '',
      truckLorryNo: trip.vehicleNumber || '',
      agentTruck: trip.vehicleNumber || '',
      basicFreight: trip.freight != null ? String(trip.freight) : '',
      ewayBillNumber: (trip.ewayBillNumber as string | undefined)?.trim() || '',
      ewayDate: toDate(trip.ewayDate),
      goods: [{}],
      expenses: [{}],
    };
  }, [existingGR, trip]);

  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<GRData>({
    resolver: isEditing ? undefined : zodResolver(createGrSchema),
    defaultValues,
  });

  const goodsArray = useFieldArray({ control, name: 'goods' });
  const expenseArray = useFieldArray({ control, name: 'expenses' });
  const branchIdValue = watch('branchId');
  const truckLorryNoValue = watch('truckLorryNo') || '';
  const grDateValue = watch('grDate') || '';
  const ewayDateValue = watch('ewayDate') || '';
  const billedAtBranchValue = watch('billedAtBranch') || '';
  const cnTypeValue = watch('cnType') || '';
  const deliveryAtValue = watch('deliveryAt') || '';
  const filteredBranchSuggestions = useMemo(() => {
    const q = branchInput.trim().toLowerCase();
    if (!q) return branches.slice(0, 8);
    return branches
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [branchInput, branches]);
  const getFilteredFieldSuggestions = (
    fieldName: 'billedAtBranch' | 'cnType' | 'deliveryAt',
    inputValue: string,
  ) => {
    const options = fieldOptions[fieldName] || [];
    const q = inputValue.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.value.toLowerCase().includes(q)).slice(0, 8);
  };

  const freightInputs = watch([
    'basicFreight',
    'gstPercent',
    'advanceAmount',
    'loadingCharges',
    'unloadingCharges',
    'detentionLoading',
    'detentionUL',
    'toll',
    'labourCharges',
    'otherCharges',
  ]);

  const {
    basicFreightValue,
    gstAmountValue,
    totalFreightValue,
    netPayableValue,
  } = useMemo(() => {
    const basicFreightValue = toNumber(freightInputs[0]);
    const gstPercentValue = toNumber(freightInputs[1]);
    const advanceAmountValue = toNumber(freightInputs[2]);
    const taxableBase = basicFreightValue;
    const gstAmountValue = +(taxableBase * gstPercentValue / 100).toFixed(2);
    const totalFreightValue = +(taxableBase + gstAmountValue).toFixed(2);
    const netPayableValue = Math.max(0, +(totalFreightValue - advanceAmountValue).toFixed(2));
    return { basicFreightValue, gstAmountValue, totalFreightValue, netPayableValue };
  }, [freightInputs]);

  useEffect(() => {
    setValue('gstAmount', gstAmountValue);
    setValue('totalFreight', totalFreightValue);
    setValue('netPayable', netPayableValue);
  }, [gstAmountValue, totalFreightValue, netPayableValue, setValue]);

  useEffect(() => {
    setValue('gstPercent', '18', { shouldDirty: true, shouldValidate: true });
  }, [gstMovementType, setValue]);

  useEffect(() => {
    if (existingGR?.gstMovementType === 'INTER_STATE' || existingGR?.gstMovementType === 'INTRA_STATE') {
      setGstMovementType(existingGR.gstMovementType);
    }
  }, [existingGR?.id, existingGR?.gstMovementType]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { headers });
        const loadedBranches = response.data || [];
        setBranches(loadedBranches);

        const defaultGhaziabad = loadedBranches.find(
          (b: any) => String(b.name).trim().toLowerCase() === 'ghaziabad',
        );
        if (!existingGR && defaultGhaziabad) {
          setValue('branchId', defaultGhaziabad.id, { shouldValidate: true });
          setBranchInput(defaultGhaziabad.name);
        } else if (!existingGR) {
          // Ensure branchId is valid by creating Ghaziabad if not present.
          const created = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/branches`,
            { name: 'Ghaziabad' },
            { headers },
          );
          setBranches((prev) => {
            const exists = prev.some((b) => b.id === created.data.id);
            if (exists) return prev;
            return [...prev, created.data].sort((a, b) => a.name.localeCompare(b.name));
          });
          setValue('branchId', created.data.id, { shouldValidate: true });
          setBranchInput(created.data.name || 'Ghaziabad');
        }
      } catch {
        setBranches([]);
        if (!existingGR) setBranchInput('Ghaziabad');
      }
    };
    void loadBranches();
  }, [existingGR, setValue]);

  useEffect(() => {
    const loadFieldOptions = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const [billedRes, cnTypeRes, deliveryRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/options/billedAtBranch`, { headers }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/options/cnType`, { headers }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/options/deliveryAt`, { headers }),
        ]);
        setFieldOptions({
          billedAtBranch: billedRes.data || [],
          cnType: cnTypeRes.data || [],
          deliveryAt: deliveryRes.data || [],
        });
      } catch {
        setFieldOptions({ billedAtBranch: [], cnType: [], deliveryAt: [] });
      }
    };
    void loadFieldOptions();
  }, []);

  useEffect(() => {
    if (!branches.length) return;
    const selected = branches.find((b) => b.id === branchIdValue);
    if (selected) {
      setBranchInput(selected.name);
    }
  }, [branchIdValue, branches]);

  useEffect(() => {
    setBilledAtBranchInput(billedAtBranchValue || '');
  }, [billedAtBranchValue]);
  useEffect(() => {
    setCnTypeInput(cnTypeValue || '');
  }, [cnTypeValue]);
  useEffect(() => {
    setDeliveryAtInput(deliveryAtValue || '');
  }, [deliveryAtValue]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!branchBoxRef.current) return;
      if (!branchBoxRef.current.contains(event.target as Node)) {
        setShowBranchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        hasHydratedDraftRef.current = true;
        return;
      }
      const parsedDraft = JSON.parse(rawDraft) as {
        values?: Partial<GRData>;
        podImages?: string[];
      };
      if (parsedDraft.values) {
        for (const [key, value] of Object.entries(parsedDraft.values)) {
          setValue(key as keyof GRData, value as any, { shouldDirty: true });
        }
      }
      if (Array.isArray(parsedDraft.podImages)) {
        setPodImages(parsedDraft.podImages);
      }
    } catch {
      // Ignore malformed local drafts.
    } finally {
      hasHydratedDraftRef.current = true;
    }
  }, [draftStorageKey, setValue]);

  useEffect(() => {
    const subscription = watch((value) => {
      if (!hasHydratedDraftRef.current) return;
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            values: value,
            podImages,
          }),
        );
      } catch {
        // Ignore storage errors to avoid interrupting form entry.
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, draftStorageKey, podImages]);

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          values: getValues(),
          podImages,
        }),
      );
    } catch {
      // Ignore storage errors to avoid interrupting form entry.
    }
  }, [draftStorageKey, getValues, podImages]);

  useEffect(() => {
    if (isEditing) return;
    let cancelled = false;
    const hydratePartyGst = async () => {
      try {
        let gst: string | undefined;
        if (trip?.partyId) {
          const party = await partiesApi.getParty(trip.partyId);
          gst = party?.gstIn || undefined;
        } else if (trip?.partyName) {
          const parties = await partiesApi.getParties();
          const matched = parties.find((p) => p.name.trim().toLowerCase() === String(trip.partyName).trim().toLowerCase());
          gst = matched?.gstIn || undefined;
        }
        if (cancelled || !gst) return;
        if (!String(getValues('consignorGst') || '').trim()) {
          setValue('consignorGst', gst, { shouldDirty: false });
        }
        if (!String(getValues('consigneeGst') || '').trim()) {
          setValue('consigneeGst', gst, { shouldDirty: false });
        }
      } catch {
        // Keep GST empty when party GST is unavailable.
      }
    };
    void hydratePartyGst();
    return () => {
      cancelled = true;
    };
  }, [isEditing, trip?.partyId, trip?.partyName, getValues, setValue]);

  const handleBranchInputChange = (value: string) => {
    setBranchInput(value);
    setShowBranchSuggestions(true);
    setActiveBranchSuggestionIndex(-1);
    const matched = branches.find(
      (b) => b.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    setValue('branchId', matched ? matched.id : '', { shouldValidate: true });
  };

  const handleSelectBranch = (branch: { id: string; name: string }) => {
    setBranchInput(branch.name);
    setValue('branchId', branch.id, { shouldValidate: true });
    setShowBranchSuggestions(false);
    setActiveBranchSuggestionIndex(-1);
  };

  const handleFieldInputChange = (
    fieldName: 'billedAtBranch' | 'cnType' | 'deliveryAt',
    value: string,
  ) => {
    if (fieldName === 'billedAtBranch') setBilledAtBranchInput(value);
    if (fieldName === 'cnType') setCnTypeInput(value);
    if (fieldName === 'deliveryAt') setDeliveryAtInput(value);
    setValue(fieldName, value, { shouldValidate: true, shouldDirty: true });
    setShowFieldSuggestions((prev) => ({ ...prev, [fieldName]: true }));
    setActiveFieldSuggestionIndex((prev) => ({ ...prev, [fieldName]: -1 }));
  };

  const handleSelectFieldSuggestion = (
    fieldName: 'billedAtBranch' | 'cnType' | 'deliveryAt',
    value: string,
  ) => {
    if (fieldName === 'billedAtBranch') setBilledAtBranchInput(value);
    if (fieldName === 'cnType') setCnTypeInput(value);
    if (fieldName === 'deliveryAt') setDeliveryAtInput(value);
    setValue(fieldName, value, { shouldValidate: true, shouldDirty: true });
    setShowFieldSuggestions((prev) => ({ ...prev, [fieldName]: false }));
    setActiveFieldSuggestionIndex((prev) => ({ ...prev, [fieldName]: -1 }));
  };

  const handleFieldInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    fieldName: 'billedAtBranch' | 'cnType' | 'deliveryAt',
    currentValue: string,
  ) => {
    const suggestions = getFilteredFieldSuggestions(fieldName, currentValue);
    if (!showFieldSuggestions[fieldName] || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setShowFieldSuggestions((prev) => ({ ...prev, [fieldName]: true }));
        setActiveFieldSuggestionIndex((prev) => ({ ...prev, [fieldName]: 0 }));
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveFieldSuggestionIndex((prev) => ({
        ...prev,
        [fieldName]: prev[fieldName] < suggestions.length - 1 ? prev[fieldName] + 1 : 0,
      }));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveFieldSuggestionIndex((prev) => ({
        ...prev,
        [fieldName]: prev[fieldName] > 0 ? prev[fieldName] - 1 : suggestions.length - 1,
      }));
      return;
    }

    if (event.key === 'Enter') {
      const idx = activeFieldSuggestionIndex[fieldName];
      if (idx >= 0 && idx < suggestions.length) {
        event.preventDefault();
        handleSelectFieldSuggestion(fieldName, suggestions[idx].value);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowFieldSuggestions((prev) => ({ ...prev, [fieldName]: false }));
      setActiveFieldSuggestionIndex((prev) => ({ ...prev, [fieldName]: -1 }));
    }
  };

  const handleAddFieldOption = async (
    fieldName: 'billedAtBranch' | 'cnType' | 'deliveryAt',
    value: string,
  ) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    setAddingField((prev) => ({ ...prev, [fieldName]: true }));
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/options`,
        { fieldName, value: cleaned },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const option = response.data;
      setFieldOptions((prev) => {
        const exists = (prev[fieldName] || []).some((o) => o.value.toLowerCase() === option.value.toLowerCase());
        if (exists) return prev;
        return {
          ...prev,
          [fieldName]: [...(prev[fieldName] || []), option].sort((a, b) => a.value.localeCompare(b.value)),
        };
      });
      handleSelectFieldSuggestion(fieldName, option.value);
      toast.success('Option added');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add option');
    } finally {
      setAddingField((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleBranchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showBranchSuggestions || filteredBranchSuggestions.length === 0) {
      if (event.key === 'ArrowDown' && filteredBranchSuggestions.length > 0) {
        setShowBranchSuggestions(true);
        setActiveBranchSuggestionIndex(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveBranchSuggestionIndex((prev) =>
        prev < filteredBranchSuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveBranchSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredBranchSuggestions.length - 1,
      );
      return;
    }

    if (event.key === 'Enter') {
      if (activeBranchSuggestionIndex >= 0 && activeBranchSuggestionIndex < filteredBranchSuggestions.length) {
        event.preventDefault();
        handleSelectBranch(filteredBranchSuggestions[activeBranchSuggestionIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowBranchSuggestions(false);
      setActiveBranchSuggestionIndex(-1);
    }
  };

  const handleAddBranch = async () => {
    const name = branchInput.trim();
    if (!name) return;
    setIsAddingBranch(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/branches`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const created = response.data;
      setBranches((prev) => {
        const exists = prev.some((b) => b.id === created.id);
        if (exists) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      setValue('branchId', created.id, { shouldValidate: true });
      setBranchInput(created.name);
      toast.success('Branch added');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add branch');
    } finally {
      setIsAddingBranch(false);
    }
  };

  const onSubmit = async (data: GRData) => {
    if (formLockedByInvoice) {
      toast.error('This trip is invoiced. Unlock with the passcode dialog to edit the GR.');
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const shipperId = tokenPayload.sub;
      const files = existingGR?.files?.map((file: any) => ({ fileUrl: file.fileUrl, fileType: file.fileType })) || [];
      const normalizedGoods = (data.goods || [])
        .map((item) => ({
          noOfBoxes: (item.noOfBoxes || '').trim(),
          packageType: (item.packageType || '').trim(),
          rate: (item.rate || '').trim(),
          description: (item.description || '').trim(),
          actualWeight: (item.actualWeight || '').trim(),
          chargedWeight: (item.chargedWeight || '').trim(),
          unit: (item.unit || '').trim(),
        }))
        .filter((item) =>
          item.noOfBoxes || item.packageType || item.description || item.actualWeight || item.chargedWeight || item.unit,
        );
      const mergedExpenses = buildMappedChargeExpenses(data).map((item) => ({
        expenseType: (item.expenseType || '').trim(),
        amount: (item.amount || '').trim(),
        narration: (((item as any).narration as string) || '').trim(),
      }));
      const payload: Record<string, unknown> = {
        tripId: trip?.id || undefined,
        shipperId,
        branchId: data.branchId,
        grNo: data.grNo,
        grDate: toIsoDate(data.grDate),
        cnTime: data.cnTime,
        fromStation: data.fromStation,
        toStation: data.toStation,
        truckLorryNo: data.truckLorryNo,
        agentTruck: data.agentTruck,
        distanceKm: data.distanceKm,
        capacity: data.capacity,
        vehicleType: data.vehicleType,
        comm: data.comm,
        billedAtBranch: data.billedAtBranch,
        cnType: data.cnType,
        deliveryAt: data.deliveryAt,
        consignor: data.consignor,
        consigneeName: data.consigneeName,
        chargedParty: data.chargedParty,
        partySlab: data.partySlab,
        transportRoute: data.transportRoute,
        consignorGst: data.consignorGst,
        consigneeGst: data.consigneeGst,
        basicFreight: basicFreightValue,
        detentionLoading: data.detentionLoading,
        detentionUL: data.detentionUL,
        toll: data.toll,
        labourCharges: data.labourCharges,
        loadingCharges: data.loadingCharges,
        unloadingCharges: data.unloadingCharges,
        otherCharges: data.otherCharges,
        gstPercent: data.gstPercent,
        gstAmount: gstAmountValue,
        advanceAmount: data.advanceAmount,
        advanceDate: data.advanceDate,
        totalFreight: totalFreightValue,
        netPayable: netPayableValue,
        gstMovementType,
        gstPaidBy: data.gstPaidBy,
        partyBillNo: data.partyBillNo,
        acType: data.acType,
        poNumber: data.poNumber,
        shipmentId: data.shipmentId,
        cbm: data.cbm,
        remarks: data.remarks,
        goods: normalizedGoods,
        expenses: mergedExpenses,
        files,
      };

      const cleanedPayload = Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (value === undefined || value === null) return acc;
        if (typeof value === 'string' && value.trim() === '') return acc;
        if (Array.isArray(value) && value.length === 0) return acc;
        acc[key] = value;
        return acc;
      }, {});

      const headers = { Authorization: `Bearer ${token}` };
      let savedGr: any = null;
      if (isEditing) {
        const response = await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${existingGR.id}`,
          cleanedPayload,
          { headers },
        );
        savedGr = response?.data;
        toast.success('GR details updated successfully');
      } else {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/goods-receipt`, cleanedPayload, { headers });
        savedGr = response?.data;
        toast.success('GR details added successfully');
      }

      if (trip?.id) {
        const bill = (data.ewayBillNumber || '').trim();
        const ewayRaw = (data.ewayDate || '').trim();
        const ewayDay = ewayRaw ? toIsoDate(ewayRaw) : '';
        try {
          await axios.patch(
            `${process.env.NEXT_PUBLIC_API_URL}/trips/${trip.id}/accounts`,
            {
              ewayBillNumber: bill || null,
              ewayDate: ewayDay || null,
            },
            { headers },
          );
        } catch {
          toast.error('GR saved, but e-way could not be updated on the trip.');
        }
      }

      localStorage.removeItem(draftStorageKey);
      await onSave(savedGr);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save GR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadPOD = async () => {
    if (formLockedByInvoice) {
      toast.error('This trip is invoiced. Unlock with the passcode dialog to change the GR or POD.');
      return;
    }
    if (!existingGR?.id) {
      toast.error('Save GR first, then upload POD.');
      return;
    }
    if (podImages.length === 0) {
      toast.error('Please upload at least one POD image');
      return;
    }
    setIsUploadingPOD(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/goods-receipt/${existingGR.id}/pod`,
        { podImages },
        { headers },
      );
      toast.success('POD uploaded successfully');
      await onSave();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload POD');
    } finally {
      setIsUploadingPOD(false);
    }
  };

  const onInvalidSubmit = () => {
    if (isEditing) {
      toast.error('Please correct highlighted fields before updating.');
      return;
    }
    const requiredFieldLabels: Record<string, string> = {
      branchId: 'Branch',
      grNo: 'GR No / CN No',
      fromStation: 'From Station',
      toStation: 'To Station',
      consignor: 'Consignor',
      consigneeName: 'Consignee',
    };

    const invalid = Object.keys(errors)
      .map((key) => requiredFieldLabels[key] || key)
      .filter(Boolean);

    const message =
      invalid.length > 0
        ? `Please fill required fields: ${invalid.join(', ')}`
        : 'Please fill all required fields before submitting.';
    toast.error(message);
  };

  const submitGrForm = () => {
    if (formLockedByInvoice) {
      toast.error('This trip is invoiced. Unlock with the passcode dialog to edit the GR.');
      return;
    }
    if (isEditing) {
      void onSubmit(getValues());
      return;
    }
    void handleSubmit(onSubmit, onInvalidSubmit)();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 px-2 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700">
                  Back
                </button>
              )}
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {isEditing ? 'Edit GR (Consignment Note)' : 'Add GR (Consignment Note)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Trip prefill is optional and every field remains editable.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {tripInvoiced && invoiceLockUnlocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/90">
                  <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Editing unlocked
                </span>
              )}
              <Button type="button" variant="outline" onClick={onCancel}>
                Save Draft
              </Button>
              <Button type="button" onClick={submitGrForm} disabled={isLoading || formLockedByInvoice}>
                {isLoading ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>

        <form
          id="gr-form"
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="flex min-h-0 flex-1 flex-col p-0"
        >
          <fieldset
            disabled={formLockedByInvoice}
            className="m-0 flex min-h-0 flex-1 flex-col space-y-2.5 overflow-y-auto border-0 p-2.5 sm:p-3.5"
          >
          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Primary Details</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-sm">Branch *</label>
                <input type="hidden" {...register('branchId')} />
                <div className="relative mt-1" ref={branchBoxRef}>
                  <div className="flex items-center gap-2">
                  <Input
                    value={branchInput}
                    onChange={(e) => handleBranchInputChange(e.target.value)}
                    onFocus={() => {
                      setShowBranchSuggestions(true);
                      setActiveBranchSuggestionIndex(filteredBranchSuggestions.length > 0 ? 0 : -1);
                    }}
                    onKeyDown={handleBranchInputKeyDown}
                    placeholder="Enter branch name"
                  />
                  {!branchIdValue && branchInput.trim().length > 0 && (
                    <Button type="button" variant="outline" onClick={handleAddBranch} disabled={isAddingBranch}>
                      {isAddingBranch ? 'Adding...' : 'Add'}
                    </Button>
                  )}
                </div>
                  {showBranchSuggestions && filteredBranchSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                      {filteredBranchSuggestions.map((branch) => (
                        <button
                          type="button"
                          key={branch.id}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                            filteredBranchSuggestions[activeBranchSuggestionIndex]?.id === branch.id
                              ? 'bg-slate-100'
                              : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectBranch(branch);
                          }}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.branchId && <p className="text-xs text-red-600">{errors.branchId.message}</p>}
              </div>
              <div className="md:col-span-2 relative">
                <label className={fieldLabelClass}>Billed At Branch</label>
                <input type="hidden" {...register('billedAtBranch')} />
                <div className="flex items-center gap-2">
                  <Input
                    value={billedAtBranchInput}
                    onChange={(e) => handleFieldInputChange('billedAtBranch', e.target.value)}
                    onFocus={() => setShowFieldSuggestions((prev) => ({ ...prev, billedAtBranch: true }))}
                    onBlur={() => setTimeout(() => setShowFieldSuggestions((prev) => ({ ...prev, billedAtBranch: false })), 120)}
                    onKeyDown={(e) => handleFieldInputKeyDown(e, 'billedAtBranch', billedAtBranchInput)}
                    placeholder="Billed At Branch"
                  />
                  {billedAtBranchInput.trim() && !getFilteredFieldSuggestions('billedAtBranch', billedAtBranchInput).some((o) => o.value.toLowerCase() === billedAtBranchInput.trim().toLowerCase()) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleAddFieldOption('billedAtBranch', billedAtBranchInput)}
                      disabled={addingField.billedAtBranch}
                    >
                      {addingField.billedAtBranch ? 'Adding...' : 'Add'}
                    </Button>
                  )}
                </div>
                {showFieldSuggestions.billedAtBranch && getFilteredFieldSuggestions('billedAtBranch', billedAtBranchInput).length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-40 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                    {getFilteredFieldSuggestions('billedAtBranch', billedAtBranchInput).map((opt, index) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                          activeFieldSuggestionIndex.billedAtBranch === index ? 'bg-slate-100' : ''
                        }`}
                        onMouseDown={() => handleSelectFieldSuggestion('billedAtBranch', opt.value)}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">GR No. / CN No. *</label>
                <Input {...register('grNo')} placeholder="Enter GR No. / CN No." error={errors.grNo?.message} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">Party Bill No.</label>
                <Input {...register('partyBillNo')} placeholder="Enter Party Bill No." />
              </div>
              <div>
                <label className="text-sm">GR Date</label>
                <Input
                  type="date"
                  value={grDateValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setValue('grDate', inputValue, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
              <div><label className="text-sm">Time</label><Input type="time" {...register('cnTime')} /></div>
              <div className="md:col-span-2">
                <label className="text-sm">E-way bill number (optional)</label>
                <Input
                  {...register('ewayBillNumber')}
                  placeholder="From trip if set; otherwise enter here"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-sm">E-way date (optional)</label>
                <Input
                  type="date"
                  value={ewayDateValue}
                  onChange={(e) =>
                    setValue('ewayDate', e.target.value, { shouldDirty: true, shouldValidate: true })
                  }
                />
              </div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Route & Vehicle</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
              <div><label className={fieldLabelClass}>From Station *</label><Input {...register('fromStation')} placeholder="From Station" error={errors.fromStation?.message} /></div>
              <div><label className={fieldLabelClass}>To Station *</label><Input {...register('toStation')} placeholder="To Station" error={errors.toStation?.message} /></div>
              <div>
                <label className={fieldLabelClass}>Vehicle No</label>
                <input type="hidden" {...register('truckLorryNo')} />
                <VehicleAutocomplete
                  value={truckLorryNoValue}
                  onChange={(value) => setValue('truckLorryNo', value, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Search vehicle number..."
                />
              </div>
              <div><label className={fieldLabelClass}>Agent Truck</label><Input {...register('agentTruck')} placeholder="Agent Truck" /></div>
              <div><label className={fieldLabelClass}>Distance (KM)</label><Input {...register('distanceKm')} placeholder="Distance (KM)" /></div>
              <div><label className={fieldLabelClass}>Capacity</label><Input {...register('capacity')} placeholder="Capacity" /></div>
              <div><label className={fieldLabelClass}>Vehicle Type</label><Input {...register('vehicleType')} placeholder="Vehicle Type" /></div>
              <div><label className={fieldLabelClass}>Commission</label><Input {...register('comm')} placeholder="Commission" /></div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Billing Type</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="relative">
                <label className={fieldLabelClass}>CN Type</label>
                <input type="hidden" {...register('cnType')} />
                <div className="flex items-center gap-2">
                  <Input
                    value={cnTypeInput}
                    onChange={(e) => handleFieldInputChange('cnType', e.target.value)}
                    onFocus={() => setShowFieldSuggestions((prev) => ({ ...prev, cnType: true }))}
                    onBlur={() => setTimeout(() => setShowFieldSuggestions((prev) => ({ ...prev, cnType: false })), 120)}
                    onKeyDown={(e) => handleFieldInputKeyDown(e, 'cnType', cnTypeInput)}
                    placeholder="CN Type"
                  />
                  {cnTypeInput.trim() && !getFilteredFieldSuggestions('cnType', cnTypeInput).some((o) => o.value.toLowerCase() === cnTypeInput.trim().toLowerCase()) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleAddFieldOption('cnType', cnTypeInput)}
                      disabled={addingField.cnType}
                    >
                      {addingField.cnType ? 'Adding...' : 'Add'}
                    </Button>
                  )}
                </div>
                {showFieldSuggestions.cnType && getFilteredFieldSuggestions('cnType', cnTypeInput).length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-40 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                    {getFilteredFieldSuggestions('cnType', cnTypeInput).map((opt, index) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                          activeFieldSuggestionIndex.cnType === index ? 'bg-slate-100' : ''
                        }`}
                        onMouseDown={() => handleSelectFieldSuggestion('cnType', opt.value)}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className={fieldLabelClass}>Delivery At</label>
                <input type="hidden" {...register('deliveryAt')} />
                <div className="flex items-center gap-2">
                  <Input
                    value={deliveryAtInput}
                    onChange={(e) => handleFieldInputChange('deliveryAt', e.target.value)}
                    onFocus={() => setShowFieldSuggestions((prev) => ({ ...prev, deliveryAt: true }))}
                    onBlur={() => setTimeout(() => setShowFieldSuggestions((prev) => ({ ...prev, deliveryAt: false })), 120)}
                    onKeyDown={(e) => handleFieldInputKeyDown(e, 'deliveryAt', deliveryAtInput)}
                    placeholder="Delivery At"
                  />
                  {deliveryAtInput.trim() && !getFilteredFieldSuggestions('deliveryAt', deliveryAtInput).some((o) => o.value.toLowerCase() === deliveryAtInput.trim().toLowerCase()) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleAddFieldOption('deliveryAt', deliveryAtInput)}
                      disabled={addingField.deliveryAt}
                    >
                      {addingField.deliveryAt ? 'Adding...' : 'Add'}
                    </Button>
                  )}
                </div>
                {showFieldSuggestions.deliveryAt && getFilteredFieldSuggestions('deliveryAt', deliveryAtInput).length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-40 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                    {getFilteredFieldSuggestions('deliveryAt', deliveryAtInput).map((opt, index) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                          activeFieldSuggestionIndex.deliveryAt === index ? 'bg-slate-100' : ''
                        }`}
                        onMouseDown={() => handleSelectFieldSuggestion('deliveryAt', opt.value)}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Party Details</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div><label className={fieldLabelClass}>Consignor *</label><Input {...register('consignor')} placeholder="Consignor" error={errors.consignor?.message} /></div>
              <div><label className={fieldLabelClass}>Consignee *</label><Input {...register('consigneeName')} placeholder="Consignee" error={errors.consigneeName?.message} /></div>
              <div><label className={fieldLabelClass}>Charged Party</label><Input {...register('chargedParty')} placeholder="Charged Party" /></div>
              <div><label className={fieldLabelClass}>Party Slab</label><Input {...register('partySlab')} placeholder="Party Slab" /></div>
              <div><label className={fieldLabelClass}>Transport Route</label><Input {...register('transportRoute')} placeholder="Transport Route" /></div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Goods</h4>
              <Button type="button" variant="outline" onClick={() => goodsArray.append({})}>Add Row</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100/90 text-slate-700">
                  <tr className="[&>th]:px-2.5 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                    <th>No. of Boxes</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Actual Weight</th>
                    <th>Charged Weight</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th className="w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsArray.fields.map((field, idx) => (
                    <tr key={field.id} className="border-t border-slate-200/80 bg-white align-top even:bg-slate-50/35">
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.noOfBoxes`)} placeholder="No. of Boxes" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.packageType`)} placeholder="Type of Package" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.description`)} placeholder="Goods Description" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.actualWeight`)} placeholder="Actual Weight" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.chargedWeight`)} placeholder="Charged Weight" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.unit`)} placeholder="Unit" /></td>
                      <td className="px-2 py-2"><Input {...register(`goods.${idx}.rate`)} placeholder="Rate" /></td>
                      <td className="px-2 py-2 text-center">
                        <Button type="button" variant="outline" onClick={() => goodsArray.remove(idx)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>GST Responsibility</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>GST Paid By</label>
                <div className="mt-2 flex flex-wrap gap-4">
                  {['Consignor', 'Consignee', 'Transport', 'None'].map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" value={opt} {...register('gstPaidBy')} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Charges & Freight</h4>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-sm">A/C Type</label>
                    <select {...register('acType')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                      <option value="">Select A/C Type</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div><label className={fieldLabelClass}>PO Number</label><Input {...register('poNumber')} placeholder="PO Number" /></div>
                  <div><label className={fieldLabelClass}>Shipment ID</label><Input {...register('shipmentId')} placeholder="Shipment ID" /></div>
                  <div><label className={fieldLabelClass}>CBM</label><Input {...register('cbm')} placeholder="CBM" /></div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div><label className={fieldLabelClass}>Loading Charges</label><Input {...register('loadingCharges')} placeholder="Loading Charges" /></div>
                <div><label className={fieldLabelClass}>Unloading Charges</label><Input {...register('unloadingCharges')} placeholder="Unloading Charges" /></div>
                <div><label className={fieldLabelClass}>Detention Loading</label><Input {...register('detentionLoading')} placeholder="Detention Loading" /></div>
                <div><label className={fieldLabelClass}>Detention U/L</label><Input {...register('detentionUL')} placeholder="Detention U/L" /></div>
                <div><label className={fieldLabelClass}>Toll Charges</label><Input {...register('toll')} placeholder="Toll Charges" /></div>
                <div><label className={fieldLabelClass}>Labour Charges</label><Input {...register('labourCharges')} placeholder="Labour Charges" /></div>
                <div><label className={fieldLabelClass}>Other Charges</label><Input {...register('otherCharges')} placeholder="Other Charges" /></div>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <h5 className="mb-2 text-sm font-semibold text-emerald-900">Freight Calculation</h5>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Basic Freight</label>
                    <Input type="number" min="0" step="0.01" {...register('basicFreight')} placeholder="Enter Basic Freight" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">GST movement</label>
                    <select
                      value={gstMovementType}
                      onChange={(e) => setGstMovementType(e.target.value as 'INTRA_STATE' | 'INTER_STATE')}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="INTRA_STATE">Intra-State (Within Same State)</option>
                      <option value="INTER_STATE">Inter-State (Between States)</option>
                    </select>
                    <input type="hidden" {...register('gstPercent')} />
                    <p className="mt-1 text-xs text-slate-500">
                      {gstMovementType === 'INTRA_STATE'
                        ? 'CGST 9% + SGST 9% (Total GST 18%)'
                        : 'IGST 18% (Total GST 18%)'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                    <span className="text-slate-600">GST Amount</span>
                    <span className="font-medium">{formatInr(gstAmountValue)}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input type="number" min="0" step="0.01" {...register('advanceAmount')} placeholder="Advance Amount" />
                    <Input type="date" {...register('advanceDate')} />
                  </div>
                  <p className="rounded bg-white px-3 py-2 text-xs text-slate-600">
                    Left-side charges are treated as expenses and are not included in freight GST calculation.
                  </p>
                  <div className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                    <span className="text-slate-600">Total Freight</span>
                    <span className="font-semibold">{formatInr(totalFreightValue)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-emerald-300 bg-white px-3 py-2">
                    <span className="text-sm font-medium text-emerald-900">Net Payable</span>
                    <span className="text-lg font-bold text-emerald-900">{formatInr(netPayableValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Expense Table</h4>
              <Button type="button" variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" onClick={() => expenseArray.append({})}>
                Add Expense
              </Button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Add manual expense rows here. Charge-based rows (loading, unloading, toll, etc.) are handled from GR charge fields.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-100/90 text-slate-700">
                  <tr className="[&>th]:px-2.5 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                    <th>Expense Type</th>
                    <th>Amount</th>
                    <th>Narration</th>
                    <th className="w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseArray.fields.map((field, idx) => (
                    <tr key={field.id} className="border-t border-slate-200/80 bg-white align-top even:bg-slate-50/35">
                      <td className="px-2 py-2"><Input {...register(`expenses.${idx}.expenseType`)} placeholder="Expense Type" /></td>
                      <td className="px-2 py-2"><Input {...register(`expenses.${idx}.amount`)} placeholder="Amount" /></td>
                      <td className="px-2 py-2"><Input {...register(`expenses.${idx}.narration`)} placeholder="Narration" /></td>
                      <td className="px-2 py-2 text-center">
                        <Button type="button" variant="outline" onClick={() => expenseArray.remove(idx)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Document Upload</h4>
            <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3">
              <p className="mb-2 text-xs text-indigo-900/80">
                Upload POD images (same workflow as View GR). This does not change GR date/time.
              </p>
              <ImageUpload
                images={podImages}
                onImagesChange={setPodImages}
                maxImages={3}
                label="Upload POD Images (JPG, PNG, GIF, WEBP up to 10MB)"
              />
              {isEditing ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    onClick={handleUploadPOD}
                    disabled={formLockedByInvoice || isUploadingPOD || podImages.length === 0}
                  >
                    {isUploadingPOD ? 'Uploading...' : 'Upload POD'}
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-600">
                  POD upload is available after GR is created.
                </p>
              )}
            </div>
          </section>

          <section className={sectionPanelClass}>
            <h4 className={sectionTitleClass}>Additional Info</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div><label className={fieldLabelClass}>Consignor GST</label><Input {...register('consignorGst')} placeholder="Auto from party GST if available" /></div>
              <div><label className={fieldLabelClass}>Consignee GST</label><Input {...register('consigneeGst')} placeholder="Auto from party GST if available" /></div>
              <div className="md:col-span-3"><label className={fieldLabelClass}>Remarks</label><Input {...register('remarks')} placeholder="Remarks" /></div>
            </div>
          </section>
          </fieldset>
        </form>

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={submitGrForm} disabled={isLoading || formLockedByInvoice}>
              {isLoading ? 'Saving...' : isEditing ? 'Update GR' : 'Add GR'}
            </Button>
          </div>
        </div>
      </div>

      <GrInvoiceUnlockOverlay
        open={tripInvoiced && !invoiceLockUnlocked}
        passcode={invoiceLockPasscode}
        onPasscodeChange={setInvoiceLockPasscode}
        onUnlock={() => {
          if (invoiceLockPasscode.trim() === GR_INVOICE_UI_UNLOCK_PASSCODE) {
            setInvoiceLockUnlocked(true);
            setInvoiceLockPasscode('');
            toast.success('GR editing unlocked');
          } else {
            toast.error('Incorrect passcode');
          }
        }}
        onCancel={() => {
          if (onBack) onBack();
          else onCancel();
        }}
        unlockButtonLabel="Unlock editing"
        cancelButtonLabel={onBack ? 'Go back' : 'Close'}
      />
    </div>
  );
}
