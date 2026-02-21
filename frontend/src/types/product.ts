export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: Category;
  purchasePrice: number;
  salePrice: number;
  stockMin: number;
  stockCurrent: number;
  hasVariants: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  purchasePrice: number;
  salePrice: number;
  stockMin?: number;
  stockCurrent?: number;
  hasVariants?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  purchasePrice?: number;
  salePrice?: number;
  stockMin?: number;
  isActive?: boolean;
  priceChangeReason?: string;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
