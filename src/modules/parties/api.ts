import { api } from '@/lib/api';
import { CreatePartyRequest, UpdatePartyRequest, Party } from './types';

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

  async createParty(data: CreatePartyRequest): Promise<Party> {
    const response = await api.post('/parties', data);
    return response.data;
  },

  async updateParty(id: string, data: UpdatePartyRequest): Promise<Party> {
    const response = await api.patch(`/parties/${id}`, data);
    return response.data;
  },

  async deleteParty(id: string): Promise<void> {
    await api.delete(`/parties/${id}`);
  },

  async syncParties(): Promise<Party[]> {
    const response = await api.post('/parties/sync');
    return response.data;
  },
};
