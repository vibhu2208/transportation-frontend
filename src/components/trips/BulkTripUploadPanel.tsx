'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Download, Link2 } from 'lucide-react';

type VendorOption = { id: string; name: string };

type PreviewRow = {
  rowIndex: number;
  date: string | null;
  partyName: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  vehicleSuffix: string | null;
  freight: number | null;
  initialExpense: number | null;
  advance: number | null;
  errors: string[];
  apiErrors?: string[];
  resolvedVehicleNumber?: string;
  vehicleMatch?: 'pending' | 'unique' | 'none' | 'ambiguous';
  candidates?: { id: string; vehicleNumber: string }[];
};

type MatchBatchResponse = Record<string, { id: string; vehicleNumber: string }[]>;

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['DATE', 'PARTY NAME', 'FROM LOCATION', 'TO LOCATION', 'VEHICLE NO (last 4)', 'FREIGHT', 'EXP', 'ADV'],
    ['2026-04-08', 'SAMPLE PARTY', 'City A', 'City B', '1234', 10000, 500, 0],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trips');
  XLSX.writeFile(wb, 'bulk-trips-template.xlsx');
}

export function BulkTripUploadPanel({
  onTripsCreated,
  embedded,
}: {
  onTripsCreated?: () => void;
  /** When true, no outer card chrome (for accordion / collapsible parent). */
  embedded?: boolean;
}) {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{ completed: number; total: number } | null>(
    null,
  );
  const [rows, setRows] = useState<PreviewRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setVendorsLoading(true);
      try {
        const res = await api.get<VendorOption[]>('/vendors');
        setVendors(res.data ?? []);
      } catch {
        toast.error('Could not load vendors');
      } finally {
        setVendorsLoading(false);
      }
    };
    load();
  }, []);

  const mergePreview = useCallback((data: PreviewRow[]) => {
    setRows(
      data.map((r) => ({
        ...r,
        resolvedVehicleNumber: undefined,
        apiErrors: [],
        vehicleMatch: 'pending' as const,
        candidates: undefined,
      })),
    );
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!vendorId) {
      toast.error('Select a vendor first');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post<{ rows: PreviewRow[] }>('/trips/bulk-upload/preview', formData, {
        timeout: 300000,
        transformRequest: [
          (data, headers) => {
            if (data instanceof FormData) {
              delete headers['Content-Type'];
            }
            return data;
          },
        ],
      });
      mergePreview(res.data.rows);
      toast.success(`Loaded ${res.data.rows.length} row(s)`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : null;
      toast.error(typeof msg === 'string' ? msg : 'Failed to parse Excel');
    } finally {
      setUploading(false);
    }
  };

  const mapVehicles = async () => {
    if (rows.length === 0) {
      toast.error('Upload a file first');
      return;
    }
    const suffixes = rows.map((r) => r.vehicleSuffix).filter((s): s is string => !!s && s.length > 0);
    if (suffixes.length === 0) {
      toast.error('No vehicle suffixes to map');
      return;
    }
    setMapping(true);
    try {
      const res = await api.post<MatchBatchResponse>('/vehicles/match-suffix', { suffixes });
      const map = res.data;
      setRows((prev) =>
        prev.map((r) => {
          const suf = r.vehicleSuffix || '';
          const matches = map[suf] ?? [];
          if (matches.length === 1) {
            return {
              ...r,
              resolvedVehicleNumber: matches[0].vehicleNumber,
              vehicleMatch: 'unique',
              candidates: matches,
            };
          }
          if (matches.length === 0) {
            return {
              ...r,
              resolvedVehicleNumber: r.resolvedVehicleNumber || '',
              vehicleMatch: 'none',
              candidates: [],
            };
          }
          return {
            ...r,
            resolvedVehicleNumber: matches[0].vehicleNumber,
            vehicleMatch: 'ambiguous',
            candidates: matches,
          };
        }),
      );
      toast.success('Vehicle mapping updated. Resolve any ambiguous or missing rows.');
    } catch {
      toast.error('Failed to match vehicles');
    } finally {
      setMapping(false);
    }
  };

  const updateResolved = (rowIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, resolvedVehicleNumber: value.toUpperCase().replace(/\s+/g, ''), vehicleMatch: 'unique' }
          : r,
      ),
    );
  };

  const updateRowField = <K extends keyof PreviewRow>(rowIndex: number, key: K, value: PreviewRow[K]) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== rowIndex) return r;
        return { ...r, [key]: value };
      }),
    );
  };

  const getLiveErrors = (r: PreviewRow): string[] => {
    const errs: string[] = [];
    if (!r.date) errs.push('Missing DATE');
    if (!r.partyName?.trim()) errs.push('Missing PARTY NAME');
    if (!r.fromLocation?.trim()) errs.push('Missing FROM LOCATION');
    if (!r.toLocation?.trim()) errs.push('Missing TO LOCATION');
    if (!(r.resolvedVehicleNumber || '').trim()) errs.push('Missing FULL VEHICLE NO');
    if (r.vehicleMatch === 'none' && !(r.resolvedVehicleNumber || '').trim()) errs.push('No DB match for last 4');
    return errs;
  };

  const pickCandidate = (rowIndex: number, vehicleNumber: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, resolvedVehicleNumber: vehicleNumber, vehicleMatch: 'unique' }
          : r,
      ),
    );
  };

  const canCommit = useMemo(() => {
    if (!vendorId || rows.length === 0) return false;
    return rows.every((r) => {
      return getLiveErrors(r).length === 0;
    });
  }, [vendorId, rows]);

  const rowToPayload = (r: PreviewRow) => ({
    rowIndex: r.rowIndex,
    date: r.date as string,
    partyName: r.partyName as string,
    fromLocation: r.fromLocation as string,
    toLocation: r.toLocation as string,
    vehicleNumber: r.resolvedVehicleNumber as string,
    freight: r.freight ?? undefined,
    initialExpense: r.initialExpense ?? undefined,
    advance: r.advance ?? undefined,
  });

  const commit = async () => {
    if (!canCommit) return;
    const rowList = rows;
    const total = rowList.length;
    // ≤150 rows: one trip per request for accurate progress; larger: chunks of 25 to limit HTTP calls
    const chunkSize = total <= 150 ? 1 : 25;

    setCommitting(true);
    setBulkUploadProgress({ completed: 0, total });

    const created: { rowIndex: number; tripNo: string; tripId: string }[] = [];
    const failed: { rowIndex: number; message: string }[] = [];

    try {
      for (let start = 0; start < rowList.length; start += chunkSize) {
        const chunk = rowList.slice(start, start + chunkSize);
        const payload = {
          vendorId,
          rows: chunk.map(rowToPayload),
        };
        try {
          const res = await api.post<{
            created: { rowIndex: number; tripNo: string; tripId: string }[];
            failed: { rowIndex: number; message: string }[];
          }>('/trips/bulk-upload/commit', payload, {
            timeout: Math.max(120000, chunk.length * 15000),
          });
          const c = res.data?.created ?? [];
          const f = res.data?.failed ?? [];
          if (c.length) created.push(...c);
          if (f.length) failed.push(...f);
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
              : null;
          const message =
            typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Request failed';
          for (const r of chunk) {
            failed.push({ rowIndex: r.rowIndex, message });
          }
        }
        setBulkUploadProgress({ completed: Math.min(start + chunk.length, total), total });
      }

      if (created.length) {
        toast.success(`Created ${created.length} trip(s)`);
      }
      if (failed.length) {
        toast.error(`${failed.length} row(s) failed — see table`);
        setRows((prev) =>
          prev.map((r) => {
            const f = failed.find((x) => x.rowIndex === r.rowIndex);
            if (!f) return r;
            return { ...r, apiErrors: [...(r.apiErrors ?? []), f.message] };
          }),
        );
      } else {
        setRows([]);
        onTripsCreated?.();
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : null;
      toast.error(
        typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Bulk commit failed',
      );
    } finally {
      setCommitting(false);
      setBulkUploadProgress(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'rounded-xl border border-slate-200/80 bg-white p-4 shadow-md sm:p-6'}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {embedded ? (
          <p className="text-sm text-slate-600">
            Columns: DATE, PARTY NAME, FROM, TO, VEHICLE (last 4), FREIGHT, optional EXP / ADV.
          </p>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk upload (Excel)</h3>
            <p className="text-sm text-slate-600">
              Columns: DATE, PARTY NAME, FROM LOCATION, TO LOCATION, VEHICLE (last 4 digits), FREIGHT, optional EXP /
              ADV.
            </p>
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0 gap-2">
          <Download className="h-4 w-4" />
          Template
        </Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Vendor (all rows)</label>
          {vendors.length > 0 ? (
            <Select value={vendorId} onValueChange={setVendorId} disabled={committing}>
              <SelectTrigger>
                <SelectValue placeholder={vendorsLoading ? 'Loading…' : 'Select vendor'} />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-slate-500">No vendors. Add vendors under Settings.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Excel file</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            <Upload className="h-4 w-4 text-slate-500" />
            <span>{uploading ? 'Parsing…' : 'Choose .xlsx file'}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={uploading || committing} />
          </label>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={mapVehicles}
          disabled={mapping || committing || rows.length === 0}
          className="gap-2"
        >
          {mapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Map vehicles from DB
        </Button>
        <Button type="button" onClick={commit} disabled={!canCommit || committing} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create trips
        </Button>
      </div>

      {bulkUploadProgress && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/95 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-900">Uploading trips…</p>
              <p className="mt-0.5 text-sm text-emerald-800">
                <span className="font-semibold tabular-nums">{bulkUploadProgress.completed}</span>
                {' of '}
                <span className="tabular-nums">{bulkUploadProgress.total}</span>
                {' trips uploaded'}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${bulkUploadProgress.total ? (bulkUploadProgress.completed / bulkUploadProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Party</th>
                <th className="px-2 py-2">From</th>
                <th className="px-2 py-2">To</th>
                <th className="px-2 py-2">Last 4</th>
                <th className="px-2 py-2">Full vehicle</th>
                <th className="px-2 py-2">Match</th>
                <th className="px-2 py-2">Freight</th>
                <th className="px-2 py-2">Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rowIndex} className="border-b border-slate-100 align-top">
                  {(() => {
                    const issues = [...getLiveErrors(r), ...(r.apiErrors ?? [])];
                    return (
                      <>
                  <td className="px-2 py-2 tabular-nums">{r.rowIndex}</td>
                  <td className="px-2 py-2">
                    <Input
                      type="date"
                      className="h-8 min-w-[145px] text-xs"
                      value={r.date ?? ''}
                      onChange={(e) => updateRowField(r.rowIndex, 'date', e.target.value || null)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className="h-8 min-w-[150px] text-xs"
                      value={r.partyName ?? ''}
                      onChange={(e) => updateRowField(r.rowIndex, 'partyName', e.target.value || null)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className="h-8 min-w-[130px] text-xs"
                      value={r.fromLocation ?? ''}
                      onChange={(e) => updateRowField(r.rowIndex, 'fromLocation', e.target.value || null)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className="h-8 min-w-[130px] text-xs"
                      value={r.toLocation ?? ''}
                      onChange={(e) => updateRowField(r.rowIndex, 'toLocation', e.target.value || null)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className="h-8 w-24 font-mono text-xs"
                      value={r.vehicleSuffix ?? ''}
                      onChange={(e) => updateRowField(r.rowIndex, 'vehicleSuffix', e.target.value || null)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {r.vehicleMatch === 'ambiguous' && r.candidates && r.candidates.length > 0 ? (
                      <Select
                        value={r.resolvedVehicleNumber || ''}
                        onValueChange={(v) => pickCandidate(r.rowIndex, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pick vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {r.candidates.map((c) => (
                            <SelectItem key={c.id} value={c.vehicleNumber}>
                              {c.vehicleNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs font-mono uppercase"
                        value={r.resolvedVehicleNumber || ''}
                        placeholder="Full number"
                        onChange={(e) => updateResolved(r.rowIndex, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs capitalize text-slate-600">{r.vehicleMatch ?? '—'}</td>
                  <td className="px-2 py-2 tabular-nums">{r.freight ?? '—'}</td>
                  <td className="max-w-[200px] px-2 py-2 text-xs text-red-600">
                    {issues.join(' ')}
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
