import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const TOKEN_KEY = 'tila_jwt_token';
const REFRESH_TOKEN_KEY = 'tila_refresh_token';
const ACTIVE_CONTEXT_KEY = 'tila_active_context';

// Helper to manage tokens
export const tokenService = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  getActiveContext: () => SecureStore.getItemAsync(ACTIVE_CONTEXT_KEY),
  setTokens: async (token: string, refreshToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  setActiveContext: async (contextId: string) => {
    await SecureStore.setItemAsync(ACTIVE_CONTEXT_KEY, contextId);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACTIVE_CONTEXT_KEY);
    try {
      await AsyncStorage.removeItem('tila_user_context');
    } catch {}
  },
  getInitialAuthRoute: async (): Promise<string | null> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return null;

      const activeContext = await SecureStore.getItemAsync(ACTIVE_CONTEXT_KEY);
      if (activeContext) {
        switch (activeContext.toUpperCase()) {
          case 'SUPERVISOR':
            return '/(supervisor)/dashboard';
          case 'PRO':
          case 'SPECIALIST':
            return '/(specialist)/dashboard';
          case 'HEALTH_AGENT':
          case 'COMMUNITY_AGENT':
            return '/(health-agent)/dashboard';
          case 'FIELD_AGENT':
            return '/(field-agent)/dashboard';
          case 'PATIENT':
            return '/(patient)/dashboard';
        }
      }

      const storedContextStr = await AsyncStorage.getItem('tila_user_context');
      if (storedContextStr) {
        const userContext = JSON.parse(storedContextStr);
        if (userContext?.spaces && Array.isArray(userContext.spaces) && userContext.spaces.length > 0) {
          const space = userContext.spaces[0];
          const spacePath = space.path || '';
          if (space.type === 'PATIENT' || spacePath === '/mon-espace') {
            return '/(patient)/dashboard';
          } else if (spacePath === '/professionnels' || space.type === 'PRO') {
            return '/(specialist)/dashboard';
          } else if (spacePath === '/espace-agent' || space.type === 'HEALTH_AGENT') {
            return '/(health-agent)/dashboard';
          } else if (spacePath === '/espace-superviseur' || space.type === 'SUPERVISOR') {
            return '/(supervisor)/dashboard';
          } else if (spacePath === '/espace-agent-terrain-migrant' || space.type === 'FIELD_AGENT') {
            return '/(field-agent)/dashboard';
          }
        }
        if (userContext?.roles?.some((r: string) => r.includes('ROLE_PRO'))) {
          return '/(specialist)/dashboard';
        }
      }

      // Contexte par défaut pour tout utilisateur authentifié
      return '/(patient)/dashboard';
    } catch (err) {
      console.error('[Auth] Erreur lors de la résolution de session persistante:', err);
      return null;
    }
  },
};

// Request Interceptor: Attach the JWT token
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenService.getToken();
    const activeContext = await tokenService.getActiveContext();

    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (activeContext) {
        config.headers['X-Active-Context'] = activeContext;
      }
      
      console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`[Headers] X-Active-Context: ${config.headers['X-Active-Context']}, Auth: ${token ? 'Present' : 'Missing'}`);
    }
    return config;
  },
  (error) => {
    console.error('[Request Error]', error.message);
    if (error.response) {
      console.error('[Error Response Data]', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 & Silent Refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If it's a 401 error and we haven't retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await tokenService.getRefreshToken();
      
      if (refreshToken) {
        try {
          // Request new token using refresh token
          // Note: adjust the endpoint based on Symfony LexikJWTAuthenticationBundle refresh route
          const response = await axios.post(`${API_URL}/api/token/refresh`, {
            refresh_token: refreshToken
          });

          const { token, refresh_token: newRefreshToken } = response.data;
          
          await tokenService.setTokens(token, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          processQueue(null, token);
          return axiosInstance(originalRequest);
          
        } catch (refreshError) {
          processQueue(refreshError, null);
          await tokenService.clearTokens();
          // Optionally: redirect to login
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token available, clear session
        await tokenService.clearTokens();
        // Optionally: redirect to login
        return Promise.reject(error);
      }
    }
    
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      console.warn(`[API ${status}]`, error.config?.url, (error.response?.data as any)?.error || error.message);
    } else {
      console.warn(`[API ${status || 'Error'}]`, error.config?.url, error.message, error.response?.data);
    }

    return Promise.reject(error);
  }
);


// Custom wrapper to return .data and handle query params correctly
export const apiClient = {
  get: async <T = any>(url: string, config?: any): Promise<T> => {
    let axiosConfig = config;
    if (config && !config.params && !config.headers && !config.responseType) {
      axiosConfig = { params: config };
    }
    const res = await axiosInstance.get<T>(url, axiosConfig);
    return res.data;
  },
  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await axiosInstance.post<T>(url, data, config);
    return res.data;
  },
  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await axiosInstance.put<T>(url, data, config);
    return res.data;
  },
  patch: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const res = await axiosInstance.patch<T>(url, data, config);
    return res.data;
  },
  delete: async <T = any>(url: string, config?: any): Promise<T> => {
    let axiosConfig = config;
    if (config && !config.params && !config.headers && !config.responseType) {
      axiosConfig = { params: config };
    }
    const res = await axiosInstance.delete<T>(url, axiosConfig);
    return res.data;
  }
};
