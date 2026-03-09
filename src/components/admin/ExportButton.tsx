'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Calendar, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import axios from 'axios';

interface ExportButtonProps {
  type: 'trips' | 'vendors';
  className?: string;
}

interface ExportFilters {
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function ExportButton({ type, className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({});

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const endpoint = type === 'trips' 
        ? `/admin/export/trips${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
        : '/admin/export/vendors';
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers,
          responseType: 'blob', // Important for file downloads
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on type and current date
      const currentDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${type}-export-${currentDate}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (key: keyof ExportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getButtonColor = () => {
    switch (type) {
      case 'trips':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'vendors':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className={`flex items-center gap-2 text-white ${getButtonColor()} transition-all duration-200 shadow-md hover:shadow-lg`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isExporting ? 'Exporting...' : `Export ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </span>
          <span className="sm:hidden">
            {isExporting ? '...' : type}
          </span>
          <Download className="w-4 h-4" />
        </Button>
        
        {type === 'trips' && (
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={`flex items-center gap-2 transition-all duration-200 ${
              showFilters ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        )}
      </div>

      {showFilters && type === 'trips' && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-96 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Export Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor ID
              </label>
              <input
                type="text"
                value={filters.vendorId || ''}
                onChange={(e) => handleFilterChange('vendorId', e.target.value)}
                placeholder="Enter vendor ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
