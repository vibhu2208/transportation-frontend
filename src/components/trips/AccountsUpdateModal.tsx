'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const accountsUpdateSchema = z.object({
  freight: z.number().optional(),
  billNo: z.string().optional(),
  billDate: z.string().optional(),
});

type AccountsUpdateData = z.infer<typeof accountsUpdateSchema>;

interface AccountsUpdateModalProps {
  tripId: string;
  tripNo: string;
  currentData?: {
    freight?: number;
    billNo?: string;
    billDate?: string;
  };
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export function AccountsUpdateModal({ tripId, tripNo, currentData, onSave, onCancel, onBack }: AccountsUpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountsUpdateData>({
    resolver: zodResolver(accountsUpdateSchema),
    defaultValues: currentData || {},
  });

  const onSubmit = async (data: AccountsUpdateData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/trips/${tripId}/accounts`,
        data,
        { headers }
      );
      
      toast.success('Accounts fields updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('Accounts update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update accounts fields');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-400 hover:text-gray-600"
                  title="Back to trip details"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Update Accounts Fields</h3>
                <p className="text-sm text-gray-500">Trip: {tripNo}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Freight
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('freight', { valueAsNumber: true })}
                  error={errors.freight?.message}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill No
                </label>
                <Input
                  {...register('billNo')}
                  error={errors.billNo?.message}
                  placeholder="Bill/Invoice Number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date
                </label>
                <Input
                  type="date"
                  {...register('billDate')}
                  error={errors.billDate?.message}
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Accounts Update
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Adding freight information will automatically trigger profit/loss calculation. 
                      The system will calculate: Profit/Loss = Freight - Total Expense - Advance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Accounts'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
