import type { UserRole } from './auth';

export type ContractType = 'Freelancer' | 'Clt';

export interface User {
  id: number;
  keycloakId?: string;
  name: string;
  login: string;
  userRole: UserRole;
  contractType?: ContractType;
  dailyRate?: number;
  dailyRateWkend?: number;
  pix?: string;
}

export interface UserInput {
  name: string;
  login: string;
  password?: string;
  userRole: UserRole;
  contractType: ContractType;
  dailyRate: number;
  dailyRateWkend: number;
  pix: string;
}
