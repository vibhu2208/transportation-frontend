'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const tripSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverName: z.string().min(1, 'Driver name is required'),
  driverPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  startLocation: z.string().min(1, 'Start location is required'),
  endLocation: z.string().min(1, 'End location is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  distance: z.number().min(1, 'Distance must be greater than 0'),
  fare: z.number().min(0, 'Fare must be non-negative'),
  expense: z.number().min(0, 'Expense must be non-negative'),
  party: z.string().min(1, 'Party name is required'),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface TripCreationFormProps {
  vendorId?: string;
  onSuccess?: () => void;
}

export function TripCreationForm({ vendorId, onSuccess }: TripCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
  });

  const onSubmit = async (data: TripFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      let user = null;
      
      if (userData) {
        try {
          user = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // For vendors without vendorId, use a default vendor ID
      // In production, this should be handled by proper vendor-user assignment
      const assignedVendorId = user?.vendorId || vendorId || 'cmlp3tzmv000012xd3lqv5yi4';

      const tripData = {
        ...data,
        vendorId: assignedVendorId,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };

      const response = await api.post('/trips/create', tripData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      toast.success('Trip created successfully!');
      reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Trip creation error:', error);
      if (error.response?.status === 403 && error.response?.data?.message?.includes('vendor ID')) {
        toast.error('Vendor account setup required. Please contact admin.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create trip');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Trip</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Number
            </label>
            <Input
              {...register('vehicleNumber')}
              placeholder="e.g., MH-01-AB-1234"
              error={errors.vehicleNumber?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name
            </label>
            <Input
              {...register('driverName')}
              placeholder="e.g., John Doe"
              error={errors.driverName?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Phone
            </label>
            <Input
              {...register('driverPhone')}
              placeholder="e.g., 9876543210"
              error={errors.driverPhone?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Name
            </label>
            <Input
              {...register('party')}
              placeholder="e.g., ABC Corporation"
              error={errors.party?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Location
            </label>
            <Input
              {...register('startLocation')}
              placeholder="e.g., Delhi"
              error={errors.startLocation?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Location
            </label>
            <Input
              {...register('endLocation')}
              placeholder="e.g., Mumbai"
              error={errors.endLocation?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <Input
              {...register('startTime')}
              type="datetime-local"
              error={errors.startTime?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <Input
              {...register('endTime')}
              type="datetime-local"
              error={errors.endTime?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance (km)
            </label>
            <Input
              {...register('distance', { valueAsNumber: true })}
              type="number"
              placeholder="e.g., 150"
              error={errors.distance?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fare (₹)
            </label>
            <Input
              {...register('fare', { valueAsNumber: true })}
              type="number"
              placeholder="e.g., 5000"
              error={errors.fare?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense (₹)
            </label>
            <Input
              {...register('expense', { valueAsNumber: true })}
              type="number"
              placeholder="e.g., 500"
              error={errors.expense?.message}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Additional notes about the trip..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isLoading}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </div>
  );
}
