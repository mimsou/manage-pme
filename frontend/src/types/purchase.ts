import { Product } from './product';
import { Supplier } from './supplier';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum SupplierDocumentType {
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  SUPPLIER_INVOICE = 'SUPPLIER_INVOICE',
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
  documentType: SupplierDocumentType;
  supplierDeliveryNoteNumber?: string | null;
  supplierDeliveryNoteDate?: string | null;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  status: PurchaseStatus;
  totalAmount: number;
  amountPaid: number;
  dueDate?: string | null;
  notes?: string;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  stockMovements?: any[];
}

export interface CreatePurchaseDto {
  supplierId: string;
  reference: string;
  documentType?: SupplierDocumentType;
  supplierDeliveryNoteNumber?: string;
  supplierDeliveryNoteDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  dueDate?: string;
  autoReceiveFull?: boolean;
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
  documentType?: SupplierDocumentType;
  supplierDeliveryNoteNumber?: string;
  supplierDeliveryNoteDate?: string;
  dueDate?: string;
}

export interface RecordPurchasePaymentDto {
  amount: number;
  dueDate?: string;
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


