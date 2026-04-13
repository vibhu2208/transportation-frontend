'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  startOfToday,
} from 'date-fns';
import {
  Truck,
  Users,
  UserCircle,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  Percent,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { partiesApi } from '@/modules/parties/api';
import type { Party } from '@/modules/parties/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { InsightsCard } from '@/components/dashboard/InsightsCard';
import { Button } from '@/components/ui/Button';

export type DashboardStats = {
  totalTrips: number;
  pendingTrips: number;
  completedTrips: number;
  totalVendors: number;
  totalUsers: number;
  totalRevenue?: number;
};

export type FinancialOverview = {
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    netProfitFromTripField: number | null;
    profitMarginPct: number;
    pendingReceivables: number;
    vendorPayablesEstimate: number;
    collectionRatePct: number | null;
  };
  cashflow: {
    totalPending: number;
    overdueAmount: number;
    upcomingWithin14Days: number;
    agingBuckets: { d0_30: number; d31_60: number; d61Plus: number };
    receivableDueDaysAssumption: number;
  };
  charts: {
    timeSeries: Array<{
      date: string;
      revenue: number;
      expenses: number;
      tripCount: number;
    }>;
    statusDistribution: Array<{ status: string; count: number }>;
    topCompaniesByInvoiceRevenue: Array<{
      partyKey: string;
      partyName: string;
      revenue: number;
      pctOfInvoiceRevenue: number;
    }>;
    topVendorsByExpense: Array<{
      vendorId: string;
      vendorName: string;
      expense: number;
    }>;
  };
  tables: {
    topCompanies: Array<{
      partyKey: string;
      partyName: string;
      totalTrips: number;
      revenueContributionPct: number;
      freightTotal: number;
    }>;
    recentTransactions: Array<{
      tripId: string;
      party: string;
      amount: number;
      tripStatus: string;
      paymentStatus: string;
    }>;
  };
  insights: string[];
  meta: { tripCount: number; invoicePeriodBilledTotal: number };
};

const PIE_COLORS = ['#059669', '#0ea5e9', '#d97706', '#7c3aed', '#64748b', '#dc2626'];

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

type DatePreset = 'today' | 'week' | 'month' | 'all';

type VendorOpt = { id: string; name: string };

