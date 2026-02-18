'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VendorForm } from './VendorForm';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  totalTrips?: number;
  totalRevenue?: number;
}

interface VendorManagementProps {
  onEdit: (vendor: Vendor) => void;
}

export function VendorManagement({ onEdit }: VendorManagementProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('http://localhost:3005/vendors', { headers });
      const vendors = response.data;
      
      // Fetch stats for each vendor
      const vendorsWithStats = await Promise.all(
        vendors.map(async (vendor: any) => {
          try {
            const statsResponse = await axios.get(`http://localhost:3005/vendors/${vendor.id}/stats`, { headers });
            return {
              ...vendor,
              totalTrips: statsResponse.data.totalTrips,
              totalRevenue: statsResponse.data.totalRevenue,
            };
          } catch (error) {
            // If stats fail, return vendor with default values
            return {
              ...vendor,
              totalTrips: 0,
              totalRevenue: 0,
            };
          }
        })
      );
      
      setVendors(vendorsWithStats);
    } catch (error: any) {
      toast.error('Failed to fetch vendors');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVendor = () => {
    setSelectedVendor(null);
    setShowForm(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedVendor(null);
    fetchVendors();
  };

  const handleDelete = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`http://localhost:3005/vendors/${vendorId}`, { headers });
      toast.success('Vendor deleted successfully!');
      fetchVendors();
    } catch (error: any) {
      toast.error('Failed to delete vendor');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Vendor Management</h1>
        <Button onClick={handleCreateVendor}>
          <Plus className="mr-2 h-4 w-4" />
          New Vendor
        </Button>
      </div>

      {/* Vendor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
                </h2>
                <Button variant="ghost" onClick={handleCloseForm}>
                  ×
                </Button>
              </div>
              <div className="p-6">
                <VendorForm
                  vendor={selectedVendor}
                  onSave={handleCloseForm}
                  onCancel={handleCloseForm}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendors List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Mail className="h-4 w-4 mr-2" />
                      {vendor.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Phone className="h-4 w-4 mr-2" />
                      {vendor.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="h-4 w-4 mr-2" />
                      {vendor.address || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vendor.isActive 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-red-600 bg-red-50'
                    }`}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.totalTrips || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${vendor.totalRevenue ? vendor.totalRevenue.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVendor(vendor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {vendors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No vendors found</p>
          </div>
        )}
      </div>
    </div>
  );
}
