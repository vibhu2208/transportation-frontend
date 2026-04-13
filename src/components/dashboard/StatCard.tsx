'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  loading?: boolean;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  trendLabel?: string;
};

const toneRing: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-slate-50 text-slate-700 ring-slate-200/80',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  danger: 'bg-red-50 text-red-700 ring-red-200/80',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200/80',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  tone = 'default',
  trendLabel,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-md animate-pulse">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="mt-4 h-9 w-36 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group rounded-xl border border-slate-200/80 bg-white p-6 shadow-md',
        'transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 leading-snug">{subtitle}</p>
          ) : null}
          {trendLabel ? <p className="mt-2 text-xs font-medium text-slate-600">{trendLabel}</p> : null}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105',
            toneRing[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