export function AdminDashboardOverview({
  refreshTrigger,
  onOpenTrips,
  onOpenVendors,
  onOpenParties,
}: {
  refreshTrigger: number;
  onOpenTrips: () => void;
  onOpenVendors: () => void;
  onOpenParties: () => void;
}) {
  const [preset, setPreset] = useState<DatePreset>('month');
  const [vendorId, setVendorId] = useState<string>('');
  const [partyId, setPartyId] = useState<string>('');
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [financial, setFinancial] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === 'all') return { start: undefined as string | undefined, end: undefined as string | undefined };
    if (preset === 'today') {
      return {
        start: format(startOfToday(), 'yyyy-MM-dd'),
        end: format(endOfDay(now), 'yyyy-MM-dd'),
      };
    }
    if (preset === 'week') {
      return {
        start: format(startOfDay(subDays(now, 6)), 'yyyy-MM-dd'),
        end: format(endOfDay(now), 'yyyy-MM-dd'),
      };
    }
    return {
      start: format(startOfDay(subDays(now, 29)), 'yyyy-MM-dd'),
      end: format(endOfDay(now), 'yyyy-MM-dd'),
    };
  }, [preset]);

  const loadFilters = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [vRes, pRes] = await Promise.all([
        api.get('/vendors', { headers }),
        partiesApi.getParties(),
      ]);
      setVendors((vRes.data ?? []).map((v: VendorOpt) => ({ id: v.id, name: v.name })));
      setParties(pRes ?? []);
    } catch {
      setVendors([]);
      setParties([]);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (range.start) params.set('startDate', range.start);
      if (range.end) params.set('endDate', range.end);
      if (vendorId) params.set('vendorId', vendorId);
      if (partyId) params.set('partyId', partyId);

      const q = params.toString();
      const [statsRes, finRes] = await Promise.all([
        api.get('/admin/dashboard-stats', { headers }),
        api.get(`/admin/financial-overview${q ? `?${q}` : ''}`, { headers }),
      ]);
      setStats(statsRes.data);
      setFinancial(finRes.data);
    } catch (e: unknown) {
      console.error(e);
      const err = e as { response?: { status?: number }; config?: { url?: string } };
      if (
        err.response?.status === 404 &&
        (err.config?.url?.includes('financial-overview') ?? false)
      ) {
        toast.error(
          'Financial overview API missing (404). Restart the Nest server (transporation-backend) on port 3000 after npm run build — your running API is an older build.',
          { duration: 8000 },
        );
      }
      setStats(null);
      setFinancial(null);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end, vendorId, partyId]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshTrigger]);

  const pieData = useMemo(
    () =>
      (financial?.charts.statusDistribution ?? []).map((s) => ({
        name: s.status,
        value: s.count,
      })),
    [financial],
  );

  const statusSummary = useMemo(() => {
    if (!stats) return { completed: 0, pending: 0, rate: 0 };
    const total = stats.totalTrips || 1;
    return {
      completed: stats.completedTrips,
      pending: stats.pendingTrips,
      rate: Math.round((stats.completedTrips / total) * 100),
    };
  }, [stats]);

  return (
    <div className="space-y-10 pb-10">
      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-md sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="text-xs font-medium text-slate-500">Period</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(
              [
                ['today', 'Today'],
                ['week', '7 days'],
                ['month', '30 days'],
                ['all', 'All time'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  preset === key
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full sm:min-w-[160px] sm:max-w-xs">
          <label className="text-xs font-medium text-slate-500">Vendor</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:min-w-[160px] sm:max-w-xs">
          <label className="text-xs font-medium text-slate-500">Party</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
          >
            <option value="">All parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="secondary" onClick={fetchAll} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Row 1 — operational */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Operations
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total trips"
            value={loading ? '—' : String(stats?.totalTrips ?? 0)}
            subtitle="In scope of dashboard analytics"
            icon={Truck}
            loading={loading}
          />
          <StatCard
            title="Active vendors"
            value={loading ? '—' : String(stats?.totalVendors ?? 0)}
            subtitle="Registered carriers"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="System users"
            value={loading ? '—' : String(stats?.totalUsers ?? 0)}
            subtitle="All roles"
            icon={UserCircle}
            loading={loading}
          />
          <StatCard
            title="Trip revenue (freight)"
            value={loading ? '—' : inr(financial?.kpis.totalRevenue ?? 0)}
            subtitle={`${financial?.meta.tripCount ?? 0} trips in filter · Billed (invoices): ${inr(financial?.meta.invoicePeriodBilledTotal ?? 0)}`}
            icon={IndianRupee}
            loading={loading}
            tone="success"
          />
        </div>
      </section>

      {/* Row 2 — financial KPIs */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Financial KPIs
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Net profit"
            value={loading ? '—' : inr(financial?.kpis.netProfit ?? 0)}
            subtitle="Freight − trip-reported costs"
            icon={(financial?.kpis.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown}
            loading={loading}
            tone={(financial?.kpis.netProfit ?? 0) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            title="Total expenses"
            value={loading ? '—' : inr(financial?.kpis.totalExpenses ?? 0)}
            subtitle="Expense + toll + initial + advance"
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            title="Pending (receivables)"
            value={loading ? '—' : inr(financial?.kpis.pendingReceivables ?? 0)}
            subtitle="Outstanding on invoices"
            icon={CreditCard}
            loading={loading}
            tone="warning"
          />
          <StatCard
            title="Payables (est.)"
            value={loading ? '—' : inr(financial?.kpis.vendorPayablesEstimate ?? 0)}
            subtitle="Same as trip costs — no separate vendor ledger"
            icon={PiggyBank}
            loading={loading}
          />
          <StatCard
            title="Profit margin"
            value={loading ? '—' : `${financial?.kpis.profitMarginPct ?? 0}%`}
            subtitle="Net profit / freight revenue"
            icon={Percent}
            loading={loading}
          />
          <StatCard
            title="Collection rate"
            value={
              loading
                ? '—'
                : financial?.kpis.collectionRatePct != null
                  ? `${financial.kpis.collectionRatePct}%`
                  : '—'
            }
            subtitle="Collected / billed (invoices in period)"
            icon={Activity}
            loading={loading}
          />
        </div>
      </section>

      {/* Cashflow strip */}
      <section className="rounded-xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-md">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Pending & cashflow
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Total pending</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {loading ? '—' : inr(financial?.cashflow.totalPending ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Overdue (past due assumption)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-400">
              {loading ? '—' : inr(financial?.cashflow.overdueAmount ?? 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Due {financial?.cashflow.receivableDueDaysAssumption ?? 30} days from invoice date
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Upcoming (14 days)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
              {loading ? '—' : inr(financial?.cashflow.upcomingWithin14Days ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Aging — 0–30 / 31–60 / 61+</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-200">
              {loading
                ? '—'
                : `${inr(financial?.cashflow.agingBuckets.d0_30 ?? 0)} · ${inr(financial?.cashflow.agingBuckets.d31_60 ?? 0)} · ${inr(financial?.cashflow.agingBuckets.d61Plus ?? 0)}`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <ChartCard
            title="Revenue vs expenses"
            description="Daily freight vs trip-reported costs"
          >
            {loading ? (
              <div className="h-[280px] animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={financial?.charts.timeSeries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Trips over time" description="Daily trip count">
            {loading ? (
              <div className="h-[260px] animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={financial?.charts.timeSeries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tripCount" name="Trips" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Top companies by billed revenue" description="Invoice totals in period">
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={(financial?.charts.topCompaniesByInvoiceRevenue ?? []).slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <YAxis type="category" dataKey="partyName" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Top vendors by expense" description="Trip-reported costs in period">
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={(financial?.charts.topVendorsByExpense ?? []).slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <YAxis type="category" dataKey="vendorName" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Bar dataKey="expense" name="Expense" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>

        <div className="space-y-6">
          <ChartCard title="Trip status" description="Distribution in filter">
            {loading ? (
              <div className="h-[260px] animate-pulse rounded-lg bg-slate-100" />
            ) : pieData.length === 0 ? (
              <p className="text-sm text-slate-500 py-12 text-center">No trips in range</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <InsightsCard insights={financial?.insights ?? []} loading={loading} />

          <ChartCard title="Completion rate" description="Across all trips (dashboard stats)">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Completed</span>
                <span className="font-semibold text-slate-900">{statusSummary.completed}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${statusSummary.rate}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {statusSummary.rate}% completion · {statusSummary.pending} pending
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button type="button" className="w-full" onClick={onOpenTrips}>
                  View all trips
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={onOpenVendors}>
                  Manage vendors
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={onOpenParties}>
                  Manage parties
                </Button>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-md">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Top companies</h3>
          <div className="md:hidden space-y-2">
            {(financial?.tables.topCompanies ?? []).slice(0, 10).map((row) => (
              <div
                key={row.partyKey}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
              >
                <span className="min-w-0 font-medium text-slate-800 truncate">{row.partyName}</span>
                <span className="shrink-0 tabular-nums text-slate-600">
                  {row.totalTrips} trips · {row.revenueContributionPct}%
                </span>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto table-scroll-bleed -mx-4 sm:mx-0">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 sticky top-0 z-10 bg-white">
                  <th className="pb-2 pr-2">Company</th>
                  <th className="pb-2 pr-2">Trips</th>
                  <th className="pb-2">Rev. %</th>
                </tr>
              </thead>
              <tbody>
                {(financial?.tables.topCompanies ?? []).slice(0, 10).map((row) => (
                  <tr key={row.partyKey} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 font-medium text-slate-800">{row.partyName}</td>
                    <td className="py-2 pr-2 tabular-nums">{row.totalTrips}</td>
                    <td className="py-2 tabular-nums">{row.revenueContributionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-md">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Recent transactions</h3>
          <div className="md:hidden space-y-2">
            {(financial?.tables.recentTransactions ?? []).map((row, i) => (
              <div
                key={`${row.tripId}-${i}`}
                className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-slate-700">{row.tripId}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : row.paymentStatus === 'Partial'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {row.paymentStatus}
                  </span>
                </div>
                <p className="mt-1 text-slate-700">{row.party}</p>
                <p className="mt-1 tabular-nums font-medium text-slate-900">{inr(row.amount)}</p>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto table-scroll-bleed -mx-4 sm:mx-0">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 sticky top-0 z-10 bg-white">
                  <th className="pb-2 pr-2">Trip</th>
                  <th className="pb-2 pr-2">Party</th>
                  <th className="pb-2 pr-2">Amount</th>
                  <th className="pb-2">Pay status</th>
                </tr>
              </thead>
              <tbody>
                {(financial?.tables.recentTransactions ?? []).map((row, i) => (
                  <tr key={`${row.tripId}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{row.tripId}</td>
                    <td className="py-2 pr-2">{row.party}</td>
                    <td className="py-2 pr-2 tabular-nums">{inr(row.amount)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.paymentStatus === 'Partial'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
