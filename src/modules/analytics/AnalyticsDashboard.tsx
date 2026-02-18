'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Truck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalTrips: number;
  completedTrips: number;
  pendingTrips: number;
  totalVendors: number;
  activeVendors: number;
  totalRevenue: number;
  totalDistance: number;
  completionRate: number;
}

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/analytics/dashboard`, { headers });
      setStats(response.data);
    } catch (error: any) {
      toast.error('Failed to fetch analytics data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Trips',
      value: stats.totalTrips,
      icon: Truck,
      color: 'text-blue-600 bg-blue-50',
      change: '+12%',
    },
    {
      title: 'Completed Trips',
      value: stats.completedTrips,
      icon: BarChart3,
      color: 'text-green-600 bg-green-50',
      change: '+8%',
    },
    {
      title: 'Pending Trips',
      value: stats.pendingTrips,
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-50',
      change: '-3%',
    },
    {
      title: 'Total Vendors',
      value: stats.totalVendors,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
      change: '+5%',
    },
    {
      title: 'Active Vendors',
      value: stats.activeVendors,
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-50',
      change: '+2%',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
      change: '+15%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">{stat.change}</span>
                <span className="text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completion Rate</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.completionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${stats.completionRate}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Distance</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.totalDistance.toLocaleString()} km
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
              Generate Monthly Report
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
              Export Trip Data
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
              Vendor Performance Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
