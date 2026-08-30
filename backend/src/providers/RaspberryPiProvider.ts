import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { 
  ISystemProvider, CPUStatus, RAMStatus, StorageStatus, NetworkStatus, 
  SystemInfo, ProcessInfo, ServiceInfo, DockerContainer, GPIOPinStatus, 
  DisplayStatus, SecurityStatus, PackageStatus, NetworkInterfaceInfo, PackageUpdateInfo
} from './ISystemProvider';

export class RaspberryPiProvider implements ISystemProvider {
  private rxBytesHistory = 0;
  private txBytesHistory = 0;
  private lastNetworkPollTime = Date.now();
  private gpioPins: GPIOPinStatus[] = [];

  constructor() {
    this.initializeGPIOState();
  }

  private initializeGPIOState() {
    const layout = [
      { pin: 1, gpio: null, name: '3.3V Power', type: 'power' as const },
      { pin: 2, gpio: null, name: '5V Power', type: 'power' as const },
      { pin: 3, gpio: 2, name: 'GPIO 2 (SDA)', type: 'gpio' as const },
      { pin: 4, gpio: null, name: '5V Power', type: 'power' as const },
      { pin: 5, gpio: 3, name: 'GPIO 3 (SCL)', type: 'gpio' as const },
      { pin: 6, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 7, gpio: 4, name: 'GPIO 4 (GPCLK0)', type: 'gpio' as const },
      { pin: 8, gpio: 14, name: 'GPIO 14 (TXD)', type: 'gpio' as const },
      { pin: 9, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 10, gpio: 15, name: 'GPIO 15 (RXD)', type: 'gpio' as const },
      { pin: 11, gpio: 17, name: 'GPIO 17', type: 'gpio' as const },
      { pin: 12, gpio: 18, name: 'GPIO 18 (PWM0)', type: 'gpio' as const },
      { pin: 13, gpio: 27, name: 'GPIO 27', type: 'gpio' as const },
      { pin: 14, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 15, gpio: 22, name: 'GPIO 22', type: 'gpio' as const },
      { pin: 16, gpio: 23, name: 'GPIO 23', type: 'gpio' as const },
      { pin: 17, gpio: null, name: '3.3V Power', type: 'power' as const },
      { pin: 18, gpio: 24, name: 'GPIO 24', type: 'gpio' as const },
      { pin: 19, gpio: 10, name: 'GPIO 10 (MOSI)', type: 'gpio' as const },
      { pin: 20, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 21, gpio: 9, name: 'GPIO 9 (MISO)', type: 'gpio' as const },
      { pin: 22, gpio: 25, name: 'GPIO 25', type: 'gpio' as const },
      { pin: 23, gpio: 11, name: 'GPIO 11 (SCLK)', type: 'gpio' as const },
      { pin: 24, gpio: 8, name: 'GPIO 8 (CE0)', type: 'gpio' as const },
      { pin: 25, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 26, gpio: 7, name: 'GPIO 7 (CE1)', type: 'gpio' as const },
      { pin: 27, gpio: 0, name: 'GPIO 0 (ID_SD)', type: 'special' as const },
      { pin: 28, gpio: 1, name: 'GPIO 1 (ID_SC)', type: 'special' as const },
      { pin: 29, gpio: 5, name: 'GPIO 5', type: 'gpio' as const },
      { pin: 30, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 31, gpio: 6, name: 'GPIO 6', type: 'gpio' as const },
      { pin: 32, gpio: 12, name: 'GPIO 12 (PWM0)', type: 'gpio' as const },
      { pin: 33, gpio: 13, name: 'GPIO 13 (PWM1)', type: 'gpio' as const },
      { pin: 34, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 35, gpio: 19, name: 'GPIO 19 (MISO)', type: 'gpio' as const },
      { pin: 36, gpio: 16, name: 'GPIO 16', type: 'gpio' as const },
      { pin: 37, gpio: 26, name: 'GPIO 26', type: 'gpio' as const },
      { pin: 38, gpio: 20, name: 'GPIO 20 (MOSI)', type: 'gpio' as const },
      { pin: 39, gpio: null, name: 'Ground', type: 'ground' as const },
      { pin: 40, gpio: 21, name: 'GPIO 21 (SCLK)', type: 'gpio' as const }
    ];

    this.gpioPins = layout.map(l => ({
      physicalPin: l.pin,
      gpioPin: l.gpio,
      name: l.name,
      type: l.type,
      ...(l.type === 'gpio' ? { mode: 'in' as const, value: 0 as const } : {})
    }));
  }

