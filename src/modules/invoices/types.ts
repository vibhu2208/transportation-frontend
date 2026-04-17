export interface Trip {
  id: string;
  tripNo: string;
  date: string;
  partyName: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  grLrNo?: string | null;
  freight?: number | null;
  effectiveFreight?: number;
  status: string;
  invoiceId?: string;
  partyBranchId?: string | null;
  goodsReceipts?: any[];
  vendor?: any;
}

export interface PendingTripsByParty {
  partyName: string;
  tripCount: number;
  trips: Trip[];
}

export interface CreateInvoiceRequest {
  invoiceNo: string;
  invoiceDate?: string;
  dueDate?: string | null;
  delivered?: boolean;
  tripIds: string[];
  partyId?: string;
  partyBranchId?: string;
  partyName: string;
  partyGstIn?: string;
  partyAddress?: string;
  gstRate?: number;
  notes?: string;
}

export interface MoneyReceipt {
  id: string;
  receiptNo: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  paymentMode?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
}

export interface MoneyReceiptSummary {
  invoiceId: string;
  invoiceNo: string;
  grandTotal: number;
  paidTotal: number;
  remaining: number;
  receipts: MoneyReceipt[];
}

export interface CreateMoneyReceiptRequest {
  paymentType: 'PARTIAL' | 'FULL';
  amount?: number;
  paymentDate?: string;
  paymentMode?: string;
  referenceNo?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  delivered?: boolean;
  partyName: string;
  partyId?: string | null;
  partyBranchId?: string | null;
  partyGstIn?: string;
  partyAddress?: string;
  subTotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: string;
  notes?: string;
  trips: Trip[];
  moneyReceipts?: MoneyReceipt[];
  /** Present on list responses when using allocation-based receipts */
  paidTotal?: number;
  remaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTemplate {
  key: string;
  name: string;
  description: string;
}

export interface DownloadInvoiceOptions {
  templateKey?: string;
  customHtmlTemplate?: string;
}
