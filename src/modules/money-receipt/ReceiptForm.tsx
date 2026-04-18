'use client';

import { createPortal } from 'react-dom';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
import { Badge } from '@/components/ui/badge';
import type { Branch, Bank } from './types';
import { moneyReceiptApi } from './api';
import type { Party } from '../parties/types';
import { cn } from '@/lib/utils';

function normalizeBankLast4(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '').slice(0, 4);
}

function formatBankOptionLabel(b: Bank): string {
  const last = normalizeBankLast4(b.accountLast4);
  if (last) return `${b.name} · …${last}`;
  return b.name;
}

/** Secondary line for party picker (GSTIN, phone, ledger-style balance when present). */
function partySecondaryLine(p: Party): string | null {
  const parts: string[] = [];
  const gst = p.gstIn?.trim();
  if (gst) parts.push(`GST ${gst}`);
  const phone = p.phone?.trim();
  if (phone) parts.push(phone);
  if (p.remainingBalance != null && Number.isFinite(p.remainingBalance)) {
    parts.push(
      `Outstanding ₹${p.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  }
  return parts.length ? parts.join(' · ') : null;
}

function bankMatches(b: Bank, name: string, last4Digits: string): boolean {
  return (
    b.name.trim().toLowerCase() === name.trim().toLowerCase() &&
    normalizeBankLast4(b.accountLast4) === last4Digits
  );
}

/** Anchor dropdown to viewport with fixed positioning so overflow-x on parents cannot clip or squash it. */
function useFixedDropdownBelow(
  anchorRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  options?: { maxHeight?: string; minWidth?: number },
): CSSProperties | null {
  const maxHeight = options?.maxHeight ?? 'min(18rem, calc(100vh - 6rem))';
  const minW = options?.minWidth ?? 240;
  const [style, setStyle] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) {
        setStyle(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, minW),
        zIndex: 10000,
        maxHeight,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, maxHeight, minW]);
  return style;
}

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
  /** Called after a new branch is created via Add (same as GR form). */
  onBranchCreated?: (branch: Branch) => void;
  /** Called after a new bank account is created via Add. */
  onBankCreated?: (bank: Bank) => void;
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
  onBranchCreated,
  onBankCreated,
}: Props) {
  const [branchInput, setBranchInput] = useState('');
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [activeBranchSuggestionIndex, setActiveBranchSuggestionIndex] = useState(-1);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const branchBoxRef = useRef<HTMLDivElement | null>(null);

  const [bankNameInput, setBankNameInput] = useState('');
  const [bankLast4Input, setBankLast4Input] = useState('');
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [activeBankSuggestionIndex, setActiveBankSuggestionIndex] = useState(-1);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const bankBoxRef = useRef<HTMLDivElement | null>(null);
  const partyBoxRef = useRef<HTMLDivElement | null>(null);
  const branchMenuRef = useRef<HTMLDivElement | null>(null);
  const bankMenuRef = useRef<HTMLDivElement | null>(null);
  const partyMenuRef = useRef<HTMLDivElement | null>(null);

  const [partyInput, setPartyInput] = useState('');
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [activePartySuggestionIndex, setActivePartySuggestionIndex] = useState(-1);

  const filteredBranchSuggestions = useMemo(() => {
    const q = branchInput.trim().toLowerCase();
    if (!q) return branches.slice(0, 8);
    return branches.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [branchInput, branches]);

  const filteredBankSuggestions = useMemo(() => {
    const qName = bankNameInput.trim().toLowerCase();
    const qLast = bankLast4Input.replace(/\D/g, '');
    if (!qName && !qLast) return banks.slice(0, 8);
    return banks
      .filter((b) => {
        const nameOk = !qName || b.name.toLowerCase().includes(qName);
        const last = normalizeBankLast4(b.accountLast4);
        const lastOk = !qLast || last.includes(qLast);
        return nameOk && lastOk;
      })
      .slice(0, 8);
  }, [bankNameInput, bankLast4Input, banks]);

  const sortedParties = useMemo(
    () => [...parties].sort((a, b) => a.name.localeCompare(b.name)),
    [parties],
  );

  const filteredPartySuggestions = useMemo(() => {
    const q = partyInput.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const list = sortedParties;
    const matches = (p: Party) => {
      if (tokens.length === 0) return true;
      const hay = [
        p.name,
        p.gstIn ?? '',
        p.phone ?? '',
        partySecondaryLine(p) ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .replace(/\s+/g, ' ');
      return tokens.every((t: string) => hay.includes(t));
    };
    return list.filter(matches).slice(0, q ? 80 : 60);
  }, [sortedParties, partyInput]);

  const branchSuggestionsOpen = showBranchSuggestions && filteredBranchSuggestions.length > 0;
  const bankSuggestionsOpen =
    paymentMode === 'BANK' && showBankSuggestions && filteredBankSuggestions.length > 0;
  const branchDropdownStyle = useFixedDropdownBelow(branchBoxRef, branchSuggestionsOpen);
  const bankDropdownStyle = useFixedDropdownBelow(bankBoxRef, bankSuggestionsOpen);

  const partyDropdownVisible =
    showPartySuggestions && !partyLoading && !partyLocked;
  const partyDropdownStyle = useFixedDropdownBelow(partyBoxRef, partyDropdownVisible, {
    maxHeight: 'min(22rem, calc(100vh - 6rem))',
    minWidth: 280,
  });

  useEffect(() => {
    if (!partyId || !parties.length) return;
    const p = parties.find((x) => x.id === partyId);
    if (p) setPartyInput(p.name);
  }, [partyId, parties]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (partyBoxRef.current?.contains(t) || partyMenuRef.current?.contains(t)) return;
      setShowPartySuggestions(false);
      setActivePartySuggestionIndex(-1);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!branchId || !branches.length) return;
    const selected = branches.find((b) => b.id === branchId);
    if (selected) setBranchInput(selected.name);
  }, [branchId, branches]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (branchBoxRef.current?.contains(t) || branchMenuRef.current?.contains(t)) return;
      setShowBranchSuggestions(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (bankBoxRef.current?.contains(t) || bankMenuRef.current?.contains(t)) return;
      setShowBankSuggestions(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!bankId || !banks.length) return;
    const selected = banks.find((x) => x.id === bankId);
    if (selected) {
      setBankNameInput(selected.name);
      setBankLast4Input(normalizeBankLast4(selected.accountLast4));
    }
  }, [bankId, banks]);

  useEffect(() => {
    if (paymentMode !== 'BANK') {
      setBankNameInput('');
      setBankLast4Input('');
      setShowBankSuggestions(false);
    }
  }, [paymentMode]);

  const handleBranchInputChange = (value: string) => {
    setBranchInput(value);
    setShowBranchSuggestions(true);
    setActiveBranchSuggestionIndex(-1);
    const matched = branches.find((b) => b.name.trim().toLowerCase() === value.trim().toLowerCase());
    onBranchIdChange(matched ? matched.id : '');
  };

  const handleSelectBranch = (branch: Branch) => {
    setBranchInput(branch.name);
    onBranchIdChange(branch.id);
    setShowBranchSuggestions(false);
    setActiveBranchSuggestionIndex(-1);
  };

  const handleBranchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showBranchSuggestions || filteredBranchSuggestions.length === 0) {
      if (event.key === 'ArrowDown' && filteredBranchSuggestions.length > 0) {
        setShowBranchSuggestions(true);
        setActiveBranchSuggestionIndex(0);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveBranchSuggestionIndex((prev) =>
        prev < filteredBranchSuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveBranchSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredBranchSuggestions.length - 1,
      );
      return;
    }
    if (event.key === 'Enter') {
      if (activeBranchSuggestionIndex >= 0 && activeBranchSuggestionIndex < filteredBranchSuggestions.length) {
        event.preventDefault();
        handleSelectBranch(filteredBranchSuggestions[activeBranchSuggestionIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowBranchSuggestions(false);
      setActiveBranchSuggestionIndex(-1);
    }
  };

  const handleAddBranch = async () => {
    const name = branchInput.trim();
    if (!name) return;
    setIsAddingBranch(true);
    try {
      const created = await moneyReceiptApi.createBranch(name);
      onBranchCreated?.(created);
      onBranchIdChange(created.id);
      setBranchInput(created.name);
      setShowBranchSuggestions(false);
      setActiveBranchSuggestionIndex(-1);
      toast.success('Branch added');
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(ax?.response?.data?.message ?? ax?.message ?? 'Failed to add branch');
    } finally {
      setIsAddingBranch(false);
    }
  };

  const handleBankNameInputChange = (value: string) => {
    setBankNameInput(value);
    setShowBankSuggestions(true);
    setActiveBankSuggestionIndex(-1);
    const last4 = bankLast4Input.replace(/\D/g, '').slice(0, 4);
    const matched = banks.find((b) => bankMatches(b, value, last4));
    onBankIdChange(matched ? matched.id : '');
  };

  const handleBankLast4InputChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setBankLast4Input(digits);
    setShowBankSuggestions(true);
    setActiveBankSuggestionIndex(-1);
    const matched = banks.find((b) => bankMatches(b, bankNameInput, digits));
    onBankIdChange(matched ? matched.id : '');
  };

  const handleSelectBank = (bank: Bank) => {
    setBankNameInput(bank.name);
    setBankLast4Input(normalizeBankLast4(bank.accountLast4));
    onBankIdChange(bank.id);
    setShowBankSuggestions(false);
    setActiveBankSuggestionIndex(-1);
  };

  const handleBankRowKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (paymentMode !== 'BANK') return;
    if (!showBankSuggestions || filteredBankSuggestions.length === 0) {
      if (event.key === 'ArrowDown' && filteredBankSuggestions.length > 0) {
        setShowBankSuggestions(true);
        setActiveBankSuggestionIndex(0);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveBankSuggestionIndex((prev) =>
        prev < filteredBankSuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveBankSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredBankSuggestions.length - 1,
      );
      return;
    }
    if (event.key === 'Enter') {
      if (activeBankSuggestionIndex >= 0 && activeBankSuggestionIndex < filteredBankSuggestions.length) {
        event.preventDefault();
        handleSelectBank(filteredBankSuggestions[activeBankSuggestionIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowBankSuggestions(false);
      setActiveBankSuggestionIndex(-1);
    }
  };

  const handleAddBank = async () => {
    const name = bankNameInput.trim();
    if (!name || paymentMode !== 'BANK') return;
    setIsAddingBank(true);
    try {
      const created = await moneyReceiptApi.createBank({
        name,
        accountLast4: bankLast4Input.replace(/\D/g, '').slice(0, 4) || undefined,
      });
      onBankCreated?.(created);
      onBankIdChange(created.id);
      setBankNameInput(created.name);
      setBankLast4Input(normalizeBankLast4(created.accountLast4));
      setShowBankSuggestions(false);
      setActiveBankSuggestionIndex(-1);
      toast.success('Bank account added');
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(ax?.response?.data?.message ?? ax?.message ?? 'Failed to add bank account');
    } finally {
      setIsAddingBank(false);
    }
  };

  const handlePartyInputChange = (value: string) => {
    setPartyInput(value);
    setShowPartySuggestions(true);
    setActivePartySuggestionIndex(-1);
    const matched = parties.find((p) => p.name.trim().toLowerCase() === value.trim().toLowerCase());
    onPartyIdChange(matched ? matched.id : '');
  };

  const handleSelectParty = (p: Party) => {
    setPartyInput(p.name);
    onPartyIdChange(p.id);
    setShowPartySuggestions(false);
    setActivePartySuggestionIndex(-1);
  };

  const handlePartyInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (partyLocked || partyLoading) return;
    if (!showPartySuggestions || filteredPartySuggestions.length === 0) {
      if (event.key === 'ArrowDown' && filteredPartySuggestions.length > 0) {
        setShowPartySuggestions(true);
        setActivePartySuggestionIndex(0);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActivePartySuggestionIndex((prev) =>
        prev < filteredPartySuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActivePartySuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredPartySuggestions.length - 1,
      );
      return;
    }
    if (event.key === 'Enter') {
      if (activePartySuggestionIndex >= 0 && activePartySuggestionIndex < filteredPartySuggestions.length) {
        event.preventDefault();
        handleSelectParty(filteredPartySuggestions[activePartySuggestionIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowPartySuggestions(false);
      setActivePartySuggestionIndex(-1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Always one horizontal row; items-end aligns control bottoms. Columns share width with flex + min-w-0. */}
      <div className="-mx-1 flex w-full min-w-0 flex-nowrap items-end gap-1.5 overflow-x-auto overflow-y-visible px-1 pb-2 pt-1 sm:gap-2">
        <div className="min-w-[11rem] max-w-none flex-[1.4] basis-0 md:min-w-[12rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Branch</Label>
            <div className="relative" ref={branchBoxRef}>
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                <Input
                  className="h-8 min-w-0 flex-1 rounded-lg px-2 py-1 text-xs leading-none font-normal"
                  value={branchInput}
                  onChange={(e) => handleBranchInputChange(e.target.value)}
                  onFocus={() => {
                    setShowBranchSuggestions(true);
                    setActiveBranchSuggestionIndex(filteredBranchSuggestions.length > 0 ? 0 : -1);
                  }}
                  onKeyDown={handleBranchInputKeyDown}
                  placeholder="Enter branch name"
                />
                {!branchId && branchInput.trim().length > 0 && (
                  <Button type="button" variant="outline" className="!h-8 shrink-0 px-2 text-xs" onClick={handleAddBranch} disabled={isAddingBranch}>
                    {isAddingBranch ? '…' : 'Add'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-[9.5rem] flex-[0.78] basis-0 md:min-w-[10rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Money receipt no.</Label>
            <Input
              className="h-8 w-full rounded-lg px-2 py-1 font-mono text-xs leading-none"
              value={receiptNo}
              onChange={(e) => onReceiptNoChange(e.target.value)}
              placeholder="Auto if empty"
            />
          </div>
        </div>
        <div className="min-w-[10rem] flex-[0.78] basis-0 md:min-w-[10.5rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Receipt date</Label>
            <Input type="date" className="h-8 w-full rounded-lg px-2 py-1 text-xs leading-none" value={receiptDate} onChange={(e) => onReceiptDateChange(e.target.value)} />
          </div>
        </div>
        <div className="min-w-[11rem] flex-[1] basis-0 md:min-w-[12rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Payment against</Label>
            <div className="flex h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
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
                    'flex h-full min-h-0 flex-1 items-center justify-center rounded-md px-2 text-xs font-medium leading-none transition-colors',
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
        </div>
        <div className="min-w-[15.5rem] flex-[1.45] basis-0 md:min-w-[17.5rem] lg:min-w-[19rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">TDS %</Label>
            <div className="flex h-8 min-w-0 w-full flex-nowrap items-center justify-between gap-1.5">
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-8 w-[4.5rem] shrink-0 rounded-lg px-2 py-1 text-xs tabular-nums leading-none sm:w-[4.75rem]"
                value={tdsPercent}
                onChange={(e) => onTdsPercentChange(e.target.value)}
              />
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] text-slate-700">
                  <Checkbox checked={tdsRound} onCheckedChange={(c) => onTdsRoundChange(c === true)} />
                  TDS round
                </label>
                <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] text-slate-700">
                  <Checkbox checked={defaultTds} onCheckedChange={(c) => onDefaultTdsChange(c === true)} />
                  Default
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="-mx-1 flex w-full min-w-0 flex-nowrap items-end gap-1.5 overflow-x-auto overflow-y-visible px-1 pb-2 pt-1 sm:gap-2">
        <div className="min-w-[15rem] flex-[2.1] basis-0 md:min-w-[17rem] lg:min-w-[19rem]">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="party-received-combo" className="text-[11px] leading-none text-slate-700">
              Received with (party)
            </Label>
            <div className="relative" ref={partyBoxRef}>
              <span
                className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center text-slate-400"
                aria-hidden
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
              </span>
              <Input
                id="party-received-combo"
                className="h-auto min-h-8 w-full rounded-lg border-slate-200 bg-white py-1.5 pl-8 pr-9 text-xs leading-snug shadow-sm"
                value={partyLoading ? '' : partyInput}
                onChange={(e) => handlePartyInputChange(e.target.value)}
                onFocus={() => {
                  if (partyLocked || partyLoading) return;
                  setShowPartySuggestions(true);
                  setActivePartySuggestionIndex(filteredPartySuggestions.length > 0 ? 0 : -1);
                }}
                onKeyDown={handlePartyInputKeyDown}
                placeholder={
                  partyLoading ? 'Loading parties…' : partyLocked ? 'Party fixed for this receipt' : 'Type name, GSTIN, or phone…'
                }
                disabled={partyLoading || partyLocked}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={partyDropdownVisible}
              />
              {!partyLoading && !partyLocked && partyInput.trim().length > 0 ? (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear party"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPartyInput('');
                    onPartyIdChange('');
                    setShowPartySuggestions(false);
                    setActivePartySuggestionIndex(-1);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <p className="text-[10px] leading-snug text-slate-500">
              {partyLocked
                ? 'Unlock below to change party.'
                : ''}
            </p>
          </div>
        </div>
        <div className="min-w-[11rem] flex-[0.82] basis-0 sm:min-w-[11.5rem] md:min-w-[12rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Cash / Bank</Label>
            <Select value={paymentMode} onValueChange={onPaymentModeChange}>
              <SelectTrigger className="h-8 w-full rounded-lg px-2 py-1 text-xs leading-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="min-w-[13rem] flex-[1.15] basis-0 md:min-w-[15rem] lg:min-w-[16rem]">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[11px] leading-none text-slate-700">Bank account</Label>
            <div className="relative" ref={bankBoxRef}>
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
                <Input
                  className="h-8 min-w-0 flex-1 rounded-lg px-2 py-1 text-xs leading-none font-normal"
                  value={bankNameInput}
                  onChange={(e) => handleBankNameInputChange(e.target.value)}
                  onFocus={() => {
                    if (paymentMode !== 'BANK') return;
                    setShowBankSuggestions(true);
                    setActiveBankSuggestionIndex(filteredBankSuggestions.length > 0 ? 0 : -1);
                  }}
                  onKeyDown={handleBankRowKeyDown}
                  placeholder={paymentMode === 'BANK' ? 'Search or type bank name' : '—'}
                  disabled={paymentMode !== 'BANK'}
                  title={paymentMode === 'BANK' ? undefined : 'Select Cash / Bank → Bank first'}
                />
                <Input
                  className="h-8 w-[4.25rem] shrink-0 rounded-lg px-2 py-1 font-mono text-xs tabular-nums leading-none"
                  value={bankLast4Input}
                  onChange={(e) => handleBankLast4InputChange(e.target.value)}
                  onFocus={() => {
                    if (paymentMode !== 'BANK') return;
                    setShowBankSuggestions(true);
                  }}
                  onKeyDown={handleBankRowKeyDown}
                  placeholder="Last 4"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={paymentMode !== 'BANK'}
                  aria-label="Account last 4 digits"
                />
                {paymentMode === 'BANK' && !bankId && bankNameInput.trim().length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="!h-8 shrink-0 px-2 text-xs"
                    onClick={handleAddBank}
                    disabled={isAddingBank}
                  >
                    {isAddingBank ? '…' : 'Add'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-nowrap items-start gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <Label className="text-[11px] leading-none text-slate-700">Reference / instrument no.</Label>
          <Input
            className="mt-0.5 h-8 rounded-lg px-2 py-1 text-xs leading-none"
            value={referenceNo}
            onChange={(e) => onReferenceNoChange(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Label className="text-[11px] leading-none text-slate-700">Narration</Label>
          <Textarea
            className="mt-0.5 min-h-[2.25rem] resize-y rounded-lg px-2 py-1.5 text-xs leading-snug sm:min-h-[2.5rem]"
            rows={2}
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Overall notes for this money receipt"
          />
        </div>
      </div>

      {typeof document !== 'undefined' &&
        partyDropdownVisible &&
        partyDropdownStyle &&
        createPortal(
          <div
            ref={partyMenuRef}
            style={partyDropdownStyle}
            className="flex flex-col gap-0.5 overflow-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl ring-1 ring-slate-200/50"
          >
            {filteredPartySuggestions.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">
                {parties.length === 0 ? 'No parties loaded.' : 'No matching parties. Try another name or GSTIN.'}
              </p>
            ) : (
              filteredPartySuggestions.map((p) => {
                const sub = partySecondaryLine(p);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={cn(
                      'flex w-full min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-emerald-50/90 focus-visible:bg-emerald-50/90',
                      filteredPartySuggestions[activePartySuggestionIndex]?.id === p.id ? 'bg-emerald-50' : '',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectParty(p);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium leading-snug text-slate-900">{p.name}</span>
                      {!p.isActive ? (
                        <Badge variant="outline" className="h-5 shrink-0 rounded-md px-1.5 text-[10px] font-normal">
                          Inactive
                        </Badge>
                      ) : null}
                    </div>
                    {sub ? (
                      <p className="break-words text-[11px] leading-snug text-slate-600">{sub}</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}

      {typeof document !== 'undefined' &&
        branchSuggestionsOpen &&
        branchDropdownStyle &&
        createPortal(
          <div
            ref={branchMenuRef}
            style={branchDropdownStyle}
            className="flex flex-col gap-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-md ring-1 ring-slate-900/5"
          >
            {filteredBranchSuggestions.map((branch) => (
              <button
                type="button"
                key={branch.id}
                className={`flex min-h-11 w-full items-center rounded-md px-4 py-3 text-left text-sm leading-snug text-slate-900 outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 ${
                  filteredBranchSuggestions[activeBranchSuggestionIndex]?.id === branch.id ? 'bg-slate-100' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectBranch(branch);
                }}
              >
                {branch.name}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {typeof document !== 'undefined' &&
        bankSuggestionsOpen &&
        bankDropdownStyle &&
        createPortal(
          <div
            ref={bankMenuRef}
            style={bankDropdownStyle}
            className="flex flex-col gap-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-md ring-1 ring-slate-900/5"
          >
            {filteredBankSuggestions.map((bank) => (
              <button
                type="button"
                key={bank.id}
                className={`flex min-h-11 w-full items-center rounded-md px-4 py-3 text-left text-sm leading-snug text-slate-900 outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 ${
                  filteredBankSuggestions[activeBankSuggestionIndex]?.id === bank.id ? 'bg-slate-100' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectBank(bank);
                }}
              >
                {formatBankOptionLabel(bank)}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
