'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const tripSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  startLocation: z.string().min(1, 'Start location is required'),
  endLocation: z.string().min(1, 'End location is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  distance: z.number().optional(),
  fare: z.number().optional(),
  expense: z.number().optional(),
  party: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  grNumber: z.string().optional(),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface TripCreationResponse {
  success: boolean;
  tripNo: string;
  tripId: string;
  isDuplicate: boolean;
  duplicateInfo?: {
    originalTripNo: string;
    conflictReason: string;
  };
  message: string;
}

interface TripFormProps {
  trip?: any;
  onSave: (response?: TripCreationResponse) => void;
  onCancel: () => void;
}

export function TripForm({ trip, onSave, onCancel }: TripFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastResponse, setLastResponse] = useState<TripCreationResponse | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: trip || {
      status: 'PENDING',
    },
  });

  const onSubmit = async (data: TripFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      if (trip) {
        // Update existing trip
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/trips/${trip.id}`,
          data,
          { headers }
        );
        toast.success('Trip updated successfully!');
        onSave();
      } else {
        // Create new trip using the transaction service
        const tripData = {
          ...data,
          isOffline,
        };
        
        const response = await axios.post<TripCreationResponse>(
          `${process.env.NEXT_PUBLIC_API_URL}/trips/create`,
          tripData,
          { headers }
        );
        
        const result = response.data;
        setLastResponse(result);
        
        if (result.isDuplicate) {
          toast.error(
            `⚠️ Duplicate Vehicle Detected!\nTrip ${result.tripNo} created but flagged as duplicate.\n${result.duplicateInfo?.conflictReason}`,
            { duration: 6000 }
          );
        } else {
          toast.success(
            `✅ Trip Created Successfully!\nTrip Number: ${result.tripNo}`,
            { duration: 4000 }
          );
        }
        
        onSave(result);
      }
      
      reset();
    } catch (error: any) {
      console.error('Trip creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to save trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor *
          </label>
          <select
            {...register('vendorId')}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select Vendor</option>
            <option value="cmlp3tzmv000012xd3lqv5yi4">Test Vendor 1</option>
            <option value="cmlp3v0jg000112xdeuy2xzdh">Test Vendor 2</option>
          </select>
          {errors.vendorId && (
            <p className="mt-1 text-sm text-destructive">{errors.vendorId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vehicle Number *
          </label>
          <Input
            {...register('vehicleNumber')}
            error={errors.vehicleNumber?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Name
          </label>
          <Input
            {...register('driverName')}
            error={errors.driverName?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Phone
          </label>
          <Input
            {...register('driverPhone')}
            error={errors.driverPhone?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Location *
          </label>
          <Input
            {...register('startLocation')}
            error={errors.startLocation?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Location *
          </label>
          <Input
            {...register('endLocation')}
            error={errors.endLocation?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Time *
          </label>
          <Input
            type="datetime-local"
            {...register('startTime')}
            error={errors.startTime?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Time
          </label>
          <Input
            type="datetime-local"
            {...register('endTime')}
            error={errors.endTime?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Distance (km)
          </label>
          <Input
            type="number"
            step="0.1"
            {...register('distance', { valueAsNumber: true })}
            error={errors.distance?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fare
          </label>
          <Input
            type="number"
            step="0.01"
            {...register('fare', { valueAsNumber: true })}
            error={errors.fare?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expense
          </label>
          <Input
            type="number"
            step="0.01"
            {...register('expense', { valueAsNumber: true })}
            error={errors.expense?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Party/Customer
          </label>
          <Input
            {...register('party')}
            error={errors.party?.message}
            placeholder="Customer or party name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-destructive">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GR Number
          </label>
          <Input
            {...register('grNumber')}
            error={errors.grNumber?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-destructive">{errors.notes.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="offline"
            checked={isOffline}
            onChange={(e) => setIsOffline(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="offline" className="text-sm text-gray-700">
            Save as offline trip
          </label>
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : trip ? 'Update Trip' : 'Create Trip'}
        </Button>
        
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
