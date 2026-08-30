'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Cpu, Usb, HardDrive, RefreshCw } from 'lucide-react';

export function HardwareView() {
  const { token, apiUrl } = useApp();
  const [loading, setLoading] = useState(false);
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [displayInfo, setDisplayInfo] = useState<any>(null);
  const [usbList, setUsbList] = useState<string[]>([]);
  const [blockDevices, setBlockDevices] = useState<string>('');

  const fetchHardwareData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      // 1. Fetch system metadata
      const sysRes = await fetch(`${apiUrl}/api/system`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sysData = await sysRes.json();
      if (sysData.success) setSysInfo(sysData.info);

      // 2. Fetch Display
      const dispRes = await fetch(`${apiUrl}/api/display`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dispData = await dispRes.json();
      if (dispData.success) setDisplayInfo(dispData.display);

      // 3. Fetch USB details (via terminal allowed commands for mock/prod)
      const usbRes = await fetch(`${apiUrl}/api/terminal/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command: 'lsusb' })
      });
      const usbData = await usbRes.json();
      if (usbData.success) {
        setUsbList(usbData.output.split('\n').filter(Boolean));
      }

      // 4. Fetch Block Devices (via lsblk)
      const lsblkRes = await fetch(`${apiUrl}/api/terminal/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command: 'lsblk' })
      });
      const lsblkData = await lsblkRes.json();
      if (lsblkData.success) {
        setBlockDevices(lsblkData.output);
      }
    } catch (e) {
      console.error('Failed to query hardware stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardwareData();
  }, [token, apiUrl]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Hardware Information</h2>
            <p className="text-xs text-zinc-500">Board layout, CPU information, connected displays, storage blocks, and USB devices.</p>
          </div>
        </div>
        <button 
          onClick={fetchHardwareData}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          Loading hardware registers...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Board & Display Specifications */}
          <div className="space-y-6">
            {/* System metadata */}
            {sysInfo && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  System Metadata
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-zinc-500">Device Model</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sysInfo.model}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-zinc-500">CPU Architecture</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sysInfo.arch}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-zinc-500">Linux Kernel</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sysInfo.kernel}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-zinc-500">GPU Firmware Version</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">{sysInfo.firmware}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Display status */}
            {displayInfo && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  HDMI / Screen status
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-zinc-500">HDMI Connection</span>
                    <span className={`font-semibold ${displayInfo.connected ? 'text-emerald-500' : 'text-zinc-500'}`}>
                      {displayInfo.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {displayInfo.connected && (
                    <>
                      <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Active Resolution</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{displayInfo.resolution}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Screen Refresh Rate</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{displayInfo.refreshRate} Hz</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-zinc-500">Display Window Manager</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{displayInfo.displayServer}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Storage Block devices & USB Controllers */}
          <div className="space-y-6">
            {/* Storage Blocks */}
            {blockDevices && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  Disk Blocks (lsblk)
                </h3>
                <pre className="p-3 bg-zinc-955 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-[10px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {blockDevices}
                </pre>
              </div>
            )}

            {/* USB devices */}
            {usbList.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Usb className="h-4 w-4 text-purple-500" />
                  USB Controllers (lsusb)
                </h3>
                <ul className="divide-y divide-zinc-150 dark:divide-zinc-850 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  {usbList.map((usb, idx) => (
                    <li key={idx} className="py-2.5">
                      {usb}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default HardwareView;
