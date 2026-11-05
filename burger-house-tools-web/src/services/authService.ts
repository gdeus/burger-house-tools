import { jwtDecode } from 'jwt-decode';
import api from './api';
import type { AuthUser, LoginRequest, LoginResponse, UserRole } from '../types/auth';

interface KeycloakJwtPayload {
  sub: string;
  name?: string;
  preferred_username?: string;
  realm_roles?: string[];
  realm_access?: {
    roles?: string[];
  };
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getCurrentUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode<KeycloakJwtPayload>(token);
      const rolesList = decoded.realm_roles || decoded.realm_access?.roles || [];
      const roles = rolesList.filter((r): r is UserRole =>
        ['Admin', 'Caixa', 'Garcom'].includes(r)
      );

      const role: UserRole = roles.includes('Admin')
        ? 'Admin'
        : roles.includes('Caixa')
        ? 'Caixa'
        : roles.includes('Garcom')
        ? 'Garcom'
        : 'Garcom';

      return {
        sub: decoded.sub,
        name: decoded.name || decoded.preferred_username || 'Usuário',
        preferred_username: decoded.preferred_username || '',
        roles,
        role,
        isAdmin: roles.includes('Admin'),
        isCaixa: roles.includes('Caixa'),
        isGarcom: roles.includes('Garcom'),
      };
    } catch {
      this.logout();
      return null;
    }
  },
};
