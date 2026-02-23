import { apiClient } from './client';
import type { Quote, CreateQuoteDto, ConvertToSaleDto } from '@/types/quote';
import type { Sale } from '@/types/sale';
import { QuoteStatus } from '@/types/quote';

export const quotesApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    status?: QuoteStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: Quote[]; total: number; page: number; limit: number }> => {
    const response = await apiClient.get('/quotes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Quote> => {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },

  create: async (data: CreateQuoteDto): Promise<Quote> => {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },

  convertToSale: async (quoteId: string, data: ConvertToSaleDto): Promise<Sale> => {
    const response = await apiClient.post(`/quotes/${quoteId}/convert-to-sale`, data);
    return response.data;
  },
};