  private execPromise(cmd: string): Promise<string> {
    return new Promise((resolve) => {
      exec(cmd, (error, stdout) => {
        if (error) {
          resolve('');
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    let model = 'Raspberry Pi 3B (N/A)';
    try {
      if (fs.existsSync('/proc/device-tree/model')) {
        model = fs.readFileSync('/proc/device-tree/model', 'utf8').replace(/\0/g, '');
      }
    } catch {}

    const hostname = os.hostname();
    const osPretty = await this.execPromise("grep PRETTY_NAME /etc/os-release | cut -d'=' -f2 | tr -d '\"'");
    const kernel = os.release();
    const uptime = os.uptime();
    const arch = os.arch();
    const firmware = await this.execPromise('vcgencmd version | head -n 1');
    const dateTime = new Date().toISOString();
    const bootTime = new Date(Date.now() - uptime * 1000).toISOString();

    return {
      hostname,
      os: osPretty || 'Raspberry Pi OS (Linux)',
      kernel,
      uptime,
      arch,
      model,
      firmware: firmware || 'N/A',
      dateTime,
      bootTime
    };
  }

  public async getCPUStatus(): Promise<CPUStatus> {
    // Temperature: Read /sys/class/thermal/thermal_zone0/temp (simplest & lowest cost)
    let temp = 0;
    try {
      if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
        const rawTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
        temp = parseFloat((parseInt(rawTemp, 10) / 1000).toFixed(1));
      }
    } catch {}

    // Frequency
    let freq = 0;
    try {
      if (fs.existsSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq')) {
        const rawFreq = fs.readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', 'utf8');
        freq = Math.round(parseInt(rawFreq, 10) / 1000);
      }
    } catch {}

    // Throttled
    const throttled = await this.execPromise('vcgencmd get_throttled');
    
    // CPU Cores
    const cores = os.cpus().length;

    // Load Average
    const loadAverage = os.loadavg() as [number, number, number];

    // CPU Usage percentage (calculated from /proc/stat delta)
    const usage = await this.calculateCPUUsage();

    return {
      usage,
      loadAverage,
      temperature: temp,
      frequency: freq,
      cores,
      throttled: throttled.split('=')[1] || '0x0'
    };
  }

  private calculateCPUUsage(): Promise<number> {
    const getStats = (): { idle: number; total: number } => {
      const cpus = os.cpus();
      let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
      for (const cpu of cpus) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
      }
      return { idle, total: user + nice + sys + idle + irq };
    };

    const start = getStats();
    return new Promise((resolve) => {
      setTimeout(() => {
        const end = getStats();
        const idleDiff = end.idle - start.idle;
        const totalDiff = end.total - start.total;
        const usage = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;
        resolve(usage);
      }, 500);
    });
  }

  public async getRAMStatus(): Promise<RAMStatus> {
    let total = 0, free = 0, available = 0, cached = 0, swapTotal = 0, swapUsed = 0;
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const parseField = (field: string): number => {
        const match = meminfo.match(new RegExp(`^${field}:\\s+(\\d+)\\s+kB`, 'm'));
        return match ? parseInt(match[1], 10) * 1024 : 0;
      };
      
      total = parseField('MemTotal');
      free = parseField('MemFree');
      available = parseField('MemAvailable');
      cached = parseField('Cached') + parseField('Buffers');
      swapTotal = parseField('SwapTotal');
      const swapFree = parseField('SwapFree');
      swapUsed = swapTotal - swapFree;
    } catch {
      // Fallback
      total = os.totalmem();
      free = os.freemem();
      available = free;
    }

    return {
      total,
      used: total - available,
      available,
      cached,
      swapTotal,
      swapUsed
    };
  }

  public async getStorageStatus(): Promise<StorageStatus[]> {
    const dfOutput = await this.execPromise('df -B1');
    const partitions: StorageStatus[] = [];
    const lines = dfOutput.split('\n').slice(1);
    
    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length >= 6) {
        const mountPoint = cols[5];
        // Only include key partitions (root, boot, and any external USB storage)
        if (mountPoint === '/' || mountPoint === '/boot' || mountPoint.startsWith('/media/') || mountPoint.startsWith('/mnt/')) {
          const total = parseInt(cols[1], 10);
          const used = parseInt(cols[2], 10);
          const free = parseInt(cols[3], 10);
          const usePercent = parseInt(cols[4].replace('%', ''), 10);
          
          partitions.push({
            filesystem: cols[0],
            mountPoint,
            total,
            used,
            free,
            usePercent
          });
        }
      }
    }
    return partitions;
  }

