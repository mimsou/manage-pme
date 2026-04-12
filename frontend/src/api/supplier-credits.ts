import { apiClient } from './client';

export interface SupplierPayableSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalDue: number;
  unpaidCount: number;
}

export interface UnpaidPurchaseRow {
  id: string;
  reference: string;
  documentType: string;
  supplierDeliveryNoteNumber: string | null;
  invoiceNumber: string | null;
  total: number;
  amountPaid: number;
  due: number;
  dueDate: string | null;
  invoiceDate: string | null;
  createdAt: string;
  daysOverdue: number | null;
  status: string;
}

export interface SupplierPayableDetail {
  supplier: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  totalDue: number;
  unpaidPurchases: UnpaidPurchaseRow[];
}

export const supplierCreditsApi = {
  getSuppliersSummary: async (params?: {
    supplierId?: string;
    minTotal?: number;
    maxTotal?: number;
    search?: string;
    page?: number;
    limit?: number;
    overdueMinDays?: number;
  }): Promise<{
    data: SupplierPayableSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get('/supplier-credits/suppliers', { params });
    return response.data;
  },

  getSupplierDetail: async (supplierId: string): Promise<SupplierPayableDetail> => {
    const response = await apiClient.get(`/supplier-credits/suppliers/${supplierId}`);
    return response.data;
  },

  getOverdueCount: async (days?: number): Promise<{ count: number; thresholdDays: number }> => {
    const response = await apiClient.get<{ count: number; thresholdDays: number }>(
      '/supplier-credits/overdue-count',
      { params: days != null ? { days } : undefined },
    );
    return response.data;
  },
};
