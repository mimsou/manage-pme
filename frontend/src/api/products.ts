import { apiClient } from './client';
import { Product, CreateProductDto, UpdateProductDto, ProductsResponse } from '@/types/product';

export const productsApi = {
  getAll: async (params?: {
    categoryId?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ProductsResponse> => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  getByBarcode: async (barcode: string): Promise<Product> => {
    const response = await apiClient.get(`/products/barcode/${barcode}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  createWithVariants: async (data: {
    name: string;
    description?: string;
    categoryId: string;
    variants: Array<{
      attributes: Array<{ type: string; value: string }>;
      purchasePrice: number;
      salePrice: number;
      stockCurrent: number;
      stockMin: number;
      barcode?: string;
    }>;
  }): Promise<Product[]> => {
    const response = await apiClient.post('/products/with-variants', data);
    return response.data;
  },

  getSkuComponentSuggestions: async (type: string, search?: string): Promise<string[]> => {
    const response = await apiClient.get(`/products/sku-components/${type}`, {
      params: { search },
    });
    return response.data;
  },
};
