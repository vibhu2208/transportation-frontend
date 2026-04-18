'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileBadge, Search } from 'lucide-react';

/** Replace with API-backed rows when backend is ready */
export type VehicleDocumentKind =
  | 'rc'
  | 'fitness'
  | 'permit'
  | 'roadTax'
  | 'insurance'
  | 'puc';

export type VehicleDocumentExpiry = {
  /** ISO date string YYYY-MM-DD */
  expiryDate: string | null;
};

export type VehicleDocumentsRow = {
  vehicleNumber: string;
  documents: Record<VehicleDocumentKind, VehicleDocumentExpiry>;
};

const DOCUMENT_COLUMNS: Array<{ key: VehicleDocumentKind; label: string; hint: string }> = [
  { key: 'rc', label: 'RC', hint: 'Registration Certificate' },
  { key: 'fitness', label: 'Fitness', hint: 'Fitness Certificate' },
  { key: 'permit', label: 'Permit', hint: 'National / State Permit' },
  { key: 'roadTax', label: 'Road tax', hint: 'Road Tax' },
  { key: 'insurance', label: 'Insurance', hint: 'Comprehensive + Third Party' },
  { key: 'puc', label: 'PUC', hint: 'Pollution Under Control' },
];

function parseDayStart(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Calendar days from today (local) until expiry; negative if expired */
export function daysUntilExpiry(expiryIso: string | null): number | null {
  if (!expiryIso?.trim()) return null;
  const exp = parseDayStart(expiryIso.slice(0, 10));
  if (Number.isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

export type ExpiryTone = 'missing' | 'expired' | 'critical' | 'warning' | 'ok';

export function expiryTone(days: number | null): ExpiryTone {
  if (days === null) return 'missing';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

function severity(t: ExpiryTone): number {
  switch (t) {
    case 'ok':
      return 0;
    case 'warning':
      return 1;
    case 'critical':
      return 2;
    case 'missing':
      return 3;
    case 'expired':
      return 4;
    default:
      return 0;
  }
}

function formatInDate(iso: string | null): string {
  if (!iso) return '—';
  const d = parseDayStart(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function badgeClasses(tone: ExpiryTone): string {
  switch (tone) {
    case 'missing':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'critical':
      return 'border-amber-300 bg-amber-50 text-amber-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50/80 text-amber-900';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
}

function alertLabel(days: number | null, tone: ExpiryTone): string {
  if (tone === 'missing') return 'Missing';
  if (tone === 'expired') return days === null ? 'Expired' : `Expired ${Math.abs(days!)}d ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Dummy fleet — swap for API fetch */
const DUMMY_VEHICLE_DOCUMENTS: VehicleDocumentsRow[] = [
  {
    vehicleNumber: 'MH12 AB 1234',
    documents: {
      rc: { expiryDate: '2027-03-15' },
      fitness: { expiryDate: '2026-05-02' },
      permit: { expiryDate: '2026-04-25' },
      roadTax: { expiryDate: '2026-12-01' },
      insurance: { expiryDate: '2026-04-20' },
      puc: { expiryDate: '2026-06-10' },
    },
  },
  {
    vehicleNumber: 'DL 01 CD 9087',
    documents: {
      rc: { expiryDate: '2028-01-10' },
      fitness: { expiryDate: '2026-04-17' },
      permit: { expiryDate: '2026-03-01' },
      roadTax: { expiryDate: '2026-09-30' },
      insurance: { expiryDate: '2026-11-05' },
      puc: { expiryDate: null },
    },
  },
  {
    vehicleNumber: 'KA 03 EF 4455',
    documents: {
      rc: { expiryDate: '2026-08-22' },
      fitness: { expiryDate: '2025-11-01' },
      permit: { expiryDate: '2027-02-28' },
      roadTax: { expiryDate: '2026-04-18' },
      insurance: { expiryDate: '2026-04-18' },
      puc: { expiryDate: '2026-05-01' },
    },
  },
  {
    vehicleNumber: 'TN 09 GH 7721',
    documents: {
      rc: { expiryDate: '2029-04-01' },
      fitness: { expiryDate: '2026-07-14' },
      permit: { expiryDate: '2026-04-28' },
      roadTax: { expiryDate: '2027-03-31' },
      insurance: { expiryDate: '2026-12-20' },
      puc: { expiryDate: '2026-04-10' },
    },
  },
];

export function VehicleDocumentsPanel() {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUMMY_VEHICLE_DOCUMENTS;
    return DUMMY_VEHICLE_DOCUMENTS.filter((r) => r.vehicleNumber.toLowerCase().includes(q));
  }, [query]);

  const worstToneForRow = (row: VehicleDocumentsRow): ExpiryTone => {
    let worst: ExpiryTone = 'ok';
    for (const col of DOCUMENT_COLUMNS) {
      const days = daysUntilExpiry(row.documents[col.key]?.expiryDate ?? null);
      const tone = expiryTone(days);
      if (severity(tone) > severity(worst)) worst = tone;
    }
    return worst;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <FileBadge className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Vehicle documents</h2>
              <p className="mt-1 text-sm text-slate-600">
                Per-truck expiry tracking (dummy data). Connect your API later to populate RC, fitness, permits, tax,
                insurance, and PUC.
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search vehicle number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-emerald-100 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" /> OK (&gt; 30 days)
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Due soon (≤ 30 days)
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 font-medium text-amber-950">
            <AlertTriangle className="h-3.5 w-3.5" /> Urgent (≤ 7 days)
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-900">
            Expired / missing
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/95 px-4 py-3 font-semibold text-slate-900 backdrop-blur-sm">
                  Vehicle
                </th>
                {DOCUMENT_COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-3 font-semibold text-slate-900">
                    <span className="block">{col.label}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{col.hint}</span>
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-slate-900">Fleet alert</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={DOCUMENT_COLUMNS.length + 2} className="px-4 py-10 text-center text-slate-500">
                    No vehicles match your search.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const fleetAlert = worstToneForRow(row);
                  return (
                    <tr key={row.vehicleNumber} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="sticky left-0 z-10 border-r border-slate-100 bg-white/95 px-4 py-3 font-semibold text-slate-900 backdrop-blur-sm">
                        {row.vehicleNumber}
                      </td>
                      {DOCUMENT_COLUMNS.map((col) => {
                        const exp = row.documents[col.key]?.expiryDate ?? null;
                        const days = daysUntilExpiry(exp);
                        const tone = expiryTone(days);
                        return (
                          <td key={col.key} className="align-top px-3 py-3 text-slate-800">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium">{formatInDate(exp)}</span>
                              <span
                                className={`inline-flex w-fit max-w-[9.5rem] rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-tight ${badgeClasses(tone)}`}
                              >
                                {alertLabel(days, tone)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="align-top px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${badgeClasses(fleetAlert)}`}
                        >
                          {fleetAlert === 'ok'
                            ? 'All clear'
                            : fleetAlert === 'warning'
                              ? 'Review upcoming'
                              : fleetAlert === 'critical'
                                ? 'Action needed'
                                : fleetAlert === 'expired'
                                  ? 'Expired doc on file'
                                  : 'Data incomplete'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
