'use client';

import { useState } from 'react';
import { VehicleAutocomplete } from '@/components/ui/VehicleAutocomplete';

export function VehicleAutocompleteDemo() {
  const [selectedVehicle, setSelectedVehicle] = useState('');

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <h2 className="text-xl font-semibold mb-4">Vehicle Number Autocomplete Demo</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Vehicle Number
          </label>
          <VehicleAutocomplete
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            placeholder="Type to search vehicles..."
          />
        </div>
        
        {selectedVehicle && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>Selected Vehicle:</strong> {selectedVehicle}
            </p>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <p><strong>Features:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>300ms debounced search</li>
            <li>Keyboard navigation (↑↓ arrows, Enter, Escape)</li>
            <li>Click to select</li>
            <li>Clear button when value is present</li>
            <li>Loading indicator during search</li>
            <li>Case-insensitive search</li>
          </ul>
        </div>
        
        <div className="text-xs text-gray-500">
          <p><strong>Try searching:</strong> UP83, NL01, UK06</p>
        </div>
      </div>
    </div>
  );
}
