'use client';

import { Lightbulb } from 'lucide-react';

export function InsightsCard({
  insights,
  loading,
}: {
  insights: string[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-md animate-pulse">
        <div className="h-5 w-40 rounded bg-amber-100/80" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-white to-white p-6 shadow-md">
      <div className="flex items-center gap-2 text-amber-900">
        <Lightbulb className="h-5 w-5 shrink-0" />
        <h3 className="text-base font-semibold">Business insights</h3>
      </div>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
        {insights.length === 0 ? (
          <li className="text-slate-500">Adjust filters or add more trip/invoice data to see insights.</li>
        ) : (
          insights.map((line, i) => (
            <li key={i} className="flex gap-2 leading-snug">
              <span className="text-amber-600 font-bold mt-0.5">•</span>
              <span>{line}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
