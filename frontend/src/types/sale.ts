import { Product } from './product';
import { Client } from './client';

export enum SaleType {
  TICKET = 'TICKET',
  INVOICE = 'INVOICE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  MIXED = 'MIXED',
  CREDIT = 'CREDIT', // Vente à crédit (facture impayée)
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  purchasePrice?: number;
  margin?: number;
}

export interface Sale {
  id: string;
  type: SaleType;
  status: SaleStatus;
  clientId?: string;
  client?: Client;
  userId: string;
  user?: User;
  cashRegisterId?: string;
  ticketNumber?: string;
  invoiceNumber?: string;
  items: SaleItem[];
  refunds?: SaleRefund[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid?: number;
  dueDate?: string | null;
  margin: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  currencyCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleDto {
  clientId?: string;
  cashRegisterId?: string;
  type: SaleType;
  /** Si absent, la devise par défaut de l'application est utilisée. */
  currencyCode?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }[];
  discount?: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
}

/** Ligne remboursée dans un avoir */
export interface RefundItemLine {
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount?: number;
}

export interface SaleRefund {
  id: string;
  saleId: string;
  avoirNumber: string | null;
  reason: string | null;
  refundAmount: number;
  refundedItems: RefundItemLine[] | null;
  createdAt: string;
  sale?: Sale;
}

export interface CreateRefundDto {
  items: { saleItemId: string; quantity: number }[];
  reason?: string;
}

export type { Client };

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}
