import type { UserRole } from './auth';

export interface User {
  id: number;
  keycloakId?: string;
  name: string;
  login: string;
  userRole: UserRole;
  dailyRate?: number;
  dailyRateWkend?: number;
  pix?: string;
}

export interface UserInput {
  name: string;
  login: string;
  password?: string;
  userRole: UserRole;
  dailyRate: number;
  dailyRateWkend: number;
  pix: string;
}
