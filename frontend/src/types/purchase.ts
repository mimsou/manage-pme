import { Product } from './product';
import { Supplier } from './supplier';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  product?: Product;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  reference: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  status: PurchaseStatus;
  totalAmount: number;
  notes?: string;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  stockMovements?: any[];
}

export interface CreatePurchaseDto {
  supplierId: string;
  reference: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
}

export interface UpdatePurchaseDto {
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  status?: PurchaseStatus;
  notes?: string;
}

export interface ReceivePurchaseItemDto {
  itemId: string;
  receivedQuantity: number;
}

export interface ReceivePurchaseDto {
  items: ReceivePurchaseItemDto[];
  deliveryDate?: string;
  notes?: string;
}

export interface PurchasesResponse {
  data: Purchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


