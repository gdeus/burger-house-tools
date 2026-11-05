export type UserRole = 'Admin' | 'Caixa' | 'Garcom';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export interface AuthUser {
  sub: string;
  name: string;
  preferred_username: string;
  roles: UserRole[];
  role: UserRole;
  isAdmin: boolean;
  isCaixa: boolean;
  isGarcom: boolean;
}
