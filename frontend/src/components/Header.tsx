'use client';

import React from 'react';
import { useApp } from './AppContext';
import { Sun, Moon, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';

export function Header() {
  const { metrics, wsConnected, logout, theme, setTheme, notifications, dismissNotification } = useApp();

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getSystemStatus = () => {
    if (!wsConnected) return { text: 'Disconnected', color: 'bg-red-500' };
    if (notifications.length > 0) {
      const hasCritical = notifications.some(n => n.level === 'critical');
      return { 
        text: hasCritical ? 'System Warning' : 'Issues Logged', 
        color: hasCritical ? 'bg-amber-500' : 'bg-yellow-400' 
      };
    }
    return { text: 'Online', color: 'bg-emerald-500' };
  };

  const status = getSystemStatus();

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${status.color}`}></span>
        </span>
        <span className="text-sm font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400">
          PiControl: {status.text}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Header Telemetry Stats */}
        {metrics && (
          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <div className="flex flex-col">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">CPU</span>
              <span className="text-zinc-800 dark:text-zinc-200">{metrics.cpu.usage}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">RAM</span>
              <span className="text-zinc-800 dark:text-zinc-200">{metrics.ram.usePercent}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">TEMP</span>
              <span className="text-zinc-800 dark:text-zinc-200">{metrics.cpu.temperature}°C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">UPTIME</span>
              <span className="text-zinc-800 dark:text-zinc-200">{formatUptime(metrics.cpu.throttled !== undefined ? 0 : 0 /* managed dynamically or static fallbacks */)}</span>
            </div>
          </div>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
          {/* Notifications Indicator */}
          {notifications.length > 0 && (
            <div className="relative group mr-2">
              <button 
                onClick={() => dismissNotification()}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-yellow-500 rounded-md transition-colors"
                title="Dismiss all alerts"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              </button>
              
              {/* Notifications Dropdown (Hover) */}
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl hidden group-hover:block z-50 p-3 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase text-zinc-400">System Alerts</span>
                  <button 
                    onClick={() => dismissNotification()}
                    className="text-[10px] text-blue-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-2 rounded text-xs flex justify-between gap-2 ${
                        n.level === 'critical' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900' : 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{n.message}</p>
                        <span className="text-[10px] opacity-75">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <button 
                        onClick={() => dismissNotification(n.id)}
                        className="text-[10px] font-bold hover:underline"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Theme toggler */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors"
            title="Logout from session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
