import { apiClient } from './client';

export const SETTING_KEYS = {
  CREDIT_OVERDUE_DAYS_THRESHOLD: 'credit_overdue_days_threshold',
} as const;

export const settingsApi = {
  getAll: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get<Record<string, string>>('/settings');
    return response.data;
  },

  get: async (key: string): Promise<string | null> => {
    const all = await settingsApi.getAll();
    return all[key] ?? null;
  },

  update: async (updates: Record<string, string>): Promise<Record<string, string>> => {
    const response = await apiClient.put<Record<string, string>>('/settings', updates);
    return response.data;
  },
};
