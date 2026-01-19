'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TokenResponse, User, UserLogin, UserRegister, UserUpdate } from '@/types';

import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: UserLogin) => Promise<void>;
  register: (data: UserRegister) => Promise<void>;
  logout: () => void;
  updateUser: (data: UserUpdate) => Promise<void>;
  clearError: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: UserLogin) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<TokenResponse>('/api/auth/login', data);
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      register: async (data: UserRegister) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<TokenResponse>('/api/auth/register', data);
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateUser: async (data: UserUpdate) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          throw new Error('Not authenticated');
        }

        set({ isLoading: true, error: null });
        try {
          const response = await api.patch<User>('/api/auth/me', data);
          set({ user: response, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Update failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setToken: (token: string) => {
        set({ token });
      },
    }),
    {
      name: 'office-detective-auth',
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Selector for getting auth token (useful for API calls)
export const getAuthToken = (): string | null => {
  return useAuthStore.getState().token;
};
