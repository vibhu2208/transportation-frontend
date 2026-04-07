export interface Party {
  id: string;
  name: string;
  gstIn?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  remainingBalance?: number;
  _count?: {
    trips: number;
    invoices: number;
  };
}

export interface CreatePartyRequest {
  name: string;
  gstIn?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdatePartyRequest extends Partial<CreatePartyRequest> {
  isActive?: boolean;
}
