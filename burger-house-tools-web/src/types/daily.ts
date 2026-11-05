import type { UserRole } from './auth';

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
  dayTotal?: number;
}

export interface DailyPeriodResponse {
  period: string;
  mode: 'Weekly' | 'Monthly';
  startDate: string;
  endDate: string;
  days: DailyDaySummary[];
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
}

export interface UserWeeklySummary {
  userId: number;
  userName: string;
  login: string;
  userRole: UserRole;
  pix: string;
  dailyRate?: number;
  dailyRateWkend?: number;
  totalDailies: number;
  weekdayDailies: number;
  weekendDailies: number;
  paidDailies: number;
  pendingDailies: number;
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
  dailies: Daily[];
}

export interface WeeklyUserSummaryResponse {
  period: string;
  startDate: string;
  endDate: string;
  totalDailiesCount: number;
  totalValue?: number;
  totalPaid?: number;
  totalPending?: number;
  users: UserWeeklySummary[];
}
