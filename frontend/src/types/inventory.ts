import type { Product, ProductVariant } from './product';

export type InventoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED';

export interface InventoryUserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface InventoryItem {
  id: string;
  inventoryId: string;
  productId: string;
  productVariantId: string | null;
  theoreticalQty: number;
  countedQty: number;
  difference: number;
  reason: string | null;
  createdAt: string;
  product: Product;
  productVariant: ProductVariant | null;
}

export interface Inventory {
  id: string;
  reference: string;
  userId: string;
  status: InventoryStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: InventoryUserSummary;
  items?: InventoryItem[];
  _count?: { items: number };
}
