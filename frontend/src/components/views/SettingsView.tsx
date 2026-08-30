'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Settings, Lock, Eye, CheckCircle } from 'lucide-react';

export function SettingsView() {
  const { token, apiUrl, theme, setTheme } = useApp();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Thresholds settings state
  const [cpuThreshold, setCpuThreshold] = useState(80);
  const [ramThreshold, setRamThreshold] = useState(85);
  const [tempThreshold, setTempThreshold] = useState(70);
  const [diskThreshold, setDiskThreshold] = useState(90);
  const [monitorInterval, setMonitorInterval] = useState(2000);

  // Password reset state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchSettings = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.CPU_THRESHOLD) setCpuThreshold(Number(s.CPU_THRESHOLD));
        if (s.RAM_THRESHOLD) setRamThreshold(Number(s.RAM_THRESHOLD));
        if (s.TEMP_THRESHOLD) setTempThreshold(Number(s.TEMP_THRESHOLD));
        if (s.DISK_THRESHOLD) setDiskThreshold(Number(s.DISK_THRESHOLD));
        if (s.MONITOR_INTERVAL) setMonitorInterval(Number(s.MONITOR_INTERVAL));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token, apiUrl]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !apiUrl) return;

    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: {
            CPU_THRESHOLD: cpuThreshold,
            RAM_THRESHOLD: ramThreshold,
            TEMP_THRESHOLD: tempThreshold,
            DISK_THRESHOLD: diskThreshold,
            MONITOR_INTERVAL: monitorInterval
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('System configurations updated successfully!');
      } else {
        setErrorMsg(data.error || 'Failed to update configurations');
      }
    } catch (err) {
      setErrorMsg('Connection error. Failed to save settings.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !apiUrl) return;

    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Account credentials reset successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.error || 'Incorrect old password');
      }
    } catch (err) {
      setErrorMsg('Connection failure. Password change failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">System Settings</h2>
            <p className="text-xs text-zinc-500">Configure alert thresholds, change credentials, adjust polling intervals, and adjust themes.</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded text-xs text-emerald-500 font-medium flex items-center gap-1.5 animate-in fade-in duration-200">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-955/20 border border-red-900 rounded text-xs text-red-400 font-medium">
          {errorMsg}
        </div>
      )}

      {loading && !cpuThreshold ? (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          Loading active settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Monitoring Threshold limits */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Alert Thresholds & intervals</h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CPU Limit (%)</label>
                  <input 
                    type="number" 
                    value={cpuThreshold} 
                    onChange={(e) => setCpuThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">RAM Limit (%)</label>
                  <input 
                    type="number" 
                    value={ramThreshold} 
                    onChange={(e) => setRamThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Temp Limit (°C)</label>
                  <input 
                    type="number" 
                    value={tempThreshold} 
                    onChange={(e) => setTempThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Disk Limit (%)</label>
                  <input 
                    type="number" 
                    value={diskThreshold} 
                    onChange={(e) => setDiskThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Telemetry Poll Interval (ms)</label>
                <input 
                  type="number" 
                  value={monitorInterval} 
                  onChange={(e) => setMonitorInterval(Number(e.target.value))}
                  min={1000} 
                  max={10000}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 animate-pulse">Interface Theme</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setTheme('dark')}
                    className={`flex-1 font-bold py-2 rounded-lg cursor-pointer transition-colors border text-[10px] uppercase tracking-wider ${
                      theme === 'dark' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500'
                    }`}
                  >
                    Dark mode
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setTheme('light')}
                    className={`flex-1 font-bold py-2 rounded-lg cursor-pointer transition-colors border text-[10px] uppercase tracking-wider ${
                      theme === 'light' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500'
                    }`}
                  >
                    Light mode
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg cursor-pointer transition-colors mt-4 text-[10px] uppercase tracking-wider"
              >
                Save Configurations
              </button>
            </form>
          </div>

          {/* Section 2: Reset credentials */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-4.5 w-4.5 text-blue-500" />
              Reset Account Credentials
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Current Password</label>
                <input 
                  type="password" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-250"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-250"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 outline-none font-semibold text-zinc-800 dark:text-zinc-250"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg cursor-pointer transition-colors mt-4 text-[10px] uppercase tracking-wider"
              >
                Change Admin Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default SettingsView;
