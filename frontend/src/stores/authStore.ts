import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { apiClient } from '@/api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Client axios pour les routes publiques (login, refresh)
const publicClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'VENDEUR';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Initialiser le token depuis le localStorage si disponible
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.state?.accessToken) {
              apiClient.defaults.headers.common['Authorization'] = `Bearer ${parsed.state.accessToken}`;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,

        login: async (email: string, password: string) => {
          try {
            const response = await publicClient.post('/auth/login', {
              email,
              password,
            });

            const { user, accessToken, refreshToken } = response.data;

            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
            });

            // Mettre à jour le header Authorization pour les prochaines requêtes
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Login failed');
          }
        },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Supprimer le header Authorization
        delete apiClient.defaults.headers.common['Authorization'];
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await publicClient.post('/auth/refresh', {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          set({
            accessToken,
            refreshToken: newRefreshToken,
          });

          // Mettre à jour le header Authorization
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          get().logout();
        }
      },
    };
    },
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Après la réhydratation, mettre à jour le header Authorization
        if (state?.accessToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
        }
      },
    }
  )
);

