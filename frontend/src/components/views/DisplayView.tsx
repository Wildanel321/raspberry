'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Tv, RefreshCw } from 'lucide-react';

export function DisplayView() {
  const { token, apiUrl } = useApp();
  const [display, setDisplay] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDisplayInfo = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/display`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDisplay(data.display);
      }
    } catch (e) {
      console.error('Failed to query display data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayInfo();
  }, [token, apiUrl]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Display & HDMI Settings</h2>
            <p className="text-xs text-zinc-500">Query connected displays, resolution parameters, screen orientation, and display servers.</p>
          </div>
        </div>
        <button 
          onClick={fetchDisplayInfo}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !display ? (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          Querying screen registers...
        </div>
      ) : display ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">HDMI Connection Details</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                <span className="text-zinc-500">HDMI Port Link Status</span>
                <span className={`font-semibold ${display.connected ? 'text-emerald-500 font-bold' : 'text-zinc-500'}`}>
                  {display.connected ? 'Connected' : 'No Display Detected'}
                </span>
              </div>
              {display.connected && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                    <span className="text-zinc-500">Active Resolution</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{display.resolution}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                    <span className="text-zinc-500">Refresh Rate</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{display.refreshRate} Hz</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                    <span className="text-zinc-500">Screen Power Status</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">{display.screenStatus}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500">Display server</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{display.displayServer}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Screen Orientation</h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                <span className="text-zinc-500">Orientation mode</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">{display.orientation}</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Screen resolution and rotation parameters on Raspberry Pi OS are managed via `arandr` or `/boot/config.txt` settings. Live orientation switching via HTTP is restricted to protect visual systems alignment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          No screen metadata available.
        </div>
      )}
    </div>
  );
}
export default DisplayView;
