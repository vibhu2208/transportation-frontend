'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserRole } from '@/types/auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check for existing auth token and redirect based on role
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        
        // Redirect based on user role
        switch (user.role) {
          case UserRole.ADMIN:
            router.push('/admin/dashboard');
            break;
          case UserRole.VENDOR:
            router.push('/vendor/dashboard');
            break;
          default:
            router.push('/dashboard');
            break;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, [router]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        // Redirect based on user role
        switch (user.role) {
          case UserRole.ADMIN:
            router.push('/admin/dashboard');
            break;
          case UserRole.VENDOR:
            router.push('/vendor/dashboard');
            break;
          default:
            router.push('/dashboard');
            break;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/dashboard');
      }
    } else {
      router.push('/dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setIsAuthenticated(false);
    router.push('/');
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
            Transportation Management
          </h1>
          <p className="mt-3 text-center text-gray-600 text-lg font-medium">
            Professional Logistics & Fleet Management
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2">
            <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
            <div className="h-1 w-8 bg-indigo-600 rounded-full"></div>
            <div className="h-1 w-8 bg-purple-600 rounded-full"></div>
          </div>
        </div>

        {/* Main login card */}
        <div className="bg-white/80 backdrop-blur-xl py-8 px-8 shadow-2xl border border-white/20 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Welcome Back
            </h2>
            <p className="text-center text-gray-600">
              Sign in to access your dashboard
            </p>
          </div>
          
          <LoginForm onLogin={handleLogin} />
          
          {/* Demo accounts section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Demo Accounts
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">Admin</span>
                      <p className="text-xs text-gray-600">Full system access</p>
                    </div>
                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                      admin@transport.com
                    </code>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-indigo-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">Vendor 1</span>
                      <p className="text-xs text-gray-600">Transport company</p>
                    </div>
                    <code className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-mono">
                      vendor1@transport.com
                    </code>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">Vendor 2</span>
                      <p className="text-xs text-gray-600">Logistics provider</p>
                    </div>
                    <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono">
                      vendor2@transport.com
                    </code>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200 text-center">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">password123</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure login • End-to-end encryption • Role-based access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
