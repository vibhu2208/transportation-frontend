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
  /** Linked GR records (grNo from goods_receipts); preferred over grLrNo for display */
  goodsReceipts?: Array<{ grNo?: string | null; gstMovementType?: 'INTRA_STATE' | 'INTER_STATE' }>;
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
  gstMovementType?: 'INTRA_STATE' | 'INTER_STATE';
  notes?: string;
}

export interface MoneyReceipt {
  id: string;
  receiptNo: string;
  amount: number;
  receivedAmount?: number;
  tdsAmount?: number;
  deductionAmount?: number;
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
  gstMovementType?: 'INTRA_STATE' | 'INTER_STATE';
  gstAmount: number;
  grandTotal: number;
  status: string;
  /** True when a goods receipt was edited after this invoice was created; download PDF to refresh totals. */
  needsRegeneration?: boolean;
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
