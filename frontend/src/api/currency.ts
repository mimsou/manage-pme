import { apiClient } from './client';

export interface CurrencyDto {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  unit: number;
  isActive: boolean;
}

export const currencyApi = {
  list: async (): Promise<CurrencyDto[]> => {
    const { data } = await apiClient.get<CurrencyDto[]>('/currency/list');
    return data;
  },

  getDefault: async (): Promise<{ code: string }> => {
    const { data } = await apiClient.get<{ code: string }>('/currency/default');
    return data;
  },

  setDefault: async (code: string): Promise<{ code: string }> => {
    const { data } = await apiClient.post<{ code: string }>('/currency/default', { code });
    return data;
  },

  getRates: async (): Promise<Record<string, number>> => {
    const { data } = await apiClient.get<Record<string, number>>('/currency/rates');
    return data;
  },

  importBCT: async (): Promise<{ imported: number; currencies: string[]; error?: string }> => {
    const { data } = await apiClient.post<{ imported: number; currencies: string[]; error?: string }>(
      '/currency/import-bct',
    );
    return data;
  },
};
