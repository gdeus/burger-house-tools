import api from './api';
import type {
  Daily,
  DailyInput,
  DailyBatchInput,
  DailyPeriodResponse,
  WeeklyUserSummaryResponse,
} from '../types/daily';

export const dailyService = {
  async getWeekly(params?: { date?: string; year?: number; week?: number }): Promise<DailyPeriodResponse> {
    const response = await api.get<DailyPeriodResponse>('/dailies/weekly', { params });
    return response.data;
  },

  async getWeeklySummary(params?: {
    date?: string;
    year?: number;
    week?: number;
    userId?: number;
  }): Promise<WeeklyUserSummaryResponse> {
    const response = await api.get<WeeklyUserSummaryResponse>('/dailies/weekly-summary', { params });
    return response.data;
  },

  async getMonthly(params?: { year?: number; month?: number }): Promise<DailyPeriodResponse> {
    const response = await api.get<DailyPeriodResponse>('/dailies/monthly', { params });
    return response.data;
  },

  async getMonthlySummary(params?: {
    year?: number;
    month?: number;
    userId?: number;
  }): Promise<WeeklyUserSummaryResponse> {
    const response = await api.get<WeeklyUserSummaryResponse>('/dailies/monthly-summary', { params });
    return response.data;
  },

  async create(daily: DailyInput): Promise<Daily> {
    const response = await api.post<Daily>('/dailies', daily);
    return response.data;
  },

  async createBatch(batch: DailyBatchInput): Promise<Daily[]> {
    const response = await api.post<Daily[]>('/dailies/batch', batch);
    return response.data;
  },

  async updateNotes(id: number, notes?: string): Promise<Daily> {
    const response = await api.put<Daily>(`/dailies/${id}`, { notes });
    return response.data;
  },

  async setPaid(id: number, paid = true): Promise<void> {
    await api.patch(`/dailies/${id}/pay`, null, { params: { paid } });
  },

  async payWeek(params: {
    userId: number;
    date?: string;
    year?: number;
    week?: number;
    paid?: boolean;
  }): Promise<void> {
    await api.patch('/dailies/payWeek', null, { params });
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/dailies/${id}`);
  },
};
