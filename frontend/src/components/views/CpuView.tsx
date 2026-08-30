'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { MetricChart } from '../MetricChart';
import { Cpu, RefreshCw, AlertTriangle } from 'lucide-react';

export function CpuView() {
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
      console.error('Failed to fetch CPU history:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory().then(() => setLoading(false));

    // Poll history every 5s (efficient interval)
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [range, token, apiUrl]);

  const getThrottledMessage = (code: string) => {
    if (code === '0x0') return 'System running in optimal conditions.';
    const parsed = parseInt(code, 16);
    let messages = [];
    if (parsed & 0x1) messages.push('Under-voltage detected (Check power supply)');
    if (parsed & 0x2) messages.push('Arm frequency capped due to temp limit');
    if (parsed & 0x4) messages.push('Currently throttled');
    if (parsed & 0x8) messages.push('Soft temperature limit active');
    if (parsed & 0x10000) messages.push('Under-voltage occurred since last boot');
    if (parsed & 0x20000) messages.push('Frequency capping occurred since last boot');
    if (parsed & 0x40000) messages.push('Throttling occurred since last boot');
    if (parsed & 0x80000) messages.push('Soft temperature limit occurred since last boot');
    return messages.join('. ') || `Throttled status code: ${code}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">CPU Telemetry</h2>
            <p className="text-xs text-zinc-500">Processor load, temperature, core speeds, and system limits.</p>
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
            <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: CPU Usage chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Usage Over Time ({range})</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 italic">
              Loading CPU telemetry history...
            </div>
          ) : (
            <MetricChart data={history} dataKey="cpu" color="#3b82f6" unit="%" height={220} />
          )}
        </div>

        {/* Right: Core stats panel */}
        {metrics && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Processor State</h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Current Load</span>
                <span className="font-mono font-black text-sm text-blue-500">{metrics.cpu.usage}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Core Frequency</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{metrics.cpu.frequency} MHz</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Load Average (1m, 5m, 15m)</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {metrics.cpu.loadAverage.map(v => v.toFixed(2)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Active Cores</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{metrics.cpu.cores} Core Broadcom</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500">Core Temperature</span>
                <span className={`font-bold ${metrics.cpu.temperature > 70 ? 'text-orange-500' : 'text-emerald-500'}`}>
                  {metrics.cpu.temperature}°C
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Throttling Alert Status */}
      {metrics && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          metrics.cpu.throttled !== '0x0'
            ? 'bg-red-500/5 border-red-500/20 text-red-500'
            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-0.5">CPU Throttling & Power Status</h4>
            <p className="opacity-90">{getThrottledMessage(metrics.cpu.throttled)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
