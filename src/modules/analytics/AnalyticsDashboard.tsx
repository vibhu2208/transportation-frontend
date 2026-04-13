'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Truck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { UserRole } from '@/types/auth';
import { StatCard } from '@/components/dashboard/StatCard';

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
      const userRaw = localStorage.getItem('user_data');
      const role = userRaw ? JSON.parse(userRaw).role : null;

      if (role === UserRole.ADMIN) {
        const { data } = await api.get('/admin/dashboard-stats');
        setStats({
          totalTrips: data.totalTrips ?? 0,
          completedTrips: data.completedTrips ?? 0,
          pendingTrips: data.pendingTrips ?? 0,
          totalVendors: data.totalVendors ?? 0,
          activeVendors: data.activeVendors ?? data.totalVendors ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
          totalDistance: 0,
          completionRate:
            data.totalTrips > 0
              ? ((data.completedTrips ?? 0) / data.totalTrips) * 100
              : 0,
        });
      } else {
        const { data } = await api.get('/analytics/dashboard');
        setStats({
          ...data,
          completionRate: data.completionRate ?? 0,
        });
      }
    } catch (error: any) {
      toast.error('Failed to fetch analytics data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Total Trips',
        value: String(stats.totalTrips),
        icon: Truck,
        tone: 'default' as const,
      },
      {
        title: 'Completed Trips',
        value: String(stats.completedTrips),
        icon: BarChart3,
        tone: 'success' as const,
      },
      {
        title: 'Pending Trips',
        value: String(stats.pendingTrips),
        icon: AlertCircle,
        tone: 'warning' as const,
      },
      {
        title: 'Total Vendors',
        value: String(stats.totalVendors),
        icon: Users,
        tone: 'default' as const,
      },
      {
        title: 'Active Vendors',
        value: String(stats.activeVendors),
        icon: TrendingUp,
        tone: 'default' as const,
      },
      {
        title: 'Total Revenue',
        value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
        icon: DollarSign,
        tone: 'success' as const,
        subtitle: 'From trip fare aggregate',
      },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCard
              key={i}
              title="—"
              value="—"
              icon={Truck}
              loading
            />
          ))}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <button
          type="button"
          onClick={fetchDashboardStats}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition hover:opacity-90"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={'subtitle' in stat ? stat.subtitle : undefined}
              icon={Icon}
              tone={stat.tone}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completion rate</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.completionRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${Math.min(100, stats.completionRate)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total distance</span>
              <span className="text-lg font-semibold text-gray-900">
                {stats.totalDistance.toLocaleString()} km
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Note</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Admins see counts from the admin dashboard service. For detailed financial KPIs, charts,
            and receivables, open the <strong>Overview</strong> tab on the admin dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
