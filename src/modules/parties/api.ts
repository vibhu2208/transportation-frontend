import { api } from '@/lib/api';
import {
  CreatePartyRequest,
  CreatePartyBranchRequest,
  UpdatePartyRequest,
  Party,
  PartyDetailResponse,
  PartyBranch,
  PartyLedgerStatement,
  PartyLedgerSummary,
} from './types';

export const partiesApi = {
  async getParties(): Promise<Party[]> {
    console.log('API call: GET /parties');
    const response = await api.get('/parties');
    console.log('API response for /parties:', response.data);
    return response.data;
  },

  async getParty(id: string): Promise<Party> {
    const response = await api.get(`/parties/${id}`);
    return response.data;
  },

  async getPartyDetail(id: string): Promise<PartyDetailResponse> {
    const response = await api.get(`/parties/${id}/detail`);
    return response.data;
  },

  async listPartyBranches(partyId: string): Promise<PartyBranch[]> {
    const response = await api.get(`/parties/${partyId}/branches`);
    return response.data;
  },

  async createPartyBranch(partyId: string, data: CreatePartyBranchRequest): Promise<PartyBranch> {
    const response = await api.post(`/parties/${partyId}/branches`, data);
    return response.data;
  },

  async createParty(data: CreatePartyRequest): Promise<Party> {
    const response = await api.post('/parties', data);
    return response.data;
  },

  async updateParty(id: string, data: UpdatePartyRequest): Promise<Party> {
    const response = await api.patch(`/parties/${id}`, data);
    return response.data;
  },

  async deactivateParty(id: string): Promise<Party> {
    const response = await api.delete(`/parties/${id}`);
    return response.data;
  },

  async syncParties(): Promise<Party[]> {
    const response = await api.post('/parties/sync');
    return response.data;
  },

  async createPartyLedger(data: {
    partyId: string;
    partyBranchId: string;
    openingDate: string;
    openingType: 'debit' | 'credit';
    amount: number;
    description?: string;
  }): Promise<{
    ledgerId: string;
    partyId: string;
    partyBranchId: string;
    openingEntryId: string;
    openingBalance: { value: string; direction: 'Dr' | 'Cr'; formatted: string };
  }> {
    const response = await api.post('/party-ledgers', data);
    return response.data;
  },

  async createPartyLedgerEntry(
    ledgerId: string,
    data: {
      type: 'credit_note' | 'debit_note';
      txnDate: string;
      noteNo: string;
      amount: number;
      description?: string;
    },
  ) {
    const response = await api.post(`/party-ledgers/${ledgerId}/entries`, data);
    return response.data;
  },

  async getPartyLedgerSummary(partyId: string, partyBranchId: string): Promise<PartyLedgerSummary> {
    const response = await api.get('/party-ledgers/summary', { params: { partyId, partyBranchId } });
    return response.data;
  },

  async getPartyLedgerStatement(params: {
    partyId: string;
    partyBranchId: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<PartyLedgerStatement> {
    const response = await api.get('/party-ledgers/statement', { params });
    return response.data;
  },

  async downloadPartyLedgerStatementPdf(params: {
    partyId: string;
    partyBranchId: string;
    from?: string;
    to?: string;
  }): Promise<Blob> {
    const response = await api.get('/party-ledgers/statement/download', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
