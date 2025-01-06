import axios, { type AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotifications } from '@/composables/useNotification'
import { config } from '@/config/env';

class ApiService {
  private readonly api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private notifications = useNotifications();

  constructor() {
    this.api = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore();
        const token = authStore.getAccessToken;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking concurrent requests
        config.headers['X-Request-ID'] = Date.now().toString();

        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle timeout errors
        if (error.code === 'ECONNABORTED') {
          this.notifications.addNotification(
            'Request timed out. Please try again.',
            'error'
          );
          return Promise.reject(error);
        }

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request if we're already refreshing
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

            // Process queued requests with new token
            this.processQueue(newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.processQueue(null);
            const authStore = useAuthStore();
            authStore.logout();
            this.notifications.addNotification(
              'Session expired. Please log in again.',
              'warning'
            );
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError) {
    let message = 'An unexpected error occurred';

    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      if (status === 404) {
        message = 'Resource not found';
      } else if (status === 403) {
        message = 'You don\'t have permission to access this resource';
      } else if (status === 422) {
        message = 'Invalid data provided';
      }
    } else if (error.request) {
      // Request made but no response
      message = 'Server is not responding';
    }

    this.notifications.addNotification(message, 'error');
    return error;
  }

  private processQueue(token: string | null) {
    this.refreshSubscribers.forEach(callback => {
      if (token) {
        callback(token);
      }
    });
    this.refreshSubscribers = [];
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
