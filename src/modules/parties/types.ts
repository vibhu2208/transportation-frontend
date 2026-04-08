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

export interface PartyDetailInvoiceRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  grandTotal: number;
  status: string;
  paidTotal: number;
  remaining: number;
  tripCount: number;
}

export interface PartyDetailGrRow {
  id: string;
  grNo: string | null;
  cnNo: string | null;
  cnDate: string | null;
  fromStation: string | null;
  toStation: string | null;
  freight: string | null;
  totalFreight: string | null;
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
}

export interface PartyDetailResponse {
  party: Party;
  summary: PartyDetailSummary;
  trips: PartyDetailTripRow[];
  invoices: PartyDetailInvoiceRow[];
  goodsReceipts: PartyDetailGrRow[];
  moneyReceipts: PartyDetailMoneyReceiptRow[];
}
