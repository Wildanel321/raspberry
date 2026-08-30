'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  username: string;
  role: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: [number, number, number];
    temperature: number;
    frequency: number;
    cores: number;
    throttled: string;
  };
  ram: {
    total: number;
    used: number;
    available: number;
    cached: number;
    usePercent: number;
    swapTotal: number;
    swapUsed: number;
  };
  storage: Array<{
    filesystem: string;
    mountPoint: string;
    total: number;
    used: number;
    free: number;
    usePercent: number;
  }>;
  network: {
    interfaces: Array<{
      name: string;
      ip: string;
      mac: string;
      rxBytes: number;
      txBytes: number;
      type: 'ethernet' | 'wifi' | 'loopback' | 'other';
      signalStrength?: number;
      ssid?: string;
    }>;
    uploadSpeed: number;
    downloadSpeed: number;
    totalUpload: number;
    totalDownload: number;
    internetConnected: boolean;
  };
}

export interface Notification {
  id: number;
  message: string;
  level: 'info' | 'warning' | 'critical';
  timestamp: string;
  dismissed: number;
}

interface AppContextType {
  token: string | null;
  user: User | null;
  theme: 'dark' | 'light';
  wsConnected: boolean;
  metrics: SystemMetrics | null;
  notifications: Notification[];
  activeView: string;
  apiUrl: string;
  login: (token: string, user: User) => void;
  logout: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveView: (view: string) => void;
  fetchNotifications: () => Promise<void>;
  dismissNotification: (id?: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [wsConnected, setWsConnected] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeView, setActiveViewInternal] = useState('dashboard');
  const [apiUrl, setApiUrl] = useState('');

  // Initial load
  useEffect(() => {
    // Detect host API URL dynamically (handles LAN access automatically)
    const host = window.location.hostname;
    // If running Next.js dev server on port 3000, API is on port 3000 as it runs custom server
    // In production, the port is the same as the served window port
    const port = window.location.port === '3000' && process.env.NODE_ENV === 'development' ? '3000' : window.location.port || '3000';
    setApiUrl(`http://${host}:${port}`);

    // Load auth
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    // Load theme
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = storedTheme || 'dark';
    setThemeState(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    // Hash router listener
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      setActiveViewInternal(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // init route

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash helper
  const setActiveView = (view: string) => {
    window.location.hash = `#${view}`;
    setActiveViewInternal(view);
  };

  // Theme changer
  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Auth actions
  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMetrics(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '';
    setActiveViewInternal('dashboard');
  };

  // Fetch notifications helper
  const fetchNotifications = async () => {
    if (!token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications.filter((n: Notification) => n.dismissed === 0));
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  const dismissNotification = async (id?: number) => {
    if (!token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/notifications/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('Failed to dismiss notifications:', e);
    }
  };

  // WebSocket Connection for Telemetry
  useEffect(() => {
    if (!token || !apiUrl) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const cleanHost = apiUrl.replace(/^https?:\/\//, '');
      
      ws = new WebSocket(`${wsProto}://${cleanHost}`);

      ws.onopen = () => {
        setWsConnected(true);
        console.log('WS Connection opened');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics') {
            setMetrics(data);
          }
        } catch (e) {
          console.error('Failed to parse WS metrics:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('WS Connection closed, retrying...');
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
        ws.close();
      };
    };

    connectWS();
    
    // Poll notifications
    fetchNotifications();
    const notificationInterval = setInterval(fetchNotifications, 10000);

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      clearInterval(notificationInterval);
    };
  }, [token, apiUrl]);

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        theme,
        wsConnected,
        metrics,
        notifications,
        activeView,
        apiUrl,
        login,
        logout,
        setTheme,
        setActiveView,
        fetchNotifications,
        dismissNotification
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
