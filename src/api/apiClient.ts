// src/api/apiClient.ts
import axios from 'axios';
import { clearAuth, getAuthToken } from '../auth/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: use shared auth store and legacy fallback keys.
apiClient.interceptors.request.use(
  (config) => {
    const token =
      getAuthToken() ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('xmas_access_token') || localStorage.getItem('token')
        : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: clear auth on 401 to avoid stale tokens.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
