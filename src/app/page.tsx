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
          case UserRole.SHIPPER:
            router.push('/shipper/dashboard');
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
          case UserRole.SHIPPER:
            router.push('/shipper/dashboard');
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-gray-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-black uppercase tracking-wide">REDIRECTING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background geometric pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-b from-emerald-50 to-green-100"></div>
          <div className="absolute bottom-0 left-0 w-1/4 h-2/3 bg-gradient-to-t from-emerald-50 to-transparent"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-emerald-500 opacity-5 transform rotate-45"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-green-600 opacity-5 transform rotate-12"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Logo and branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-emerald-600 flex items-center justify-center shadow-2xl mb-6 border-4 border-white">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 text-center tracking-tight px-2">
            TRANSPORT<span className="text-emerald-600">PRO</span>
          </h1>
          <p className="mt-4 text-center text-gray-700 text-lg font-semibold uppercase tracking-wide">
            Professional Fleet Management System
          </p>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="h-2 w-12 bg-emerald-600"></div>
            <div className="h-2 w-12 bg-green-500"></div>
            <div className="h-2 w-12 bg-emerald-400"></div>
          </div>
        </div>

        {/* Main login card */}
        <div className="bg-white py-6 px-4 sm:py-10 sm:px-10 shadow-2xl border-4 border-gray-200">
          <div className="mb-8">
            <div className="w-full h-1 bg-emerald-600 mb-6"></div>
            <h2 className="text-3xl font-black text-gray-900 text-center mb-3 uppercase tracking-wide">
              SECURE LOGIN
            </h2>
            <p className="text-center text-gray-700 font-semibold uppercase text-sm tracking-wider">
              Enter your credentials to continue
            </p>
          </div>
          
          <LoginForm onLogin={handleLogin} />
          
          {/* Demo accounts section */}
          <div className="mt-10 border-t-4 border-emerald-600 pt-8">
            <div className="bg-gray-50 p-6 border-2 border-gray-200">
              <h3 className="font-black text-gray-900 mb-6 flex items-center text-lg uppercase tracking-wide">
                <svg className="w-6 h-6 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                DEMO ACCOUNTS
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 border-2 border-emerald-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <span className="font-black text-gray-900 text-sm uppercase">ADMIN</span>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">FULL SYSTEM ACCESS</p>
                    </div>
                    <code className="bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-mono font-bold border border-emerald-300 break-all">
                      admin@transport.com
                    </code>
                  </div>
                </div>
                <div className="bg-white p-4 border-2 border-green-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <span className="font-black text-gray-900 text-sm uppercase">VENDOR 1</span>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">TRANSPORT COMPANY</p>
                    </div>
                    <code className="bg-green-100 text-green-800 px-3 py-2 text-xs font-mono font-bold border border-green-300 break-all">
                      vendor1@transport.com
                    </code>
                  </div>
                </div>
                <div className="bg-white p-4 border-2 border-emerald-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <span className="font-black text-gray-900 text-sm uppercase">VENDOR 2</span>
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">LOGISTICS PROVIDER</p>
                    </div>
                    <code className="bg-emerald-50 text-emerald-800 px-3 py-2 text-xs font-mono font-bold border border-emerald-400 break-all">
                      vendor2@transport.com
                    </code>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-emerald-600 text-center">
                  <div className="flex items-center justify-center space-x-3 text-sm text-gray-800">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-mono bg-emerald-100 px-4 py-2 font-bold border-2 border-emerald-300 text-emerald-800">password123</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="w-full h-1 bg-emerald-600 mb-4"></div>
            <p className="text-xs text-gray-700 font-bold uppercase tracking-widest">
              SECURE • ENCRYPTED • ROLE-BASED ACCESS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
