import { apiClient } from './client';

export interface ClientCreditSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  totalDue: number;
  unpaidCount: number;
}

export interface UnpaidSaleRow {
  id: string;
  ticketNumber: string | null;
  invoiceNumber: string | null;
  type: string;
  total: number;
  amountPaid: number;
  due: number;
  dueDate: string | null;
  createdAt: string;
  daysOverdue: number | null;
  currencyCode: string | null;
}

export interface ClientCreditDetail {
  client: {
    id: string;
    type: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  totalDue: number;
  unpaidSales: UnpaidSaleRow[];
}

export const creditsApi = {
  getClientCreditsSummary: async (params?: {
    clientId?: string;
    minTotal?: number;
    maxTotal?: number;
    search?: string;
    page?: number;
    limit?: number;
    overdueMinDays?: number;
  }): Promise<{
    data: ClientCreditSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get('/credits/clients', { params });
    return response.data;
  },

  getClientCreditDetail: async (clientId: string): Promise<ClientCreditDetail> => {
    const response = await apiClient.get(`/credits/clients/${clientId}`);
    return response.data;
  },

  /** Nombre de factures impayées depuis au moins X jours (pour badge). Si days non fourni, utilise le paramètre admin. */
  getOverdueCount: async (days?: number): Promise<{ count: number; thresholdDays: number }> => {
    const response = await apiClient.get<{ count: number; thresholdDays: number }>('/credits/overdue-count', {
      params: days != null ? { days } : undefined,
    });
    return response.data;
  },
};
