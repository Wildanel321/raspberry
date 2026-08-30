'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Radio, RefreshCw, AlertTriangle } from 'lucide-react';

interface GPIOPin {
  physicalPin: number;
  gpioPin: number | null;
  name: string;
  type: 'power' | 'ground' | 'gpio' | 'special';
  mode?: 'in' | 'out';
  value?: 0 | 1;
}

export function GPIOView() {
  const { token, apiUrl } = useApp();
  const [pins, setPins] = useState<GPIOPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchGPIOState = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/gpio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPins(data.gpio);
      } else {
        setErrorMsg(data.error || 'Failed to fetch GPIO status');
      }
    } catch (e) {
      setErrorMsg('Failed to query GPIO endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGPIOState();
  }, [token, apiUrl]);

  const togglePinValue = async (pinNumber: number, currentValue: number) => {
    if (!token || !apiUrl) return;
    const nextVal = currentValue === 1 ? 0 : 1;
    try {
      const res = await fetch(`${apiUrl}/api/gpio/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pinNumber, value: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state immediately
        setPins(pins.map(p => p.physicalPin === pinNumber ? { ...p, value: nextVal as any } : p));
      }
    } catch (e) {
      console.error('Failed to toggle pin value:', e);
    }
  };

  const changePinMode = async (pinNumber: number, currentMode: 'in' | 'out') => {
    if (!token || !apiUrl) return;
    const nextMode = currentMode === 'in' ? 'out' : 'in';
    try {
      const res = await fetch(`${apiUrl}/api/gpio/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pinNumber, mode: nextMode })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state immediately
        setPins(pins.map(p => p.physicalPin === pinNumber ? { ...p, mode: nextMode } : p));
      }
    } catch (e) {
      console.error('Failed to change pin mode:', e);
    }
  };

  // Helper for pin styling
  const getPinColorClass = (type: string) => {
    switch (type) {
      case 'power': return 'bg-red-500 text-white border-red-600';
      case 'ground': return 'bg-zinc-800 text-zinc-300 border-zinc-950';
      case 'special': return 'bg-purple-600 text-white border-purple-700';
      case 'gpio': return 'bg-blue-600 text-white border-blue-700';
      default: return 'bg-zinc-650';
    }
  };

  // Render left column (Odd physical pins: 1, 3, 5, ..., 39)
  const leftPins = pins.filter(p => p.physicalPin % 2 !== 0).sort((a,b) => a.physicalPin - b.physicalPin);
  // Render right column (Even physical pins: 2, 4, 6, ..., 40)
  const rightPins = pins.filter(p => p.physicalPin % 2 === 0).sort((a,b) => a.physicalPin - b.physicalPin);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">GPIO Controller</h2>
            <p className="text-xs text-zinc-500">Read inputs, set direction modes, and toggle outputs on the physical 40-pin header map.</p>
          </div>
        </div>
        <button 
          onClick={fetchGPIOState}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Warning alert box */}
      <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <h4 className="font-bold uppercase tracking-wider mb-0.5">Hardware Integrity Warning</h4>
          <p className="opacity-90">GPIO manipulation can damage hardware if used incorrectly. Verify electrical connections and loading constraints before toggling pins or switching directions. Pins are NOT activated automatically on system boot.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-955/20 border border-red-900 rounded text-xs text-red-400 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Interactive Pin board grid */}
      {pins.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm overflow-x-auto">
          <div className="min-w-[640px] max-w-2xl mx-auto flex gap-6 select-none justify-center">
            {/* Left Odd Column */}
            <div className="w-[300px] space-y-2.5">
              {leftPins.map((pin) => (
                <div key={pin.physicalPin} className="h-9 flex items-center justify-between text-xs pr-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-150 dark:border-zinc-850 p-1.5">
                  {/* GPIO Configuration Controls (Left Odd Pin) */}
                  {pin.type === 'gpio' ? (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => changePinMode(pin.physicalPin, pin.mode!)}
                        className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase transition-colors ${
                          pin.mode === 'out' ? 'bg-purple-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {pin.mode}
                      </button>
                      <button
                        onClick={() => pin.mode === 'out' && togglePinValue(pin.physicalPin, pin.value!)}
                        disabled={pin.mode === 'in'}
                        className={`w-6 h-5 rounded flex items-center justify-center font-bold font-mono transition-colors text-[10px] ${
                          pin.value === 1 
                            ? 'bg-emerald-500 text-white font-extrabold shadow' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {pin.value}
                      </button>
                    </div>
                  ) : (
                    <div className="w-16" /> // spacer
                  )}
                  
                  {/* Pin label (Odd) */}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-[10px] text-right flex-1 truncate pr-2">
                    {pin.name}
                  </span>
                  
                  {/* Physical pin indicator circle */}
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${getPinColorClass(pin.type)}`}>
                    {pin.physicalPin}
                  </span>
                </div>
              ))}
            </div>

            {/* Middle alignment separator */}
            <div className="w-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full h-[730px]"></div>

            {/* Right Even Column */}
            <div className="w-[300px] space-y-2.5">
              {rightPins.map((pin) => (
                <div key={pin.physicalPin} className="h-9 flex items-center justify-between text-xs pl-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-150 dark:border-zinc-850 p-1.5">
                  {/* Physical pin indicator circle */}
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${getPinColorClass(pin.type)}`}>
                    {pin.physicalPin}
                  </span>

                  {/* Pin label (Even) */}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-[10px] text-left flex-1 truncate pl-2">
                    {pin.name}
                  </span>

                  {/* GPIO Configuration Controls (Right Even Pin) */}
                  {pin.type === 'gpio' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => pin.mode === 'out' && togglePinValue(pin.physicalPin, pin.value!)}
                        disabled={pin.mode === 'in'}
                        className={`w-6 h-5 rounded flex items-center justify-center font-bold font-mono transition-colors text-[10px] ${
                          pin.value === 1 
                            ? 'bg-emerald-500 text-white font-extrabold shadow' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {pin.value}
                      </button>
                      <button 
                        onClick={() => changePinMode(pin.physicalPin, pin.mode!)}
                        className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase transition-colors ${
                          pin.mode === 'out' ? 'bg-purple-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {pin.mode}
                      </button>
                    </div>
                  ) : (
                    <div className="w-16" /> // spacer
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default GPIOView;
