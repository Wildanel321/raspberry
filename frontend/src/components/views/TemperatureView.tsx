'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { MetricChart } from '../MetricChart';
import { Thermometer, RefreshCw, Flame, ShieldCheck } from 'lucide-react';

export function TemperatureView() {
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
      console.error('Failed to fetch Temp history:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory().then(() => setLoading(false));

    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [range, token, apiUrl]);

  // Aggregate stats from history array
  const getTempStats = () => {
    if (history.length === 0) return { min: 0, max: 0, avg: 0 };
    const temps = history.map((h) => h.temp).filter(Boolean);
    if (temps.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
    return { min, max, avg };
  };

  const stats = getTempStats();

  const getThermalStatus = (temp: number) => {
    if (temp >= 80) return { text: 'Critical (Throttling Active)', color: 'text-red-500 bg-red-500/10 border-red-500/20', desc: 'Core temp exceeded 80°C. Frequency capped automatically to protect silicon.' };
    if (temp >= 70) return { text: 'Hot (Thermal Warning)', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', desc: 'Core temp between 70°C and 80°C. Soft thermal limit active.' };
    if (temp >= 55) return { text: 'Warm (Elevated Load)', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', desc: 'System is under load. Airflow recommended.' };
    return { text: 'Normal (Cool)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', desc: 'Optimal operations. Passive cooling is effective.' };
  };

  const status = metrics ? getThermalStatus(metrics.cpu.temperature) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-600/10 rounded-lg text-orange-500">
            <Thermometer className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Thermal Metrics</h2>
            <p className="text-xs text-zinc-500">CPU core temperature, thermal thresholds status, and passive cooling monitoring.</p>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Temp Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Temperature History ({range})</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 italic">
              Loading temperature history...
            </div>
          ) : (
            <MetricChart data={history} dataKey="temp" color="#f97316" unit="°C" height={220} />
          )}
        </div>

        {/* Right: Aggregated stats */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Thermal statistics</h3>
          
          {metrics && (
            <div className="space-y-5 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500 text-sm">Core Temperature</span>
                <span className="font-mono font-black text-lg text-orange-500">{metrics.cpu.temperature}°C</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Minimum Temp ({range})</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stats.min}°C</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-zinc-500">Maximum Temp ({range})</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-red-500">{stats.max}°C</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500">Average Temp ({range})</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stats.avg}°C</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thermal zone warnings banner */}
      {status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${status.color}`}>
          {metrics && metrics.cpu.temperature >= 70 ? (
            <Flame className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" />
          ) : (
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-0.5">Thermal Zone: {status.text}</h4>
            <p className="opacity-95">{status.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default TemperatureView;
