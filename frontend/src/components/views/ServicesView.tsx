'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Settings, Play, Square, RotateCw, CheckCircle, XCircle } from 'lucide-react';

interface ServiceDetails {
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
  active: boolean;
}

export function ServicesView() {
  const { token, apiUrl } = useApp();
  const [services, setServices] = useState<ServiceDetails[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Action confirmations
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'start' | 'stop' | 'restart' | 'enable' | 'disable' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchServices = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (e) {
      console.error('Failed to query services:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [token, apiUrl]);

  const executeServiceAction = async () => {
    if (!selectedService || !selectedAction || !token || !apiUrl) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/services/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: selectedService, action: selectedAction })
      });
      const data = await res.json();
      if (data.success) {
        fetchServices();
      }
    } catch (e) {
      console.error('Failed to trigger service action:', e);
    } finally {
      setSelectedService(null);
      setSelectedAction(null);
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full capitalize">
            <CheckCircle className="h-3 w-3" /> running
          </span>
        );
      case 'stopped':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-full capitalize">
            <XCircle className="h-3 w-3" /> stopped
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full capitalize">
            <XCircle className="h-3 w-3" /> failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full capitalize">
            {status}
          </span>
        );
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
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Services Manager</h2>
            <p className="text-xs text-zinc-500">Query and control Linux systemd service units configuration status.</p>
          </div>
        </div>
        <button 
          onClick={fetchServices}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Services Grid view */}
      {loading && services.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          Loading system services list...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((svc) => (
            <div 
              key={svc.name}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm tracking-tight">{svc.name}</h3>
                  {getStatusBadge(svc.status)}
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2 min-h-8 mb-4">{svc.description || 'No description provided.'}</p>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                {svc.status !== 'running' ? (
                  <button 
                    onClick={() => { setSelectedService(svc.name); setSelectedAction('start'); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg border border-blue-500/25 transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </button>
                ) : (
                  <button 
                    onClick={() => { setSelectedService(svc.name); setSelectedAction('stop'); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg border border-red-500/25 transition-all cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5" /> Stop
                  </button>
                )}
                
                <button 
                  onClick={() => { setSelectedService(svc.name); setSelectedAction('restart'); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg border border-amber-500/25 transition-all cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Restart
                </button>

                {svc.enabled ? (
                  <button 
                    onClick={() => { setSelectedService(svc.name); setSelectedAction('disable'); }}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer ml-auto"
                  >
                    Disable Boot
                  </button>
                ) : (
                  <button 
                    onClick={() => { setSelectedService(svc.name); setSelectedAction('enable'); }}
                    className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg border border-emerald-500/25 transition-all cursor-pointer ml-auto"
                  >
                    Enable Boot
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action confirmation dialog */}
      {selectedService && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Confirm Service Trigger
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to execute system action <span className="font-bold text-blue-500 uppercase">"{selectedAction}"</span> on service <span className="font-bold text-zinc-800 dark:text-white">"{selectedService}"</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => { setSelectedService(null); setSelectedAction(null); }}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeServiceAction}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {actionLoading ? 'Executing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ServicesView;
