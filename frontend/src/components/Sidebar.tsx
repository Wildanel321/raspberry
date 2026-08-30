'use client';

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { 
  LayoutDashboard, Cpu, HardDrive, Network, Thermometer, 
  Activity, FileText, Terminal, FolderOpen, ShieldCheck, 
  Settings, Package, Radio, Tv, Menu, X, Container
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { activeView, setActiveView } = useApp();

  const menuGroups = [
    {
      title: 'Dashboard',
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Monitoring',
      items: [
        { id: 'cpu', name: 'CPU', icon: Cpu },
        { id: 'memory', name: 'Memory', icon: Activity },
        { id: 'temperature', name: 'Temperature', icon: Thermometer },
        { id: 'network', name: 'Network', icon: Network },
        { id: 'storage', name: 'Storage', icon: HardDrive }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'hardware', name: 'Hardware', icon: Cpu },
        { id: 'processes', name: 'Processes', icon: Activity },
        { id: 'services', name: 'Services', icon: Settings },
        { id: 'logs', name: 'Logs', icon: FileText },
        { id: 'packages', name: 'Packages', icon: Package }
      ]
    },
    {
      title: 'Hardware Interfaces',
      items: [
        { id: 'gpio', name: 'GPIO', icon: Radio },
        { id: 'display', name: 'Display / HDMI', icon: Tv }
      ]
    },
    {
      title: 'Containers',
      items: [
        { id: 'docker', name: 'Docker', icon: Container }
      ]
    },
    {
      title: 'Tools',
      items: [
        { id: 'terminal', name: 'Terminal', icon: Terminal },
        { id: 'files', name: 'File Manager', icon: FolderOpen }
      ]
    },
    {
      title: 'Access Control',
      items: [
        { id: 'security', name: 'Security', icon: ShieldCheck },
        { id: 'settings', name: 'Settings', icon: Settings }
      ]
    }
  ];

  const handleNav = (id: string) => {
    setActiveView(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded bg-blue-600 text-white font-black text-xs">PI</span>
            PiControl
          </h1>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase mt-0.5">
            Lightweight Pi Center
          </p>
        </div>
        <button 
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-zinc-400 hover:text-white rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links list */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-all text-left ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      
      {/* Version Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-center">
        <p className="text-[10px] text-zinc-600 font-semibold tracking-wider uppercase">
          PiControl v1.0.0 (RPi 3B)
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Left side panel) */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-zinc-800 h-screen sticky top-0 z-30 transition-all">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay + panel) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu Drawer */}
          <aside className="relative w-60 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
