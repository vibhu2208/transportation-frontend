import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add environment info for debugging
    config.headers['X-Environment'] = ENVIRONMENT;
    
    console.log(`[${ENVIRONMENT.toUpperCase()}] API Request:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[${ENVIRONMENT.toUpperCase()}] API Response:`, {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    console.error(`[${ENVIRONMENT.toUpperCase()}] API Error:`, {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
    });
    
    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/';
    }
    
    return Promise.reject(error);
  }
);

// Export environment info
export const environment = {
  isDevelopment: ENVIRONMENT === 'development',
  isProduction: ENVIRONMENT === 'production',
  apiBaseUrl: API_BASE_URL,
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Vendor Booking System',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};

export default api;
