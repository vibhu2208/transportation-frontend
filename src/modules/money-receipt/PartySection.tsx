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
  partyLocked?: boolean;
  lockHint?: string;
};

export function PartySection({
  parties,
  partyId,
  onPartyIdChange,
  loading,
  partyLocked = false,
  lockHint,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Party</h3>
      <p className="mt-1 text-xs text-slate-500">
        Select a party or find an invoice (party is locked to that invoice&apos;s party).
      </p>
      {partyLocked && lockHint ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">{lockHint}</p>
      ) : null}
      <div className="mt-3 max-w-md">
        <Label>Party</Label>
        <Select
          value={partyId || '__none__'}
          onValueChange={(v) => onPartyIdChange(v === '__none__' ? '' : v)}
          disabled={loading || partyLocked}
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
