export enum ClientType {
  PARTICULIER = 'PARTICULIER',
  SOCIETE = 'SOCIETE',
}

export interface Client {
  id: string;
  type: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sales: number;
  };
}

export interface CreateClientDto {
  type?: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
}

export interface UpdateClientDto {
  type?: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
}

export interface ClientsResponse {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


