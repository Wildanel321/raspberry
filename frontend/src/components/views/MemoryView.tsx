'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { MetricChart } from '../MetricChart';
import { Activity, RefreshCw } from 'lucide-react';

export function MemoryView() {
  const { metrics, token, apiUrl } = useApp();
  const [range, setRange] = useState('1m');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/metrics/history?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('Failed to fetch Memory history:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory().then(() => setLoading(false));

    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [range, token, apiUrl]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/10 rounded-lg text-purple-500">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Memory Allocation</h2>
            <p className="text-xs text-zinc-500">RAM allocation, active cache memory, swap buffers, and kernel stats.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold py-1.5 px-3 outline-none"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="24h">24 Hours</option>
          </select>
          <button 
            onClick={fetchHistory}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: RAM history chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">RAM Usage Chart ({range})</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 italic">
              Loading Memory history...
            </div>
          ) : (
            <MetricChart data={history} dataKey="ram" color="#a855f7" unit="%" height={220} />
          )}
        </div>

        {/* Right: RAM Details Card */}
        {metrics && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Memory Status</h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Total System RAM</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(metrics.ram.total)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Used RAM</span>
                <span className="font-mono font-bold text-purple-500">{formatBytes(metrics.ram.used)} ({metrics.ram.usePercent}%)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Available RAM</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(metrics.ram.available)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Cache / Buffers</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(metrics.ram.cached)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Swap Total</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(metrics.ram.swapTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500">Swap Used</span>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatBytes(metrics.ram.swapUsed)} ({metrics.ram.swapTotal > 0 ? ((metrics.ram.swapUsed / metrics.ram.swapTotal) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default MemoryView;
