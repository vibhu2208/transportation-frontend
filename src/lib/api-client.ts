import api from './api';
import { User } from '@/types/auth';
import { GoodsReceipt, CreateGoodsReceiptDto } from '@/types/goods-receipt';

export const shipperApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/admin/shippers');
    return response.data;
  },

  create: async (data: { email: string; password: string; name: string }): Promise<User> => {
    const response = await api.post('/admin/shippers', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/shippers/${id}`);
  },
};

export const goodsReceiptApi = {
  create: async (data: CreateGoodsReceiptDto): Promise<GoodsReceipt> => {
    const response = await api.post('/goods-receipt', data);
    return response.data;
  },

  getAll: async (): Promise<GoodsReceipt[]> => {
    const response = await api.get('/goods-receipt');
    return response.data;
  },

  getByTripId: async (tripId: string): Promise<GoodsReceipt[]> => {
    const response = await api.get(`/goods-receipt/trip/${tripId}`);
    return response.data;
  },

  getByShipperId: async (shipperId: string): Promise<GoodsReceipt[]> => {
    const response = await api.get(`/goods-receipt/shipper/${shipperId}`);
    return response.data;
  },

  getById: async (id: string): Promise<GoodsReceipt> => {
    const response = await api.get(`/goods-receipt/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateGoodsReceiptDto>): Promise<GoodsReceipt> => {
    const response = await api.patch(`/goods-receipt/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/goods-receipt/${id}`);
  },
};

export const tripsApi = {
  getAll: async () => {
    const response = await api.get('/admin/trips');
    return response.data;
  },

  getShipperTrips: async () => {
    const response = await api.get('/trips/shipper-view');
    return response.data;
  },
};
