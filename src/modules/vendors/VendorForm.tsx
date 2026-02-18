'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  vendor?: any;
  onSave: () => void;
  onCancel: () => void;
}

export function VendorForm({ vendor, onSave, onCancel }: VendorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor || {
      isActive: true,
    },
  });

  const onSubmit = async (data: VendorFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      let response;
      if (vendor) {
        response = await api.patch(
          `/vendors/${vendor.id}`,
          data
        );
        toast.success('Vendor updated successfully!');
      } else {
        response = await api.post(
          '/vendors',
          data
        );
        
        // Show login credentials for new vendor
        const credentials = response.data.loginCredentials;
        toast.success(
          `Vendor created! Login: ${credentials.email} / ${credentials.password}`,
          { duration: 5000 }
        );
      }
      
      onSave();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save vendor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor Name *
          </label>
          <Input
            {...register('name')}
            error={errors.name?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <Input
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <Input
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <Input
            {...register('address')}
            error={errors.address?.message}
          />
        </div>

        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active Vendor
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
        
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
