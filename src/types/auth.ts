export enum UserRole {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  USER = 'USER',
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
