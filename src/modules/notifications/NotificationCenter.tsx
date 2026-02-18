'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'DUPLICATE_VEHICLE' | 'TRIP_CREATED' | 'TRIP_UPDATED';
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/notifications`;
      if (filter !== 'all') {
        url += `?type=${filter}`;
      }

      const response = await axios.get(url, { headers });
      setNotifications(response.data);
    } catch (error: any) {
      toast.error('Failed to fetch notifications');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${notificationId}/read`, {}, { headers });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error: any) {
      toast.error('Failed to mark notification as read');
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/mark-all-read`, {}, { headers });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark all notifications as read');
      console.error(error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${notificationId}`, { headers });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error('Failed to delete notification');
      console.error(error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'DUPLICATE_VEHICLE':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-green-200 bg-green-50';
      case 'ERROR':
        return 'border-red-200 bg-red-50';
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50';
      case 'DUPLICATE_VEHICLE':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="all">All</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
            <option value="SUCCESS">Success</option>
          </select>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No notifications found</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all ${
                notification.isRead 
                  ? 'bg-white border-gray-200' 
                  : getNotificationColor(notification.type)
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${
                        notification.isRead ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      notification.isRead ? 'text-gray-600' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
