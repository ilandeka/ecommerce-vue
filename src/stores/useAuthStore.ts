// src/stores/useAuthStore.ts
import { defineStore } from 'pinia';
import axios from 'axios';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: never | null;
  loading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    user: null,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    getUser: (state) => state.user,
    getAccessToken: (state) => state.accessToken
  },

  actions: {
    async login(email: string, password: string) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.post('http://localhost:8080/api/auth/login', {
          email,
          password
        });

        const { accessToken, refreshToken, ...userData } = response.data;

        // Store tokens and user data
        this.setTokens(accessToken, refreshToken);
        this.user = userData;

        return true;
      } catch (error) {
        this.error = 'Login failed. Please check your credentials.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async refreshAccessToken() {
      try {
        if (!this.refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('http://localhost:8080/api/auth/refresh', {
          refreshToken: this.refreshToken
        });

        const { accessToken } = response.data;

        // Update only the access token
        this.setTokens(accessToken, this.refreshToken);

        return accessToken;
      } catch (error) {
        // If refresh fails, log out the user
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
    },

    setTokens(accessToken: string | null, refreshToken: string | null) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      // Store tokens in localStorage
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      } else {
        localStorage.removeItem('accessToken');
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.removeItem('refreshToken');
      }
    },

    logout() {
      this.setTokens(null, null);
      this.user = null;
    }
  }
});
