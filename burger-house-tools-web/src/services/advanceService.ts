import api from './api';
import type { Advance, AdvanceInput } from '../types/advance';

export const advanceService = {
  async getAll(params?: {
    userId?: number;
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
  }): Promise<Advance[]> {
    const response = await api.get<Advance[]>('/advances', { params });
    return response.data;
  },

  async getById(id: number): Promise<Advance> {
    const response = await api.get<Advance>(`/advances/${id}`);
    return response.data;
  },

  async getByUser(userId: number): Promise<Advance[]> {
    const response = await api.get<Advance[]>(`/advances/user/${userId}`);
    return response.data;
  },

  async create(advance: AdvanceInput): Promise<Advance> {
    const response = await api.post<Advance>('/advances', advance);
    return response.data;
  },

  async update(id: number, advance: AdvanceInput): Promise<Advance> {
    const response = await api.put<Advance>(`/advances/${id}`, advance);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/advances/${id}`);
  },
};
