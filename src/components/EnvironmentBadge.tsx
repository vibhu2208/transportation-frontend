'use client';

import { environment } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export function EnvironmentBadge() {
  if (environment.isProduction) {
    return null; // Don't show badge in production
  }

  return (
    <Badge variant="secondary" className="fixed top-4 right-4 z-50 bg-orange-100 text-orange-800 border-orange-300">
      <span className="flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        Development Environment
      </span>
    </Badge>
  );
}
