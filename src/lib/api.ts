import axios from 'axios';

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';

/**
 * In the browser during `next dev`, default to same-origin `/api-backend` so Next.js rewrites
 * forward to Nest (port 3000). That avoids "Cannot POST /invoices/..." when requests accidentally
 * hit the Next server on the same port as NEXT_PUBLIC_API_URL.
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const proxyDisabled = process.env.NEXT_PUBLIC_API_USE_PROXY === 'false';
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && !proxyDisabled) {
      return `${window.location.origin}/api-backend`;
    }
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
  return fromEnv.replace(/\/$/, '');
}

// Create axios instance (baseURL set per request — see interceptor)
export const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
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
  apiBaseUrl: typeof window !== 'undefined' ? getApiBaseUrl() : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Vendor Booking System',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};

export default api;
