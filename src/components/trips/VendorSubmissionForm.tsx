'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const vendorSubmissionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  partyName: z.string().min(1, 'Party name is required'),
  fromLocation: z.string().min(1, 'From location is required'),
  toLocation: z.string().min(1, 'To location is required'),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  initialExpense: z.number().optional(),
  advance: z.number().optional(),
  remarks: z.string().optional(),
});

type VendorSubmissionData = z.infer<typeof vendorSubmissionSchema>;

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
}

export function VendorSubmissionForm({ onSave, onCancel }: VendorSubmissionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VendorSubmissionData>({
    resolver: zodResolver(vendorSubmissionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0], // Default to today
    },
  });

  const onSubmit = async (data: VendorSubmissionData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post<VendorSubmissionResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/trips/vendor-submission`,
        data,
        { headers }
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
      toast.error(error.response?.data?.message || 'Failed to submit trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Trip Booking</h2>
        <p className="text-gray-600">Enter the basic trip details. Operations and billing information will be added later by the admin team.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Party Name *
            </label>
            <Input
              {...register('partyName')}
              error={errors.partyName?.message}
              placeholder="Customer or party name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Location *
            </label>
            <Input
              {...register('fromLocation')}
              error={errors.fromLocation?.message}
              placeholder="Starting location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Location *
            </label>
            <Input
              {...register('toLocation')}
              error={errors.toLocation?.message}
              placeholder="Destination location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Number *
            </label>
            <Input
              {...register('vehicleNumber')}
              error={errors.vehicleNumber?.message}
              placeholder="Vehicle registration number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
