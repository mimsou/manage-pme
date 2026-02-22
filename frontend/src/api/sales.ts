import { apiClient } from './client';
import { Sale, CreateSaleDto, CreateRefundDto, SaleRefund } from '@/types/sale';

export const salesApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    userId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Sale[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await apiClient.get('/sales', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  },

  create: async (data: CreateSaleDto): Promise<Sale> => {
    const response = await apiClient.post('/sales', data);
    return response.data;
  },

  cancel: async (id: string): Promise<Sale> => {
    const response = await apiClient.put(`/sales/${id}/cancel`);
    return response.data;
  },

  createRefund: async (saleId: string, data: CreateRefundDto): Promise<SaleRefund> => {
    const response = await apiClient.post(`/sales/${saleId}/refund`, data);
    return response.data;
  },

  recordPayment: async (saleId: string, amount: number): Promise<Sale> => {
    const response = await apiClient.post(`/sales/${saleId}/payment`, { amount });
    return response.data;
  },
};
