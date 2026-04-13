import { api } from '@/lib/api';
import type {
  InvoiceGrLinesResponse,
  CreateMoneyReceiptPayload,
  Branch,
  Bank,
  InvoiceLookupResponse,
  ReceiptMappingRow,
} from './types';

export const moneyReceiptApi = {
  async getInvoiceLines(invoiceId: string): Promise<InvoiceGrLinesResponse> {
    const response = await api.get(`/money-receipt/invoice/${invoiceId}/lines`);
    return response.data;
  },

  async getByInvoiceAlias(invoiceId: string): Promise<InvoiceGrLinesResponse> {
    const response = await api.get(`/goods-receipt/by-invoice/${invoiceId}`);
    return response.data;
  },

  async create(data: CreateMoneyReceiptPayload) {
    const response = await api.post('/money-receipt', data);
    return response.data;
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

  async getBanks(): Promise<Bank[]> {
    const response = await api.get('/banks');
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
