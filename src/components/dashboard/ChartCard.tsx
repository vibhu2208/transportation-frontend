'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white p-6 shadow-md transition-shadow duration-200 hover:shadow-lg',
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {description ? <p className="text-xs text-slate-500 mt-0.5">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="animate-in fade-in duration-300">{children}</div>
    </div>
  );
}
