import { apiClient } from './client';
import {
  Purchase,
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
  PurchasesResponse,
  PurchaseStatus,
} from '@/types/purchase';

export const purchasesApi = {
  getAll: async (params?: {
    supplierId?: string;
    status?: PurchaseStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PurchasesResponse> => {
    const response = await apiClient.get('/purchases', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Purchase> => {
    const response = await apiClient.get(`/purchases/${id}`);
    return response.data;
  },

  create: async (data: CreatePurchaseDto): Promise<Purchase> => {
    const response = await apiClient.post('/purchases', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePurchaseDto): Promise<Purchase> => {
    const response = await apiClient.put(`/purchases/${id}`, data);
    return response.data;
  },

  receive: async (id: string, data: ReceivePurchaseDto): Promise<Purchase> => {
    const response = await apiClient.post(`/purchases/${id}/receive`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchases/${id}`);
  },
};


