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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shipper Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Shipper'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Create New Shipper</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
        <div className="py-8 text-center">Loading shippers...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {shippers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No shippers found. Create one to get started.
                  </td>
                </tr>
              ) : (
                shippers.map((shipper) => (
                  <tr key={shipper.id}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{shipper.name}</td>
                    <td className="whitespace-nowrap px-6 py-4">{shipper.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(shipper.id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Delete shipper"
                      >
                        <Trash2 className="inline h-4 w-4" />
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
