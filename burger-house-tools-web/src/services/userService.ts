import api from './api';
import type { User, UserInput } from '../types/user';

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getById(id: number): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(user: UserInput): Promise<User> {
    const response = await api.post<User>('/users', user);
    return response.data;
  },

  async update(id: number, user: UserInput): Promise<void> {
    await api.put(`/users/${id}`, user);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