  public async getNetworkStatus(): Promise<NetworkStatus> {
    const interfaces: NetworkInterfaceInfo[] = [];
    const osInterfaces = os.networkInterfaces();
    
    let totalRx = 0;
    let totalTx = 0;

    // Parse rx/tx bytes from /proc/net/dev
    try {
      const netdev = fs.readFileSync('/proc/net/dev', 'utf8');
      const lines = netdev.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*(\w+):\s*(\d+)\s+(?:\d+\s+){6}\d+\s+(\d+)/);
        if (match) {
          const name = match[1];
          const rx = parseInt(match[2], 10);
          const tx = parseInt(match[3], 10);
          totalRx += rx;
          totalTx += tx;

          // Find match in OS interfaces
          if (osInterfaces[name]) {
            const ipv4 = osInterfaces[name]?.find(i => i.family === 'IPv4');
            const mac = osInterfaces[name]?.[0]?.mac || 'N/A';
            let type: 'ethernet' | 'wifi' | 'loopback' | 'other' = 'other';
            if (name.startsWith('eth')) type = 'ethernet';
            else if (name.startsWith('wlan')) type = 'wifi';
            else if (name.startsWith('lo')) type = 'loopback';

            let signalStrength: number | undefined;
            let ssid: string | undefined;

            if (type === 'wifi') {
              // Try to query wifi strength
              const wlanInfo = await this.execPromise('iwconfig ' + name);
              const qualityMatch = wlanInfo.match(/Link Quality=(\d+)\/(\d+)/);
              if (qualityMatch) {
                const current = parseInt(qualityMatch[1], 10);
                const max = parseInt(qualityMatch[2], 10);
                signalStrength = Math.round((current / max) * 100);
              }
              const ssidMatch = wlanInfo.match(/ESSID:"([^"]+)"/);
              if (ssidMatch) {
                ssid = ssidMatch[1];
              }
            }

            interfaces.push({
              name,
              ip: ipv4?.address || 'N/A',
              mac,
              rxBytes: rx,
              txBytes: tx,
              type,
              signalStrength,
              ssid
            });
          }
        }
      }
    } catch {}

    // Calculate speed
    const now = Date.now();
    const durationSec = (now - this.lastNetworkPollTime) / 1000;
    this.lastNetworkPollTime = now;

    let downloadSpeed = 0;
    let uploadSpeed = 0;

    if (this.rxBytesHistory > 0 && durationSec > 0) {
      downloadSpeed = Math.round(Math.max(0, (totalRx - this.rxBytesHistory) / durationSec));
      uploadSpeed = Math.round(Math.max(0, (totalTx - this.txBytesHistory) / durationSec));
    }

    this.rxBytesHistory = totalRx;
    this.txBytesHistory = totalTx;

    // Check internet connection (DNS ping to google with 1s timeout)
    const internetConnected = await new Promise<boolean>((resolve) => {
      const socket = require('net').createConnection(53, '8.8.8.8');
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });

    return {
      interfaces,
      downloadSpeed,
      uploadSpeed,
      totalDownload: totalRx,
      totalUpload: totalTx,
      internetConnected
    };
  }

  public async getProcesses(): Promise<ProcessInfo[]> {
    const psOutput = await this.execPromise('ps -eo pid,user,stat,pcpu,pmem,start,comm --sort=-pcpu');
    const processes: ProcessInfo[] = [];
    const lines = psOutput.split('\n').slice(1);

    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length >= 7) {
        const pid = parseInt(cols[0], 10);
        if (isNaN(pid)) continue;
        processes.push({
          pid,
          user: cols[1],
          status: cols[2],
          cpu: parseFloat(cols[3]),
          mem: parseFloat(cols[4]),
          started: cols[5],
          name: cols.slice(6).join(' ')
        });
      }
    }
    return processes;
  }

  public async killProcess(pid: number): Promise<boolean> {
    const res = await this.execPromise(`kill -9 ${pid}`);
    return true; // if success or fail, try to return true as we send command
  }

  public async getServices(): Promise<ServiceInfo[]> {
    const command = 'systemctl list-units --type=service --all --no-legend --no-pager';
    const output = await this.execPromise(command);
    const services: ServiceInfo[] = [];
    const lines = output.split('\n');

    const trackList = ['nginx', 'ssh', 'docker', 'bluetooth', 'NetworkManager', 'picontrol-agent'];

    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length >= 4) {
        const fullName = cols[0];
        const name = fullName.replace('.service', '');
        
        if (trackList.includes(name)) {
          const loadState = cols[1]; // loaded, not-found
          const activeState = cols[2]; // active, inactive
          const subState = cols[3]; // running, dead, failed
          const description = cols.slice(4).join(' ');

          services.push({
            name,
            description,
            status: subState === 'running' ? 'running' : subState === 'failed' ? 'failed' : 'stopped',
            enabled: loadState === 'loaded',
            active: activeState === 'active'
          });
        }
      }
    }
    return services;
  }

  public async controlService(name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable'): Promise<boolean> {
    // Will run with sudo (configured passwordless in installer)
    const cmd = `sudo systemctl ${action} ${name}`;
    await this.execPromise(cmd);
    return true;
  }

  public async getDockerStatus(): Promise<{ installed: boolean; containers: DockerContainer[] }> {
    const isInstalled = await this.execPromise('which docker');
    if (!isInstalled) {
      return { installed: false, containers: [] };
    }

    const output = await this.execPromise("docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}'");
    if (!output) {
      return { installed: true, containers: [] };
    }

    const containers: DockerContainer[] = [];
    const lines = output.split('\n');

    // Get docker stats in background to merge cpu/memory
    const statsOutput = await this.execPromise("docker stats --no-stream --format '{{.ID}}\t{{.CPUPerc}}\t{{.MemUsage}}'");
    const statsMap = new Map<string, { cpu: number; memory: number }>();
    if (statsOutput) {
      for (const line of statsOutput.split('\n')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const id = parts[0];
          const cpu = parseFloat(parts[1].replace('%', '')) || 0;
          // MemUsage: "20.5MiB / 968MiB" -> parse left side
          const memStr = parts[2].split('/')[0].trim();
          let memory = 0;
          const num = parseFloat(memStr);
          if (memStr.endsWith('GiB')) memory = num * 1024 * 1024 * 1024;
          else if (memStr.endsWith('MiB')) memory = num * 1024 * 1024;
          else if (memStr.endsWith('KiB')) memory = num * 1024;
          else memory = num;

          statsMap.set(id, { cpu, memory });
        }
      }
    }

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 5) {
        const id = parts[0];
        const name = parts[1];
        const status = parts[2];
        const image = parts[3];
        const ports = parts[4];

        const stats = statsMap.get(id) || { cpu: 0, memory: 0 };

        containers.push({
          id,
          name,
          status,
          image,
          ports: ports || 'N/A',
          cpu: stats.cpu,
          memory: stats.memory,
          networkRx: 0,
          networkTx: 0,
          uptime: status
        });
      }
    }

    return { installed: true, containers };
  }

  public async controlDockerContainer(id: string, action: 'start' | 'stop' | 'restart'): Promise<boolean> {
    await this.execPromise(`docker ${action} ${id}`);
    return true;
  }

  public async getDockerContainerLogs(id: string): Promise<string> {
    const logs = await this.execPromise(`docker logs --tail 200 ${id}`);
    return logs || 'No logs or docker failed to retrieve logs.';
  }

  public async getGPIOStatus(): Promise<GPIOPinStatus[]> {
    // Read GPIO states from Linux filesystem (/sys/class/gpio) or return initialized list
    // In PiOS /sys/class/gpio requires exporting pins first. We can query current config values.
    // We try to read pin values if exported, otherwise return default input/0 values
    for (const pin of this.gpioPins) {
      if (pin.type === 'gpio' && pin.gpioPin !== null) {
        const pinPath = `/sys/class/gpio/gpio${pin.gpioPin}`;
        if (fs.existsSync(pinPath)) {
          try {
            const dir = fs.readFileSync(path.join(pinPath, 'direction'), 'utf8').trim();
            const val = fs.readFileSync(path.join(pinPath, 'value'), 'utf8').trim();
            pin.mode = dir === 'out' ? 'out' : 'in';
            pin.value = val === '1' ? 1 : 0;
          } catch {}
        } else {
          // Default mode/value if not exported
          pin.mode = 'in';
          pin.value = 0;
        }
      }
    }
    return this.gpioPins;
  }

  public async toggleGPIO(pin: number, value: 0 | 1): Promise<boolean> {
    const pinObj = this.gpioPins.find(g => g.physicalPin === pin);
    if (!pinObj || pinObj.gpioPin === null || pinObj.type !== 'gpio') return false;

    const gp = pinObj.gpioPin;
    const pinPath = `/sys/class/gpio/gpio${gp}`;

    try {
      if (!fs.existsSync(pinPath)) {
        // Export pin
        fs.writeFileSync('/sys/class/gpio/export', gp.toString());
      }
      // Ensure it is output mode
      fs.writeFileSync(path.join(pinPath, 'direction'), 'out');
      fs.writeFileSync(path.join(pinPath, 'value'), value.toString());
      
      pinObj.mode = 'out';
      pinObj.value = value;
      return true;
    } catch (e) {
      console.error(`GPIO toggle failed for physical pin ${pin} (GPIO ${gp}):`, e);
      return false;
    }
  }

  public async setGPIOMode(pin: number, mode: 'in' | 'out'): Promise<boolean> {
    const pinObj = this.gpioPins.find(g => g.physicalPin === pin);
    if (!pinObj || pinObj.gpioPin === null || pinObj.type !== 'gpio') return false;

    const gp = pinObj.gpioPin;
    const pinPath = `/sys/class/gpio/gpio${gp}`;

    try {
      if (!fs.existsSync(pinPath)) {
        fs.writeFileSync('/sys/class/gpio/export', gp.toString());
      }
      fs.writeFileSync(path.join(pinPath, 'direction'), mode);
      pinObj.mode = mode;
      return true;
    } catch (e) {
      console.error(`GPIO mode set failed for physical pin ${pin} (GPIO ${gp}):`, e);
      return false;
    }
  }

  public async getDisplayStatus(): Promise<DisplayStatus> {
    let connected = false;
    let resolution = 'N/A';
    let refreshRate = 0;

    // Check display status in /sys/class/drm/
    try {
      const drmPath = '/sys/class/drm';
      if (fs.existsSync(drmPath)) {
        const dirs = fs.readdirSync(drmPath);
        for (const dir of dirs) {
          if (dir.includes('HDMI-A') || dir.includes('card0-DP')) {
            const statusPath = path.join(drmPath, dir, 'status');
            if (fs.existsSync(statusPath)) {
              const status = fs.readFileSync(statusPath, 'utf8').trim();
              if (status === 'connected') {
                connected = true;
                break;
              }
            }
          }
        }
      }
    } catch {}

    // Fallback or detailed HDMI parsing using tvservice or xrandr
    const tvOut = await this.execPromise('tvservice -s');
    if (tvOut && !tvOut.includes('disabled')) {
      connected = true;
      const resMatch = tvOut.match(/(\d+x\d+) @ ([\d.]+)Hz/);
      if (resMatch) {
        resolution = resMatch[1];
        refreshRate = Math.round(parseFloat(resMatch[2]));
      }
    }

    const displayServer = process.env.WAYLAND_DISPLAY ? 'Wayland' : process.env.DISPLAY ? 'X11' : 'Console';

    return {
      connected,
      resolution,
      refreshRate,
      displayServer,
      orientation: 'normal',
      screenStatus: connected ? 'on' : 'off'
    };
  }

  public async getSecurityStatus(): Promise<SecurityStatus> {
    const isSshActive = await this.execPromise('systemctl is-active ssh');
    const sshEnabled = isSshActive === 'active';

    let sshPasswordAuth = true;
    try {
      if (fs.existsSync('/etc/ssh/sshd_config')) {
        const config = fs.readFileSync('/etc/ssh/sshd_config', 'utf8');
        const match = config.match(/^\s*PasswordAuthentication\s+no/m);
        if (match) sshPasswordAuth = false;
      }
    } catch {}

    // Firewall (ufw status)
    const ufwStatus = await this.execPromise('sudo ufw status');
    const firewallActive = ufwStatus.includes('Status: active');

    // Open ports via ss
    const ssOut = await this.execPromise('ss -tulpn -H');
    const openPorts: number[] = [];
    const lines = ssOut.split('\n');
    for (const line of lines) {
      const match = line.match(/:(\d+)\s+/);
      if (match) {
        const port = parseInt(match[1], 10);
        if (!openPorts.includes(port)) openPorts.push(port);
      }
    }

    // Failed login attempts
    const failedSSH = await this.execPromise("journalctl _SYSTEMD_UNIT=ssh.service | grep 'Failed password' | wc -l");
    const failedLoginsCount = parseInt(failedSSH, 10) || 0;

    // Active shell sessions
    const whoOut = await this.execPromise('who');
    const activeSessions = whoOut ? whoOut.split('\n').filter(Boolean) : [];

    // Recommendations list
    const recommendations: string[] = [];
    if (sshEnabled && sshPasswordAuth) {
      recommendations.push('WARNING: SSH Password Authentication is active. Consider disabling it and using SSH Keys.');
    }
    if (!firewallActive) {
      recommendations.push('CAUTION: System firewall is inactive. Run "sudo ufw enable" to shield your Pi.');
    }
    
    return {
      sshEnabled,
      sshPasswordAuth,
      firewallActive,
      openPorts: openPorts.sort((a,b)=>a-b),
      failedLoginsCount,
      activeSessions,
      recommendations
    };
  }

  public async getPackages(): Promise<PackageStatus> {
    const updatesOutput = await this.execPromise('apt-get -s upgrade');
    const updatesAvailable: PackageUpdateInfo[] = [];

    // Installs count
    const dpkgOutput = await this.execPromise('dpkg -l | wc -l');
    const installedCount = parseInt(dpkgOutput, 10) || 0;

    const lines = updatesOutput.split('\n');
    for (const line of lines) {
      // Inst openssl [3.0.11-1] (3.0.13-1 debian)
      const match = line.match(/^Inst\s+(\S+)\s+\[(\S+)\]\s+\((\S+)\s+/);
      if (match) {
        updatesAvailable.push({
          packageName: match[1],
          installedVersion: match[2],
          candidateVersion: match[3]
        });
      }
    }

    return {
      installedCount,
      updatesAvailable
    };
  }

  public async runPackageAction(action: 'update' | 'upgrade' | 'install' | 'remove', pkgName?: string): Promise<string> {
    let cmd = '';
    if (action === 'update') cmd = 'sudo apt-get update';
    else if (action === 'upgrade') cmd = 'sudo apt-get upgrade -y';
    else if (action === 'install' && pkgName) cmd = `sudo apt-get install -y ${pkgName}`;
    else if (action === 'remove' && pkgName) cmd = `sudo apt-get remove -y ${pkgName}`;
    else return 'Invalid package parameters';

    return await this.execPromise(cmd);
  }

  public async getLogs(type: 'journal' | 'dmesg' | 'syslog', query?: string, limit: number = 100): Promise<string> {
    let cmd = '';
    if (type === 'journal') {
      cmd = `journalctl -n ${limit} --no-pager`;
    } else if (type === 'dmesg') {
      cmd = `dmesg -T | tail -n ${limit}`;
    } else {
      if (fs.existsSync('/var/log/syslog')) {
        cmd = `tail -n ${limit} /var/log/syslog`;
      } else {
        cmd = `journalctl -n ${limit} --no-pager`; // fallback
      }
    }

    let output = await this.execPromise(cmd);
    if (query) {
      const q = query.toLowerCase();
      output = output.split('\n').filter(line => line.toLowerCase().includes(q)).join('\n');
    }
    return output;
  }
}
