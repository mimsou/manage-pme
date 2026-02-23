import { Product } from './product';
import { Client } from './client';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REFUSED = 'REFUSED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  createdAt?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId?: string | null;
  client?: Client | null;
  userId: string;
  user?: { id: string; firstName: string; lastName: string };
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validUntil?: string | null;
  notes?: string | null;
  currencyCode?: string | null;
  convertedSaleId?: string | null;
  convertedSale?: unknown;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteDto {
  clientId?: string;
  items: { productId: string; quantity: number; unitPrice?: number; discount?: number }[];
  discount?: number;
  validUntil?: string;
  notes?: string;
  currencyCode?: string;
}

export interface ConvertToSaleDto {
  /** Quantités par ligne. Si absent = quantités complètes. */
  quantities?: { quoteItemId: string; quantity: number }[];
}
