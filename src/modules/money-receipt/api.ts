import { api } from '@/lib/api';
import type {
  InvoiceGrLinesResponse,
  CreateMoneyReceiptPayload,
  Branch,
  Bank,
  InvoiceLookupResponse,
  ReceiptMappingRow,
  MoneyReceiptListItem,
} from './types';

export const moneyReceiptApi = {
  async list(params?: { q?: string; limit?: number }): Promise<MoneyReceiptListItem[]> {
    const response = await api.get('/money-receipt', {
      params: {
        q: params?.q,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  async getInvoiceLines(invoiceId: string): Promise<InvoiceGrLinesResponse> {
    const response = await api.get(`/money-receipt/invoice/${invoiceId}/lines`);
    return response.data;
  },

  async getByInvoiceAlias(invoiceId: string): Promise<InvoiceGrLinesResponse> {
    const response = await api.get(`/goods-receipt/by-invoice/${invoiceId}`);
    return response.data;
  },

  async create(data: CreateMoneyReceiptPayload) {
    try {
      const response = await api.post('/money-receipt', data);
      return response.data;
    } catch (error: any) {
      const message = String(error?.response?.data?.message || '');
      const rejectsDeduction =
        message.includes('deductionAmount should not exist') ||
        message.includes('lines.0.property deductionAmount should not exist');
      if (!rejectsDeduction) throw error;

      // Backward compatibility: older backend validators may not yet allow deductionAmount.
      const fallback = {
        ...data,
        lines: data.lines.map(({ deductionAmount: _deductionAmount, ...line }) => line),
      };
      const retry = await api.post('/money-receipt', fallback);
      return retry.data;
    }
  },

  async getOne(id: string) {
    const response = await api.get(`/money-receipt/${id}`);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/money-receipt/${id}`);
    return response.data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const response = await api.get(`/money-receipt/${id}/download`, { responseType: 'blob' });
    return response.data;
  },

  async getBranches(): Promise<Branch[]> {
    const response = await api.get('/branches');
    return response.data;
  },

  async createBranch(name: string): Promise<Branch> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Branch name is required');
    }
    const response = await api.post('/branches', { name: trimmed });
    return response.data;
  },

  async getBanks(): Promise<Bank[]> {
    const response = await api.get('/banks');
    return response.data;
  },

  async createBank(payload: { name: string; accountLast4?: string | null }): Promise<Bank> {
    const name = payload.name.trim();
    if (!name) {
      throw new Error('Bank name is required');
    }
    const response = await api.post('/banks', {
      name,
      accountLast4: payload.accountLast4 ?? undefined,
    });
    return response.data;
  },

  async lookupInvoice(invoiceNo: string): Promise<InvoiceLookupResponse> {
    const response = await api.get('/money-receipt/invoice-lookup', {
      params: { invoiceNo },
    });
    return response.data;
  },

  async getPartyMapping(partyId: string): Promise<ReceiptMappingRow[]> {
    const response = await api.get(`/money-receipt/party/${partyId}/mapping`);
    return response.data;
  },
};
