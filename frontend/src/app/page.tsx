'use client';

import React from 'react';
import { useApp } from '@/components/AppContext';

// Import views dynamically/statically to ensure robust SPA routes
import { DashboardView } from '@/components/views/DashboardView';
import { CpuView } from '@/components/views/CpuView';
import { MemoryView } from '@/components/views/MemoryView';
import { TemperatureView } from '@/components/views/TemperatureView';
import { NetworkView } from '@/components/views/NetworkView';
import { StorageView } from '@/components/views/StorageView';
import { HardwareView } from '@/components/views/HardwareView';
import { ProcessesView } from '@/components/views/ProcessesView';
import { ServicesView } from '@/components/views/ServicesView';
import { LogsView } from '@/components/views/LogsView';
import { PackagesView } from '@/components/views/PackagesView';
import { GPIOView } from '@/components/views/GPIOView';
import { DisplayView } from '@/components/views/DisplayView';
import { DockerView } from '@/components/views/DockerView';
import { TerminalView } from '@/components/views/TerminalView';
import { FilesView } from '@/components/views/FilesView';
import { SecurityView } from '@/components/views/SecurityView';
import { SettingsView } from '@/components/views/SettingsView';

export default function MainPageRouter() {
  const { activeView } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'cpu': return <CpuView />;
      case 'memory': return <MemoryView />;
      case 'temperature': return <TemperatureView />;
      case 'network': return <NetworkView />;
      case 'storage': return <StorageView />;
      case 'hardware': return <HardwareView />;
      case 'processes': return <ProcessesView />;
      case 'services': return <ServicesView />;
      case 'logs': return <LogsView />;
      case 'packages': return <PackagesView />;
      case 'gpio': return <GPIOView />;
      case 'display': return <DisplayView />;
      case 'docker': return <DockerView />;
      case 'terminal': return <TerminalView />;
      case 'files': return <FilesView />;
      case 'security': return <SecurityView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {renderActiveView()}
    </div>
  );
}
