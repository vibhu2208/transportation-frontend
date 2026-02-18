'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');

      if (!token || !userData) {
        router.push('/');
        return;
      }

      try {
        const user = JSON.parse(userData);
        
        // Check role-based access if roles are specified
        if (allowedRoles && allowedRoles.length > 0) {
          const hasAccess = allowedRoles.includes(user.role);
          if (!hasAccess) {
            // Redirect to appropriate dashboard based on role
            if (user.role === UserRole.ADMIN) {
              router.push('/admin/dashboard');
            } else if (user.role === UserRole.VENDOR) {
              router.push('/vendor/dashboard');
            } else {
              router.push('/dashboard');
            }
            return;
          }
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return fallback || null;
  }

  return <>{children}</>;
}
