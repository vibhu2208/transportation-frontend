export interface SettlementLine {
  invoiceId: string;
  tripId: string;
  goodsReceiptId: string | null;
  lineTotal: number;
  grNo: string;
  date: string | null;
  fromLocation: string;
  toLocation: string;
  freightAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export interface InvoiceGrLinesResponse {
  invoice: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    partyId: string | null;
    partyName: string;
    grandTotal: number;
    subTotal: number;
    status: string;
  };
  paidTotal: number;
  remaining: number;
  lines: SettlementLine[];
}

/** One line per invoice on the MR */
export interface MoneyReceiptInvoiceLinePayload {
  invoiceId: string;
  receivedAmount: number;
  tdsAmount: number;
  deductionAmount?: number;
}

export interface CreateMoneyReceiptPayload {
  receiptNo?: string;
  receiptDate?: string;
  partyId: string;
  branchId?: string | null;
  bankId?: string | null;
  paymentMode: string;
  referenceNo?: string;
  tdsPercent: number;
  tdsRound: boolean;
  notes?: string;
  status?: string;
  lines: MoneyReceiptInvoiceLinePayload[];
}

export interface InvoiceLookupResponse {
  invoice: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    partyId: string | null;
    partyName: string;
    grandTotal: number;
    status: string;
  };
  lockPartyId: string | null;
  lockPartyName: string;
  paidTotal: number;
  remaining: number;
}

export interface ReceiptMappingRow {
  tripNo: string;
  grNo: string;
  invoiceNo: string;
  receiptNo: string;
  deductionAmount: number;
}

/** Row returned by GET /money-receipt */
export interface MoneyReceiptListItem {
  id: string;
  receiptNo: string;
  receiptDate: string;
  partyId: string;
  partyName: string;
  paymentMode: string;
  referenceNo: string | null;
  status: string;
  totalReceived: number;
  allocationCount: number;
  /** Distinct invoice numbers on this receipt (comma-separated), or "—" */
  invoiceNosSummary: string;
  /** Distinct GR numbers from allocations (comma-separated), or "—" */
  grNosSummary: string;
}

export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Bank {
  id: string;
  name: string;
  accountLast4?: string | null;
  isActive: boolean;
}
