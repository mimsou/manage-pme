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
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  margin: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleDto {
  clientId?: string;
  cashRegisterId?: string;
  type: SaleType;
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

export type { Client };

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}
