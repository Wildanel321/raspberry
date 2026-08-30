'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
  Settings2, Eye, EyeOff, ChevronUp, ChevronDown, Check,
  Cpu, Activity, Thermometer, Network, HardDrive, Clock, 
  Terminal, Server, Radio, Container, Play, Square, AlertTriangle
} from 'lucide-react';

interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
  size: 'small' | 'medium' | 'large'; // cols span
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'uptime', name: 'System Info & Uptime', visible: true, size: 'medium', order: 0 },
  { id: 'cpu', name: 'CPU Load & Stats', visible: true, size: 'small', order: 1 },
  { id: 'ram', name: 'RAM & Swap Allocation', visible: true, size: 'small', order: 2 },
  { id: 'temp', name: 'Thermal & Core Temp', visible: true, size: 'small', order: 3 },
  { id: 'storage', name: 'Disk Storage partitions', visible: true, size: 'medium', order: 4 },
  { id: 'network', name: 'Network traffic speeds', visible: true, size: 'medium', order: 5 },
  { id: 'processes', name: 'Top Processes', visible: true, size: 'small', order: 6 },
  { id: 'services', name: 'Critical Services Manager', visible: true, size: 'small', order: 7 },
  { id: 'docker', name: 'Docker Container Status', visible: true, size: 'small', order: 8 },
  { id: 'gpio', name: 'GPIO Header Status', visible: true, size: 'small', order: 9 }
];

