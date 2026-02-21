import { apiClient } from './client';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier';

export const suppliersApi = {
  getAll: async (params?: {
    search?: string;
  }): Promise<Supplier[]> => {
    const response = await apiClient.get('/suppliers', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: CreateSupplierDto): Promise<Supplier> => {
    const response = await apiClient.post('/suppliers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSupplierDto): Promise<Supplier> => {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};


