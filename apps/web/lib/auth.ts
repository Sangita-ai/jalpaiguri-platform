import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';

export type UserRole =
  | 'CITIZEN' | 'FIELD_WORKER' | 'DEPT_HEAD'
  | 'MUNICIPAL_OFFICER' | 'CHAIRMAN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  wardId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (access: string, refresh: string) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(email, password);
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);
          }
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, accessToken: null, refreshToken: null });
        window.location.href = '/login';
      },

      setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        set({ accessToken: access, refreshToken: refresh });
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user }) }
  )
);

// Role hierarchy helpers
const ROLE_LEVEL: Record<UserRole, number> = {
  CITIZEN: 1, FIELD_WORKER: 2, DEPT_HEAD: 3,
  MUNICIPAL_OFFICER: 4, CHAIRMAN: 5, SUPER_ADMIN: 6,
};

export const hasRole = (user: AuthUser | null, ...roles: UserRole[]) =>
  user ? roles.includes(user.role) : false;

export const hasMinRole = (user: AuthUser | null, minRole: UserRole) =>
  user ? ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole] : false;

export const isOfficer = (user: AuthUser | null) =>
  hasMinRole(user, 'DEPT_HEAD');

export const ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN:          'Citizen',
  FIELD_WORKER:     'Field Worker',
  DEPT_HEAD:        'Department Head',
  MUNICIPAL_OFFICER:'Municipal Officer',
  CHAIRMAN:         'Municipal Chairman',
  SUPER_ADMIN:      'Super Administrator',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  CITIZEN:           'bg-slate-100 text-slate-700',
  FIELD_WORKER:      'bg-blue-50 text-blue-700',
  DEPT_HEAD:         'bg-purple-50 text-purple-700',
  MUNICIPAL_OFFICER: 'bg-indigo-50 text-indigo-700',
  CHAIRMAN:          'bg-amber-50 text-amber-700',
  SUPER_ADMIN:       'bg-red-50 text-red-700',
};
