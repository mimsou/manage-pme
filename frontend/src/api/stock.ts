import { apiClient } from './client';
import { StockMovement, CreateDamageDto, StockMovementsResponse, StockMovementType } from '@/types/stock';

export const stockApi = {
  getMovements: async (params?: {
    productId?: string;
    type?: StockMovementType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<StockMovementsResponse> => {
    const response = await apiClient.get('/stock/movements', { params });
    return response.data;
  },

  getProductHistory: async (productId: string): Promise<{ product: any; movements: StockMovement[] }> => {
    const response = await apiClient.get(`/stock/product/${productId}/history`);
    return response.data;
  },

  createDamage: async (data: CreateDamageDto): Promise<StockMovement> => {
    const response = await apiClient.post('/stock/damage', data);
    return response.data;
  },
};


