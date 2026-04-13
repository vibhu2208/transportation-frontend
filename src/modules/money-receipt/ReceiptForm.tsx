'use client';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Branch, Bank } from './types';
import type { Party } from '../parties/types';
import { cn } from '@/lib/utils';

type PaymentAgainst = 'invoice' | 'on_account';

type Props = {
  receiptNo: string;
  onReceiptNoChange: (v: string) => void;
  receiptDate: string;
  onReceiptDateChange: (v: string) => void;
  branchId: string;
  onBranchIdChange: (v: string) => void;
  bankId: string;
  onBankIdChange: (v: string) => void;
  paymentMode: string;
  onPaymentModeChange: (v: string) => void;
  tdsPercent: string;
  onTdsPercentChange: (v: string) => void;
  tdsRound: boolean;
  onTdsRoundChange: (v: boolean) => void;
  defaultTds: boolean;
  onDefaultTdsChange: (v: boolean) => void;
  paymentAgainst: PaymentAgainst;
  onPaymentAgainstChange: (v: PaymentAgainst) => void;
  referenceNo: string;
  onReferenceNoChange: (v: string) => void;
  narration: string;
  onNarrationChange: (v: string) => void;
  branches: Branch[];
  banks: Bank[];
  parties: Party[];
  partyId: string;
  onPartyIdChange: (id: string) => void;
  partyLocked?: boolean;
  partyLoading?: boolean;
};

export function ReceiptForm({
  receiptNo,
  onReceiptNoChange,
  receiptDate,
  onReceiptDateChange,
  branchId,
  onBranchIdChange,
  bankId,
  onBankIdChange,
  paymentMode,
  onPaymentModeChange,
  tdsPercent,
  onTdsPercentChange,
  tdsRound,
  onTdsRoundChange,
  defaultTds,
  onDefaultTdsChange,
  paymentAgainst,
  onPaymentAgainstChange,
  referenceNo,
  onReferenceNoChange,
  narration,
  onNarrationChange,
  branches,
  banks,
  parties,
  partyId,
  onPartyIdChange,
  partyLocked = false,
  partyLoading = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">Money receipt no.</Label>
          <Input
            className="mt-1.5 rounded-lg font-mono text-sm"
            value={receiptNo}
            onChange={(e) => onReceiptNoChange(e.target.value)}
            placeholder="Auto if empty"
          />
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">Receipt date</Label>
          <Input
            type="date"
            className="mt-1.5 rounded-lg"
            value={receiptDate}
            onChange={(e) => onReceiptDateChange(e.target.value)}
          />
        </div>
        <div className="lg:col-span-4">
          <Label className="text-xs text-slate-600">Payment against</Label>
          <div className="mt-1.5 flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
            {(
              [
                { id: 'invoice' as const, label: 'Invoice' },
                { id: 'on_account' as const, label: 'On A/C' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPaymentAgainstChange(opt.id)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  paymentAgainst === opt.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">TDS %</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            className="mt-1.5 rounded-lg"
            value={tdsPercent}
            onChange={(e) => onTdsPercentChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col justify-end gap-2 lg:col-span-2 lg:flex-row lg:items-center lg:pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={tdsRound} onCheckedChange={(c) => onTdsRoundChange(c === true)} />
            TDS round
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={defaultTds} onCheckedChange={(c) => onDefaultTdsChange(c === true)} />
            Default
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-3">
          <Label className="text-xs text-slate-600">Branch</Label>
          <Select value={branchId || '__none__'} onValueChange={(v) => onBranchIdChange(v === '__none__' ? '' : v)}>
            <SelectTrigger className="mt-1.5 rounded-lg">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-5">
          <Label className="text-xs text-slate-600">Received with (party)</Label>
          <Select
            value={partyId || '__none__'}
            onValueChange={(v) => onPartyIdChange(v === '__none__' ? '' : v)}
            disabled={partyLoading || partyLocked}
          >
            <SelectTrigger className="mt-1.5 rounded-lg">
              <SelectValue placeholder={partyLoading ? 'Loading…' : 'Select party'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Select party —</SelectItem>
              {parties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">Cash / Bank</Label>
          <Select value={paymentMode} onValueChange={onPaymentModeChange}>
            <SelectTrigger className="mt-1.5 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="BANK">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">Bank account</Label>
          <Select
            value={bankId || '__none__'}
            onValueChange={(v) => onBankIdChange(v === '__none__' ? '' : v)}
            disabled={paymentMode !== 'BANK'}
          >
            <SelectTrigger className="mt-1.5 rounded-lg">
              <SelectValue placeholder={paymentMode === 'BANK' ? 'Select bank' : '—'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <Label className="text-xs text-slate-600">Reference / instrument no.</Label>
          <Input
            className="mt-1.5 rounded-lg"
            value={referenceNo}
            onChange={(e) => onReferenceNoChange(e.target.value)}
          />
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs text-slate-600">Narration</Label>
          <Textarea
            className="mt-1.5 min-h-[72px] resize-y rounded-lg text-sm"
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Overall notes for this money receipt"
          />
        </div>
      </div>
    </div>
  );
}
