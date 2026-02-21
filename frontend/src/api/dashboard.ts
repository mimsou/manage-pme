import { apiClient } from './client';

export const dashboardApi = {
  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/dashboard/stats', { params });
    return response.data;
  },

  getSalesChart: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month';
  }) => {
    const response = await apiClient.get('/dashboard/sales-chart', { params });
    return response.data;
  },
};

