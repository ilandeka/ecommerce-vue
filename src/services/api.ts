import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import router from '@/router'

class ApiService {
  private readonly api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:8080/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - adds token to requests
    this.api.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore();
        const token = authStore.getAccessToken;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handles token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, wait for new token
            return new Promise(resolve => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const authStore = useAuthStore();
            const newToken = await authStore.refreshAccessToken();

            this.refreshSubscribers.forEach(callback => callback(newToken));
            this.refreshSubscribers = [];

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // If refresh fails, redirect to login
            const authStore = useAuthStore();
            authStore.logout();
            router.push('/login');
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public get instance(): AxiosInstance {
    return this.api;
  }
}

// Create and export a singleton instance
let apiService: ApiService | null = null;

export const createApiService = (): ApiService => {
  if (!apiService) {
    apiService = new ApiService();
  }
  return apiService;
};
