'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Party } from '../parties/types';

type Props = {
  parties: Party[];
  partyId: string;
  onPartyIdChange: (id: string) => void;
  loading: boolean;
};

export function PartySection({ parties, partyId, onPartyIdChange, loading }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Party</h3>
      <p className="mt-1 text-xs text-slate-500">Select a party to load pending invoices and GR settlement lines.</p>
      <div className="mt-3 max-w-md">
        <Label>Party</Label>
        <Select
          value={partyId || '__none__'}
          onValueChange={(v) => onPartyIdChange(v === '__none__' ? '' : v)}
          disabled={loading}
        >
          <SelectTrigger className="mt-1.5 rounded-lg">
            <SelectValue placeholder={loading ? 'Loading…' : 'Search / select party'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {parties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
