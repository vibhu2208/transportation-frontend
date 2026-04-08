import axios from 'axios';

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';

/**
 * In the browser, default to same-origin `/api-backend` so Next.js rewrites forward to Nest
 * (see next.config.js). Only using `NEXT_PUBLIC_API_URL` in production (`next start`) skipped the
 * proxy and could send POSTs to the Next origin — e.g. "Cannot POST /trips/bulk-upload/preview".
 *
 * Set `NEXT_PUBLIC_API_USE_PROXY=false` and `NEXT_PUBLIC_API_URL` to call the API directly.
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const proxyDisabled = process.env.NEXT_PUBLIC_API_USE_PROXY === 'false';
    if (!proxyDisabled) {
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
