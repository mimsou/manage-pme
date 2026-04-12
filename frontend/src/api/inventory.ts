import { apiClient } from './client';
import type { Inventory, InventoryItem, InventoryStatus } from '@/types/inventory';

export const inventoryApi = {
  create: async (data: { notes?: string }): Promise<Inventory> => {
    const response = await apiClient.post('/inventory', data);
    return response.data;
  },

  getAll: async (status?: InventoryStatus): Promise<Inventory[]> => {
    const response = await apiClient.get('/inventory', { params: status ? { status } : undefined });
    return response.data;
  },

  getById: async (id: string): Promise<Inventory> => {
    const response = await apiClient.get(`/inventory/${id}`);
    return response.data;
  },

  addItem: async (
    inventoryId: string,
    data: {
      productId: string;
      productVariantId?: string;
      countedQty: number;
      reason?: string;
    },
  ): Promise<InventoryItem> => {
    const response = await apiClient.post(`/inventory/${inventoryId}/items`, data);
    return response.data;
  },

  updateItem: async (
    inventoryId: string,
    itemId: string,
    data: { countedQty: number; reason?: string },
  ): Promise<InventoryItem> => {
    const response = await apiClient.patch(`/inventory/${inventoryId}/items/${itemId}`, data);
    return response.data;
  },

  start: async (inventoryId: string): Promise<Inventory> => {
    const response = await apiClient.put(`/inventory/${inventoryId}/start`);
    return response.data;
  },

  complete: async (inventoryId: string): Promise<Inventory> => {
    const response = await apiClient.put(`/inventory/${inventoryId}/complete`);
    return response.data;
  },

  validate: async (inventoryId: string): Promise<Inventory> => {
    const response = await apiClient.put(`/inventory/${inventoryId}/validate`);
    return response.data;
  },

  /** Supprime l’inventaire si non validé (Admin / Manager). */
  delete: async (inventoryId: string): Promise<void> => {
    await apiClient.delete(`/inventory/${inventoryId}`);
  },
};
