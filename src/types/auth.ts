export enum UserRole {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  USER = 'USER',
  SHIPPER = 'SHIPPER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  vendorId?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
