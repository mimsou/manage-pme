export enum StockMovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  SALE = 'SALE',
  INVENTORY = 'INVENTORY',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  LOSS = 'LOSS',
  THEFT = 'THEFT',
  DAMAGE = 'DAMAGE',
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  type: StockMovementType;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  reason?: string;
  reference?: string;
  referenceId?: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface CreateDamageDto {
  productId: string;
  type: StockMovementType.DAMAGE | StockMovementType.LOSS;
  quantity: number; // Positif pour ajouter, négatif pour retirer
  reason: string;
}

export interface StockMovementsResponse {
  data: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


