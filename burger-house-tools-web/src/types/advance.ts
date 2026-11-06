import type { UserRole } from './auth';

export interface Advance {
  id: number;
  userId: number;
  userName: string;
  userRole: UserRole;
  contractType?: 'Freelancer' | 'Clt';
  value: number;
  date: string;
  notes?: string;
}

export interface AdvanceInput {
  userId: number;
  value: number;
  date: string;
  notes?: string;
}
