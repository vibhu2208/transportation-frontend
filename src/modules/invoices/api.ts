import { api } from '@/lib/api';
import {
  CreateInvoiceRequest,
  CreateMoneyReceiptRequest,
  DownloadInvoiceOptions,
  Invoice,
  InvoiceTemplate,
  MoneyReceiptSummary,
  PendingTripsByParty,
} from './types';

export const invoicesApi = {
  async getPendingTripsByParty(): Promise<PendingTripsByParty[]> {
    const response = await api.get('/invoices/pending-trips');
    return response.data;
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  async getInvoices(): Promise<Invoice[]> {
    const response = await api.get('/invoices');
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  async getInvoiceTemplates(): Promise<InvoiceTemplate[]> {
    const response = await api.get('/invoices/templates/list');
    return response.data;
  },

  async downloadInvoicePdf(id: string, options?: DownloadInvoiceOptions): Promise<Blob> {
    const hasTemplateOptions = Boolean(options?.templateKey || options?.customHtmlTemplate);
    const response = hasTemplateOptions
      ? await api.post(`/invoices/${id}/download`, options, { responseType: 'blob' })
      : await api.get(`/invoices/${id}/download`, { responseType: 'blob' });
    return response.data;
  },

  async listMoneyReceipts(invoiceId: string): Promise<MoneyReceiptSummary> {
    const response = await api.get(`/invoices/${invoiceId}/money-receipts`);
    return response.data;
  },

  async createMoneyReceipt(invoiceId: string, data: CreateMoneyReceiptRequest) {
    const response = await api.post(`/invoices/money-receipts`, { invoiceId, ...data });
    return response.data;
  },

  async downloadMoneyReceiptPdf(invoiceId: string, receiptId: string): Promise<Blob> {
    const response = await api.get(`/invoices/${invoiceId}/money-receipts/${receiptId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
