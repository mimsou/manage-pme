export interface SupplierContact {
  id: string;
  supplierId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  paymentTerms?: string;
  discount?: number;
  createdAt: string;
  updatedAt: string;
  contacts?: SupplierContact[];
  _count?: {
    products: number;
    purchases: number;
  };
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  paymentTerms?: string;
  discount?: number;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  paymentTerms?: string;
  discount?: number;
}


