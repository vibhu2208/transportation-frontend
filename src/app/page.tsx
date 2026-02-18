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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Transportation Management System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Role-based access control demo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm onLogin={handleLogin} />
          
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="text-sm text-gray-600">
              <h3 className="font-medium text-gray-900 mb-2">Test Accounts:</h3>
              <div className="space-y-2">
                <div>
                  <strong>Admin:</strong> admin@transport.com / password123
                </div>
                <div>
                  <strong>Vendor 1:</strong> vendor1@transport.com / password123
                </div>
                <div>
                  <strong>Vendor 2:</strong> vendor2@transport.com / password123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
