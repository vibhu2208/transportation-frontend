'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TripForm } from './TripForm';
import { TripList } from './TripList';

export function TripManagement() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const handleCreateTrip = () => {
    setSelectedTrip(null);
    setShowForm(true);
  };

  const handleEditTrip = (trip: any) => {
    setSelectedTrip(trip);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTrip(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Trip Management</h1>
        <div className="flex items-center space-x-3">
          <Button onClick={handleCreateTrip}>
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Sync
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search trips by vehicle number, driver, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Trip Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {selectedTrip ? 'Edit Trip' : 'Create New Trip'}
                </h2>
                <Button variant="ghost" onClick={handleCloseForm}>
                  ×
                </Button>
              </div>
              <div className="p-6">
                <TripForm
                  trip={selectedTrip}
                  onSave={handleCloseForm}
                  onCancel={handleCloseForm}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trips List */}
      <TripList onEdit={handleEditTrip} searchTerm={searchTerm} />
    </div>
  );
}