export function DashboardView() {
  const { metrics, token, apiUrl } = useApp();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load custom layouts on mount
  useEffect(() => {
    const loadLayout = async () => {
      if (!token || !apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.layout) {
          // Merge saved layout with default configs (in case new widgets are added later)
          const merged = DEFAULT_WIDGETS.map((def) => {
            const saved = data.layout.find((w: any) => w.id === def.id);
            return saved ? { ...def, ...saved } : def;
          });
          setWidgets(merged.sort((a, b) => a.order - b.order));
        }
      } catch (e) {
        console.error('Failed to load dashboard layout:', e);
      }
    };
    loadLayout();
  }, [token, apiUrl]);

  // Save layout trigger
  const saveLayout = async (updatedWidgets: WidgetConfig[]) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ layout: updatedWidgets })
      });
      if (res.ok) {
        console.log('Layout saved successfully');
      }
    } catch (e) {
      console.error('Failed to save layout:', e);
    } finally {
      setSaving(false);
    }
  };

  // Visibility toggle
  const toggleVisibility = (id: string) => {
    const next = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(next);
    saveLayout(next);
  };

  // Size changes
  const changeSize = (id: string, size: 'small' | 'medium' | 'large') => {
    const next = widgets.map(w => w.id === id ? { ...w, size } : w);
    setWidgets(next);
    saveLayout(next);
  };

  // Move up/down in order
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;

    const next = [...widgets];
    // swap positions
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    // re-calculate order index keys
    const ordered = next.map((w, idx) => ({ ...w, order: idx }));
    setWidgets(ordered);
    saveLayout(ordered);
  };

  // Rendering Helpers for widget wrappers
  const getColSpanClass = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-2';
      case 'large': return 'col-span-1 md:col-span-2 lg:col-span-3';
      default: return 'col-span-1';
    }
  };

  const getSystemThermalColor = (temp: number) => {
    if (temp >= 80) return 'text-red-500 font-bold';
    if (temp >= 70) return 'text-orange-500 font-semibold';
    if (temp >= 55) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getSystemThrottledLabel = (code: string) => {
    if (code === '0x0') return 'Normal';
    const parsed = parseInt(code, 16);
    let labels = [];
    if (parsed & 0x1) labels.push('Under-voltage');
    if (parsed & 0x2) labels.push('Frequency throttled');
    if (parsed & 0x4) labels.push('Throttling active');
    if (parsed & 0x8) labels.push('Temp limit reached');
    return labels.join(', ') || `Code ${code}`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${bytesPerSec} B/s`;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">PiControl Dashboard</h2>
          <p className="text-xs text-zinc-500">Live telemetry and widgets from your Raspberry Pi 3B.</p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            showConfig 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span>Customize Widgets</span>
        </button>
      </div>

      {/* Customizer Panel */}
      {showConfig && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-white">Widget Configuration Panel</h3>
            {saving && <span className="text-[10px] text-zinc-400 italic">Saving config to DB...</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map((widget, index) => (
              <div 
                key={widget.id} 
                className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleVisibility(widget.id)}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                  >
                    {widget.visible ? <Eye className="h-4 w-4 text-blue-500" /> : <EyeOff className="h-4 w-4 text-zinc-500" />}
                  </button>
                  <span className={`font-semibold ${widget.visible ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-500 line-through'}`}>
                    {widget.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select 
                    value={widget.size} 
                    onChange={(e) => changeSize(widget.id, e.target.value as any)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[10px] py-1 px-1.5 outline-none font-semibold"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <div className="flex flex-col">
                    <button 
                      onClick={() => moveWidget(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 rounded"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => moveWidget(index, 'down')}
                      disabled={index === widgets.length - 1}
                      className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 rounded"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets
          .filter((w) => w.visible)
          .map((widget) => {
            const colClass = getColSpanClass(widget.size);
            
            // Render specific widget content
            const renderWidgetContent = () => {
              if (!metrics) {
                return (
                  <div className="py-8 text-center text-xs text-zinc-500 italic">
                    Waiting for WebSocket telemetry...
                  </div>
                );
              }

              switch (widget.id) {
                case 'uptime':
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                        <span className="text-zinc-400">Board Model</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate max-w-[200px]">
                          Raspberry Pi 3B (Mock)
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                        <span className="text-zinc-400">Operating System</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Debian 12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Hardware Arch</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">aarch64</span>
                      </div>
                    </div>
                  );
                case 'cpu':
                  return (
                    <div className="space-y-4">
                      {/* Meter bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-bold text-xs">
                          <span>Usage</span>
                          <span>{metrics.cpu.usage}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${metrics.cpu.usage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                        <div>Load: <span className="font-bold text-zinc-200">{metrics.cpu.loadAverage.map(v => v.toFixed(2)).join(', ')}</span></div>
                        <div>Frequency: <span className="font-bold text-zinc-200">{metrics.cpu.frequency} MHz</span></div>
                        <div>Cores: <span className="font-bold text-zinc-200">{metrics.cpu.cores} Core ARM</span></div>
                        <div>Throttling: <span className="font-bold text-zinc-200">{getSystemThrottledLabel(metrics.cpu.throttled)}</span></div>
                      </div>
                    </div>
                  );
                case 'ram':
                  return (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-bold text-xs">
                          <span>Allocation</span>
                          <span>{metrics.ram.usePercent}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${metrics.ram.usePercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                        <div>Total RAM: <span className="font-bold text-zinc-200">{(metrics.ram.total / (1024 * 1024)).toFixed(0)} MB</span></div>
                        <div>Used RAM: <span className="font-bold text-zinc-200">{(metrics.ram.used / (1024 * 1024)).toFixed(0)} MB</span></div>
                        <div>Available: <span className="font-bold text-zinc-200">{(metrics.ram.available / (1024 * 1024)).toFixed(0)} MB</span></div>
                        <div>Swap: <span className="font-bold text-zinc-200">{(metrics.ram.swapUsed / (1024 * 1024)).toFixed(0)} MB</span></div>
                      </div>
                    </div>
                  );
                case 'temp':
                  return (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-bold text-xs">
                          <span>CPU Core Temp</span>
                          <span className={getSystemThermalColor(metrics.cpu.temperature)}>{metrics.cpu.temperature}°C</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (metrics.cpu.temperature / 85) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-400 leading-relaxed">
                        Pi 3B starts throttling at <span className="text-orange-400 font-semibold">80°C</span> core temp. Status: <span className="font-bold text-zinc-200">{metrics.cpu.temperature > 75 ? 'HOT (Close limits)' : 'Normal'}</span>
                      </div>
                    </div>
                  );
                case 'storage':
                  return (
                    <div className="space-y-4">
                      {metrics.storage.map((p, idx) => (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="truncate max-w-[120px]">{p.mountPoint} ({p.filesystem})</span>
                            <span>{p.usePercent}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${p.usePercent}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-zinc-500">
                            <span>Used: {(p.used / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                            <span>Free: {(p.free / (1024 * 1024 * 1024)).toFixed(1)} GB of {(p.total / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                case 'network':
                  return (
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Download</div>
                          <div className="text-sm font-black text-blue-500">{formatSpeed(metrics.network.downloadSpeed)}</div>
                        </div>
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Upload</div>
                          <div className="text-sm font-black text-purple-500">{formatSpeed(metrics.network.uploadSpeed)}</div>
                        </div>
                      </div>
                      <div className="space-y-1 text-[10px] text-zinc-400">
                        {metrics.network.interfaces.filter(i => i.ip !== 'N/A').map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{i.name} ({i.type})</span>
                            <span className="font-bold text-zinc-200">{i.ip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                case 'processes':
                  return (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-150 dark:border-zinc-800 pb-1.5">
                        <span>Process</span>
                        <div className="space-x-4">
                          <span>CPU</span>
                          <span>MEM</span>
                        </div>
                      </div>
                      {/* Mock list representation for widget */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-zinc-300">
                          <span className="font-semibold truncate max-w-[120px]">node (Agent)</span>
                          <div className="space-x-4 text-[11px] font-mono">
                            <span className="text-blue-400">2.5%</span>
                            <span>8.5%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300">
                          <span className="font-semibold truncate max-w-[120px]">dockerd</span>
                          <div className="space-x-4 text-[11px] font-mono">
                            <span className="text-blue-400">1.5%</span>
                            <span>4.2%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300">
                          <span className="font-semibold truncate max-w-[120px]">nginx</span>
                          <div className="space-x-4 text-[11px] font-mono">
                            <span className="text-blue-400">0.2%</span>
                            <span>1.2%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                case 'services':
                  return (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-300">sshd</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold border border-emerald-500/25">Active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-300">nginx</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold border border-emerald-500/25">Active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-300">docker</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold border border-emerald-500/25">Active</span>
                      </div>
                    </div>
                  );
                case 'docker':
                  return (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate max-w-[150px]">pihole</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">Running</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate max-w-[150px]">homeassistant</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">Running</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate max-w-[150px]">portainer</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">Stopped</span>
                      </div>
                    </div>
                  );
                case 'gpio':
                  return (
                    <div className="space-y-3 text-xs leading-relaxed">
                      <div className="flex items-center gap-2 p-2 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500 rounded-lg text-[10px]">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>Caution: High voltage GPIO manipulation can cause permanent board damage if configured incorrectly.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>Outputs High: <span className="font-bold text-zinc-200">0 Pins</span></div>
                        <div>Outputs Low: <span className="font-bold text-zinc-200">0 Pins</span></div>
                      </div>
                    </div>
                  );
                default:
                  return null;
              }
            };

            const WidgetIcon = {
              uptime: Clock,
              cpu: Cpu,
              ram: Activity,
              temp: Thermometer,
              storage: HardDrive,
              network: Network,
              processes: Terminal,
              services: Server,
              docker: Container,
              gpio: Radio
            }[widget.id as 'uptime' | 'cpu' | 'ram' | 'temp' | 'storage' | 'network' | 'processes' | 'services' | 'docker' | 'gpio'] || Server;

            return (
              <div 
                key={widget.id} 
                className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md ${colClass}`}
              >
                {/* Widget Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider">
                    <WidgetIcon className="h-4 w-4 text-blue-500" />
                    <span>{widget.name}</span>
                  </div>
                </div>
                {/* Content */}
                {renderWidgetContent()}
              </div>
            );
          })}
      </div>
    </div>
  );
}
