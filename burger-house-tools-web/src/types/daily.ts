import type { UserRole } from './auth';
import type { ContractType } from './user';
import type { Advance } from './advance';

export interface Daily {
  id: number;
  date: string;
  userId: number;
  userName: string;
  userRole: UserRole;
  paid: boolean;
  notes?: string;
  value?: number;
}

export interface DailyInput {
  userId: number;
  date: string;
  paid?: boolean;
  notes?: string;
}

export interface DailyBatchInput {
  userIds: number[];
  date: string;
  paid?: boolean;
  notes?: string;
}

export interface DailyDaySummary {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  dailies: Daily[];
  advances?: Advance[];
  dayAdvancesTotal?: number;
  dayTotal?: number;
}

export interface DailyPeriodResponse {
  period: string;
  mode: 'Weekly' | 'Monthly';
  startDate: string;
  endDate: string;
  days: DailyDaySummary[];
  totalAdvances?: number;
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
}

export interface UserWeeklySummary {
  userId: number;
  userName: string;
  login: string;
  userRole: UserRole;
  contractType?: ContractType;
  pix: string;
  dailyRate?: number;
  dailyRateWkend?: number;
  totalDailies: number;
  weekdayDailies: number;
  weekendDailies: number;
  paidDailies: number;
  pendingDailies: number;
  advancesCount?: number;
  totalAdvances?: number;
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
  dailies: Daily[];
  advances?: Advance[];
}

export interface WeeklyUserSummaryResponse {
  period: string;
  startDate: string;
  endDate: string;
  totalDailiesCount: number;
  totalAdvancesCount?: number;
  totalAdvances?: number;
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
  users: UserWeeklySummary[];
}
