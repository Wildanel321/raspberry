export interface CPUStatus {
  usage: number; // %
  loadAverage: [number, number, number]; // 1m, 5m, 15m
  temperature: number; // °C
  frequency: number; // MHz
  cores: number;
  throttled: string; // Throttling code/status description
}

export interface RAMStatus {
  total: number; // bytes
  used: number; // bytes
  available: number; // bytes
  cached: number; // bytes
  swapTotal: number; // bytes
  swapUsed: number; // bytes
}

export interface StorageStatus {
  filesystem: string;
  mountPoint: string;
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usePercent: number; // %
}

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  type: 'ethernet' | 'wifi' | 'loopback' | 'other';
  signalStrength?: number; // % (for WiFi)
  ssid?: string; // (for WiFi)
}

export interface NetworkStatus {
  interfaces: NetworkInterfaceInfo[];
  uploadSpeed: number; // bytes/sec
  downloadSpeed: number; // bytes/sec
  totalUpload: number; // bytes
  totalDownload: number; // bytes
  internetConnected: boolean;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime: number; // seconds
  arch: string;
  model: string;
  firmware: string;
  dateTime: string;
  bootTime: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number; // %
  mem: number; // %
  user: string;
  status: string;
  started: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  enabled: boolean;
  active: boolean;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: string; // 'running', 'exited', etc.
  image: string;
  cpu: number; // %
  memory: number; // bytes
  networkRx: number; // bytes
  networkTx: number; // bytes
  uptime: string;
  ports: string;
}

export interface GPIOPinStatus {
  physicalPin: number;
  gpioPin: number | null; // null if power/ground/special
  name: string; // "3.3V", "GND", "GPIO 2", etc.
  type: 'power' | 'ground' | 'gpio' | 'special';
  mode?: 'in' | 'out'; // for gpio pins
  value?: 0 | 1; // for gpio pins
}

export interface DisplayStatus {
  connected: boolean;
  resolution: string;
  refreshRate: number;
  displayServer: string; // 'X11', 'Wayland', 'Console', 'None'
  orientation: 'normal' | 'left' | 'right' | 'inverted';
  screenStatus: 'on' | 'off' | 'unknown';
}

export interface SecurityStatus {
  sshEnabled: boolean;
  sshPasswordAuth: boolean;
  firewallActive: boolean;
  openPorts: number[];
  failedLoginsCount: number;
  activeSessions: string[]; // list of active shell sessions
  recommendations: string[];
}

export interface PackageUpdateInfo {
  packageName: string;
  installedVersion: string;
  candidateVersion: string;
}

export interface PackageStatus {
  installedCount: number;
  updatesAvailable: PackageUpdateInfo[];
}

export interface ISystemProvider {
  getSystemInfo(): Promise<SystemInfo>;
  getCPUStatus(): Promise<CPUStatus>;
  getRAMStatus(): Promise<RAMStatus>;
  getStorageStatus(): Promise<StorageStatus[]>;
  getNetworkStatus(): Promise<NetworkStatus>;
  getProcesses(): Promise<ProcessInfo[]>;
  killProcess(pid: number): Promise<boolean>;
  getServices(): Promise<ServiceInfo[]>;
  controlService(name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable'): Promise<boolean>;
  getDockerStatus(): Promise<{ installed: boolean; containers: DockerContainer[] }>;
  controlDockerContainer(id: string, action: 'start' | 'stop' | 'restart'): Promise<boolean>;
  getDockerContainerLogs(id: string): Promise<string>;
  getGPIOStatus(): Promise<GPIOPinStatus[]>;
  toggleGPIO(pin: number, value: 0 | 1): Promise<boolean>;
  setGPIOMode(pin: number, mode: 'in' | 'out'): Promise<boolean>;
  getDisplayStatus(): Promise<DisplayStatus>;
  getSecurityStatus(): Promise<SecurityStatus>;
  getPackages(): Promise<PackageStatus>;
  runPackageAction(action: 'update' | 'upgrade' | 'install' | 'remove', pkgName?: string): Promise<string>; // returns log output
  getLogs(type: 'journal' | 'dmesg' | 'syslog', query?: string, limit?: number): Promise<string>;
}
