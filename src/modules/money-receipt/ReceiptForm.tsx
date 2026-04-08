'use client';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Branch, Bank } from './types';

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
  referenceNo: string;
  onReferenceNoChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  branches: Branch[];
  banks: Bank[];
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
  referenceNo,
  onReferenceNoChange,
  notes,
  onNotesChange,
  branches,
  banks,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label>Receipt number</Label>
        <Input
          className="mt-1.5 rounded-lg"
          value={receiptNo}
          onChange={(e) => onReceiptNoChange(e.target.value)}
          placeholder="Auto if empty"
        />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          className="mt-1.5 rounded-lg"
          value={receiptDate}
          onChange={(e) => onReceiptDateChange(e.target.value)}
        />
      </div>
      <div>
        <Label>Branch</Label>
        <Select value={branchId || '__none__'} onValueChange={(v) => onBranchIdChange(v === '__none__' ? '' : v)}>
          <SelectTrigger className="mt-1.5 rounded-lg">
            <SelectValue placeholder="Select branch" />
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
      <div>
        <Label>Payment mode</Label>
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
      <div>
        <Label>Bank</Label>
        <Select
          value={bankId || '__none__'}
          onValueChange={(v) => onBankIdChange(v === '__none__' ? '' : v)}
          disabled={paymentMode !== 'BANK'}
        >
          <SelectTrigger className="mt-1.5 rounded-lg">
            <SelectValue placeholder={paymentMode === 'BANK' ? 'Select bank' : 'N/A'} />
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
      <div>
        <Label>TDS %</Label>
        <Input
          type="number"
          min={0}
          step={0.01}
          className="mt-1.5 rounded-lg"
          value={tdsPercent}
          onChange={(e) => onTdsPercentChange(e.target.value)}
        />
      </div>
      <div className="flex items-end gap-2 pb-2">
        <Checkbox id="tdsRound" checked={tdsRound} onCheckedChange={(c) => onTdsRoundChange(c === true)} />
        <Label htmlFor="tdsRound" className="cursor-pointer font-normal">
          TDS round to rupee
        </Label>
      </div>
      <div className="sm:col-span-2">
        <Label>Reference no.</Label>
        <Input
          className="mt-1.5 rounded-lg"
          value={referenceNo}
          onChange={(e) => onReferenceNoChange(e.target.value)}
        />
      </div>
      <div className="lg:col-span-3">
        <Label>Notes</Label>
        <Input className="mt-1.5 rounded-lg" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
      </div>
    </div>
  );
}
