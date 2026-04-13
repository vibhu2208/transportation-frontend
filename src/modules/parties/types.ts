export interface Party {
  id: string;
  name: string;
  gstIn?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  remainingBalance?: number;
  _count?: {
    trips: number;
    invoices: number;
  };
}

export interface CreatePartyRequest {
  name: string;
  gstIn?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdatePartyRequest extends Partial<CreatePartyRequest> {
  isActive?: boolean;
}

export interface PartyDetailSummary {
  remainingBalance: number;
  totalTrips: number;
  totalInvoices: number;
  goodsReceiptCount: number;
}

export interface PartyBranch {
  id: string;
  partyId: string;
  locationLabel: string | null;
  fullLedgerName: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartyBranchRequest {
  fullLedgerName: string;
  locationLabel?: string;
  address?: string;
}

export interface PartyDetailInvoiceRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  grandTotal: number;
  status: string;
  paidTotal: number;
  remaining: number;
  tripCount: number;
  partyBranchId?: string | null;
}

export interface PartyDetailGrRow {
  id: string;
  grNo: string | null;
  cnNo: string | null;
  cnDate: string | null;
  fromStation: string | null;
  toStation: string | null;
  /** Trip freight (single source; no duplicate on GR). */
  freight: number | null;
  branchName: string | null;
  tripId: string;
  tripNo: string;
  invoiceNo: string | null;
  invoiceId: string | null;
}

export interface PartyDetailMoneyReceiptRow {
  id: string;
  receiptNo: string;
  receiptDate: string;
  totalReceived: number;
  paymentMode: string;
  status: string;
  allocationCount: number;
}

export interface PartyDetailTripRow {
  id: string;
  tripId: string;
  tripNo: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  status: string;
  freight: number | null;
  vendorName: string;
  invoiceNo: string | null;
  invoiceId: string | null;
  goodsReceiptCount: number;
  driverName: string | null;
  driverPhone: string | null;
  remarks: string | null;
  grLrNo: string | null;
  advance: number | null;
  totalExpense: number | null;
  profitLoss: number | null;
  partyBranchId?: string | null;
  branchLedgerName?: string | null;
  branchLocationLabel?: string | null;
}

export interface PartyDetailBranchBreakdown {
  branch: {
    id: string;
    locationLabel: string | null;
    fullLedgerName: string;
    address: string | null;
    isActive: boolean;
  } | null;
  tripCount: number;
  remainingBalance: number;
  trips: PartyDetailTripRow[];
  invoices: PartyDetailInvoiceRow[];
  unassigned?: boolean;
}

export interface PartyDetailResponse {
  party: Party;
  summary: PartyDetailSummary;
  /** Present when API returns branch-aware party detail */
  partyBranches?: PartyBranch[];
  branchBreakdown?: PartyDetailBranchBreakdown[];
  trips: PartyDetailTripRow[];
  invoices: PartyDetailInvoiceRow[];
  goodsReceipts: PartyDetailGrRow[];
  moneyReceipts: PartyDetailMoneyReceiptRow[];
}
