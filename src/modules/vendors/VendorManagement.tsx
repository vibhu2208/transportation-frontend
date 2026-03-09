'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VendorForm } from './VendorForm';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

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
      
      const response = await api.get('/vendors');
      const vendors = response.data;
      
      // Fetch stats for each vendor
      const vendorsWithStats = await Promise.all(
        vendors.map(async (vendor: any) => {
          try {
            const statsResponse = await api.get(`/vendors/${vendor.id}/stats`);
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
      
      await api.delete(`/vendors/${vendorId}`);
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
        <h2 className="text-2xl font-semibold text-foreground">Vendor Management</h2>
        <Button onClick={handleCreateVendor}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Vendor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">
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

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">{vendor.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{vendor.email}</p>
                {vendor.phone && (
                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-1" />
                    {vendor.phone}
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {vendor.address}
                  </div>
                )}
              </div>
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
                  className="text-destructive hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Trips</span>
                  <div className="font-semibold text-primary">{vendor.totalTrips || 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue</span>
                  <div className="font-semibold text-primary">₹{(vendor.totalRevenue || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                vendor.isActive 
                  ? 'bg-primary-100 text-primary-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">No vendors found</div>
          <p className="mt-2 text-sm text-muted-foreground">Create your first vendor to get started</p>
        </div>
      )}
    </div>
  );
}
