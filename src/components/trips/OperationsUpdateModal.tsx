'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const operationsUpdateSchema = z.object({
  grLrNo: z.string().optional(),
  tollExpense: z.number().optional(),
});

type OperationsUpdateData = z.infer<typeof operationsUpdateSchema>;

interface OperationsUpdateModalProps {
  tripId: string;
  tripNo: string;
  currentData?: {
    grLrNo?: string;
    tollExpense?: number;
  };
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export function OperationsUpdateModal({ tripId, tripNo, currentData, onSave, onCancel, onBack }: OperationsUpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OperationsUpdateData>({
    resolver: zodResolver(operationsUpdateSchema),
    defaultValues: currentData || {},
  });

  const onSubmit = async (data: OperationsUpdateData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/trips/${tripId}/operations`,
        data,
        { headers }
      );
      
      toast.success('Operations fields updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('Operations update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update operations fields');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-2 sm:px-4 py-4 sm:py-8 flex items-start justify-center">
      <div className="relative my-auto p-4 sm:p-5 border w-full max-w-lg shadow-lg rounded-md bg-white max-h-[90dvh] overflow-y-auto">
        <div className="mt-0 sm:mt-1">
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
                <h3 className="text-lg font-medium text-gray-900">Update Operations Fields</h3>
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
                  GR / LR No
                </label>
                <Input
                  {...register('grLrNo')}
                  error={errors.grLrNo?.message}
                  placeholder="Goods Receipt / Lorry Receipt Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toll Expense
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('tollExpense', { valueAsNumber: true })}
                  error={errors.tollExpense?.message}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Operations Update
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      These fields will be used to calculate the total expense. 
                      The system will automatically recalculate profit/loss when freight information is available.
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
                {isLoading ? 'Updating...' : 'Update Operations'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
