'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export type GrInvoiceUnlockOverlayProps = {
  open: boolean;
  passcode: string;
  onPasscodeChange: (value: string) => void;
  /** Called when user clicks Unlock; parent validates and sets unlocked state */
  onUnlock: () => void;
  /** Leave without unlocking (e.g. close GR modal) */
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  unlockButtonLabel?: string;
  cancelButtonLabel?: string;
};

export function GrInvoiceUnlockOverlay({
  open,
  passcode,
  onPasscodeChange,
  onUnlock,
  onCancel,
  title = 'Invoice linked to this trip',
  subtitle = 'This trip already has an invoice. Enter the passcode to enable editing.',
  unlockButtonLabel = 'Unlock',
  cancelButtonLabel = 'Go back',
}: GrInvoiceUnlockOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gr-unlock-title"
      aria-describedby="gr-unlock-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)]">
        <div className="border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-slate-50 px-6 pb-5 pt-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/90 text-amber-800 shadow-inner ring-1 ring-amber-200/60">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 id="gr-unlock-title" className="text-center text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <p id="gr-unlock-desc" className="mt-2 text-center text-sm leading-relaxed text-slate-600">
            {subtitle}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="gr-invoice-passcode" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Passcode
            </label>
            <Input
              ref={inputRef}
              id="gr-invoice-passcode"
              type="password"
              autoComplete="off"
              value={passcode}
              onChange={(e) => onPasscodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onUnlock();
                }
              }}
              placeholder="Enter passcode"
              className="h-11 w-full border-slate-200 bg-slate-50/80 text-base focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
              {cancelButtonLabel}
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={onUnlock}>
              {unlockButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
