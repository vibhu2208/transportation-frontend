'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Truck, 
  Users, 
  BarChart3, 
  Bell, 
  LogOut, 
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TripManagement } from '@/modules/trips/TripManagement';
import { VendorManagement } from '@/modules/vendors/VendorManagement';
import { AnalyticsDashboard } from '@/modules/analytics/AnalyticsDashboard';
import { NotificationCenter } from '@/modules/notifications/NotificationCenter';

interface DashboardLayoutProps {
  onLogout: () => void;
}

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('trips');
  const router = useRouter();
  const pathname = usePathname();

  const navigation = [
    { id: 'trips', name: 'Trip Management', icon: Truck },
    { id: 'vendors', name: 'Vendor Management', icon: Users },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'trips':
        return <TripManagement />;
      case 'vendors':
        return <VendorManagement onEdit={(vendor) => console.log('Edit vendor:', vendor)} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'notifications':
        return <NotificationCenter />;
      default:
        return <TripManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">
            Vendor System
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`
                    w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                    ${activeModule === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-medium text-gray-900">
              {navigation.find(n => n.id === activeModule)?.name}
            </h2>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Module content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderActiveModule()}
          </div>
        </main>
      </div>
    </div>
  );
}
