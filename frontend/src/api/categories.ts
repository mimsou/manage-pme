import { apiClient } from './client';
import { Category } from '@/types/product';

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string; parentId?: string }): Promise<Category> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string; parentId?: string }): Promise<Category> => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};

