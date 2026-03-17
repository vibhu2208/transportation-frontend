'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { shipperApi } from '@/lib/api-client';
import { User } from '@/types/auth';
import { Plus, Trash2 } from 'lucide-react';

export default function ShipperManagement() {
  const [shippers, setShippers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    loadShippers();
  }, []);

  const loadShippers = async () => {
    try {
      setLoading(true);
      const data = await shipperApi.getAll();
      setShippers(data);
    } catch (error) {
      console.error('Failed to load shippers:', error);
      alert('Failed to load shippers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shipperApi.create(formData);
      alert('Shipper created successfully');
      setShowForm(false);
      setFormData({ name: '', email: '', password: '' });
      loadShippers();
    } catch (error: any) {
      console.error('Failed to create shipper:', error);
      alert(error.response?.data?.message || 'Failed to create shipper');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipper?')) return;
    
    try {
      await shipperApi.delete(id);
      alert('Shipper deleted successfully');
      loadShippers();
    } catch (error) {
      console.error('Failed to delete shipper:', error);
      alert('Failed to delete shipper');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Shipper Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Shipper'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Shipper</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full">
              Create Shipper
            </Button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading shippers...</div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shippers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No shippers found. Create one to get started.
                  </td>
                </tr>
              ) : (
                shippers.map((shipper) => (
                  <tr key={shipper.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {shipper.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shipper.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(shipper.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
