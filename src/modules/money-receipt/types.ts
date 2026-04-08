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

export interface CreateMoneyReceiptLinePayload {
  invoiceId: string;
  tripId: string;
  goodsReceiptId?: string | null;
  freightAmount: number;
  receivedAmount: number;
  tdsAmount: number;
  deduction: number;
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
  lines: CreateMoneyReceiptLinePayload[];
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
